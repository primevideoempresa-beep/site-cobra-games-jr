import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  ShieldAlert, 
  ArrowLeft, 
  AlertCircle, 
  X, 
  Loader2, 
  KeyRound, 
  Smartphone, 
  CheckCircle2, 
  HelpCircle,
  RotateCcw,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react';
import { maskEmail } from '../../lib/security';

export const AdminLoginPage = () => {
  const { 
    user,
    login, 
    isAdmin, 
    is2FAPending, 
    verify2FACode, 
    cancel2FAPending, 
    loading, 
    error, 
    clearError 
  } = useAuth();
  
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState(['', '', '', '', '', '']);
  const [backupCodeInput, setBackupCodeInput] = useState('');
  const [useBackupMode, setUseBackupMode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [showTimeHelp, setShowTimeHelp] = useState(false);
  const [maskDigits, setMaskDigits] = useState(false);
  const [maskBackupCode, setMaskBackupCode] = useState(true);
  const navigate = useNavigate();

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isAdmin) {
      navigate('/admin');
    }
  }, [isAdmin, navigate]);

  // Focus the first 2FA input box when 2FA pending state is reached
  useEffect(() => {
    if (is2FAPending) {
      setCodeError(null);
      setTwoFactorCode(['', '', '', '', '', '']);
      setTimeout(() => {
        if (!useBackupMode && inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 150);
    }
  }, [is2FAPending, useBackupMode]);

  const handleGoogleLogin = async () => {
    try {
      setIsRedirecting(true);
      setCodeError(null);
      const res = await login();
      if (!res.requires2FA && isAdmin) {
        navigate('/admin');
      }
    } catch {
      // Handled in auth context
    } finally {
      setIsRedirecting(false);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    // Handle paste of full 6-digit code or text
    if (value.length > 1) {
      const cleanDigits = value.replace(/\D/g, '').slice(0, 6);
      if (cleanDigits.length > 0) {
        const newCode = [...twoFactorCode];
        for (let i = 0; i < 6; i++) {
          newCode[i] = cleanDigits[i] || '';
        }
        setTwoFactorCode(newCode);
        setCodeError(null);

        // Auto submit if 6 digits pasted
        if (cleanDigits.length === 6) {
          submit2FACode(cleanDigits);
          return;
        }

        const nextFocus = Math.min(cleanDigits.length, 5);
        inputRefs.current[nextFocus]?.focus();
      }
      return;
    }

    const digit = value.replace(/\D/g, '');
    const newCode = [...twoFactorCode];
    newCode[index] = digit;
    setTwoFactorCode(newCode);
    setCodeError(null);

    // Auto advance to next box
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit if 6th digit entered
    if (digit && index === 5) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        submit2FACode(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !twoFactorCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const submit2FACode = async (codeToVerify?: string) => {
    const code = codeToVerify || (useBackupMode ? backupCodeInput.trim() : twoFactorCode.join(''));
    if (!code) {
      setCodeError('Digite o código de verificação.');
      return;
    }

    setIsVerifyingCode(true);
    setCodeError(null);

    try {
      const result = await verify2FACode(code);
      if (result.success) {
        navigate('/admin');
      } else {
        setCodeError(result.error || 'Código incorreto. Tente novamente.');
        if (!useBackupMode) {
          setTwoFactorCode(['', '', '', '', '', '']);
          inputRefs.current[0]?.focus();
        }
      }
    } catch {
      setCodeError('Falha na validação de segurança. Tente novamente.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleCancel2FA = async () => {
    await cancel2FAPending();
    setTwoFactorCode(['', '', '', '', '', '']);
    setBackupCodeInput('');
    setCodeError(null);
  };

  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    let timer: any;
    if (loading && !isRedirecting && !is2FAPending) {
      timer = setTimeout(() => setShowReset(true), 5000);
    } else {
      setShowReset(false);
    }
    return () => clearTimeout(timer);
  }, [loading, isRedirecting, is2FAPending]);

  // Full page loading state for initial auth check
  if (loading && !isRedirecting && !is2FAPending) return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-orange-500/20 rounded-full" />
          <div className="absolute top-0 left-0 w-20 h-20 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <ShieldAlert className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-orange-500 animate-pulse" />
        </div>
        <div className="text-center">
          <p className="text-white text-xl font-black mb-2 tracking-tight">PROTEÇÃO COBRA JR</p>
          <p className="text-zinc-500 font-bold animate-pulse">Sincronizando com Firebase...</p>
        </div>
        {showReset && (
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all border border-zinc-700"
          >
            A demora é incomum? Clique para recarregar.
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full">
        
        {/* Header Icon & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-orange-500/10 rounded-3xl mb-4 border border-orange-500/20 shadow-lg shadow-orange-500/5">
            {is2FAPending ? (
              <Smartphone className="w-12 h-12 text-orange-500 animate-bounce" />
            ) : (
              <Lock className="w-12 h-12 text-orange-500" />
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">
            {is2FAPending ? 'VERIFICAÇÃO 2FA' : 'PAINEL RESTRITO'}
          </h1>
          <p className="text-zinc-400 text-sm">
            {is2FAPending 
              ? 'Etapa de segurança adicional com Google Authenticator'
              : 'Acesso restrito ao proprietário da Cobra Games Jr.'}
          </p>
        </div>

        {/* Card Box */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 sm:p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
          
          {/* Top Banner indicating Google Verified identity (Masked for privacy) */}
          {is2FAPending && (
            <div className="mb-6 p-3 bg-zinc-800/80 border border-zinc-700/60 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest leading-none">Google Autenticado</p>
                  <p className="text-xs font-mono text-zinc-200 truncate mt-0.5 tracking-wider">
                    {maskEmail(user?.email)}
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase shrink-0">
                Etapa 1 OK
              </span>
            </div>
          )}

          {/* Error Message banner */}
          {(error || codeError) && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 relative animate-in fade-in slide-in-from-top-4">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-400 text-sm font-bold leading-tight">
                  {codeError || error}
                </p>
              </div>
              <button 
                onClick={() => {
                  setCodeError(null);
                  clearError();
                }}
                className="text-red-500/50 hover:text-red-500 transition-colors"
                aria-label="Fechar erro"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2: 2FA Prompt */}
          {is2FAPending ? (
            <div className="space-y-6">
              {!useBackupMode ? (
                <>
                  <div className="text-center">
                    <p className="text-sm text-zinc-300 font-medium">
                      Abra o aplicativo <strong className="text-white">Google Authenticator</strong> no seu celular e digite o código de 6 dígitos gerado para <span className="text-orange-400 font-semibold">Cobra Games Jr</span>:
                    </p>
                  </div>

                  {/* 6 Digit Input Boxes */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 sm:gap-2.5">
                      {twoFactorCode.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => { inputRefs.current[idx] = el; }}
                          type={maskDigits ? "password" : "text"}
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          value={digit}
                          onChange={(e) => handleDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(idx, e)}
                          className={`w-11 sm:w-12 h-14 sm:h-16 text-center text-2xl font-mono font-black rounded-2xl border transition-all bg-zinc-950 focus:outline-none ${
                            digit 
                              ? 'border-orange-500 text-white shadow-lg shadow-orange-500/10' 
                              : 'border-zinc-700/80 text-zinc-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setMaskDigits(!maskDigits)}
                        className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors px-1"
                        title={maskDigits ? "Exibir dígitos" : "Ocultar dígitos para privacidade"}
                      >
                        {maskDigits ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {maskDigits ? 'Mostrar dígitos' : 'Camuflar dígitos'}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => submit2FACode()}
                    disabled={isVerifyingCode || twoFactorCode.join('').length !== 6}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg shadow-orange-500/20 cursor-pointer"
                  >
                    {isVerifyingCode ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Validando Código...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Confirmar e Acessar Painel
                      </>
                    )}
                  </button>
                </>
              ) : (
                /* Emergency Backup Code Mode (Masked Input Support) */
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Digite um dos seus códigos de recuperação de emergência salvos durante a ativação:
                    </p>
                  </div>

                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                      type={maskBackupCode ? "password" : "text"}
                      placeholder="Ex: 8392-1940"
                      value={backupCodeInput}
                      onChange={(e) => {
                        setBackupCodeInput(e.target.value.toUpperCase());
                        setCodeError(null);
                      }}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl py-3.5 pl-12 pr-12 text-white font-mono text-center tracking-widest font-bold placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => setMaskBackupCode(!maskBackupCode)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
                      title={maskBackupCode ? "Mostrar código" : "Ocultar código"}
                    >
                      {maskBackupCode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>

                  <button
                    onClick={() => submit2FACode()}
                    disabled={isVerifyingCode || !backupCodeInput.trim()}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
                  >
                    {isVerifyingCode ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Validar Código de Backup'
                    )}
                  </button>
                </div>
              )}

              {/* Toggle Mode and Help */}
              <div className="pt-2 border-t border-zinc-800/80 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setUseBackupMode(!useBackupMode);
                      setCodeError(null);
                    }}
                    className="text-orange-400 hover:text-orange-300 font-semibold underline underline-offset-4 transition-colors"
                  >
                    {useBackupMode ? 'Voltar para código do Authenticator' : 'Não tem o celular? Use código de backup'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowTimeHelp(!showTimeHelp)}
                    className="text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
                    title="Ajuda com relógio"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    Ajuda
                  </button>
                </div>

                {showTimeHelp && (
                  <div className="p-3 bg-zinc-800/60 rounded-xl border border-zinc-700/50 text-xs text-zinc-400 leading-relaxed">
                    <p className="font-bold text-zinc-200 mb-1">Dica de sincronização de horário:</p>
                    O Google Authenticator depende da hora exata do seu telefone. Se os códigos estiverem falhando, vá nas Configurações do seu celular e garanta que <strong>Data e Hora Automáticas</strong> estejam ativadas.
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCancel2FA}
                  className="w-full mt-1 py-2.5 text-zinc-500 hover:text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Cancelar e trocar de conta
                </button>
              </div>
            </div>
          ) : (
            /* STEP 1: Initial Google Sign In */
            <>
              <button
                onClick={handleGoogleLogin}
                disabled={isRedirecting || loading}
                className="w-full bg-white hover:bg-zinc-100 disabled:bg-zinc-200 text-black font-black py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 mb-6 active:scale-[0.98] disabled:scale-100 disabled:opacity-80 shadow-xl cursor-pointer"
              >
                {isRedirecting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Conectando com o Google...
                  </>
                ) : (
                  <>
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                    Entrar com Google
                  </>
                )}
              </button>

              <div className="space-y-4">
                <div className="p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700/50">
                  <p className="text-zinc-400 text-[10px] uppercase font-black tracking-widest mb-1">Nível de Acesso</p>
                  <div className="flex items-center justify-between">
                    <p className="text-white text-sm font-semibold tracking-wide">
                      Acesso Restrito ao Proprietário
                    </p>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      Protegido
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center gap-2.5 text-xs text-orange-400">
                  <Smartphone className="w-4 h-4 shrink-0" />
                  <span>Proteção por autenticação de dois fatores (Google 2FA) ativa.</span>
                </div>

                <p className="text-zinc-500 text-xs text-center leading-relaxed px-2">
                  Ao autenticar, sua identidade é validada via Google com protocolo de alta segurança.<br />
                  Se o 2FA estiver ativado, o código do Authenticator será exigido para liberar o painel.
                </p>
              </div>
            </>
          )}

        </div>

        {/* Back Link */}
        <button
          onClick={() => navigate('/')}
          className="mt-8 flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mx-auto font-bold text-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o site principal
        </button>
      </div>
    </div>
  );
};
