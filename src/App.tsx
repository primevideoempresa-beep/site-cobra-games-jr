/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Menu, X, Download, MapPin, Mail, Gamepad2, Apple, PlaySquare, Play, ShieldCheck, Wrench, AlertTriangle } from 'lucide-react';
import { Routes, Route, useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AnalyticsService } from './services/analytics';
import { AdminPage } from './pages/Admin/AdminPage';
import { AdminLoginPage } from './pages/Admin/AdminLoginPage';
import { GamePlayerPage } from './pages/GamePlayerPage';
import { BannerCarousel } from './components/BannerCarousel';
import { ToastNotification } from './components/ToastNotification';
import { CookiePolicyModal } from './components/CookiePolicyModal';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { TermsOfUseModal } from './components/TermsOfUseModal';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from './lib/firebase';
import { ErrorBoundary } from './components/ErrorBoundary';
import { otherGames } from './data';

// Global error listener to capture non-React fatal errors with sensitive data sanitization
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const safeMsg = typeof event.message === 'string' 
      ? event.message.replace(/AIza[0-9A-Za-z-_]{35}/g, 'AIza••••').replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[PROTEGIDO]')
      : 'Erro de execução';
    (window as any).lastGlobalError = {
      message: safeMsg
    };
  });

  window.addEventListener('unhandledrejection', (event) => {
    const rawReason = event.reason?.message || String(event.reason);
    const safeReason = typeof rawReason === 'string' 
      ? rawReason.replace(/AIza[0-9A-Za-z-_]{35}/g, 'AIza••••').replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[PROTEGIDO]')
      : 'Rejeição assíncrona';
    (window as any).lastPromiseError = {
      reason: safeReason
    };
  });
}

const wormIcon = "/assets/aistudio/icone_d2367d66.webp";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Close mobile menu on Esc key or resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <nav className="fixed top-0 w-full bg-blue-900/95 backdrop-blur-md z-50 border-b border-blue-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
        <a href="#" className="text-white font-black text-base sm:text-xl tracking-tight flex items-center gap-2 sm:gap-2.5 group shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-white rounded-xl shadow-md flex items-center justify-center transition-transform group-hover:scale-105 border border-slate-100 shrink-0">
            <svg viewBox="0 0 32 32" className="w-6 h-6 sm:w-7 sm:h-7" fill="none" xmlns="http://www.w3.org/2000/svg">
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
              <circle cx="23.5" cy="11.8" r="1.3" fill="#FACC15" />
              <circle cx="25.8" cy="14.1" r="1.3" fill="#EF4444" />
              <circle cx="23.5" cy="16.4" r="1.3" fill="#22C55E" />
              <circle cx="21.2" cy="14.1" r="1.3" fill="#3B82F6" />

              {/* Joysticks / Analog Sticks */}
              <circle cx="12" cy="19.2" r="2.1" fill="#0F172A" stroke="#38BDF8" strokeWidth="0.9" />
              <circle cx="20" cy="19.2" r="2.1" fill="#0F172A" stroke="#F0ABFC" strokeWidth="0.9" />

              {/* Center Home LED */}
              <circle cx="16" cy="12.5" r="1" fill="#38BDF8" />
            </svg>
          </div>
          <span className="truncate">COBRA GAMES JR</span>
        </a>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8">
          <a href="#destaques" className="text-cyan-300 hover:text-white font-medium transition-colors text-sm lg:text-base">Destaques</a>
          <a href="#principais" className="text-blue-100 hover:text-white font-medium transition-colors text-sm lg:text-base">Principais</a>
          <a href="#jogos" className="text-blue-100 hover:text-white font-medium transition-colors text-sm lg:text-base">Jogos</a>

          <AdminButton />
          <a href="#contatos" className="bg-white hover:bg-blue-50 text-blue-900 rounded-full px-5 py-2.5 font-bold transition-colors text-sm lg:text-base">
            Entre em contato
          </a>
        </div>

        {/* Mobile Toggle */}
        <button 
          type="button"
          aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
          className="md:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-white rounded-xl hover:bg-blue-800 transition-colors cursor-pointer"
          onClick={() => setIsOpen(prev => !prev)}
        >
          <span key={isOpen ? 'close-icon' : 'menu-icon'} className="inline-flex items-center justify-center">
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </span>
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="md:hidden border-t border-blue-800 bg-blue-900/98 backdrop-blur-lg px-5 py-5 space-y-3 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <a href="#destaques" onClick={() => setIsOpen(false)} className="flex items-center h-11 px-3 rounded-xl text-cyan-300 hover:bg-blue-800 font-semibold text-base transition-colors">Destaques</a>
          <a href="#jogos" onClick={() => setIsOpen(false)} className="flex items-center h-11 px-3 rounded-xl text-white hover:bg-blue-800 font-semibold text-base transition-colors">Jogos</a>
          <a href="#contatos" onClick={() => setIsOpen(false)} className="flex items-center h-11 px-3 rounded-xl text-white hover:bg-blue-800 font-semibold text-base transition-colors">Contatos</a>
          <div className="px-3 pt-1">
            <AdminButton />
          </div>
          <a href="#contatos" onClick={() => setIsOpen(false)} className="block mt-3 text-center bg-white text-blue-900 rounded-full px-5 py-3 font-bold text-base shadow-md active:scale-95 transition-transform">
            Entre em contato
          </a>
        </div>
      )}
    </nav>
  );
};

