import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Star, 
  Gamepad2,
  Save,
  X,
  Loader2,
  Info,
  Image as ImageIcon,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  UploadCloud,
  Cpu
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
import {
  buildPublisherApiUrl,
  isSameOriginStaticFallbackLikely,
  PublisherConfigError,
} from '../../../lib/publisherApi';
import { LoggerService } from '../../../services/logger';
import { toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MAX_ZIP_BYTES = 100 * 1024 * 1024;
const MAX_INLINE_IMAGE_BYTES = 700 * 1024; // ~700 KB raw (~935 KB base64) to stay safely under Firestore's 1 MB doc limit

function validateInlineImageFile(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return 'Selecione um arquivo de imagem válido (PNG, JPG, WebP, SVG).';
  }
  if (file.size > MAX_INLINE_IMAGE_BYTES) {
    return 'A imagem excede o limite de 700 KB para salvamento direto. Reduza o tamanho ou informe uma URL externa.';
  }
  return null;
}

class PublishClientError extends Error {
  details?: string;
  code?: string;
  status?: number;

  constructor(message: string, details?: string, code?: string, status?: number) {
    super(message);
    this.name = 'PublishClientError';
    this.details = details;
    this.code = code;
    this.status = status;
  }
}

async function safeReadJsonResponse<T = any>(
  response: Response,
  actionLabel: string,
  targetUrl?: string
): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  const rawText = await response.text();

  let parsed: any = null;
  let isJson = false;

  if (rawText && rawText.trim().length > 0) {
    const trimmed = rawText.trim();
    if (contentType.includes('application/json') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        parsed = JSON.parse(trimmed);
        isJson = true;
      } catch {
        isJson = false;
      }
    }
  }

  if (!isJson) {
    const cleanPreview = rawText
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200);

    await LoggerService.logError(
      `Resposta não-JSON ao ${actionLabel} (HTTP ${response.status})`,
      {
        status: response.status,
        contentType,
        targetUrl,
        preview: cleanPreview || 'Resposta vazia',
      },
      'general'
    );

    if (response.status === 413) {
      throw new PublishClientError(
        'O arquivo ZIP excede o tamanho máximo permitido pelo servidor (100 MB).',
        cleanPreview,
        'PAYLOAD_TOO_LARGE',
        413
      );
    }
    if (response.status === 502 || response.status === 504) {
      throw new PublishClientError(
        `Tempo esgotado ou falha de comunicação com o servidor ao ${actionLabel} (HTTP ${response.status}).`,
        cleanPreview,
        'GATEWAY_ERROR',
        response.status
      );
    }
    if (response.status === 404) {
      const missingApiEnvHint = isSameOriginStaticFallbackLikely()
        ? 'Variável VITE_PUBLISHER_API_URL não configurada no build de produção; configure-a apontando para o backend Railway.'
        : targetUrl
        ? `Endpoint consultado: ${targetUrl}`
        : undefined;
      throw new PublishClientError(
        `Serviço de publicação indisponível neste endereço (HTTP 404). Verifique se o servidor backend está ativo e configurado.`,
        [missingApiEnvHint, cleanPreview].filter(Boolean).join('\n'),
        'ENDPOINT_NOT_FOUND',
        404
      );
    }

    throw new PublishClientError(
      `O servidor retornou uma resposta inesperada (HTTP ${response.status}) ao ${actionLabel}.`,
      cleanPreview || undefined,
      'INVALID_SERVER_RESPONSE',
      response.status
    );
  }

  if (!response.ok) {
    const errMsg = parsed?.error || parsed?.message || `Erro HTTP ${response.status} ao ${actionLabel}.`;
    const errDetails = typeof parsed?.details === 'string' ? parsed.details : undefined;
    const errCode = typeof parsed?.code === 'string' ? parsed.code : `HTTP_${response.status}`;

    await LoggerService.logError(
      `Erro ao ${actionLabel}: ${errMsg}`,
      {
        status: response.status,
        code: errCode,
        details: errDetails?.slice(0, 400),
      },
      'general'
    );

    throw new PublishClientError(errMsg, errDetails, errCode, response.status);
  }

  return parsed as T;
}

