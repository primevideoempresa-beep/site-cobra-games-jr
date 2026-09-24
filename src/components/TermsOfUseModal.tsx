import React, { useEffect } from 'react';
import { X, FileText, CheckCircle2, ShieldAlert, Award, Scale, HelpCircle, Mail, ExternalLink, ArrowRight } from 'lucide-react';

interface TermsOfUseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPrivacyPolicy?: () => void;
}

export const TermsOfUseModal: React.FC<TermsOfUseModalProps> = ({
  isOpen,
  onClose,
  onOpenPrivacyPolicy,
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
      id="terms-of-use-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="terms-of-use-modal-dialog"
        className="bg-white text-slate-800 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden my-auto"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-950 text-white p-6 sm:p-8 flex items-start justify-between relative flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shadow-inner">
              <Scale className="w-7 h-7 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-700/60 text-blue-200 border border-blue-500/30">
                  COBRA GAMES JR LLC
                </span>
                <span className="text-xs text-blue-300">Vigência: 2026</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
                Termos de Uso
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-blue-200 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors cursor-pointer"
            title="Fechar"
            aria-label="Fechar Termos de Uso"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-8 leading-relaxed text-slate-600 text-sm sm:text-base">
          
          {/* Introdução */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-5 text-slate-700">
            <p className="font-semibold text-slate-900 text-base">
              Bem-vindo aos jogos e serviços da COBRA GAMES JR LLC.
            </p>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Estes <strong>Termos de Uso</strong> regulam o acesso e a utilização dos websites, jogos para navegador (incluindo <em>Turbo Rush</em>), aplicativos móveis distribuídos na Google Play Store (como <em>Cobra Pro Max</em>) e demais serviços digitais disponibilizados pela <strong>COBRA GAMES JR LLC</strong> (&ldquo;nós&rdquo;, &ldquo;nosso&rdquo; ou &ldquo;COBRA GAMES JR&rdquo;).
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Ao acessar, baixar ou jogar qualquer um dos nossos títulos, você declara ter lido, compreendido e concordado expressamente com estes Termos e com a nossa Política de Privacidade.
            </p>
          </div>

          {/* 1. Aceitação e Elegibilidade */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-lg sm:text-xl border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-black">1</span>
              <h3>Aceitação dos Termos e Capacidade Legal</h3>
            </div>
            <p>
              Ao utilizar nossos serviços, você confirma ter plena capacidade jurídica (maior de 18 anos ou emancipado nos termos do Código Civil Brasileiro) ou, caso seja menor de idade, ter obtido autorização expressa de seus pais ou responsáveis legais para jogar.
            </p>
            <p>
              Caso não concorde com qualquer disposição destes Termos de Uso, solicitamos que interrompa imediatamente o uso de nossos jogos e website.
            </p>
          </section>

          {/* 2. Licença de Uso Limitada */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-lg sm:text-xl border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-black">2</span>
              <h3>Licença de Uso Concedida ao Jogador</h3>
            </div>
            <p>
              Concedemos a você uma licença pessoal, não exclusiva, intransferível, não sublicenciável e revogável para acessar e executar nossos jogos unicamente para fins de entretenimento pessoal e não comercial.
            </p>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm space-y-2">
              <p className="font-semibold text-slate-900">Sob os termos desta licença, é expressamente proibido:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>Modificar, descompilar, realizar engenharia reversa ou tentar extrair o código-fonte de nossos jogos e sistemas.</li>
                <li>Utilizar trapaças (*cheats*), emuladores com intenção fraudulenta, bots, softwares de automação ou métodos de adulteração de pontuações.</li>
                <li>Explorar falhas de programação (*exploits*) para obter vantagens desleais ou prejudicar a experiência de outros jogadores.</li>
                <li>Comercializar, alugar, redistribuir ou revender contas, itens virtuais ou moedas de jogo por dinheiro real.</li>
              </ul>
            </div>
          </section>

          {/* 3. Propriedade Intelectual */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-lg sm:text-xl border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-black">3</span>
              <h3>Propriedade Intelectual e Direitos Autorais</h3>
            </div>
            <p>
              Todos os elementos que compõem nossos jogos e páginas web — incluindo, mas não se limitando a: marcas registradas, logotipos, designs gráficos, sprites, trilhas sonoras, efeitos de áudio, personagens, mecânicas de jogo, código de programação e textos — são de titularidade exclusiva da <strong>COBRA GAMES JR LLC</strong> ou de seus licenciadores devidamente autorizados.
            </p>
            <p className="text-xs text-slate-500">
              A marca COBRA GAMES JR, o título <em>Turbo Rush</em>, o título <em>Cobra Pro Max</em> e elementos visuais associados são resguardados pela legislação de direitos autorais e propriedade intelectual (Lei Federal nº 9.610/1998 e Lei da Propriedade Industrial nº 9.279/1996).
            </p>
          </section>

          {/* 4. Moedas Virtuais e Itens do Jogo */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-lg sm:text-xl border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-black">4</span>
              <h3>Moedas Virtuais, Recordes e Itens de Jogo</h3>
            </div>
            <p>
              Determinados jogos podem possibilitar o acúmulo de pontuações, moedas virtuais ou desbloqueio de cosméticos decorativos. Tais itens não possuem valor monetário no mundo real e constituem parte integrante da licença de entretenimento concedida.
            </p>
            <p>
              Itens virtuais ou moedas não são reembolsáveis nem passíveis de conversão em moeda fiduciária oficial (Reais, Dólares, etc.). A perda de dados decorrente de limpeza do navegador pelo usuário não gera dever de indenização pecuniária.
            </p>
          </section>

          {/* 5. Publicidade e Serviços de Terceiros */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-lg sm:text-xl border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-black">5</span>
              <h3>Publicidade e Links para Sites de Terceiros</h3>
            </div>
            <p>
              Nossos jogos e website gratuitos contêm inserções publicitárias intermediadas por parceiros idôneos (como Google AdSense e Google AdMob). Não temos responsabilidade pelo conteúdo, ofertas ou políticas de privacidade de páginas de terceiros para as quais eventuais anúncios possam direcionar.
            </p>
          </section>

          {/* 6. Limitação de Responsabilidade */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-lg sm:text-xl border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-black">6</span>
              <h3>Isenção de Garantias e Limitação de Responsabilidade</h3>
            </div>
            <p>
              Nossos jogos e serviços são disponibilizados no estado em que se encontram (&ldquo;como estão&rdquo; e &ldquo;conforme disponíveis&rdquo;), sem garantias de qualquer natureza, expressas ou implícitas, de funcionamento ininterrupto ou isenção de erros pontuais de conexão ou compatibilidade de hardware.
            </p>
            <p>
              Em nenhuma hipótese a COBRA GAMES JR será responsável por danos indiretos, lucros cessantes ou perda de dados decorrentes do uso ou da impossibilidade de uso de nossos jogos.
            </p>
          </section>

          {/* 7. Privacidade de Dados */}
          <section className="space-y-3 bg-slate-50 border border-slate-200 p-5 rounded-2xl">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base sm:text-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3>Privacidade e Proteção de Dados (LGPD)</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              O tratamento de dados pessoais no âmbito dos nossos jogos observa rigorosamente a legislação brasileira de proteção de dados (Lei nº 13.709/2018). Para compreender em detalhes como tratamos seus dados, consulte nossa Política de Privacidade.
            </p>
            {onOpenPrivacyPolicy && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPrivacyPolicy();
                }}
                className="mt-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                Abrir Política de Privacidade <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </section>

          {/* 8. Legislação Aplicável e Foro */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-lg sm:text-xl border-b border-slate-100 pb-2">
              <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-black">7</span>
              <h3>Legislação Aplicável e Foro de Eleição</h3>
            </div>
            <p>
              Estes Termos de Uso são regidos e interpretados de acordo com a legislação da República Federativa do Brasil, em especial o Código Civil Brasileiro, o Marco Civil da Internet (Lei nº 12.965/2014) e o Código de Defesa do Consumidor (Lei nº 8.078/1990), quando cabível.
            </p>
          </section>

          {/* 9. Informações de Contato */}
          <section className="space-y-3 bg-slate-900 text-white p-6 rounded-2xl">
            <div className="flex items-center gap-2 text-white font-bold text-base sm:text-lg">
              <Mail className="w-5 h-5 text-blue-400" />
              <h4>Canal de Atendimento e Suporte Jurídico</h4>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              Para dirimir dúvidas sobre estes Termos de Uso ou encaminhar notificações legais:
            </p>
            <div className="text-xs sm:text-sm text-slate-300 space-y-1 pt-1">
              <div><strong>Empresa:</strong> COBRA GAMES JR LLC</div>
              <div><strong>Endereço:</strong> Aldeia nº 24, Edifício: 17 — Brasil</div>
              <div>
                <strong>E-mail de Contato:</strong>{' '}
                <a
                  href="mailto:primevideoempresa@gmail.com"
                  className="text-blue-400 font-semibold hover:underline"
                >
                  primevideoempresa@gmail.com
                </a>
              </div>
            </div>
          </section>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            Ao jogar ou navegar em nosso portal, você concorda integralmente com estes Termos de Uso.
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href="/termos-de-uso.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-xs sm:text-sm transition-colors text-center inline-flex items-center justify-center gap-1.5"
            >
              <FileText className="w-4 h-4" /> Versão para Impressão
            </a>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer shadow-md shadow-blue-600/20"
            >
              Entendido e Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
