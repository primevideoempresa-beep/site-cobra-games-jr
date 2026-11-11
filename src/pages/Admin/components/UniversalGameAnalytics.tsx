import React from 'react';
import { 
  Trophy, 
  Flag, 
  Play, 
  CheckCircle2, 
  Users, 
  Timer,
  Zap,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UniversalGameAnalyticsProps {
  game: any;
  stats: any;
  events: any[];
}

export const UniversalGameAnalytics: React.FC<UniversalGameAnalyticsProps> = ({ game, stats, events }) => {
  const racesStarted = stats?.racesStarted || 0;
  const racesCompleted = stats?.racesCompleted || 0;
  const opens = stats?.opens || 0;
  const retentionD1 = stats?.retentionD1 || 0;
  const retentionD7 = stats?.retentionD7 || 0;
  const totalPlaytimeSeconds = stats?.totalPlaytimeSeconds || 0;

  const completionRate = racesStarted > 0 ? ((racesCompleted / racesStarted) * 100).toFixed(1) : '0';
  const openToStartRate = opens > 0 ? ((racesStarted / opens) * 100).toFixed(1) : '0';
  const avgSessionSeconds = racesStarted > 0 ? Math.round(totalPlaytimeSeconds / racesStarted) : 0;

  // Filter events for this specific game
  const gameEvents = events
    .filter(e => e.gameId === game.id)
    .slice(0, 10);

  const getEventBadge = (type: string) => {
    switch(type) {
      case 'game_start':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">Início</span>;
      case 'game_finish':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Concluído</span>;
      case 'game_failure':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/20">Falha</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-zinc-800 text-zinc-400">{type}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <div className="flex justify-between items-start mb-3">
            <div className="p-3 bg-zinc-800 rounded-2xl text-blue-400">
              <Play className="w-5 h-5" />
            </div>
            <span className="text-xs text-zinc-500 font-semibold">{openToStartRate}% conversão</span>
          </div>
          <div className="text-xs text-zinc-400 uppercase font-bold tracking-wider mb-1">Iniciados</div>
          <div className="text-3xl font-black text-white">{racesStarted}</div>
          <div className="text-xs text-zinc-500 mt-2">Partidas iniciadas via web</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <div className="flex justify-between items-start mb-3">
            <div className="p-3 bg-zinc-800 rounded-2xl text-emerald-400">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {completionRate}% taxa
            </span>
          </div>
          <div className="text-xs text-zinc-400 uppercase font-bold tracking-wider mb-1">Finalizados</div>
          <div className="text-3xl font-black text-white">{racesCompleted}</div>
          <div className="text-xs text-zinc-500 mt-2">Sessões concluídas com sucesso</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <div className="flex justify-between items-start mb-3">
            <div className="p-3 bg-zinc-800 rounded-2xl text-orange-400">
              <Timer className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs text-zinc-400 uppercase font-bold tracking-wider mb-1">Tempo Médio</div>
          <div className="text-3xl font-black text-white">{avgSessionSeconds}s</div>
          <div className="text-xs text-zinc-500 mt-2">Duração média da partida</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <div className="flex justify-between items-start mb-3">
            <div className="p-3 bg-zinc-800 rounded-2xl text-cyan-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs text-zinc-400 uppercase font-bold tracking-wider mb-1">Retenção D1</div>
          <div className="text-3xl font-black text-white">{retentionD1}</div>
          <div className="text-xs text-zinc-500 mt-2">Jogadores recorrentes</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Retention Analysis */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            Coortes de Retenção
          </h3>
          <div className="space-y-3">
            <div className="p-4 bg-zinc-800/40 border border-zinc-800 rounded-2xl flex items-center justify-between">
              <span className="text-sm font-bold text-white">D0 (Novos)</span>
              <span className="text-xl font-black text-white">{racesStarted - retentionD1}</span>
            </div>
            <div className="p-4 bg-zinc-800/40 border border-zinc-800 rounded-2xl flex items-center justify-between border-l-4 border-l-cyan-500">
              <span className="text-sm font-bold text-cyan-400">D1 (Retornaram)</span>
              <span className="text-xl font-black text-cyan-400">{retentionD1}</span>
            </div>
            <div className="p-4 bg-zinc-800/40 border border-zinc-800 rounded-2xl flex items-center justify-between border-l-4 border-l-emerald-500">
              <span className="text-sm font-bold text-emerald-400">D7 (Fidelizados)</span>
              <span className="text-xl font-black text-emerald-400">{retentionD7}</span>
            </div>
          </div>
        </div>

        {/* Recent Events Feed */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 overflow-hidden">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Atividade Recente
          </h3>
          <div className="space-y-3">
            {gameEvents.length > 0 ? gameEvents.map((evt) => (
              <div key={evt.id} className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-xl border border-zinc-800">
                <div className="flex flex-col">
                  <span className="text-xs text-zinc-500">
                    {evt.timestamp?.toDate ? format(evt.timestamp.toDate(), 'HH:mm:ss', { locale: ptBR }) : 'Agora'}
                  </span>
                  <div className="mt-1">{getEventBadge(evt.type)}</div>
                </div>
                <div className="text-[10px] font-mono text-zinc-500">
                  {evt.visitorId?.substring(0, 8)}...
                </div>
              </div>
            )) : (
              <div className="py-10 text-center text-zinc-600 italic text-sm">
                Nenhuma atividade recente registrada.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
