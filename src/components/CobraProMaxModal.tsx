import React, { useState, useRef } from 'react';
import { X, Maximize2, Minimize2, RotateCcw, Play, ExternalLink } from 'lucide-react';

interface CobraProMaxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CobraProMaxModal: React.FC<CobraProMaxModalProps> = ({ isOpen, onClose }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  if (!isOpen) return null;

  const handleRestart = () => {
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div 
      id="cobra-pro-max-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-0 sm:p-3 md:p-6 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="cobra-pro-max-modal-dialog"
        className={`bg-slate-900 border-0 sm:border border-emerald-500/30 rounded-none sm:rounded-3xl shadow-2xl flex flex-col transition-all overflow-hidden ${
          isFullscreen 
            ? 'w-full h-full rounded-none' 
            : 'w-full h-[100dvh] sm:h-[94vh] sm:max-h-[920px] sm:max-w-5xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3.5 border-b border-slate-800 bg-slate-900/95 flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 shrink-0">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold text-sm sm:text-base lg:text-lg tracking-tight truncate max-w-[140px] xs:max-w-[200px] sm:max-w-none">
                  Cobra Pro Max
                </h3>
                <span className="hidden xs:inline-flex text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                  ★ #1 Bestseller IO
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block truncate">Arena multijogador clássica Snake IO com orbs luminosos, turbo e skins!</p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <a
              href="/cobra-pro-max.html"
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
              title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-red-500/20 hover:text-red-400 transition-colors cursor-pointer ml-1"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport Frame */}
        <div className="flex-1 bg-[#07090e] relative overflow-hidden flex items-center justify-center">
          <iframe
            ref={iframeRef}
            key={iframeKey}
            src="/cobra-pro-max.html"
            title="Cobra Pro Max - Cobra Faminta"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </div>
    </div>
  );
};
