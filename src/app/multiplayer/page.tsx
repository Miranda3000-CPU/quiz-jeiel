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
        startTimer(timePerQuestionRef.current);
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
    if (gameEndedRef.current || hasAnsweredRef.current) return;
    const unanswered = currentQuestionRef.current;
    if (unanswered) {
      setAnswerResults(prev => [...prev, { question: unanswered.question, isCorrect: false, reference: unanswered.reference || 'Referência não informada' }]);
    }
    hasAnsweredRef.current = true;
    setHasAnswered(true);
    fetch('/api/multiplayer/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'on-answer', roomId }),
    });
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
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#241b0d"/><stop offset="1" stop-color="#806022"/></linearGradient></defs><rect width="1080" height="1920" fill="url(#bg)"/><rect x="54" y="54" width="972" height="1812" rx="44" fill="none" stroke="#e7c878" stroke-width="4"/><text x="540" y="270" fill="#f7e7b2" font-family="Arial" font-size="42" letter-spacing="8" text-anchor="middle">DESAFIO BÍBLICO</text><text x="540" y="550" fill="#fff" font-family="Arial" font-size="92" font-weight="700" text-anchor="middle">SOU BOM</text><text x="540" y="665" fill="#f2d17d" font-family="Arial" font-size="92" font-weight="700" text-anchor="middle">DE BÍBLIA!</text><text x="540" y="800" fill="#f7e7b2" font-family="Arial" font-size="38" text-anchor="middle">Meu resultado no Quiz Bíblico</text><rect x="130" y="920" width="360" height="270" rx="28" fill="#163d2b" stroke="#6bc58c" stroke-width="3"/><text x="310" y="1010" fill="#a9edc1" font-family="Arial" font-size="38" text-anchor="middle">ACERTOS</text><text x="310" y="1125" fill="#fff" font-family="Arial" font-size="100" font-weight="700" text-anchor="middle">'+correct+'</text><rect x="590" y="920" width="360" height="270" rx="28" fill="#4a2020" stroke="#ed8b8b" stroke-width="3"/><text x="770" y="1010" fill="#ffb9b9" font-family="Arial" font-size="38" text-anchor="middle">ERROS</text><text x="770" y="1125" fill="#fff" font-family="Arial" font-size="100" font-weight="700" text-anchor="middle">'+errors+'</text><text x="540" y="1390" fill="#fff" font-family="Arial" font-size="36" text-anchor="middle">Conhecimento que cresce com a Palavra.</text><text x="540" y="1600" fill="#f2d17d" font-family="Arial" font-size="34" text-anchor="middle">Faça seu desafio em</text><text x="540" y="1665" fill="#fff" font-family="Arial" font-size="30" text-anchor="middle">'+site.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</text><text x="540" y="1785" fill="#f7e7b2" font-family="Arial" font-size="26" text-anchor="middle">Quiz Bíblico • Compartilhe seu resultado</text></svg>';
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
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
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
                <section className="max-w-[220px] mx-auto mb-4">
                  <div className="aspect-[9/16] rounded-2xl border-2 border-[#e7c878] bg-gradient-to-br from-[#241b0d] to-[#806022] p-4 text-white flex flex-col justify-around items-center shadow-xl">
                    <p className="text-[10px] tracking-[0.2em] text-[#f7e7b2]">DESAFIO BÍBLICO</p>
                    <div><p className="text-2xl font-black">SOU BOM</p><p className="text-2xl font-black text-[#f2d17d]">DE BÍBLIA!</p></div>
                    <div className="w-full grid grid-cols-2 gap-2 text-center"><div className="rounded-lg bg-green-900/70 p-2"><p className="text-[10px]">ACERTOS</p><p className="text-2xl font-bold">{answerResults.filter(result => result.isCorrect).length}</p></div><div className="rounded-lg bg-red-950/70 p-2"><p className="text-[10px]">ERROS</p><p className="text-2xl font-bold">{answerResults.filter(result => !result.isCorrect).length}</p></div></div>
                    <p className="text-center text-[10px] text-[#f7e7b2]">Conhecimento que cresce com a Palavra.</p><p className="text-center text-[9px] break-all">{typeof window !== 'undefined' ? window.location.origin : ''}</p>
                  </div>
                </section>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tempo para cada pergunta:</label>
                    <select 
                      value={timePerQuestion} 
                      onChange={e => setTimePerQuestion(Number(e.target.value))}
                      className="w-full p-2 border border-border-gold rounded-lg focus:ring-gold-primary"
                    >
                      <option value={30}>30 segundos por pergunta · 15 perguntas</option>
                      <option value={60}>1 minuto por pergunta · 15 perguntas</option>
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
              <div className="w-full">
                <div className="absolute top-0 left-0 w-full h-2 bg-gray-100">
                  <div 
                    className="h-full bg-gold-primary transition-all duration-1000 ease-linear"
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

                <h3 className="text-xl font-bold mb-8">{currentQuestion?.question}</h3>
                <div className="grid grid-cols-1 gap-3">
                  {currentQuestion?.options.map((opt: any) => (
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
                  <span className="bg-gold-primary text-white text-xs px-2 py-1 rounded-full">{p.score} pts</span>
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
