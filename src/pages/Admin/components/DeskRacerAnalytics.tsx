import React from 'react';
import { 
  Trophy, 
  Flag, 
  RotateCcw, 
  Camera, 
  Timer, 
  Zap, 
  Play, 
  CheckCircle2, 
  Users, 
  BarChart3,
  Flame,
  Volume2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DeskRacerAnalyticsProps {
  stats: any;
  events: any[];
}

export const DeskRacerAnalytics: React.FC<DeskRacerAnalyticsProps> = ({ stats, events }) => {
  const racesStarted = stats?.racesStarted || 0;
  const lapsCompleted = stats?.lapsCompleted || 0;
  const racesCompleted = stats?.racesCompleted || 0;
  const replaysCount = stats?.replaysCount || 0;
  const opens = stats?.opens || 0;
  const clicks = stats?.clicks || 0;
  const retentionD1 = stats?.retentionD1 || 0;
  const retentionD7 = stats?.retentionD7 || 0;
  const totalPlaytimeSeconds = stats?.totalPlaytimeSeconds || 0;

  // Camera choices
  const cam1 = stats?.camera_1 || 0;
  const cam2 = stats?.camera_2 || 0;
  const cam3 = stats?.camera_3 || 0;
  const totalCamSwitches = cam1 + cam2 + cam3 || 1;

  // Computed ratios
  const completionRate = racesStarted > 0 ? ((racesCompleted / racesStarted) * 100).toFixed(1) : '0';
  const replayRate = racesCompleted > 0 ? ((replaysCount / racesCompleted) * 100).toFixed(1) : '0';
  const openToStartRate = opens > 0 ? ((racesStarted / opens) * 100).toFixed(1) : '0';
  const avgRaceTimeSeconds = racesCompleted > 0 ? Math.round(totalPlaytimeSeconds / racesCompleted) : 0;

  // Filter Desk Racer events
  const deskRacerEvents = events
    .filter(e => e.gameId === 'desk_racer' || e.type?.startsWith('desk_racer_'))
    .slice(0, 15);

  const getEventBadge = (type: string) => {
    switch(type) {
      case 'desk_racer_race_start':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">Largada</span>;
      case 'desk_racer_lap_complete':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Volta Concluída</span>;
      case 'desk_racer_race_finish':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Chegada Final</span>;
      case 'desk_racer_replay':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-orange-500/10 text-orange-400 border border-orange-500/20">Replay</span>;
      case 'desk_racer_camera_switch':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">Câmera</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-zinc-800 text-zinc-400">{type}</span>;
    }
  };

  const getEventDetail = (event: any) => {
    switch(event.type) {
      case 'desk_racer_race_start':
        return `Coorte: ${event.retentionCohort || 'D0'} • Corrida #${event.careerRaceNumber || 1} • Câmera ${event.camera || '1'}`;
      case 'desk_racer_lap_complete':
        return `Volta ${event.lapNumber || '1'} em ${event.lapTime ? event.lapTime + 's' : 'N/A'}${event.bestLap ? ` (Melhor: ${event.bestLap}s)` : ''}`;
      case 'desk_racer_race_finish':
        return `Tempo Total: ${event.totalTime ? event.totalTime + 's' : 'N/A'} • Melhor Volta: ${event.bestLap ? event.bestLap + 's' : 'N/A'}`;
      case 'desk_racer_replay':
        return 'Jogador optou por reiniciar a corrida na tela final';
      case 'desk_racer_camera_switch':
        return `Alternou para Câmera ${event.camera || '1'}`;
      default:
        return 'Evento telemétrico registrado';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-cyan-950/40 via-zinc-900 to-zinc-900 border border-cyan-800/30 rounded-3xl p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
                <Flag className="w-6 h-6" />
              </span>
              <h2 className="text-2xl font-black text-white">Desk Racer 3D — Analytics & Retenção</h2>
            </div>
            <p className="text-zinc-400 text-sm max-w-2xl">
              Telemetria comportamental integrada com Firebase Analytics e Firestore em tempo real. Rastreamento de funil, coortes de retenção e preferências de gameplay.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Firebase Analytics Ativo
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Coortes D0 / D1 / D7
            </span>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Races Started */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <div className="flex justify-between items-start mb-3">
            <div className="p-3 bg-zinc-800 rounded-2xl text-cyan-400">
              <Play className="w-5 h-5" />
            </div>
            <span className="text-xs text-zinc-500 font-semibold">{openToStartRate}% conversão</span>
          </div>
          <div className="text-xs text-zinc-400 uppercase font-bold tracking-wider mb-1">Corridas Iniciadas</div>
          <div className="text-3xl font-black text-white">{racesStarted}</div>
          <div className="text-xs text-zinc-500 mt-2">Aberturas do modal: {opens}</div>
        </div>

        {/* Laps Completed */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <div className="flex justify-between items-start mb-3">
            <div className="p-3 bg-zinc-800 rounded-2xl text-blue-400">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-xs text-zinc-500 font-semibold">
              {racesStarted > 0 ? (lapsCompleted / racesStarted).toFixed(1) : 0} voltas/início
            </span>
          </div>
          <div className="text-xs text-zinc-400 uppercase font-bold tracking-wider mb-1">Voltas Concluídas</div>
          <div className="text-3xl font-black text-white">{lapsCompleted}</div>
          <div className="text-xs text-zinc-500 mt-2">Checkpoint cruzados com sucesso</div>
        </div>

        {/* Races Completed */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <div className="flex justify-between items-start mb-3">
            <div className="p-3 bg-zinc-800 rounded-2xl text-emerald-400">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {completionRate}% taxa
            </span>
          </div>
          <div className="text-xs text-zinc-400 uppercase font-bold tracking-wider mb-1">Corridas Finalizadas</div>
          <div className="text-3xl font-black text-white">{racesCompleted}</div>
          <div className="text-xs text-zinc-500 mt-2">3 voltas completas sem desistir</div>
        </div>

        {/* Replays */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <div className="flex justify-between items-start mb-3">
            <div className="p-3 bg-zinc-800 rounded-2xl text-orange-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">
              {replayRate}% replay
            </span>
          </div>
          <div className="text-xs text-zinc-400 uppercase font-bold tracking-wider mb-1">Replays Solicitados</div>
          <div className="text-3xl font-black text-white">{replaysCount}</div>
          <div className="text-xs text-zinc-500 mt-2">Engajamento recorrente imediato</div>
        </div>
      </div>

      {/* Retention Cohorts & Gameplay Preferences */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Retention Cohort Analysis */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              Retenção de Jogadores (Coortes)
            </h3>
            <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Firebase Analytics</span>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-zinc-800/40 border border-zinc-800 rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">Coorte D0 (Novos Jogadores)</div>
                <div className="text-xs text-zinc-500">Primeira sessão registrada no jogo</div>
              </div>
              <div className="text-xl font-black text-white">
                {racesStarted - (retentionD1 + retentionD7) > 0 ? racesStarted - (retentionD1 + retentionD7) : racesStarted}
              </div>
            </div>

            <div className="p-4 bg-zinc-800/40 border border-zinc-800 rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-cyan-400">Coorte D1 (Retorno no 2º Dia)</div>
                <div className="text-xs text-zinc-500">Jogadores que voltaram 24h após o primeiro acesso</div>
              </div>
              <div className="text-xl font-black text-cyan-400">{retentionD1}</div>
            </div>

            <div className="p-4 bg-zinc-800/40 border border-zinc-800 rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-emerald-400">Coorte D7 (Retenção Semanal)</div>
                <div className="text-xs text-zinc-500">Jogadores ativos entre o 2º e o 7º dia</div>
              </div>
              <div className="text-xl font-black text-emerald-400">{retentionD7}</div>
            </div>

            <div className="p-4 bg-zinc-800/40 border border-zinc-800 rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-orange-400">Tempo Médio por Corrida</div>
                <div className="text-xs text-zinc-500">Duração estimada de prova concluída</div>
              </div>
              <div className="text-xl font-black text-orange-400">
                {avgRaceTimeSeconds > 0 ? `${avgRaceTimeSeconds}s` : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Camera and Control Preferences */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-purple-400" />
              Preferências de Câmera & Gameplay
            </h3>
            <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Comportamento</span>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-1.5 font-medium">
                <span className="text-zinc-300">Câmera 1 — Perseguição Padrão</span>
                <span className="text-zinc-400">{cam1} alternâncias ({Math.round((cam1 / totalCamSwitches) * 100)}%)</span>
              </div>
              <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.round((cam1 / totalCamSwitches) * 100)}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1.5 font-medium">
                <span className="text-zinc-300">Câmera 2 — Cockpit / Próxima</span>
                <span className="text-zinc-400">{cam2} alternâncias ({Math.round((cam2 / totalCamSwitches) * 100)}%)</span>
              </div>
              <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                <div className="bg-cyan-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.round((cam2 / totalCamSwitches) * 100)}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1.5 font-medium">
                <span className="text-zinc-300">Câmera 3 — Aérea / Top-Down</span>
                <span className="text-zinc-400">{cam3} alternâncias ({Math.round((cam3 / totalCamSwitches) * 100)}%)</span>
              </div>
              <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.round((cam3 / totalCamSwitches) * 100)}%` }} />
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-zinc-400" />
                Áudio Web Audio API (Sintetizador de Motor)
              </span>
              <span className="text-emerald-400 font-bold">Ativo por Padrão</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Event Stream Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="p-8 border-b border-zinc-800 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-white">Feed de Telemetria Desk Racer em Tempo Real</h3>
            <p className="text-xs text-zinc-500 mt-1">Eventos individuais transmitidos via Firebase Analytics e Firestore</p>
          </div>
          <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Últimos Registros</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-800">
                <th className="px-8 py-4 font-bold">Horário</th>
                <th className="px-8 py-4 font-bold">Evento</th>
                <th className="px-8 py-4 font-bold">Detalhes da Telemetria</th>
                <th className="px-8 py-4 font-bold">Sessão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {deskRacerEvents.length > 0 ? (
                deskRacerEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-8 py-4 text-xs text-zinc-400 whitespace-nowrap">
                      {evt.timestamp?.toDate ? format(evt.timestamp.toDate(), 'HH:mm:ss (dd/MM)', { locale: ptBR }) : 'Agora'}
                    </td>
                    <td className="px-8 py-4">
                      {getEventBadge(evt.type)}
                    </td>
                    <td className="px-8 py-4 text-xs text-zinc-300 font-mono">
                      {getEventDetail(evt)}
                    </td>
                    <td className="px-8 py-4 text-xs text-zinc-500 font-mono">
                      {evt.sessionId ? evt.sessionId.substring(0, 8) + '...' : 'N/A'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-8 py-10 text-center text-zinc-600 italic">
                    Nenhum evento do Desk Racer registrado ainda nesta sessão. Inicie uma corrida para ver os dados fluírem.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
