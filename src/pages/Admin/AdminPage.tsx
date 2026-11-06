import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sidebar } from '../../components/Admin/Sidebar';
import { 
  Users, 
  Eye, 
  Gamepad2, 
  TrendingUp, 
  Clock, 
  ArrowUpRight,
  ArrowDownRight,
  Menu,
  X
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  onSnapshot,
  Timestamp,
  limit
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { subDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast, Toaster } from 'sonner';
import { LoggerService } from '../../services/logger';
import { DeskRacerAnalytics } from './components/DeskRacerAnalytics';

// Lazy load heavy chart components
const DashboardCharts = lazy(() => import('./components/DashboardCharts'));

const StatCard = React.memo(({ title, value, icon: Icon, trend, trendValue }: any) => (
  <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-zinc-800 rounded-2xl">
        <Icon className="w-6 h-6 text-orange-500" />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-sm font-medium ${trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
          {trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          {trendValue}
        </div>
      )}
    </div>
    <div className="text-zinc-400 text-sm font-medium mb-1">{title}</div>
    <div className="text-3xl font-black text-white">{value}</div>
  </div>
));

const VisitorsTable = React.memo(({ visitorsList, onExport }: any) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
    <div className="p-8 border-b border-zinc-800 flex justify-between items-center">
      <h3 className="text-xl font-bold text-white">Monitoramento em Tempo Real</h3>
      <button 
        onClick={onExport}
        disabled={visitorsList.length === 0}
        className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"
      >
        Exportar CSV
      </button>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-800">
            <th className="px-8 py-4 font-bold">ID Visitante</th>
            <th className="px-8 py-4 font-bold">Navegador</th>
            <th className="px-8 py-4 font-bold">Dispositivo</th>
            <th className="px-8 py-4 font-bold">Último Acesso</th>
            <th className="px-8 py-4 font-bold">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/50">
          {visitorsList.length > 0 ? visitorsList.map((v: any) => (
            <tr key={v.id} className="hover:bg-zinc-800/30 transition-colors">
              <td className="px-8 py-4 text-sm font-medium text-zinc-300 font-mono">{v.id.substring(0, 8)}...</td>
              <td className="px-8 py-4 text-sm text-zinc-400">{v.browser || 'N/A'}</td>
              <td className="px-8 py-4 text-sm text-zinc-400">{v.device || 'N/A'}</td>
              <td className="px-8 py-4 text-sm text-zinc-400">
                {v.lastVisit ? format(v.lastVisit.toDate(), 'HH:mm (dd/MM)', { locale: ptBR }) : 'N/A'}
              </td>
              <td className="px-8 py-4">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase">
                  Ativo
                </span>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan={5} className="px-8 py-10 text-center text-zinc-600 italic">Nenhum visitante registrado ainda.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
));

export const AdminPage = () => {
  const { isAdmin, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalVisitors: 0,
    activeNow: 0,
    totalViews: 0,
    last7Days: 0,
    last30Days: 0,
  });
  const [visitorsList, setVisitorsList] = useState<any[]>([]);
  const [gameStats, setGameStats] = useState<any[]>([]);
  const [realtimeData, setRealtimeData] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!loading) {
      if (!isAdmin) {
        console.warn('[Navigation] [AdminPage] Tentativa de acesso sem permissões admin. Redirecionando para login.');
        navigate('/admin/login');
      } else {
        console.log('[Navigation] [AdminPage] Acesso autorizado ao painel administrativo.');
      }
    }
  }, [isAdmin, loading, navigate]);

  const getGameName = useCallback((id: string) => {
    switch(id) {
      case 'cobra_pro_max_web': return 'Cobra Pro Max (Web)';
      case 'cobra_pro_max_playstore': return 'Cobra Pro Max (GP)';
      case 'turbo_rush_3d': return 'Turbo Rush 3D';
      case 'desk_racer': return 'Desk Racer';
      default: return id;
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    // Fetch stats
    const fetchStats = async () => {
      try {
        const [visitorsSnap, eventsSnap, viewsSnap, gameStatsSnap] = await Promise.all([
          getDocs(collection(db, 'visitors')),
          getDocs(collection(db, 'events')),
          getDocs(query(collection(db, 'events'), where('type', '==', 'page_view'))),
          getDocs(collection(db, 'game_stats'))
        ]);
        
        const last7Days = eventsSnap.docs.filter(doc => {
          const ts = doc.data().timestamp as Timestamp;
          return ts?.toDate() > subDays(new Date(), 7);
        }).length;

        const last30Days = eventsSnap.docs.filter(doc => {
          const ts = doc.data().timestamp as Timestamp;
          return ts?.toDate() > subDays(new Date(), 30);
        }).length;

        setStats(prev => ({
          ...prev,
          totalVisitors: visitorsSnap.size,
          totalViews: viewsSnap.size,
          last7Days,
          last30Days
        }));

        setVisitorsList(visitorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setGameStats(gameStatsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err: any) {
        console.error('Error fetching dashboard stats:', err);
        await LoggerService.logError('Erro ao carregar estatísticas do painel', { 
          message: err.message, 
          code: err.code 
        }, 'database');
      }
    };

    fetchStats();

    // Real-time active users
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const qActive = query(
      collection(db, 'sessions'), 
      where('lastActive', '>=', Timestamp.fromDate(fiveMinutesAgo))
    );
    
    const unsubActive = onSnapshot(qActive, (snap) => {
      setStats(prev => ({ ...prev, activeNow: snap.size }));
    });

    // Real-time game stats listener
    const unsubGameStats = onSnapshot(collection(db, 'game_stats'), (snap) => {
      setGameStats(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Real-time recent events listener (50 most recent events)
    const qRecentEvents = query(
      collection(db, 'events'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const unsubRecentEvents = onSnapshot(qRecentEvents, (snap) => {
      setRecentEvents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Real-time chart data
    const twentyFourHoursAgo = subDays(new Date(), 1);
    const qEvents = query(
      collection(db, 'events'),
      where('timestamp', '>=', Timestamp.fromDate(twentyFourHoursAgo)),
      orderBy('timestamp', 'asc')
    );

    const unsubEvents = onSnapshot(qEvents, (snap) => {
      const hourCounts: Record<string, number> = {};
      for (let i = 0; i < 24; i++) {
        const d = new Date();
        d.setHours(d.getHours() - i, 0, 0, 0);
        hourCounts[format(d, 'HH:00')] = 0;
      }

      if (!snap.metadata.hasPendingWrites && snap.docChanges().length > 0) {
        snap.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            if (data.type === 'game_open') {
              toast.success(`Novo Jogador: ${getGameName(data.gameId)} foi aberto agora!`, {
                description: 'Atividade real detectada no site.',
                icon: <Gamepad2 className="w-5 h-5 text-emerald-500" />,
                duration: 5000,
              });
            }
          }
        });
      }

      snap.docs.forEach(doc => {
        const ts = doc.data().timestamp as Timestamp;
        if (!ts) return;
        const hour = format(ts.toDate(), 'HH:00');
        if (hourCounts[hour] !== undefined) hourCounts[hour]++;
      });

      const data = Object.entries(hourCounts)
        .map(([time, value]) => ({ time, value }))
        .sort((a, b) => a.time.localeCompare(b.time));
      
      setRealtimeData(data);
    });

    return () => {
      unsubActive();
      unsubEvents();
      unsubGameStats();
      unsubRecentEvents();
    };
  }, [isAdmin, getGameName]);

  const sortedVisitors = useMemo(() => {
    return [...visitorsList].sort((a, b) => (b.lastVisit?.seconds || 0) - (a.lastVisit?.seconds || 0));
  }, [visitorsList]);

  const sortedGameStats = useMemo(() => {
    return [...gameStats].sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
  }, [gameStats]);

  const deskRacerStats = useMemo(() => {
    return gameStats.find(g => g.id === 'desk_racer') || null;
  }, [gameStats]);

  const handleExportCSV = useCallback(() => {
    if (sortedVisitors.length === 0) return;
    
    const headers = ["ID Visitante", "Navegador", "Dispositivo", "Último Acesso", "País"];
    const rows = sortedVisitors.map(v => [
      v.id,
      v.browser || 'Unknown',
      v.device || 'Unknown',
      v.lastVisit ? format(v.lastVisit.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A',
      v.country || 'Unknown'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_visitantes_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [sortedVisitors]);

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col lg:flex-row">
      <Toaster richColors position="top-right" theme="dark" />
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={logout} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <main className="flex-1 lg:ml-64 p-4 sm:p-6 md:p-10 transition-all duration-300">
        <header className="mb-8 sm:mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-14 lg:pt-0">
          {/* Mobile Header Toggle */}
          <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 z-50 flex items-center justify-between px-4">
            <h1 className="text-white font-black text-lg tracking-tight">ADMIN MASTER</h1>
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-zinc-400 hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-1 sm:mb-2 leading-tight">
              {activeTab === 'overview' ? 'Visão Geral' : 
               activeTab === 'realtime' ? 'Tempo Real' : 
               activeTab === 'visitors' ? 'Visitantes' : 
               activeTab === 'games' ? 'Estatísticas & Analytics dos Jogos' :
               activeTab === 'activity' ? 'Eventos & Telemetria' :
               activeTab === 'reports' ? 'Relatórios & Métricas' : 'Painel Admin'}
            </h2>
            <p className="text-zinc-500">Centro de comando exclusivo: COBRA GAMES JR — ADMIN MASTER</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-2xl flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-sm font-bold text-zinc-300">Sistema Online</span>
          </div>
        </header>

        {activeTab === 'overview' && (
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Visitantes Totais" value={stats.totalVisitors} icon={Users} />
              <StatCard title="Online Agora" value={stats.activeNow} icon={Activity} />
              <StatCard title="Visualizações" value={stats.totalViews} icon={Eye} trend="up" trendValue="Live" />
              <StatCard title="Acessos (30 dias)" value={stats.last30Days} icon={TrendingUp} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl p-8 min-h-[500px]">
                <Suspense fallback={<div className="h-full flex items-center justify-center text-zinc-600 animate-pulse font-bold uppercase tracking-widest">Carregando Gráficos...</div>}>
                  <DashboardCharts data={realtimeData} gameStats={gameStats} />
                </Suspense>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
                <h3 className="text-xl font-bold text-white mb-6 text-center lg:text-left">Popularidade Real</h3>
                <div className="space-y-6">
                  {sortedGameStats.length > 0 ? sortedGameStats.map((game, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center">
                          <Gamepad2 className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white truncate max-w-[120px]">{getGameName(game.id)}</div>
                          <div className="text-xs text-zinc-500">{game.opens || 0} aberturas</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-zinc-300">{game.clicks || 0}</div>
                        <div className="text-[10px] uppercase tracking-wider text-zinc-600 font-bold">Cliques</div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-10 text-zinc-600 text-sm italic">Aguardando dados...</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'games' && (
          <div className="space-y-10">
            {/* Dedicated Desk Racer Deep-Dive with Firebase Analytics */}
            <DeskRacerAnalytics stats={deskRacerStats} events={recentEvents} />

            {/* General Games Catalog Ranking */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">Catálogo de Jogos — Performance Geral</h3>
                  <p className="text-xs text-zinc-500 mt-1">Comparativo de conversão (Cliques vs Aberturas)</p>
                </div>
                <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Tempo Real</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-800">
                      <th className="px-6 py-4 font-bold">Jogo</th>
                      <th className="px-6 py-4 font-bold">Cliques na Vitrine</th>
                      <th className="px-6 py-4 font-bold">Aberturas Efetivas</th>
                      <th className="px-6 py-4 font-bold">Taxa de Conversão</th>
                      <th className="px-6 py-4 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {sortedGameStats.map((game) => {
                      const conversion = (game.clicks || 0) > 0 ? (((game.opens || 0) / game.clicks) * 100).toFixed(1) : '0';
                      return (
                        <tr key={game.id} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="px-6 py-4 text-sm font-bold text-white flex items-center gap-3">
                            <div className="p-2 bg-zinc-800 rounded-xl text-orange-500">
                              <Gamepad2 className="w-4 h-4" />
                            </div>
                            {getGameName(game.id)}
                          </td>
                          <td className="px-6 py-4 text-sm text-zinc-300 font-bold">{game.clicks || 0}</td>
                          <td className="px-6 py-4 text-sm text-cyan-400 font-bold">{game.opens || 0}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-300">
                              {conversion}%
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase">
                              Ativo
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'visitors' && (
          <VisitorsTable visitorsList={sortedVisitors} onExport={handleExportCSV} />
        )}

        {activeTab === 'activity' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
            <div className="p-8 border-b border-zinc-800 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white">Eventos & Telemetria em Tempo Real</h3>
                <p className="text-xs text-zinc-500 mt-1">Fluxo completo de eventos disparados na plataforma</p>
              </div>
              <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Últimos 50 Eventos</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-800">
                    <th className="px-8 py-4 font-bold">Horário</th>
                    <th className="px-8 py-4 font-bold">Tipo</th>
                    <th className="px-8 py-4 font-bold">Jogo / Alvo</th>
                    <th className="px-8 py-4 font-bold">ID da Sessão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {recentEvents.length > 0 ? (
                    recentEvents.map((evt) => (
                      <tr key={evt.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-8 py-4 text-xs text-zinc-400 whitespace-nowrap">
                          {evt.timestamp?.toDate ? format(evt.timestamp.toDate(), 'HH:mm:ss (dd/MM)', { locale: ptBR }) : 'Agora'}
                        </td>
                        <td className="px-8 py-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-orange-500/10 text-orange-400 border border-orange-500/20 font-mono">
                            {evt.type}
                          </span>
                        </td>
                        <td className="px-8 py-4 text-sm text-zinc-300 font-medium">
                          {evt.gameId ? getGameName(evt.gameId) : evt.page || 'N/A'}
                        </td>
                        <td className="px-8 py-4 text-xs text-zinc-500 font-mono">
                          {evt.sessionId ? evt.sessionId.substring(0, 8) + '...' : 'N/A'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-8 py-10 text-center text-zinc-600 italic">
                        Nenhum evento registrado recentemente.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'realtime' && (
          <div className="space-y-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <StatCard title="Usuários Ativos Agora" value={stats.activeNow} icon={Activity} />
              <StatCard title="Acessos nas Últimas 24h" value={stats.last7Days} icon={TrendingUp} />
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 min-h-[400px]">
              <Suspense fallback={<div className="h-full flex items-center justify-center text-zinc-600 animate-pulse font-bold uppercase tracking-widest">Carregando Gráficos...</div>}>
                <DashboardCharts data={realtimeData} gameStats={gameStats} />
              </Suspense>
            </div>
          </div>
        )}

        {activeTab !== 'overview' && activeTab !== 'visitors' && activeTab !== 'games' && activeTab !== 'activity' && activeTab !== 'realtime' && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-full mb-6">
              <Activity className="w-12 h-12 text-orange-500" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Módulo em Desenvolvimento</h3>
            <p className="text-zinc-500 max-w-sm">
              Esta seção está sendo populada com dados reais do seu projeto. 
              Em breve, você verá estatísticas detalhadas aqui.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

const Activity = React.memo(({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
));
