import React, { useState, useEffect } from 'react';
import { Cookie, Settings, Check, X, Shield, BarChart3, Megaphone } from 'lucide-react';

interface CookieConsentBannerProps {
  onOpenPolicy: () => void;
  isPreferencesOpen: boolean;
  setIsPreferencesOpen: (open: boolean) => void;
}

export interface CookiePreferences {
  necessary: boolean; // always true
  analytics: boolean;
  marketing: boolean;
  savedAt: string;
}

const STORAGE_KEY = 'cobra_games_cookie_consent_v1';

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({
  onOpenPolicy,
  isPreferencesOpen,
  setIsPreferencesOpen,
}) => {
  const [showBanner, setShowBanner] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // Show banner if no choice made
        setShowBanner(true);
      } else {
        const parsed = JSON.parse(stored) as CookiePreferences;
        setAnalytics(parsed.analytics ?? true);
        setMarketing(parsed.marketing ?? true);
      }
    } catch {
      setShowBanner(true);
    }
  }, []);

  const saveConsent = (prefs: { analytics: boolean; marketing: boolean }) => {
    const consentData: CookiePreferences = {
      necessary: true,
      analytics: prefs.analytics,
      marketing: prefs.marketing,
      savedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consentData));
    } catch (e) {
      console.warn('Unable to save cookie preference to localStorage', e);
    }

    setAnalytics(prefs.analytics);
    setMarketing(prefs.marketing);
    setShowBanner(false);
    setIsPreferencesOpen(false);
  };

  const handleAcceptAll = () => {
    saveConsent({ analytics: true, marketing: true });
  };

  const handleRejectNonEssential = () => {
    saveConsent({ analytics: false, marketing: false });
  };

  const handleSaveCustom = () => {
    saveConsent({ analytics, marketing });
  };

  return (
    <>
      {/* Floating Bottom Cookie Banner */}
      {showBanner && !isPreferencesOpen && (
        <div 
          id="cookie-consent-banner"
          className="fixed bottom-0 left-0 right-0 z-40 p-4 sm:p-6 bg-slate-950/95 border-t border-slate-800 text-white shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom duration-300"
        >
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-blue-600/30 border border-blue-500/30 flex items-center justify-center flex-shrink-0 text-amber-400 mt-1">
                <Cookie className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  Valorizamos sua privacidade e controle de dados
                </h4>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
                  A <strong>COBRA GAMES JR</strong> utiliza cookies e tecnologias semelhantes para garantir o funcionamento dos jogos, salvar recordes, mensurar audiência (Google Analytics) e exibir anúncios relevantes (Google AdSense). Conforme a LGPD, você pode escolher quais cookies deseja permitir.
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={onOpenPolicy}
                    className="text-blue-400 hover:text-blue-300 underline font-medium cursor-pointer"
                  >
                    Ler a Política de Cookies completa
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={() => setIsPreferencesOpen(true)}
                    className="text-slate-300 hover:text-white flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5" /> Personalizar opções
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto flex-shrink-0">
              <button
                type="button"
                onClick={handleRejectNonEssential}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                Apenas Essenciais
              </button>
              <button
                type="button"
                onClick={() => setIsPreferencesOpen(true)}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-blue-600/50 bg-blue-950/40 hover:bg-blue-900/50 text-blue-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Settings className="w-4 h-4" /> Preferências
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-lg shadow-blue-600/30 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Aceitar Todos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      {isPreferencesOpen && (
        <div
          id="cookie-preferences-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPreferencesOpen(false);
          }}
        >
          <div className="bg-white text-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-6 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Preferências de Cookies</h3>
                  <p className="text-xs text-slate-400">Personalize os dados que você autoriza coletarmos</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPreferencesOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-sm">
              <p className="text-slate-600">
                Você pode habilitar ou desabilitar diferentes categorias de cookies. Para mais detalhes, consulte nossa{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsPreferencesOpen(false);
                    onOpenPolicy();
                  }}
                  className="text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  Política de Cookies
                </button>.
              </p>

              {/* Necessary */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-900">Cookies Necessários</span>
                    <span className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      Sempre Ativo
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Indispensáveis para a navegação, segurança, gravação de consentimento e funcionamento dos jogos. Não podem ser desativados.
                  </p>
                </div>
                <div className="text-xs text-slate-400 font-semibold px-2 py-1">
                  Ativo
                </div>
              </div>

              {/* Analytics */}
              <div className="border border-slate-200 rounded-2xl p-4 flex items-start justify-between gap-4 hover:border-slate-300 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-600" />
                    <span className="font-bold text-slate-900">Cookies Analíticos e Desempenho</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Permite ao Google Analytics medir o número de visitas, páginas populares e desempenho técnico para aprimorar nossos jogos.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={analytics}
                    onChange={(e) => setAnalytics(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Marketing */}
              <div className="border border-slate-200 rounded-2xl p-4 flex items-start justify-between gap-4 hover:border-slate-300 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-amber-600" />
                    <span className="font-bold text-slate-900">Cookies de Publicidade (Google AdSense)</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Utilizados para exibir anúncios relevantes e viabilizar a gratuidade dos nossos títulos e do jogo Turbo Rush.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={marketing}
                    onChange={(e) => setMarketing(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleRejectNonEssential}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Rejeitar Não Essenciais
              </button>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSaveCustom}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border border-blue-600 text-blue-600 hover:bg-blue-50 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  Salvar Preferências
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer shadow-md shadow-blue-600/20"
                >
                  Aceitar Todos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
