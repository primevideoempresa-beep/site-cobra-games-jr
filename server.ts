import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { initializeApp, getApps, App, cert, ServiceAccount } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import {
  inspectGameZip,
  publishGameZip,
  confirmPublication,
  rollbackPublication,
  restoreLatestGameBackup,
  getPublicationRecord,
  listBackupsForSlug,
  withSlugLock,
  safeExtractZip,
  sanitizeSlug,
  isValidSlug,
  isValidPublishId,
  PublishError,
  MAX_ZIP_SIZE_BYTES,
  DEFAULT_RETAINED_BACKUPS,
} from './server-publisher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot =
  path.basename(__dirname) === 'server-dist' ? path.resolve(__dirname, '..') : __dirname;
const frontendDistDir = path.resolve(projectRoot, 'dist');

interface FirebaseAppletConfig {
  projectId: string;
  storageBucket: string;
  firestoreDatabaseId?: string;
}

function loadFirebaseAppletConfig(): FirebaseAppletConfig {
  const configPath = path.join(projectRoot, 'firebase-applet-config.json');
  let fileConfig: Partial<FirebaseAppletConfig> = {};
  if (fs.existsSync(configPath)) {
    fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  const projectId = (process.env.FIREBASE_PROJECT_ID || fileConfig.projectId || '').trim();
  const storageBucket = (process.env.FIREBASE_STORAGE_BUCKET || fileConfig.storageBucket || '').trim();
  const firestoreDatabaseId = (
    process.env.FIREBASE_DATABASE_ID ||
    fileConfig.firestoreDatabaseId ||
    ''
  ).trim();

  if (!projectId) {
    throw new Error('Firebase projectId não configurado (firebase-applet-config.json ou FIREBASE_PROJECT_ID).');
  }

  return {
    projectId,
    storageBucket,
    firestoreDatabaseId: firestoreDatabaseId || undefined,
  };
}

function parseServiceAccountFromEnv(): ServiceAccount | null {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (rawJson) {
    try {
      if (rawJson.startsWith('{')) {
        return JSON.parse(rawJson) as ServiceAccount;
      }
      const decoded = Buffer.from(rawJson, 'base64').toString('utf8');
      return JSON.parse(decoded) as ServiceAccount;
    } catch (err: any) {
      console.error('[Firebase Admin] Falha ao interpretar FIREBASE_SERVICE_ACCOUNT:', err?.message || err);
      return null;
    }
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').trim();
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();

  if (clientEmail && privateKey) {
    return {
      projectId,
      clientEmail,
      privateKey,
    };
  }

  return null;
}

// Initialize Firebase Admin
const firebaseConfig = loadFirebaseAppletConfig();

let firebaseApp: App;
if (!getApps().length) {
  const serviceAccount = parseServiceAccountFromEnv();
  if (serviceAccount) {
    firebaseApp = initializeApp({
      credential: cert(serviceAccount),
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket || undefined,
    });
  } else {
    firebaseApp = initializeApp({
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket || undefined,
    });
  }
} else {
  firebaseApp = getApps()[0];
}

const bucket = getStorage(firebaseApp).bucket();
const auth = getAuth(firebaseApp);
const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(firebaseApp);

// Auto-seed primary admin (Security Pillar: Identity Bootstrap)
async function ensurePrimaryAdmin() {
  try {
    const email = 'primevideoempresa@gmail.com';
    const adminRef = db.collection('authorized_admins').doc(email);
    const snap = await adminRef.get();
    if (!snap.exists) {
      console.log('Initializing primary admin authorization...');
      await adminRef.set({
        role: 'owner',
        addedAt: new Date(),
        verified: true,
      });
      console.log('Primary admin authorized successfully.');
    }
  } catch (err: any) {
    const msg = String(err?.message || '');
    if (
      err?.code === 7 ||
      msg.includes('PERMISSION_DENIED') ||
      msg.includes('Could not load the default credentials')
    ) {
      console.warn(
        'Admin SDK without Firestore IAM credentials in current runtime; client owner bootstrap remains enforced by Firestore Rules.'
      );
    } else {
      console.error('Failed to bootstrap primary admin:', msg);
    }
  }
}

ensurePrimaryAdmin();

const isProd = process.env.NODE_ENV === 'production';
const DEFAULT_ALLOWED_ORIGINS = ['https://cobra-games-jr.vercel.app'];

function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>(DEFAULT_ALLOWED_ORIGINS);
  if (!isProd) {
    origins.add('http://localhost:3000');
    origins.add('http://127.0.0.1:3000');
  }

  const appUrlRaw = process.env.APP_URL?.trim();
  if (appUrlRaw) {
    try {
      const parsed = new URL(appUrlRaw);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        origins.add(parsed.origin);
      }
    } catch {
      // Ignore invalid APP_URL
    }
  }

  const envRaw = [
    process.env.CORS_ALLOWED_ORIGINS,
    process.env.ALLOWED_ORIGINS,
    process.env.CORS_ORIGIN,
  ]
    .filter(Boolean)
    .join(',');

  for (const item of envRaw.split(',')) {
    const normalized = item.trim().replace(/\/+$/, '');
    if (normalized && /^https?:\/\/[^/\s]+$/i.test(normalized)) {
      origins.add(normalized);
    }
  }
  return origins;
}

