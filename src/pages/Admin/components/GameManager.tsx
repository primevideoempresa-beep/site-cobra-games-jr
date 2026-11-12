import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
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
  AlertTriangle,
  FileArchive,
  BarChart3,
  CheckCircle2,
  UploadCloud,
  ChevronRight
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
import { db, auth } from '../../../lib/firebase';
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
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipValidation, setZipValidation] = useState<{ valid: boolean; error?: string } | null>(null);

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
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    };
  }, []);

  const handleOpenModal = (game?: Game) => {
    setZipFile(null);
    setZipValidation(null);
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

  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    hasIndex: boolean;
    missingAssets: string[];
    dangerousFiles: string[];
    totalFiles: number;
    size: number;
    isApto: boolean;
  } | null>(null);

  const handleZipChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      setZipValidation({ valid: false, error: 'O arquivo deve ser um ZIP.' });
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);
    try {
      const formData = new FormData();
      formData.append('zip', file);

      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/games/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro na verificação');
      }

      const result = await response.json();
      setVerificationResult(result);
      
      if (result.isApto) {
        setZipFile(file);
        setZipValidation({ valid: true });
        toast.success('ZIP validado com sucesso!');
      } else {
        setZipValidation({ valid: false, error: 'O jogo possui falhas críticas.' });
        toast.error('Falha na verificação automática.');
      }
    } catch (err: any) {
      setZipValidation({ valid: false, error: err.message });
      toast.error('Erro ao verificar ZIP.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.category) {
      toast.error('Título e Categoria são obrigatórios');
      return;
    }

    setIsSaving(true);
    try {
      let finalIframeUrl = formData.iframeUrl;

      // If a new ZIP is provided, upload and extract it
      if (zipFile) {
        const uploadData = new FormData();
        uploadData.append('zip', zipFile);
        uploadData.append('title', formData.title);

        const idToken = await auth.currentUser?.getIdToken();
        const uploadRes = await fetch('/api/games/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`
          },
          body: uploadData,
        });

        if (!uploadRes.ok) {
          const error = await uploadRes.json();
          throw new Error(error.error || 'Erro no upload do jogo');
        }

        const uploadResult = await uploadRes.json();
        finalIframeUrl = uploadResult.iframeUrl;
      }

      if (editingGame) {
        await updateDoc(doc(db, 'games', editingGame.id), {
          ...formData,
          iframeUrl: finalIframeUrl,
          updatedAt: serverTimestamp()
        });
        toast.success('Jogo atualizado com sucesso');
      } else {
        await addDoc(collection(db, 'games'), {
          ...formData,
          iframeUrl: finalIframeUrl,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast.success('Jogo adicionado com sucesso');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error saving game:', err);
      toast.error(err.message || 'Erro ao salvar jogo.');
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
      toast.error('Erro ao excluir jogo.');
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
        toast.warning(`Jogo "${game.title}" em MANUTENÇÃO!`);
      } else {
        toast.success(`Jogo "${game.title}" reativado!`);
      }
    } catch (err: any) {
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
      <p className="font-bold uppercase tracking-widest text-xs">Sincronizando Catálogo...</p>
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
          type="button"
          onClick={() => handleOpenModal()}
          className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Novo Jogo</span>
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-zinc-500 text-[10px] uppercase tracking-widest border-b border-zinc-800 bg-zinc-800/20">
                <th className="px-6 py-4 font-black">Capa</th>
                <th className="px-6 py-4 font-black">Título / Categoria</th>
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
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => toggleFeatured(game)}
                      className={`p-2 rounded-xl transition-all ${game.isFeatured ? 'bg-orange-500/10 text-orange-500' : 'text-zinc-700 hover:text-zinc-400'}`}
                    >
                      <Star className={`w-5 h-5 ${game.isFeatured ? 'fill-current' : ''}`} />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => toggleMaintenance(game)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition-all",
                        game.isUnderMaintenance ? "bg-amber-500/20 text-amber-300" : "bg-zinc-800 text-zinc-500"
                      )}
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>{game.isUnderMaintenance ? 'Ativado' : 'Desativado'}</span>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        type="button"
                        onClick={() => handleOpenModal(game)}
                        className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                        aria-label={`Editar ${game.title}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          if (deletingId === game.id) {
                            if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
                            handleDelete(game.id);
                          } else {
                            setDeletingId(game.id);
                            if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
                            deleteTimerRef.current = setTimeout(() => setDeletingId(null), 3000);
                          }
                        }}
                        className={cn(
                          "p-2 rounded-lg transition-all flex items-center gap-1",
                          deletingId === game.id ? "bg-red-600 text-white px-3" : "text-zinc-400 hover:text-red-500 hover:bg-red-500/10"
                        )}
                        aria-label={deletingId === game.id ? `Confirmar exclusão de ${game.title}` : `Excluir ${game.title}`}
                      >
                        <Trash2 className="w-4 h-4 shrink-0" />
                        <span className={deletingId === game.id ? "text-[10px] font-black uppercase" : "sr-only"}>
                          {deletingId === game.id ? 'Confirmar?' : 'Excluir'}
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-600 italic text-sm">
                    Nenhum jogo no catálogo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                {/* ZIP Upload Section */}
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest px-1">Upload do Motor de Jogo (Pacote .ZIP)</label>
                  <div className={cn(
                    "relative border-2 border-dashed rounded-[2rem] p-8 transition-all flex flex-col items-center justify-center gap-3",
                    zipValidation?.valid ? "border-emerald-500/50 bg-emerald-500/5" : 
                    zipValidation?.error ? "border-red-500/50 bg-red-500/5" : 
                    "border-zinc-800 hover:border-orange-500/50 bg-zinc-800/30"
                  )}>
                    <input type="file" accept=".zip" onChange={handleZipChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                    {zipValidation?.valid ? (
                      <>
                        <div className="p-4 bg-emerald-500/20 text-emerald-500 rounded-full"><CheckCircle2 className="w-8 h-8" /></div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-white">{zipFile?.name}</p>
                          <p className="text-xs text-emerald-400 mt-1">Pacote validado com sucesso</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={cn("p-4 rounded-full", zipValidation?.error ? "bg-red-500/20 text-red-500" : "bg-zinc-800 text-zinc-500")}>
                          <UploadCloud className="w-8 h-8" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-white">{zipValidation?.error || 'Arraste o arquivo .ZIP do jogo'}</p>
                          <p className="text-xs text-zinc-500 mt-1">O ZIP deve conter um index.html na raiz</p>
                        </div>
                      </>
                    )}
                    {isVerifying && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-[2rem]">
                        <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-2" />
                        <p className="text-xs font-black uppercase text-white">Analisando motor do jogo...</p>
                      </div>
                    )}
                  </div>

                  {/* Automatic Verification Results */}
                  {verificationResult && (
                    <div className={cn(
                      "p-5 rounded-2xl border transition-all animate-in fade-in slide-in-from-top-2 duration-300",
                      verificationResult.isApto ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"
                    )}>
                      <div className="flex items-center gap-2 mb-4">
                        <Info className={cn("w-4 h-4", verificationResult.isApto ? "text-emerald-500" : "text-red-500")} />
                        <h4 className="text-xs font-black uppercase tracking-widest text-zinc-300">Relatório de Verificação</h4>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                          <p className="text-[9px] uppercase font-bold text-zinc-500">Arquivos</p>
                          <p className="text-sm font-black text-white">{verificationResult.totalFiles}</p>
                        </div>
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                          <p className="text-[9px] uppercase font-bold text-zinc-500">Tamanho</p>
                          <p className="text-sm font-black text-white">{(verificationResult.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                          <p className="text-[9px] uppercase font-bold text-zinc-500">Entry Point</p>
                          <p className={cn("text-sm font-black", verificationResult.hasIndex ? "text-emerald-500" : "text-red-500")}>
                            {verificationResult.hasIndex ? 'OK' : 'AUSENTE'}
                          </p>
                        </div>
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                          <p className="text-[9px] uppercase font-bold text-zinc-500">Segurança</p>
                          <p className={cn("text-sm font-black", verificationResult.dangerousFiles.length === 0 ? "text-emerald-500" : "text-red-500")}>
                            {verificationResult.dangerousFiles.length === 0 ? 'LIMPO' : 'ALERTA'}
                          </p>
                        </div>
                      </div>

                      {verificationResult.dangerousFiles.length > 0 && (
                        <div className="mb-4 p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                          <p className="text-[10px] font-black text-red-400 uppercase mb-2 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Arquivos Potencialmente Perigosos:
                          </p>
                          <ul className="text-[10px] text-red-300/70 space-y-1">
                            {verificationResult.dangerousFiles.map((file, i) => <li key={i}>• {file}</li>)}
                          </ul>
                        </div>
                      )}

                      {verificationResult.missingAssets.length > 0 && (
                        <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                          <p className="text-[10px] font-black text-amber-400 uppercase mb-2 flex items-center gap-1">
                            <Search className="w-3 h-3" /> Recursos Ausentes (Possível Falha):
                          </p>
                          <ul className="text-[10px] text-amber-300/70 space-y-1 max-h-24 overflow-y-auto">
                            {verificationResult.missingAssets.map((asset, i) => <li key={i}>• {asset}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest px-1">Título</label>
                  <input required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest px-1">Categoria</label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50">
                    <option>Ação</option><option>Casual</option><option>Corrida</option><option>Estratégia</option>
                  </select>
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest px-1">Capa do Jogo</label>
                  <div className="flex gap-4">
                    <input value={formData.image} onChange={(e) => setFormData({ ...formData, image: e.target.value })} className="flex-1 bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white text-xs" placeholder="URL ou Upload..." />
                    <label className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-6 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 border border-zinc-700 transition-all">
                      <ImageIcon className="w-4 h-4" /><span>Upload</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => { setFormData({ ...formData, image: reader.result as string }); toast.success('Capa carregada'); };
                          reader.readAsDataURL(file);
                        }
                      }} />
                    </label>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest px-1">Link do Iframe (Entry Point)</label>
                  <input value={formData.iframeUrl} onChange={(e) => setFormData({ ...formData, iframeUrl: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white font-mono text-xs" placeholder="/games/meu-jogo/index.html" />
                </div>

                <div className="md:col-span-2 p-5 rounded-2xl bg-zinc-950/60 border border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-xl", formData.isUnderMaintenance ? "bg-amber-500/20 text-amber-400" : "bg-zinc-800 text-zinc-500")}>
                        <Wrench className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">Modo Manutenção</div>
                        <p className="text-[10px] text-zinc-500">Suspende o acesso público ao jogo</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setFormData({ ...formData, isUnderMaintenance: !formData.isUnderMaintenance })} className={cn("px-4 py-2 rounded-xl font-bold text-xs transition-all", formData.isUnderMaintenance ? "bg-amber-500 text-black" : "bg-zinc-800 text-zinc-400")}>
                      <span>{formData.isUnderMaintenance ? 'Ligado' : 'Desligado'}</span>
                    </button>
                  </div>
                  {formData.isUnderMaintenance && (
                    <input value={formData.maintenanceMessage || ''} onChange={(e) => setFormData({ ...formData, maintenanceMessage: e.target.value })} placeholder="Mensagem de manutenção..." className="w-full bg-zinc-900 border border-amber-500/40 rounded-xl px-4 py-2.5 text-white text-xs" />
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="submit" disabled={isSaving} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2">
                  <span key={isSaving ? 'saving-icon' : 'save-icon'} className="inline-flex items-center">
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  </span>
                  <span>{editingGame ? 'Salvar Alterações' : 'Publicar Jogo'}</span>
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-4 rounded-2xl font-black transition-all">
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
