import React from 'react';
import { 
  LayoutDashboard, 
  Activity, 
  Users, 
  Gamepad2, 
  BarChart3, 
  History, 
  Settings, 
  ShieldCheck, 
  LogOut,
  ChevronRight,
  X
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const menuItems = [
  { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'manage_games', label: 'Gerenciar Jogos', icon: Gamepad2 },
  { id: 'manage_banners', label: 'Gerenciar Banners', icon: LayoutDashboard },
  { id: 'game_stats', label: 'Estatísticas dos Jogos', icon: BarChart3 },
  { id: 'realtime', label: 'Acessos em Tempo Real', icon: Activity },
  { id: 'visitors', label: 'Visitantes', icon: Users },
  { id: 'activity', label: 'Eventos e Atividades', icon: History },
  { id: 'system_test', label: 'Auditoria & Testes', icon: ShieldCheck },
  { id: 'security', label: 'Segurança & 2FA', icon: ShieldCheck },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

export const Sidebar = React.memo<SidebarProps>(({ activeTab, setActiveTab, onLogout, isOpen, onClose }) => {
  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      <div className={cn(
        "w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col h-screen fixed left-0 top-0 z-[70] transition-transform duration-300 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h1 className="text-white font-black text-xl tracking-tight flex flex-col">
            <span className="text-orange-500 text-xs uppercase tracking-widest mb-1">Cobra Games Jr</span>
            <span>ADMIN MASTER</span>
          </h1>
          <button 
            onClick={onClose}
            className="lg:hidden p-2 text-zinc-500 hover:text-white"
            aria-label="Fechar menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              if (onClose) onClose();
            }}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group",
              activeTab === item.id 
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" 
                : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
            )}
          >
            <div className="flex items-center gap-3">
              <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-white" : "text-zinc-500 group-hover:text-orange-500")} />
              <span className="font-medium text-sm">{item.label}</span>
            </div>
            {activeTab === item.id && <ChevronRight className="w-4 h-4" />}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-red-500/10 hover:text-red-500 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">Sair do Painel</span>
        </button>
      </div>
    </div>
    </>
  );
});