const allowedOrigins = getAllowedOrigins();

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    const normalized = origin.trim().replace(/\/+$/, '');
    if (allowedOrigins.has(normalized)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  optionsSuccessStatus: 204,
};

const app = express();
const port = Number(process.env.PORT) || 3000;

app.disable('x-powered-by');
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '50mb' }));

// Security guard: never expose internal server files or private config via HTTP
const BLOCKED_INTERNAL_PATH_PATTERNS = [
  /^\/server(?:-publisher)?\.(?:js|ts|mjs|cjs|map)$/i,
  /^\/server-dist(?:\/|$)/i,
  /^\/tsconfig(?:\.[^/]+)?\.json$/i,
  /^\/package(?:-lock)?\.json$/i,
  /^\/firebase-applet-config\.json$/i,
  /^\/firebase-blueprint\.json$/i,
  /^\/firestore\.rules$/i,
  /^\/\.env(?:\.|$)/i,
  /^\/\.games-backups(?:\/|$)/i,
];

app.use((req, res, next) => {
  const normalizedPath = (req.path || '/').replace(/\/{2,}/g, '/');
  // In Vite dev mode, static JSON imports (`import cfg from '../../firebase-applet-config.json'`)
  // are requested by the browser as `/firebase-applet-config.json?import` and transformed into JS by Vite.
  const isViteDevJsonModuleImport =
    !isProd &&
    normalizedPath.toLowerCase() === '/firebase-applet-config.json' &&
    Object.prototype.hasOwnProperty.call(req.query, 'import');

  if (!isViteDevJsonModuleImport && BLOCKED_INTERNAL_PATH_PATTERNS.some((pattern) => pattern.test(normalizedPath))) {
    return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
  }
  return next();
});

const baseGamesDir =
  process.env.GAMES_STORAGE_DIR?.trim() ||
  (isProd ? '/tmp/games' : path.join(projectRoot, 'public', 'games'));
const baseBackupsDir =
  process.env.GAMES_BACKUP_DIR?.trim() ||
  (isProd ? '/tmp/games-backups' : path.join(projectRoot, '.games-backups'));

if (!fs.existsSync(baseGamesDir)) {
  fs.mkdirSync(baseGamesDir, { recursive: true });
}
if (!fs.existsSync(baseBackupsDir)) {
  fs.mkdirSync(baseBackupsDir, { recursive: true });
}

// Setup multer for ZIP uploads
const uploadDir = '/tmp/uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: MAX_ZIP_SIZE_BYTES }, // 100MB limit
});