async function postToPublisherApi<T = any>(
  endpoint: string,
  formData: FormData,
  idToken: string,
  actionLabel: string
): Promise<T> {
  const targetUrl = buildPublisherApiUrl(endpoint);
  let response: Response;

  try {
    response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      body: formData,
    });
  } catch (networkErr: any) {
    const rawMsg = String(networkErr?.message || networkErr || '');
    throw new PublishClientError(
      `Não foi possível conectar ao servidor de publicação ao ${actionLabel}. Verifique se o backend Railway está online, se VITE_PUBLISHER_API_URL está correto e se o domínio atual está liberado no CORS.`,
      rawMsg ? `Destino: ${targetUrl}\nDetalhe: ${rawMsg}` : `Destino: ${targetUrl}`,
      'NETWORK_ERROR'
    );
  }

  return safeReadJsonResponse<T>(response, actionLabel, targetUrl);
}

interface VerificationResult {
  hasIndex: boolean;
  hasPackageJson?: boolean;
  projectType?: 'html5' | 'react-vite' | 'invalid';
  projectTypeLabel?: string;
  detectedRoot?: string | null;
  requiresBuild?: boolean;
  buildScript?: string | null;
  missingAssets: string[];
  dangerousFiles: string[];
  totalFiles: number;
  size: number;
  isApto: boolean;
  errorMessage?: string;
  warnings?: string[];
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
  const [publishError, setPublishError] = useState<{ message: string; details?: string } | null>(null);

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

  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  const handleOpenModal = (game?: Game) => {
    setZipFile(null);
    setZipValidation(null);
    setVerificationResult(null);
    setPublishError(null);
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

  const handleZipChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setPublishError(null);
    setZipFile(null);

    if (!file.name.toLowerCase().endsWith('.zip')) {
      setZipValidation({ valid: false, error: 'O arquivo selecionado deve ter extensão .zip.' });
      setVerificationResult(null);
      return;
    }

    if (file.size > MAX_ZIP_BYTES) {
      setZipValidation({ valid: false, error: 'O arquivo ZIP excede o limite máximo de 100 MB.' });
      setVerificationResult(null);
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);
    setZipValidation(null);

    try {
      const uploadForm = new FormData();
      uploadForm.append('zip', file);

      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new PublishClientError('Sessão administrativa expirada. Faça login novamente.');
      }

      const result = await postToPublisherApi<VerificationResult>(
        '/api/games/verify',
        uploadForm,
        idToken,
        'verificar o pacote ZIP'
      );
      setVerificationResult(result);

      if (result.isApto) {
        setZipFile(file);
        setZipValidation({ valid: true });
        toast.success('Jogo HTML5 validado com sucesso!');
      } else {
        const errorMsg = result.errorMessage || 'O pacote ZIP não atende aos requisitos de publicação.';
        setZipValidation({ valid: false, error: errorMsg });
        toast.error(errorMsg);
      }
    } catch (err: any) {
      const msg = err?.message || 'Erro ao verificar o arquivo ZIP.';
      const details =
        err instanceof PublishClientError || err instanceof PublisherConfigError
          ? err.details
          : undefined;
      setZipValidation({ valid: false, error: msg });
      setPublishError({
        message: msg,
        details,
      });
      toast.error(msg);
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
    setPublishError(null);
    let pendingPublish: { publishId: string; idToken: string } | null = null;
    let firestoreCommitted = false;

    try {
      let finalIframeUrl = formData.iframeUrl;

      // If a new ZIP is provided, verify/compile (if React/Vite) and publish it
      if (zipFile) {
        const uploadData = new FormData();
        uploadData.append('zip', zipFile);
        uploadData.append('title', formData.title);

        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) {
          throw new PublishClientError('Sessão administrativa expirada. Faça login novamente.');
        }

        const uploadResult = await postToPublisherApi<{
          success: boolean;
          publishId?: string;
          slug: string;
          iframeUrl: string;
          compiled?: boolean;
          projectTypeLabel?: string;
          storageSynced?: boolean;
          storageWarning?: string;
          error?: string;
        }>('/api/games/upload', uploadData, idToken, 'publicar o jogo');

        if (!uploadResult.success || !uploadResult.iframeUrl) {
          throw new PublishClientError(
            uploadResult.error || 'O servidor não confirmou a publicação do jogo no Firebase Storage.',
            undefined,
            'PUBLISH_UNCONFIRMED'
          );
        }

        if (uploadResult.publishId) {
          pendingPublish = { publishId: uploadResult.publishId, idToken };
        }

        finalIframeUrl = uploadResult.iframeUrl;

        if (uploadResult.storageWarning) {
          toast.warning(uploadResult.storageWarning);
        }
      }

      const { id: _ignoredId, ...formFields } = formData;
      const cleanPayload = Object.fromEntries(
        Object.entries({
          ...formFields,
          iframeUrl: finalIframeUrl || '',
        }).filter(([, value]) => value !== undefined)
      );

      let savedDocId: string | undefined;
      if (editingGame) {
        await updateDoc(doc(db, 'games', editingGame.id), {
          ...cleanPayload,
          updatedAt: serverTimestamp()
        });
        savedDocId = editingGame.id;
        firestoreCommitted = true;
      } else {
        const createdRef = await addDoc(collection(db, 'games'), {
          ...cleanPayload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        savedDocId = createdRef.id;
        firestoreCommitted = true;
      }

      if (pendingPublish) {
        try {
          const confirmUrl = buildPublisherApiUrl(
            `/api/games/publish/${encodeURIComponent(pendingPublish.publishId)}/confirm`
          );
          await fetch(confirmUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${pendingPublish.idToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ firestoreDocId: savedDocId }),
          });
        } catch (confirmErr) {
          console.warn('Confirmação de limpeza de backup adiada (jogo salvo no Firestore):', confirmErr);
        }
      }

      toast.success(editingGame ? 'Jogo atualizado com sucesso' : 'Jogo adicionado com sucesso');
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error saving game:', err);
      let rollbackNotice: string | undefined;

      if (pendingPublish && !firestoreCommitted) {
        try {
          const rollbackUrl = buildPublisherApiUrl(
            `/api/games/publish/${encodeURIComponent(pendingPublish.publishId)}/rollback`
          );
          const rbRes = await fetch(rollbackUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${pendingPublish.idToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reason: 'FIRESTORE_WRITE_FAILED' }),
          });
          if (rbRes.ok) {
            rollbackNotice = 'A versão anterior do jogo foi restaurada automaticamente após falha no Firestore.';
          }
        } catch (rollbackErr) {
          console.error('Falha ao acionar rollback automático:', rollbackErr);
        }
      }

      const message = err?.message || 'Erro ao salvar jogo.';
      const rawDetails =
        err instanceof PublishClientError || err instanceof PublisherConfigError
          ? err.details
          : undefined;
      const details = [rawDetails, rollbackNotice].filter(Boolean).join('\n') || undefined;

      setPublishError({ message, details });
      await LoggerService.logError(
        `Falha ao publicar jogo "${formData.title}": ${message}`,
        { details: details?.slice(0, 400) },
        'general'
      );
      toast.error(rollbackNotice ? `${message} ${rollbackNotice}` : message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickUpload = async (id: string, field: 'image' | 'icon', file?: File) => {
    if (!file) return;
    const validationError = validateInlineImageFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

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
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          handleQuickUpload(game.id, 'image', file);
                        }}
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
                  {isSameOriginStaticFallbackLikely() && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-amber-200">
                      <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs leading-relaxed">
                        A publicação de novos pacotes <span className="font-mono font-bold">.ZIP</span> aguarda a configuração da variável <span className="font-mono font-bold">VITE_PUBLISHER_API_URL</span>. Você pode cadastrar e editar normalmente título, categoria, capa, link existente e modo manutenção no catálogo.
                      </p>
                    </div>
                  )}
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
                          <p className="text-xs text-emerald-400 mt-1">
                            Pacote HTML5 compilado validado com sucesso
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={cn("p-4 rounded-full", zipValidation?.error ? "bg-red-500/20 text-red-500" : "bg-zinc-800 text-zinc-500")}>
                          <UploadCloud className="w-8 h-8" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-white">{zipValidation?.error || 'Arraste o arquivo .ZIP do jogo'}</p>
                          <p className="text-xs text-zinc-500 mt-1">Aceita jogos HTML5 já compilados com index.html na raiz e seus recursos (ex.: conteúdo da pasta dist/)</p>
                        </div>
                      </>
                    )}
                    {isVerifying && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-[2rem]">
                        <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-2" />
                        <p className="text-xs font-black uppercase text-white">Analisando pacote do jogo...</p>
                      </div>
                    )}
                  </div>

                  {/* Automatic Verification Results */}
                  {verificationResult && (
                    <div className={cn(
                      "p-5 rounded-2xl border transition-all animate-in fade-in slide-in-from-top-2 duration-300",
                      verificationResult.isApto ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"
                    )}>
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
                        <div className="flex items-center gap-2">
                          <Info className={cn("w-4 h-4", verificationResult.isApto ? "text-emerald-500" : "text-red-500")} />
                          <h4 className="text-xs font-black uppercase tracking-widest text-zinc-300">Relatório de Verificação</h4>
                        </div>
                        {verificationResult.projectTypeLabel && (
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase",
                            verificationResult.requiresBuild
                              ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                              : verificationResult.isApto
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              : "bg-red-500/15 text-red-300 border border-red-500/30"
                          )}>
                            <Cpu className="w-3 h-3" />
                            <span>{verificationResult.projectTypeLabel}</span>
                          </span>
                        )}
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
                          <p className="text-[9px] uppercase font-bold text-zinc-500">
                            Entry Point
                          </p>
                          <p className={cn("text-sm font-black", (!verificationResult.requiresBuild && verificationResult.hasIndex) ? "text-emerald-500" : "text-red-500")}>
                            {verificationResult.requiresBuild
                              ? 'BUILD LOCAL'
                              : (verificationResult.hasIndex ? 'OK' : 'AUSENTE')}
                          </p>
                        </div>
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                          <p className="text-[9px] uppercase font-bold text-zinc-500">Segurança</p>
                          <p className={cn("text-sm font-black", verificationResult.dangerousFiles.length === 0 ? "text-emerald-500" : "text-red-500")}>
                            {verificationResult.dangerousFiles.length === 0 ? 'LIMPO' : 'ALERTA'}
                          </p>
                        </div>
                      </div>

                      {verificationResult.warnings && verificationResult.warnings.length > 0 && (
                        <div className="mb-3 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                          <ul className="text-[11px] text-blue-200/80 space-y-1">
                            {verificationResult.warnings.map((w, i) => <li key={i}>• {w}</li>)}
                          </ul>
                        </div>
                      )}

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

                  {publishError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl space-y-2">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-red-300">{publishError.message}</p>
                        </div>
                      </div>
                      {publishError.details && (
                        <pre className="text-[10px] font-mono text-red-200/80 bg-black/50 border border-red-500/20 rounded-xl p-3 max-h-40 overflow-y-auto whitespace-pre-wrap break-words">
                          {publishError.details}
                        </pre>
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
                        e.target.value = '';
                        if (file) {
                          const validationError = validateInlineImageFile(file);
                          if (validationError) {
                            toast.error(validationError);
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFormData((prev) => ({ ...prev, image: reader.result as string }));
                            toast.success('Capa carregada');
                          };
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
                  <span>
                    {isSaving
                      ? 'Publicando...'
                      : (editingGame ? 'Salvar Alterações' : 'Publicar Jogo')}
                  </span>
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
