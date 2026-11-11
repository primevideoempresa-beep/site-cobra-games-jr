import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface TwoFactorConfig {
  enabled: boolean;
  secret: string;
  backupCodes: string[];
  usedBackupCodes: string[];
  updatedAt?: any;
  enabledAt?: any;
}

const ADMIN_EMAIL = 'primevideoempresa@gmail.com';
const ISSUER = 'Cobra Games Jr';
const TWO_FACTOR_DOC_ID = '2fa';
const TWO_FACTOR_COLLECTION = 'admin_security';

/**
 * Generates 8 cryptographically secure backup codes in format XXXX-XXXX (CSPRNG)
 */
export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // 32 caracteres legíveis (sem 0/O, 1/I)
  const charsLength = chars.length;
  
  // Usar exclusivamente gerador de números aleatórios criptograficamente seguro (CSPRNG)
  const randomBytes = new Uint8Array(count * 8);
  const cryptoProvider = (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) 
    ? globalThis.crypto 
    : (typeof window !== 'undefined' && window.crypto?.getRandomValues) 
      ? window.crypto 
      : null;

  if (cryptoProvider) {
    cryptoProvider.getRandomValues(randomBytes);
  } else {
    throw new Error('Ambiente inseguro: CSPRNG indisponível para geração de chaves.');
  }

  for (let i = 0; i < count; i++) {
    let part1 = '';
    let part2 = '';
    for (let j = 0; j < 4; j++) {
      part1 += chars[randomBytes[i * 8 + j] % charsLength];
      part2 += chars[randomBytes[i * 8 + 4 + j] % charsLength];
    }
    codes.push(`${part1}-${part2}`);
  }
  return codes;
}

/**
 * Generates a new TOTP secret, URI, and QR Code data URL for Google Authenticator.
 */
export async function generateTwoFactorSetup(email = ADMIN_EMAIL) {
  // Generate a random 160-bit (20 byte) secret
  const secret = new OTPAuth.Secret({ size: 20 });
  const base32Secret = secret.base32;

  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: secret,
  });

  const uri = totp.toString();

  const qrCodeDataUrl = await QRCode.toDataURL(uri, {
    width: 280,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });

  const backupCodes = generateBackupCodes(8);

  return {
    secret: base32Secret,
    uri,
    qrCodeDataUrl,
    backupCodes,
    formattedSecret: base32Secret.match(/.{1,4}/g)?.join(' ') || base32Secret,
  };
}

/**
 * Validates a 6-digit TOTP token against a base32 secret.
 * Allows a window of ±1 step (30 seconds before/after) to account for slight clock drift.
 */
export function verifyTwoFactorToken(secretBase32: string, token: string): boolean {
  if (!secretBase32 || !token) return false;
  const cleanToken = token.trim().replace(/\D/g, '');
  if (cleanToken.length !== 6) return false;

  try {
    const totp = new OTPAuth.TOTP({
      issuer: ISSUER,
      label: ADMIN_EMAIL,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secretBase32),
    });

    const delta = totp.validate({ token: cleanToken, window: 1 });
    return delta !== null;
  } catch (err) {
    console.error('[2FA] Erro ao validar token TOTP:', err);
    return false;
  }
}

/**
 * Retrieves the current 2FA configuration from Firestore.
 * NUNCA armazena segredos ou códigos de backup em texto plano no localStorage do navegador.
 */
export async function getTwoFactorConfig(): Promise<TwoFactorConfig | null> {
  // Limpar qualquer vazamento legado de segredos no localStorage
  try {
    const legacy = localStorage.getItem('cobra_2fa_config');
    if (legacy && (legacy.includes('secret') || legacy.includes('backupCodes'))) {
      localStorage.removeItem('cobra_2fa_config');
    }
  } catch {}

  try {
    const docRef = doc(db, TWO_FACTOR_COLLECTION, TWO_FACTOR_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as TwoFactorConfig;
      // Armazena no cache apenas o status booleano para agilidade visual, SEM dados confidenciais
      try {
        localStorage.setItem('cobra_2fa_status_only', JSON.stringify({ enabled: !!data.enabled }));
      } catch (e) {}
      return data;
    }
  } catch (err) {
    console.warn('[2FA] Falha ao recuperar configuração de 2FA do Firestore:', err);
  }

  // Fallback seguro apenas para saber se está ativo, sem chaves secretas
  try {
    const cached = localStorage.getItem('cobra_2fa_status_only');
    if (cached) {
      const parsed = JSON.parse(cached);
      return { enabled: !!parsed.enabled, secret: '', backupCodes: [], usedBackupCodes: [] };
    }
  } catch (e) {}

  return null;
}

/**
 * Activates 2FA and saves the verified secret and backup codes in Firestore.
 */
export async function activateTwoFactor(secretBase32: string, backupCodes: string[]): Promise<void> {
  const docRef = doc(db, TWO_FACTOR_COLLECTION, TWO_FACTOR_DOC_ID);
  const payload: TwoFactorConfig = {
    enabled: true,
    secret: secretBase32,
    backupCodes: backupCodes,
    usedBackupCodes: [],
    updatedAt: serverTimestamp(),
    enabledAt: serverTimestamp(),
  };

  await setDoc(docRef, payload, { merge: true });
  try {
    localStorage.setItem('cobra_2fa_status_only', JSON.stringify({ enabled: true }));
    localStorage.removeItem('cobra_2fa_config');
  } catch {}
}

/**
 * Deactivates 2FA in Firestore.
 */
export async function deactivateTwoFactor(): Promise<void> {
  const docRef = doc(db, TWO_FACTOR_COLLECTION, TWO_FACTOR_DOC_ID);
  await updateDoc(docRef, {
    enabled: false,
    updatedAt: serverTimestamp(),
  });
  try {
    localStorage.setItem('cobra_2fa_status_only', JSON.stringify({ enabled: false }));
    localStorage.removeItem('cobra_2fa_config');
  } catch {}
}

/**
 * Replaces backup codes with a new fresh batch.
 */
export async function regenerateBackupCodes(): Promise<string[]> {
  const newCodes = generateBackupCodes(8);
  
  // Update Firestore
  try {
    const docRef = doc(db, TWO_FACTOR_COLLECTION, TWO_FACTOR_DOC_ID);
    await setDoc(docRef, {
      enabled: true,
      backupCodes: newCodes,
      usedBackupCodes: [],
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('[2FA] Erro ao sincronizar códigos com Firestore:', err);
    throw err;
  }

  return newCodes;
}

/**
 * Verifies if an input is a valid unused backup code.
 * If valid, consumes it and moves it to usedBackupCodes.
 */
export async function consumeBackupCode(inputCode: string): Promise<boolean> {
  if (!inputCode) return false;
  const normalizedInput = inputCode.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  try {
    const config = await getTwoFactorConfig();
    if (!config || !config.enabled || !config.backupCodes) return false;

    const matchedIndex = config.backupCodes.findIndex((c) => {
      const normC = c.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      return normC === normalizedInput;
    });

    if (matchedIndex === -1) {
      return false;
    }

    const matchedCode = config.backupCodes[matchedIndex];
    const newBackupCodes = config.backupCodes.filter((_, idx) => idx !== matchedIndex);
    const newUsedBackupCodes = [...(config.usedBackupCodes || []), matchedCode];

    const docRef = doc(db, TWO_FACTOR_COLLECTION, TWO_FACTOR_DOC_ID);
    await updateDoc(docRef, {
      backupCodes: newBackupCodes,
      usedBackupCodes: newUsedBackupCodes,
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (err) {
    console.error('[2FA] Erro ao consumir código de backup:', err);
    return false;
  }
}
