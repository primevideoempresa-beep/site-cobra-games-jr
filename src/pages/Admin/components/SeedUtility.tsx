import React, { useState } from 'react';
import { Database, Download, CheckCircle2, AlertCircle, Loader2, AlertTriangle } from 'lucide-react';
import { collection, addDoc, doc, setDoc, getDocs, query, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { otherGames } from '../../../data';
import { toast } from 'sonner';

export const SeedUtility = () => {
  const [isSeeding, setIsSeeding] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [confirmStep, setConfirmStep] = useState<'initial' | 'existing' | null>(null);
  const [results, setResults] = useState<{ success: boolean; message: string } | null>(null);

  const requestSeedConfirmation = async () => {
    setResults(null);
    setIsChecking(true);
    try {
      const gamesSnap = await getDocs(query(collection(db, 'games'), limit(1)));
      setConfirmStep(gamesSnap.empty ? 'initial' : 'existing');
    } catch (err: any) {
      console.error('Error checking catalog before seed:', err);
      toast.error('Erro ao verificar catálogo no Firestore');
    } finally {
      setIsChecking(false);
    }
  };

  const executeSeedData = async () => {
    setConfirmStep(null);
    setIsSeeding(true);
    setResults(null);

    try {
      // Seed Games preserving canonical IDs from src/data.ts
      let gamesCount = 0;
      for (const game of otherGames) {
        const { id: gameId, ...gameFields } = game;
        const payload = {
          ...gameFields,
          order: gamesCount,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        if (gameId) {
          await setDoc(doc(db, 'games', gameId), payload, { merge: true });
        } else {
          await addDoc(collection(db, 'games'), payload);
        }
        gamesCount++;
      }

      // Seed Banners (Static from BannerCarousel logic)
      const defaultBanners = [
        {
          badge: 'LANÇAMENTOS',
          badgeColor: 'from-cyan-500 to-blue-600',
          badgeIcon: 'sparkles',
          title: 'Lançamentos - Os Jogos Mais Recentes Estão Aqui!',
          highlight: 'Lançamentos',
          description: 'Jogue o novo, viva a emoção! Explore os lançamentos mais recentes da Cobra Games Jr.',
          imageUrl: '/banners/lancamentos.png',
          targetId: 'jogos',
          ctaText: 'Ver Lançamentos',
          category: 'Lançamentos',
          active: true,
          order: 0
        },
        {
          badge: 'NOVIDADES',
          badgeColor: 'from-purple-500 to-pink-600',
          badgeIcon: 'flame',
          title: 'Novidades - Sempre Tem Algo Novo Pra Você!',
          highlight: 'Novidades',
          description: 'Jogos novos, promoções e muito mais! Confira as novidades em destaque.',
          imageUrl: '/banners/novidades.png',
          targetId: 'jogos',
          ctaText: 'Conferir Novidades',
          category: 'Novidades',
          active: true,
          order: 1
        },
        {
          badge: 'CATEGORIAS',
          badgeColor: 'from-blue-500 to-emerald-500',
          badgeIcon: 'grid',
          title: 'Categorias - Escolha Sua Plataforma e Jogue do Seu Jeito!',
          highlight: 'Categorias',
          description: 'Console | PC | Mobile — Explore todos os gêneros e plataformas de jogos.',
          imageUrl: '/banners/categorias.png',
          targetId: 'categorias',
          ctaText: 'Explorar Categorias',
          category: 'Console • PC • Mobile',
          active: true,
          order: 2
        }
      ];

      for (const banner of defaultBanners) {
        await addDoc(collection(db, 'banners'), {
          ...banner,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      setResults({ success: true, message: `${gamesCount} jogos e ${defaultBanners.length} banners importados com sucesso!` });
      toast.success('Migração concluída!');
    } catch (err: any) {
      console.error('Migration error:', err);
      setResults({ success: false, message: `Erro na migração: ${err.message}` });
      toast.error('Falha na migração');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-zinc-800 rounded-2xl text-orange-500">
          <Database className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Migração de Dados</h3>
          <p className="text-zinc-500 text-sm">Sincronize os dados estáticos iniciais com o banco de dados Firestore.</p>
        </div>
      </div>

      <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50 mb-8">
        <h4 className="text-sm font-bold text-zinc-300 mb-2 flex items-center gap-2">
          <Download className="w-4 h-4 text-orange-500" />
          O que será migrado?
        </h4>
        <ul className="text-xs text-zinc-500 space-y-2 list-disc list-inside">
          <li>Todos os jogos definidos em <code className="text-orange-400/80 font-mono">src/data.ts</code></li>
          <li>Os 3 banners principais do carrossel inicial</li>
          <li>Metadados, URLs e categorias associadas</li>
        </ul>
      </div>

      {results && (
        <div className={`mb-6 p-4 rounded-2xl border flex items-start gap-3 ${results.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
          {results.success ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <p className="text-sm font-bold">{results.message}</p>
        </div>
      )}

      {confirmStep ? (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-100 font-medium">
              {confirmStep === 'existing'
                ? 'O catálogo já contém jogos no Firestore. Deseja sincronizar os jogos estáticos e adicionar os banners iniciais mesmo assim?'
                : 'Isso irá importar os dados estáticos iniciais para o Firestore. Deseja continuar?'}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={executeSeedData}
              disabled={isSeeding}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black py-3 rounded-xl transition-all"
            >
              Confirmar Sincronização
            </button>
            <button
              type="button"
              onClick={() => setConfirmStep(null)}
              className="px-6 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3 rounded-xl transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button 
          type="button"
          onClick={requestSeedConfirmation}
          disabled={isSeeding || isChecking}
          className="w-full bg-white hover:bg-zinc-100 disabled:opacity-50 text-black font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          {isSeeding || isChecking ? (
            <span key="seeding" className="inline-flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{isChecking ? 'Verificando Catálogo...' : 'Migrando Dados...'}</span>
            </span>
          ) : (
            <span key="seed-idle" className="inline-flex items-center gap-2">
              <Database className="w-5 h-5" />
              <span>Iniciar Sincronização</span>
            </span>
          )}
        </button>
      )}

      <p className="text-[10px] text-zinc-600 mt-4 text-center leading-relaxed">
        AVISO: Execute esta ação apenas uma vez para popular o banco inicial.<br />
        Após a migração, o sistema passará a ler os dados diretamente do Firestore.
      </p>
    </div>
  );
};
