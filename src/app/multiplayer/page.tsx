'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import questionsData from '@/data/bible.json';
import PusherJS from 'pusher-js';

interface Player {
  id: string;
  name: string;
  score: number;
  isGuest?: boolean;
}

function MultiplayerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialRoomId = searchParams.get('id') || '';

  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState(initialRoomId);
  const [joined, setJoined] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  
  const [timePerQuestion, setTimePerQuestion] = useState(30);
  const [timeLeft, setTimeLeft] = useState(30);
  const [totalQuestions, setTotalQuestions] = useState(15);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; reference: string | null } | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const questionIndexRef = useRef(0);
  const totalQuestionsRef = useRef(15);
  const timePerQuestionRef = useRef(30);
  const advancingRef = useRef(false);
  const pusherRef = useRef<PusherJS | null>(null);

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
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          setName(data.user.username);
        }
      });
  }, []);

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
        let firstLoggedUser: any = null;
        
        members.each((member: any) => {
          initialPlayers.push({ 
            id: member.id, 
            name: member.info.name, 
            score: 0,
            isGuest: member.info.isGuest 
          });
          if (member.info.isLogged && !firstLoggedUser) {
            firstLoggedUser = member;
          }
        });
        setPlayers(initialPlayers);
        
        if (firstLoggedUser && firstLoggedUser.id === members.myID) {
          setIsAdmin(true);
        } else if (!firstLoggedUser && members.count === 1) {
          setIsAdmin(true);
        }
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
        setAnsweredCount(0);
        advancingRef.current = false;
        startTimer(data.timePerQuestion);
      });

      channel.bind('next-question', (data: any) => {
        setCurrentQuestion(data.question);
        setQuestionIndex(prev => prev + 1);
        setTimeLeft(timePerQuestionRef.current);
        setFeedback(null);
        setHasAnswered(false);
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
        
        // Auto-save ranking for logged users
        saveLoggedUserScore();
      });

      return () => {
        pusherInstance.unsubscribe(`presence-quiz-${roomId}`);
        pusherInstance.disconnect();
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [joined, roomId]);

  const saveLoggedUserScore = async () => {
    // Only save if we have a real user account
    if (user && myId) {
        const myPlayer = players.find(p => p.id === myId);
        const finalScore = myPlayer ? myPlayer.score : 0;
        
        try {
            await fetch('/api/ranking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userName: user.username, score: finalScore }),
            });
            console.log("Pontuação multiplayer salva no ranking global");
        } catch (err) {
            console.error("Erro ao salvar ranking global:", err);
        }
    }
  };

  const startTimer = (seconds: number) => {
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
  };

  const handleTimeUp = () => {
    if (hasAnswered) return;
    setHasAnswered(true);
    
    setFeedback({ isCorrect: false, reference: currentQuestion?.reference || 'Verifique na Bíblia' });
    
    fetch('/api/multiplayer/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'on-answer', roomId }),
    });

    if (isAdmin) {
      setTimeout(() => {
        if (!advancingRef.current) {
            advancingRef.current = true;
            executeAdvance();
        }
      }, 3000);
    }
  };

  const executeAdvance = async () => {
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
  };

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
    
    let qCount = 15;
    if (timePerQuestion === 15) qCount = 10;
    if (timePerQuestion === 30) qCount = 15;
    if (timePerQuestion === 60) qCount = 20;
    if (timePerQuestion === 120) qCount = 30;

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

    const isCorrect = selectedId === currentQuestion.answer;
    const currentPlayer = players.find(p => p.id === myId);
    if (!currentPlayer) return;
    
    const newScore = isCorrect ? currentPlayer.score + 10 : currentPlayer.score;

    setFeedback({
      isCorrect,
      reference: isCorrect ? null : currentQuestion.reference
    });

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
              {user ? `Logado como: ${user.username}` : 'Entrando como Convidado'}
            </div>
            <input 
              type="text" 
              placeholder="Seu Nome" 
              className="w-full p-3 border border-border-gold rounded-lg focus:outline-gold-primary"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={!!user}
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
                <h3 className="text-3xl font-bold text-gold-primary mb-8">Ranking da Sala</h3>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tempo por pergunta:</label>
                    <select 
                      value={timePerQuestion} 
                      onChange={e => setTimePerQuestion(Number(e.target.value))}
                      className="w-full p-2 border border-border-gold rounded-lg focus:ring-gold-primary"
                    >
                      <option value={15}>15 segundos (10 perguntas)</option>
                      <option value={30}>30 segundos (15 perguntas)</option>
                      <option value={60}>60 segundos (20 perguntas)</option>
                      <option value={120}>120 segundos (30 perguntas)</option>
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

                {feedback && (
                  <div className={`mt-6 p-4 rounded-lg border ${feedback.isCorrect ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {feedback.isCorrect ? (
                      <p className="font-bold">Correto! +10 pontos</p>
                    ) : (
                      <div>
                        <p className="font-bold mb-1">Incorreto!</p>
                        <p className="text-sm">Estude na Bíblia: <span className="font-bold italic">{feedback.reference}</span></p>
                      </div>
                    )}
                  </div>
                )}
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
