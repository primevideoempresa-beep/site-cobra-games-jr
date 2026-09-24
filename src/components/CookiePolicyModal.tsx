import React, { useEffect } from 'react';
import { X, Cookie, ShieldCheck, BarChart3, Megaphone, CheckCircle2, Lock, ArrowRight, ExternalLink } from 'lucide-react';

interface CookiePolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPreferences?: () => void;
}

export const CookiePolicyModal: React.FC<CookiePolicyModalProps> = ({
  isOpen,
  onClose,
  onOpenPreferences,
}) => {
  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      id="cookie-policy-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="cookie-policy-modal-dialog"
        className="bg-white text-slate-800 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden my-auto"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white p-6 sm:p-8 flex items-start justify-between relative flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/30 border border-blue-400/40 flex items-center justify-center text-blue-200 shadow-inner">
              <Cookie className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-700/60 text-blue-200 border border-blue-500/30">
                  COBRA GAMES JR
                </span>
                <span className="text-xs text-blue-300">Atualizado: 24 de Setembro de 2026</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
                Política de Cookies
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-blue-200 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors cursor-pointer"
            title="Fechar"
            aria-label="Fechar Política de Cookies"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-8 leading-relaxed text-slate-600 text-sm sm:text-base">
          
          {/* Introdução */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-5 text-slate-700">
            <p className="font-medium">
              Esta Política de Cookies explica como a <strong>COBRA GAMES JR LLC</strong> (&ldquo;nós&rdquo;, &ldquo;nosso&rdquo; ou &ldquo;COBRA GAMES JR&rdquo;) utiliza cookies, web beacons, identificadores de publicidade e tecnologias similares em nosso website, portfólio online e jogos integrados (incluindo <em>Turbo Rush</em>, <em>Cobra Pro Max</em> e demais títulos móveis e web).
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Nosso compromisso é garantir transparência total sobre a coleta, armazenamento e tratamento de dados, em conformidade com a <strong>Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018)</strong> do Brasil e com as diretrizes do Regulamento Geral de Proteção de Dados (GDPR).
            </p>
          </div>

          {/* 1. O que são Cookies? */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-lg sm:text-xl border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-black">1</span>
              <h3>O que são Cookies e Tecnologias Semelhantes?</h3>
            </div>
            <p>
              <strong>Cookies</strong> são pequenos arquivos de texto enviados pelo servidor do site e armazenados no navegador do seu computador, tablet ou smartphone quando você visita páginas na internet. Eles permitem que o site reconheça seu dispositivo em acessos futuros, lembre de suas preferências, assegure o correto funcionamento de recursos interativos e forneça informações para aprimoramento contínuo.
            </p>
            <p>
              Além de cookies tradicionais, podemos utilizar tecnologias análogas:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li><strong>Armazenamento Local (localStorage e sessionStorage):</strong> mecanismos que salvam localmente dados de jogabilidade, melhores recordes, moedas acumuladas e preferências de som diretamente no navegador do usuário sem expiração imediata.</li>
              <li><strong>Web Beacons / Pixels:</strong> pequenos trechos gráficos usados para monitorar a eficácia de comunicações e tráfego de páginas.</li>
              <li><strong>Identificadores de Dispositivo Móvel (como Google Advertising ID - GAID e Apple IDFA):</strong> códigos alfanuméricos anônimos usados em jogos de smartphone para fins analíticos e de publicidade não intrusiva.</li>
            </ul>
          </section>

          {/* 2. Por que utilizamos Cookies? */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-lg sm:text-xl border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-black">2</span>
              <h3>Para quais finalidades utilizamos Cookies?</h3>
            </div>
            <p>
              A COBRA GAMES JR emprega cookies e dados armazenados para:
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mt-3">
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60">
                <div className="flex items-center gap-2 font-bold text-slate-800 mb-1">
                  <Lock className="w-4 h-4 text-blue-600" />
                  <span>Operação Essencial &amp; Segurança</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500">
                  Permitir navegação fluida, prevenção a fraudes, proteção contra ataques de negação de serviço e gravação do seu consentimento de privacidade.
                </p>
              </div>

              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60">
                <div className="flex items-center gap-2 font-bold text-slate-800 mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Experiência &amp; Jogabilidade</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500">
                  Salvar recordes de pontuação no Turbo Rush, progresso de fases, áudio ativado/desativado e parâmetros de jogo sem necessidade de recadastro repetitivo.
                </p>
              </div>

              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60">
                <div className="flex items-center gap-2 font-bold text-slate-800 mb-1">
                  <BarChart3 className="w-4 h-4 text-purple-600" />
                  <span>Métricas &amp; Desempenho</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500">
                  Compreender quantas pessoas acessam nossa plataforma, quais títulos despertam maior interesse e identificar melhorias técnicas através do Google Analytics.
                </p>
              </div>

              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60">
                <div className="flex items-center gap-2 font-bold text-slate-800 mb-1">
                  <Megaphone className="w-4 h-4 text-amber-600" />
                  <span>Publicidade Responsável</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500">
                  Exibir anúncios relevantes através do Google AdSense, limitando repetição excessiva de propagandas e viabilizando a gratuidade de nossos jogos.
                </p>
              </div>
            </div>
          </section>

          {/* 3. Categorias de Cookies detalhadas */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-lg sm:text-xl border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-black">3</span>
              <h3>Categorias de Cookies Utilizados</h3>
            </div>

            <div className="space-y-3">
              {/* Categoria 1 */}
              <div className="border border-emerald-200 rounded-2xl p-4 bg-emerald-50/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Cookies Estritamente Necessários (Sempre Ativos)
                  </span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                    Obrigatório
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600">
                  São fundamentais para que o site e os jogos funcionem adequadamente. Sem estes cookies, recursos básicos como preferências de idioma, renderização de canvas de jogos e o armazenamento do seu status de consentimento não funcionariam.
                </p>
                <div className="mt-2 text-xs text-slate-500">
                  <strong>Exemplos:</strong> <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">cookie_consent</code>, preferências de controle de jogo, estados de sessão e integridade de formulários.
                </div>
              </div>

              {/* Categoria 2 */}
              <div className="border border-purple-200 rounded-2xl p-4 bg-purple-50/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                    Cookies de Desempenho e Estatísticas (Analytics)
                  </span>
                  <span className="text-xs font-bold text-purple-800 bg-purple-100 px-2.5 py-1 rounded-full">
                    Configurável
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600">
                  Coletam dados agregados e anônimos sobre como os usuários interagem com nosso website e páginas de jogos. Isso nos ajuda a saber quais páginas são mais visitadas, taxas de erro e tempo de permanência, impulsionando constantes otimizações.
                </p>
                <div className="mt-2 text-xs text-slate-500">
                  <strong>Parceiro principal:</strong> Google Analytics (Google LLC — Tag ID: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">G-FPY963T1JC</code>). Cookies como <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">_ga</code> e <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">_ga_*</code>.
                </div>
              </div>

              {/* Categoria 3 */}
              <div className="border border-amber-200 rounded-2xl p-4 bg-amber-50/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900 flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-amber-600" />
                    Cookies de Publicidade e Marketing (Google AdSense)
                  </span>
                  <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">
                    Configurável
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600">
                  Utilizados para exibir anúncios contextuais ou personalizados no website e em jogos suportados por anúncios. Eles evitam que o mesmo anúncio seja exibido repetidamente e ajudam a mensurar a eficácia das campanhas.
                </p>
                <div className="mt-2 text-xs text-slate-500">
                  <strong>Parceiro principal:</strong> Google AdSense (Google LLC — ID de Editor: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">ca-pub-6014151375770402</code>). Cookies como <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">IDE</code>, <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">DSID</code> ou <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">test_cookie</code> através dos domínios <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">doubleclick.net</code> e <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">google.com</code>.
                </div>
              </div>
            </div>
          </section>

          {/* 4. Cookies de Terceiros e Links Externos */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-lg sm:text-xl border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-black">4</span>
              <h3>Cookies de Terceiros e Políticas Externas</h3>
            </div>
            <p>
              Ao utilizar nosso site, você poderá interagir com serviços prestados por terceiros confiáveis. A gestão e o tratamento desses dados seguem adicionalmente as políticas dessas próprias organizações:
            </p>
            <ul className="space-y-2 mt-2">
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                <span>
                  <strong>Google LLC (Analytics, AdSense, Play Store):</strong> Para saber como o Google gerencia dados ao utilizar sites e aplicativos parceiros, consulte a página oficial em{' '}
                  <a
                    href="https://policies.google.com/technologies/partner-sites"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    Como o Google usa dados <ExternalLink className="w-3.5 h-3.5" />
                  </a>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                <span>
                  <strong>Desativação do Google Ads:</strong> Você pode personalizar ou desativar anúncios personalizados do Google acessando as{' '}
                  <a
                    href="https://adssettings.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    Configurações de Anúncios do Google <ExternalLink className="w-3.5 h-3.5" />
                  </a>.
                </span>
              </li>
            </ul>
          </section>

          {/* 5. Como gerenciar ou desativar Cookies */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-lg sm:text-xl border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-black">5</span>
              <h3>Como Gerenciar e Desativar Cookies no seu Navegador</h3>
            </div>
            <p>
              Você tem total liberdade para aceitar, rejeitar ou excluir cookies a qualquer momento através do nosso banner de consentimento ou diretamente nas configurações de privacidade do seu navegador:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50">
                <h4 className="font-bold text-slate-900 text-sm mb-1">Google Chrome</h4>
                <p className="text-xs text-slate-500">Menu &gt; Configurações &gt; Privacidade e Segurança &gt; Cookies de terceiros.</p>
              </div>
              <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50">
                <h4 className="font-bold text-slate-900 text-sm mb-1">Mozilla Firefox</h4>
                <p className="text-xs text-slate-500">Menu &gt; Configurações &gt; Privacidade e Segurança &gt; Cookies e dados de sites.</p>
              </div>
              <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50">
                <h4 className="font-bold text-slate-900 text-sm mb-1">Apple Safari (iOS / macOS)</h4>
                <p className="text-xs text-slate-500">Ajustes &gt; Safari &gt; Avançado &gt; Bloquear Todos os Cookies ou Prevenção de Rastreamento.</p>
              </div>
              <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50">
                <h4 className="font-bold text-slate-900 text-sm mb-1">Microsoft Edge</h4>
                <p className="text-xs text-slate-500">Configurações &gt; Cookies e permissões de site &gt; Gerenciar e excluir cookies.</p>
              </div>
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200 mt-2">
              <strong>Atenção:</strong> A desativação completa de todos os cookies pode afetar o funcionamento de certos jogos da plataforma, como a retenção automática do seu recorde de pontuação ou preferências sonoras.
            </p>
          </section>

          {/* 6. Direitos dos Titulares de Dados (LGPD) */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-lg sm:text-xl border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-black">6</span>
              <h3>Seus Direitos sob a LGPD (Lei Geral de Proteção de Dados)</h3>
            </div>
            <p>
              Conforme o artigo 18 da LGPD, você possui o direito de obter a confirmação da existência de tratamento de dados pessoais, o acesso a esses dados, a correção de dados incompletos ou inexatos, a anonimização ou eliminação de dados desnecessários, bem como a revogação do consentimento concedido anteriormente.
            </p>
          </section>

          {/* 7. Contato e DPO */}
          <section className="space-y-3 bg-slate-50 border border-slate-200 p-5 rounded-2xl">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base sm:text-lg">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <h4>Dúvidas ou Solicitações sobre Cookies e Privacidade</h4>
            </div>
            <p className="text-sm text-slate-600">
              Caso tenha dúvidas sobre nossa Política de Cookies ou deseje exercer seus direitos de privacidade, fale diretamente com nossa equipe responsável:
            </p>
            <div className="text-sm text-slate-800 space-y-1 mt-2">
              <div><strong>Empresa:</strong> COBRA GAMES JR LLC</div>
              <div><strong>Endereço:</strong> Aldeia nº 24, Edifício: 17 — Brasil</div>
              <div>
                <strong>E-mail de Contato / DPO:</strong>{' '}
                <a href="mailto:primevideoempresa@gmail.com" className="text-blue-600 font-medium hover:underline">
                  primevideoempresa@gmail.com
                </a>
              </div>
            </div>
          </section>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            Ao continuar navegando em nossos jogos, você concorda com os termos aplicáveis.
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onOpenPreferences && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPreferences();
                }}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-sm transition-colors cursor-pointer"
              >
                Gerenciar Preferências
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-colors cursor-pointer shadow-md shadow-blue-600/20"
            >
              Entendido e Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
