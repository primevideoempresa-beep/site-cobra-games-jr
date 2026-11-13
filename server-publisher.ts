import AdmZip from 'adm-zip';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

export const MAX_ZIP_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
export const MAX_ZIP_ENTRIES = 5000;
export const MAX_UNCOMPRESSED_BYTES = 250 * 1024 * 1024; // 250 MB
export const INSTALL_TIMEOUT_MS = 180_000; // 3 minutes
export const BUILD_TIMEOUT_MS = 120_000; // 2 minutes

const DANGEROUS_EXTENSIONS = [
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.ps1',
  '.msi',
  '.dll',
  '.vbs',
  '.scr',
  '.pif',
  '.com',
];

const SKIPPED_DIRS = new Set(['__macosx', 'node_modules', '.git']);
const SKIPPED_FILES = new Set([
  '.ds_store',
  'thumbs.db',
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  '.env.test',
]);

const BUILD_DEPENDENCY_MARKERS = [
  'vite',
  '@vitejs/plugin-react',
  '@vitejs/plugin-react-swc',
  'react-scripts',
  'webpack',
  'parcel',
  'esbuild',
  'rollup',
  'typescript',
  'next',
  'astro',
  'svelte',
];

export type DetectedProjectType = 'html5' | 'react-vite' | 'invalid';

export interface ZipInspectionResult {
  hasIndex: boolean;
  hasPackageJson: boolean;
  projectType: DetectedProjectType;
  projectTypeLabel: string;
  detectedRoot: string | null;
  requiresBuild: boolean;
  buildScript: string | null;
  missingAssets: string[];
  dangerousFiles: string[];
  pathTraversalFiles: string[];
  totalFiles: number;
  uncompressedSize: number;
  size: number;
  isApto: boolean;
  errorMessage?: string;
  warnings: string[];
}

export interface PublishResult {
  slug: string;
  iframeUrl: string;
  projectType: DetectedProjectType;
  projectTypeLabel: string;
  compiled: boolean;
  compiledZipPath: string;
  buildLogs?: string;
  warnings: string[];
}

export class PublishError extends Error {
  status: number;
  code: string;
  details?: string;

