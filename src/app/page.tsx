import Link from 'next/link';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth-utils';

export default async function Home() {
  const token = (await cookies()).get('auth_token')?.value;
  const user = token ? verifyToken(token) : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="quiz-card max-w-md w-full p-8 text-center">
        <h1 className="text-4xl font-bold text-gold-primary mb-2">Quiz Bíblico Moderno</h1>
        <p className="text-text-dark mb-8">Desafie seus conhecimentos sagrados!</p>

        <div className="space-y-4 flex flex-col">
          {user ? (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Bem-vindo, <span className="font-bold text-gold-primary">{user.username}</span>!</p>
              <Link href="/auth" className="text-xs text-gold-accent hover:underline">
                Gerenciar Conta / Sair
              </Link>
            </div>
          ) : (
            <Link href="/auth" className="mb-6 p-2 bg-gold-light-bg border border-border-gold rounded-lg text-gold-primary font-medium hover:bg-white transition-colors">
              Fazer Login / Criar Conta
            </Link>
          )}

          <Link href="/play" className="btn-gold block text-center no-underline">
            Jogar Sozinho
          </Link>
          
          <Link href="/multiplayer" className="bg-gold-accent hover:bg-gold-accent-hover text-white py-3 px-5 rounded-lg font-medium transition-all no-underline">
            Modo Multiplayer
          </Link>

          <Link href="/ranking" className="text-gold-primary font-semibold hover:underline mt-4 no-underline">
            Ver Ranking Global
          </Link>
        </div>
      </div>
      
      <footer className="mt-12 text-sm text-gray-500">
        Desenvolvido por Jeiel Lima Miranda
      </footer>
    </div>
  );
}
