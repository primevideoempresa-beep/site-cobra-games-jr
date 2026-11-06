import React, { useCallback, useMemo } from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { Clock, BarChart3 } from 'lucide-react';

interface DashboardChartsProps {
  data: any[];
  gameStats: any[];
}

const DashboardCharts: React.FC<DashboardChartsProps> = ({ data, gameStats }) => {
  const getGameName = useCallback((id: string) => {
    switch(id) {
      case 'cobra_pro_max_web': return 'Cobra Pro Max (Web)';
      case 'cobra_pro_max_playstore': return 'Cobra Pro Max (GP)';
      case 'turbo_rush_3d': return 'Turbo Rush 3D';
      case 'desk_racer': return 'Desk Racer';
      default: return id;
    }
  }, []);

  const chartData = useMemo(() => {
    return gameStats.map(game => ({
      name: getGameName(game.id),
      Cliques: game.clicks || 0,
      Aberturas: game.opens || 0
    })).sort((a, b) => b.Cliques - a.Cliques);
  }, [gameStats, getGameName]);

  const deskRacerData = useMemo(() => {
    return gameStats.find(g => g.id === 'desk_racer') || null;
  }, [gameStats]);

  const deskRacerFunnelData = useMemo(() => {
    if (!deskRacerData) return [];
    return [
      { etapa: 'Aberturas', total: deskRacerData.opens || 0 },
      { etapa: 'Inícios', total: deskRacerData.racesStarted || 0 },
      { etapa: 'Voltas', total: deskRacerData.lapsCompleted || 0 },
      { etapa: 'Finalizadas', total: deskRacerData.racesCompleted || 0 },
      { etapa: 'Replays', total: deskRacerData.replaysCount || 0 },
    ];
  }, [deskRacerData]);

  return (
    <div className="space-y-12">
      {/* Access Flow over time */}
      <div>
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            Fluxo de Acessos
          </h3>
          <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Últimas 24 horas</div>
        </div>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="time" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} interval={3} />
              <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }} itemStyle={{ color: '#F97316' }} />
              <Area type="monotone" dataKey="value" stroke="#F97316" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Game Performance comparison */}
      <div>
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-500" />
            Performance por Jogo
          </h3>
          <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Cliques vs Aberturas</div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#71717a" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                angle={-25} 
                textAnchor="end"
                interval={0}
              />
              <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }} 
              />
              <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '10px' }} />
              <Bar dataKey="Cliques" fill="#F97316" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Aberturas" fill="#3B82F6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Desk Racer Specific Behavior & Retention Metrics */}
      {deskRacerData && (
        <div className="pt-6 border-t border-zinc-800">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
                Desk Racer — Retenção & Comportamento
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">Métricas de engajamento e funil de jogo capturadas em tempo real via Firebase Analytics</p>
            </div>
            <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Firebase Analytics Ativo
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-zinc-800/60 border border-zinc-700/50 p-4 rounded-2xl">
              <div className="text-[11px] text-zinc-400 uppercase font-semibold mb-1">Corridas Iniciadas</div>
              <div className="text-2xl font-black text-white">{deskRacerData.racesStarted || 0}</div>
            </div>
            <div className="bg-zinc-800/60 border border-zinc-700/50 p-4 rounded-2xl">
              <div className="text-[11px] text-zinc-400 uppercase font-semibold mb-1">Voltas Concluídas</div>
              <div className="text-2xl font-black text-cyan-400">{deskRacerData.lapsCompleted || 0}</div>
            </div>
            <div className="bg-zinc-800/60 border border-zinc-700/50 p-4 rounded-2xl">
              <div className="text-[11px] text-zinc-400 uppercase font-semibold mb-1">Corridas Finalizadas</div>
              <div className="text-2xl font-black text-emerald-400">{deskRacerData.racesCompleted || 0}</div>
            </div>
            <div className="bg-zinc-800/60 border border-zinc-700/50 p-4 rounded-2xl">
              <div className="text-[11px] text-zinc-400 uppercase font-semibold mb-1">Replays / Rejogadas</div>
              <div className="text-2xl font-black text-orange-400">{deskRacerData.replaysCount || 0}</div>
            </div>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deskRacerFunnelData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="etapa" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }} 
                />
                <Bar dataKey="total" fill="#06B6D4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardCharts;
