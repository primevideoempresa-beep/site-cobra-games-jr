import AdmZip from 'adm-zip';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

export const MAX_ZIP_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
export const MAX_ZIP_ENTRIES = 5000;
export const MAX_UNCOMPRESSED_BYTES = 250 * 1024 * 1024; // 250 MB
export const MAX_COMPRESSION_RATIO = 100;
export const MAX_INDEX_HTML_BYTES = 10 * 1024 * 1024; // 10 MB

const DANGEROUS_EXTENSIONS = [
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.bash',
  '.zsh',
  '.ps1',
  '.psm1',
  '.msi',
  '.dll',
  '.so',
  '.dylib',
  '.vbs',
  '.vbe',
  '.scr',
  '.pif',
  '.com',
  '.hta',
  '.cpl',
  '.lnk',
  '.reg',
  '.jar',
  '.war',
  '.apk',
  '.php',
  '.phtml',
  '.py',
  '.rb',
  '.pl',
  '.cgi',
  '.node',
  '.app',
  '.dmg',
  '.deb',
  '.rpm',
  '.sys',
  '.drv',
  '.elf',
];

const DANGEROUS_FILENAMES = new Set([
  '.htaccess',
  '.htpasswd',
  '.npmrc',
  '.yarnrc',
  '.yarnrc.yml',
  '.gitconfig',
  '.bash_history',
  '.zsh_history',
  'id_rsa',
  'id_ed25519',
]);

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
  duplicateFiles: string[];
  totalFiles: number;
  uncompressedSize: number;
  size: number;
  isApto: boolean;
  errorMessage?: string;
  warnings: string[];
}

export const DEFAULT_RETAINED_BACKUPS = 3;

export type PublicationState =
  | 'processing'
  | 'backup_created'
  | 'awaiting_firestore_confirmation'
  | 'confirmed'
  | 'rolled_back'
  | 'failed';

export interface PublicationRecord {
  publishId: string;
  slug: string;
  state: PublicationState;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  rolledBackAt?: string;
  firestoreDocId?: string;
  failureReason?: string;
  hadPreviousLocal: boolean;
  hadPreviousRemote: boolean;
  localBackupDir: string | null;
  remoteBackupPath: string | null;
  remoteDestination: string;
  iframeUrl: string;
}

export interface PublishResult {
  publishId: string;
  state: PublicationState;
  slug: string;
  iframeUrl: string;
  projectType: DetectedProjectType;
  projectTypeLabel: string;
  compiled: boolean;
  compiledZipPath: string;
  hadPreviousLocal: boolean;
  localBackupDir: string | null;
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

export function isValidPublishId(publishId: string): boolean {
  return /^[a-zA-Z0-9_-]{8,128}$/.test(publishId);
}

const activeSlugLocks = new Map<string, string>();

export function isSlugPublishLocked(slug: string): boolean {
  return activeSlugLocks.has(slug);
}

export function acquireSlugLock(slug: string, operationId: string): void {
  if (!isValidSlug(slug)) {
    throw new PublishError('Identificador (slug) do jogo inválido.', 400, 'INVALID_SLUG');
  }
  if (activeSlugLocks.has(slug)) {
    throw new PublishError(
      `Já existe uma operação de publicação ou restauração em andamento para "${slug}". Aguarde a conclusão antes de tentar novamente.`,
      409,
      'PUBLISH_IN_PROGRESS'
    );
  }
  activeSlugLocks.set(slug, operationId);
}

export function releaseSlugLock(slug: string, operationId: string): void {
  if (activeSlugLocks.get(slug) === operationId) {
    activeSlugLocks.delete(slug);
  }
}

export async function withSlugLock<T>(
  slug: string,
  operationId: string,
  fn: () => Promise<T>
): Promise<T> {
  acquireSlugLock(slug, operationId);
  try {
    return await fn();
  } finally {
    releaseSlugLock(slug, operationId);
  }
}

function normalizeZipEntryPath(rawName: string): {
  valid: boolean;
  cleanPath: string;
  reason?: string;
} {
  if (!rawName || /[\x00-\x1f\x7f]/.test(rawName)) {
    return { valid: false, cleanPath: rawName, reason: 'Nome de arquivo inválido ou caractere de controle' };
  }

  let normalized = rawName.replace(/\\/g, '/');
  while (normalized.startsWith('./')) {
    normalized = normalized.slice(2);
  }

  if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) {
    return { valid: false, cleanPath: rawName, reason: 'Caminho absoluto não permitido' };
  }

  const segments = normalized.split('/').filter((seg) => seg.length > 0);
  if (segments.some((seg) => seg === '..' || seg === '.')) {
    return { valid: false, cleanPath: rawName, reason: 'Path traversal (.. ou .) bloqueado' };
  }

  const cleanPath = segments.join('/');
  if (cleanPath.length > 512) {
    return { valid: false, cleanPath: rawName, reason: 'Caminho de arquivo excessivamente longo' };
  }

  return { valid: true, cleanPath };
}

