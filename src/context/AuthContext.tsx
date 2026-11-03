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
    // Handle redirect result on mount
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          if (result.user.email !== ADMIN_EMAIL) {
            await signOut(auth);
            setError('Acesso negado: apenas a conta autorizada pode acessar o painel.');
          }
        }
      } catch (err: any) {
        console.error('Erro no resultado do redirecionamento:', err);
        setError(`Erro na autenticação: ${err.message}`);
      }
    };

    handleRedirect();

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
      // For cross-browser compatibility and environment constraints, 
      // we try redirect as the primary method or fallback if popup fails
      await signInWithRedirect(auth, googleProvider);
    } catch (err: any) {
      console.error('Erro ao iniciar login por redirecionamento:', err);
      setError(`Erro ao iniciar login: ${err.message}`);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (err: any) {
      console.error('Erro ao sair:', err);
    }
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