  constructor(message: string, status = 400, code = 'PUBLISH_ERROR', details?: string) {
    super(message);
    this.name = 'PublishError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function sanitizeSlug(title: string): string {
  const normalized = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || `game-${Date.now()}`;
}

export function isValidSlug(slug: string): boolean {
  return /^[a-zA-Z0-9_-]{1,128}$/.test(slug);
}

export function sanitizeLogOutput(text: string, workspacePaths: string[] = []): string {
  let clean = text || '';
  for (const p of workspacePaths) {
    if (p) {
      clean = clean.split(p).join('[workspace]');
    }
  }
  clean = clean
    .replace(/\/tmp\/cg-build-[a-zA-Z0-9_-]+/g, '[workspace]')
    .replace(/\/app\/applet/g, '[server]')
    .replace(/AIza[0-9A-Za-z\-_]{35}/g, 'AIza••••')
    .replace(/Bearer\s+[A-Za-z0-9\-_.]+/gi, 'Bearer [REDACTED]')
    .replace(/(?:secret|password|token|apiKey|private_key)\s*[:=]\s*["']?[^\s"']+/gi, '[REDACTED]');

  const lines = clean.split('\n').filter((line) => line.trim().length > 0);
  const tail = lines.slice(-40).join('\n');
  return tail.slice(0, 3500);
}

function normalizeZipEntryPath(rawName: string): {
  valid: boolean;
  cleanPath: string;
  reason?: string;
} {
  if (!rawName || rawName.includes('\0')) {
    return { valid: false, cleanPath: rawName, reason: 'Nome de arquivo inválido ou byte nulo' };
  }

  let normalized = rawName.replace(/\\/g, '/');
  while (normalized.startsWith('./')) {
    normalized = normalized.slice(2);
  }

  if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) {
    return { valid: false, cleanPath: rawName, reason: 'Caminho absoluto não permitido' };
  }

  const segments = normalized.split('/').filter((seg) => seg.length > 0);
  if (segments.some((seg) => seg === '..')) {
    return { valid: false, cleanPath: rawName, reason: 'Path traversal (..) bloqueado' };
  }

  return { valid: true, cleanPath: segments.join('/') };
}

function isSymlinkEntry(entry: AdmZip.IZipEntry): boolean {
  // Unix file mode is stored in the upper 16 bits of externalFileAttributes (attr)
  const mode = (entry.header.attr >>> 16) & 0o170000;
  return mode === 0o120000;
}

function shouldSkipPath(cleanPath: string): boolean {
  if (!cleanPath) return true;
  const parts = cleanPath.split('/');
  if (parts.some((p) => SKIPPED_DIRS.has(p.toLowerCase()))) return true;
  const fileName = parts[parts.length - 1].toLowerCase();
  if (SKIPPED_FILES.has(fileName) || fileName.startsWith('.env.')) return true;
  return false;
}

function stripRootPrefix(cleanPath: string, rootPrefix: string | null): string {
  if (!rootPrefix) return cleanPath;
  const prefixWithSlash = `${rootPrefix}/`;
  if (cleanPath === rootPrefix) return '';
  if (cleanPath.startsWith(prefixWithSlash)) {
    return cleanPath.slice(prefixWithSlash.length);
  }
  return cleanPath;
}

function detectSingleWrapperRoot(filePaths: string[]): string | null {
  if (filePaths.length === 0) return null;

  const hasRootEntry = filePaths.some((p) => {
    const lower = p.toLowerCase();
    return lower === 'index.html' || lower === 'package.json';
  });
  if (hasRootEntry) return null;

  const topSegments = new Set<string>();
  for (const p of filePaths) {
    const parts = p.split('/');
    if (parts.length < 2) {
      return null;
    }
    topSegments.add(parts[0]);
    if (topSegments.size > 1) return null;
  }

  return topSegments.size === 1 ? Array.from(topSegments)[0] : null;
}

function hasDangerousExtension(cleanPath: string): boolean {
  const lower = cleanPath.toLowerCase();
  return DANGEROUS_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function htmlReferencesSourceModules(htmlContent: string): boolean {
  return /<script[^>]+src=["'][^"']+\.(?:tsx|ts|jsx)(?:\?[^"']*)?["']/i.test(htmlContent) ||
    /<script[^>]+src=["']\/?src\/[^"']+["']/i.test(htmlContent);
}

function findMissingHtmlAssets(htmlContent: string, availableRelPaths: Set<string>): string[] {
  const missing: string[] = [];
  const attrRegex = /(?:src|href)=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(htmlContent)) !== null) {
    const ref = match[1].trim();
    if (
      !ref ||
      ref.startsWith('#') ||
      ref.startsWith('http://') ||
      ref.startsWith('https://') ||
      ref.startsWith('//') ||
      ref.startsWith('data:') ||
      ref.startsWith('blob:') ||
      ref.startsWith('mailto:') ||
      ref.startsWith('javascript:')
    ) {
      continue;
    }

    const cleanRef = ref.split('?')[0].split('#')[0].replace(/^\.\//, '').replace(/^\//, '');
    if (!cleanRef) continue;

    // Only flag local asset references that look like files (with an extension) and are absent
    if (/\.[a-z0-9]{1,8}$/i.test(cleanRef) && !availableRelPaths.has(cleanRef.toLowerCase())) {
      if (!missing.includes(cleanRef) && missing.length < 20) {
        missing.push(cleanRef);
      }
    }
  }

  return missing;
}

export function inspectGameZip(zipPath: string, fileSize: number): ZipInspectionResult {
  if (fileSize > MAX_ZIP_SIZE_BYTES) {
    throw new PublishError(
      `O arquivo ZIP excede o limite máximo de ${Math.round(MAX_ZIP_SIZE_BYTES / 1024 / 1024)} MB.`,
      413,
      'ZIP_TOO_LARGE'
    );
  }

  let zip: AdmZip;
  try {
    zip = new AdmZip(zipPath);
  } catch (err: any) {
    throw new PublishError(
      'Arquivo ZIP inválido ou corrompido. Verifique o arquivo e tente novamente.',
      400,
      'INVALID_ZIP',
      err?.message
    );
  }

  const entries = zip.getEntries();
  if (entries.length === 0) {
    return {
      hasIndex: false,
      hasPackageJson: false,
      projectType: 'invalid',
      projectTypeLabel: 'ZIP Vazio',
      detectedRoot: null,
      requiresBuild: false,
      buildScript: null,
      missingAssets: [],
      dangerousFiles: [],
      pathTraversalFiles: [],
      totalFiles: 0,
      uncompressedSize: 0,
      size: fileSize,
      isApto: false,
      errorMessage: 'O arquivo ZIP está vazio.',
      warnings: [],
    };
  }

  if (entries.length > MAX_ZIP_ENTRIES) {
    throw new PublishError(
      `O pacote ZIP contém arquivos demais (${entries.length}). Limite máximo: ${MAX_ZIP_ENTRIES}.`,
      400,
      'TOO_MANY_ENTRIES'
    );
  }

  const pathTraversalFiles: string[] = [];
  const dangerousFiles: string[] = [];
  const warnings: string[] = [];
  const validFiles: { cleanPath: string; entry: AdmZip.IZipEntry }[] = [];
  let uncompressedSize = 0;

  for (const entry of entries) {
    const check = normalizeZipEntryPath(entry.entryName);
    if (!check.valid) {
      pathTraversalFiles.push(entry.entryName);
      continue;
    }

    if (isSymlinkEntry(entry)) {
      pathTraversalFiles.push(`${entry.entryName} (symlink)`);
      continue;
    }

    if (shouldSkipPath(check.cleanPath)) {
      continue;
    }

    if (entry.isDirectory) {
      continue;
    }

    uncompressedSize += Math.max(0, entry.header.size || 0);
    if (uncompressedSize > MAX_UNCOMPRESSED_BYTES) {
      throw new PublishError(
        `O conteúdo descompactado excede o limite de segurança de ${Math.round(MAX_UNCOMPRESSED_BYTES / 1024 / 1024)} MB.`,
        400,
        'UNCOMPRESSED_TOO_LARGE'
      );
    }

    if (hasDangerousExtension(check.cleanPath)) {
      dangerousFiles.push(check.cleanPath);
    }

    validFiles.push({ cleanPath: check.cleanPath, entry });
  }

  if (pathTraversalFiles.length > 0) {
    return {
      hasIndex: false,
      hasPackageJson: false,
      projectType: 'invalid',
      projectTypeLabel: 'Pacote Bloqueado (Segurança)',
      detectedRoot: null,
      requiresBuild: false,
      buildScript: null,
      missingAssets: [],
      dangerousFiles: [...dangerousFiles, ...pathTraversalFiles],
      pathTraversalFiles,
      totalFiles: entries.length,
      uncompressedSize,
      size: fileSize,
      isApto: false,
      errorMessage: 'Caminhos maliciosos ou links simbólicos detectados no arquivo ZIP.',
      warnings,
    };
  }

  const rawPaths = validFiles.map((f) => f.cleanPath);
  const detectedRoot = detectSingleWrapperRoot(rawPaths);

  const normalizedMap = new Map<string, AdmZip.IZipEntry>();
  const normalizedLowerSet = new Set<string>();

  for (const item of validFiles) {
    const rel = stripRootPrefix(item.cleanPath, detectedRoot);
    if (!rel) continue;
    normalizedMap.set(rel, item.entry);
    normalizedLowerSet.add(rel.toLowerCase());
  }

  if (detectedRoot) {
    warnings.push(`Pasta raiz "${detectedRoot}/" será normalizada automaticamente na publicação.`);
  }

  // Locate root index.html and package.json (case-insensitive lookup for safety, exact match preferred)
  const indexEntry =
    normalizedMap.get('index.html') ||
    Array.from(normalizedMap.entries()).find(([k]) => k.toLowerCase() === 'index.html')?.[1];
  const pkgEntry =
    normalizedMap.get('package.json') ||
    Array.from(normalizedMap.entries()).find(([k]) => k.toLowerCase() === 'package.json')?.[1];

  const hasIndex = Boolean(indexEntry);
  const hasPackageJson = Boolean(pkgEntry);

  let parsedPkg: any = null;
  let buildScript: string | null = null;
  let hasBuildDep = false;

  if (pkgEntry) {
    try {
      parsedPkg = JSON.parse(pkgEntry.getData().toString('utf8'));
      buildScript = typeof parsedPkg?.scripts?.build === 'string' ? parsedPkg.scripts.build.trim() : null;
      const allDeps = {
        ...(parsedPkg?.dependencies || {}),
        ...(parsedPkg?.devDependencies || {}),
      };
      hasBuildDep = BUILD_DEPENDENCY_MARKERS.some((dep) => dep in allDeps);
    } catch {
      return {
        hasIndex,
        hasPackageJson: true,
        projectType: 'invalid',
        projectTypeLabel: 'package.json Inválido',
        detectedRoot,
        requiresBuild: false,
        buildScript: null,
        missingAssets: [],
        dangerousFiles,
        pathTraversalFiles,
        totalFiles: validFiles.length,
        uncompressedSize,
        size: fileSize,
        isApto: false,
        errorMessage: 'O arquivo package.json do projeto não é um JSON válido.',
        warnings,
      };
    }
  }

  const hasViteConfig = Array.from(normalizedLowerSet).some((p) =>
    /^vite\.config\.(ts|js|mjs|mts|cjs)$/.test(p)
  );
  const hasTsOrJsxSource = Array.from(normalizedLowerSet).some(
    (p) => p.startsWith('src/') && /\.(tsx|ts|jsx|js)$/.test(p)
  );
  const indexHtmlContent = indexEntry ? indexEntry.getData().toString('utf8') : '';
  const htmlUsesSourceEntry = indexEntry ? htmlReferencesSourceModules(indexHtmlContent) : false;

  const isBuildProject = Boolean(
    hasPackageJson && (buildScript || hasBuildDep || hasViteConfig || hasTsOrJsxSource || htmlUsesSourceEntry)
  );

  if (isBuildProject) {
    if (!buildScript && !hasViteConfig && !('vite' in { ...(parsedPkg?.dependencies || {}), ...(parsedPkg?.devDependencies || {}) })) {
      return {
        hasIndex,
        hasPackageJson: true,
        projectType: 'invalid',
        projectTypeLabel: 'Projeto sem Script de Build',
        detectedRoot,
        requiresBuild: true,
        buildScript: null,
        missingAssets: [],
        dangerousFiles,
        pathTraversalFiles,
        totalFiles: validFiles.length,
        uncompressedSize,
        size: fileSize,
        isApto: false,
        errorMessage: 'O projeto possui package.json, mas não define "scripts.build" nem configuração Vite.',
        warnings,
      };
    }

    const isClean = dangerousFiles.length === 0;
    return {
      hasIndex: hasIndex || true, // Build will produce dist/index.html
      hasPackageJson: true,
      projectType: 'react-vite',
      projectTypeLabel: 'Projeto React / Vite / TS (Compilação Automática)',
      detectedRoot,
      requiresBuild: true,
      buildScript: buildScript || 'vite build',
      missingAssets: [],
      dangerousFiles,
      pathTraversalFiles,
      totalFiles: validFiles.length,
      uncompressedSize,
      size: fileSize,
      isApto: isClean,
      errorMessage: isClean ? undefined : 'Arquivos executáveis ou scripts perigosos detectados no ZIP.',
      warnings,
    };
  }

  // Otherwise check if it's a ready HTML5 game
  if (hasIndex) {
    if (htmlUsesSourceEntry) {
      return {
        hasIndex: true,
        hasPackageJson: false,
        projectType: 'invalid',
        projectTypeLabel: 'Código-Fonte sem package.json',
        detectedRoot,
        requiresBuild: true,
        buildScript: null,
        missingAssets: [],
        dangerousFiles,
        pathTraversalFiles,
        totalFiles: validFiles.length,
        uncompressedSize,
        size: fileSize,
        isApto: false,
        errorMessage:
          'O index.html referencia código-fonte (/src/*.tsx|ts|jsx), mas o ZIP não contém package.json para compilação.',
        warnings,
      };
    }

    const missingAssets = findMissingHtmlAssets(indexHtmlContent, normalizedLowerSet);
    const isClean = dangerousFiles.length === 0;

    return {
      hasIndex: true,
      hasPackageJson,
      projectType: 'html5',
      projectTypeLabel: 'Jogo HTML5 Pronto (Publicação Direta)',
      detectedRoot,
      requiresBuild: false,
      buildScript: null,
      missingAssets,
      dangerousFiles,
      pathTraversalFiles,
      totalFiles: validFiles.length,
      uncompressedSize,
      size: fileSize,
      isApto: isClean,
      errorMessage: isClean ? undefined : 'Arquivos potencialmente perigosos detectados no ZIP.',
      warnings,
    };
  }

  return {
    hasIndex: false,
    hasPackageJson,
    projectType: 'invalid',
    projectTypeLabel: 'Estrutura Inválida',
    detectedRoot,
    requiresBuild: false,
    buildScript: null,
    missingAssets: [],
    dangerousFiles,
    pathTraversalFiles,
    totalFiles: validFiles.length,
    uncompressedSize,
    size: fileSize,
    isApto: false,
    errorMessage:
      'O ZIP deve conter um arquivo index.html na raiz (jogo HTML5) ou um package.json válido (projeto React/Vite/TS/JS).',
    warnings,
  };
}

export function safeExtractZip(
  zipPath: string,
  targetDir: string,
  stripPrefix: string | null = null
): { extractedFiles: number; uncompressedBytes: number } {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();

  if (entries.length > MAX_ZIP_ENTRIES) {
    throw new PublishError(
      `O pacote ZIP excede o limite de ${MAX_ZIP_ENTRIES} arquivos.`,
      400,
      'TOO_MANY_ENTRIES'
    );
  }

  const resolvedRoot = path.resolve(targetDir);
  fs.mkdirSync(resolvedRoot, { recursive: true });

  let extractedFiles = 0;
  let uncompressedBytes = 0;

  for (const entry of entries) {
    const check = normalizeZipEntryPath(entry.entryName);
    if (!check.valid) {
      throw new PublishError(`Caminho bloqueado por segurança: ${entry.entryName}`, 400, 'PATH_TRAVERSAL');
    }

    if (isSymlinkEntry(entry)) {
      throw new PublishError(`Link simbólico bloqueado por segurança: ${entry.entryName}`, 400, 'SYMLINK_BLOCKED');
    }

    if (shouldSkipPath(check.cleanPath) || entry.isDirectory) {
      continue;
    }

    const relPath = stripRootPrefix(check.cleanPath, stripPrefix);
    if (!relPath) continue;

    if (hasDangerousExtension(relPath)) {
      throw new PublishError(`Tipo de arquivo proibido: ${relPath}`, 400, 'DANGEROUS_FILE');
    }

    const destPath = path.resolve(resolvedRoot, relPath);
    if (destPath !== resolvedRoot && !destPath.startsWith(resolvedRoot + path.sep)) {
      throw new PublishError(`Tentativa de escrita fora da pasta isolada: ${relPath}`, 400, 'PATH_TRAVERSAL');
    }

    const data = entry.getData();
    uncompressedBytes += data.length;
    if (uncompressedBytes > MAX_UNCOMPRESSED_BYTES) {
      throw new PublishError(
        `Conteúdo extraído excedeu o limite de ${Math.round(MAX_UNCOMPRESSED_BYTES / 1024 / 1024)} MB.`,
        400,
        'UNCOMPRESSED_TOO_LARGE'
      );
    }

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, data);
    extractedFiles++;
  }

  return { extractedFiles, uncompressedBytes };
}

function runIsolatedCommand(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
  timeoutMs: number
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const maxLogBytes = 256 * 1024;

    child.stdout?.on('data', (chunk: Buffer) => {
      if (stdout.length < maxLogBytes) {
        stdout += chunk.toString('utf8');
      }
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      if (stderr.length < maxLogBytes) {
        stderr += chunk.toString('utf8');
      }
    });

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        if (child.pid) {
          process.kill(-child.pid, 'SIGTERM');
        } else {
          child.kill('SIGTERM');
        }
      } catch {
        // Ignore kill error
      }
      setTimeout(() => {
        try {
          if (child.pid) {
            process.kill(-child.pid, 'SIGKILL');
          } else {
            child.kill('SIGKILL');
          }
        } catch {
          // Ignore force kill error
        }
      }, 2000);
    }, timeoutMs);

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(
          new PublishError(
            `Tempo limite de execução excedido (${Math.round(timeoutMs / 1000)}s).`,
            408,
            'BUILD_TIMEOUT',
            sanitizeLogOutput(`${stdout}\n${stderr}`, [cwd])
          )
        );
        return;
      }
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

