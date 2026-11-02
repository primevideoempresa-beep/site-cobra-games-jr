/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Menu, X, Download, MapPin, Mail, Gamepad2, Apple, PlaySquare, Play, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { otherGames } from './data';
import wormIcon from './assets/images/regenerated_image_1788833588389.jpg';
import kledImage from './assets/images/kled_3d_render_1793497542465.jpg';
import deskRacerImage from './assets/images/desk_racer_3d_1793497611855.jpg';
import { TurboRushModal } from './components/TurboRushModal';
import { CobraProMaxModal } from './components/CobraProMaxModal';
import { CookiePolicyModal } from './components/CookiePolicyModal';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { TermsOfUseModal } from './components/TermsOfUseModal';
import { DeskRacerModal } from './components/DeskRacerModal';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full bg-blue-900/95 backdrop-blur-md z-50 border-b border-blue-800">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <a href="#" className="text-white font-black text-xl tracking-tight flex items-center gap-2.5 group">
          <div className="w-9 h-9 bg-white rounded-xl shadow-md flex items-center justify-center transition-transform group-hover:scale-105 border border-slate-100">
            <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Controller Body */}
              <path 
                d="M7.5 9C5.57 9 4 10.57 4 12.5V17.5C4 20.5 6 23 9 23C10.5 23 11.8 21.8 11.8 20.2V18.5C11.8 17.67 12.47 17 13.3 17H18.7C19.53 17 20.2 17.67 20.2 18.5V20.2C20.2 21.8 21.5 23 23 23C26 23 28 20.5 28 17.5V12.5C28 10.57 26.43 9 24.5 9H7.5Z" 
                fill="#1E293B" 
                stroke="#334155" 
                strokeWidth="1.2" 
              />
              {/* Shoulder Buttons */}
              <path d="M7.5 9C7.5 7.6 9 6.5 11 6.5H12.5" stroke="#475569" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M24.5 9C24.5 7.6 23 6.5 21 6.5H19.5" stroke="#475569" strokeWidth="1.2" strokeLinecap="round" />

              {/* D-Pad (Left side) */}
              <rect x="7.5" y="13.2" width="2" height="5" rx="0.6" fill="#94A3B8" />
              <rect x="6" y="14.7" width="5" height="2" rx="0.6" fill="#94A3B8" />

              {/* Action Buttons (Right side - Y, B, A, X) */}
              {/* Y - Yellow (Top) */}
              <circle cx="23.5" cy="11.8" r="1.3" fill="#FACC15" />
              {/* B - Red (Right) */}
              <circle cx="25.8" cy="14.1" r="1.3" fill="#EF4444" />
              {/* A - Green (Bottom) */}
              <circle cx="23.5" cy="16.4" r="1.3" fill="#22C55E" />
              {/* X - Blue (Left) */}
              <circle cx="21.2" cy="14.1" r="1.3" fill="#3B82F6" />

              {/* Joysticks / Analog Sticks */}
              <circle cx="12" cy="19.2" r="2.1" fill="#0F172A" stroke="#38BDF8" strokeWidth="0.9" />
              <circle cx="20" cy="19.2" r="2.1" fill="#0F172A" stroke="#F0ABFC" strokeWidth="0.9" />

              {/* Center Home LED */}
              <circle cx="16" cy="12.5" r="1" fill="#38BDF8" />
            </svg>
          </div>
          COBRA GAMES JR
        </a>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#jogos" className="text-blue-100 hover:text-white font-medium transition-colors">Jogos</a>
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
    <section className="pt-28 pb-24 px-6 max-w-6xl mx-auto text-center">
      <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-white mb-8 leading-[1.1]">
        Jogos para celular que o <span className="text-blue-400">mundo inteiro joga</span>
      </h1>
      <p className="text-xl md:text-2xl text-blue-100 mb-12 max-w-4xl mx-auto leading-relaxed">
        A COBRA GAMES JR é uma editora de jogos casuais para dispositivos móveis, sediada no Brasil. De cobras famintas a plataformas que travam, nossos jogos já foram instalados mais vezes na Google Play.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <a href="#jogos" className="bg-white hover:bg-blue-50 text-blue-900 rounded-full px-10 py-5 font-extrabold transition-all shadow-xl hover:shadow-2xl text-xl hover:scale-105">
          Explore nossos jogos
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

