import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, Sparkles, Rocket } from 'lucide-react';

interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'update' | 'launch';
  duration: number;
  exiting?: boolean;
}

const DEFAULT_DURATION = 6000;
let toastCounter = 0;

export const ToastNotification: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearToastTimer = useCallback((key: string) => {
    const existing = timersRef.current.get(key);
    if (existing) {
      clearTimeout(existing);
      timersRef.current.delete(key);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    clearToastTimer(`auto-${id}`);
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );

    clearToastTimer(`exit-${id}`);
    const exitTimer = setTimeout(() => {
      timersRef.current.delete(`exit-${id}`);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 220);
    timersRef.current.set(`exit-${id}`, exitTimer);
  }, [clearToastTimer]);

  const addToast = useCallback((toast: Omit<Toast, 'id' | 'duration'> & { duration?: number }) => {
    toastCounter += 1;
    const id = `toast-${Date.now()}-${toastCounter}`;
    const duration = toast.duration || DEFAULT_DURATION;

    setToasts((prev) => [...prev, { ...toast, id, duration, exiting: false }]);

    const autoTimer = setTimeout(() => {
      timersRef.current.delete(`auto-${id}`);
      removeToast(id);
    }, duration);
    timersRef.current.set(`auto-${id}`, autoTimer);
  }, [removeToast]);

  useEffect(() => {
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

    const handleShowToast = (e: CustomEvent) => {
      if (e.detail) addToast(e.detail);
    };
    window.addEventListener('show-toast', handleShowToast as EventListener);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('show-toast', handleShowToast as EventListener);
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto transition-all duration-200 ease-out ${
            toast.exiting
              ? 'opacity-0 scale-90 translate-x-4'
              : 'opacity-100 scale-100 translate-x-0 animate-in slide-in-from-right-8 fade-in'
          }`}
        >
          <div
            className={`w-80 sm:w-96 rounded-2xl p-4 shadow-2xl border flex gap-4 items-start relative overflow-hidden ${
              toast.type === 'launch'
                ? 'bg-indigo-900 border-indigo-500 text-white'
                : toast.type === 'update'
                ? 'bg-emerald-900 border-emerald-500 text-white'
                : 'bg-slate-900 border-slate-700 text-white'
            }`}
          >
            {/* Progress bar for auto-dismiss via CSS transform */}
            <div
              className={`absolute bottom-0 left-0 right-0 h-1 origin-left ${
                toast.type === 'launch'
                  ? 'bg-indigo-400'
                  : toast.type === 'update'
                  ? 'bg-emerald-400'
                  : 'bg-blue-400'
              }`}
              style={{
                animation: `progress ${toast.duration}ms linear reverse forwards`
              }}
            />

            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                toast.type === 'launch'
                  ? 'bg-indigo-500 text-white'
                  : toast.type === 'update'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-blue-500 text-white'
              }`}
            >
              {toast.type === 'launch' && <Rocket className="w-5 h-5" />}
              {toast.type === 'update' && <Sparkles className="w-5 h-5" />}
              {toast.type === 'info' && <Bell className="w-5 h-5" />}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm mb-1 flex items-center gap-2">
                <span>{toast.title}</span>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              aria-label="Fechar notificação"
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