const AdminButton = () => {
  const { isAdmin } = useAuth();
  if (!isAdmin) return null;
  return (
    <Link to="/admin" className="flex items-center gap-2 text-orange-400 hover:text-orange-300 font-bold transition-colors">
      <ShieldCheck className="w-5 h-5" />
      <span>ADMIN</span>
    </Link>
  );
};

const HeroAndStats = ({ onNavigateToCategory }: { onNavigateToCategory?: (category?: string) => void }) => (
  <div className="bg-blue-900 pt-16 sm:pt-20">
    <section className="pt-10 sm:pt-14 md:pt-16 pb-8 sm:pb-10 px-4 sm:px-6 max-w-6xl mx-auto text-center">
      <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white mb-3 sm:mb-4 leading-[1.12] break-words text-balance">
        <span>Jogos para celular que o </span><span className="text-blue-400">mundo inteiro joga</span>
      </h1>
      <p className="text-xs xs:text-sm sm:text-base md:text-lg text-blue-100 mb-5 sm:mb-8 max-w-2xl mx-auto leading-relaxed px-1">
        A COBRA GAMES JR é uma editora de jogos casuais para dispositivos móveis, sediada no Brasil. De cobras famintas a corridas de supercarros 3D, nossos jogos conquistam milhões de jogadores em todo o mundo.
      </p>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 mb-2 max-w-md sm:max-w-none mx-auto w-full sm:w-auto">
        <a href="#jogos" className="bg-white hover:bg-blue-50 text-blue-900 rounded-full px-6 sm:px-8 py-2.5 sm:py-3 font-extrabold transition-all shadow-xl hover:shadow-2xl text-sm sm:text-base hover:scale-105 active:scale-95 text-center flex items-center justify-center min-h-[44px]">
          Explore nossos jogos
        </a>
        <a href="#destaques" className="bg-blue-800/80 hover:bg-blue-700/80 border border-blue-500/40 text-cyan-300 hover:text-white rounded-full px-5 sm:px-6 py-2.5 sm:py-3 font-bold transition-all text-sm sm:text-base hover:scale-105 active:scale-95 text-center flex items-center justify-center min-h-[44px]">
          Ver Destaques
        </a>
      </div>
    </section>

    {/* Gamer Neon Carousel Showcase */}
    <div id="destaques" className="w-full pb-6 sm:pb-8">
      <BannerCarousel onNavigateToCategory={onNavigateToCategory} />
    </div>

    <section className="py-8 sm:py-10 border-t border-blue-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-blue-800/50">
        <div className="py-3">
          <div className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-1 font-mono tabular-nums">10B +</div>
          <div className="text-blue-200 font-medium text-xs sm:text-sm">downloads combinados em todo o nosso portfólio</div>
        </div>
        <div className="py-3">
          <div className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-1 font-mono tabular-nums">200 +</div>
          <div className="text-blue-200 font-medium text-xs sm:text-sm">títulos publicados na App Store e no Google Play</div>
        </div>
        <div className="py-3">
          <div className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-1 font-mono tabular-nums">500M +</div>
          <div className="text-blue-200 font-medium text-xs sm:text-sm max-w-xs mx-auto">downloads dos nossos maiores sucessos globais</div>
        </div>
      </div>
    </section>
  </div>
);



