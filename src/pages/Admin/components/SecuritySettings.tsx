import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Smartphone, 
  Key, 
  Copy, 
  Check, 
  Download, 
  Loader2, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle2, 
  X, 
  Lock, 
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getTwoFactorConfig, 
  generateTwoFactorSetup, 
  activateTwoFactor, 
  deactivateTwoFactor, 
  regenerateBackupCodes, 
  verifyTwoFactorToken,
  TwoFactorConfig 
} from '../../../services/twoFactorAuth';
import { useAuth } from '../../../context/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { maskEmail, maskSecret, maskBackupCode, SecuritySessionManager } from '../../../lib/security';

export const SecuritySettings: React.FC = () => {
  const { user, refresh2FAStatus } = useAuth();
  const [config, setConfig] = useState<TwoFactorConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Setup Modal States
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [setupData, setSetupData] = useState<{
    secret: string;
    uri: string;
    qrCodeDataUrl: string;
    backupCodes: string[];
    formattedSecret: string;
  } | null>(null);
  const [isGeneratingSetup, setIsGeneratingSetup] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Test Tool States
  const [testCode, setTestCode] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Deactivate Modal States
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [deactivateCode, setDeactivateCode] = useState('');
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Backup codes viewing
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [revealBackupCodes, setRevealBackupCodes] = useState(false);
  const [revealSecret, setRevealSecret] = useState(false);
  const [revealEmail, setRevealEmail] = useState(false);
  const [maskDeactivateCode, setMaskDeactivateCode] = useState(true);
  const [isRegeneratingCodes, setIsRegeneratingCodes] = useState(false);
  const [justRegenerated, setJustRegenerated] = useState(false);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const data = await getTwoFactorConfig();
      setConfig(data);
    } catch (err) {
      console.error('Erro ao buscar configuração de segurança:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleStartSetup = async () => {
    setIsGeneratingSetup(true);
    try {
      const targetEmail = user?.email || 'primevideoempresa@gmail.com';
      const setup = await generateTwoFactorSetup(targetEmail);
      setSetupData(setup);
      setVerificationCode('');
      setCopiedKey(false);
      setCopiedCodes(false);
      setIsSetupOpen(true);
    } catch (err: any) {
      console.error('Erro ao gerar setup de 2FA:', err);
      toast.error('Erro ao preparar configuração do Google Authenticator');
    } finally {
      setIsGeneratingSetup(false);
    }
  };

  const handleCopyKey = () => {
    if (!setupData) return;
    navigator.clipboard.writeText(setupData.secret);
    setCopiedKey(true);
    toast.success('Chave secreta copiada para a área de transferência!');
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleCopyBackupCodes = (codes: string[]) => {
    navigator.clipboard.writeText(codes.join('\n'));
    setCopiedCodes(true);
    toast.success('Códigos de recuperação copiados!');
    setTimeout(() => setCopiedCodes(false), 2500);
  };

  const handleDownloadBackupCodes = (codes: string[]) => {
    const textContent = `COBRA GAMES JR - CÓDIGOS DE RECUPERAÇÃO 2FA (GOOGLE AUTHENTICATOR)\n` +
      `Administrador: ${maskEmail(user?.email || 'primevideoempresa@gmail.com')}\n` +
      `Gerado em: ${new Date().toLocaleString('pt-BR')}\n\n` +
      `Guarde estes códigos em local seguro. Cada código pode ser utilizado uma única vez caso você perca o acesso ao seu smartphone:\n\n` +
      codes.map((c, i) => `${i + 1}. ${c}`).join('\n') +
      `\n\n--- Cobra Games Jr Admin Security ---`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `codigos_backup_2fa_cobra_games_${format(new Date(), 'yyyyMMdd_HHmm')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Arquivo de códigos de backup baixado!');
  };

  const handleConfirmActivation = async () => {
    if (!setupData) return;
    const cleanCode = verificationCode.replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      toast.error('Digite o código de 6 dígitos gerado no Google Authenticator.');
      return;
    }

    setIsActivating(true);
    try {
      const isValid = verifyTwoFactorToken(setupData.secret, cleanCode);
      if (!isValid) {
        toast.error('Código incorreto ou expirado. Verifique o relógio do seu celular e tente o código atual.');
        setIsActivating(false);
        return;
      }

      await activateTwoFactor(setupData.secret, setupData.backupCodes);
      await refresh2FAStatus();
      if (user?.uid) {
        SecuritySessionManager.setAdminSession(user.uid);
      }
      toast.success('Autenticação em Duas Etapas (Google 2FA) ativada com sucesso!');
      setIsSetupOpen(false);
      await fetchConfig();
    } catch {
      toast.error('Falha ao ativar 2FA. Verifique os dados e tente novamente.');
    } finally {
      setIsActivating(false);
    }
  };

  const handleTestToken = () => {
    if (!config?.secret) return;
    const clean = testCode.replace(/\D/g, '');
    if (clean.length !== 6) {
      setTestResult({
        success: false,
        message: 'O código do Google Authenticator deve conter exatamente 6 dígitos.'
      });
      return;
    }

    setIsTesting(true);
    setTimeout(() => {
      const isValid = verifyTwoFactorToken(config.secret, clean);
      if (isValid) {
        setTestResult({
          success: true,
          message: 'Código VÁLIDO! Seu aplicativo Google Authenticator e horário estão 100% sincronizados.'
        });
        toast.success('Código validado com sucesso!');
      } else {
        setTestResult({
          success: false,
          message: 'Código INVÁLIDO ou expirado. Verifique se o relógio do celular está em sincronização automática de horário.'
        });
        toast.error('Código inválido para este perfil.');
      }
      setIsTesting(false);
    }, 300);
  };

  const handleDeactivate = async () => {
    if (!config?.secret) return;
    const clean = deactivateCode.replace(/\D/g, '');
    if (clean.length !== 6) {
      toast.error('Digite o código de 6 dígitos atual do Authenticator para confirmar.');
      return;
    }

    setIsDeactivating(true);
    try {
      const isValid = verifyTwoFactorToken(config.secret, clean);
      if (!isValid) {
        toast.error('Código incorreto. Por motivos de segurança, você deve confirmar com o código atual do aplicativo.');
        setIsDeactivating(false);
        return;
      }

      await deactivateTwoFactor();
      await refresh2FAStatus();
      SecuritySessionManager.clearAdminSession();
      toast.success('Autenticação de dois fatores desativada.');
      setIsDeactivateOpen(false);
      setDeactivateCode('');
      await fetchConfig();
    } catch {
      toast.error('Erro ao desativar 2FA. Verifique os dados e tente novamente.');
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleRegenerateCodes = async () => {
    setIsRegeneratingCodes(true);
    try {
      const newCodes = await regenerateBackupCodes();
      // Instantly update state so codes render immediately in the UI
      setConfig(prev => ({
        enabled: true,
        secret: prev?.secret || '',
        usedBackupCodes: [],
        ...(prev || {}),
        backupCodes: newCodes,
      }));
      setJustRegenerated(true);
      setTimeout(() => setJustRegenerated(false), 2500);
      toast.success('8 novos códigos de recuperação gerados com sucesso!');
      await fetchConfig();
    } catch (err: any) {
      console.error('Erro ao gerar novos códigos:', err);
      toast.error('Falha ao gerar novos códigos de backup.');
    } finally {
      setIsRegeneratingCodes(false);
    }
  };

  const isEnabled = Boolean(config && config.enabled);

  if (isLoading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Verificando Segurança...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Main 2FA Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-zinc-800">
          <div className="flex items-start gap-4">
            <div className={`p-3.5 rounded-2xl shrink-0 ${
              isEnabled 
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                : 'bg-orange-500/10 border border-orange-500/20 text-orange-400'
            }`}>
              {isEnabled ? (
                <ShieldCheck className="w-8 h-8" />
              ) : (
                <ShieldAlert className="w-8 h-8" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Autenticação de Dois Fatores (Google Authenticator)
                </h3>
                {isEnabled ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Ativo & Protegido
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider">
                    Desativado
                  </span>
                )}
              </div>
              <p className="text-zinc-400 text-sm mt-1 max-w-2xl leading-relaxed">
                Proteja sua conta de administrador com uma camada extra de segurança. Sempre que fizer login com o Google, você precisará confirmar um código de 6 dígitos gerado pelo aplicativo <strong>Google Authenticator</strong> no seu celular.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center">
            {isEnabled ? (
              <button
                onClick={() => setIsDeactivateOpen(true)}
                className="w-full sm:w-auto px-5 py-3 bg-zinc-800 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 text-zinc-300 border border-zinc-700 rounded-2xl text-xs font-bold transition-all"
              >
                Desativar 2FA
              </button>
            ) : (
              <button
                onClick={handleStartSetup}
                disabled={isGeneratingSetup}
                className="w-full sm:w-auto px-6 py-3.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-black rounded-2xl text-sm transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
              >
                {isGeneratingSetup ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Preparando...
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4" />
                    Configurar Google Authenticator
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Status Details when Enabled */}
        {isEnabled && (
          <div className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-800/40 border border-zinc-800 rounded-2xl p-4">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Aplicativo Vinculado</span>
              <p className="text-white text-sm font-bold mt-1 flex items-center gap-2">
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                Google Authenticator
              </p>
              <span className="text-xs text-zinc-400 mt-0.5 block">TOTP SHA-1 (6 dígitos / 30s)</span>
            </div>

            <div className="bg-zinc-800/40 border border-zinc-800 rounded-2xl p-4">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Códigos de Backup</span>
              <div className="flex items-center justify-between mt-1">
                <p className="text-white text-sm font-bold">
                  {config?.backupCodes?.length || 0} disponíveis
                </p>
                <button
                  onClick={() => setShowBackupCodes(!showBackupCodes)}
                  className="text-xs text-orange-400 hover:text-orange-300 font-bold underline"
                >
                  {showBackupCodes ? 'Ocultar' : 'Visualizar'}
                </button>
              </div>
              <span className="text-xs text-zinc-400 mt-0.5 block">Para recuperação de emergência</span>
            </div>

            <div className="bg-zinc-800/40 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">E-mail Protegido</span>
                <button
                  type="button"
                  onClick={() => setRevealEmail(!revealEmail)}
                  className="text-zinc-500 hover:text-zinc-300 p-0.5 transition-colors"
                  title={revealEmail ? "Ocultar e-mail" : "Revelar e-mail"}
                >
                  {revealEmail ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-white text-sm font-mono truncate mt-1">
                {revealEmail ? (user?.email || 'primevideoempresa@gmail.com') : maskEmail(user?.email || 'primevideoempresa@gmail.com')}
              </p>
              <span className="text-xs text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5" /> Verificado
              </span>
            </div>
          </div>
        )}

        {/* View/Regenerate Backup Codes Drawer */}
        {isEnabled && showBackupCodes && (
          <div className="mt-6 p-6 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-orange-500" />
                  Seus Códigos de Backup Ativos
                </h4>
                <p className="text-xs text-zinc-400">
                  Cada código pode ser usado uma única vez se você não tiver acesso ao smartphone.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRevealBackupCodes(!revealBackupCodes)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  title={revealBackupCodes ? "Ocultar códigos" : "Revelar códigos"}
                >
                  {revealBackupCodes ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {revealBackupCodes ? 'Camuflar' : 'Revelar'}
                </button>
                <button
                  onClick={() => handleCopyBackupCodes(config?.backupCodes || [])}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copiar
                </button>
                <button
                  onClick={() => handleDownloadBackupCodes(config?.backupCodes || [])}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar
                </button>
                <button
                  onClick={handleRegenerateCodes}
                  disabled={isRegeneratingCodes}
                  className="px-3 py-1.5 bg-orange-500/15 hover:bg-orange-500/25 active:scale-95 text-orange-400 border border-orange-500/30 hover:border-orange-500/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Gerar novos códigos e invalidar os anteriores"
                >
                  {isRegeneratingCodes ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
                      <span>Gerando...</span>
                    </>
                  ) : justRegenerated ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Gerados!</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 text-orange-400" />
                      <span>Gerar Novos</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
              {config?.backupCodes && config.backupCodes.length > 0 ? (
                config.backupCodes.map((code, idx) => (
                  <div 
                    key={`${code}-${idx}`} 
                    className={`p-2.5 bg-zinc-900 border rounded-xl text-center font-mono text-sm font-bold tracking-wider transition-all duration-300 select-all ${
                      justRegenerated
                        ? 'border-orange-500 bg-orange-500/15 text-orange-300 shadow-[0_0_15px_rgba(249,115,22,0.35)] scale-[1.02]'
                        : 'border-zinc-800 text-orange-400 hover:border-zinc-700'
                    }`}
                  >
                    {revealBackupCodes ? code : maskBackupCode(code)}
                  </div>
                ))
              ) : (
                <div className="col-span-full py-4 text-center text-zinc-500 text-xs font-mono">
                  Nenhum código gerado ainda. Clique em &quot;Gerar Novos&quot; para criar seus códigos de emergência.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Code Test Verification Tool (When Active) */}
        {isEnabled && (
          <div className="mt-6 pt-6 border-t border-zinc-800/80">
            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Testar Sincronização do Aplicativo
            </h4>
            <p className="text-xs text-zinc-400 mb-4">
              Você pode testar se o código gerado no seu celular está sendo validado corretamente pelo sistema a qualquer momento:
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-md">
              <input
                type="text"
                maxLength={6}
                placeholder="000000"
                value={testCode}
                onChange={(e) => {
                  setTestCode(e.target.value.replace(/\D/g, ''));
                  setTestResult(null);
                }}
                className="bg-zinc-950 border border-zinc-700 text-white text-center font-mono font-bold text-lg tracking-widest rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-500 w-full sm:w-44"
              />
              <button
                onClick={handleTestToken}
                disabled={isTesting || testCode.length !== 6}
                className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
              >
                {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verificar Código'}
              </button>
            </div>

            {testResult && (
              <div className={`mt-3 p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2.5 ${
                testResult.success 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SETUP WIZARD MODAL */}
      {isSetupOpen && setupData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 relative shadow-2xl my-8">
            <button
              onClick={() => setIsSetupOpen(false)}
              className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-white rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <div className="inline-flex items-center gap-2 text-orange-500 text-xs uppercase font-black tracking-widest mb-1">
                <Smartphone className="w-4 h-4" />
                Configuração Passo a Passo
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight">
                Vincular Google Authenticator
              </h3>
              <p className="text-zinc-400 text-xs mt-1">
                Siga os 3 passos abaixo para ativar a proteção de dois fatores.
              </p>
            </div>

            <div className="space-y-6">
              {/* Step 1: Scan QR */}
              <div className="bg-zinc-800/40 border border-zinc-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 font-bold text-white text-sm mb-3">
                  <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-black">1</span>
                  Escaneie o Código QR com o Google Authenticator
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  <div className="bg-white p-3 rounded-2xl shadow-lg shrink-0">
                    <img 
                      src={setupData.qrCodeDataUrl} 
                      alt="QR Code Google Authenticator" 
                      className="w-44 h-44 object-contain"
                    />
                  </div>

                  <div className="space-y-3 text-xs text-zinc-400 leading-relaxed">
                    <p>
                      1. Abra o app <strong>Google Authenticator</strong> no seu celular.
                    </p>
                    <p>
                      2. Toque no ícone de <strong>+</strong> e escolha <strong>Ler código QR</strong>.
                    </p>
                    <div className="pt-2 border-t border-zinc-700/50">
                      <p className="text-zinc-500 text-[11px] mb-1">Não consegue escanear? Digite a chave manual:</p>
                      <div className="flex items-center gap-2">
                        <code className="bg-zinc-950 px-2.5 py-1.5 rounded-lg text-orange-400 font-mono text-[11px] tracking-wider select-all border border-zinc-800 truncate">
                          {revealSecret ? setupData.formattedSecret : maskSecret(setupData.secret)}
                        </code>
                        <button
                          type="button"
                          onClick={() => setRevealSecret(!revealSecret)}
                          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors shrink-0"
                          title={revealSecret ? "Ocultar chave" : "Revelar chave"}
                        >
                          {revealSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyKey}
                          className="p-1.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors shrink-0"
                          title="Copiar Chave Secreta"
                        >
                          {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Backup Codes */}
              <div className="bg-zinc-800/40 border border-zinc-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 font-bold text-white text-sm">
                    <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-black">2</span>
                    Salve seus Códigos de Recuperação
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyBackupCodes(setupData.backupCodes)}
                      className="px-2.5 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1"
                    >
                      {copiedCodes ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedCodes ? 'Copiados' : 'Copiar'}
                    </button>
                    <button
                      onClick={() => handleDownloadBackupCodes(setupData.backupCodes)}
                      className="px-2.5 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Baixar (.txt)
                    </button>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 mb-3">
                  Se você perder o acesso ao celular, esses códigos permitirão acessar sua conta. Cada código só funciona uma vez.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {setupData.backupCodes.map((c, i) => (
                    <div key={i} className="p-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-center font-mono text-xs font-bold text-orange-400">
                      {c}
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 3: Verify and Activate */}
              <div className="bg-zinc-800/40 border border-zinc-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 font-bold text-white text-sm mb-2">
                  <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-black">3</span>
                  Digite o código gerado no app para confirmar
                </div>
                <p className="text-xs text-zinc-400 mb-4">
                  Digite os 6 dígitos que aparecem agora no aplicativo Google Authenticator para garantir que tudo está sincronizado:
                </p>

                <div className="flex flex-col sm:flex-row items-stretch gap-3">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="000 000"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    className="bg-zinc-950 border border-zinc-700 text-white text-center font-mono font-black text-xl tracking-widest rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 flex-1"
                  />
                  <button
                    onClick={handleConfirmActivation}
                    disabled={isActivating || verificationCode.length !== 6}
                    className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black px-6 py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95"
                  >
                    {isActivating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Validando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Ativar Proteção 2FA
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEACTIVATE CONFIRMATION MODAL */}
      {isDeactivateOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 sm:p-8 relative shadow-2xl">
            <button
              onClick={() => setIsDeactivateOpen(false)}
              className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-white rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center p-4 bg-red-500/10 rounded-2xl mb-4 text-red-500">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white">Desativar Autenticação 2FA?</h3>
              <p className="text-zinc-400 text-xs mt-2 leading-relaxed">
                Ao desativar, qualquer pessoa que consiga acesso à sua conta Google poderá acessar este painel sem a verificação em duas etapas.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] uppercase tracking-wider font-bold text-zinc-400">
                    Código atual de 6 dígitos
                  </label>
                  <button
                    type="button"
                    onClick={() => setMaskDeactivateCode(!maskDeactivateCode)}
                    className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
                  >
                    {maskDeactivateCode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {maskDeactivateCode ? 'Mostrar' : 'Ocultar'}
                  </button>
                </div>
                <input
                  type={maskDeactivateCode ? "password" : "text"}
                  maxLength={6}
                  placeholder="000000"
                  value={deactivateCode}
                  onChange={(e) => setDeactivateCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-zinc-950 border border-zinc-700 text-white text-center font-mono font-black text-2xl tracking-widest rounded-2xl py-3 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeactivateOpen(false)}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-xs transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeactivate}
                  disabled={isDeactivating || deactivateCode.length !== 6}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                >
                  {isDeactivating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar e Desativar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
