import React, { useState, useRef } from 'react';
import { X, Maximize2, Minimize2, RotateCcw, Play, ExternalLink } from 'lucide-react';

interface TurboRushModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TurboRushModal: React.FC<TurboRushModalProps> = ({ isOpen, onClose }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  if (!isOpen) return null;

  const handleRestart = () => {
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div 
      id="turbo-rush-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="turbo-rush-modal-dialog"
        className={`bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col transition-all overflow-hidden ${
          isFullscreen 
            ? 'w-full h-full rounded-none' 
            : 'w-full max-w-2xl h-[92vh] max-h-[720px]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/95 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold text-base sm:text-lg tracking-tight">Turbo Rush</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Pronto para jogar
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Desvie do tráfego e sobreviva com nitro ativo!</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <a
              href="/turbo-rush.html"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Abrir em uma nova aba"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              type="button"
              onClick={handleRestart}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Reiniciar jogo"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-red-500/20 hover:text-red-400 transition-colors cursor-pointer ml-1"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport Frame */}
        <div className="flex-1 bg-[#1a1a2e] relative overflow-hidden flex items-center justify-center">
          <iframe
            ref={iframeRef}
            key={iframeKey}
            src="/turbo-rush.html"
            title="Turbo Rush"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </div>
    </div>
  );
};
