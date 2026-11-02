import React, { useState } from 'react';
import { X, Maximize2, Minimize2, ExternalLink } from 'lucide-react';

interface DeskRacerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeskRacerModal: React.FC<DeskRacerModalProps> = ({ isOpen, onClose }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className={`bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col transition-all overflow-hidden ${
          isFullscreen 
            ? 'w-full h-full rounded-none' 
            : 'w-full max-w-5xl h-[95vh] max-h-[920px]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/95 flex-shrink-0">
          <h3 className="text-white font-bold text-base sm:text-lg">Desk Racer</h3>
          <div className="flex items-center gap-2">
            <a
              href="/deskracer/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Abrir em uma nova aba"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-red-500/20 hover:text-red-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport Frame */}
        <div className="flex-1 bg-black relative">
          <iframe
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
