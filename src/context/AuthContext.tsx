import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  User,
} from 'firebase/auth';
import {
  auth,
  authPersistenceReady,
  googleProvider,
  requestForToken,
  onMessageListener,
  db,
} from '../lib/firebase';
import { LoggerService } from '../services/logger';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  getTwoFactorConfig,
  verifyTwoFactorToken,
  consumeBackupCode,
} from '../services/twoFactorAuth';
import { SecuritySessionManager } from '../lib/security';

const REDIRECT_PENDING_KEY = 'cg_auth_redirect_pending';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isSigningIn: boolean;
  isAdmin: boolean;
  is2FAEnabled: boolean;
  is2FAPending: boolean;
  is2FAVerified: boolean;
  error: string | null;
  lastErrorCode: string | null;
  canUseRedirectFallback: boolean;
  login: () => Promise<{ success: boolean; requires2FA: boolean }>;
  loginWithRedirect: () => Promise<void>;
  logout: () => Promise<void>;
  verify2FACode: (code: string) => Promise<{ success: boolean; error?: string; usedBackupCode?: boolean }>;
  cancel2FAPending: () => Promise<void>;
  refresh2FAStatus: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function isEmbeddedIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function mapFirebaseError(
  err: any,
  flow: 'popup' | 'redirect' | 'init' | 'auth_listener' | 'admin_check'
): { code: string; message: string } {
  const code = typeof err?.code === 'string' && err.code ? err.code : 'unknown';

  // Log only the safe error code and flow (never tokens, credentials, or raw emails)
  console.error(`[Auth] Erro Firebase (${flow}): ${code}`);
  LoggerService.logAuthEvent(`Falha na autenticação Google (${flow})`, 'warn', {
    errorCode: code,
    flow,
  }).catch(() => {});

  switch (code) {
    case 'auth/popup-blocked':
      return {
        code,
        message:
          'O popup de login foi bloqueado pelo seu navegador. Permita popups para este site e tente novamente.',
      };
    case 'auth/popup-closed-by-user':
      return {
        code,
        message: 'Janela de autenticação cancelada antes da conclusão do login.',
      };
    case 'auth/cancelled-popup-request':
      return {
        code,
        message: 'Solicitação de login interrompida por uma nova tentativa. Tente novamente.',
      };
    case 'auth/unauthorized-domain':
      return {
        code,
        message:
          'Domínio atual não autorizado nas configurações do Firebase Authentication (auth/unauthorized-domain).',
      };
    case 'auth/operation-not-allowed':
      return {
        code,
        message:
          'Provedor de login Google não habilitado no Firebase Authentication (auth/operation-not-allowed).',
      };
    case 'auth/operation-not-supported-in-this-environment':
      return {
        code,
        message:
          'Este ambiente não suporta popup de autenticação. Abra o painel em uma nova aba do navegador.',
      };
    case 'auth/user-disabled':
      return {
        code,
        message: 'Esta conta foi desativada no Firebase Authentication (auth/user-disabled).',
      };
    case 'auth/account-exists-with-different-credential':
      return {
        code,
        message: 'Já existe uma conta vinculada a outro método de autenticação.',
      };
    case 'auth/network-request-failed':
    case 'unavailable':
      return {
        code,
        message:
          'Falha de conexão com os servidores do Firebase. Verifique sua internet e tente novamente.',
      };
    case 'auth/internal-error':
      return {
        code,
        message:
          'Erro interno no provedor de autenticação Google (auth/internal-error). Verifique cookies de terceiros ou tente novamente.',
      };
    case 'permission-denied':
      return {
        code,
        message:
          'Acesso restrito. Esta conta não possui privilégios administrativos autorizados no servidor (permission-denied).',
      };
    default:
      return {
        code,
        message: `Não foi possível autenticar (${code}). Verifique sua conexão e tente novamente.`,
      };
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthorizedAdmin, setIsAuthorizedAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastErrorCode, setLastErrorCode] = useState<string | null>(null);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [is2FAPending, setIs2FAPending] = useState(false);
  const [is2FAVerified, setIs2FAVerified] = useState(false);

  const loginInFlightRef = useRef(false);
  const evaluationIdRef = useRef(0);
  const isMountedRef = useRef(true);

  const canUseRedirectFallback = !isEmbeddedIframe();

  const clearAuthState = useCallback(() => {
    setUser(null);
    setIsAuthorizedAdmin(false);
    setIs2FAEnabled(false);
    setIs2FAVerified(false);
    setIs2FAPending(false);
  }, []);

  const refresh2FAStatus = async () => {
    try {
      const config = await getTwoFactorConfig();
      const enabled = !!config?.enabled;
      if (isMountedRef.current) {
        setIs2FAEnabled(enabled);
      }
    } catch {
      // Falha silenciosa para evitar travamento
    }
  };

  /**
   * Valida identidade, autorização em `authorized_admins` e estado 2FA
   * antes de comitar qualquer estado de autorização no React.
   */
  const evaluateAdminSession = useCallback(
    async (
      targetUser: User | null,
      source: 'init' | 'auth_change' | 'popup' | 'redirect'
    ): Promise<{ authorized: boolean; requires2FA: boolean }> => {
      const evalId = ++evaluationIdRef.current;
      const isStale = () => !isMountedRef.current || evalId !== evaluationIdRef.current;

      if (!targetUser) {
        SecuritySessionManager.clearAdminSession();
        if (!isStale()) {
          clearAuthState();
        }
        return { authorized: false, requires2FA: false };
      }

      const currentEmail = targetUser.email?.trim().toLowerCase();
      if (!currentEmail) {
        await signOut(auth).catch(() => {});
        SecuritySessionManager.clearAdminSession();
        if (!isStale()) {
          clearAuthState();
          setLastErrorCode('auth/missing-email');
          setError('E-mail não fornecido pelo provedor de autenticação.');
        }
        return { authorized: false, requires2FA: false };
      }

      if (targetUser.emailVerified === false) {
        await LoggerService.logAuthEvent(
          'Bloqueio: e-mail não verificado pelo provedor',
          'critical',
          { source },
          currentEmail
        );
        await signOut(auth).catch(() => {});
        SecuritySessionManager.clearAdminSession();
        if (!isStale()) {
          clearAuthState();
          setLastErrorCode('auth/email-not-verified');
          setError('Acesso restrito. O e-mail da conta Google precisa estar verificado.');
        }
        return { authorized: false, requires2FA: false };
      }

      try {
        // Garante que o token de autenticação esteja sincronizado com o SDK do Firestore
        await targetUser.getIdToken();
        if (isStale()) return { authorized: false, requires2FA: false };

        // Security Pillar: Verify admin identity via Firestore
        const adminRef = doc(db, 'authorized_admins', currentEmail);
        let adminDoc = await getDoc(doc(db, 'authorized_admins', currentEmail));
        if (isStale()) return { authorized: false, requires2FA: false };

        if (!adminDoc.exists()) {
          // Se o documento do proprietário ainda não existe no Firestore (ex.: servidor sem credencial Admin SDK),
          // executa bootstrap protegido exclusivamente pelas regras do servidor para o proprietário verificado.
          // Qualquer outra conta recebe permission-denied diretamente do servidor Firestore.
          try {
            await setDoc(adminRef, {
              role: 'owner',
              verified: true,
              uid: targetUser.uid,
              addedAt: serverTimestamp(),
              lastLoginAt: serverTimestamp(),
            });
            adminDoc = await getDoc(adminRef);
            if (isStale()) return { authorized: false, requires2FA: false };
          } catch {
            // Não-proprietários ou tentativas inválidas são rejeitados pelo servidor e seguem bloqueados abaixo
          }
        }

        if (!adminDoc.exists()) {
          await LoggerService.logAuthEvent(
            'Tentativa de acesso com credencial não autorizada',
            'critical',
            {
              authProvider: targetUser.providerData?.[0]?.providerId || 'google',
              source,
            },
            currentEmail
          );

          await signOut(auth).catch(() => {});
          SecuritySessionManager.clearAdminSession();
          if (!isStale()) {
            clearAuthState();
            setLastErrorCode('unauthorized-admin');
            setError('Acesso restrito. Esta conta não possui privilégios administrativos autorizados no sistema.');
          }
          return { authorized: false, requires2FA: false };
        }

        const adminData = adminDoc.data() || {};
        const isExplicitlyDisabled = adminData.verified === false;
        const hasValidRole =
          !adminData.role ||
          ['owner', 'admin', 'super_admin'].includes(String(adminData.role).toLowerCase());
        const uidMismatch = Boolean(adminData.uid && adminData.uid !== targetUser.uid);

        if (isExplicitlyDisabled || !hasValidRole || uidMismatch) {
          await LoggerService.logAuthEvent(
            'Bloqueio: divergência nos dados de autorização administrativa',
            'critical',
            {
              source,
              uidMismatch,
              isExplicitlyDisabled,
            },
            currentEmail
          );

          await signOut(auth).catch(() => {});
          SecuritySessionManager.clearAdminSession();
          if (!isStale()) {
            clearAuthState();
            setLastErrorCode('unauthorized-admin');
            setError('Acesso restrito. Esta conta não possui privilégios administrativos autorizados no sistema.');
          }
          return { authorized: false, requires2FA: false };
        }

        // Vincula o UID do proprietário caso o registro tenha sido criado sem UID
        if (!adminData.uid) {
          try {
            await setDoc(
              adminRef,
              {
                role: adminData.role || 'owner',
                verified: true,
                uid: targetUser.uid,
                lastLoginAt: serverTimestamp(),
              },
              { merge: true }
            );
          } catch {
            // Falha silenciosa se o documento possuir campos legados imutáveis
          }
        }

        // Check 2FA requirement BEFORE setting user/isAuthorizedAdmin so isAdmin never flashes true prematurely
        const config = await getTwoFactorConfig();
        if (isStale()) return { authorized: false, requires2FA: false };

        const enabled = !!config?.enabled;

        if (enabled) {
          const isValidSession = SecuritySessionManager.isSessionValid(targetUser.uid);
          setUser(targetUser);
          setIsAuthorizedAdmin(true);
          setIs2FAEnabled(true);
          setIs2FAVerified(isValidSession);
          setIs2FAPending(!isValidSession);
          setError(null);
          setLastErrorCode(null);
          return { authorized: true, requires2FA: !isValidSession };
        } else {
          // Garante criação da sessão controlada (30m inatividade / 8h máximo) mesmo sem 2FA ativo
          SecuritySessionManager.setAdminSession(targetUser.uid);
          setUser(targetUser);
          setIsAuthorizedAdmin(true);
          setIs2FAEnabled(false);
          setIs2FAVerified(true);
          setIs2FAPending(false);
          setError(null);
          setLastErrorCode(null);
          return { authorized: true, requires2FA: false };
        }
      } catch (err: any) {
        const { code, message } = mapFirebaseError(err, 'admin_check');

        if (code === 'permission-denied') {
          await LoggerService.logAuthEvent(
            'Acesso negado pelas regras do Firestore durante verificação administrativa',
            'critical',
            {
              errorCode: code,
              source,
              authProvider: targetUser.providerData?.[0]?.providerId || 'google',
            },
            currentEmail
          );
          await signOut(auth).catch(() => {});
          SecuritySessionManager.clearAdminSession();
          if (!isStale()) {
            clearAuthState();
            setLastErrorCode(code);
            setError(
              'Acesso restrito. Esta conta não possui privilégios administrativos autorizados no sistema.'
            );
          }
          return { authorized: false, requires2FA: false };
        }

        // Transient network / Firestore unavailable error: do NOT mark as authorized
        if (!isStale()) {
          clearAuthState();
          setLastErrorCode(code);
          setError(message);
        }
        return { authorized: false, requires2FA: false };
      }
    },
    [clearAuthState]
  );

  useEffect(() => {
    isMountedRef.current = true;
    let unsubscribe: (() => void) | undefined;

    const initializeAuth = async () => {
      try {
        // 1. Aguardar configuração da persistência da sessão antes de restaurar estado
        await authPersistenceReady;

        // 2. Processar resultado de redirecionamento pendente (caso signInWithRedirect tenha sido usado)
        let redirectUser: User | null = null;
        try {
          const redirectResult = await getRedirectResult(auth);
          if (redirectResult?.user) {
            redirectUser = redirectResult.user;
            if (isMountedRef.current) {
              await evaluateAdminSession(redirectResult.user, 'redirect');
            }
          }
        } catch (redirectErr: any) {
          if (isMountedRef.current) {
            const { code, message } = mapFirebaseError(redirectErr, 'redirect');
            setLastErrorCode(code);
            setError(message);
          }
        } finally {
          try {
            sessionStorage.removeItem(REDIRECT_PENDING_KEY);
          } catch {}
        }

        // 3. Aguardar restauração definitiva da sessão persistida antes de liberar rotas protegidas
        await auth.authStateReady();
        if (!isMountedRef.current) return;

        // 4. Se não veio de getRedirectResult, avaliar usuário restaurado da sessão
        if (!redirectUser) {
          await evaluateAdminSession(auth.currentUser, 'init');
        }

        if (!isMountedRef.current) return;

        // 5. Escutar mudanças futuras de sessão sem duplicar a avaliação inicial
        let initialSnapshotConsumed = false;
        unsubscribe = onAuthStateChanged(
          auth,
          async (currentUser) => {
            if (!isMountedRef.current) return;
            if (!initialSnapshotConsumed) {
              initialSnapshotConsumed = true;
              return;
            }
            if (loginInFlightRef.current) {
              return;
            }
            await evaluateAdminSession(currentUser, 'auth_change');
          },
          (listenerErr: any) => {
            if (!isMountedRef.current) return;
            const { code, message } = mapFirebaseError(listenerErr, 'auth_listener');
            setLastErrorCode(code);
            setError(message);
            setLoading(false);
          }
        );
      } catch (initErr: any) {
        if (isMountedRef.current) {
          const { code, message } = mapFirebaseError(initErr, 'init');
          setLastErrorCode(code);
          setError(message);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMountedRef.current = false;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [evaluateAdminSession]);

  const login = async (): Promise<{ success: boolean; requires2FA: boolean }> => {
    setError(null);
    setLastErrorCode(null);

    // Verificar bloqueio temporário por tentativas excessivas de 2FA antes de abrir popup
    const lockout = SecuritySessionManager.checkLockout();
    if (lockout.isLocked) {
      setError(
        `Muitas tentativas incorretas. Por segurança, aguarde ${lockout.remainingSeconds}s antes de tentar novamente.`
      );
      return { success: false, requires2FA: false };
    }

    setIsSigningIn(true);
    loginInFlightRef.current = true;

    try {
      // Chamar signInWithPopup imediatamente dentro do gesto do usuário (sem await anterior)
      const result = await signInWithPopup(auth, googleProvider);
      const evalResult = await evaluateAdminSession(result.user, 'popup');
      return {
        success: evalResult.authorized,
        requires2FA: evalResult.requires2FA,
      };
    } catch (err: any) {
      const { code, message } = mapFirebaseError(err, 'popup');
      if (isMountedRef.current) {
        setLastErrorCode(code);
        setError(message);
      }
      return { success: false, requires2FA: false };
    } finally {
      loginInFlightRef.current = false;
      if (isMountedRef.current) {
        setIsSigningIn(false);
      }
    }
  };

  const loginWithRedirect = async (): Promise<void> => {
    if (!canUseRedirectFallback) {
      setError(
        'Redirecionamento Google não suportado dentro de janela incorporada. Permita popups ou abra o site em uma nova aba.'
      );
      return;
    }

    setError(null);
    setLastErrorCode(null);

    const lockout = SecuritySessionManager.checkLockout();
    if (lockout.isLocked) {
      setError(
        `Muitas tentativas incorretas. Por segurança, aguarde ${lockout.remainingSeconds}s antes de tentar novamente.`
      );
      return;
    }

    setIsSigningIn(true);
    try {
      await authPersistenceReady;
      try {
        sessionStorage.setItem(REDIRECT_PENDING_KEY, '1');
      } catch {}
      await signInWithRedirect(auth, googleProvider);
    } catch (err: any) {
      try {
        sessionStorage.removeItem(REDIRECT_PENDING_KEY);
      } catch {}
      const { code, message } = mapFirebaseError(err, 'redirect');
      if (isMountedRef.current) {
        setLastErrorCode(code);
        setError(message);
        setIsSigningIn(false);
      }
    }
  };

  const verify2FACode = async (
    code: string
  ): Promise<{ success: boolean; error?: string; usedBackupCode?: boolean }> => {
    if (!user || !isAuthorizedAdmin) {
      return { success: false, error: 'Sessão expirada. Faça login novamente com o Google.' };
    }

    const lockout = SecuritySessionManager.checkLockout();
    if (lockout.isLocked) {
      return {
        success: false,
        error: `Tentativas bloqueadas temporariamente por segurança. Aguarde ${lockout.remainingSeconds}s.`,
      };
    }

    try {
      const config = await getTwoFactorConfig();
      if (!config || !config.enabled) {
        SecuritySessionManager.setAdminSession(user.uid);
        SecuritySessionManager.resetFailedAttempts();
        setIs2FAEnabled(false);
        setIs2FAVerified(true);
        setIs2FAPending(false);
        return { success: true };
      }

      const isTotpValid = verifyTwoFactorToken(config.secret, code);
      if (isTotpValid) {
        SecuritySessionManager.setAdminSession(user.uid);
        SecuritySessionManager.resetFailedAttempts();
        setIs2FAVerified(true);
        setIs2FAPending(false);
        setError(null);
        await LoggerService.logAuthEvent('Autenticação 2FA verificada com sucesso', 'info', {
          method: 'totp',
        });
        return { success: true };
      }

      const isBackupValid = await consumeBackupCode(code);
      if (isBackupValid) {
        SecuritySessionManager.setAdminSession(user.uid);
        SecuritySessionManager.resetFailedAttempts();
        setIs2FAVerified(true);
        setIs2FAPending(false);
        setError(null);
        await LoggerService.logAuthEvent(
          'Autenticação 2FA efetuada via Código de Backup',
          'warn',
          { method: 'backup_code' }
        );
        return { success: true, usedBackupCode: true };
      }

      const failureResult = SecuritySessionManager.recordFailed2FAAttempt();
      if (failureResult.locked) {
        await LoggerService.logAuthEvent(
          'Bloqueio temporário anti-bruteforce ativado no 2FA',
          'critical',
          {
            failedConsecutiveAttempts: 5,
          }
        );
        return {
          success: false,
          error: `Muitas tentativas inválidas consecutivas. O acesso foi bloqueado por ${failureResult.waitSeconds} segundos.`,
        };
      }

      return {
        success: false,
        error:
          'Código inválido ou expirado. Verifique os dígitos no aplicativo ou utilize um código de emergência.',
      };
    } catch {
      return {
        success: false,
        error: 'Erro ao validar código. Verifique sua conexão e tente novamente.',
      };
    }
  };

  const cancel2FAPending = async () => {
    try {
      SecuritySessionManager.clearAdminSession();
      clearAuthState();
      await signOut(auth);
    } catch {
      // Fallback
    }
  };

  const logout = async () => {
    try {
      SecuritySessionManager.clearAdminSession();
      clearAuthState();
      setError(null);
      setLastErrorCode(null);
      await signOut(auth);
    } catch {
      // Fallback
    }
  };

  const clearError = () => {
    setError(null);
    setLastErrorCode(null);
  };

  // Admin access is strictly granted ONLY after initial auth restoration (!loading),
  // verified Firestore authorized_admins membership (isAuthorizedAdmin),
  // and 2FA verification (if enabled).
  const isAdmin = Boolean(
    !loading && user && isAuthorizedAdmin && (!is2FAEnabled || is2FAVerified)
  );

  useEffect(() => {
    if (isAdmin && user) {
      const registerFCM = async () => {
        try {
          const token = await requestForToken();
          if (token) {
            await setDoc(
              doc(db, 'fcm_tokens', user.uid),
              {
                token,
                lastUpdated: serverTimestamp(),
              },
              { merge: true }
            );
          }
        } catch {
          // Silent catch
        }
      };

      registerFCM();

      onMessageListener().catch(() => {});
    }
  }, [isAdmin, user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isSigningIn,
        isAdmin,
        is2FAEnabled,
        is2FAPending,
        is2FAVerified,
        error,
        lastErrorCode,
        canUseRedirectFallback,
        login,
        loginWithRedirect,
        logout,
        verify2FACode,
        cancel2FAPending,
        refresh2FAStatus,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
