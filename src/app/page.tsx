import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <section className="quiz-card max-w-md w-full p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-accent mb-3">Aprenda jogando</p>
        <h1 className="text-4xl font-bold text-gold-primary mb-3">Quiz Bíblico</h1>
        <p className="text-text-dark mb-8">Desafie seus conhecimentos bíblicos, descubra referências e aprenda com cada partida.</p>
        <div className="space-y-4 flex flex-col">
          <Link href="/play" className="btn-gold block text-center no-underline">Começar desafio</Link>
          <p className="pt-2 text-xs text-gray-500">Modo solo, sem cadastro, sem banco de dados e sem ranking persistente.</p>
        </div>
      </section>
      <footer className="mt-8 text-sm text-gray-500">Desenvolvido por Jeiel Lima Miranda</footer>
    </main>
  );
}