function safeUnlink(filePath?: string | null) {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Ignore cleanup failures
  }
}

async function verifyAdminViaUserTokenFirestoreRest(
  idToken: string,
  email: string,
  uid: string
): Promise<boolean> {
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/${encodeURIComponent(databaseId)}/documents/authorized_admins/${encodeURIComponent(email)}`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });
  if (!resp.ok) return false;
  try {
    const docJson: any = await resp.json();
    const fields = docJson?.fields || {};
    const verified = fields.verified?.booleanValue;
    const docUid = fields.uid?.stringValue;
    if (verified === false) return false;
    if (docUid && docUid !== uid) return false;
    return true;
  } catch {
    return true;
  }
}

function isMissingAdminCredentialsError(err: any): boolean {
  const msg = String(err?.message || '');
  return (
    err?.code === 7 ||
    err?.code === 16 ||
    msg.includes('PERMISSION_DENIED') ||
    msg.includes('UNAUTHENTICATED') ||
    msg.includes('Could not load the default credentials') ||
    msg.includes('Unable to detect a Project Id')
  );
}

// Middleware to verify Admin Token (Security Pillar 8)
async function verifyAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autorizado. Token ausente.', code: 'AUTH_MISSING_TOKEN' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    const email = decodedToken.email?.trim().toLowerCase();

    if (!email || !decodedToken.email_verified) {
      return res.status(403).json({ error: 'Acesso negado. E-mail não verificado.', code: 'AUTH_UNVERIFIED_EMAIL' });
    }

    // Security Pillar: Verify admin identity via Firestore (Dynamic Authorization)
    let isAuthorized = false;
    try {
      const adminDoc = await db.collection('authorized_admins').doc(email).get();
      if (adminDoc.exists) {
        const data = adminDoc.data() || {};
        isAuthorized = data.verified !== false && (!data.uid || data.uid === decodedToken.uid);
      }
    } catch (dbErr: any) {
      if (isMissingAdminCredentialsError(dbErr)) {
        isAuthorized = await verifyAdminViaUserTokenFirestoreRest(idToken, email, decodedToken.uid);
      } else {
        throw dbErr;
      }
    }

    if (!isAuthorized) {
      console.warn('Unauthorized admin attempt blocked.');
      return res.status(403).json({
        error: 'Acesso negado. Esta conta não possui privilégios administrativos.',
        code: 'AUTH_FORBIDDEN',
      });
    }

    (req as any).user = decodedToken;
    next();
  } catch (error) {
    console.error('Auth Error:', error instanceof Error ? error.message : 'Invalid token');
    res.status(401).json({ error: 'Sessão administrativa inválida ou expirada.', code: 'AUTH_INVALID_SESSION' });
  }
}

const hydrationLocks = new Map<string, Promise<boolean>>();

// Helper to ensure game is extracted safely after restarts (Persistence Pillar 2)
async function ensureGameExtracted(slug: string): Promise<boolean> {
  if (!isValidSlug(slug)) return false;

  const targetDir = path.join(baseGamesDir, slug);
  if (fs.existsSync(targetDir) && fs.existsSync(path.join(targetDir, 'index.html'))) {
    return true;
  }

  const existingLock = hydrationLocks.get(slug);
  if (existingLock) {
    return existingLock;
  }

  const hydratePromise = (async () => {
    const rand = crypto.randomBytes(6).toString('hex');
    const localZipPath = path.join('/tmp', `hydrate-${slug}-${rand}.zip`);
    const stagingDir = `${targetDir}.hydrate-${rand}`;

    try {
      const remoteFile = bucket.file(`games/${slug}.zip`);
      const [exists] = await remoteFile.exists();
      if (!exists) return false;

      await remoteFile.download({ destination: localZipPath });
      safeExtractZip(localZipPath, stagingDir);

      if (!fs.existsSync(path.join(stagingDir, 'index.html'))) {
        return false;
      }

      fs.mkdirSync(path.dirname(targetDir), { recursive: true });
      if (!fs.existsSync(targetDir)) {
        fs.renameSync(stagingDir, targetDir);
      } else {
        fs.rmSync(stagingDir, { recursive: true, force: true });
      }
      return fs.existsSync(path.join(targetDir, 'index.html'));
    } catch (err: any) {
      console.warn(`[Storage] Auto-hidratação indisponível para "${slug}":`, err?.message || err);
      return false;
    } finally {
      safeUnlink(localZipPath);
      if (fs.existsSync(stagingDir)) {
        try {
          fs.rmSync(stagingDir, { recursive: true, force: true });
        } catch {
          // Ignore staging cleanup failure
        }
      }
      hydrationLocks.delete(slug);
    }
  })();

  hydrationLocks.set(slug, hydratePromise);
  return hydratePromise;
}

// API Routes
app.get('/api/health', (_req, res) => {
  return res.status(200).json({
    ok: true,
    status: 'ok',
    service: 'cobra-games-publisher',
    timestamp: new Date().toISOString(),
  });
});

async function restoreRemoteStorageZip(context: {
  slug: string;
  publishId: string;
  hadPreviousRemote: boolean;
  remoteBackupPath: string | null;
  remoteDestination: string;
}): Promise<void> {
  const { hadPreviousRemote, remoteBackupPath, remoteDestination } = context;
  if (hadPreviousRemote && remoteBackupPath) {
    const backupFile = bucket.file(remoteBackupPath);
    const [backupExists] = await backupFile.exists();
    if (!backupExists) {
      throw new PublishError(
        `Backup remoto não encontrado em ${remoteBackupPath}.`,
        404,
        'REMOTE_BACKUP_MISSING'
      );
    }
    await backupFile.copy(bucket.file(remoteDestination));
    return;
  }

  if (!hadPreviousRemote) {
    await bucket
      .file(remoteDestination)
      .delete({ ignoreNotFound: true })
      .catch(() => {});
  }
}

app.post('/api/games/upload', verifyAdmin, upload.single('zip'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Nenhum arquivo ZIP enviado.', code: 'MISSING_FILE' });
  }

  const rawTitle = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  if (!rawTitle) {
    safeUnlink(req.file.path);
    return res.status(400).json({ success: false, error: 'Título do jogo é obrigatório.', code: 'MISSING_TITLE' });
  }

  const slug = sanitizeSlug(rawTitle);
  const publishId = `pub-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const destination = `games/${slug}.zip`;
  const backupDestination = `games/.backups/${slug}/${publishId}.zip`;
  let compiledZipPath: string | null = null;
  let storageUploaded = false;
  let storageBackupCreated = false;
  let hadPreviousRemote = false;

  try {
    const result = await withSlugLock(slug, publishId, async () => {
      return publishGameZip({
        zipPath: req.file!.path,
        slug,
        baseGamesDir,
        backupsDir: baseBackupsDir,
        fileSize: req.file!.size,
        publishId,
        lockToken: publishId,
        onBeforeLocalCommit: async ({ compiledZipPath: zipToUpload }) => {
          const remoteFile = bucket.file(destination);
          // Mandatory backup of existing remote ZIP before replacement
          try {
            const [exists] = await remoteFile.exists();
            if (exists) {
              hadPreviousRemote = true;
              await remoteFile.copy(bucket.file(backupDestination));
              const [backupVerified] = await bucket.file(backupDestination).exists();
              if (!backupVerified) {
                throw new Error('Cópia de backup remoto não foi confirmada no Storage.');
              }
              storageBackupCreated = true;
            }
          } catch (backupErr: any) {
            const msg = String(backupErr?.message || backupErr);
            console.error(`[Storage] Falha ao proteger backup remoto de ${slug}:`, msg);
            throw new PublishError(
              'Falha ao criar backup de segurança da versão anterior no Firebase Storage. A publicação foi cancelada para preservar o jogo atual.',
              502,
              'REMOTE_BACKUP_FAILED',
              msg
            );
          }

          try {
            await bucket.upload(zipToUpload, {
              destination,
              metadata: {
                contentType: 'application/zip',
                cacheControl: 'public, max-age=31536000',
              },
            });
            storageUploaded = true;
          } catch (storageErr: any) {
            const msg = String(storageErr?.message || storageErr);
            console.error(`[Storage] Falha obrigatória ao salvar ${destination} no Firebase Storage:`, msg);
            if (storageBackupCreated) {
              try {
                await bucket.file(backupDestination).copy(bucket.file(destination));
              } catch (restoreErr: any) {
                console.error(`[Storage] Falha ao restaurar ${destination} após erro de upload:`, restoreErr?.message || restoreErr);
              }
            }
            throw new PublishError(
              'Falha ao salvar o pacote ZIP no Firebase Storage. A publicação foi cancelada e nenhuma versão anterior foi substituída.',
              502,
              'STORAGE_UPLOAD_FAILED',
              msg
            );
          }

          return {
            hadPreviousRemote,
            remoteBackupPath: storageBackupCreated ? backupDestination : null,
            remoteDestination: destination,
          };
        },
      });
    });

    compiledZipPath = result.compiledZipPath;

    return res.json({
      success: true,
      publishId: result.publishId,
      status: result.state,
      hasPreviousVersion: result.hadPreviousLocal || storageBackupCreated,
      backupPreserved: true,
      slug: result.slug,
      iframeUrl: result.iframeUrl,
      projectType: result.projectType,
      projectTypeLabel: result.projectTypeLabel,
      compiled: result.compiled,
      storageSynced: true,
      warnings: result.warnings,
    });
  } catch (err: any) {
    // If Storage was updated but local commit failed afterwards, restore previous Storage ZIP
    if (storageUploaded) {
      try {
        await restoreRemoteStorageZip({
          slug,
          publishId,
          hadPreviousRemote: storageBackupCreated,
          remoteBackupPath: storageBackupCreated ? backupDestination : null,
          remoteDestination: destination,
        });
        console.log(`[Storage] Estado remoto de ${destination} restaurado após falha no commit local.`);
      } catch (restoreErr: any) {
        console.error(`[Storage] Falha ao restaurar backup ${backupDestination}:`, restoreErr?.message || restoreErr);
      }
    }

    if (err instanceof PublishError) {
      console.error(`[PublishError] (${err.code}) ${err.message}`);
      return res.status(err.status).json({
        success: false,
        publishId,
        error: err.message,
        code: err.code,
        details: err.details,
      });
    }

    console.error('Upload/Publish unexpected error:', err);
    return res.status(500).json({
      success: false,
      publishId,
      error: 'Erro interno ao processar e publicar o jogo.',
      code: 'UPLOAD_FAILED',
      details: err?.message,
    });
  } finally {
    // IMPORTANT: Do NOT delete remote backupDestination or localBackupDir here!
    // Backups remain preserved until explicit Firestore confirmation and controlled retention cleanup.
    safeUnlink(req.file?.path);
    safeUnlink(compiledZipPath);
  }
});

