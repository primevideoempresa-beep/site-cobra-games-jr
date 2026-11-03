import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft, AlertCircle, X } from 'lucide-react';

export const AdminLoginPage = () => {
  const { login, isAdmin, user, loading, error, clearError } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAdmin) {
      navigate('/admin');
    }
  }, [isAdmin, navigate]);

  const handleLogin = async () => {
    try {
      await login();
    } catch (err) {
      console.error('Login handle error:', err);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 font-bold animate-pulse">Verificando credenciais...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-orange-500/10 rounded-3xl mb-6">
            <ShieldAlert className="w-12 h-12 text-orange-500" />
          </div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">ADMIN MASTER</h1>
          <p className="text-zinc-500">Acesso restrito ao proprietário da Cobra Games Jr.</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 relative animate-in fade-in slide-in-from-top-4">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-500 text-sm font-bold leading-tight">
                  {error}
                </p>
              </div>
              <button 
                onClick={clearError}
                className="text-red-500/50 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={handleLogin}
            className="w-full bg-white hover:bg-zinc-100 text-black font-black py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 mb-6 active:scale-[0.98]"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Entrar com Google
          </button>

          <div className="space-y-4">
            <div className="p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700/50">
              <p className="text-zinc-400 text-[10px] uppercase font-black tracking-widest mb-1">E-mail Autorizado</p>
              <p className="text-white font-mono text-sm">primevideoempresa@gmail.com</p>
            </div>

            <p className="text-zinc-500 text-xs text-center leading-relaxed px-4">
              Ao tentar acessar, sua identidade será verificada.<br />
              Apenas o e-mail acima possui permissões administrativas.
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/')}
          className="mt-8 flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mx-auto font-bold text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o site principal
        </button>
      </div>
    </div>
  );
};

