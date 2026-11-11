/**
 * Security & Data Masking Utility
 * Camuflagem de dados sensíveis, proteção de PII, sanitização de logs e controle seguro de sessão.
 */

/**
 * Mascara um endereço de e-mail para exibição segura na interface.
 * Exemplo: primevideoempresa@gmail.com -> pr•••••••••sa@gmail.com
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') return '••••••••@••••.com';
  const parts = email.split('@');
  if (parts.length !== 2) return '••••••••';
  
  const [user, domain] = parts;
  if (user.length <= 3) {
    return `${user[0]}•••@${domain}`;
  }
  
  const start = user.slice(0, 2);
  const end = user.slice(-2);
  const maskedMiddle = '•'.repeat(Math.min(Math.max(user.length - 4, 3), 9));
  
  return `${start}${maskedMiddle}${end}@${domain}`;
}

/**
 * Mascara tokens, senhas ou chaves secretas.
 * Exibe apenas os últimos caracteres se explicitamente configurado.
 */
export function maskSecret(secret: string | null | undefined, visibleChars = 4): string {
  if (!secret || typeof secret !== 'string') return '••••••••';
  if (secret.length <= visibleChars) return '•'.repeat(secret.length);
  
  const visible = secret.slice(-visibleChars);
  return `•••• •••• •••• ${visible}`;
}

/**
 * Mascara código de backup de recuperação (formato XXXX-XXXX)
 */
export function maskBackupCode(code: string | null | undefined): string {
  if (!code || typeof code !== 'string') return '••••-••••';
  const clean = code.replace(/[^a-zA-Z0-9]/g, '');
  if (clean.length < 4) return '••••-••••';
  const last2 = clean.slice(-2);
  return `•••-••${last2}`;
}

/**
 * Remove informações sensíveis de qualquer objeto antes de logar ou salvar
 */
export function sanitizeLogDetails(details: any): any {
  if (!details) return details;
  if (typeof details === 'string') {
    return details
      .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, (m) => maskEmail(m))
      .replace(/AIza[0-9A-Za-z-_]{35}/g, 'AIza••••••••••••••••••••••••••••••••')
      .replace(/[A-Z2-7]{16,32}/g, '••••••••••••••••');
  }
  
  if (typeof details === 'object') {
    if (Array.isArray(details)) {
      return details.map(item => sanitizeLogDetails(item));
    }
    const sanitized: Record<string, any> = {};
    for (const [key, val] of Object.entries(details)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('secret') ||
        lowerKey.includes('password') ||
        lowerKey.includes('senha') ||
        lowerKey.includes('backupcode') ||
        lowerKey.includes('token') ||
        lowerKey.includes('authorization') ||
        lowerKey.includes('apikey')
      ) {
        sanitized[key] = '[PROTEGIDO]';
      } else if (lowerKey.includes('email')) {
        sanitized[key] = typeof val === 'string' ? maskEmail(val) : '[E-MAIL PROTEGIDO]';
      } else {
        sanitized[key] = sanitizeLogDetails(val);
      }
    }
    return sanitized;
  }
  
  return details;
}

/**
 * Gerenciador de Sessão com expiração segura, inatividade e proteção contra força bruta
 * Persistido além da sessão do navegador para impedir bypass por reinicialização.
 */
const FAILED_ATTEMPTS_KEY = 'cg_sec_failed_attempts';
const LOCKOUT_UNTIL_KEY = 'cg_sec_lockout_until';
const SESSION_TIMESTAMP_KEY = 'cg_sec_session_ts';
const LAST_ACTIVITY_KEY = 'cg_sec_last_activity';
const MAX_SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 horas máximo por sessão (expiração absoluta)
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos de inatividade máxima

