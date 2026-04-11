'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface RankingEntry {
  id: string;
  userName: string;
  score: number;
}

export default function RankingPage() {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ranking')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setRankings(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background-main p-4 md:p-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gold-primary">Ranking Global</h1>
          <Link href="/" className="text-sm font-medium hover:underline text-gold-accent">
            Voltar ao Início
          </Link>
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Carregando...</p>
        ) : rankings.length === 0 ? (
          <div className="quiz-card p-8 text-center">
            <p className="text-gray-500">Ainda não há pontuações registradas. Seja o primeiro!</p>
          </div>
        ) : (
          <div className="quiz-card overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gold-primary text-white">
                <tr>
                  <th className="p-4">Posição</th>
                  <th className="p-4">Jogador</th>
                  <th className="p-4 text-right">Pontos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-gold">
                {rankings.map((entry, index) => (
                  <tr key={entry.id} className="hover:bg-white/50 transition-colors">
                    <td className="p-4 font-bold text-gold-accent">
                      #{index + 1}
                    </td>
                    <td className="p-4 font-medium">{entry.userName}</td>
                    <td className="p-4 text-right font-bold text-gold-primary">
                      {entry.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
