import React, { useEffect } from 'react';
import { X, Shield, Lock, Eye, Database, UserCheck, Bell, Mail, ArrowRight, ExternalLink, FileText, CheckCircle2 } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCookiePolicy?: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
  onOpenCookiePolicy,
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
      id="privacy-policy-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="privacy-policy-modal-dialog"
        className="bg-white text-slate-800 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden my-auto"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 text-white p-6 sm:p-8 flex items-start justify-between relative flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 shadow-inner">
              <Shield className="w-7 h-7 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-700/60 text-blue-200 border border-blue-500/30">
                  COBRA GAMES JR LLC
                </span>
                <span className="text-xs text-blue-300">Conformidade LGPD &amp; GDPR</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
                Política de Privacidade
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-blue-200 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors cursor-pointer"
            title="Fechar"
            aria-label="Fechar Política de Privacidade"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-8 leading-relaxed text-slate-600 text-sm sm:text-base">
          
          {/* Introdução e Identificação */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-5 text-slate-700">
            <p className="font-semibold text-slate-900">
              A sua privacidade é prioridade fundamental para a COBRA GAMES JR LLC.
            </p>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Esta Política de Privacidade descreve de forma clara e transparente como a <strong>COBRA GAMES JR LLC</strong> (&ldquo;nós&rdquo;, &ldquo;nosso&rdquo; ou &ldquo;COBRA GAMES JR&rdquo;) coleta, armazena, utiliza e protege os dados pessoais dos usuários quando estes acessam nosso portal online, entram em contato conosco ou jogam nossos títulos web e móveis (incluindo <em>Turbo Rush</em>, <em>Cobra Pro Max</em> e outros jogos distribuídos na Google Play Store).
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Esta política foi formulada em estrita conformidade com a <strong>Lei Geral de Proteção de Dados Pessoais do Brasil (LGPD - Lei nº 13.709/2018)</strong>, com o Regulamento Geral de Proteção de Dados (GDPR da União Europeia) e com as Políticas para Desenvolvedores do Google Play.
            </p>
          </div>

          {/* 1. Dados Coletados */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-lg sm:text-xl border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-black">1</span>
              <h3>Quais Dados Nós Coletamos</h3>
            </div>
            <p>
              Dependendo de como você interage com nossos jogos e serviços, podemos tratar diferentes categorias de informações:
            </p>
            <div className="space-y-3 mt-3">
              <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50/60">
                <h4 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  a) Informações fornecidas voluntariamente pelo Usuário
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Ao utilizar nosso formulário de contato ou suporte ao cliente, você poderá nos fornecer: nome completo, endereço de e-mail e o conteúdo de sua mensagem. Esses dados são utilizados exclusivamente para responder às suas solicitações e dúvidas de suporte.
                </p>
              </div>

              <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50/60">
                <h4 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-600" />
                  b) Dados de Progresso e Jogabilidade (Armazenamento Local)
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Nos nossos jogos (como <em>Turbo Rush</em> e <em>Cobra Pro Max</em>), armazenamos localmente no seu dispositivo (via HTML5 LocalStorage) recordes de pontuação, moedas virtuais do jogo, opções de áudio (mudo/ativado) e fases concluídas. Esses dados não são transferidos para servidores externos para identificá-lo pessoalmente.
                </p>
              </div>

              <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50/60">
                <h4 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                  <Eye className="w-4 h-4 text-purple-600" />
                  c) Dados Técnicos e Analíticos Coletados Automaticamente
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Podemos coletar dados técnicos anônimos ou pseudonimizados, tais como: tipo de dispositivo, resolução de tela, sistema operacional, navegador utilizado, idioma de preferência, páginas visitadas e relatórios de falha (crash reports), utilizando o Google Analytics para otimização contínua da performance.
                </p>
              </div>

              <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50/60">
                <h4 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600" />
                  d) Identificadores de Publicidade Móvel (Google AdSense / AdMob)
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Para permitir que nossos jogos sejam disponibilizados gratuitamente, exibimos anúncios geridos pelo Google AdSense e parceiros autorizados. Estes podem utilizar identificadores anônimos de publicidade (Google Advertising ID) para prevenir fraudes e apresentar anúncios adequados ao contexto.
                </p>
              </div>
            </div>
          </section>

          {/* 2. Bases Legais e Finalidades (LGPD Art. 7) */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-lg sm:text-xl border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-black">2</span>
              <h3>Finalidades e Bases Legais do Tratamento</h3>
            </div>
            <p>
              Tratamos seus dados com base nas seguintes hipóteses legais previstas no Artigo 7º da LGPD:
            </p>
            <ul className="grid sm:grid-cols-2 gap-3 text-xs sm:text-sm text-slate-600 mt-2">
              <li className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <strong className="text-slate-800 block mb-1">Execução de Contrato / Serviço:</strong>
                Permitir que você acesse, carregue e jogue nossos títulos com fluidez e retenção de pontuações.
              </li>
              <li className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <strong className="text-slate-800 block mb-1">Legítimo Interesse:</strong>
                Aprimorar a experiência dos jogadores, diagnosticar erros no código e proteger nossos sistemas contra ataques e fraudes.
              </li>
              <li className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <strong className="text-slate-800 block mb-1">Consentimento do Titular:</strong>
                Para cookies não essenciais de métricas e anúncios personalizados, gerenciáveis pelo nosso banner de consentimento.
              </li>
              <li className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <strong className="text-slate-800 block mb-1">Cumprimento de Obrigação Legal:</strong>
                Atender determinações judiciais ou regulatórias de autoridades competentes brasileiras.
              </li>
            </ul>
          </section>

          {/* 3. Compartilhamento de Dados com Terceiros */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-lg sm:text-xl border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-black">3</span>
              <h3>Compartilhamento com Terceiros de Confiança</h3>
            </div>
            <p>
              <strong>A COBRA GAMES JR nunca vende ou comercializa seus dados pessoais.</strong> O compartilhamento ocorre exclusivamente com prestadores de tecnologia imprescindíveis para a entrega dos serviços:
            </p>
            <div className="space-y-2 mt-2">
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <ArrowRight className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                <div className="text-xs sm:text-sm">
                  <strong>Google LLC (Google Analytics, Google AdSense e Google Play):</strong>
                  Serviços analíticos e de monetização. A política do Google pode ser consultada em{' '}
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 font-medium hover:underline inline-flex items-center gap-0.5"
                  >
                    Políticas de Privacidade do Google <ExternalLink className="w-3 h-3" />
                  </a>.
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <ArrowRight className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                <div className="text-xs sm:text-sm">
                  <strong>Autoridades Públicas e Governamentais:</strong>
                  Apenas quando exigido formalmente por lei, intimação judicial ou processo regulatório vinculante.
                </div>
              </div>
            </div>
          </section>

          {/* 4. Privacidade de Crianças e Menores de Idade */}
          <section className="space-y-3 bg-amber-50/50 border border-amber-200 p-5 rounded-2xl">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-base sm:text-lg">
              <UserCheck className="w-5 h-5 text-amber-700" />
              <h3>Proteção à Privacidade de Crianças e Menores (COPPA &amp; LGPD Art. 14)</h3>
            </div>
            <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed">
              Muitos de nossos jogos são casuais e adequados para toda a família. Em conformidade com o <strong>Artigo 14 da LGPD</strong> e o <strong>Children&apos;s Online Privacy Protection Act (COPPA)</strong>, não realizamos intencionalmente a coleta de dados de identificação pessoal de crianças menores de 13 anos. Caso um responsável legal tome conhecimento de que seu filho forneceu dados pessoais sem seu consentimento, entre em contato imediatamente conosco para que procedamos com a imediata e definitiva exclusão dos registros.
            </p>
          </section>

          {/* 5. Segurança da Informação */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-lg sm:text-xl border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-black">4</span>
              <h3>Segurança e Armazenamento dos Dados</h3>
            </div>
            <p>
              Adotamos práticas e padrões técnicos e organizacionais rigorosos para proteger os dados contra acessos não autorizados, destruição acidental, perda ou alteração ilícita. Isso inclui protocolos de criptografia <strong>SSL/TLS (HTTPS)</strong> para tráfego web seguro e acesso restrito a canais internos de suporte.
            </p>
          </section>

          {/* 6. Direitos do Titular sob a LGPD (Art. 18) */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-lg sm:text-xl border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-black">5</span>
              <h3>Seus Direitos como Titular de Dados</h3>
            </div>
            <p>
              Nos termos do <strong>Artigo 18 da LGPD</strong>, você tem o direito garantido de solicitar a qualquer momento:
            </p>
            <div className="grid sm:grid-cols-2 gap-2 text-xs sm:text-sm">
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Confirmação da existência de tratamento</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Acesso facilitado aos seus dados</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Correção de dados incompletos ou inexatos</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Anonimização, bloqueio ou eliminação de dados</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Portabilidade dos dados a outro fornecedor</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Revogação total do consentimento</span>
              </div>
            </div>
          </section>

          {/* 7. Política de Cookies Relacionada */}
          <section className="p-4 bg-blue-50/50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Gerenciamento de Cookies e Rastreamento</h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Saiba como usamos cookies analíticos e de publicidade em nosso documento específico.
              </p>
            </div>
            {onOpenCookiePolicy && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCookiePolicy();
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer flex-shrink-0"
              >
                Ver Política de Cookies
              </button>
            )}
          </section>

          {/* 8. Contato e Encarregado de Proteção de Dados (DPO) */}
          <section className="space-y-3 bg-slate-900 text-white p-6 rounded-2xl">
            <div className="flex items-center gap-2 text-white font-bold text-base sm:text-lg">
              <Mail className="w-5 h-5 text-blue-400" />
              <h4>Canal de Atendimento e DPO (Encarregado)</h4>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              Para exercer qualquer um dos seus direitos, relatar incidentes de privacidade ou enviar dúvidas sobre nossa governança de dados, envie uma mensagem para nosso Encarregado:
            </p>
            <div className="text-xs sm:text-sm text-slate-300 space-y-1.5 pt-1">
              <div><strong>Controlador:</strong> COBRA GAMES JR LLC</div>
              <div><strong>Sede:</strong> Aldeia nº 24, Edifício: 17 — Brasil</div>
              <div>
                <strong>E-mail do Encarregado (DPO):</strong>{' '}
                <a
                  href="mailto:primevideoempresa@gmail.com"
                  className="text-blue-400 font-semibold hover:underline"
                >
                  primevideoempresa@gmail.com
                </a>
              </div>
              <div className="text-xs text-slate-400 pt-2">
                Prazo de resposta conforme estipulado pela Autoridade Nacional de Proteção de Dados (ANPD): até 15 dias úteis a contar da requisição.
              </div>
            </div>
          </section>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            Versão vigente revisada em 24 de Setembro de 2026.
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href="/politica-privacidade.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-xs sm:text-sm transition-colors text-center inline-flex items-center justify-center gap-1.5"
            >
              <FileText className="w-4 h-4" /> Versão para Impressão / Link Direto
            </a>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer shadow-md shadow-blue-600/20"
            >
              Fechar Política
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
