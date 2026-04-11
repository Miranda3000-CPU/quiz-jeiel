'use client';

import { useState, useEffect, useRef } from 'react';
import questionsData from '@/data/bible.json';
import Link from 'next/link';

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
  const [userName, setUserName] = useState('');
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  const [timeLeft, setTimeLeft] = useState(30);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; reference: string | null } | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false); // Trava atômica para evitar pulo de questões

  const TIME_PER_QUESTION = 30;
  const TOTAL_QUESTIONS_COUNT = 15;

  useEffect(() => {
    const shuffled = [...questionsData].sort(() => Math.random() - 0.5);
    setQuestions(shuffled.slice(0, TOTAL_QUESTIONS_COUNT));

    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          setUserName(data.user.username);
        }
      });
      
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Inicia o timer apenas quando a questão muda e o estado de "respondido" é resetado
  useEffect(() => {
    if (questions.length > 0 && !hasAnswered && !showResult) {
      startTimer();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIndex, hasAnswered, questions.length, showResult]);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(TIME_PER_QUESTION);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeUp = () => {
    if (!isProcessingRef.current && !hasAnswered) {
      handleAnswer(''); // Estouro de tempo
    }
  };

  const handleAnswer = (selectedId: string) => {
    // Se já respondeu ou está processando a transição, bloqueia
    if (isProcessingRef.current || hasAnswered) return;
    
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

    isProcessingRef.current = true;
    setHasAnswered(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const isCorrect = selectedId === currentQuestion.answer;
    if (isCorrect) {
      setScore(prev => prev + 10);
    }

    setFeedback({
      isCorrect,
      reference: isCorrect ? null : (currentQuestion.reference || 'Verifique na Bíblia')
    });

    // Aguarda 3 segundos para o usuário ler a referência bíblica (estudo)
    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(prev => prev + 1);
        setHasAnswered(false);
        setFeedback(null);
        isProcessingRef.current = false;
        // O timer reiniciará pelo useEffect do currentIndex
      } else {
        setShowResult(true);
        isProcessingRef.current = false;
      }
    }, 3000);
  };

  const saveRanking = async () => {
    if (!userName) return alert('Digite seu nome para salvar no ranking');
    setSaving(true);
    try {
      await fetch('/api/ranking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName, score }),
      });
      alert('Pontuação salva com sucesso!');
      window.location.href = '/ranking';
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar ranking');
    } finally {
      setSaving(false);
    }
  };

  if (questions.length === 0) return <div className="text-center p-20 text-gold-primary animate-pulse font-bold text-2xl">Carregando Questões Bíblicas...</div>;

  if (showResult) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="quiz-card max-w-md w-full p-8 text-center">
          <h2 className="text-3xl font-bold text-gold-primary mb-4">Fim de Jogo!</h2>
          <p className="text-xl mb-6">Sua pontuação: <span className="font-bold text-gold-accent">{score}</span></p>
          
          <div className="space-y-4">
            <div className="text-sm text-gray-500 mb-2">
              {user ? `Logado como: ${user.username}` : 'Sua pontuação não será salva permanentemente como convidado.'}
            </div>
            {user && (
              <button 
                onClick={saveRanking} 
                disabled={saving}
                className="btn-gold w-full"
              >
                {saving ? 'Salvando...' : 'Salvar no Ranking'}
              </button>
            )}
            {!user && (
               <Link href="/auth" className="btn-gold block w-full bg-gold-accent">
                Criar conta para salvar progresso
              </Link>
            )}
            <Link href="/" className="block text-center text-sm text-gray-500 hover:underline">
              Voltar ao Início
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const current = questions[currentIndex];

  return (
    <div className="min-h-screen p-4 md:p-12 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <span className="text-gold-primary font-bold">Questão {currentIndex + 1} / {questions.length}</span>
        <div className="flex items-center gap-4">
          <span className={`font-bold ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-gold-primary'}`}>
            {timeLeft}s
          </span>
          <span className="bg-gold-light-bg px-3 py-1 rounded-full text-sm font-bold border border-border-gold text-gold-accent">
            Score: {score}
          </span>
        </div>
      </div>

      <div className="quiz-card p-8 relative overflow-hidden">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gray-100">
          <div 
            className="h-full bg-gold-primary transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / TIME_PER_QUESTION) * 100}%` }}
          ></div>
        </div>

        <h3 className="text-xl font-bold mb-8 text-text-dark mt-4">{current?.question}</h3>
        <div className="grid grid-cols-1 gap-3">
          {current?.options.map((opt) => (
            <button 
              key={opt.id} 
              onClick={() => handleAnswer(opt.id)}
              disabled={hasAnswered}
              className={`p-4 border border-border-gold rounded-lg transition-colors text-left font-medium
                ${hasAnswered ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gold-light-bg active:scale-[0.98]'}
              `}
            >
              {opt.text}
            </button>
          ))}
        </div>

        {feedback && (
          <div className={`mt-6 p-4 rounded-lg border ${feedback.isCorrect ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {feedback.isCorrect ? (
              <p className="font-bold">Correto! +10 pontos</p>
            ) : (
              <div>
                <p className="font-bold mb-1">Incorreto!</p>
                <p className="text-sm">Veja na Bíblia para aprender: <span className="font-bold italic">{feedback.reference}</span></p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
