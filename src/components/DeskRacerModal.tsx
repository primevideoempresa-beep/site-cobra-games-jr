import React, { useState, useEffect, useRef } from 'react';
import { X, Maximize2, Minimize2, RotateCcw, Play, ExternalLink } from 'lucide-react';
import { AnalyticsService } from '../services/analytics';
import { logFirebaseEvent } from '../lib/firebase';

interface DeskRacerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeskRacerModal: React.FC<DeskRacerModalProps> = ({ isOpen, onClose }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const sessionStartTimeRef = useRef<number>(Date.now());
  const lapsCompletedCountRef = useRef<number>(0);
  const raceCompletedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    sessionStartTimeRef.current = Date.now();
    lapsCompletedCountRef.current = 0;
    raceCompletedRef.current = false;

    // Track game open
    AnalyticsService.trackGameOpen('desk_racer');
    logFirebaseEvent('desk_racer_modal_open', { timestamp: Date.now() });

    // Retention heartbeat ping every 30s
    let elapsedSeconds = 0;
    const heartbeatInterval = setInterval(() => {
      elapsedSeconds += 30;
      AnalyticsService.trackDeskRacerHeartbeat(30);
    }, 30000);

    // Listen for postMessage from Desk Racer iframe
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || event.data.source !== 'desk_racer') return;
      const { event: drEvent, payload } = event.data;

      switch (drEvent) {
        case 'race_start':
          AnalyticsService.trackDeskRacerRaceStart(payload || {});
          break;
        case 'lap_completed':
          lapsCompletedCountRef.current += 1;
          AnalyticsService.trackDeskRacerLapComplete(payload || { lapNumber: 1, lapTime: 0 });
          break;
        case 'race_finish':
          raceCompletedRef.current = true;
          AnalyticsService.trackDeskRacerRaceFinish(payload || { totalTime: 0, bestLap: 0 });
          break;
        case 'replay_click':
          AnalyticsService.trackDeskRacerReplay();
          break;
        case 'camera_switch':
          AnalyticsService.trackDeskRacerCameraSwitch(payload?.camera || 1);
          break;
        case 'sound_toggle':
          AnalyticsService.trackDeskRacerSoundToggle(payload?.soundEnabled ?? true);
          break;
        case 'pause_toggle':
          AnalyticsService.trackDeskRacerPauseToggle(payload?.isPaused ?? false);
          break;
        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('message', handleMessage);

      const durationSeconds = Math.round((Date.now() - sessionStartTimeRef.current) / 1000);
      if (durationSeconds >= 3) {
        AnalyticsService.trackDeskRacerSessionEnd({
          durationSeconds,
          lapsCount: lapsCompletedCountRef.current,
          completedRace: raceCompletedRef.current
        });
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRestart = () => {
    AnalyticsService.trackDeskRacerReplay();
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div 
      id="desk-racer-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-0 sm:p-3 md:p-6 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="desk-racer-modal-dialog"
        className={`bg-slate-900 border-0 sm:border border-slate-700/80 rounded-none sm:rounded-3xl shadow-2xl flex flex-col transition-all overflow-hidden ${
          isFullscreen 
            ? 'w-full h-full rounded-none' 
            : 'w-full h-[100dvh] sm:h-[94vh] sm:max-h-[920px] sm:max-w-5xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3.5 border-b border-slate-800 bg-slate-900/95 flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 shrink-0">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold text-sm sm:text-base lg:text-lg tracking-tight truncate max-w-[140px] xs:max-w-[200px] sm:max-w-none">
                  Desk Racer
                </h3>
                <span className="hidden xs:inline-flex text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 whitespace-nowrap">
                  Corrida 3D
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block truncate">Micro-karts 1:87, física realista de montanha-russa e circuitos em mesa!</p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <a
              href="/deskracer/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Abrir em uma nova aba"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              type="button"
              onClick={handleRestart}
              className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Reiniciar jogo"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer hidden xs:flex"
              title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-red-500/20 hover:text-red-400 transition-colors cursor-pointer ml-1"
              title="Fechar tela do jogo"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport Frame */}
        <div className="flex-1 bg-black relative">
          <iframe
            key={iframeKey}
            src="/deskracer/index.html"
            title="Desk Racer"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </div>
    </div>
  );
};