const FeaturedGames = ({ 
  onOpenCobraProMax,
  onOpenTurboRush, 
  onOpenDeskRacer 
}: { 
  onOpenCobraProMax: () => void;
  onOpenTurboRush: () => void; 
  onOpenDeskRacer: () => void; 
}) => {
  const handleOpenTurboRushLink = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onOpenTurboRush();
  };

  const handleOpenDeskRacerLink = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onOpenDeskRacer();
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
        <div id="featured-game-card-1" className="relative bg-white border border-amber-100 rounded-3xl p-8 shadow-xl shadow-slate-200/40 transition-all duration-300 ease-out hover:scale-105 hover:-translate-y-1 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center overflow-hidden shadow-inner animate-pulse">
                <img src={wormIcon} alt="Minhoca Arco-Íris Brilhante" className="w-full h-full object-cover" />
              </div>
              <div id="bestseller-badge-1" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full text-xs font-black tracking-wide shadow-md shadow-amber-500/20 uppercase">
                <Trophy className="w-3.5 h-3.5 text-amber-100 fill-current" />
                <span>★ #1 Bestseller</span>
              </div>
            </div>
            <div className="text-sm font-bold text-emerald-600 mb-2 flex items-center gap-1">
              <Download className="w-4 h-4" /> Mais 5 novos downloads
            </div>
            <h4 className="text-2xl font-bold text-slate-900 mb-3">Cobra Pro Max — Cobra Faminta</h4>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Crie a minhoca mais comprida e faminta em uma arena multijogador vibrante. Um clássico do snake io reinventado — um dos nossos títulos mais jogados no mundo todo.
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            <button 
              id="featured-play-btn-1"
              type="button"
              onClick={onOpenCobraProMax}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="w-5 h-5 fill-current" /> Jogar Cobra Pro Max
            </button>
            <a 
              id="featured-download-btn-1"
              href="https://play.google.com/store/apps/details?id=com.aistudio.cobrapromax.game&pcampaignid=web_share"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-slate-900 text-white rounded-xl py-2.5 font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors cursor-pointer text-xs sm:text-sm"
            >
              <PlaySquare className="w-4 h-4" /> Google Play
            </a>
          </div>
        </div>

        {/* Card 2 */}
        <div id="featured-game-card-2" className="bg-white border border-slate-100 rounded-3xl p-8 shadow-xl shadow-slate-200/40 transition-all duration-300 ease-out hover:scale-105 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-200/50 flex flex-col justify-between">
          <div>
            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 overflow-hidden shadow-inner">
              <img src="/assets/aistudio/Turbo_Rush__Corrida_Urbana_ao_Entardecer_8d1f0ea0.png" alt="Turbo Rush" className="w-full h-full object-cover" />
            </div>
            <div className="text-sm font-bold text-red-500 mb-2 flex items-center gap-1">
              <Download className="w-4 h-4" /> Mais de 500 milhões de downloads • Modo 3D
            </div>
            <h4 id="featured-game-title-2" className="text-2xl font-bold text-slate-900 mb-3">Turbo Rush 3D — Supercarros</h4>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Pilote supercarros 3D de alto padrão como Ferrari, Lamborghini, Porsche, Bugatti e McLaren! Escolha pinturas metálicas exclusivas, desvie do tráfego em alta velocidade e ative o nitro turbo!
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <a 
              id="featured-download-btn-2"
              href="/turbo-rush.html"
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleOpenTurboRushLink}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-blue-600/20"
            >
              <Play className="w-5 h-5 fill-current" /> Jogar Turbo Rush
            </a>
          </div>
        </div>

        {/* Card 3 (Desk Racer) */}
        <div id="featured-game-card-3" className="relative bg-white border border-slate-100 rounded-3xl p-8 shadow-xl shadow-slate-200/40 transition-all duration-300 ease-out hover:scale-105 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-200/50 flex flex-col justify-between">
          <div className="absolute top-4 right-4 inline-flex items-center px-3 py-1 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-full text-xs font-black tracking-wide shadow-lg shadow-blue-500/30 animate-pulse">
            Lançamento
          </div>
          <div>
            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 overflow-hidden shadow-inner">
              <img src={deskRacerImage} alt="Desk Racer" className="w-full h-full object-cover" />
            </div>
            <div className="text-sm font-bold text-blue-500 mb-2 flex items-center gap-1">
              <Download className="w-4 h-4" /> Novo • Corrida de Mesa 3D
            </div>
            <h4 id="featured-game-title-3" className="text-2xl font-bold text-slate-900 mb-3">Desk Racer</h4>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Corrida de kart em miniatura em circuitos de mesa com física realista e visuais vibrantes!
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <a 
              id="featured-download-btn-3"
              href="/deskracer/index.html"
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleOpenDeskRacerLink}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-blue-600/20"
            >
              <Play className="w-5 h-5 fill-current" /> Jogar Desk Racer
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