// Get staged publication state
app.get('/api/games/publish/:publishId', verifyAdmin, (req, res) => {
  const { publishId } = req.params;
  if (!isValidPublishId(publishId)) {
    return res.status(400).json({ success: false, error: 'publishId inválido.', code: 'INVALID_PUBLISH_ID' });
  }
  const record = getPublicationRecord(baseBackupsDir, publishId);
  if (!record) {
    return res.status(404).json({ success: false, error: 'Publicação não encontrada.', code: 'PUBLICATION_NOT_FOUND' });
  }
  return res.json({ success: true, publication: record });
});

// Confirm publication after Firestore update succeeds (triggers controlled retention cleanup)
app.post('/api/games/publish/:publishId/confirm', verifyAdmin, async (req, res) => {
  const { publishId } = req.params;
  if (!isValidPublishId(publishId)) {
    return res.status(400).json({ success: false, error: 'publishId inválido.', code: 'INVALID_PUBLISH_ID' });
  }

  const firestoreDocId = typeof req.body?.firestoreDocId === 'string' ? req.body.firestoreDocId.trim() : undefined;
  try {
    const { record, prunedCount } = await confirmPublication({
      backupsDir: baseBackupsDir,
      publishId,
      firestoreDocId,
      retainCount: DEFAULT_RETAINED_BACKUPS,
      onDeleteRemoteBackup: async (remoteBackupPath) => {
        await bucket.file(remoteBackupPath).delete({ ignoreNotFound: true });
      },
    });
    return res.json({
      success: true,
      publishId: record.publishId,
      status: record.state,
      prunedOldBackups: prunedCount,
      publication: record,
    });
  } catch (err: any) {
    if (err instanceof PublishError) {
      return res.status(err.status).json({
        success: false,
        error: err.message,
        code: err.code,
        details: err.details,
      });
    }
    console.error('Confirm publication error:', err);
    return res.status(500).json({
      success: false,
      error: 'Erro ao confirmar publicação.',
      code: 'CONFIRM_FAILED',
      details: err?.message,
    });
  }
});

