import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  Gamepad2, 
  ExternalLink,
  Download,
  Trophy,
  Share2,
  Wrench,
  AlertTriangle
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AnalyticsService } from '../services/analytics';
import { otherGames } from '../data';
import { toast } from 'sonner';

export const GamePlayerPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isGameReady, setIsGameReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Heartbeat interval for session duration tracking
  useEffect(() => {
    if (!isGameReady || !gameId) return;

    const interval = setInterval(() => {
      // General heartbeat to track dwell time
      AnalyticsService.trackDeskRacerHeartbeat(30); 
    }, 30000);

    return () => clearInterval(interval);
  }, [isGameReady, gameId]);

  // Handle postMessage from games (Standard Bridge)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security: Only accept messages from our own iframe to prevent spoofing
      if (event.source !== iframeRef.current?.contentWindow) return;
      
      if (typeof event.data !== 'object' || !event.data.type || !String(event.data.type).startsWith('CG_')) return;

      const { type, data } = event.data;

      switch (type) {
        case 'CG_GAME_READY':
          setIsGameReady(true);
          setLoadingProgress(100);
          AnalyticsService.trackGameStart(gameId!, data);
          break;
        case 'CG_LOAD_PROGRESS':
          setLoadingProgress(Math.min(data.progress || 0, 99));
          break;
        case 'CG_GAME_OVER':
          AnalyticsService.trackGameFinish(gameId!, data);
          break;
        case 'CG_ERROR':
          setLoadError(data.message || 'Erro no motor do jogo');
          AnalyticsService.trackGameFailure(gameId!, data.message);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [gameId]);

  // Simulate progress for games without standard bridge
  useEffect(() => {
    if (loading || isGameReady || loadError) return;

    const timer = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 90) {
          clearInterval(timer);
          return 90;
        }
        return prev + Math.random() * 5;
      });
    }, 300);

    return () => clearInterval(timer);
  }, [loading, isGameReady, loadError]);

  useEffect(() => {
    const fetchGame = async () => {
      if (!gameId) return;
      
      setLoadError(null);
      setLoadingProgress(0);
      setIsGameReady(false);

      try {
        const gameDoc = await getDoc(doc(db, 'games', gameId));
        if (gameDoc.exists()) {
          const gameData = { id: gameDoc.id, ...gameDoc.data() } as any;
          if (!gameData.iframeUrl && (gameData.title?.toLowerCase().includes('cobra') || gameId === 'cobra-pro-max')) {
            gameData.iframeUrl = '/cobra-pro-max.html';
          }
          setGame(gameData);
          AnalyticsService.trackGameOpen(gameId);
        } else {
          const localGame = otherGames.find(g => g.id === gameId);
          if (localGame) {
            setGame(localGame);
            AnalyticsService.trackGameOpen(gameId);
          } else {
            navigate('/');
          }
        }
      } catch (err) {
        console.error('Error fetching game:', err);
        const localGame = otherGames.find(g => g.id === gameId);
        if (localGame) {
          setGame(localGame);
        } else {
          navigate('/');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [gameId, navigate]);

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6">
      <div className="relative">
        <div className="w-20 h-20 border-4 border-blue-600/20 rounded-3xl animate-[spin_3s_linear_infinite]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Gamepad2 className="w-8 h-8 text-blue-500 animate-pulse" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-white font-black uppercase tracking-[0.2em] text-sm mb-1">Cobra Games Jr</p>
        <p className="text-slate-500 font-bold text-[10px] uppercase">Inicializando Sistemas...</p>
      </div>
    </div>
  );

  if (!game) return null;

  const handleRestart = () => {
    setIframeKey(prev => prev + 1);
    setIsGameReady(false);
    setLoadingProgress(0);
    setLoadError(null);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Jogue ${game.title} na COBRA GAMES JR`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copiado!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      {/* Platform Toolbar */}
      <header className="bg-slate-900/50 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center overflow-hidden shrink-0 shadow-lg shadow-blue-600/20">
              {game.image ? <img src={game.image} alt="" className="w-full h-full object-cover" /> : <Gamepad2 className="w-6 h-6" />}
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold truncate max-w-[200px]">{game.title}</h1>
                {game.isUnderMaintenance && (
                  <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-[10px] font-black uppercase">Manutenção</span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-tighter">{game.category}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!game.isUnderMaintenance && (
            <>
              <button onClick={handleRestart} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Reiniciar">
                <RotateCcw className="w-5 h-5" />
              </button>
              <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all hidden xs:flex" title="Tela Cheia">
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
            </>
          )}
          <button onClick={handleShare} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Viewport */}
      <main className={`flex-1 relative flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : ''}`}>
        {game.isUnderMaintenance ? (
          <div className="flex-1 flex items-center justify-center p-6 bg-slate-950">
            <div className="max-w-md w-full bg-slate-900 border border-amber-500/20 rounded-[2.5rem] p-10 text-center shadow-2xl">
              <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Wrench className="w-10 h-10 animate-pulse" />
              </div>
              <h2 className="text-xl font-black text-white mb-3 uppercase tracking-tight">Jogo em Manutenção</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-8">
                {game.maintenanceMessage || 'Estamos realizando melhorias técnicas. Voltaremos em breve!'}
              </p>
              <button onClick={() => navigate('/')} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-sm transition-all active:scale-95 shadow-lg shadow-blue-600/20">
                Explorar Coleção
              </button>
            </div>
          </div>
        ) : game.iframeUrl ? (
          <div className="flex-1 bg-black relative">
            {/* Professional Loading Layer */}
            {!isGameReady && !loadError && (
              <div className="absolute inset-0 z-20 bg-slate-950 flex flex-col items-center justify-center p-6">
                <div className="max-w-sm w-full space-y-6">
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-bold text-white uppercase tracking-widest">Carregando Jogo</h3>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-tighter">Preparando ativos e texturas...</p>
                  </div>
                  <div className="relative w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${loadingProgress}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] font-black text-slate-700 uppercase">
                    <span>{Math.round(loadingProgress)}%</span>
                    <span>Ready to Play</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Layer */}
            {loadError && (
              <div className="absolute inset-0 z-30 bg-slate-950 flex flex-col items-center justify-center p-6">
                <div className="max-w-xs w-full text-center space-y-6">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
                  <h3 className="text-lg font-bold">Falha no Carregamento</h3>
                  <button onClick={handleRestart} className="w-full bg-white text-black py-4 rounded-2xl font-bold text-sm">Tentar Novamente</button>
                </div>
              </div>
            )}

            <iframe
              key={iframeKey}
              ref={iframeRef}
              src={game.iframeUrl}
              title={game.title}
              className={`w-full h-full border-0 transition-opacity duration-1000 ${isGameReady ? 'opacity-100' : 'opacity-0'}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              sandbox="allow-scripts allow-forms allow-popups allow-pointer-lock"
              allowFullScreen
              onLoad={() => {
                setTimeout(() => {
                  if (!isGameReady && !loadError) {
                    setIsGameReady(true);
                    setLoadingProgress(100);
                    AnalyticsService.trackGameStart(gameId!);
                  }
                }, 1500);
              }}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 bg-slate-950 text-center">
             <div className="max-w-md space-y-6">
                <Gamepad2 className="w-16 h-16 text-slate-800 mx-auto" />
                <h2 className="text-2xl font-black">Aguardando Lançamento Web</h2>
                <p className="text-slate-500 text-sm">Este título está otimizado para dispositivos móveis nativos no momento.</p>
                <button onClick={() => navigate('/')} className="px-8 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold border border-white/5 transition-all">Ver outros jogos</button>
             </div>
          </div>
        )}

        {!isFullscreen && (
          <div className="bg-slate-900/30 border-t border-white/5 p-8 shrink-0">
             <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between gap-8">
                <div className="space-y-4 max-w-xl">
                   <h2 className="text-2xl font-black">{game.title}</h2>
                   <p className="text-slate-400 text-sm leading-relaxed">{game.stats || 'Um jogo incrível da Cobra Games Jr.'}</p>
                   <div className="flex gap-4">
                      <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                         <p className="text-[10px] text-slate-500 uppercase font-bold">Categoria</p>
                         <p className="text-xs font-bold">{game.category}</p>
                      </div>
                      <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                         <p className="text-[10px] text-slate-500 uppercase font-bold">Plataforma</p>
                         <p className="text-xs font-bold">Web / Mobile</p>
                      </div>
                   </div>
                </div>
                {game.playStoreUrl && (
                  <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-3xl flex flex-col justify-center items-center gap-4 h-fit">
                     <p className="text-xs font-bold text-blue-400 uppercase tracking-widest text-center">Melhor experiência no celular</p>
                     <a href={game.playStoreUrl} target="_blank" rel="noopener noreferrer" className="bg-white text-blue-900 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 active:scale-95 transition-all">
                        <Download className="w-4 h-4" /> Instalar App
                     </a>
                  </div>
                )}
             </div>
          </div>
        )}
      </main>
      
      {!isFullscreen && (
        <footer className="bg-slate-950 p-4 text-center border-t border-white/5">
           <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">© 2026 Cobra Games Jr — Todos os direitos reservados</p>
        </footer>
      )}
    </div>
  );
};
