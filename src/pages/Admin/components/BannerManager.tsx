import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Loader2, 
  LayoutDashboard,
  Eye,
  Image as ImageIcon,
  Link as LinkIcon,
  Sparkles,
  Flame,
  LayoutGrid
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
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

interface Banner {
  id: string;
  badge: string;
  badgeColor: string;
  badgeIcon: 'sparkles' | 'flame' | 'grid';
  title: string;
  highlight: string;
  description: string;
  imageUrl: string;
  targetId: string;
  ctaText: string;
  category: string;
  active: boolean;
  order: number;
}

export const BannerManager = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Banner>>({
    badge: '',
    badgeColor: 'from-blue-500 to-cyan-500',
    badgeIcon: 'sparkles',
    title: '',
    highlight: '',
    description: '',
    imageUrl: '',
    targetId: 'jogos',
    ctaText: 'Ver Jogo',
    category: '',
    active: true,
    order: 0
  });

  useEffect(() => {
    const q = query(collection(db, 'banners'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setBanners(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    };
  }, []);

  const handleOpenModal = (banner?: Banner) => {
    if (banner) {
      setEditingBanner(banner);
      setFormData({ ...banner });
    } else {
      setEditingBanner(null);
      setFormData({
        badge: 'NOVIDADE',
        badgeColor: 'from-orange-500 to-red-600',
        badgeIcon: 'flame',
        title: '',
        highlight: '',
        description: '',
        imageUrl: '',
        targetId: 'jogos',
        ctaText: 'Jogar Agora',
        category: '',
        active: true,
        order: banners.length
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.imageUrl) {
      toast.error('Título e URL da Imagem são obrigatórios');
      return;
    }

    setIsSaving(true);
    try {
      if (editingBanner) {
        await updateDoc(doc(db, 'banners', editingBanner.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
        toast.success('Banner atualizado com sucesso');
      } else {
        await addDoc(collection(db, 'banners'), {
          ...formData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast.success('Banner adicionado com sucesso');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error saving banner:', err);
      toast.error('Erro ao salvar banner. Verifique suas permissões de administrador.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickUpload = async (id: string, file?: File) => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await updateDoc(doc(db, 'banners', id), {
          imageUrl: reader.result as string,
          updatedAt: serverTimestamp()
        });
        toast.success('Banner atualizado com sucesso');
      } catch (err: any) {
        console.error('Error updating banner image:', err);
        toast.error('Erro ao atualizar imagem');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'banners', id));
      toast.success('Banner removido');
      setDeletingId(null);
    } catch (err: any) {
      console.error('Error deleting banner:', err);
      toast.error('Erro ao excluir banner. Verifique suas permissões de administrador.');
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'sparkles': return <Sparkles className="w-4 h-4" />;
      case 'flame': return <Flame className="w-4 h-4" />;
      case 'grid': return <LayoutGrid className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
      <Loader2 className="w-8 h-8 animate-spin mb-4" />
      <p className="font-bold uppercase tracking-widest text-xs">Carregando banners...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-white">Carrossel de Banners</h3>
        <button 
          type="button"
          onClick={() => handleOpenModal()}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Novo Banner</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {banners.length > 0 ? banners.map((banner) => (
          <div key={banner.id} className="bg-zinc-900 border border-zinc-800 rounded-[2rem] overflow-hidden group">
            <label className="aspect-[16/9] relative block overflow-hidden bg-zinc-800 cursor-pointer group/upload">
              {banner.imageUrl ? (
                <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover group-hover/upload:opacity-50 transition-all duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-700">
                  <ImageIcon className="w-12 h-12" />
                </div>
              )}
              
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/upload:opacity-100 bg-black/40 transition-opacity">
                <div className="flex flex-col items-center gap-2">
                  <Plus className="w-8 h-8 text-white" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Alterar Imagem</span>
                </div>
              </div>

              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => handleQuickUpload(banner.id, e.target.files?.[0])}
              />

              <div className="absolute top-4 left-4 flex gap-2">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black text-white uppercase bg-gradient-to-r ${banner.badgeColor}`}>
                  {banner.badge}
                </span>
                {!banner.active && (
                  <span className="px-3 py-1 rounded-full text-[10px] font-black text-white uppercase bg-red-500/50 backdrop-blur-md">
                    Inativo
                  </span>
                )}
              </div>
            </label>
            <div className="p-6">
              <h4 className="text-white font-bold mb-2 line-clamp-1">{banner.title}</h4>
              <p className="text-zinc-500 text-xs line-clamp-2 mb-4 h-8">{banner.description}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400">
                    {getIcon(banner.badgeIcon)}
                  </div>
                  <span className="text-[10px] text-zinc-600 font-black uppercase tracking-tighter">Ordem: {banner.order}</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => handleOpenModal(banner)}
                    className="p-2.5 bg-zinc-800 hover:bg-blue-500/20 text-zinc-400 hover:text-blue-400 rounded-xl transition-all"
                    aria-label={`Editar ${banner.title}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      if (deletingId === banner.id) {
                        if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
                        handleDelete(banner.id);
                      } else {
                        setDeletingId(banner.id);
                        if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
                        deleteTimerRef.current = setTimeout(() => setDeletingId(null), 3000);
                      }
                    }}
                    className={cn(
                      "p-2.5 rounded-xl transition-all flex items-center gap-2",
                      deletingId === banner.id 
                        ? "bg-red-600 text-white px-4" 
                        : "bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-500"
                    )}
                    title={deletingId === banner.id ? "Confirmar Exclusão" : "Excluir"}
                  >
                    <Trash2 className="w-4 h-4 shrink-0" />
                    <span className={deletingId === banner.id ? "text-[10px] font-black uppercase" : "sr-only"}>
                      {deletingId === banner.id ? 'Confirmar?' : 'Excluir'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-20 text-center text-zinc-600 bg-zinc-900/50 border border-zinc-800 border-dashed rounded-[3rem]">
            <LayoutDashboard className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-bold uppercase tracking-widest text-xs">Nenhum banner cadastrado</p>
          </div>
        )}
      </div>

      {/* Modal Banner */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-800/30">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 rounded-2xl">
                  <LayoutDashboard className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-black text-white">{editingBanner ? 'Editar Banner' : 'Novo Banner'}</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-zinc-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest px-1">Título do Banner</label>
                  <input 
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest px-1">Texto da Badge (Ex: LANÇAMENTO)</label>
                  <input 
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest px-1">Cor da Badge (Tailwind Gradient)</label>
                  <input 
                    value={formData.badgeColor}
                    onChange={(e) => setFormData({ ...formData, badgeColor: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none font-mono text-xs"
                    placeholder="from-blue-500 to-cyan-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest px-1">Ícone da Badge</label>
                  <select 
                    value={formData.badgeIcon}
                    onChange={(e) => setFormData({ ...formData, badgeIcon: e.target.value as any })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none"
                  >
                    <option value="sparkles">Brilho (Lançamento)</option>
                    <option value="flame">Fogo (Novidade)</option>
                    <option value="grid">Grade (Categorias)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest px-1">Destaque (Texto Menor)</label>
                  <input 
                    value={formData.highlight}
                    onChange={(e) => setFormData({ ...formData, highlight: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest px-1">Descrição</label>
                  <textarea 
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none resize-none"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest px-1">Imagem do Banner</label>
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-4">
                      <input 
                        required
                        value={formData.imageUrl}
                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none font-mono text-xs"
                        placeholder="URL da Imagem ou Upload..."
                      />
                      <label className="cursor-pointer bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 px-6 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 border border-blue-500/20 transition-all active:scale-95">
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
                                setFormData({ ...formData, imageUrl: reader.result as string });
                                toast.success('Imagem carregada com sucesso');
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                    {formData.imageUrl && (
                      <div className="relative w-full aspect-[16/5] rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-800/50">
                        <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => setFormData({ ...formData, imageUrl: '' })}
                          className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-red-500 text-white rounded-full transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest px-1">Alvo (ID do Elemento: jogos, categorias...)</label>
                  <input 
                    value={formData.targetId}
                    onChange={(e) => setFormData({ ...formData, targetId: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest px-1">Texto do Botão (CTA)</label>
                  <input 
                    value={formData.ctaText}
                    onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest px-1">Ordem</label>
                  <input 
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-4 px-2 pt-6">
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, active: !formData.active })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${formData.active ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}
                  >
                    <Eye className="w-4 h-4" />
                    <span>{formData.active ? 'Ativo' : 'Inativo'}</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <span key={isSaving ? 'saving-icon' : 'save-icon'} className="inline-flex items-center">
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  </span>
                  <span>{editingBanner ? 'Atualizar Banner' : 'Criar Banner'}</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-4 rounded-2xl font-black transition-all active:scale-95"
                >
                  <span>Cancelar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