const OtherGames = () => {
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const categories = ['Todos', 'Ação', 'Casual', 'Corrida'];
  
  const filteredGames = otherGames.filter(game => {
    const matchesCategory = activeCategory === 'Todos' || game.category === activeCategory;
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
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

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <input
          type="text"
          placeholder="Pesquisar jogos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 rounded-full border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-full font-bold transition-all whitespace-nowrap ${
                activeCategory === category 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGames.length > 0 ? (
          filteredGames.map((game, idx) => (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="group p-5 rounded-2xl border border-slate-100 hover:border-blue-100 hover:shadow-lg hover:shadow-blue-50/50 transition-all bg-white flex items-start gap-4"
            >
              <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                <Gamepad2 className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1 line-clamp-1">{game.title}</h4>
                <div className="text-sm text-slate-500 font-medium mb-1">{game.stats}</div>
                <div className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md inline-block">{game.category}</div>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs font-bold text-slate-400 hover:text-slate-900 cursor-pointer flex items-center gap-1"><PlaySquare className="w-3 h-3"/> Google Play</span>
                  <span className="text-xs font-bold text-slate-400 hover:text-slate-900 cursor-pointer flex items-center gap-1"><Apple className="w-3 h-3"/> App Store</span>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <p className="text-center text-slate-500 py-10 col-span-full">Nenhum jogo encontrado para esta pesquisa.</p>
        )}
      </div>
    </section>
  );
};


const ContactAndFooter = ({
  onOpenCookiePolicy,
  onOpenCookiePreferences,
  onOpenPrivacyPolicy,
  onOpenTermsOfUse,
}: {
  onOpenCookiePolicy: () => void;
  onOpenCookiePreferences: () => void;
  onOpenPrivacyPolicy: () => void;
  onOpenTermsOfUse: () => void;
}) => {
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
               <li><a href="https://play.google.com/store/apps/details?id=com.aistudio.cobrapromax.game&pcampaignid=web_share" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">Google Play</a></li>
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
             <ul className="space-y-2.5 text-sm text-slate-400">
               <li>
                 <button 
                   type="button"
                   onClick={onOpenTermsOfUse}
                   className="hover:text-blue-400 transition-colors text-left cursor-pointer flex items-center gap-1.5"
                 >
                   Termos de Uso
                 </button>
               </li>
               <li>
                 <button 
                   type="button"
                   onClick={onOpenPrivacyPolicy}
                   className="hover:text-blue-400 transition-colors text-left cursor-pointer flex items-center gap-1.5"
                 >
                   Política de Privacidade
                 </button>
               </li>
               <li>
                 <button 
                   type="button"
                   onClick={onOpenCookiePolicy}
                   className="hover:text-blue-400 transition-colors text-left cursor-pointer flex items-center gap-1.5"
                 >
                   Política de Cookies
                 </button>
               </li>
               <li>
                 <button 
                   type="button"
                   onClick={onOpenCookiePreferences}
                   className="text-xs text-slate-500 hover:text-slate-300 transition-colors text-left cursor-pointer"
                 >
                   Preferências de Cookies
                 </button>
               </li>
             </ul>
           </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-slate-800 text-sm text-slate-500">
          <div>© 2026 COBRA GAMES JR. Todos os direitos reservados.</div>
          <div className="flex flex-wrap gap-4 mt-4 md:mt-0 items-center justify-center">
            <button 
              type="button"
              onClick={onOpenTermsOfUse}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Termos de Uso
            </button>
            <span className="text-slate-700 hidden sm:inline">•</span>
            <button 
              type="button"
              onClick={onOpenPrivacyPolicy}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Política de Privacidade
            </button>
            <span className="text-slate-700 hidden sm:inline">•</span>
            <button 
              type="button"
              onClick={onOpenCookiePolicy}
              className="hover:text-slate-300 transition-colors cursor-pointer font-medium text-slate-400"
            >
              Política de Cookies
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default function App() {
  const [isCobraProMaxOpen, setIsCobraProMaxOpen] = useState(false);
  const [isTurboRushOpen, setIsTurboRushOpen] = useState(false);
  const [isDeskRacerOpen, setIsDeskRacerOpen] = useState(false);
  const [isCookiePolicyOpen, setIsCookiePolicyOpen] = useState(false);
  const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);
  const [isTermsOfUseOpen, setIsTermsOfUseOpen] = useState(false);
  const [isCookiePreferencesOpen, setIsCookiePreferencesOpen] = useState(false);

  // Allow direct access via URL hash or query param: #politica-privacidade, #privacidade, #politica-cookies
  React.useEffect(() => {
    const handleCheckHash = () => {
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      if (
        hash === '#termos-de-uso' || 
        hash === '#termos' || 
        hash === '#terms' ||
        search.includes('politica=termos')
      ) {
        setIsTermsOfUseOpen(true);
      } else if (
        hash === '#politica-privacidade' || 
        hash === '#privacidade' || 
        hash === '#privacy' ||
        search.includes('politica=privacidade')
      ) {
        setIsPrivacyPolicyOpen(true);
      } else if (
        hash === '#politica-cookies' || 
        hash === '#cookies' || 
        hash === '#politica_de_cookies' ||
        search.includes('politica=cookies')
      ) {
        setIsCookiePolicyOpen(true);
      }
    };

    handleCheckHash();
    window.addEventListener('hashchange', handleCheckHash);
    return () => window.removeEventListener('hashchange', handleCheckHash);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100">
      <Navbar />
      <main>
        <HeroAndStats />
        <FeaturedGames 
          onOpenCobraProMax={() => setIsCobraProMaxOpen(true)}
          onOpenTurboRush={() => setIsTurboRushOpen(true)} 
          onOpenDeskRacer={() => setIsDeskRacerOpen(true)} 
        />
      </main>
      <ContactAndFooter 
        onOpenCookiePolicy={() => setIsCookiePolicyOpen(true)}
        onOpenCookiePreferences={() => setIsCookiePreferencesOpen(true)}
        onOpenPrivacyPolicy={() => setIsPrivacyPolicyOpen(true)}
        onOpenTermsOfUse={() => setIsTermsOfUseOpen(true)}
      />
      
      {/* Cobra Pro Max Game Modal */}
      <CobraProMaxModal 
        isOpen={isCobraProMaxOpen} 
        onClose={() => setIsCobraProMaxOpen(false)} 
      />

      {/* Turbo Rush Game Modal */}
      <TurboRushModal 
        isOpen={isTurboRushOpen} 
        onClose={() => setIsTurboRushOpen(false)} 
      />

      {/* Desk Racer Game Modal */}
      <DeskRacerModal 
        isOpen={isDeskRacerOpen} 
        onClose={() => setIsDeskRacerOpen(false)} 
      />

      {/* Complete Cookie Policy Modal */}
      <CookiePolicyModal 
        isOpen={isCookiePolicyOpen}
        onClose={() => {
          setIsCookiePolicyOpen(false);
          if (window.location.hash === '#politica-cookies' || window.location.hash === '#cookies') {
            history.pushState('', document.title, window.location.pathname + window.location.search);
          }
        }}
        onOpenPreferences={() => setIsCookiePreferencesOpen(true)}
      />

      {/* Complete Privacy Policy Modal */}
      <PrivacyPolicyModal 
        isOpen={isPrivacyPolicyOpen}
        onClose={() => {
          setIsPrivacyPolicyOpen(false);
          if (window.location.hash === '#politica-privacidade' || window.location.hash === '#privacidade') {
            history.pushState('', document.title, window.location.pathname + window.location.search);
          }
        }}
        onOpenCookiePolicy={() => {
          setIsPrivacyPolicyOpen(false);
          setIsCookiePolicyOpen(true);
        }}
      />

      {/* Complete Terms of Use Modal */}
      <TermsOfUseModal 
        isOpen={isTermsOfUseOpen}
        onClose={() => {
          setIsTermsOfUseOpen(false);
          if (window.location.hash === '#termos-de-uso' || window.location.hash === '#termos') {
            history.pushState('', document.title, window.location.pathname + window.location.search);
          }
        }}
        onOpenPrivacyPolicy={() => {
          setIsTermsOfUseOpen(false);
          setIsPrivacyPolicyOpen(true);
        }}
      />

      {/* Cookie Consent Banner and Preferences Modal */}
      <CookieConsentBanner 
        onOpenPolicy={() => setIsCookiePolicyOpen(true)}
        isPreferencesOpen={isCookiePreferencesOpen}
        setIsPreferencesOpen={setIsCookiePreferencesOpen}
      />
    </div>
  );
}