// Rollback publication if Firestore/network fails after upload (or on explicit admin rollback)
app.post('/api/games/publish/:publishId/rollback', verifyAdmin, async (req, res) => {
  const { publishId } = req.params;
  if (!isValidPublishId(publishId)) {
    return res.status(400).json({ success: false, error: 'publishId inválido.', code: 'INVALID_PUBLISH_ID' });
  }

  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : undefined;
  try {
    const { record, restoredLocal, restoredRemote } = await rollbackPublication({
      backupsDir: baseBackupsDir,
      baseGamesDir,
      publishId,
      reason,
      onRestoreRemote: restoreRemoteStorageZip,
    });
    return res.json({
      success: true,
      publishId: record.publishId,
      status: record.state,
      restoredLocal,
      restoredRemote,
      publication: record,
    });
  } catch (err: any) {
    if (err instanceof PublishError) {
      return res.status(err.status).json({
        success: false,
        error: err.message,
        code: err.code,
        details: err.details,
      });
    }
    console.error('Rollback publication error:', err);
    return res.status(500).json({
      success: false,
      error: 'Erro ao reverter publicação.',
      code: 'ROLLBACK_FAILED',
      details: err?.message,
    });
  }
});

// List preserved backups for a game slug
app.get('/api/games/:slug/backups', verifyAdmin, async (req, res) => {
  const { slug } = req.params;
  if (!isValidSlug(slug)) {
    return res.status(400).json({ success: false, error: 'Slug inválido.', code: 'INVALID_SLUG' });
  }
  const localRecords = listBackupsForSlug(baseBackupsDir, slug);
  let remoteBackups: string[] = [];
  try {
    const [files] = await bucket.getFiles({ prefix: `games/.backups/${slug}/` });
    remoteBackups = files.map((f) => f.name).sort().reverse();
  } catch {
    // Storage listing unavailable in local-only mode
  }
  return res.json({
    success: true,
    slug,
    backups: localRecords,
    remoteBackups,
  });
});

