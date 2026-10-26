'use client';

/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities */

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import questionsData from '@/data/bible.json';

interface Question {
  question: string;
  options: { id: string; text: string }[];
  answer: string;
  reference?: string;
}

export default function PlayPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; reference: string | null } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);

  const TOTAL_TIME_SECONDS = 30;
  const TOTAL_QUESTIONS_COUNT = 15;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const shuffled = [...questionsData].sort(() => Math.random() - 0.5);
    setQuestions(shuffled.slice(0, TOTAL_QUESTIONS_COUNT));
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (questions.length > 0 && !showResult && !timerRef.current) startTimer();
    if (showResult && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [questions.length, showResult]);

  function startTimer() {
    setTimeLeft(TOTAL_TIME_SECONDS);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
          setShowResult(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  const handleAnswer = (selectedId: string) => {
    if (isProcessingRef.current || hasAnswered) return;
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;
    isProcessingRef.current = true;
    setHasAnswered(true);
    const isCorrect = selectedId === currentQuestion.answer;
    if (isCorrect) setScore(prev => prev + 10);
    setFeedback({
      isCorrect,
      reference: isCorrect ? null : (currentQuestion.reference || 'Verifique na Bíblia'),
    });
    transitionTimerRef.current = setTimeout(() => {
      transitionTimerRef.current = null;
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(prev => prev + 1);
        setHasAnswered(false);
        setFeedback(null);
        isProcessingRef.current = false;
      } else {
        setShowResult(true);
        isProcessingRef.current = false;
      }
    }, 2500);
  };

  if (questions.length === 0) return <div className="text-center p-20 text-gold-primary animate-pulse font-bold text-2xl">Carregando questões bíblicas...</div>;

  if (showResult) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <section className="quiz-card max-w-md w-full p-8 text-center">
          <h2 className="text-3xl font-bold text-gold-primary mb-4">Fim de jogo!</h2>
          <p className="text-xl mb-2">Sua pontuação</p>
          <p className="text-5xl font-bold text-gold-accent mb-6">{score}</p>
          <p className="text-sm text-gray-500 mb-6">A pontuação vale apenas para esta partida e não é salva.</p>
          <div className="space-y-3">
            <button onClick={() => window.location.reload()} className="btn-gold w-full">Jogar novamente</button>
            <Link href="/" className="block text-center text-sm text-gray-500 hover:underline">Voltar ao início</Link>
          </div>
        </section>
      </main>
    );
  }

  const current = questions[currentIndex];
  return (
    <main className="min-h-screen p-4 md:p-12 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-8 gap-3">
        <span className="text-gold-primary font-bold">Questão {currentIndex + 1} / {questions.length}</span>
        <div className="flex items-center gap-3">
          <span className={`font-bold ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-gold-primary'}`} aria-label="Tempo restante da partida">{timeLeft}s</span>
          <span className="bg-gold-light-bg px-3 py-1 rounded-full text-sm font-bold border border-border-gold text-gold-accent">Pontos: {score}</span>
        </div>
      </div>
      <section className="quiz-card p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gray-100">
          <div className="h-full bg-gold-primary transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / TOTAL_TIME_SECONDS) * 100}%` }} />
        </div>
        <h3 className="text-xl font-bold mb-8 text-text-dark mt-4">{current?.question}</h3>
        <div className="grid grid-cols-1 gap-3">
          {current?.options.map(opt => (
            <button key={opt.id} onClick={() => handleAnswer(opt.id)} disabled={hasAnswered}
              className={`p-4 border border-border-gold rounded-xl transition-colors text-left font-medium ${hasAnswered ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gold-light-bg active:scale-[0.98]'}`}>
              {opt.text}
            </button>
          ))}
        </div>
        {feedback && (
          <div className={`mt-6 p-4 rounded-xl border ${feedback.isCorrect ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {feedback.isCorrect ? <p className="font-bold">Correto! +10 pontos</p> : <div><p className="font-bold mb-1">Incorreto!</p><p className="text-sm">Veja na Bíblia: <span className="font-bold italic">{feedback.reference}</span></p></div>}
          </div>
        )}
      </section>
      <Link href="/" className="mt-6 inline-block text-sm text-gray-500 hover:underline">Sair do jogo</Link>
    </main>
  );
}
