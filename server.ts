import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import {
  inspectGameZip,
  publishGameZip,
  safeExtractZip,
  sanitizeSlug,
  isValidSlug,
  PublishError,
  MAX_ZIP_SIZE_BYTES,
} from './server-publisher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8'));

let firebaseApp: App;
if (!getApps().length) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountJson) {
    firebaseApp = initializeApp({
      credential: cert(JSON.parse(serviceAccountJson)),
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket
    });
  } else {
    firebaseApp = initializeApp({
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket
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
        verified: true
      });
      console.log('Primary admin authorized successfully.');
    }
  } catch (err: any) {
    const msg = String(err?.message || '');
    if (err?.code === 7 || msg.includes('PERMISSION_DENIED')) {
      console.warn('Admin SDK without Firestore IAM credentials in current runtime; client owner bootstrap remains enforced by Firestore Rules.');
    } else {
      console.error('Failed to bootstrap primary admin:', msg);
    }
  }
}

ensurePrimaryAdmin();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const isProd = process.env.NODE_ENV === 'production';
// Use /tmp in production (Cloud Run writable space)
const baseGamesDir = isProd ? '/tmp/games' : path.join(process.cwd(), 'public', 'games');

if (!fs.existsSync(baseGamesDir)) {
  fs.mkdirSync(baseGamesDir, { recursive: true });
}

// Setup multer for ZIP uploads
const uploadDir = '/tmp/uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: MAX_ZIP_SIZE_BYTES } // 100MB limit
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
      const msg = String(dbErr?.message || '');
      if (dbErr?.code === 7 || msg.includes('PERMISSION_DENIED')) {
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
    console.error('Auth Error:', error);
    res.status(401).json({ error: 'Sessão administrativa inválida ou expirada.', code: 'AUTH_INVALID_SESSION' });
  }
}

// Helper to ensure game is extracted safely (Persistence Pillar 2)
async function ensureGameExtracted(slug: string): Promise<boolean> {
  if (!isValidSlug(slug)) return false;

  const targetDir = path.join(baseGamesDir, slug);

  // If already extracted, return
  if (fs.existsSync(targetDir) && fs.existsSync(path.join(targetDir, 'index.html'))) {
    return true;
  }

  const localZipPath = path.join('/tmp', `hydrate-${slug}-${Date.now()}.zip`);
  try {
    const remoteFile = bucket.file(`games/${slug}.zip`);
    const [exists] = await remoteFile.exists();
    if (!exists) return false;

    await remoteFile.download({ destination: localZipPath });
    safeExtractZip(localZipPath, targetDir);
    return fs.existsSync(path.join(targetDir, 'index.html'));
  } catch (err: any) {
    console.warn(`[Storage] Auto-hidratação indisponível para "${slug}":`, err?.message || err);
    return false;
  } finally {
    safeUnlink(localZipPath);
  }
}

// API Routes
app.post('/api/games/upload', verifyAdmin, upload.single('zip'), async (req, res) => {
  // Allow enough time for isolated npm install + Vite build
  req.setTimeout(5 * 60 * 1000);
  res.setTimeout(5 * 60 * 1000);

  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo ZIP enviado.', code: 'MISSING_FILE' });
  }

  const rawTitle = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  if (!rawTitle) {
    safeUnlink(req.file.path);
    return res.status(400).json({ error: 'Título do jogo é obrigatório.', code: 'MISSING_TITLE' });
  }

  const slug = sanitizeSlug(rawTitle);
  let compiledZipPath: string | null = null;

  try {
    // 1. Inspect, compile (if React/Vite/TS/JS) in isolated workspace, and publish locally
    const result = await publishGameZip({
      zipPath: req.file.path,
      slug,
      baseGamesDir,
      fileSize: req.file.size,
    });
    compiledZipPath = result.compiledZipPath;

    // 2. Upload compiled package to Firebase Storage for persistence across restarts
    let storageSynced = false;
    let storageWarning: string | undefined;
    try {
      const destination = `games/${slug}.zip`;
      await bucket.upload(result.compiledZipPath, {
        destination,
        metadata: {
          contentType: 'application/zip',
          cacheControl: 'public, max-age=31536000',
        },
      });
      storageSynced = true;
    } catch (storageErr: any) {
      const msg = String(storageErr?.message || storageErr);
      console.warn(`[Storage] Falha ao sincronizar ${slug}.zip no Firebase Storage:`, msg);
      storageWarning =
        'Jogo publicado com sucesso no servidor. A sincronização com o Firebase Storage não pôde ser concluída neste ambiente.';
    }

    return res.json({
      success: true,
      slug: result.slug,
      iframeUrl: result.iframeUrl,
      projectType: result.projectType,
      projectTypeLabel: result.projectTypeLabel,
      compiled: result.compiled,
      storageSynced,
      storageWarning,
      warnings: result.warnings,
    });
  } catch (err: any) {
    if (err instanceof PublishError) {
      console.error(`[PublishError] (${err.code}) ${err.message}`);
      return res.status(err.status).json({
        error: err.message,
        code: err.code,
        details: err.details,
      });
    }

    console.error('Upload/Publish unexpected error:', err);
    return res.status(500).json({
      error: 'Erro interno ao processar e publicar o jogo.',
      code: 'UPLOAD_FAILED',
      details: err?.message,
    });
  } finally {
    safeUnlink(req.file?.path);
    safeUnlink(compiledZipPath);
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

// Ensure any unmatched /api/* route ALWAYS returns JSON instead of HTML
app.all('/api/*', (req, res) => {
  return res.status(404).json({
    error: `Endpoint não encontrado: ${req.method} ${req.originalUrl}`,
    code: 'API_NOT_FOUND',
  });
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
        error: `O arquivo ZIP excede o limite máximo permitido de ${Math.round(MAX_ZIP_SIZE_BYTES / 1024 / 1024)} MB.`,
        code: 'LIMIT_FILE_SIZE',
      });
    }
    return res.status(400).json({
      error: `Erro no upload do arquivo: ${err.message}`,
      code: err.code || 'MULTER_ERROR',
    });
  }

  if (req.originalUrl.startsWith('/api')) {
    return res.status(err?.status || 500).json({
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
    app.use(vite.middlewares);

    // Serve index.html for all non-API routes in dev
    app.get('*', async (req, res, next) => {
      if (req.url.startsWith('/api') || req.url.startsWith('/games')) {
        return next();
      }
      try {
        const template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        const html = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // In production, compiled server.js is in /dist, and assets are also in /dist
    app.use(express.static(__dirname));
    app.get('*', (req, res) => {
      if (req.url.startsWith('/api') || req.url.startsWith('/games')) {
        return res.status(404).json({ error: 'Not found' });
      }
      res.sendFile(path.join(__dirname, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
  });
}

startServer();

