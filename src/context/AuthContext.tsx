import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup,
  signOut, 
  User,
} from 'firebase/auth';
import { auth, googleProvider, requestForToken, onMessageListener } from '../lib/firebase';
import { LoggerService } from '../services/logger';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  getTwoFactorConfig, 
  verifyTwoFactorToken, 
  consumeBackupCode 
} from '../services/twoFactorAuth';
import { SecuritySessionManager } from '../lib/security';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  is2FAEnabled: boolean;
  is2FAPending: boolean;
  is2FAVerified: boolean;
  error: string | null;
  login: () => Promise<{ requires2FA: boolean }>;
  logout: () => Promise<void>;
  verify2FACode: (code: string) => Promise<{ success: boolean; error?: string; usedBackupCode?: boolean }>;
  cancel2FAPending: () => Promise<void>;
  refresh2FAStatus: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [is2FAPending, setIs2FAPending] = useState(false);
  const [is2FAVerified, setIs2FAVerified] = useState(false);

  // E-mail restrito do proprietário mantido estritamente seguro no escopo de autorização


  const refresh2FAStatus = async () => {
    try {
      const config = await getTwoFactorConfig();
      const enabled = !!config?.enabled;
      setIs2FAEnabled(enabled);
    } catch {
      // Falha silenciosa para evitar travamento
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          if (!isMounted) return;

          try {
            if (currentUser) {
              const currentEmail = currentUser.email?.toLowerCase();
              
              if (currentEmail) {
                // Security Pillar: Verify admin identity via Firestore
                const adminDoc = await getDoc(doc(db, 'authorized_admins', currentEmail));
                
                if (adminDoc.exists()) {
                  setUser(currentUser);
                  setError(null);

                  // Check 2FA requirement
                  const config = await getTwoFactorConfig();
                  const enabled = !!config?.enabled;
                  setIs2FAEnabled(enabled);

                  if (enabled) {
                    // Validar se existe sessão ativa e dentro do prazo seguro
                    const isValidSession = SecuritySessionManager.isSessionValid(currentUser.uid);
                    if (isValidSession) {
                      setIs2FAVerified(true);
                      setIs2FAPending(false);
                    } else {
                      setIs2FAVerified(false);
                      setIs2FAPending(true);
                    }
                  } else {
                    setIs2FAVerified(true);
                    setIs2FAPending(false);
                  }
                } else {
                  // Registrar tentativa de acesso não autorizada com higienização de logs
                  await LoggerService.logAuthEvent('Tentativa de acesso com credencial não autorizada', 'critical', {
                    authProvider: currentUser.providerData?.[0]?.providerId || 'google'
                  }, currentEmail);
                  
                  await signOut(auth);
                  SecuritySessionManager.clearAdminSession();
                  setUser(null);
                  setIs2FAVerified(false);
                  setIs2FAPending(false);
                  // Mensagem neutra que não expõe detalhes de contas legítimas
                  setError('Acesso restrito. Esta conta não possui privilégios administrativos autorizados no sistema.');
                }
              } else {
                await signOut(auth);
                setUser(null);
                setError('E-mail não fornecido pelo provedor de autenticação.');
              }
            } else {
              SecuritySessionManager.clearAdminSession();
              setUser(null);
              setIs2FAVerified(false);
              setIs2FAPending(false);
            }
          } catch {
            setError('Erro ao validar sessão de segurança. Tente novamente.');
          } finally {
            setLoading(false);
          }
        }, () => {
          setError('Falha na conexão com o serviço de segurança.');
          setLoading(false);
        });

        return unsubscribe;
      } catch {
        setError('Falha ao inicializar subsistema de segurança.');
        setLoading(false);
        return () => {};
      }
    };

    const unsubscribePromise = initializeAuth();

    return () => {
      isMounted = false;
      unsubscribePromise.then(unsub => {
        if (typeof unsub === 'function') unsub();
      }).catch(() => {});
    };
  }, []);

  const login = async (): Promise<{ requires2FA: boolean }> => {
    setError(null);
    setLoading(true);

    // Verificar se há bloqueio temporário por tentativas excessivas de 2FA
    const lockout = SecuritySessionManager.checkLockout();
    if (lockout.isLocked) {
      setLoading(false);
      setError(`Muitas tentativas incorretas. Por segurança, aguarde ${lockout.remainingSeconds}s antes de tentar novamente.`);
      return { requires2FA: false };
    }

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userEmail = result.user.email?.toLowerCase();
      
      if (!userEmail) {
        await signOut(auth);
        setError('Falha ao obter e-mail da conta Google.');
        return { requires2FA: false };
      }

      // Security Pillar: Verify admin identity via Firestore
      const adminDoc = await getDoc(doc(db, 'authorized_admins', userEmail));

      if (!adminDoc.exists()) {
        await LoggerService.logAuthEvent('Bloqueio no login: conta não autorizada', 'critical', {
          authProvider: 'google.com'
        }, userEmail);

        await signOut(auth);
        SecuritySessionManager.clearAdminSession();
        setUser(null);
        setIs2FAPending(false);
        setIs2FAVerified(false);
        setError('Acesso negado. Credenciais não autorizadas para o painel de controle.');
        return { requires2FA: false };
      }

      setUser(result.user);

      // Check if 2FA is active
      const config = await getTwoFactorConfig();
      const enabled = !!config?.enabled;
      setIs2FAEnabled(enabled);

      if (enabled) {
        const isValidSession = SecuritySessionManager.isSessionValid(result.user.uid);
        if (isValidSession) {
          setIs2FAVerified(true);
          setIs2FAPending(false);
          return { requires2FA: false };
        } else {
          setIs2FAVerified(false);
          setIs2FAPending(true);
          return { requires2FA: true };
        }
      } else {
        setIs2FAVerified(true);
        setIs2FAPending(false);
        return { requires2FA: false };
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-blocked') {
        setError('O popup de login foi bloqueado pelo seu navegador. Por favor, permita popups para este site.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Janela de autenticação cancelada pelo usuário.');
      } else {
        setError('Não foi possível autenticar. Verifique sua conexão e tente novamente.');
      }
      return { requires2FA: false };
    } finally {
      setLoading(false);
    }
  };

  const verify2FACode = async (code: string): Promise<{ success: boolean; error?: string; usedBackupCode?: boolean }> => {
    if (!user) {
      return { success: false, error: 'Sessão expirada. Faça login novamente com o Google.' };
    }

    // Verificar bloqueio temporário anti-brute force
    const lockout = SecuritySessionManager.checkLockout();
    if (lockout.isLocked) {
      return { 
        success: false, 
        error: `Tentativas bloqueadas temporariamente por segurança. Aguarde ${lockout.remainingSeconds}s.` 
      };
    }

    try {
      const config = await getTwoFactorConfig();
      if (!config || !config.enabled) {
        SecuritySessionManager.setAdminSession(user.uid);
        SecuritySessionManager.resetFailedAttempts();
        setIs2FAVerified(true);
        setIs2FAPending(false);
        return { success: true };
      }

      // Check TOTP code
      const isTotpValid = verifyTwoFactorToken(config.secret, code);
      if (isTotpValid) {
        SecuritySessionManager.setAdminSession(user.uid);
        SecuritySessionManager.resetFailedAttempts();
        setIs2FAVerified(true);
        setIs2FAPending(false);
        setError(null);
        await LoggerService.logAuthEvent('Autenticação 2FA verificada com sucesso', 'info', { method: 'totp' });
        return { success: true };
      }

      // Check emergency backup code
      const isBackupValid = await consumeBackupCode(code);
      if (isBackupValid) {
        SecuritySessionManager.setAdminSession(user.uid);
        SecuritySessionManager.resetFailedAttempts();
        setIs2FAVerified(true);
        setIs2FAPending(false);
        setError(null);
        await LoggerService.logAuthEvent('Autenticação 2FA efetuada via Código de Backup', 'warn', { method: 'backup_code' });
        return { success: true, usedBackupCode: true };
      }

      // Falha na verificação: registrar tentativa e verificar se deve bloquear
      const failureResult = SecuritySessionManager.recordFailed2FAAttempt();
      if (failureResult.locked) {
        await LoggerService.logAuthEvent('Bloqueio temporário anti-bruteforce ativado no 2FA', 'critical', {
          failedConsecutiveAttempts: 5
        });
        return {
          success: false,
          error: `Muitas tentativas inválidas consecutivas. O acesso foi bloqueado por ${failureResult.waitSeconds} segundos.`
        };
      }

      return {
        success: false,
        error: 'Código inválido ou expirado. Verifique os dígitos no aplicativo ou utilize um código de emergência.',
      };
    } catch {
      return { success: false, error: 'Erro ao validar código. Verifique sua conexão e tente novamente.' };
    }
  };

  const cancel2FAPending = async () => {
    try {
      SecuritySessionManager.clearAdminSession();
      setIs2FAPending(false);
      setIs2FAVerified(false);
      await signOut(auth);
      setUser(null);
    } catch {
      // Fallback
    }
  };

  const logout = async () => {
    try {
      SecuritySessionManager.clearAdminSession();
      setIs2FAPending(false);
      setIs2FAVerified(false);
      await signOut(auth);
      setUser(null);
    } catch {
      // Fallback
    }
  };

  const clearError = () => setError(null);

  // Admin access is strictly granted when user is authenticated (verified against authorized_admins in effect) 
  // AND 2FA is satisfied (if enabled)
  const isAdmin = Boolean(
    user && (!is2FAEnabled || is2FAVerified)
  );

  useEffect(() => {
    if (isAdmin && user) {
      const registerFCM = async () => {
        try {
          const token = await requestForToken();
          if (token) {
            await setDoc(doc(db, 'fcm_tokens', user.uid), {
              token,
              lastUpdated: serverTimestamp()
            }, { merge: true });
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
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isAdmin, 
      is2FAEnabled,
      is2FAPending,
      is2FAVerified,
      error, 
      login, 
      logout, 
      verify2FACode,
      cancel2FAPending,
      refresh2FAStatus,
      clearError 
    }}>
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