// Restore latest (or specific) previous version of a game
app.post('/api/games/:slug/restore', verifyAdmin, async (req, res) => {
  const { slug } = req.params;
  if (!isValidSlug(slug)) {
    return res.status(400).json({ success: false, error: 'Slug inválido.', code: 'INVALID_SLUG' });
  }
  const publishId = typeof req.body?.publishId === 'string' ? req.body.publishId.trim() : undefined;

  try {
    const result = await restoreLatestGameBackup({
      backupsDir: baseBackupsDir,
      baseGamesDir,
      slug,
      publishId,
      onRestoreRemote: restoreRemoteStorageZip,
    });
    return res.json({
      success: true,
      slug,
      restoredLocal: result.restoredLocal,
      restoredRemote: result.restoredRemote,
      publication: result.record,
    });
  } catch (err: any) {
    // Fallback to remote Firebase Storage backups if local container restarted
    if (err instanceof PublishError && err.code === 'BACKUP_NOT_FOUND' && !publishId) {
      try {
        const [files] = await bucket.getFiles({ prefix: `games/.backups/${slug}/` });
        const latestRemote = files
          .filter((f) => f.name.endsWith('.zip'))
          .sort((a, b) => b.name.localeCompare(a.name))[0];
        if (latestRemote) {
          const restoreOpId = `remote-restore-${Date.now()}`;
          await withSlugLock(slug, restoreOpId, async () => {
            await latestRemote.copy(bucket.file(`games/${slug}.zip`));
            const targetDir = path.join(baseGamesDir, slug);
            if (fs.existsSync(targetDir)) {
              fs.rmSync(targetDir, { recursive: true, force: true });
            }
            await ensureGameExtracted(slug);
          });
          return res.json({
            success: true,
            slug,
            restoredLocal: true,
            restoredRemote: true,
            restoredFromRemoteBackup: latestRemote.name,
          });
        }
      } catch (remoteErr: any) {
        console.error(`[Restore] Falha ao restaurar backup remoto de ${slug}:`, remoteErr?.message || remoteErr);
      }
    }

    if (err instanceof PublishError) {
      return res.status(err.status).json({
        success: false,
        error: err.message,
        code: err.code,
        details: err.details,
      });
    }
    console.error('Restore game error:', err);
    return res.status(500).json({
      success: false,
      error: 'Erro ao restaurar versão anterior do jogo.',
      code: 'RESTORE_FAILED',
      details: err?.message,
    });
  }
});

