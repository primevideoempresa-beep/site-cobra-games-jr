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
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const fetchGame = async () => {
      if (!gameId) return;
      
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
          // Fallback check against local otherGames
          const localGame = otherGames.find(g => g.id === gameId || (gameId === 'cobra-pro-max' && g.title.toLowerCase().includes('cobra')));
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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Carregando Jogo...</p>
    </div>
  );

  if (!game) return null;

  const handleRestart = () => {
    setIframeKey((prev) => prev + 1);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Jogue ${game.title} na COBRA GAMES JR`,
        text: `Confira este jogo incrível: ${game.title}`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copiado para a área de transferência!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header/Toolbar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between z-10 shadow-lg">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
            title="Voltar"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20 overflow-hidden">
              {game.image ? (
                <img src={game.image} alt={game.title} className="w-full h-full object-cover" />
              ) : (
                <Gamepad2 className="w-6 h-6" />
              )}
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold truncate max-w-[200px] md:max-w-md">{game.title}</h1>
                {game.isUnderMaintenance && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-bold">
                    <Wrench className="w-3.5 h-3.5 animate-pulse" /> Em Manutenção
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">{game.category} • {game.stats}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-3">
          {!game.isUnderMaintenance && game.iframeUrl && (
            <>
              <button
                onClick={handleRestart}
                className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                title="Reiniciar Jogo"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all hidden xs:flex"
                title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
            </>
          )}
          
          <button
            onClick={handleShare}
            className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
            title="Compartilhar"
          >
            <Share2 className="w-5 h-5" />
          </button>

          {game.playStoreUrl && (
            <a
              href={game.playStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20"
            >
              <Download className="w-4 h-4" />
              <span>Instalar</span>
            </a>
          )}
        </div>
      </header>

      {/* Main Game Area */}
      <main className={`flex-1 relative flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : ''}`}>
        {game.isUnderMaintenance ? (
          <div className="flex-1 flex items-center justify-center p-6 bg-slate-950">
            <div className="max-w-xl w-full bg-slate-900/90 border border-amber-500/30 rounded-3xl p-8 sm:p-10 text-center shadow-2xl shadow-amber-500/5 relative overflow-hidden">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/10">
                <Wrench className="w-10 h-10 sm:w-12 sm:h-12 animate-pulse" />
              </div>

              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider mb-3">
                <AlertTriangle className="w-3.5 h-3.5" />
                Aviso aos Jogadores
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">Jogo em Manutenção</h2>

              <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-4">
                {game.maintenanceMessage || 'Estamos realizando atualizações técnicas e melhorias neste jogo para garantir a melhor estabilidade e diversão.'}
              </p>

              <p className="text-xs sm:text-sm text-slate-500 mb-8">
                O acesso ao jogo via web foi suspenso temporariamente pela nossa equipe. Estaremos de volta com novidades em breve!
              </p>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-left mb-8 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-wider text-slate-500">Status dos Servidores</div>
                  <div className="text-sm font-bold text-amber-400 flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    Em manutenção programada
                  </div>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
                  title="Recarregar para verificar se a manutenção já terminou"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Verificar Novamente
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={() => navigate('/')}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                >
                  Explorar Outros Jogos
                </button>
                {game.playStoreUrl && (
                  <a 
                    href={game.playStoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white px-6 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border border-slate-700 active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    Google Play
                  </a>
                )}
              </div>
            </div>
          </div>
        ) : game.iframeUrl ? (
          <div className="flex-1 bg-black relative">
            <iframe
              key={iframeKey}
              ref={iframeRef}
              src={game.iframeUrl}
              title={game.title}
              className="w-full h-full border-0 shadow-2xl"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 bg-slate-950">
            <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
              <div className="w-24 h-24 bg-blue-600/10 text-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Gamepad2 className="w-12 h-12" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Aguardando Lançamento Web</h2>
              <p className="text-slate-400 mb-8 leading-relaxed">
                Este jogo está disponível atualmente apenas para dispositivos móveis. Você pode baixá-lo agora mesmo na Google Play ou App Store.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {game.playStoreUrl && (
                  <a 
                    href={game.playStoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all border border-slate-700"
                  >
                    <Download className="w-5 h-5" />
                    Google Play
                  </a>
                )}
                <button 
                  onClick={() => navigate('/')}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20"
                >
                  Explorar outros jogos
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game Info Details (Visible when not in fullscreen) */}
        {!isFullscreen && (
          <section className="bg-slate-900 border-t border-slate-800 py-10 px-4 md:px-8">
            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 text-blue-500 font-bold text-sm mb-2 uppercase tracking-wider">
                  <Trophy className="w-4 h-4" />
                  <span>Sobre o Jogo</span>
                </div>
                <h2 className="text-3xl font-black mb-4">{game.title}</h2>
                <p className="text-slate-400 text-lg leading-relaxed mb-6">
                  {game.stats}. {game.title} é um dos títulos de maior sucesso da COBRA GAMES JR, 
                  proporcionando uma experiência divertida e viciante para jogadores de todas as idades.
                </p>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                    <div className="text-slate-500 text-xs font-bold uppercase mb-1">Categoria</div>
                    <div className="text-white font-bold">{game.category}</div>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                    <div className="text-slate-500 text-xs font-bold uppercase mb-1">Desenvolvedora</div>
                    <div className="text-white font-bold">Cobra Games Jr</div>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                    <div className="text-slate-500 text-xs font-bold uppercase mb-1">Plataforma</div>
                    <div className="text-white font-bold">Web & Mobile</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-900/20 border border-blue-500/20 rounded-3xl p-6 h-fit">
                <h3 className="font-bold text-xl mb-4">Gostou do jogo?</h3>
                <p className="text-blue-100/70 text-sm mb-6">
                  Compartilhe com seus amigos ou jogue no seu celular para ter a melhor experiência!
                </p>
                <div className="space-y-3">
                  <button 
                    onClick={handleShare}
                    className="w-full bg-white text-blue-900 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    Convidar Amigos
                  </button>
                  {game.playStoreUrl && (
                    <a 
                      href={game.playStoreUrl}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors border border-slate-700"
                    >
                      <Download className="w-4 h-4" />
                      Baixar Agora
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      {!isFullscreen && (
        <footer className="bg-slate-950 border-t border-slate-900 py-6 text-center text-slate-500 text-xs">
          <p>© 2026 COBRA GAMES JR. Todos os direitos reservados.</p>
        </footer>
      )}
    </div>
  );
};
