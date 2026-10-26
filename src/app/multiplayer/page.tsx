'use client';

/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities */

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import questionsData from '@/data/bible.json';
import PusherJS from 'pusher-js';

interface Player {
  id: string;
  name: string;
  score: number;
  isGuest?: boolean;
}

interface AnswerResult {
  question: string;
  isCorrect: boolean;
  reference: string;
}

function MultiplayerContent() {
  const searchParams = useSearchParams();
  const initialRoomId = searchParams.get('id') || '';

  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState(initialRoomId);
  const [joined, setJoined] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  
  const [timePerQuestion, setTimePerQuestion] = useState(30);
  const [timeLeft, setTimeLeft] = useState(30);
  const [totalQuestions, setTotalQuestions] = useState(15);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; reference: string | null } | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [answerResults, setAnswerResults] = useState<AnswerResult[]>([]);
  const currentQuestionRef = useRef<any>(null);
  const hasAnsweredRef = useRef(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const questionIndexRef = useRef(0);
  const totalQuestionsRef = useRef(15);
  const timePerQuestionRef = useRef(30);
  const advancingRef = useRef(false);
  const gameEndedRef = useRef(false);
  const isAdminRef = useRef(false);
  const pusherRef = useRef<PusherJS | null>(null);

  useEffect(() => {
    isAdminRef.current = isAdmin;
  }, [isAdmin]);

  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
    hasAnsweredRef.current = hasAnswered;
  }, [currentQuestion, hasAnswered]);

  useEffect(() => {
    questionIndexRef.current = questionIndex;
    totalQuestionsRef.current = totalQuestions;
    timePerQuestionRef.current = timePerQuestion;
  }, [questionIndex, totalQuestions, timePerQuestion]);

  // Lógica de Avanço Automático (Apenas para o Admin)
  useEffect(() => {
    if (isAdmin && gameStarted && !advancingRef.current && players.length > 0) {
        if (answeredCount >= players.length) {
            advancingRef.current = true;
            console.log("Todos responderam! Avançando...");
            setTimeout(() => {
                executeAdvance();
            }, 3000);
        }
    }
  }, [answeredCount, players.length, isAdmin, gameStarted]);

  useEffect(() => {
    if (joined && roomId) {
      const pusherInstance = new PusherJS(
        process.env.NEXT_PUBLIC_PUSHER_KEY!,
        {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
          authEndpoint: `/api/pusher/auth?name=${encodeURIComponent(name)}`,
        }
      );
      pusherRef.current = pusherInstance;

      const channel = pusherInstance.subscribe(`presence-quiz-${roomId}`);
      
      channel.bind('pusher:subscription_succeeded', (members: any) => {
        setMyId(members.myID);
        const initialPlayers: Player[] = [];
        members.each((member: any) => {
          initialPlayers.push({ 
            id: member.id, 
            name: member.info.name, 
            score: 0,
            isGuest: member.info.isGuest 
          });
        });
        setPlayers(initialPlayers);
        
        if (members.count === 1) setIsAdmin(true);
      });

      channel.bind('pusher:member_added', (member: any) => {
        setPlayers(prev => {
            if (prev.find(p => p.id === member.id)) return prev;
            return [...prev, { 
                id: member.id, 
                name: member.info.name, 
                score: 0,
                isGuest: member.info.isGuest
            }];
        });
      });

      channel.bind('pusher:member_removed', (member: any) => {
        setPlayers(prev => {
            const newPlayers = prev.filter(p => p.id !== member.id);
            if (newPlayers.length > 0 && newPlayers[0].id === myId) {
                setIsAdmin(true);
            }
            return newPlayers;
        });
      });

      channel.bind('game-start', (data: any) => {
        setGameStarted(true);
        setShowResults(false);
        setCurrentQuestion(data.question);
        setQuestionIndex(0);
        setTimePerQuestion(data.timePerQuestion);
        setTotalQuestions(data.totalQuestions);
        setTimeLeft(data.timePerQuestion);
        setFeedback(null);
        setHasAnswered(false);
        hasAnsweredRef.current = false;
        setAnswerResults([]);
        setAnsweredCount(0);
        advancingRef.current = false;
        gameEndedRef.current = false;
        startTimer(data.timePerQuestion);
      });

      channel.bind('next-question', (data: any) => {
        setCurrentQuestion(data.question);
        setQuestionIndex(prev => prev + 1);
        setFeedback(null);
        setHasAnswered(false);
        hasAnsweredRef.current = false;
        setAnsweredCount(0);
        advancingRef.current = false;
      });

      channel.bind('on-answer', () => {
        setAnsweredCount(prev => prev + 1);
      });

      channel.bind('score-update', (data: any) => {
        setPlayers(prev => prev.map(p => 
          p.id === data.id ? { ...p, score: data.score } : p
        ));
      });

      channel.bind('game-over', () => {
        gameEndedRef.current = true;
        setGameStarted(false);
        setShowResults(true);
        setCurrentQuestion(null);
        if (timerRef.current) clearInterval(timerRef.current);
        
      });

      return () => {
        pusherInstance.unsubscribe(`presence-quiz-${roomId}`);
        pusherInstance.disconnect();
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [joined, roomId]);

  function startTimer(seconds: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(seconds);
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
  }

  function handleTimeUp() {
    if (gameEndedRef.current) return;
    const unanswered = currentQuestionRef.current;
    if (unanswered && !hasAnsweredRef.current) {
      setAnswerResults(prev => [...prev, { question: unanswered.question, isCorrect: false, reference: unanswered.reference || 'Referência não informada' }]);
    }
    hasAnsweredRef.current = true;
    setHasAnswered(true);
    if (isAdminRef.current) {
      fetch('/api/multiplayer/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'game-over', roomId }) });
    }
  }

  async function executeAdvance() {
    if (gameEndedRef.current) return;
    const nextIndex = questionIndexRef.current + 1;
    if (nextIndex < totalQuestionsRef.current) {
      const nextQuestion = questionsData[Math.floor(Math.random() * questionsData.length)];
      await fetch('/api/multiplayer/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'next-question', 
          roomId, 
          question: nextQuestion 
        }),
      });
    } else {
      await fetch('/api/multiplayer/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'game-over', roomId }),
      });
    }
  }

  async function shareResultCard() {
    const correct = answerResults.filter(result => result.isCorrect).length;
    const errors = answerResults.length - correct;
    const site = window.location.origin;
    const safeSite = site.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><defs><linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#e8f7f3"/></linearGradient><linearGradient id="teal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#42b8a5"/><stop offset="1" stop-color="#247f7b"/></linearGradient><filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#264653" flood-opacity=".12"/></filter></defs><rect width="1080" height="1920" fill="url(#paper)"/><circle cx="1040" cy="140" r="230" fill="#f9c9b8" opacity=".55"/><circle cx="60" cy="1780" r="250" fill="#cceee6" opacity=".8"/><circle cx="75" cy="300" r="105" fill="#f5e3a7" opacity=".75"/><path d="M90 430 C140 330 220 335 260 420 C200 390 145 405 90 430Z" fill="#9bd6c7"/><path d="M990 1420 C920 1320 840 1340 820 1420 C875 1385 930 1390 990 1420Z" fill="#f2b7a4"/><rect x="58" y="58" width="964" height="1804" rx="52" fill="none" stroke="#ffffff" stroke-width="8"/><text x="540" y="230" fill="#247f7b" font-family="Arial,sans-serif" font-size="34" font-weight="700" letter-spacing="9" text-anchor="middle">DESAFIO BÍBLICO</text><g transform="translate(480 290)" stroke="#247f7b" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M0 18 Q-48 -8 -92 12 V104 Q-45 82 0 108 Q45 82 92 104 V12 Q48 -8 0 18Z"/><path d="M0 20 V106"/></g><text x="540" y="590" fill="#264653" font-family="Georgia,serif" font-size="100" font-weight="700" text-anchor="middle">Sou bom</text><text x="540" y="710" fill="#247f7b" font-family="Georgia,serif" font-size="100" font-weight="700" text-anchor="middle">de Bíblia!</text><rect x="180" y="770" width="720" height="88" rx="44" fill="#f6c7b6"/><text x="540" y="826" fill="#7d4036" font-family="Arial,sans-serif" font-size="32" font-weight="700" text-anchor="middle">MEU RESULTADO NO QUIZ</text><g filter="url(#shadow)"><rect x="130" y="940" width="380" height="300" rx="36" fill="#ffffff"/><rect x="570" y="940" width="380" height="300" rx="36" fill="#ffffff"/></g><rect x="130" y="940" width="380" height="14" rx="7" fill="#42b8a5"/><rect x="570" y="940" width="380" height="14" rx="7" fill="#f29c83"/><text x="320" y="1030" fill="#247f7b" font-family="Arial,sans-serif" font-size="30" font-weight="700" letter-spacing="3" text-anchor="middle">ACERTOS</text><text x="320" y="1165" fill="#264653" font-family="Georgia,serif" font-size="112" font-weight="700" text-anchor="middle">' + correct + '</text><text x="760" y="1030" fill="#c46e59" font-family="Arial,sans-serif" font-size="30" font-weight="700" letter-spacing="3" text-anchor="middle">ERROS</text><text x="760" y="1165" fill="#264653" font-family="Georgia,serif" font-size="112" font-weight="700" text-anchor="middle">' + errors + '</text><text x="540" y="1370" fill="#264653" font-family="Georgia,serif" font-size="39" font-style="italic" text-anchor="middle">Aprender a Palavra é uma jornada.</text><path d="M330 1410 H750" stroke="#b6ddd4" stroke-width="4" stroke-linecap="round"/><text x="540" y="1530" fill="#247f7b" font-family="Arial,sans-serif" font-size="29" font-weight="700" letter-spacing="3" text-anchor="middle">ACEITE O DESAFIO</text><rect x="120" y="1580" width="840" height="100" rx="50" fill="url(#teal)"/><text x="540" y="1642" fill="#ffffff" font-family="Arial,sans-serif" font-size="29" font-weight="700" text-anchor="middle">' + safeSite + '</text><text x="540" y="1760" fill="#64817e" font-family="Arial,sans-serif" font-size="25" text-anchor="middle">Compartilhe seu resultado com seus amigos</text><text x="540" y="1810" fill="#247f7b" font-family="Arial,sans-serif" font-size="22" letter-spacing="5" text-anchor="middle">FÉ • SABEDORIA • CONHECIMENTO</text></svg>';
    const blob = await new Promise<Blob>((resolve, reject) => {
      const image = new Image();
      image.onload = () => { const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1920; const ctx = canvas.getContext('2d'); if (!ctx) { reject(new Error('Canvas indisponível')); return; } ctx.drawImage(image, 0, 0); canvas.toBlob(file => file ? resolve(file) : reject(new Error('Falha ao gerar card')), 'image/png'); };
      image.onerror = () => reject(new Error('Falha ao renderizar card'));
      image.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    });
    const file = new File([blob], 'resultado-quiz-biblico.png', { type: 'image/png' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) await navigator.share({ title: 'Meu resultado no Quiz Bíblico', text: 'Sou bom de Bíblia! Faça seu desafio: ' + site, files: [file] });
    else { const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = file.name; anchor.click(); URL.revokeObjectURL(url); }
  }

  const joinRoom = async () => {
    if (!name || !roomId) return alert('Informe seu nome e o ID da sala');
    setJoined(true);
  };

  const copyRoomLink = () => {
    const url = `${window.location.origin}/multiplayer?id=${roomId}`;
    navigator.clipboard.writeText(url);
    alert('Link da sala copiado!');
  };

  const startGame = async () => {
    if (players.length < 2) return alert('Aguarde pelo menos mais um jogador');
    
    const qCount = 15;

    const firstQuestion = questionsData[Math.floor(Math.random() * questionsData.length)];

    await fetch('/api/multiplayer/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'start-game', 
          roomId, 
          question: firstQuestion,
          timePerQuestion,
          totalQuestions: qCount
        }),
    });
  };

  const handleAnswer = async (selectedId: string) => {
    if (hasAnswered) return;
    setHasAnswered(true);
    hasAnsweredRef.current = true;

    const isCorrect = selectedId === currentQuestion.answer;
    setAnswerResults(prev => [...prev, { question: currentQuestion.question, isCorrect, reference: currentQuestion.reference || 'Referência não informada' }]);
    const currentPlayer = players.find(p => p.id === myId);
    if (!currentPlayer) return;
    
    const newScore = isCorrect ? currentPlayer.score + 10 : currentPlayer.score;

    await fetch('/api/multiplayer/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'on-answer', roomId }),
    });

    await fetch('/api/multiplayer/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'score-update', 
        roomId, 
        id: myId,
        score: newScore
      }),
    });
  };

  if (!joined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="quiz-card max-w-sm w-full p-8">
          <h2 className="text-2xl font-bold text-gold-primary mb-6 text-center">Multiplayer</h2>
          <div className="space-y-4">
            <div className="text-sm text-gray-500 mb-2">
              'Você entrará como convidado. Não há cadastro nem salvamento permanente.'
            </div>
            <input 
              type="text" 
              placeholder="Seu Nome" 
              className="w-full p-3 border border-border-gold rounded-lg focus:outline-gold-primary"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <input 
              type="text" 
              placeholder="ID da Sala (ex: 1234)" 
              className="w-full p-3 border border-border-gold rounded-lg focus:outline-gold-primary"
              value={roomId}
              onChange={e => setRoomId(e.target.value)}
            />
            <button onClick={joinRoom} className="btn-gold w-full mt-2">
              Entrar na Sala
            </button>
            <Link href="/" className="block text-center text-sm text-gold-accent hover:underline">
              Voltar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-12">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          <div className="quiz-card p-8 h-full min-h-[400px] flex flex-col items-center justify-center text-center relative overflow-hidden">
            {showResults ? (
              <div className="w-full py-4">
                <h3 className="text-3xl font-bold text-gold-primary mb-6">Resultado da partida</h3>
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                    <p className="text-sm text-green-700">Acertos</p>
                    <p className="text-4xl font-bold text-green-700">{answerResults.filter(result => result.isCorrect).length}</p>
                  </div>
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-700">Erros</p>
                    <p className="text-4xl font-bold text-red-700">{answerResults.filter(result => !result.isCorrect).length}</p>
                  </div>
                </div>
                {answerResults.some(result => !result.isCorrect) && (
                  <section className="max-w-md mx-auto text-left mb-8">
                    <h4 className="font-bold text-gold-primary mb-3">Referências para estudar as questões erradas</h4>
                    <ul className="space-y-3">
                      {answerResults.filter(result => !result.isCorrect).map((result, index) => (
                        <li key={index} className="rounded-lg border border-border-gold p-3">
                          <p className="text-sm font-medium mb-1">{result.question}</p>
                          <p className="text-sm text-gold-accent">Leia: <span className="font-bold italic">{result.reference}</span></p>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                <section className="max-w-[220px] mx-auto mb-4"><div className="aspect-[9/16] rounded-2xl border border-white bg-gradient-to-br from-[#fffaf0] to-[#e8f7f3] p-4 text-[#264653] flex flex-col justify-around items-center shadow-xl"><p className="text-[10px] tracking-[0.2em] text-[#247f7b] font-bold">DESAFIO BÍBLICO</p><div className="text-center"><p className="text-2xl font-serif font-bold">Sou bom</p><p className="text-2xl font-serif font-bold text-[#247f7b]">de Bíblia!</p></div><div className="w-full grid grid-cols-2 gap-2 text-center"><div className="rounded-lg bg-white p-2 border-t-4 border-[#42b8a5]"><p className="text-[10px] text-[#247f7b] font-bold">ACERTOS</p><p className="text-2xl font-bold">{answerResults.filter(result => result.isCorrect).length}</p></div><div className="rounded-lg bg-white p-2 border-t-4 border-[#f29c83]"><p className="text-[10px] text-[#c46e59] font-bold">ERROS</p><p className="text-2xl font-bold">{answerResults.filter(result => !result.isCorrect).length}</p></div></div><p className="text-center text-[10px] text-[#64817e]">Aprender a Palavra é uma jornada.</p><p className="text-center text-[9px] break-all text-[#247f7b]">{typeof window !== "undefined" ? window.location.origin : ""}</p></div></section>
                <button onClick={shareResultCard} className="btn-gold w-full max-w-md mx-auto mb-8">Compartilhar card 9:16</button>
                <h4 className="text-xl font-bold text-gold-primary mb-4">Ranking da sala</h4>
                <div className="max-w-md mx-auto space-y-4 mb-10">
                  {players.sort((a, b) => b.score - a.score).map((p, index) => (
                    <div 
                      key={p.id} 
                      className={`flex justify-between items-center p-4 rounded-xl border-2 transition-all
                        ${index === 0 ? 'bg-gold-light-bg border-gold-primary scale-105' : 'bg-white border-gray-100'}
                        ${p.id === myId ? 'ring-2 ring-gold-accent ring-offset-2' : ''}
                      `}
                    >
                      <div className="flex items-center gap-4">
                        <span className={`text-2xl font-black ${index === 0 ? 'text-gold-primary' : 'text-gray-300'}`}>
                          {index + 1}º
                        </span>
                        <div className="text-left">
                          <p className="font-bold text-lg">{p.name} {p.id === myId && '(Você)'}</p>
                          {p.isGuest && <p className="text-[10px] text-gray-400">Convidado</p>}
                        </div>
                      </div>
                      <span className="bg-gold-primary text-white font-bold px-4 py-1 rounded-full text-lg">
                        {p.score} pts
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-3 max-w-xs mx-auto">
                  {isAdmin && (
                    <button onClick={startGame} className="btn-gold w-full">Jogar Novamente</button>
                  )}
                  <Link href="/" className="btn-gold bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 w-full">
                    Sair da Sala
                  </Link>
                </div>
              </div>
            ) : !gameStarted ? (
              <>
                <h3 className="text-2xl font-bold text-gold-primary mb-4">Sala de Espera</h3>
                <p className="text-gray-500 mb-6">ID da Sala: <span className="font-bold text-gold-accent">{roomId}</span></p>
                
                {isAdmin && (
                  <div className="mb-8 w-full max-w-xs text-left">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tempo total da partida:</label>
                    <select 
                      value={timePerQuestion} 
                      onChange={e => setTimePerQuestion(Number(e.target.value))}
                      className="w-full p-2 border border-border-gold rounded-lg focus:ring-gold-primary"
                    >
                      <option value={30}>30 segundos no total · desafio relâmpago</option>
                      <option value={60}>1 minuto no total · desafio rápido</option>
                    </select>
                  </div>
                )}

                <div className="flex flex-wrap justify-center gap-4">
                  <button onClick={copyRoomLink} className="btn-gold bg-gold-accent text-white hover:bg-gold-primary">
                    Copiar Link
                  </button>
                  {isAdmin ? (
                    <button onClick={startGame} className="btn-gold">Começar Jogo!</button>
                  ) : (
                    <p className="text-sm italic text-gray-400">Aguardando o administrador iniciar...</p>
                  )}
                </div>
              </>
            ) : (
              <div className="w-full h-[600px] flex flex-col">
                <div className="absolute top-0 left-0 w-full h-2 bg-slate-100">
                  <div 
                    className="h-full bg-teal-500 transition-all duration-1000 ease-linear"
                    style={{ width: `${(timeLeft / timePerQuestion) * 100}%` }}
                  ></div>
                </div>

                <div className="flex justify-between items-center mb-6">
                  <span className="text-sm font-bold text-gold-accent">Questão {questionIndex + 1} / {totalQuestions}</span>
                  <div className="flex flex-col items-end">
                    <span className={`text-lg font-bold ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-gold-primary'}`}>
                        {timeLeft}s
                    </span>
                    <span className="text-[10px] text-gray-400">{answeredCount} / {players.length} responderam</span>
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-5 min-h-[112px] max-h-[112px] overflow-y-auto flex items-center">{currentQuestion?.question}</h3>
                <div className="grid grid-cols-1 gap-3">
                  {currentQuestion?.options.map((opt: any) => (
                    <button 
                      key={opt.id} 
                      onClick={() => handleAnswer(opt.id)}
                      disabled={hasAnswered}
                      className={`h-[64px] px-4 border border-slate-200 rounded-xl transition-colors text-left font-medium flex items-center bg-white ${hasAnswered ? "opacity-50 cursor-not-allowed" : "hover:bg-teal-50 hover:border-teal-300 active:scale-[0.99]"}`}
                    
                    >
                      {opt.text}
                    </button>
                  ))}
                </div>

                <p className="mt-5 text-xs text-gray-400 text-center">A avaliação será exibida somente ao final da partida.</p>
              </div>
            )}
          </div>
        </div>

        <div className="w-full md:w-64">
          <div className="quiz-card p-4">
            <h4 className="font-bold text-gold-primary mb-4 border-b border-border-gold pb-2 flex justify-between">
              <span>Jogadores</span>
              <span className="text-xs font-normal text-gray-400">{players.length} online</span>
            </h4>
            <div className="space-y-3">
              {players.sort((a, b) => b.score - a.score).map((p, index) => (
                <div key={p.id} className="flex justify-between items-center">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-xs text-gray-400 w-4">{index + 1}º</span>
                    <span className="font-medium truncate leading-tight">
                      {p.name} {p.id === myId && '(Você)'} {p.isGuest && <span className="text-[10px] text-gray-400 font-normal"> - Convidado</span>}
                    </span>
                  </div>
                  {!gameStarted && <span className="bg-gold-primary text-white text-xs px-2 py-1 rounded-full">{p.score} pts</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MultiplayerPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <MultiplayerContent />
    </Suspense>
  );
}
