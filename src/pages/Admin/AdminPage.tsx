import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sidebar } from '../../components/Admin/Sidebar';
import { 
  Users, 
  Eye, 
  Gamepad2, 
  TrendingUp, 
  Clock, 
  MousePointer2,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  limit, 
  orderBy, 
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area 
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast, Toaster } from 'sonner';

const StatCard = ({ title, value, icon: Icon, trend, trendValue }: any) => (
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
);

export const AdminPage = () => {
  const { user, isAdmin, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
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

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/admin/login');
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;

    // Fetch stats
    const fetchStats = async () => {
      const visitorsSnap = await getDocs(collection(db, 'visitors'));
      const eventsSnap = await getDocs(collection(db, 'events'));
      const viewsSnap = await getDocs(query(collection(db, 'events'), where('type', '==', 'page_view')));
      
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

      // Set visitors list
      const sortedVisitors = visitorsSnap.docs
        .map(doc => doc.data())
        .sort((a, b) => (b.lastVisit?.seconds || 0) - (a.lastVisit?.seconds || 0));
      setVisitorsList(sortedVisitors);

      // Fetch game stats
      const gameStatsSnap = await getDocs(collection(db, 'game_stats'));
      const games = gameStatsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGameStats(games);
    };

    fetchStats();

    // Real-time active users (active in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const qActive = query(
      collection(db, 'sessions'), 
      where('lastActive', '>=', Timestamp.fromDate(fiveMinutesAgo))
    );
    
    const unsubActive = onSnapshot(qActive, (snap) => {
      setStats(prev => ({ ...prev, activeNow: snap.size }));
    });

    // Real-time chart data (last 24 hours by hour)
    const twentyFourHoursAgo = subDays(new Date(), 1);
    const qEvents = query(
      collection(db, 'events'),
      where('timestamp', '>=', Timestamp.fromDate(twentyFourHoursAgo)),
      orderBy('timestamp', 'asc')
    );

    const unsubEvents = onSnapshot(qEvents, (snap) => {
      const hourCounts: Record<string, number> = {};
      
      // Initialize last 24 hours
      for (let i = 0; i < 24; i++) {
        const d = new Date();
        d.setHours(d.getHours() - i, 0, 0, 0);
        hourCounts[format(d, 'HH:00')] = 0;
      }

      // Track new events for notifications (only after initial load)
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
        if (hourCounts[hour] !== undefined) {
          hourCounts[hour]++;
        }
      });

      const data = Object.entries(hourCounts)
        .map(([time, value]) => ({ time, value }))
        .sort((a, b) => a.time.localeCompare(b.time));
      
      setRealtimeData(data);
    });

    // Spike Detection: Watch activeNow changes
    let prevActive = 0;
    const unsubSpike = onSnapshot(qActive, (snap) => {
      const currentActive = snap.size;
      if (currentActive > prevActive + 3 && prevActive !== 0) {
        toast.error('Pico de Acessos Detectado!', {
          description: `Aumento súbito de ${currentActive - prevActive} novos visitantes simultâneos.`,
          duration: 8000,
        });
      }
      prevActive = currentActive;
    });

    return () => {
      unsubActive();
      unsubEvents();
      unsubSpike();
    };
  }, [isAdmin]);

  const handleExportCSV = () => {
    if (visitorsList.length === 0) return;
    
    const headers = ["ID Visitante", "Navegador", "Dispositivo", "Último Acesso", "País"];
    const rows = visitorsList.map(v => [
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
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const getGameName = (id: string) => {
    switch(id) {
      case 'cobra_pro_max_web': return 'Cobra Pro Max (Web)';
      case 'cobra_pro_max_playstore': return 'Cobra Pro Max (GP)';
      case 'turbo_rush_3d': return 'Turbo Rush 3D';
      case 'desk_racer': return 'Desk Racer';
      default: return id;
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex">
      <Toaster richColors position="top-right" theme="dark" />
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={logout} />
      
      <main className="flex-1 ml-64 p-10">
        <header className="mb-10 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-white mb-2">
              {activeTab === 'overview' ? 'Visão Geral' : 
               activeTab === 'realtime' ? 'Tempo Real' : 
               activeTab === 'visitors' ? 'Visitantes' : 'Painel Admin'}
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
              <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-bold text-white">Fluxo de Acessos</h3>
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <Clock className="w-4 h-4" />
                    Últimas 24 horas
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={realtimeData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F97316" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="time" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} interval={3} />
                      <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }} itemStyle={{ color: '#F97316' }} />
                      <Area type="monotone" dataKey="value" stroke="#F97316" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
                <h3 className="text-xl font-bold text-white mb-6">Popularidade Real</h3>
                <div className="space-y-6">
                  {gameStats.length > 0 ? gameStats.sort((a,b) => (b.clicks || 0) - (a.clicks || 0)).map((game, i) => (
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

        {activeTab === 'visitors' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
            <div className="p-8 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Monitoramento em Tempo Real</h3>
              <button 
                onClick={handleExportCSV}
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
                  {visitorsList.length > 0 ? visitorsList.map((v) => (
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
        )}

        {activeTab !== 'overview' && activeTab !== 'visitors' && (
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

const Activity = ({ className }: { className?: string }) => (
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
);
