import React, { useState } from 'react';
import { Database, Download, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { collection, addDoc, getDocs, query, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { otherGames } from '../../../data';
import { toast } from 'sonner';

export const SeedUtility = () => {
  const [isSeeding, setIsSeeding] = useState(false);
  const [results, setResults] = useState<{ success: boolean; message: string } | null>(null);

  const seedData = async () => {
    if (!window.confirm('Isso irá importar os dados estáticos atuais para o Firestore. Continuar?')) return;
    
    setIsSeeding(true);
    setResults(null);
    
    try {
      // 1. Check if already seeded (prevent duplicates easily)
      const gamesSnap = await getDocs(query(collection(db, 'games'), limit(1)));
      if (!gamesSnap.empty) {
        const proceed = window.confirm('O catálogo já contém dados. Deseja importar os dados estáticos mesmo assim (pode gerar duplicatas)?');
        if (!proceed) {
          setIsSeeding(false);
          return;
        }
      }

      // 2. Seed Games
      console.log('Seeding games...');
      let gamesCount = 0;
      for (const game of otherGames) {
        await addDoc(collection(db, 'games'), {
          ...game,
          order: gamesCount,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        gamesCount++;
      }

      // 3. Seed Banners (Static from BannerCarousel logic)
      console.log('Seeding banners...');
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

      <button 
        onClick={seedData}
        disabled={isSeeding}
        className="w-full bg-white hover:bg-zinc-100 disabled:opacity-50 text-black font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-95"
      >
        {isSeeding ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Migrando Dados...
          </>
        ) : (
          <>
            <Database className="w-5 h-5" />
            Iniciar Sincronização
          </>
        )}
      </button>

      <p className="text-[10px] text-zinc-600 mt-4 text-center leading-relaxed">
        AVISO: Execute esta ação apenas uma vez para popular o banco inicial.<br />
        Após a migração, o sistema passará a ler os dados diretamente do Firestore.
      </p>
    </div>
  );
};
