import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Info, Sparkles, Rocket } from 'lucide-react';

interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'update' | 'launch';
  duration?: number;
}

const DEFAULT_DURATION = 6000; // 6 seconds

export const ToastNotification: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    
    // Auto remove after duration
    setTimeout(() => {
      removeToast(id);
    }, toast.duration || DEFAULT_DURATION);
  };

  useEffect(() => {
    // Show initial notifications based on user request
    const timer1 = setTimeout(() => {
      addToast({
        title: "Próximo lançamento!",
        message: "Kled 3D: Cavaleiro da Batalha chega em breve ao AI Studio!",
        type: 'launch'
      });
    }, 2000);

    const timer2 = setTimeout(() => {
      addToast({
        title: "Atualização disponível",
        message: "Cobra Pro Max Web agora com servidores globais otimizados.",
        type: 'update'
      });
    }, 5000);

    const handleShowToast = (e: any) => {
      if (e.detail) addToast(e.detail);
    };
    window.addEventListener('show-toast', handleShowToast);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('show-toast', handleShowToast);
    };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
            className="pointer-events-auto"
          >
            <div className={`
              w-80 sm:w-96 rounded-2xl p-4 shadow-2xl border flex gap-4 items-start relative overflow-hidden
              ${toast.type === 'launch' ? 'bg-indigo-900 border-indigo-500 text-white' : ''}
              ${toast.type === 'update' ? 'bg-emerald-900 border-emerald-500 text-white' : ''}
              ${toast.type === 'info' ? 'bg-slate-900 border-slate-700 text-white' : ''}
            `}>
              {/* Progress bar for auto-dismiss */}
              <motion.div 
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: (toast.duration || DEFAULT_DURATION) / 1000, ease: "linear" }}
                className={`absolute bottom-0 left-0 h-1 ${
                  toast.type === 'launch' ? 'bg-indigo-400' : 
                  toast.type === 'update' ? 'bg-emerald-400' : 'bg-blue-400'
                }`}
              />

              <div className={`
                w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                ${toast.type === 'launch' ? 'bg-indigo-500 text-white' : ''}
                ${toast.type === 'update' ? 'bg-emerald-500 text-white' : ''}
                ${toast.type === 'info' ? 'bg-blue-500 text-white' : ''}
              `}>
                {toast.type === 'launch' && <Rocket className="w-5 h-5" />}
                {toast.type === 'update' && <Sparkles className="w-5 h-5" />}
                {toast.type === 'info' && <Bell className="w-5 h-5" />}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm mb-1 flex items-center gap-2">
                  {toast.title}
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {toast.message}
                </p>
              </div>

              <button 
                onClick={() => removeToast(toast.id)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

