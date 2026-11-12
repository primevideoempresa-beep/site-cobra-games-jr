import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Flame, LayoutGrid, ArrowRight, Play } from 'lucide-react';

import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface BannerItem {
  id: string;
  badge: string;
  badgeColor: string;
  badgeIcon: 'sparkles' | 'flame' | 'grid';
  title: string;
  highlight: string;
  description: string;
  imageUrl: string;
  targetId: string;
  ctaText: string;
  category: string;
  active?: boolean;
  order?: number;
}

interface BannerCarouselProps {
  onNavigateToCategory?: (categoryName?: string) => void;
}

const DEFAULT_BANNERS: BannerItem[] = [
  {
    id: 'default-lancamentos',
    badge: 'Lançamento',
    badgeColor: 'blue',
    badgeIcon: 'sparkles',
    title: 'Lançamento',
    highlight: 'Cobra Pro Max',
    description: 'A cobra mais veloz e divertida da web com modos arcade e desafios diários.',
    imageUrl: '/banners/lancamentos.png',
    targetId: 'jogos',
    ctaText: 'Jogar Agora',
    category: 'Ação',
    active: true,
    order: 0,
  },
  {
    id: 'default-categorias',
    badge: 'Categorias',
    badgeColor: 'purple',
    badgeIcon: 'grid',
    title: 'Categorias',
    highlight: 'Explorar Catálogo',
    description: 'Jogos casuais, de corrida e ação jogados no mundo inteiro.',
    imageUrl: '/banners/categorias.png',
    targetId: 'categorias',
    ctaText: 'Ver Coleção',
    category: 'Todos',
    active: true,
    order: 1,
  },
  {
    id: 'default-novidades',
    badge: 'Novidade',
    badgeColor: 'amber',
    badgeIcon: 'flame',
    title: 'Novidade',
    highlight: 'Cobra Pro Max',
    description: 'A cobra mais veloz e divertida da web com arenas multiplayer.',
    imageUrl: '/banners/novidades.png',
    targetId: 'jogos',
    ctaText: 'Jogar Agora',
    category: 'Ação',
    active: true,
    order: 2,
  },
];

