'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      setUser(data.user);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const action = isLogin ? 'login' : 'register';
    const body = isLogin ? { email, password } : { username, email, password };

    try {
      const res = await fetch(`/api/auth/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        router.push('/');
        checkUser();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Erro ao processar autenticação');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout');
    setUser(null);
    router.push('/');
  };

  const handleDeleteAccount = async () => {
    if (confirm('Tem certeza que deseja deletar sua conta? Esta ação é irreversível e apagará seu score no ranking.')) {
      try {
        const res = await fetch('/api/auth/account', { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
          alert(data.message);
          setUser(null);
          router.push('/');
        } else {
          alert(data.error);
        }
      } catch (err) {
        alert('Erro ao deletar conta');
      }
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="quiz-card max-w-md w-full p-8 text-center">
          <h2 className="text-2xl font-bold text-gold-primary mb-2">Olá, {user.username}!</h2>
          <p className="text-gray-500 mb-8">Você está autenticado de forma segura.</p>
          
          <div className="space-y-4">
            <button onClick={handleLogout} className="btn-gold w-full bg-gray-500 hover:bg-gray-600">
              Sair da Conta
            </button>
            <div className="pt-8 mt-8 border-t border-red-100">
              <h3 className="text-red-500 font-bold mb-4">Zona de Perigo</h3>
              <button onClick={handleDeleteAccount} className="w-full p-3 text-red-500 border border-red-500 rounded-lg hover:bg-red-50 transition-colors">
                Deletar Minha Conta
              </button>
            </div>
            <Link href="/" className="block text-sm text-gold-accent hover:underline mt-4">
              Voltar ao Início
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="quiz-card max-w-md w-full p-8">
        <h2 className="text-2xl font-bold text-gold-primary mb-6 text-center">
          {isLogin ? 'Login Seguro' : 'Cadastro Protegido'}
        </h2>
        
        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome de Usuário (Público)</label>
              <input 
                type="text" 
                className="w-full p-3 border border-border-gold rounded-lg focus:outline-gold-primary"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required={!isLogin}
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail (Será criptografado)</label>
            <input 
              type="email" 
              className="w-full p-3 border border-border-gold rounded-lg focus:outline-gold-primary"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input 
              type="password" 
              className="w-full p-3 border border-border-gold rounded-lg focus:outline-gold-primary"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-gold w-full mt-4">
            {isLogin ? 'Entrar' : 'Cadastrar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-sm text-gold-accent hover:underline"
          >
            {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
          </button>
        </div>

        <Link href="/" className="block text-center text-xs text-gray-400 hover:underline mt-6">
          Voltar ao Início
        </Link>
      </div>
    </div>
  );
}
