import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

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
const upload = multer({
  dest: '/tmp/uploads/',
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

if (!fs.existsSync('/tmp/uploads/')) {
  fs.mkdirSync('/tmp/uploads/', { recursive: true });
}

async function verifyAdminViaUserTokenFirestoreRest(idToken: string, email: string): Promise<boolean> {
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/${encodeURIComponent(databaseId)}/documents/authorized_admins/${encodeURIComponent(email)}`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });
  return resp.ok;
}

// Middleware to verify Admin Token (Security Pillar 8)
async function verifyAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autorizado. Token ausente.' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    const email = decodedToken.email?.trim().toLowerCase();

    if (!email || !decodedToken.email_verified) {
      return res.status(403).json({ error: 'Acesso negado. E-mail não verificado.' });
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
        isAuthorized = await verifyAdminViaUserTokenFirestoreRest(idToken, email);
      } else {
        throw dbErr;
      }
    }

    if (!isAuthorized) {
      console.warn('Unauthorized admin attempt blocked.');
      return res.status(403).json({ error: 'Acesso negado. Esta conta não possui privilégios administrativos.' });
    }

    (req as any).user = decodedToken;
    next();
  } catch (error) {
    console.error('Auth Error:', error);
    res.status(401).json({ error: 'Sessão administrativa inválida.' });
  }
}

// Helper to ensure game is extracted (Persistence Pillar 2)
async function ensureGameExtracted(slug: string): Promise<boolean> {
  const targetDir = path.join(baseGamesDir, slug);
  
  // If already extracted, return
  if (fs.existsSync(targetDir) && fs.existsSync(path.join(targetDir, 'index.html'))) {
    return true;
  }

  // Try to download from Storage
  const remoteFile = bucket.file(`games/${slug}.zip`);
  const [exists] = await remoteFile.exists();

  if (!exists) return false;

  const localZipPath = path.join('/tmp', `${slug}.zip`);
  await remoteFile.download({ destination: localZipPath });

  try {
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    const zip = new AdmZip(localZipPath);
    zip.extractAllTo(targetDir, true);
    fs.unlinkSync(localZipPath);
    return true;
  } catch (err) {
    console.error('Extraction error for', slug, err);
    return false;
  }
}

// API Routes
app.post('/api/games/upload', verifyAdmin, upload.single('zip'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }

  const { title } = req.body;
  if (!title) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Título do jogo é obrigatório.' });
  }

  const slug = title.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const targetDir = path.join(baseGamesDir, slug);

  try {
    // 1. Upload ZIP to Permanent Storage (Persistence Pillar 2)
    const destination = `games/${slug}.zip`;
    await bucket.upload(req.file.path, {
      destination,
      metadata: {
        contentType: 'application/zip',
        cacheControl: 'public, max-age=31536000',
      }
    });

    // 2. Extract locally for immediate use
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
    fs.mkdirSync(targetDir, { recursive: true });

    const zip = new AdmZip(req.file.path);
    zip.extractAllTo(targetDir, true);

    // Verify index.html exists
    const hasIndex = fs.existsSync(path.join(targetDir, 'index.html'));
    if (!hasIndex) {
      // Clean up storage if invalid
      await bucket.file(destination).delete().catch(() => {});
      fs.rmSync(targetDir, { recursive: true, force: true });
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'O ZIP deve conter um arquivo index.html na raiz.' });
    }

    // Clean up local temp upload
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      slug,
      iframeUrl: `/games/${slug}/index.html`
    });
  } catch (err: any) {
    console.error('Extraction error:', err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Erro ao extrair o jogo: ' + err.message });
  }
});

// Admin Verification API
app.post('/api/games/verify', verifyAdmin, upload.single('zip'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });

  try {
    const zip = new AdmZip(req.file.path);
    const zipEntries = zip.getEntries();
    
    const results = {
      hasIndex: false,
      missingAssets: [] as string[],
      dangerousFiles: [] as string[],
      totalFiles: zipEntries.length,
      size: req.file.size,
      isApto: false
    };

    zipEntries.forEach(entry => {
      const name = entry.entryName.toLowerCase();
      if (name === 'index.html' || name.endsWith('/index.html')) results.hasIndex = true;
      
      // Basic security check (Security Pillar 3)
      if (name.endsWith('.exe') || name.endsWith('.bat') || name.endsWith('.sh') || name.includes('..')) {
        results.dangerousFiles.push(entry.entryName);
      }
    });

    results.isApto = results.hasIndex && results.dangerousFiles.length === 0;
    
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.json(results);
  } catch (err: any) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

// Serve Games with auto-hydration (Persistence Pillar 5)
app.get('/games/:slug/*', async (req, res, next) => {
  const { slug } = req.params;
  const filePath = req.params[0] || 'index.html';
  
  try {
    const success = await ensureGameExtracted(slug);
    if (!success) {
      return res.status(404).send('Jogo não encontrado ou falha na sincronização.');
    }
    
    const absolutePath = path.join(baseGamesDir, slug, filePath);
    if (fs.existsSync(absolutePath)) {
      res.sendFile(absolutePath);
    } else {
      res.status(404).send('Arquivo do jogo não encontrado.');
    }
  } catch (err) {
    console.error('Serve game error:', err);
    res.status(500).send('Erro interno ao servir o jogo.');
  }
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
