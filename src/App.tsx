/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Menu, X, Download, MapPin, Mail, Gamepad2, Apple, PlaySquare, Play, Flame } from 'lucide-react';
import { otherGames } from './data';
import wormIcon from './assets/images/regenerated_image_1788833588389.jpg';
import { TurboRushModal } from './components/TurboRushModal';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full bg-blue-900/95 backdrop-blur-md z-50 border-b border-blue-800">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <a href="#" className="text-white font-black text-xl tracking-tight flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Gamepad2 className="w-5 h-5 text-blue-900" />
          </div>
          COBRA GAMES JR
        </a>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#jogos" className="text-blue-100 hover:text-white font-medium transition-colors">Jogos</a>
          <a href="#contatos" className="text-blue-100 hover:text-white font-medium transition-colors">Contatos</a>
          <a href="#contatos" className="bg-white hover:bg-blue-50 text-blue-900 rounded-full px-5 py-2.5 font-bold transition-colors">
            Entre em contato
          </a>
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden p-2 text-white" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-blue-800 bg-blue-900 px-6 py-6 space-y-4 shadow-xl">
          <a href="#jogos" onClick={() => setIsOpen(false)} className="block text-white font-medium">Jogos</a>
          <a href="#contatos" onClick={() => setIsOpen(false)} className="block text-white font-medium">Contatos</a>
          <a href="#contatos" onClick={() => setIsOpen(false)} className="block mt-4 text-center bg-white text-blue-900 rounded-full px-5 py-3 font-bold">
            Entre em contato
          </a>
        </div>
      )}
    </nav>
  );
};

const HeroAndStats = () => (
  <div className="bg-blue-900 pt-20">
    <section className="pt-20 pb-16 px-6 max-w-5xl mx-auto text-center">
      <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight">
        Jogos para celular que o <span className="text-blue-400">mundo inteiro joga</span>
      </h1>
      <p className="text-lg md:text-xl text-blue-100 mb-10 max-w-3xl mx-auto leading-relaxed">
        A COBRA GAMES JR é uma editora de jogos casuais para dispositivos móveis, sediada no Brasil. De cobras famintas a plataformas que travam, nossos jogos já foram instalados mais vezes na Google Play.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <a href="#jogos" className="bg-white hover:bg-blue-50 text-blue-900 rounded-full px-8 py-4 font-bold transition-all shadow-lg text-lg">
          Explore nossos jogos
        </a>
        <a href="#contatos" className="bg-transparent hover:bg-blue-800/50 text-white border border-blue-400/50 hover:border-blue-300 rounded-full px-8 py-4 font-bold transition-all text-lg">
          Contate-nos
        </a>
      </div>
    </section>

    <section className="py-16 border-t border-blue-800/50">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-blue-800/50">
        <div className="py-4">
          <div className="text-4xl md:text-5xl font-black text-white mb-2">10B +</div>
          <div className="text-blue-200 font-medium text-lg">downloads combinados em todo o nosso portfólio</div>
        </div>
        <div className="py-4">
          <div className="text-4xl md:text-5xl font-black text-white mb-2">200 +</div>
          <div className="text-blue-200 font-medium text-lg">títulos publicados na App Store e no Google Play</div>
        </div>
        <div className="py-4">
          <div className="text-4xl md:text-5xl font-black text-white mb-2">500 milhões +</div>
          <div className="text-blue-200 font-medium text-lg max-w-xs mx-auto">downloads dos nossos maiores sucessos — Cobra Pro Max-Cobra Faminta</div>
        </div>
      </div>
    </section>
  </div>
);