// Admin Verification API
app.post('/api/games/verify', verifyAdmin, upload.single('zip'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo ZIP enviado.', code: 'MISSING_FILE' });
  }

  try {
    const results = inspectGameZip(req.file.path, req.file.size);
    return res.json(results);
  } catch (err: any) {
    if (err instanceof PublishError) {
      return res.status(err.status).json({
        error: err.message,
        code: err.code,
        details: err.details,
      });
    }

    console.error('ZIP verification error:', err);
    return res.status(500).json({
      error: 'Erro ao analisar o arquivo ZIP.',
      code: 'VERIFY_FAILED',
      details: err?.message,
    });
  } finally {
    safeUnlink(req.file?.path);
  }
});

// Redirect /games/:slug -> /games/:slug/ so relative assets resolve properly
app.get('/games/:slug', (req, res) => {
  const { slug } = req.params;
  if (!isValidSlug(slug)) {
    return res.status(400).send('Identificador de jogo inválido.');
  }
  return res.redirect(302, `/games/${slug}/`);
});

// Serve Games with auto-hydration & path-traversal protection (Persistence Pillar 5)
app.get('/games/:slug/*', async (req, res) => {
  const { slug } = req.params;
  if (!isValidSlug(slug)) {
    return res.status(400).send('Identificador de jogo inválido.');
  }

  const rawFilePath = (req.params as Record<string, string>)[0] || 'index.html';

  try {
    const success = await ensureGameExtracted(slug);
    if (!success) {
      return res.status(404).send('Jogo não encontrado ou falha na sincronização.');
    }

    const gameRoot = path.resolve(baseGamesDir, slug);
    let resolvedPath = path.resolve(gameRoot, rawFilePath);

    if (resolvedPath !== gameRoot && !resolvedPath.startsWith(gameRoot + path.sep)) {
      return res.status(403).send('Acesso negado.');
    }

    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
      resolvedPath = path.join(resolvedPath, 'index.html');
    }

    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.sendFile(resolvedPath);
    }

    return res.status(404).send('Arquivo do jogo não encontrado.');
  } catch (err) {
    console.error('Serve game error:', err);
    return res.status(500).send('Erro interno ao servir o jogo.');
  }
});