function getSpecialUnixModeReason(entry: AdmZip.IZipEntry): string | null {
  const upperAttrs = (entry.header.attr >>> 16) & 0xffff;
  if (upperAttrs === 0) {
    return null;
  }
  const fileType = upperAttrs & 0o170000;
  if (fileType === 0o120000) {
    return 'symlink';
  }
  if (fileType !== 0 && fileType !== 0o100000 && fileType !== 0o040000) {
    return `tipo especial Unix (${fileType.toString(8)})`;
  }
  return null;
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

function isDangerousFile(cleanPath: string): boolean {
  const lower = cleanPath.toLowerCase();
  const baseName = lower.split('/').pop() || lower;
  if (DANGEROUS_FILENAMES.has(baseName)) return true;
  return DANGEROUS_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function htmlReferencesSourceModules(htmlContent: string): boolean {
  return (
    /<script[^>]+src=["'][^"']+\.(?:tsx|ts|jsx)(?:\?[^"']*)?["']/i.test(htmlContent) ||
    /<script[^>]+src=["']\/?src\/[^"']+["']/i.test(htmlContent)
  );
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

    if (/\.[a-z0-9]{1,8}$/i.test(cleanRef) && !availableRelPaths.has(cleanRef.toLowerCase())) {
      if (!missing.includes(cleanRef) && missing.length < 20) {
        missing.push(cleanRef);
      }
    }
  }

  return missing;
}

function safelyDecompressEntry(
  entry: AdmZip.IZipEntry,
  remainingBudget: number
): Buffer {
  const declaredSize = Math.max(0, entry.header.size || 0);
  if (declaredSize > remainingBudget) {
    throw new PublishError(
      `O conteúdo descompactado excede o limite de segurança de ${Math.round(MAX_UNCOMPRESSED_BYTES / 1024 / 1024)} MB.`,
      400,
      'UNCOMPRESSED_TOO_LARGE'
    );
  }

  const method = entry.header.method;
  const compressedData = entry.getCompressedData();
  const compressedSize = compressedData.length;

  let actualData: Buffer;
  if (method === 0) {
    // STORED
    if (compressedData.length > remainingBudget) {
      throw new PublishError(
        `O conteúdo descompactado excede o limite de segurança de ${Math.round(MAX_UNCOMPRESSED_BYTES / 1024 / 1024)} MB.`,
        400,
        'UNCOMPRESSED_TOO_LARGE'
      );
    }
    actualData = compressedData;
  } else if (method === 8) {
    // DEFLATE with strict C++-level maxOutputLength guard against spoofed ZIP bombs
    try {
      actualData = zlib.inflateRawSync(compressedData, {
        maxOutputLength: Math.max(1, remainingBudget),
      });
    } catch (err: any) {
      if (err?.code === 'ERR_BUFFER_TOO_LARGE' || err?.code === 'Z_BUF_ERROR') {
        throw new PublishError(
          `ZIP bomb ou tamanho descompactado acima do limite de ${Math.round(MAX_UNCOMPRESSED_BYTES / 1024 / 1024)} MB detectado em "${entry.entryName}".`,
          400,
          'ZIP_BOMB_DETECTED'
        );
      }
      throw new PublishError(
        `Falha ao descompactar arquivo "${entry.entryName}" no ZIP.`,
        400,
        'INVALID_ZIP_ENTRY',
        err?.message
      );
    }
  } else {
    throw new PublishError(
      `Método de compressão não suportado (${method}) no arquivo "${entry.entryName}".`,
      400,
      'UNSUPPORTED_COMPRESSION'
    );
  }

  if (actualData.length > remainingBudget) {
    throw new PublishError(
      `O conteúdo descompactado excede o limite de segurança de ${Math.round(MAX_UNCOMPRESSED_BYTES / 1024 / 1024)} MB.`,
      400,
      'UNCOMPRESSED_TOO_LARGE'
    );
  }

  // Guard against extreme compression ratios (>100x on payloads >= 1 MB)
  if (actualData.length >= 1024 * 1024) {
    const ratio = actualData.length / Math.max(1, compressedSize);
    if (ratio > MAX_COMPRESSION_RATIO) {
      throw new PublishError(
        `Taxa de compressão suspeita (${Math.round(ratio)}x) detectada em "${entry.entryName}".`,
        400,
        'ZIP_BOMB_DETECTED'
      );
    }
  }

  return actualData;
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
      duplicateFiles: [],
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
  const duplicateFiles: string[] = [];
  const warnings: string[] = [];
  const seenRawPaths = new Set<string>();
  const validFiles: { cleanPath: string; entry: AdmZip.IZipEntry; dataSize: number }[] = [];
  let uncompressedSize = 0;

  for (const entry of entries) {
    const check = normalizeZipEntryPath(entry.entryName);
    if (!check.valid) {
      pathTraversalFiles.push(entry.entryName);
      continue;
    }

    const specialMode = getSpecialUnixModeReason(entry);
    if (specialMode) {
      pathTraversalFiles.push(`${entry.entryName} (${specialMode})`);
      continue;
    }

    if (shouldSkipPath(check.cleanPath)) {
      continue;
    }

    if (entry.isDirectory) {
      continue;
    }

    const lowerCleanPath = check.cleanPath.toLowerCase();
    if (seenRawPaths.has(lowerCleanPath)) {
      if (!duplicateFiles.includes(check.cleanPath) && duplicateFiles.length < 20) {
        duplicateFiles.push(check.cleanPath);
      }
      continue;
    }
    seenRawPaths.add(lowerCleanPath);

    const remainingBudget = MAX_UNCOMPRESSED_BYTES - uncompressedSize;
    const data = safelyDecompressEntry(entry, remainingBudget);
    uncompressedSize += data.length;

    if (isDangerousFile(check.cleanPath)) {
      dangerousFiles.push(check.cleanPath);
    }

    validFiles.push({ cleanPath: check.cleanPath, entry, dataSize: data.length });
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
      duplicateFiles,
      totalFiles: entries.length,
      uncompressedSize,
      size: fileSize,
      isApto: false,
      errorMessage: 'Caminhos maliciosos ou links simbólicos detectados no arquivo ZIP.',
      warnings,
    };
  }

  if (duplicateFiles.length > 0) {
    return {
      hasIndex: false,
      hasPackageJson: false,
      projectType: 'invalid',
      projectTypeLabel: 'Arquivos Duplicados Detectados',
      detectedRoot: null,
      requiresBuild: false,
      buildScript: null,
      missingAssets: [],
      dangerousFiles,
      pathTraversalFiles,
      duplicateFiles,
      totalFiles: validFiles.length,
      uncompressedSize,
      size: fileSize,
      isApto: false,
      errorMessage: `O ZIP contém arquivos duplicados ou com conflito de maiúsculas/minúsculas: ${duplicateFiles.slice(0, 5).join(', ')}.`,
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
    const relLower = rel.toLowerCase();
    if (normalizedLowerSet.has(relLower)) {
      if (!duplicateFiles.includes(rel) && duplicateFiles.length < 20) {
        duplicateFiles.push(rel);
      }
      continue;
    }
    normalizedMap.set(rel, item.entry);
    normalizedLowerSet.add(relLower);
  }

  if (duplicateFiles.length > 0) {
    return {
      hasIndex: false,
      hasPackageJson: false,
      projectType: 'invalid',
      projectTypeLabel: 'Arquivos Duplicados Detectados',
      detectedRoot,
      requiresBuild: false,
      buildScript: null,
      missingAssets: [],
      dangerousFiles,
      pathTraversalFiles,
      duplicateFiles,
      totalFiles: validFiles.length,
      uncompressedSize,
      size: fileSize,
      isApto: false,
      errorMessage: `O ZIP contém arquivos duplicados após normalização: ${duplicateFiles.slice(0, 5).join(', ')}.`,
      warnings,
    };
  }

  if (detectedRoot) {
    warnings.push(`Pasta raiz "${detectedRoot}/" será normalizada automaticamente na publicação.`);
  }

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
      const pkgBuf = safelyDecompressEntry(pkgEntry, MAX_UNCOMPRESSED_BYTES);
      parsedPkg = JSON.parse(pkgBuf.toString('utf8'));
      buildScript = typeof parsedPkg?.scripts?.build === 'string' ? parsedPkg.scripts.build.trim() : null;
      const allDeps = {
        ...(parsedPkg?.dependencies || {}),
        ...(parsedPkg?.devDependencies || {}),
      };
      hasBuildDep = BUILD_DEPENDENCY_MARKERS.some((dep) => dep in allDeps);
    } catch (err: any) {
      if (err instanceof PublishError) throw err;
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
        duplicateFiles,
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
  const indexHtmlContent = indexEntry
    ? safelyDecompressEntry(indexEntry, MAX_INDEX_HTML_BYTES).toString('utf8')
    : '';
  const htmlUsesSourceEntry = indexEntry ? htmlReferencesSourceModules(indexHtmlContent) : false;

  const isBuildProject = Boolean(
    hasPackageJson && (buildScript || hasBuildDep || hasViteConfig || hasTsOrJsxSource || htmlUsesSourceEntry)
  );

  // Security Policy: Never execute npm install or npm run build on uploaded user ZIPs
  if (isBuildProject) {
    return {
      hasIndex,
      hasPackageJson: true,
      projectType: 'react-vite',
      projectTypeLabel: 'Projeto React / Vite (Requer Compilação Local)',
      detectedRoot,
      requiresBuild: true,
      buildScript: buildScript || 'vite build',
      missingAssets: [],
      dangerousFiles,
      pathTraversalFiles,
      duplicateFiles,
      totalFiles: validFiles.length,
      uncompressedSize,
      size: fileSize,
      isApto: false,
      errorMessage:
        'Projetos React/Vite que exigem compilação não são compilados no servidor por segurança. Execute "npm run build" localmente e envie apenas o conteúdo compilado (pasta dist/ com index.html) em formato .ZIP.',
      warnings,
    };
  }

  if (hasIndex) {
    if (htmlUsesSourceEntry) {
      return {
        hasIndex: true,
        hasPackageJson,
        projectType: 'invalid',
        projectTypeLabel: 'Código-Fonte Não Compilado',
        detectedRoot,
        requiresBuild: true,
        buildScript: null,
        missingAssets: [],
        dangerousFiles,
        pathTraversalFiles,
        duplicateFiles,
        totalFiles: validFiles.length,
        uncompressedSize,
        size: fileSize,
        isApto: false,
        errorMessage:
          'O index.html referencia código-fonte (/src/*.ts|tsx|jsx) que exige compilação. Compile o projeto localmente ("npm run build") e envie apenas a pasta compilada (dist/) em .ZIP.',
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
      duplicateFiles,
      totalFiles: validFiles.length,
      uncompressedSize,
      size: fileSize,
      isApto: isClean,
      errorMessage: isClean
        ? undefined
        : `Arquivos potencialmente perigosos detectados no ZIP: ${dangerousFiles.slice(0, 5).join(', ')}.`,
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
    duplicateFiles,
    totalFiles: validFiles.length,
    uncompressedSize,
    size: fileSize,
    isApto: false,
    errorMessage:
      'O ZIP deve conter um arquivo index.html na raiz de um jogo HTML5 já compilado e seus recursos.',
    warnings,
  };
}

function assertNoSymlinkInTargetHierarchy(resolvedRoot: string, destPath: string): void {
  const rel = path.relative(resolvedRoot, destPath);
  const parts = rel.split(path.sep).filter(Boolean);
  let current = resolvedRoot;

  for (let i = 0; i < parts.length - 1; i++) {
    current = path.join(current, parts[i]);
    if (fs.existsSync(current)) {
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        throw new PublishError(
          `Diretório de destino inválido ou symlink detectado: ${parts[i]}`,
          400,
          'SYMLINK_BLOCKED'
        );
      }
    }
  }
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

  const seenPaths = new Set<string>();
  let extractedFiles = 0;
  let uncompressedBytes = 0;

  for (const entry of entries) {
    const check = normalizeZipEntryPath(entry.entryName);
    if (!check.valid) {
      throw new PublishError(`Caminho bloqueado por segurança: ${entry.entryName}`, 400, 'PATH_TRAVERSAL');
    }

    const specialMode = getSpecialUnixModeReason(entry);
    if (specialMode) {
      throw new PublishError(
        `Entrada bloqueada por segurança (${specialMode}): ${entry.entryName}`,
        400,
        'SYMLINK_BLOCKED'
      );
    }

    if (shouldSkipPath(check.cleanPath) || entry.isDirectory) {
      continue;
    }

    const relPath = stripRootPrefix(check.cleanPath, stripPrefix);
    if (!relPath) continue;

    const lowerRel = relPath.toLowerCase();
    if (seenPaths.has(lowerRel)) {
      throw new PublishError(`Arquivo duplicado bloqueado por segurança: ${relPath}`, 400, 'DUPLICATE_FILES');
    }
    seenPaths.add(lowerRel);

    if (isDangerousFile(relPath)) {
      throw new PublishError(`Tipo de arquivo proibido: ${relPath}`, 400, 'DANGEROUS_FILE');
    }

    const destPath = path.resolve(resolvedRoot, relPath);
    if (destPath !== resolvedRoot && !destPath.startsWith(resolvedRoot + path.sep)) {
      throw new PublishError(`Tentativa de escrita fora da pasta isolada: ${relPath}`, 400, 'PATH_TRAVERSAL');
    }

    const remainingBudget = MAX_UNCOMPRESSED_BYTES - uncompressedBytes;
    const data = safelyDecompressEntry(entry, remainingBudget);
    uncompressedBytes += data.length;

    assertNoSymlinkInTargetHierarchy(resolvedRoot, destPath);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, data);
    extractedFiles++;
  }

  return { extractedFiles, uncompressedBytes };
}

function rewriteRootRelativeAssetsInIndexHtml(outputDir: string): void {
  const indexPath = path.join(outputDir, 'index.html');
  if (!fs.existsSync(indexPath)) return;

  const html = fs.readFileSync(indexPath, 'utf8');
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

function getPublicationsDir(backupsDir: string): string {
  return path.join(backupsDir, 'publications');
}

function getPublicationFilePath(backupsDir: string, publishId: string): string {
  if (!isValidPublishId(publishId)) {
    throw new PublishError('Identificador de publicação inválido.', 400, 'INVALID_PUBLISH_ID');
  }
  return path.join(getPublicationsDir(backupsDir), `${publishId}.json`);
}

function resolveDefaultBackupsDir(baseGamesDir: string): string {
  return path.join(path.dirname(path.resolve(baseGamesDir)), '.games-backups');
}

export function savePublicationRecord(backupsDir: string, record: PublicationRecord): void {
  const pubDir = getPublicationsDir(backupsDir);
  fs.mkdirSync(pubDir, { recursive: true });
  const targetPath = getPublicationFilePath(backupsDir, record.publishId);
  const tmpPath = `${targetPath}.tmp-${crypto.randomBytes(4).toString('hex')}`;
  fs.writeFileSync(tmpPath, JSON.stringify(record, null, 2), 'utf8');
  fs.renameSync(tmpPath, targetPath);
}

export function getPublicationRecord(backupsDir: string, publishId: string): PublicationRecord | null {
  if (!isValidPublishId(publishId)) return null;
  const filePath = getPublicationFilePath(backupsDir, publishId);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as PublicationRecord;
  } catch {
    return null;
  }
}

export function updatePublicationRecord(
  backupsDir: string,
  publishId: string,
  patch: Partial<PublicationRecord>
): PublicationRecord | null {
  const existing = getPublicationRecord(backupsDir, publishId);
  if (!existing) return null;
  const updated: PublicationRecord = {
    ...existing,
    ...patch,
    publishId: existing.publishId,
    slug: existing.slug,
    updatedAt: new Date().toISOString(),
  };
  savePublicationRecord(backupsDir, updated);
  return updated;
}

export function listPublicationsForSlug(backupsDir: string, slug: string): PublicationRecord[] {
  if (!isValidSlug(slug)) return [];
  const pubDir = getPublicationsDir(backupsDir);
  if (!fs.existsSync(pubDir)) return [];

  const records: PublicationRecord[] = [];
  for (const fileName of fs.readdirSync(pubDir)) {
    if (!fileName.endsWith('.json')) continue;
    try {
      const rec = JSON.parse(fs.readFileSync(path.join(pubDir, fileName), 'utf8')) as PublicationRecord;
      if (rec && rec.slug === slug) {
        records.push(rec);
      }
    } catch {
      // Ignore malformed metadata files
    }
  }

  return records.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function listBackupsForSlug(backupsDir: string, slug: string): PublicationRecord[] {
  return listPublicationsForSlug(backupsDir, slug).filter(
    (rec) => rec.hadPreviousLocal || rec.hadPreviousRemote
  );
}

function removeDirectorySafely(dirPath: string | null | undefined): void {
  if (!dirPath) return;
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch {
    // Ignore cleanup errors
  }
}

function replaceDirectoryAtomicallyFromCopy(sourceDir: string, targetDir: string, tag: string): void {
  if (!fs.existsSync(sourceDir) || !fs.existsSync(path.join(sourceDir, 'index.html'))) {
    throw new PublishError(
      'Snapshot de backup local ausente ou incompleto para restauração.',
      500,
      'INVALID_LOCAL_BACKUP'
    );
  }

  const stagingRestore = `${targetDir}.restore-staging-${tag}`;
  const swapOld = `${targetDir}.restore-old-${tag}`;

  removeDirectorySafely(stagingRestore);
  removeDirectorySafely(swapOld);

  fs.cpSync(sourceDir, stagingRestore, { recursive: true });
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });

  const hadCurrent = fs.existsSync(targetDir);
  if (hadCurrent) {
    fs.renameSync(targetDir, swapOld);
  }

  try {
    fs.renameSync(stagingRestore, targetDir);
  } catch (err: any) {
    if (hadCurrent && fs.existsSync(swapOld) && !fs.existsSync(targetDir)) {
      try {
        fs.renameSync(swapOld, targetDir);
      } catch {
        // Keep best recovery state
      }
    }
    removeDirectorySafely(stagingRestore);
    throw new PublishError(
      'Falha ao restaurar arquivos locais do jogo.',
      500,
      'LOCAL_RESTORE_FAILED',
      err?.message
    );
  }

  removeDirectorySafely(swapOld);
}