const FeaturedGames = ({ onOpenTurboRush }: { onOpenTurboRush: () => void }) => {
  const handleOpenLink = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onOpenTurboRush();
  };

  return (
    <section id="jogos" className="py-24 px-6 max-w-7xl mx-auto">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="text-blue-600 font-bold tracking-wide uppercase text-sm mb-3">Nossos jogos</h2>
        <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Jogadores de sucesso continuam voltando para</h3>
        <p className="text-lg text-slate-500">Meio bilhão de downloads cada — esses são os jogos principais que colocaram a COBRA GAMES JR nas paradas globais.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* Card 1 */}
        <div id="featured-game-card-1" className="bg-white border border-slate-100 rounded-3xl p-8 shadow-xl shadow-slate-200/40 transition-all duration-300 ease-out hover:scale-105 hover:-translate-y-1 flex flex-col justify-between">
          <div>
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 overflow-hidden">
              <img src={wormIcon} alt="Minhoca Arco-Íris Brilhante" className="w-full h-full object-cover" />
            </div>
            <div className="text-sm font-bold text-emerald-600 mb-2 flex items-center gap-1">
              <Download className="w-4 h-4" /> Mais de 500 milhões de downloads
            </div>
            <h4 className="text-2xl font-bold text-slate-900 mb-3">Cobra Pro Max — Cobra Faminta</h4>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Crie a minhoca mais comprida e faminta em uma arena multijogador vibrante. Um clássico do snake io reinventado — um dos nossos títulos mais jogados no mundo todo.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <a 
              id="featured-download-btn-1"
              href="https://play.google.com/store/apps/details?id=com.aistudio.cobrapromax.game&pcampaignid=web_share"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-slate-900 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <PlaySquare className="w-5 h-5" /> Google Play
            </a>
          </div>
        </div>

        {/* Card 2 */}
        <div id="featured-game-card-2" className="bg-white border border-slate-100 rounded-3xl p-8 shadow-xl shadow-slate-200/40 transition-all hover:-translate-y-1 flex flex-col justify-between">
          <div>
            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 overflow-hidden shadow-inner">
              <Flame className="w-10 h-10 text-blue-600" />
            </div>
            <div className="text-sm font-bold text-blue-600 mb-2 flex items-center gap-1">
              <Download className="w-4 h-4" /> Mais de 500 milhões de downloads
            </div>
            <h4 id="featured-game-title-2" className="text-2xl font-bold text-slate-900 mb-3">Turbo Rush</h4>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Desvie do tráfego intenso, colete moedas e ative seu turbo nitro para alcançar velocidades recordes em pistas de alta octanagem!
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <a 
              id="featured-download-btn-2"
              href="/turbo-rush.html"
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleOpenLink}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-blue-600/20"
            >
              <Play className="w-5 h-5 fill-current" /> Jogar Turbo Rush
            </a>
            <div className="text-xs text-slate-500 text-center flex items-center justify-center gap-1">
              <span>Clique para abrir e jogar diretamente</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const OtherGames = () => (
  <section className="py-24 px-6 max-w-7xl mx-auto border-t border-slate-100">
    <div className="mb-12 md:flex items-end justify-between">
      <div className="max-w-2xl">
        <h2 className="text-blue-600 font-bold tracking-wide uppercase text-sm mb-3">Mais conteúdo do nosso estúdio</h2>
        <h3 className="text-3xl font-bold text-slate-900 mb-4">Um portfólio que os jogadores adoram.</h3>
        <p className="text-lg text-slate-500">
          Uma seleção dos nossos títulos de maior sucesso. Encontre o catálogo completo nas nossas páginas de desenvolvedor na Google Play e na App Store.
        </p>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {otherGames.map((game, idx) => (
        <div key={idx} className="group p-5 rounded-2xl border border-slate-100 hover:border-blue-100 hover:shadow-lg hover:shadow-blue-50/50 transition-all bg-white flex items-start gap-4">
          <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
            <Gamepad2 className="w-7 h-7" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-1 line-clamp-1">{game.title}</h4>
            <div className="text-sm text-slate-500 font-medium mb-3">{game.stats}</div>
            <div className="flex gap-2">
              <span className="text-xs font-bold text-slate-400 hover:text-slate-900 cursor-pointer flex items-center gap-1"><PlaySquare className="w-3 h-3"/> Google Play</span>
              <span className="text-xs font-bold text-slate-400 hover:text-slate-900 cursor-pointer flex items-center gap-1"><Apple className="w-3 h-3"/> App Store</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </section>
);


const ContactAndFooter = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState({ email: '', message: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;
    const newErrors = { email: '', message: '' };

    if (!formData.email) {
      newErrors.email = 'E-mail é obrigatório.';
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Por favor, insira um e-mail válido.';
      valid = false;
    }

    if (!formData.message.trim()) {
      newErrors.message = 'A mensagem não pode estar vazia.';
      valid = false;
    }

    setErrors(newErrors);

    if (valid) {
      setIsSubmitted(true);
      // Aqui você adicionaria a lógica para enviar a mensagem
      setTimeout(() => {
        setIsSubmitted(false);
        setFormData({ name: '', email: '', message: '' });
      }, 3000);
    }
  };

  return (
    <footer id="contatos" className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid md:grid-cols-2 gap-16 mb-16 border-b border-slate-800 pb-16">
          <div>
            <h2 className="text-3xl font-bold text-white mb-4">Contatos</h2>
            <p className="text-lg text-slate-400 mb-8 max-w-md">
              Se tiver alguma dúvida sobre nossos jogos, parcerias ou qualquer outro assunto, entre em contato conosco.
            </p>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <Mail className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
                <div>
                  <div className="text-sm font-medium text-slate-500 mb-1">E-mail</div>
                  <a href="mailto:primevideoempresa@gmail.com" className="text-white hover:text-blue-400 font-medium text-lg transition-colors">primevideoempresa@gmail.com</a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <MapPin className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
                <div>
                  <div className="text-sm font-medium text-slate-500 mb-1">Escritório</div>
                  <address className="text-slate-300 not-italic leading-relaxed">
                    COBRA GAMES JR LLC<br />
                    Aldeia nº 24<br />
                    Edifício: 17<br />
                    Brasil
                  </address>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700/50">
             <h3 className="text-xl font-bold text-white mb-6">Envie uma mensagem</h3>
             {isSubmitted ? (
               <div className="bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl p-6 text-center">
                 <h4 className="font-bold text-lg mb-2">Mensagem enviada!</h4>
                 <p>Obrigado pelo contato. Retornaremos em breve.</p>
               </div>
             ) : (
               <form className="space-y-4" onSubmit={handleSubmit}>
                 <div>
                   <input 
                     type="text" 
                     placeholder="Seu nome" 
                     value={formData.name}
                     onChange={(e) => setFormData({...formData, name: e.target.value})}
                     className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" 
                   />
                 </div>
                 <div>
                   <input 
                     type="email" 
                     placeholder="Seu e-mail" 
                     value={formData.email}
                     onChange={(e) => setFormData({...formData, email: e.target.value})}
                     className={`w-full bg-slate-900 border ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-700 focus:border-blue-500 focus:ring-blue-500'} rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 transition-all`} 
                   />
                   {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
                 </div>
                 <div>
                   <textarea 
                     placeholder="Sua mensagem" 
                     rows={4} 
                     value={formData.message}
                     onChange={(e) => setFormData({...formData, message: e.target.value})}
                     className={`w-full bg-slate-900 border ${errors.message ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-700 focus:border-blue-500 focus:ring-blue-500'} rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 transition-all`}
                   ></textarea>
                   {errors.message && <p className="text-red-400 text-sm mt-1">{errors.message}</p>}
                 </div>
                 <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-3 font-bold transition-colors">
                   Enviar Mensagem
                 </button>
               </form>
             )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
           <div className="col-span-2 md:col-span-1">
             <div className="text-white font-black text-xl tracking-tight mb-6 flex items-center gap-2">
               <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                 <Gamepad2 className="w-5 h-5 text-white" />
               </div>
               COBRA GAMES JR
             </div>
             <div className="text-slate-400 text-sm">
               Jogos para celular que o mundo inteiro joga.
             </div>
           </div>
           <div>
             <h4 className="text-white font-bold mb-4">Nossos jogos</h4>
             <ul className="space-y-2 text-sm text-slate-400">
               <li><a href="#" className="hover:text-blue-400 transition-colors">Google Play</a></li>
             </ul>
           </div>
           <div>
             <h4 className="text-white font-bold mb-4">Empresa</h4>
             <ul className="space-y-2 text-sm text-slate-400">
               <li><a href="#contatos" className="hover:text-blue-400 transition-colors">Contatos</a></li>
             </ul>
           </div>
           <div>
             <h4 className="text-white font-bold mb-4">Jurídico</h4>
             <ul className="space-y-2 text-sm text-slate-400">
               <li><a href="#" className="hover:text-blue-400 transition-colors">Termos de Uso</a></li>
               <li><a href="#" className="hover:text-blue-400 transition-colors">Política de Privacidade</a></li>
               <li><a href="#" className="hover:text-blue-400 transition-colors">Política de Cookies</a></li>
             </ul>
           </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-slate-800 text-sm text-slate-500">
          <div>© 2026 COBRA GAMES JR. Todos os direitos reservados.</div>
          <div className="flex gap-4 mt-4 md:mt-0">
            <a href="#" className="hover:text-slate-300 transition-colors">Termos de uso e Política de privacidade</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Política de Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default function App() {
  const [isTurboRushOpen, setIsTurboRushOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100">
      <Navbar />
      <main>
        <HeroAndStats />
        <FeaturedGames onOpenTurboRush={() => setIsTurboRushOpen(true)} />
      </main>
      <ContactAndFooter />
      <TurboRushModal 
        isOpen={isTurboRushOpen} 
        onClose={() => setIsTurboRushOpen(false)} 
      />
    </div>
  );
}