interface OtherGamesProps {
  activeCategory?: string;
  setActiveCategory?: (category: string) => void;
}

const OtherGames: React.FC<OtherGamesProps> = ({ 
  activeCategory: propActiveCategory, 
  setActiveCategory: propSetActiveCategory,
}) => {
  const navigate = useNavigate();
  const [games, setGames] = useState<any[]>(otherGames);
  const [loading, setLoading] = useState(false);
  const [internalCategory, setInternalCategory] = useState('Todos');
  const activeCategory = propActiveCategory ?? internalCategory;
  const setActiveCategory = propSetActiveCategory ?? setInternalCategory;
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    try {
      const q = query(collection(db, 'games'), orderBy('order', 'asc'));
      const unsub = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          const remoteGames = snap.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              // Fallback for iframeUrl if title contains cobra and iframeUrl is empty
              iframeUrl: data.iframeUrl || (data.title?.toLowerCase().includes('cobra') ? '/cobra-pro-max.html' : '')
            };
          });
          setGames(remoteGames);
        } else {
          setGames(otherGames);
        }
        setLoading(false);
      }, (err) => {
        console.warn('Error fetching Firestore games, using local catalog:', err);
        setGames(otherGames);
        setLoading(false);
      });
      return unsub;
    } catch (err) {
      console.warn('Failed to setup games listener:', err);
      setLoading(false);
    }
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(['Todos']);
    games.forEach(g => {
      if (g && g.category) cats.add(g.category);
    });
    return Array.from(cats);
  }, [games]);
  
  const filteredGames = games.filter(game => {
    if (!game) return false;
    const matchesCategory = activeCategory === 'Todos' || game.category === activeCategory;
    const titleStr = String(game.title || '');
    const matchesSearch = titleStr.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handlePlayGame = (game: any) => {
    if (game?.id) {
      navigate(`/game/${game.id}`);
    }
  };

  const handleStoreClick = (game: any, store: 'play' | 'apple') => {
    const titleStr = String(game?.title || 'game');
    const url = store === 'play' ? game?.playStoreUrl : game?.appStoreUrl;
    if (url) {
      try {
        window.open(url, '_blank', 'noopener,noreferrer');
      } catch (e) {
        console.warn('Could not open store url:', e);
      }
    } else {
      const query = encodeURIComponent(titleStr);
      const searchUrl = store === 'play' 
        ? `https://play.google.com/store/search?q=${query}&c=apps`
        : `https://apps.apple.com/search?term=${query}`;
      try {
        window.open(searchUrl, '_blank', 'noopener,noreferrer');
      } catch (e) {
        console.warn('Could not open search url:', e);
      }
    }
    try {
      const slug = String(game?.id || titleStr).replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase();
      AnalyticsService.trackGameClick(`${slug}_${store}store`);
    } catch (e) {
      console.warn('Track game click error:', e);
    }
  };

  if (loading && games.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Sincronizando Catálogo...</p>
      </div>
    );
  }

  return (
    <section id="jogos" className="py-14 sm:py-20 md:py-24 px-4 sm:px-6 max-w-7xl mx-auto border-t border-slate-100">
      <div className="mb-8 sm:mb-12 md:flex items-end justify-between">
        <div className="max-w-2xl">
          <h2 className="text-blue-600 font-bold tracking-wide uppercase text-xs sm:text-sm mb-2 sm:mb-3">Nossos Jogos</h2>
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 sm:mb-4">Explore nossa coleção completa.</h3>
          <p className="text-sm sm:text-base md:text-lg text-slate-500">
            Uma seleção dos nossos títulos de maior sucesso. Encontre o catálogo completo nas nossas páginas de desenvolvedor na Google Play e na App Store.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
        <input
          type="text"
          placeholder="Pesquisar jogos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:flex-1 px-4 py-2.5 sm:py-3 rounded-full border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
        />
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar touch-pan-x">
          {categories.map((category, catIdx) => (
            <button
              type="button"
              key={`cat-${String(category)}-${catIdx}`}
              onClick={() => setActiveCategory(category)}
              className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all whitespace-nowrap min-h-[40px] shrink-0 cursor-pointer ${
                activeCategory === category 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{category}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredGames.length > 0 ? (
          filteredGames.map((game, idx) => (
            <div 
              key={game.id ? String(game.id) : `game-fallback-${idx}`} 
              className="group p-4 sm:p-5 rounded-2xl border border-slate-100 hover:border-blue-100 hover:shadow-lg hover:shadow-blue-50/50 transition-all duration-300 bg-white flex flex-col gap-4"
            >
              <div className="flex items-start gap-3.5 sm:gap-4">
                <div className="relative w-12 h-12 sm:w-14 sm:h-14 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors overflow-hidden">
                  {game.image ? (
                    <img src={game.image} alt={game.title} className="w-full h-full object-cover" />
                  ) : (
                    <Gamepad2 className="w-6 h-6 sm:w-7 sm:h-7" />
                  )}
                  {game.isUnderMaintenance && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center text-amber-300" title="Jogo em Manutenção">
                      <Wrench className="w-5 h-5 animate-pulse" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base mb-1 truncate flex items-center gap-1.5">
                    <span className="truncate">{game.title}</span>
                  </h4>
                  <div className="text-xs sm:text-sm text-slate-500 font-medium mb-1 truncate">{game.stats}</div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md inline-block">{game.category}</span>
                    {game.isUnderMaintenance && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300/60 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                        <Wrench className="w-2.5 h-2.5 text-amber-600" /> <span>Em Manutenção</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {game.isUnderMaintenance && (
                <div className="bg-amber-50/90 border border-amber-200/80 rounded-xl p-2.5 flex items-start gap-2 text-xs text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="line-clamp-2 leading-tight">
                    {game.maintenanceMessage || 'Este jogo está em manutenção temporária para melhorias. Voltaremos em breve!'}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3 mt-auto">
                {game.isUnderMaintenance ? (
                  <button
                    key="btn-maintenance"
                    type="button"
                    onClick={() => handlePlayGame(game)}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-2.5 font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-sm shadow-sm shadow-amber-500/20 cursor-pointer"
                    title="Jogo em manutenção. Clique para ver detalhes."
                  >
                    <Wrench className="w-4 h-4 shrink-0" />
                    <span>Em Manutenção</span>
                  </button>
                ) : (
                  <button
                    key="btn-play"
                    type="button"
                    onClick={() => handlePlayGame(game)}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2.5 font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-sm shadow-sm cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current shrink-0" />
                    <span>Jogar Agora</span>
                  </button>
                )}
                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => handleStoreClick(game, 'play')}
                    className="text-[10px] sm:text-xs font-bold text-slate-400 hover:text-slate-900 cursor-pointer flex items-center gap-1 transition-colors bg-transparent border-0 p-0"
                  >
                    <PlaySquare className="w-3 h-3 shrink-0"/>
                    <span>Google Play</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStoreClick(game, 'apple')}
                    className="text-[10px] sm:text-xs font-bold text-slate-400 hover:text-slate-900 cursor-pointer flex items-center gap-1 transition-colors bg-transparent border-0 p-0"
                  >
                    <Apple className="w-3 h-3 shrink-0"/>
                    <span>App Store</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p key="no-games-found" className="text-center text-slate-500 py-10 col-span-full text-sm sm:text-base">Nenhum jogo encontrado para esta pesquisa.</p>
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
  const submitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
    };
  }, []);

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
      if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
      submitTimerRef.current = setTimeout(() => {
        setIsSubmitted(false);
        setFormData({ name: '', email: '', message: '' });
      }, 3000);
    }
  };

  return (
    <footer id="contatos" className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 mb-12 sm:mb-16 border-b border-slate-800 pb-12 sm:pb-16">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">Contatos</h2>
            <p className="text-sm sm:text-base md:text-lg text-slate-400 mb-6 sm:mb-8 max-w-md leading-relaxed">
              Se tiver alguma dúvida sobre nossos jogos, parcerias ou qualquer outro assunto, entre em contato conosco.
            </p>
            <div className="space-y-5 sm:space-y-6">
              <div className="flex items-start gap-3.5 sm:gap-4">
                <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 shrink-0 mt-1" />
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-medium text-slate-500 mb-0.5">E-mail</div>
                  <a href="mailto:primevideoempresa@gmail.com" className="text-white hover:text-blue-400 font-medium text-sm sm:text-lg transition-colors break-all">primevideoempresa@gmail.com</a>
                </div>
              </div>
              <div className="flex items-start gap-3.5 sm:gap-4">
                <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 shrink-0 mt-1" />
                <div>
                  <div className="text-xs sm:text-sm font-medium text-slate-500 mb-0.5">Escritório</div>
                  <address className="text-slate-300 not-italic leading-relaxed text-sm sm:text-base">
                    COBRA GAMES JR LLC<br />
                    Aldeia nº 24<br />
                    Edifício: 17<br />
                    Brasil
                  </address>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-700/50">
             <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">Envie uma mensagem</h3>
             {isSubmitted ? (
               <div className="bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl p-5 sm:p-6 text-center">
                 <h4 className="font-bold text-base sm:text-lg mb-1 sm:mb-2">Mensagem enviada!</h4>
                 <p className="text-sm">Obrigado pelo contato. Retornaremos em breve.</p>
               </div>
             ) : (
               <form className="space-y-3.5 sm:space-y-4" onSubmit={handleSubmit}>
                 <div>
                   <input 
                     type="text" 
                     placeholder="Seu nome" 
                     value={formData.name}
                     onChange={(e) => setFormData({...formData, name: e.target.value})}
                     className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-base text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" 
                   />
                 </div>
                 <div>
                   <input 
                     type="email" 
                     placeholder="Seu e-mail" 
                     value={formData.email}
                     onChange={(e) => setFormData({...formData, email: e.target.value})}
                     className={`w-full bg-slate-900 border ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-700 focus:border-blue-500 focus:ring-blue-500'} rounded-xl px-4 py-3 text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 transition-all`} 
                   />
                   {errors.email && <p className="text-red-400 text-xs sm:text-sm mt-1">{errors.email}</p>}
                 </div>
                 <div>
                   <textarea 
                     placeholder="Sua mensagem" 
                     rows={4} 
                     value={formData.message}
                     onChange={(e) => setFormData({...formData, message: e.target.value})}
                     className={`w-full bg-slate-900 border ${errors.message ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-700 focus:border-blue-500 focus:ring-blue-500'} rounded-xl px-4 py-3 text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 transition-all`}
                   ></textarea>
                   {errors.message && <p className="text-red-400 text-xs sm:text-sm mt-1">{errors.message}</p>}
                 </div>
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-3.5 font-bold transition-all min-h-[48px] active:scale-[0.98] cursor-pointer">
                    <span>Enviar Mensagem</span>
                  </button>
                </form>
              )}
           </div>
         </div>

         <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-12 sm:mb-16">
            <div className="col-span-2 md:col-span-1">
              <div className="text-white font-black text-lg sm:text-xl tracking-tight mb-4 sm:mb-6 flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                  <Gamepad2 className="w-5 h-5 text-white" />
                </div>
                COBRA GAMES JR
              </div>
              <div className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                Jogos para celular que o mundo inteiro joga.
              </div>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm sm:text-base mb-3 sm:mb-4">Nossos jogos</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-400">
                <li><a href="https://play.google.com/store/apps/details?id=com.aistudio.cobrapromax.game&pcampaignid=web_share" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors inline-block py-1">Google Play</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm sm:text-base mb-3 sm:mb-4">Empresa</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-400">
                <li><a href="#contatos" className="hover:text-blue-400 transition-colors inline-block py-1">Contatos</a></li>
                <li><Link to="/admin/login" className="hover:text-orange-400 transition-colors opacity-60 hover:opacity-100 inline-block py-1">Painel do Proprietário</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm sm:text-base mb-3 sm:mb-4">Jurídico</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-400">
                <li>
                  <button 
                    type="button"
                    onClick={onOpenTermsOfUse}
                    className="hover:text-blue-400 transition-colors text-left cursor-pointer flex items-center gap-1.5 py-1"
                  >
                    <span>Termos de Uso</span>
                  </button>
                </li>
                <li>
                  <button 
                    type="button"
                    onClick={onOpenPrivacyPolicy}
                    className="hover:text-blue-400 transition-colors text-left cursor-pointer flex items-center gap-1.5 py-1"
                  >
                    <span>Política de Privacidade</span>
                  </button>
                </li>
                <li>
                  <button 
                    type="button"
                    onClick={onOpenCookiePolicy}
                    className="hover:text-blue-400 transition-colors text-left cursor-pointer flex items-center gap-1.5 py-1"
                  >
                    <span>Política de Cookies</span>
                  </button>
                </li>
                <li>
                  <button 
                    type="button"
                    onClick={onOpenCookiePreferences}
                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors text-left cursor-pointer py-1"
                  >
                    <span>Preferências de Cookies</span>
                  </button>
                </li>
              </ul>
            </div>
         </div>

         <div className="flex flex-col md:flex-row items-center justify-between pt-6 sm:pt-8 border-t border-slate-800 text-xs sm:text-sm text-slate-500 gap-4 text-center md:text-left">
           <div>© 2026 COBRA GAMES JR. Todos os direitos reservados.</div>
           <div className="flex flex-wrap gap-3 sm:gap-4 items-center justify-center">
             <button 
               type="button"
               onClick={onOpenTermsOfUse}
               className="hover:text-slate-300 transition-colors cursor-pointer py-1"
             >
               <span>Termos de Uso</span>
             </button>
             <span className="text-slate-700 hidden sm:inline">•</span>
             <button 
               type="button"
               onClick={onOpenPrivacyPolicy}
               className="hover:text-slate-300 transition-colors cursor-pointer py-1"
             >
               <span>Política de Privacidade</span>
             </button>
             <span className="text-slate-700 hidden sm:inline">•</span>
             <button 
               type="button"
               onClick={onOpenCookiePolicy}
               className="hover:text-slate-300 transition-colors cursor-pointer font-medium text-slate-400 py-1"
             >
               <span>Política de Cookies</span>
             </button>
           </div>
         </div>
      </div>
    </footer>
  );
};

// Route Guard declarativo para proteção estrita do Painel do Proprietário
const ProtectedAdminRoute = () => {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <AdminPage />;
};

export default function App() {
  const location = useLocation();

  useEffect(() => {
    AnalyticsService.trackPageView(location.pathname);
  }, [location.pathname]);

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game/:gameId" element={<GamePlayerPage />} />
        <Route path="/admin" element={<ProtectedAdminRoute />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
      </Routes>
      <ToastNotification />
    </ErrorBoundary>
  );
}

function Home() {
  const [isCookiePolicyOpen, setIsCookiePolicyOpen] = useState(false);
  const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);
  const [isTermsOfUseOpen, setIsTermsOfUseOpen] = useState(false);
  const [isCookiePreferencesOpen, setIsCookiePreferencesOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  const handleNavigateToCategory = (catName?: string) => {
    if (catName) {
      setSelectedCategory(catName);
    }
    const el = document.getElementById('jogos');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
        <HeroAndStats onNavigateToCategory={handleNavigateToCategory} />
        <OtherGames 
          activeCategory={selectedCategory} 
          setActiveCategory={setSelectedCategory} 
        />
      </main>


      <ContactAndFooter 
        onOpenCookiePolicy={() => setIsCookiePolicyOpen(true)}
        onOpenCookiePreferences={() => setIsCookiePreferencesOpen(true)}
        onOpenPrivacyPolicy={() => setIsPrivacyPolicyOpen(true)}
        onOpenTermsOfUse={() => setIsTermsOfUseOpen(true)}
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