export const SecuritySessionManager = {
  /**
   * Registra uma tentativa falha de 2FA. Persistido no localStorage para impedir bypass por reinício de navegador.
   * Aplica backoff progressivo: 5 falhas = 60s, 10 falhas = 300s (5min), 15+ falhas = 900s (15min).
   */
  recordFailed2FAAttempt(): { locked: boolean; waitSeconds?: number } {
    try {
      const now = Date.now();
      // Leitura cruzada para evitar evasão
      const localFailed = parseInt(localStorage.getItem(FAILED_ATTEMPTS_KEY) || '0', 10);
      const sessionFailed = parseInt(sessionStorage.getItem(FAILED_ATTEMPTS_KEY) || '0', 10);
      const currentFailed = Math.max(localFailed, sessionFailed) + 1;

      localStorage.setItem(FAILED_ATTEMPTS_KEY, String(currentFailed));
      sessionStorage.setItem(FAILED_ATTEMPTS_KEY, String(currentFailed));

      // Lockout progressivo anti-força bruta
      if (currentFailed >= 5) {
        let lockoutSeconds = 60;
        if (currentFailed >= 15) {
          lockoutSeconds = 900; // 15 minutos
        } else if (currentFailed >= 10) {
          lockoutSeconds = 300; // 5 minutos
        }

        const lockoutDurationMs = lockoutSeconds * 1000;
        const lockoutUntil = now + lockoutDurationMs;
        localStorage.setItem(LOCKOUT_UNTIL_KEY, String(lockoutUntil));
        sessionStorage.setItem(LOCKOUT_UNTIL_KEY, String(lockoutUntil));
        return { locked: true, waitSeconds: lockoutSeconds };
      }
      return { locked: false };
    } catch {
      return { locked: false };
    }
  },

  /**
   * Verifica se o acesso está em período de bloqueio temporário por tentativas excessivas.
   * Não pode ser contornado reiniciando o navegador.
   */
  checkLockout(): { isLocked: boolean; remainingSeconds: number } {
    try {
      const localUntil = parseInt(localStorage.getItem(LOCKOUT_UNTIL_KEY) || '0', 10);
      const sessionUntil = parseInt(sessionStorage.getItem(LOCKOUT_UNTIL_KEY) || '0', 10);
      const lockoutUntil = Math.max(localUntil, sessionUntil);

      if (!lockoutUntil) return { isLocked: false, remainingSeconds: 0 };
      
      const now = Date.now();
      if (now < lockoutUntil) {
        const remaining = Math.ceil((lockoutUntil - now) / 1000);
        return { isLocked: true, remainingSeconds: remaining };
      } else {
        // Expirou o lockout: limpa contadores
        localStorage.removeItem(LOCKOUT_UNTIL_KEY);
        localStorage.removeItem(FAILED_ATTEMPTS_KEY);
        sessionStorage.removeItem(LOCKOUT_UNTIL_KEY);
        sessionStorage.removeItem(FAILED_ATTEMPTS_KEY);
        return { isLocked: false, remainingSeconds: 0 };
      }
    } catch {
      return { isLocked: false, remainingSeconds: 0 };
    }
  },

  resetFailedAttempts() {
    try {
      localStorage.removeItem(FAILED_ATTEMPTS_KEY);
      localStorage.removeItem(LOCKOUT_UNTIL_KEY);
      sessionStorage.removeItem(FAILED_ATTEMPTS_KEY);
      sessionStorage.removeItem(LOCKOUT_UNTIL_KEY);
    } catch {}
  },

  setAdminSession(uid: string) {
    try {
      const now = String(Date.now());
      sessionStorage.setItem('cobra_2fa_session_token', uid);
      sessionStorage.setItem(SESSION_TIMESTAMP_KEY, now);
      sessionStorage.setItem(LAST_ACTIVITY_KEY, now);
    } catch {}
  },

  recordActivity() {
    try {
      sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    } catch {}
  },

  /**
   * Valida se a sessão atual é válida, observando tempo máximo absoluto (8h) E inatividade (30 min).
   */
  isSessionValid(uid: string): boolean {
    try {
      const token = sessionStorage.getItem('cobra_2fa_session_token');
      const sessionTs = parseInt(sessionStorage.getItem(SESSION_TIMESTAMP_KEY) || '0', 10);
      const lastActivity = parseInt(sessionStorage.getItem(LAST_ACTIVITY_KEY) || '0', 10);
      
      if (!token || token !== uid) return false;

      const now = Date.now();

      // 1. Verificar expiração por inatividade (30 minutos)
      if (lastActivity && (now - lastActivity > INACTIVITY_TIMEOUT_MS)) {
        this.clearAdminSession();
        return false;
      }

      // 2. Verificar se a sessão ultrapassou a duração total máxima absoluta (8 horas)
      if (sessionTs && (now - sessionTs > MAX_SESSION_DURATION_MS)) {
        this.clearAdminSession();
        return false;
      }

      // Atualiza timestamp da última atividade durante verificação válida
      this.recordActivity();
      return true;
    } catch {
      return false;
    }
  },

  clearAdminSession() {
    try {
      sessionStorage.removeItem('cobra_2fa_session_token');
      sessionStorage.removeItem(SESSION_TIMESTAMP_KEY);
      sessionStorage.removeItem(LAST_ACTIVITY_KEY);
      sessionStorage.removeItem(FAILED_ATTEMPTS_KEY);
      sessionStorage.removeItem(LOCKOUT_UNTIL_KEY);
    } catch {}
  }
};