// Express JSON error handler (catches Multer & unexpected middleware errors without emitting HTML)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: `O arquivo ZIP excede o limite máximo permitido de ${Math.round(MAX_ZIP_SIZE_BYTES / 1024 / 1024)} MB.`,
        code: 'LIMIT_FILE_SIZE',
      });
    }
    return res.status(400).json({
      success: false,
      error: `Erro no upload do arquivo: ${err.message}`,
      code: err.code || 'MULTER_ERROR',
    });
  }

  if (req.originalUrl.startsWith('/api')) {
    return res.status(err?.status || 500).json({
      success: false,
      error: err?.message || 'Erro interno no servidor.',
      code: err?.code || 'INTERNAL_SERVER_ERROR',
    });
  }

  return next(err);
});

// Initialize Vite or Static Server
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    // Ensure any unmatched /api/* route ALWAYS returns JSON instead of Vite SPA HTML,
    // while letting /api/gstatic-models/* reach Vite's model proxy.
    app.all('/api/*', (req, res, next) => {
      if (req.path.startsWith('/api/gstatic-models/')) {
        return next();
      }
      return res.status(404).json({
        error: `Endpoint não encontrado: ${req.method} ${req.originalUrl}`,
        code: 'API_NOT_FOUND',
      });
    });

    app.use(vite.middlewares);

    // Serve index.html for all non-API routes in dev
    app.get('*', async (req, res, next) => {
      if (req.url.startsWith('/api') || req.url.startsWith('/games')) {
        return next();
      }
      try {
        const template = fs.readFileSync(path.resolve(projectRoot, 'index.html'), 'utf-8');
        const html = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // Explicitly serve ONLY the frontend dist/ directory (never server-dist/)
    app.use(express.static(frontendDistDir));

    // Allowlisted Desk Racer 3D GLB model fallback proxy for production builds
    const ALLOWED_DESK_RACER_GLBS = new Set([
      'desk_props.glb',
      'kart_1to87.glb',
      'room_environment.glb',
      'track_coaster.glb',
    ]);

    const handleGlbProxy = async (req: express.Request, res: express.Response) => {
      const filename = req.params.filename;
      if (!filename || !ALLOWED_DESK_RACER_GLBS.has(filename)) {
        return res.status(404).json({ error: 'Modelo 3D não encontrado.', code: 'MODEL_NOT_FOUND' });
      }
      try {
        const upstreamUrl = `https://www.gstatic.com/aistudio/starter-apps/desk-racer/models/${filename}`;
        const upstreamRes = await fetch(upstreamUrl);
        if (!upstreamRes.ok) {
          return res.status(upstreamRes.status).end();
        }
        const arrayBuf = await upstreamRes.arrayBuffer();
        res.setHeader('Content-Type', 'model/gltf-binary');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.status(200).send(Buffer.from(arrayBuf));
      } catch (err: any) {
        console.error(`[GLB Proxy] Erro ao buscar ${filename}:`, err?.message || err);
        return res.status(502).json({ error: 'Falha ao carregar modelo 3D.', code: 'MODEL_PROXY_ERROR' });
      }
    };

    app.get('/api/gstatic-models/:filename', handleGlbProxy);
    app.get('/deskracer/assets/models/:filename', handleGlbProxy);
    app.get('/assets/models/:filename', handleGlbProxy);

    // Ensure any unmatched /api/* route ALWAYS returns JSON instead of HTML
    app.all('/api/*', (req, res) => {
      return res.status(404).json({
        error: `Endpoint não encontrado: ${req.method} ${req.originalUrl}`,
        code: 'API_NOT_FOUND',
      });
    });

    app.get('*', (req, res) => {
      if (req.url.startsWith('/api') || req.url.startsWith('/games')) {
        return res.status(404).json({ error: 'Not found' });
      }
      res.sendFile(path.join(frontendDistDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
  });
}

startServer();
