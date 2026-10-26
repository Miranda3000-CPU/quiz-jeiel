import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <section className="quiz-card max-w-md w-full p-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-3xl shadow-inner">✦</div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-500 mb-3">Aprenda jogando</p>
        <h1 className="text-4xl font-bold text-gold-primary mb-3">Quiz Bíblico</h1>
        <p className="text-text-dark mb-8">Desafie seus conhecimentos bíblicos, descubra referências e divirta-se com amigos.</p>
        <div className="space-y-4 flex flex-col">
          <Link href="/play" className="btn-gold block text-center no-underline">Jogar Sozinho</Link>
          <Link href="/multiplayer" className="bg-gold-accent hover:bg-gold-accent-hover text-white py-3 px-5 rounded-xl font-semibold transition-all no-underline shadow-lg">Modo Multiplayer</Link>
          <p className="pt-2 text-xs text-gray-500">Sem cadastro, sem banco de dados e sem ranking persistente.</p>
        </div>
      </section>
      <footer className="mt-8 text-sm text-gray-500">Desenvolvido por Jeiel Lima Miranda</footer>
    </main>
  );
}