export async function publishGameZip(options: {
  zipPath: string;
  slug: string;
  baseGamesDir: string;
  backupsDir?: string;
  fileSize: number;
  publishId?: string;
  lockToken?: string;
  onBeforeLocalCommit?: (context: {
    slug: string;
    publishId: string;
    compiledZipPath: string;
    stagingDir: string;
    hadPreviousLocal: boolean;
    localBackupDir: string | null;
  }) => Promise<{
    hadPreviousRemote?: boolean;
    remoteBackupPath?: string | null;
    remoteDestination?: string;
  } | void>;
}): Promise<PublishResult> {
  const {
    zipPath,
    slug,
    baseGamesDir,
    backupsDir = resolveDefaultBackupsDir(baseGamesDir),
    fileSize,
    publishId: providedPublishId,
    lockToken,
    onBeforeLocalCommit,
  } = options;

  if (!isValidSlug(slug)) {
    throw new PublishError('Identificador (slug) do jogo inválido.', 400, 'INVALID_SLUG');
  }

  const publishId = providedPublishId || `pub-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  if (!isValidPublishId(publishId)) {
    throw new PublishError('Identificador de publicação inválido.', 400, 'INVALID_PUBLISH_ID');
  }

  const ownsLock = !lockToken || activeSlugLocks.get(slug) !== lockToken;
  if (ownsLock) {
    acquireSlugLock(slug, publishId);
  }

  const workspaceDir = path.join('/tmp', `cg-publish-${publishId}`);
  const extractDir = path.join(workspaceDir, 'extracted');
  const compiledZipPath = path.join('/tmp', `cg-package-${slug}-${publishId}.zip`);
  const targetDir = path.join(baseGamesDir, slug);
  const stagingDest = `${targetDir}.staging-${publishId}`;
  const swapOldDir = `${targetDir}.old-${publishId}`;
  const localBackupDir = path.join(backupsDir, slug, publishId, 'local');

  let committedLocally = false;
  let hadPreviousLocal = false;
  let createdLocalBackup = false;

  try {
    const inspection = inspectGameZip(zipPath, fileSize);
    if (!inspection.isApto) {
      const code =
        inspection.projectType === 'react-vite' || inspection.requiresBuild
          ? 'BUILD_REQUIRED_REJECTED'
          : inspection.duplicateFiles.length > 0
          ? 'DUPLICATE_FILES'
          : inspection.pathTraversalFiles.length > 0
          ? 'PATH_TRAVERSAL'
          : 'INVALID_GAME_PACKAGE';

      throw new PublishError(
        inspection.errorMessage || 'O pacote ZIP não atende aos requisitos de publicação.',
        400,
        code,
        inspection.dangerousFiles.length > 0
          ? `Arquivos bloqueados: ${inspection.dangerousFiles.join(', ')}`
          : undefined
      );
    }

    fs.mkdirSync(extractDir, { recursive: true });
    fs.mkdirSync(baseGamesDir, { recursive: true });
    fs.mkdirSync(backupsDir, { recursive: true });

    const now = new Date().toISOString();
    savePublicationRecord(backupsDir, {
      publishId,
      slug,
      state: 'processing',
      createdAt: now,
      updatedAt: now,
      hadPreviousLocal: false,
      hadPreviousRemote: false,
      localBackupDir: null,
      remoteBackupPath: null,
      remoteDestination: `games/${slug}.zip`,
      iframeUrl: `/games/${slug}/index.html`,
    });

    // 1. Extract validated HTML5 ZIP into isolated temporary directory
    safeExtractZip(zipPath, extractDir, inspection.detectedRoot);

    // 2. Verify final index.html exists at root
    const finalIndexPath = path.join(extractDir, 'index.html');
    if (!fs.existsSync(finalIndexPath)) {
      throw new PublishError(
        'O pacote final não contém index.html na raiz.',
        400,
        'MISSING_INDEX_HTML'
      );
    }

    // 3. Normalize root-relative asset paths (/assets/...) for subpath iframe serving (/games/<slug>/)
    rewriteRootRelativeAssetsInIndexHtml(extractDir);

    // 4. Create clean normalized ZIP for Firebase Storage persistence
    createZipFromDirectory(extractDir, compiledZipPath);

    // 5. Prepare local staging directory without touching any existing published version yet
    removeDirectorySafely(stagingDest);
    fs.cpSync(extractDir, stagingDest, { recursive: true });

    // 6. Preserve existing local version in dedicated backup directory BEFORE touching targetDir or Storage
    hadPreviousLocal = fs.existsSync(targetDir) && fs.existsSync(path.join(targetDir, 'index.html'));
    if (hadPreviousLocal) {
      try {
        removeDirectorySafely(localBackupDir);
        fs.mkdirSync(path.dirname(localBackupDir), { recursive: true });
        fs.cpSync(targetDir, localBackupDir, { recursive: true });
        if (!fs.existsSync(path.join(localBackupDir, 'index.html'))) {
          throw new Error('Backup local gerado sem index.html.');
        }
        createdLocalBackup = true;
      } catch (backupErr: any) {
        throw new PublishError(
          'Falha ao criar backup local da versão anterior. Nenhuma alteração foi aplicada.',
          500,
          'LOCAL_BACKUP_FAILED',
          backupErr?.message
        );
      }
    }

    updatePublicationRecord(backupsDir, publishId, {
      state: 'backup_created',
      hadPreviousLocal,
      localBackupDir: createdLocalBackup ? localBackupDir : null,
    });

    // 7. Execute mandatory pre-commit hook (e.g., remote backup + Storage upload) BEFORE overwriting targetDir
    let remoteMeta: {
      hadPreviousRemote?: boolean;
      remoteBackupPath?: string | null;
      remoteDestination?: string;
    } = {};

    if (onBeforeLocalCommit) {
      const hookRes = await onBeforeLocalCommit({
        slug,
        publishId,
        compiledZipPath,
        stagingDir: stagingDest,
        hadPreviousLocal,
        localBackupDir: createdLocalBackup ? localBackupDir : null,
      });
      if (hookRes && typeof hookRes === 'object') {
        remoteMeta = hookRes;
      }
    }

    // 8. Safe atomic replacement with rollback to previous version if local swap fails
    const hadAnyTargetDir = fs.existsSync(targetDir);
    if (hadAnyTargetDir) {
      removeDirectorySafely(swapOldDir);
      fs.renameSync(targetDir, swapOldDir);
    }

    try {
      fs.mkdirSync(path.dirname(targetDir), { recursive: true });
      fs.renameSync(stagingDest, targetDir);
      committedLocally = true;
    } catch (swapErr: any) {
      // Roll back previous published version if local replacement failed
      if (hadAnyTargetDir && fs.existsSync(swapOldDir) && !fs.existsSync(targetDir)) {
        try {
          fs.renameSync(swapOldDir, targetDir);
        } catch (rollbackErr) {
          console.error('[Publisher] Falha ao restaurar versão anterior após erro no commit:', rollbackErr);
        }
      } else if (createdLocalBackup && !fs.existsSync(targetDir)) {
        try {
          replaceDirectoryAtomicallyFromCopy(localBackupDir, targetDir, publishId);
        } catch (rollbackErr) {
          console.error('[Publisher] Falha ao restaurar backup local após erro no commit:', rollbackErr);
        }
      }
      throw new PublishError(
        'Falha ao substituir os arquivos do jogo publicado; versão anterior preservada.',
        500,
        'LOCAL_COMMIT_FAILED',
        swapErr?.message
      );
    }

    // Remove only the transient swap folder; the preserved backup in localBackupDir is KEPT
    // until safe Firestore confirmation and controlled retention cleanup!
    removeDirectorySafely(swapOldDir);

    updatePublicationRecord(backupsDir, publishId, {
      state: 'awaiting_firestore_confirmation',
      hadPreviousLocal,
      localBackupDir: createdLocalBackup ? localBackupDir : null,
      hadPreviousRemote: Boolean(remoteMeta.hadPreviousRemote),
      remoteBackupPath: remoteMeta.remoteBackupPath ?? null,
      remoteDestination: remoteMeta.remoteDestination ?? `games/${slug}.zip`,
    });

    return {
      publishId,
      state: 'awaiting_firestore_confirmation',
      slug,
      iframeUrl: `/games/${slug}/index.html`,
      projectType: inspection.projectType,
      projectTypeLabel: inspection.projectTypeLabel,
      compiled: false,
      compiledZipPath,
      hadPreviousLocal,
      localBackupDir: createdLocalBackup ? localBackupDir : null,
      warnings: inspection.warnings,
    };
  } catch (err: any) {
    if (!committedLocally) {
      removeDirectorySafely(stagingDest);
      if (fs.existsSync(compiledZipPath)) {
        try {
          fs.unlinkSync(compiledZipPath);
        } catch {
          // Ignore temp zip cleanup failure
        }
      }
    }

    if (fs.existsSync(backupsDir) && getPublicationRecord(backupsDir, publishId)) {
      updatePublicationRecord(backupsDir, publishId, {
        state: 'failed',
        failureReason: err?.message || 'Erro durante a publicação.',
      });
    }
    throw err;
  } finally {
    if (ownsLock) {
      releaseSlugLock(slug, publishId);
    }
    removeDirectorySafely(workspaceDir);
  }
}

export async function confirmPublication(options: {
  backupsDir: string;
  publishId: string;
  firestoreDocId?: string;
  retainCount?: number;
  onDeleteRemoteBackup?: (remoteBackupPath: string) => Promise<void>;
}): Promise<{
  record: PublicationRecord;
  prunedCount: number;
}> {
  const {
    backupsDir,
    publishId,
    firestoreDocId,
    retainCount = DEFAULT_RETAINED_BACKUPS,
    onDeleteRemoteBackup,
  } = options;

  const existing = getPublicationRecord(backupsDir, publishId);
  if (!existing) {
    throw new PublishError('Registro de publicação não encontrado.', 404, 'PUBLICATION_NOT_FOUND');
  }

  if (existing.state === 'rolled_back' || existing.state === 'failed') {
    throw new PublishError(
      'Esta publicação já foi revertida ou falhou e não pode ser confirmada.',
      409,
      'PUBLICATION_NOT_CONFIRMABLE'
    );
  }

  const confirmedRecord =
    existing.state === 'confirmed'
      ? existing
      : updatePublicationRecord(backupsDir, publishId, {
          state: 'confirmed',
          confirmedAt: new Date().toISOString(),
          firestoreDocId: firestoreDocId || existing.firestoreDocId,
        })!;

  // Controlled retention cleanup:
  // - Never delete backups of active/unconfirmed/awaiting_firestore_confirmation/processing publications.
  // - Keep the latest `retainCount` confirmed backups for recovery.
  const safeRetain = Math.max(1, retainCount);
  const allForSlug = listPublicationsForSlug(backupsDir, confirmedRecord.slug);
  const confirmedWithBackup = allForSlug.filter(
    (rec) => rec.state === 'confirmed' && (rec.localBackupDir || rec.remoteBackupPath)
  );

  let prunedCount = 0;
  const toPrune = confirmedWithBackup.slice(safeRetain);

  for (const oldRec of toPrune) {
    if (oldRec.publishId === publishId) continue;
    if (oldRec.remoteBackupPath && onDeleteRemoteBackup) {
      try {
        await onDeleteRemoteBackup(oldRec.remoteBackupPath);
      } catch (err: any) {
        console.warn(`[Backups] Falha controlada ao limpar backup remoto ${oldRec.remoteBackupPath}:`, err?.message || err);
        continue; // Do not erase local metadata if remote cleanup failed
      }
    }
    if (oldRec.localBackupDir) {
      removeDirectorySafely(path.dirname(oldRec.localBackupDir));
    }
    updatePublicationRecord(backupsDir, oldRec.publishId, {
      localBackupDir: null,
      remoteBackupPath: null,
    });
    prunedCount++;
  }

  return { record: confirmedRecord, prunedCount };
}

export async function rollbackPublication(options: {
  backupsDir: string;
  baseGamesDir: string;
  publishId: string;
  reason?: string;
  lockToken?: string;
  onRestoreRemote?: (context: {
    slug: string;
    publishId: string;
    hadPreviousRemote: boolean;
    remoteBackupPath: string | null;
    remoteDestination: string;
  }) => Promise<void>;
}): Promise<{
  record: PublicationRecord;
  restoredLocal: boolean;
  restoredRemote: boolean;
}> {
  const { backupsDir, baseGamesDir, publishId, reason, lockToken, onRestoreRemote } = options;

  const existing = getPublicationRecord(backupsDir, publishId);
  if (!existing) {
    throw new PublishError('Registro de publicação não encontrado para rollback.', 404, 'PUBLICATION_NOT_FOUND');
  }

  const execute = async () => {
    const current = getPublicationRecord(backupsDir, publishId) || existing;
    if (current.state === 'rolled_back') {
      return {
        record: current,
        restoredLocal: current.hadPreviousLocal,
        restoredRemote: current.hadPreviousRemote,
      };
    }

    const targetDir = path.join(baseGamesDir, current.slug);
    let restoredLocal = false;
    let restoredRemote = false;

    if (current.hadPreviousLocal) {
      if (!current.localBackupDir || !fs.existsSync(path.join(current.localBackupDir, 'index.html'))) {
        throw new PublishError(
          'Backup local da versão anterior não encontrado para restauração.',
          404,
          'LOCAL_BACKUP_MISSING'
        );
      }
      replaceDirectoryAtomicallyFromCopy(current.localBackupDir, targetDir, `rb-${publishId}`);
      restoredLocal = true;
    } else {
      // Brand new game whose publication was rolled back: remove unconfirmed local directory
      removeDirectorySafely(targetDir);
    }

    if (onRestoreRemote) {
      await onRestoreRemote({
        slug: current.slug,
        publishId: current.publishId,
        hadPreviousRemote: current.hadPreviousRemote,
        remoteBackupPath: current.remoteBackupPath,
        remoteDestination: current.remoteDestination,
      });
      restoredRemote = current.hadPreviousRemote;
    }

    const updated = updatePublicationRecord(backupsDir, publishId, {
      state: 'rolled_back',
      rolledBackAt: new Date().toISOString(),
      failureReason: reason || current.failureReason || 'Rollback executado.',
    })!;

    return { record: updated, restoredLocal, restoredRemote };
  };

  const opId = `rb-${publishId}`;
  const ownsLock = !lockToken || activeSlugLocks.get(existing.slug) !== lockToken;
  if (ownsLock) {
    return withSlugLock(existing.slug, opId, execute);
  }
  return execute();
}

export async function restoreLatestGameBackup(options: {
  backupsDir: string;
  baseGamesDir: string;
  slug: string;
  publishId?: string;
  onRestoreRemote?: (context: {
    slug: string;
    publishId: string;
    hadPreviousRemote: boolean;
    remoteBackupPath: string | null;
    remoteDestination: string;
  }) => Promise<void>;
}): Promise<{
  record: PublicationRecord;
  restoredLocal: boolean;
  restoredRemote: boolean;
}> {
  const { backupsDir, baseGamesDir, slug, publishId, onRestoreRemote } = options;

  if (!isValidSlug(slug)) {
    throw new PublishError('Identificador (slug) do jogo inválido.', 400, 'INVALID_SLUG');
  }

  let candidate: PublicationRecord | null = null;
  if (publishId) {
    candidate = getPublicationRecord(backupsDir, publishId);
    if (!candidate || candidate.slug !== slug) {
      throw new PublishError('Backup especificado não encontrado para este jogo.', 404, 'BACKUP_NOT_FOUND');
    }
  } else {
    const backups = listBackupsForSlug(backupsDir, slug);
    candidate =
      backups.find(
        (b) =>
          (b.localBackupDir && fs.existsSync(path.join(b.localBackupDir, 'index.html'))) ||
          b.remoteBackupPath
      ) || null;
  }

  if (!candidate) {
    throw new PublishError(
      `Nenhum backup recuperável encontrado para "${slug}".`,
      404,
      'BACKUP_NOT_FOUND'
    );
  }

  const opId = `restore-${candidate.publishId}`;
  return withSlugLock(slug, opId, async () => {
    const targetDir = path.join(baseGamesDir, slug);
    let restoredLocal = false;
    let restoredRemote = false;

    if (candidate!.localBackupDir && fs.existsSync(path.join(candidate!.localBackupDir, 'index.html'))) {
      replaceDirectoryAtomicallyFromCopy(candidate!.localBackupDir, targetDir, `rest-${Date.now()}`);
      restoredLocal = true;
    }

    if (onRestoreRemote && candidate!.remoteBackupPath) {
      await onRestoreRemote({
        slug,
        publishId: candidate!.publishId,
        hadPreviousRemote: true,
        remoteBackupPath: candidate!.remoteBackupPath,
        remoteDestination: candidate!.remoteDestination,
      });
      restoredRemote = true;
    }

    const updated = updatePublicationRecord(backupsDir, candidate!.publishId, {
      state: 'rolled_back',
      rolledBackAt: new Date().toISOString(),
      failureReason: 'Restauração manual da versão anterior.',
    })!;

    return { record: updated, restoredLocal, restoredRemote };
  });
}