function locateBuildOutputDir(projectDir: string): string | null {
  const candidates = [
    path.join(projectDir, 'dist'),
    path.join(projectDir, 'build'),
    path.join(projectDir, 'out'),
    path.join(projectDir, 'dist', 'client'),
    path.join(projectDir, 'public', 'dist'),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(dir) && fs.existsSync(path.join(dir, 'index.html'))) {
      return dir;
    }
  }
  return null;
}

function rewriteRootRelativeAssetsInIndexHtml(outputDir: string): void {
  const indexPath = path.join(outputDir, 'index.html');
  if (!fs.existsSync(indexPath)) return;

  let html = fs.readFileSync(indexPath, 'utf8');
  const updated = html.replace(
    /\b(src|href)=(["'])\/(?!\/)([^"']*)\2/gi,
    (fullMatch, attr, quote, relTarget) => {
      const cleanRel = relTarget.split('?')[0].split('#')[0];
      if (!cleanRel) return fullMatch;
      const targetExistsLocally = fs.existsSync(path.join(outputDir, cleanRel));
      const looksLikeBuildAsset = cleanRel.startsWith('assets/') || cleanRel.startsWith('static/');
      if (targetExistsLocally || looksLikeBuildAsset) {
        return `${attr}=${quote}./${relTarget}${quote}`;
      }
      return fullMatch;
    }
  );

  if (updated !== html) {
    fs.writeFileSync(indexPath, updated, 'utf8');
  }
}

function createZipFromDirectory(sourceDir: string, outZipPath: string): void {
  const zip = new AdmZip();
  zip.addLocalFolder(sourceDir);
  zip.writeZip(outZipPath);
}

export async function publishGameZip(options: {
  zipPath: string;
  slug: string;
  baseGamesDir: string;
  fileSize: number;
}): Promise<PublishResult> {
  const { zipPath, slug, baseGamesDir, fileSize } = options;

  if (!isValidSlug(slug)) {
    throw new PublishError('Identificador (slug) do jogo inválido.', 400, 'INVALID_SLUG');
  }

  const inspection = inspectGameZip(zipPath, fileSize);
  if (!inspection.isApto) {
    throw new PublishError(
      inspection.errorMessage || 'O pacote ZIP não atende aos requisitos de publicação.',
      400,
      'INVALID_GAME_PACKAGE',
      inspection.dangerousFiles.length > 0
        ? `Arquivos bloqueados: ${inspection.dangerousFiles.join(', ')}`
        : undefined
    );
  }

  const buildId = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const workspaceDir = path.join('/tmp', `cg-build-${buildId}`);
  const homeDir = path.join(workspaceDir, 'home');
  const tmpDir = path.join(workspaceDir, 'tmp');
  const projectDir = path.join(workspaceDir, 'project');
  const npmCacheDir = '/tmp/cg-npm-cache';
  const compiledZipPath = path.join('/tmp', `cg-compiled-${slug}-${buildId}.zip`);

  fs.mkdirSync(homeDir, { recursive: true });
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.mkdirSync(projectDir, { recursive: true });
  fs.mkdirSync(npmCacheDir, { recursive: true });

  const targetDir = path.join(baseGamesDir, slug);
  let buildLogs = '';

  try {
    // 1. Extract ZIP into isolated temporary workspace
    safeExtractZip(zipPath, projectDir, inspection.detectedRoot);

    let publishSourceDir = projectDir;

    // 2. If React / Vite / TS / JS project, install dependencies and build in isolation
    if (inspection.projectType === 'react-vite') {
      const pkgPath = path.join(projectDir, 'package.json');
      if (!fs.existsSync(pkgPath)) {
        throw new PublishError('package.json não encontrado após extração.', 400, 'MISSING_PACKAGE_JSON');
      }

      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

      // Strictly sanitized environment without any server secrets or credentials
      const installEnv: NodeJS.ProcessEnv = {
        PATH: process.env.PATH || '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
        HOME: homeDir,
        TMPDIR: tmpDir,
        TEMP: tmpDir,
        TMP: tmpDir,
        NODE_ENV: 'development', // Ensure devDependencies (vite, typescript) are installed
        CI: 'true',
        NO_UPDATE_NOTIFIER: '1',
        npm_config_cache: npmCacheDir,
        npm_config_audit: 'false',
        npm_config_fund: 'false',
        npm_config_update_notifier: 'false',
        npm_config_loglevel: 'error',
      };

      const buildEnv: NodeJS.ProcessEnv = {
        ...installEnv,
        NODE_ENV: 'production',
        PUBLIC_URL: '.',
      };

      // Step 2a: Install dependencies safely (--ignore-scripts prevents arbitrary postinstall code execution)
      let installRes = await runIsolatedCommand(
        'npm',
        ['install', '--include=dev', '--ignore-scripts', '--no-audit', '--no-fund', '--prefer-offline'],
        projectDir,
        installEnv,
        INSTALL_TIMEOUT_MS
      );

      if (installRes.code !== 0 && `${installRes.stdout}\n${installRes.stderr}`.includes('ERESOLVE')) {
        installRes = await runIsolatedCommand(
          'npm',
          [
            'install',
            '--include=dev',
            '--ignore-scripts',
            '--no-audit',
            '--no-fund',
            '--legacy-peer-deps',
          ],
          projectDir,
          installEnv,
          INSTALL_TIMEOUT_MS
        );
      }

      if (installRes.code !== 0) {
        const sanitized = sanitizeLogOutput(`${installRes.stdout}\n${installRes.stderr}`, [workspaceDir, projectDir]);
        throw new PublishError(
          'Falha ao instalar as dependências do projeto (npm install).',
          400,
          'NPM_INSTALL_FAILED',
          sanitized
        );
      }

      // Step 2b: Execute build
      const buildScript = typeof pkg?.scripts?.build === 'string' ? pkg.scripts.build.trim() : '';
      let buildRes: { code: number; stdout: string; stderr: string };

      if (buildScript) {
        const endsWithViteBuild = /(?:^|&&|\|\||;)\s*(?:npx\s+)?vite\s+build\s*$/i.test(buildScript);
        const args = endsWithViteBuild
          ? ['run', 'build', '--ignore-scripts', '--', '--base=./']
          : ['run', 'build', '--ignore-scripts'];

        buildRes = await runIsolatedCommand('npm', args, projectDir, buildEnv, BUILD_TIMEOUT_MS);
      } else {
        const localViteBin = path.join(projectDir, 'node_modules', '.bin', 'vite');
        if (fs.existsSync(localViteBin)) {
          buildRes = await runIsolatedCommand(
            localViteBin,
            ['build', '--base=./'],
            projectDir,
            buildEnv,
            BUILD_TIMEOUT_MS
          );
        } else {
          throw new PublishError(
            'Script "build" não encontrado no package.json.',
            400,
            'MISSING_BUILD_SCRIPT'
          );
        }
      }

      buildLogs = sanitizeLogOutput(`${buildRes.stdout}\n${buildRes.stderr}`, [workspaceDir, projectDir]);

      if (buildRes.code !== 0) {
        throw new PublishError(
          'Erro ao compilar o projeto (npm run build). Verifique o código do jogo e tente novamente.',
          400,
          'BUILD_FAILED',
          buildLogs
        );
      }

      // Step 2c: Locate output folder (dist, build, out...)
      const outputDir = locateBuildOutputDir(projectDir);
      if (!outputDir) {
        throw new PublishError(
          'Compilação finalizada, mas não foi encontrada uma pasta de saída (dist/build/out) com index.html.',
          400,
          'MISSING_DIST_INDEX',
          buildLogs
        );
      }

      publishSourceDir = outputDir;
    }

    // 3. Verify final index.html exists at root of publishable folder
    const finalIndexPath = path.join(publishSourceDir, 'index.html');
    if (!fs.existsSync(finalIndexPath)) {
      throw new PublishError(
        'O pacote final não contém index.html na raiz.',
        400,
        'MISSING_INDEX_HTML'
      );
    }

    // 4. Normalize root-relative asset paths (/assets/...) for subpath iframe serving (/games/<slug>/)
    rewriteRootRelativeAssetsInIndexHtml(publishSourceDir);

    // 5. Create clean compiled ZIP for Firebase Storage persistence
    createZipFromDirectory(publishSourceDir, compiledZipPath);

    // 6. Publish atomically to targetDir
    const stagingDest = `${targetDir}.staging-${buildId}`;
    if (fs.existsSync(stagingDest)) {
      fs.rmSync(stagingDest, { recursive: true, force: true });
    }
    fs.cpSync(publishSourceDir, stagingDest, { recursive: true });

    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
    fs.mkdirSync(path.dirname(targetDir), { recursive: true });
    fs.renameSync(stagingDest, targetDir);

    return {
      slug,
      iframeUrl: `/games/${slug}/index.html`,
      projectType: inspection.projectType,
      projectTypeLabel: inspection.projectTypeLabel,
      compiled: inspection.projectType === 'react-vite',
      compiledZipPath,
      buildLogs: buildLogs || undefined,
      warnings: inspection.warnings,
    };
  } finally {
    // Always remove temporary isolated build workspace
    try {
      if (fs.existsSync(workspaceDir)) {
        fs.rmSync(workspaceDir, { recursive: true, force: true });
      }
    } catch (cleanupErr) {
      console.warn('[Publisher] Falha ao limpar workspace temporário:', cleanupErr);
    }
  }
}
