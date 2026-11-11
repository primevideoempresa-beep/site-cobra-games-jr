import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  ExternalLink, 
  Star, 
  Gamepad2,
  Save,
  X,
  Loader2,
  Eye,
  Info,
  Image as ImageIcon,
  Wrench,
  AlertTriangle
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Game {
  id: string;
  title: string;
  description?: string;
  stats?: string;
  category: string;
  image?: string;
  icon?: string;
  isFeatured?: boolean;
  isUnderMaintenance?: boolean;
  maintenanceMessage?: string;
  playStoreUrl?: string;
  appStoreUrl?: string;
  iframeUrl?: string;
  version?: string;
  order?: number;
}

export const GameManager = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Game>>({
    title: '',
    category: 'Ação',
    description: '',
    stats: '',
    image: '',
    icon: '',
    isFeatured: false,
    isUnderMaintenance: false,
    maintenanceMessage: '',
    playStoreUrl: '',
    appStoreUrl: '',
    iframeUrl: '',
    version: '1.0.0',
    order: 0
  });

  useEffect(() => {
    const q = query(collection(db, 'games'), orderBy('order', 'asc'), orderBy('title', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setGames(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Game)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleOpenModal = (game?: Game) => {
    if (game) {
      setEditingGame(game);
      setFormData({
        ...game,
        isUnderMaintenance: game.isUnderMaintenance || false,
        maintenanceMessage: game.maintenanceMessage || ''
      });
    } else {
      setEditingGame(null);
      setFormData({
        title: '',
        category: 'Ação',
        description: '',
        stats: '',
        image: '',
        icon: '',
        isFeatured: false,
        isUnderMaintenance: false,
        maintenanceMessage: '',
        playStoreUrl: '',
        appStoreUrl: '',
        iframeUrl: '',
        version: '1.0.0',
        order: games.length
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.category) {
      toast.error('Título e Categoria são obrigatórios');
      return;
    }

    setIsSaving(true);
    try {
      if (editingGame) {
        await updateDoc(doc(db, 'games', editingGame.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
        toast.success('Jogo atualizado com sucesso');
      } else {
        await addDoc(collection(db, 'games'), {
          ...formData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast.success('Jogo adicionado com sucesso');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error saving game:', err);
      toast.error('Erro ao salvar jogo. Verifique suas permissões de administrador.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickUpload = async (id: string, field: 'image' | 'icon', file?: File) => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await updateDoc(doc(db, 'games', id), {
          [field]: reader.result as string,
          updatedAt: serverTimestamp()
        });
        toast.success(`${field === 'image' ? 'Capa' : 'Ícone'} atualizado com sucesso`);
      } catch (err: any) {
        console.error('Error updating game image:', err);
        toast.error('Erro ao atualizar imagem');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'games', id));
      toast.success('Jogo excluído com sucesso');
      setDeletingId(null);
    } catch (err: any) {
      console.error('Error deleting game:', err);
      toast.error('Erro ao excluir jogo. Verifique suas permissões de administrador.');
    }
  };

  const toggleFeatured = async (game: Game) => {
    try {
      await updateDoc(doc(db, 'games', game.id), {
        isFeatured: !game.isFeatured
      });
      toast.success(`Jogo ${!game.isFeatured ? 'destacado' : 'removido dos destaques'}`);
    } catch (err) {
      toast.error('Erro ao atualizar destaque');
    }
  };

  const toggleMaintenance = async (game: Game) => {
    try {
      const nextState = !game.isUnderMaintenance;
      await updateDoc(doc(db, 'games', game.id), {
        isUnderMaintenance: nextState,
        updatedAt: serverTimestamp()
      });
      if (nextState) {
        toast.warning(`Jogo "${game.title}" colocado em MANUTENÇÃO!`, {
          description: 'Os usuários verão o aviso de manutenção e não poderão iniciar o jogo.'
        });
      } else {
        toast.success(`Jogo "${game.title}" reativado!`, {
          description: 'Manutenção encerrada, jogo liberado para os jogadores.'
        });
      }
    } catch (err: any) {
      console.error('Error toggling maintenance:', err);
      toast.error('Erro ao alterar status de manutenção');
    }
  };

  const filteredGames = games.filter(g => 
    g.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    g.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
      <Loader2 className="w-8 h-8 animate-spin mb-4" />
      <p className="font-bold uppercase tracking-widest text-xs">Carregando catálogo...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Buscar por título ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-orange-500/50 transition-all"
          />
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Adicionar Jogo
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-zinc-500 text-[10px] uppercase tracking-widest border-b border-zinc-800 bg-zinc-800/20">
                <th className="px-6 py-4 font-black">Capa</th>
                <th className="px-6 py-4 font-black">Título / Categoria</th>
                <th className="px-6 py-4 font-black">Stats</th>
                <th className="px-6 py-4 font-black text-center">Destaque</th>
                <th className="px-6 py-4 font-black text-center">Manutenção</th>
                <th className="px-6 py-4 font-black text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredGames.length > 0 ? filteredGames.map((game) => (
                <tr key={game.id} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <label className="cursor-pointer group/upload relative block w-12 h-12 bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700/50 flex items-center justify-center transition-all hover:border-orange-500/50">
                      {game.image ? (
                        <img src={game.image} alt={game.title} className="w-full h-full object-cover group-hover/upload:opacity-50 transition-opacity" />
                      ) : (
                        <Gamepad2 className="w-6 h-6 text-zinc-600" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/upload:opacity-100 bg-black/40 transition-opacity">
                        <Plus className="w-5 h-5 text-white" />
                      </div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleQuickUpload(game.id, 'image', e.target.files?.[0])}
                      />
                    </label>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm group-hover:text-orange-500 transition-colors">{game.title}</span>
                      {game.isUnderMaintenance && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-wider shadow-sm">
                          <Wrench className="w-2.5 h-2.5" /> Manutenção
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-black uppercase text-zinc-600 mt-0.5 tracking-tighter">{game.category}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-zinc-400 font-medium truncate max-w-[200px]">{game.stats || '---'}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => toggleFeatured(game)}
                      className={`p-2 rounded-xl transition-all ${game.isFeatured ? 'bg-orange-500/10 text-orange-500' : 'text-zinc-700 hover:text-zinc-400'}`}
                      title={game.isFeatured ? "Remover dos destaques" : "Destacar jogo"}
                    >
                      <Star className={`w-5 h-5 ${game.isFeatured ? 'fill-current' : ''}`} />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => toggleMaintenance(game)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition-all active:scale-95",
                        game.isUnderMaintenance 
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-lg shadow-amber-500/10 hover:bg-amber-500/30" 
                          : "bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700/80 border border-zinc-700/40"
                      )}
                      title={game.isUnderMaintenance ? "Jogo atualmente em MANUTENÇÃO. Clique para reativar e liberar para os usuários." : "Jogo operacional. Clique para colocar em MANUTENÇÃO no site."}
                    >
                      <Wrench className={cn("w-3.5 h-3.5", game.isUnderMaintenance ? "text-amber-400 animate-pulse" : "text-zinc-500")} />
                      <span>{game.isUnderMaintenance ? 'Em Manutenção' : 'Operacional'}</span>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleOpenModal(game)}
                        className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          if (deletingId === game.id) {
                            handleDelete(game.id);
                          } else {
                            setDeletingId(game.id);
                            setTimeout(() => setDeletingId(null), 3000);
                          }
                        }}
                        className={cn(
                          "p-2 rounded-lg transition-all flex items-center gap-1",
                          deletingId === game.id 
                            ? "bg-red-600 text-white px-3" 
                            : "text-zinc-400 hover:text-red-500 hover:bg-red-500/10"
                        )}
                        title={deletingId === game.id ? "Confirmar Exclusão" : "Excluir"}
                      >
                        <Trash2 className="w-4 h-4" />
                        {deletingId === game.id && <span className="text-[10px] font-black uppercase">Confirmar?</span>}
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-600 italic text-sm">
                    Nenhum jogo encontrado no catálogo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Jogo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-800/30">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-500 rounded-2xl">
                  <Gamepad2 className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-black text-white">{editingGame ? 'Editar Jogo' : 'Novo Jogo'}</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-zinc-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest px-1">Título do Jogo</label>
                  <input 
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest px-1">Categoria</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                  >
                    <option>Ação</option>
                    <option>Casual</option>
                    <option>Corrida</option>
                    <option>Estratégia</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest px-1">Descrição Curta</label>
                  <textarea 
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest px-1">Estatísticas Exibidas (ex: 100M+ downloads)</label>
                  <input 
                    value={formData.stats}
                    onChange={(e) => setFormData({ ...formData, stats: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest px-1">Versão</label>
                  <input 
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest px-1">Imagem de Capa</label>
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-4">
                      <input 
                        value={formData.image}
                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 font-mono text-xs"
                        placeholder="URL da Imagem ou Upload..."
                      />
                      <label className="cursor-pointer bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 px-6 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 border border-orange-500/20 transition-all active:scale-95">
                        <ImageIcon className="w-4 h-4" />
                        <span>Upload</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setFormData({ ...formData, image: reader.result as string });
                                toast.success('Capa carregada');
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                    {formData.image && (
                      <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-800/50">
                        <img src={formData.image} alt="Capa Preview" className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => setFormData({ ...formData, image: '' })}
                          className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-red-500 text-white rounded-full transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest px-1">Ícone do Jogo (1:1)</label>
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-4">
                      <input 
                        value={formData.icon}
                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 font-mono text-xs"
                        placeholder="URL do Ícone ou Upload..."
                      />
                      <label className="cursor-pointer bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 px-6 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 border border-orange-500/20 transition-all active:scale-95">
                        <ImageIcon className="w-4 h-4" />
                        <span>Upload</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setFormData({ ...formData, icon: reader.result as string });
                                toast.success('Ícone carregado');
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                    {formData.icon && (
                      <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-800/50">
                        <img src={formData.icon} alt="Ícone Preview" className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => setFormData({ ...formData, icon: '' })}
                          className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-red-500 text-white rounded-full transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest px-1">Link do Iframe (HTML5 / Local)</label>
                  <input 
                    value={formData.iframeUrl}
                    onChange={(e) => setFormData({ ...formData, iframeUrl: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 font-mono text-xs"
                    placeholder="/my-game.html ou https://..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest px-1">Google Play URL</label>
                  <input 
                    value={formData.playStoreUrl}
                    onChange={(e) => setFormData({ ...formData, playStoreUrl: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 font-mono text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest px-1">App Store URL</label>
                  <input 
                    value={formData.appStoreUrl}
                    onChange={(e) => setFormData({ ...formData, appStoreUrl: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 font-mono text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest px-1">Ordem de Exibição</label>
                  <input 
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                  />
                </div>
                <div className="flex items-center gap-4 px-2 pt-6">
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, isFeatured: !formData.isFeatured })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${formData.isFeatured ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                  >
                    <Star className={`w-4 h-4 ${formData.isFeatured ? 'fill-current' : ''}`} />
                    Destacar Jogo
                  </button>
                </div>

                {/* Bloco de Manutenção do Jogo */}
                <div className="md:col-span-2 p-5 rounded-2xl bg-zinc-950/60 border border-zinc-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "p-2.5 rounded-xl shrink-0 mt-0.5 transition-colors",
                        formData.isUnderMaintenance 
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
                          : "bg-zinc-800 text-zinc-500"
                      )}>
                        <Wrench className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          Status de Manutenção
                          {formData.isUnderMaintenance && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full uppercase font-black tracking-wider">
                              Ativo no Site
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed mt-0.5">
                          Coloque o jogo em manutenção para alertar os usuários no site e suspender o carregamento até o fim dos reparos.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isUnderMaintenance: !formData.isUnderMaintenance })}
                      className={cn(
                        "px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95",
                        formData.isUnderMaintenance
                          ? "bg-amber-500 text-black shadow-lg shadow-amber-500/30"
                          : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700/50"
                      )}
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      {formData.isUnderMaintenance ? 'Em Manutenção (Ligado)' : 'Ativar Manutenção'}
                    </button>
                  </div>

                  {formData.isUnderMaintenance && (
                    <div className="pt-3 border-t border-zinc-800/80 space-y-1.5 animate-in fade-in duration-200">
                      <label className="text-[10px] uppercase font-black text-amber-400 tracking-widest px-1 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Mensagem de Manutenção para os Jogadores (Opcional)
                      </label>
                      <input
                        type="text"
                        value={formData.maintenanceMessage || ''}
                        onChange={(e) => setFormData({ ...formData, maintenanceMessage: e.target.value })}
                        placeholder="Ex: Estamos realizando melhorias técnicas neste jogo. Voltaremos em breve!"
                        className="w-full bg-zinc-900 border border-amber-500/40 rounded-xl px-4 py-2.5 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {editingGame ? 'Atualizar Jogo' : 'Criar Jogo'}
                </button>
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-4 rounded-2xl font-black transition-all active:scale-95"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
