import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  User,
} from 'firebase/auth';
import { auth, googleProvider, requestForToken, onMessageListener } from '../lib/firebase';
import { LoggerService } from '../services/logger';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ADMIN_EMAIL = 'primevideoempresa@gmail.com';

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      console.log('[Auth] [INIT_START] Início do processo de inicialização de segurança.');
      console.log('[Auth] [CONFIG] E-mail autorizado: ', ADMIN_EMAIL);
      
      let redirectChecked = false;
      let firstAuthStateFired = false;

      const checkComplete = () => {
        if (redirectChecked && firstAuthStateFired) {
          console.log('[Auth] [INIT_FINISH] Ambas verificações (Redirect + State) concluídas. Liberando UI.');
          setLoading(false);
        }
      };

      try {
        // 1. Process redirect result first if any
        console.log('[Auth] [REDIRECT_CHECK] Verificando se o usuário retornou de um login do Google...');
        const result = await getRedirectResult(auth);
        
        if (result?.user) {
          const userEmail = result.user.email;
          console.log('[Auth] [REDIRECT_RESULT] Usuário recuperado via redirecionamento:', userEmail);
          
          if (userEmail?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
            console.log('[Auth] [REDIRECT_VALIDATION] SUCESSO: Administrador identificado via retorno do Google.');
            await LoggerService.logAuthEvent('Sucesso na validação de redirecionamento', 'info', null, userEmail);
            if (isMounted) setUser(result.user);
          } else {
            console.warn(`[Auth] [REDIRECT_VALIDATION] FALHA: E-mail ${userEmail} não é o proprietário. Desconectando por segurança.`);
            await LoggerService.logAuthEvent('Tentativa de acesso negada (Redirecionamento)', 'warn', { attemptedEmail: userEmail }, userEmail);
            await signOut(auth);
            if (isMounted) {
              setUser(null);
              setError(`Acesso negado: ${userEmail} não possui permissões administrativas.`);
            }
          }
        } else {
          console.log('[Auth] [REDIRECT_RESULT] Nenhum login via redirecionamento detectado nesta sessão.');
        }
      } catch (err: any) {
        console.error('[Auth] [REDIRECT_ERROR] Erro ao processar retorno do Google:', err.code, err.message);
        await LoggerService.logAuthEvent('Erro crítico no redirecionamento', 'critical', { code: err.code, message: err.message });
        if (isMounted) {
          if (err.code === 'auth/credential-already-in-use') {
            setError('Esta conta de e-mail já está sendo usada em outro lugar.');
          } else {
            setError(`Falha no redirecionamento: ${err.message}`);
          }
        }
      } finally {
        redirectChecked = true;
        checkComplete();
      }

      // 2. Set up the auth state listener
      console.log('[Auth] [OBSERVER_START] Registrando onAuthStateChanged para monitorar a sessão.');
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (!isMounted) return;

        console.log('[Auth] [SESSION_EVENT] O estado da sessão foi alterado.');
        
        if (currentUser) {
          const currentEmail = currentUser.email;
          console.log('[Auth] [SESSION_ACTIVE] Usuário atual na sessão:', currentEmail);
          
          if (currentEmail?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
            console.log('[Auth] [SESSION_VALIDATION] SUCESSO: Sessão administrativa ativa para:', currentEmail);
            // We don't log every session heartbeat to avoid spam, but we could log the initial recovery
            setUser(currentUser);
            setError(null);
          } else {
            console.warn(`[Auth] [SESSION_VALIDATION] SEGURANÇA: E-mail ${currentEmail} não autorizado. Forçando encerramento de sessão.`);
            await LoggerService.logAuthEvent('Acesso bloqueado por e-mail não autorizado na sessão', 'critical', { currentEmail }, currentEmail);
            await signOut(auth);
            setUser(null);
            setError(`Acesso bloqueado: apenas ${ADMIN_EMAIL} pode acessar esta área.`);
          }
        } else {
          console.log('[Auth] [SESSION_INACTIVE] Nenhuma sessão ativa encontrada (usuário nulo).');
          setUser(null);
        }
        
        if (!firstAuthStateFired) {
          firstAuthStateFired = true;
          checkComplete();
        }
      });

      return unsubscribe;
    };

    const cleanupPromise = initializeAuth();

    return () => {
      isMounted = false;
      cleanupPromise.then(unsub => unsub && typeof unsub === 'function' && unsub());
    };
  }, []);

  const login = async () => {
    setError(null);
    setLoading(true);
    try {
      console.log('[Auth] Iniciando login com redirecionamento para', ADMIN_EMAIL);
      await signInWithRedirect(auth, googleProvider);
    } catch (err: any) {
      console.error('[Auth] Erro ao iniciar login:', err);
      setError(`Erro ao iniciar login: ${err.message}`);
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('[Auth] Executando logout...');
      await signOut(auth);
      setUser(null);
    } catch (err: any) {
      console.error('[Auth] Erro ao sair:', err);
    }
  };

  const clearError = () => setError(null);

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  useEffect(() => {
    if (isAdmin && user) {
      const registerFCM = async () => {
        try {
          console.log('[Auth] [FCM] Tentando registrar token de notificação...');
          const token = await requestForToken();
          if (token) {
            await setDoc(doc(db, 'fcm_tokens', user.uid), {
              token,
              email: user.email,
              lastUpdated: serverTimestamp()
            }, { merge: true });
            console.log('[Auth] [FCM] Token registrado e persistido com sucesso.');
          }
        } catch (err) {
          console.error('[Auth] [FCM] Erro ao registrar notificações:', err);
        }
      };
      
      registerFCM();

      // Set up foreground listener
      onMessageListener().then((payload: any) => {
        console.log('[Auth] [FCM] Notificação recebida em primeiro plano:', payload);
        // We could show a toast here if we want
      }).catch(err => console.error('[Auth] [FCM] Erro no listener de mensagens:', err));
    }
  }, [isAdmin, user]);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, error, login, logout, clearError }}>
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