export const BannerCarousel: React.FC<BannerCarouselProps> = ({ onNavigateToCategory }) => {
  const [banners, setBanners] = useState<BannerItem[]>(DEFAULT_BANNERS);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragCurrentX, setDragCurrentX] = useState(0);
  const [hasDraggedEnough, setHasDraggedEnough] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const autoplayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dragResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (dragResetTimerRef.current) clearTimeout(dragResetTimerRef.current);
    };
  }, []);

  useEffect(() => {
    try {
      const q = query(
        collection(db, 'banners'),
        where('active', '==', true),
        orderBy('order', 'asc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const bannerData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as BannerItem[];
          setBanners(bannerData);
        }
        setLoading(false);
      }, (error) => {
        console.warn("Using default banners (Firestore query info):", error);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.warn("Could not attach banner listener, using defaults:", err);
      setLoading(false);
    }
  }, []);

  const totalBanners = banners.length;

  // Keep currentIndex within bounds when Firestore updates banner list
  useEffect(() => {
    if (totalBanners > 0 && currentIndex >= totalBanners) {
      setCurrentIndex(0);
    }
  }, [totalBanners, currentIndex]);

  const nextSlide = useCallback(() => {
    if (totalBanners === 0) return;
    setCurrentIndex((prev) => (prev + 1) % totalBanners);
  }, [totalBanners]);

  const prevSlide = useCallback(() => {
    if (totalBanners === 0) return;
    setCurrentIndex((prev) => (prev - 1 + totalBanners) % totalBanners);
  }, [totalBanners]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Autoplay effect (5 seconds)
  useEffect(() => {
    if (isPaused || isDragging || totalBanners <= 1) {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
      }
      return;
    }

    autoplayTimerRef.current = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
      }
    };
  }, [currentIndex, isPaused, isDragging, nextSlide, totalBanners]);

  // Touch & Drag Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    setIsDragging(true);
    setDragStartX(e.touches[0].clientX);
    setDragCurrentX(e.touches[0].clientX);
    setHasDraggedEnough(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    setDragCurrentX(currentX);
    if (Math.abs(currentX - dragStartX) > 12) {
      setHasDraggedEnough(true);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    const diff = dragCurrentX - dragStartX;
    const threshold = 50; // pixels to trigger slide switch

    if (diff > threshold) {
      prevSlide();
    } else if (diff < -threshold) {
      nextSlide();
    }

    setIsDragging(false);
    setDragStartX(0);
    setDragCurrentX(0);
    if (dragResetTimerRef.current) clearTimeout(dragResetTimerRef.current);
    dragResetTimerRef.current = setTimeout(() => {
      setHasDraggedEnough(false);
      setIsPaused(false);
    }, 250);
  };

  // Mouse Drag Handlers (allows desktop drag too!)
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only left click
    if (e.button !== 0) return;
    setIsPaused(true);
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragCurrentX(e.clientX);
    setHasDraggedEnough(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const currentX = e.clientX;
    setDragCurrentX(currentX);
    if (Math.abs(currentX - dragStartX) > 12) {
      setHasDraggedEnough(true);
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    const diff = dragCurrentX - dragStartX;
    const threshold = 60;

    if (diff > threshold) {
      prevSlide();
    } else if (diff < -threshold) {
      nextSlide();
    }

    setIsDragging(false);
    setDragStartX(0);
    setDragCurrentX(0);
    if (dragResetTimerRef.current) clearTimeout(dragResetTimerRef.current);
    dragResetTimerRef.current = setTimeout(() => {
      setHasDraggedEnough(false);
      setIsPaused(false);
    }, 250);
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleMouseUp();
    }
    setIsPaused(false);
  };

  // Navigation click handling
  const handleBannerClick = (banner: BannerItem, e: React.MouseEvent) => {
    if (hasDraggedEnough) {
      e.preventDefault();
      return;
    }

    if (banner.targetId === 'categorias' && onNavigateToCategory) {
      onNavigateToCategory('Todos');
    }

    const targetElement = document.getElementById(banner.targetId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      prevSlide();
    } else if (e.key === 'ArrowRight') {
      nextSlide();
    }
  };

  // Calculate current drag offset in pixels
  const dragOffset = isDragging ? dragCurrentX - dragStartX : 0;

  if (loading) {
    return (
      <section className="relative w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="w-full aspect-[1774/296] min-h-[160px] bg-zinc-900 animate-pulse rounded-3xl border border-zinc-800 flex items-center justify-center">
           <span className="text-zinc-700 text-xs font-black tracking-widest uppercase">Carregando Destaques...</span>
        </div>
      </section>
    );
  }

  if (banners.length === 0) return null;

  return (
    <section 
      id="carrossel-destaques"
      aria-label="Carrossel de Banners Gamer"
      className="relative w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Outer Gaming Frame with Neon Glow */}
      <div 
        className="relative rounded-2xl sm:rounded-3xl overflow-hidden p-[2px] bg-gradient-to-r from-blue-600/70 via-cyan-400/80 to-purple-600/70 shadow-[0_0_35px_rgba(37,99,235,0.25)] hover:shadow-[0_0_50px_rgba(6,182,212,0.4)] transition-all duration-500 group/carousel"
      >
        {/* Carousel Inner Container */}
        <div 
          ref={containerRef}
          className="relative w-full overflow-hidden rounded-[14px] sm:rounded-[22px] bg-slate-950 select-none cursor-pointer"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ touchAction: 'pan-y' }}
        >
          {/* Slides Track */}
          <div 
            className="flex w-full"
            style={{
              transform: `translateX(calc(-${currentIndex * 100}% + ${dragOffset}px))`,
              transition: isDragging ? 'none' : 'transform 600ms cubic-bezier(0.2, 0.9, 0.3, 1)',
            }}
          >
            {banners.map((banner, index) => (
              <div
                key={banner.id || `banner-slide-${index}`}
                className="w-full flex-shrink-0 relative group/slide"
                aria-hidden={index !== currentIndex}
                onClick={(e) => handleBannerClick(banner, e)}
                title={`Clique para navegar para ${banner.category}`}
              >
                {/* Responsive Aspect Ratio without distorting the 1774x296 panoramic graphic */}
                <div className="relative w-full aspect-[1774/296] min-h-[110px] xs:min-h-[135px] sm:min-h-[160px] md:min-h-[200px] lg:min-h-[230px] overflow-hidden bg-slate-950 flex items-center justify-center">
                  {/* High Quality Banner Image */}
                  <img
                    src={banner.imageUrl}
                    alt={banner.title}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    draggable={false}
                    className="w-full h-full object-cover sm:object-contain object-center transform transition-transform duration-700 ease-out group-hover/slide:scale-[1.01]"
                  />

                  {/* Corner Sci-Fi Tech Accents */}
                  <div className="absolute top-2 left-2 sm:top-3 sm:left-3 w-3.5 h-3.5 sm:w-6 sm:h-6 border-t-2 border-l-2 border-cyan-400/70 pointer-events-none" />
                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3 w-3.5 h-3.5 sm:w-6 sm:h-6 border-t-2 border-r-2 border-cyan-400/70 pointer-events-none" />
                  <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 w-3.5 h-3.5 sm:w-6 sm:h-6 border-b-2 border-l-2 border-cyan-400/70 pointer-events-none" />
                  <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 w-3.5 h-3.5 sm:w-6 sm:h-6 border-b-2 border-r-2 border-cyan-400/70 pointer-events-none" />

                  {/* Subtle Action Hover Hint */}
                  <div className="absolute bottom-2 right-3 sm:bottom-3 sm:right-4 z-10 opacity-0 group-hover/slide:opacity-100 transition-opacity duration-300 pointer-events-none hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/80 border border-cyan-400/60 text-xs font-bold text-cyan-300 backdrop-blur-md shadow-lg">
                    <span>{banner.ctaText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Left Arrow Button */}
          {banners.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Banner anterior"
                onClick={(e) => {
                  e.stopPropagation();
                  prevSlide();
                }}
                className="absolute left-1.5 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-cyan-500/40 hover:border-cyan-400 text-white flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] backdrop-blur-md hover:scale-110 active:scale-95 cursor-pointer touch-manipulation"
              >
                <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6 text-cyan-300" />
              </button>

              <button
                type="button"
                aria-label="Próximo banner"
                onClick={(e) => {
                  e.stopPropagation();
                  nextSlide();
                }}
                className="absolute right-1.5 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-cyan-500/40 hover:border-cyan-400 text-white flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] backdrop-blur-md hover:scale-110 active:scale-95 cursor-pointer touch-manipulation"
              >
                <ChevronRight className="w-4 h-4 sm:w-6 sm:h-6 text-cyan-300" />
              </button>
            </>
          )}

          {/* Pause Status Indicator */}
          {isPaused && banners.length > 1 && (
            <div className="absolute top-2 right-3 sm:top-3 sm:right-4 z-20 px-2 py-0.5 rounded bg-slate-950/80 border border-amber-500/40 text-[9px] sm:text-[10px] font-bold text-amber-300 uppercase tracking-widest backdrop-blur-md pointer-events-none transition-opacity duration-300">
              Pausado
            </div>
          )}

          {/* Bottom Indicators & Autoplay Progress Bar */}
          {banners.length > 1 && (
            <div className="absolute bottom-2 sm:bottom-3 inset-x-0 z-20 flex flex-col items-center gap-1 pointer-events-auto">
              {/* Dots */}
              <div className="flex items-center gap-2 bg-slate-950/80 border border-cyan-500/30 px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg">
                {banners.map((banner, index) => {
                  const isActive = index === currentIndex;
                  return (
                    <button
                      key={banner.id || `banner-dot-${index}`}
                      type="button"
                      aria-label={`Ir para banner ${index + 1}: ${banner.title}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        goToSlide(index);
                      }}
                      className={`relative h-2 rounded-full transition-all duration-500 cursor-pointer overflow-hidden ${
                        isActive 
                          ? 'w-8 sm:w-10 bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.8)]' 
                          : 'w-2 bg-slate-600 hover:bg-slate-400'
                      }`}
                    >
                      <span
                        className={`absolute inset-0 bg-white/40 origin-left transition-opacity duration-300 ${
                          isActive && !isPaused ? 'opacity-100 animate-[progress_5s_linear]' : 'opacity-0'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
