import React, { useState } from 'react';
import { X, Maximize2, Minimize2, RotateCcw, Play, ExternalLink } from 'lucide-react';

interface KledModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KledModal: React.FC<KledModalProps> = ({ isOpen, onClose }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  if (!isOpen) return null;

  const handleRestart = () => {
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div 
      id="kled-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-0 sm:p-3 md:p-6 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="kled-modal-dialog"
        className={`bg-slate-900 border-0 sm:border border-amber-500/40 rounded-none sm:rounded-3xl shadow-2xl flex flex-col transition-all overflow-hidden ${
          isFullscreen 
            ? 'w-full h-full rounded-none' 
            : 'w-full h-[100dvh] sm:h-[94vh] sm:max-h-[920px] sm:max-w-5xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3.5 border-b border-slate-800 bg-slate-900/95 flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-600/30 shrink-0">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold text-sm sm:text-base lg:text-lg tracking-tight truncate max-w-[140px] xs:max-w-[200px] sm:max-w-none">
                  Kled 3D
                </h3>
                <span className="hidden xs:inline-flex text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 whitespace-nowrap">
                  Arena 3D
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block truncate">Monte seu réptil Skaarl, empunhe o machado lendário e lute na arena!</p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <a
              href="https://ai.studio/apps/80559be3-4bce-429d-a28d-b3b88a5131f8?fullscreenApplet=true"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 sm:px-3 py-1.5 min-h-[36px] rounded-xl text-amber-300 hover:text-white bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 transition-colors flex items-center gap-1.5 text-xs font-bold"
              title="Abrir Applet Oficial no AI Studio"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Studio</span>
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
            src="/kled-3d.html"
            title="Kled 3D — Cavaleiro da Batalha"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </div>
    </div>
  );
};
