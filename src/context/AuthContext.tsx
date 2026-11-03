import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  User,
  AuthError
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

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
    // Handle redirect result
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          if (result.user.email !== ADMIN_EMAIL) {
            signOut(auth);
            setError('Acesso negado: apenas a conta autorizada pode acessar o painel.');
          }
        }
      })
      .catch((err: AuthError) => {
        console.error('Redirect result error:', err);
        setError(`Erro na autenticação: ${err.message}`);
      });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email !== ADMIN_EMAIL) {
        signOut(auth);
        setUser(null);
        setError('Acesso negado: apenas a conta autorizada pode acessar o painel.');
      } else {
        setUser(user);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async () => {
    setError(null);
    try {
      // First try popup, as it's a better UX if it works
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.warn('Popup login failed, trying redirect:', err);
      // If popup is blocked or fails, use redirect
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectErr: any) {
          console.error('Redirect login failed:', redirectErr);
          setError(`Erro ao iniciar login: ${redirectErr.message}`);
        }
      } else {
        setError(`Erro no login: ${err.message}`);
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const clearError = () => setError(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

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

