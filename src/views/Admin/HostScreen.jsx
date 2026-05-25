import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { broadcastGameState, closeHost } from '../../network/peerHost';
import { Button } from '../../components/Button';
import { Card, CardContent } from '../../components/Card';
import { Users, Timer, Trophy, ArrowRight, Play } from 'lucide-react';

export default function HostScreen() {
  const store = useGameStore();
  const timerRef = useRef(null);

  // Expose some variables from store for convenience
  const { 
    gameState, roomCode, currentQuiz, currentQuestionIndex, 
    players, timeRemaining, answers 
  } = store;

  const currentQ = currentQuiz?.questions[currentQuestionIndex];
  const totalPlayers = players.length;
  const answeredCount = Object.keys(answers || {}).length;

  useEffect(() => {
    // Whenever host state changes significantly that clients need to know:
    broadcastGameState();
  }, [gameState, timeRemaining, players.length, answeredCount]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTimer = (duration) => {
    store.setTimeRemaining(duration);
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      const current = useGameStore.getState().timeRemaining;
      if (current <= 1) {
        clearInterval(timerRef.current);
        store.setTimeRemaining(0);
        handleTimeUp();
      } else {
        store.setTimeRemaining(current - 1);
      }
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Flow handlers
  const handleStartGame = () => {
    if (!currentQuiz || currentQuiz.questions.length === 0) return;
    store.setGameState('QUESTION');
    startTimer(currentQuiz.questions[0].timeLimit);
  };

  const handleTimeUp = () => {
    // Auto show answers when time is up
    store.setGameState('SHOW_ANSWER');
    store.applyScores();
  };

  const handleSkipQuestion = () => {
    stopTimer();
    store.setTimeRemaining(0);
    handleTimeUp();
  };

  const handleNext = () => {
    if (gameState === 'SHOW_ANSWER') {
      store.setGameState('LEADERBOARD');
    } else if (gameState === 'LEADERBOARD') {
      if (currentQuestionIndex + 1 < currentQuiz.questions.length) {
        store.nextQuestion();
        startTimer(currentQuiz.questions[currentQuestionIndex + 1].timeLimit);
      } else {
        // Game over logic
        store.setGameState('GAMEOVER');
      }
    }
  };

  const handleExit = () => {
    closeHost();
    store.resetGame();
  };

  // Trigger fireworks on GAMEOVER
  useEffect(() => {
    if (gameState === 'GAMEOVER') {
      const duration = 15 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min, max) => Math.random() * (max - min) + min;

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        import('canvas-confetti').then(({ default: confetti }) => {
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [gameState]);

  // Compute option counts for the bar chart
  const optionCounts = [0, 0, 0, 0];
  if (gameState === 'SHOW_ANSWER') {
    Object.values(answers || {}).forEach(ans => {
      if (ans.answerIdx !== undefined) optionCounts[ans.answerIdx]++;
    });
  }

  // Renderings per state
  if (gameState === 'LOBBY') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <div className="absolute top-4 right-4 z-50">
          <Button variant="danger" onClick={handleExit}>End Game & Kick All</Button>
        </div>
        <h2 className="text-3xl text-slate-400 mb-2">Join at</h2>
        <h1 className="text-6xl md:text-8xl font-black text-glow-cyan bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-cyan-200 mb-8 tracking-wider">
          {roomCode}
        </h1>
        
        <div className="mb-12">
          <Button variant="neonMagenta" className="text-2xl px-12 py-6" onClick={handleStartGame} disabled={players.length === 0}>
            Start Game <Play className="inline ml-2" />
          </Button>
        </div>

        <Card className="w-full max-w-4xl bg-slate-800/50 backdrop-blur-md">
          <CardContent className="p-8">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Users className="w-8 h-8 text-cyan-400" />
              <h3 className="text-2xl font-bold">{players.length} Players Waiting</h3>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <AnimatePresence>
                {players.map(p => (
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    key={p.id} 
                    className="px-6 py-3 rounded-full font-bold text-lg text-slate-900 shadow-lg"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.nickname}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-6">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-8 bg-slate-800/80 p-4 rounded-2xl shadow-xl border border-slate-700/50">
        <div className="text-xl font-bold truncate flex-1">
          Q{currentQuestionIndex + 1}: {currentQ?.question}
        </div>
        <div className="flex items-center gap-6 px-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-2xl">
            <Timer className="w-6 h-6" /> {timeRemaining}s
          </div>
        </div>
        <div className="flex gap-2">
          {gameState === 'QUESTION' && (
            <Button variant="ghost" onClick={handleSkipQuestion}>Skip</Button>
          )}
          {(gameState === 'SHOW_ANSWER' || gameState === 'LEADERBOARD') && (
            <Button variant="neonCyan" onClick={handleNext} className="flex items-center gap-2">
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          )}
          <Button variant="danger" onClick={handleExit}>End Game & Kick All</Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {gameState === 'LEADERBOARD' || gameState === 'GAMEOVER' ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <h1 className="text-5xl font-bold mb-12 flex items-center gap-4 text-glow-yellow">
              <Trophy className="w-12 h-12 text-yellow-400" /> {gameState === 'GAMEOVER' ? 'Final Results!' : 'Leaderboard'}
            </h1>
            <div className="w-full max-w-3xl space-y-4">
              <AnimatePresence>
                {players.slice(0, 5).map((p, idx) => (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1, type: 'spring' }}
                    className={`flex items-center justify-between p-6 bg-slate-800/80 rounded-2xl border border-slate-700 shadow-lg font-bold ${gameState === 'GAMEOVER' && idx === 0 ? 'text-4xl text-yellow-400 box-glow-magenta' : 'text-2xl'}`}
                  >
                    <div className="flex items-center gap-6">
                      <span className="text-3xl w-10 text-center text-slate-500">#{idx + 1}</span>
                      <div className="w-6 h-6 rounded-full" style={{ backgroundColor: p.color }}></div>
                      <span>{p.nickname}</span>
                    </div>
                    <span className="text-cyan-400">{p.score} pts</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <h2 className="text-4xl md:text-6xl font-bold text-center leading-tight mb-4 max-w-5xl">
              {currentQ?.question}
            </h2>
            <div className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 font-bold px-6 py-2 rounded-full text-xl mb-8 flex items-center gap-2 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
              <Trophy className="w-5 h-5" /> 
              {currentQ?.difficulty === 'hard' ? '1500' : currentQ?.difficulty === 'medium' ? '1250' : '1000'} Points Question
            </div>

            {/* Answers count at the bottom or middle */}
            {gameState === 'QUESTION' && (
              <div className="absolute left-0 bottom-4 bg-slate-800 px-6 py-3 rounded-full text-2xl font-bold border border-slate-700">
                Answers: <span className="text-cyan-400">{answeredCount}</span> / {totalPlayers}
              </div>
            )}
            
            {/* Bar Chart for SHOW_ANSWER state */}
            {gameState === 'SHOW_ANSWER' && (
              <div className="w-full max-w-4xl flex items-end justify-center gap-8 mb-8 h-40">
                {currentQ?.options.map((_, idx) => {
                  const colors = ['bg-rose-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'];
                  const count = optionCounts[idx];
                  const maxCount = Math.max(...optionCounts, 1);
                  const height = `${(count / maxCount) * 100}%`;
                  const isCorrect = currentQ.correctAnswer === idx;

                  return (
                    <div key={idx} className="flex flex-col items-center justify-end h-full">
                      <div className="text-2xl font-bold mb-2">{count}</div>
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height }}
                        className={`w-20 rounded-t-lg ${colors[idx]} ${isCorrect ? 'opacity-100' : 'opacity-40'}`}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            
            <div className="w-full max-w-6xl grid grid-cols-2 gap-6 mt-auto mb-8">
              {currentQ?.options.map((opt, idx) => {
                const colors = ['bg-rose-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'];
                const isCorrect = currentQ.correctAnswer === idx;
                const showState = gameState === 'SHOW_ANSWER';
                
                // Dim incorrect answers in show_answer state
                const opacity = showState ? (isCorrect ? 'opacity-100' : 'opacity-30') : 'opacity-100';
                
                return (
                  <motion.div 
                    key={idx}
                    layout
                    className={`p-8 rounded-2xl text-2xl md:text-4xl font-bold flex items-center shadow-xl ${colors[idx]} ${opacity} transition-opacity duration-500 text-white`}
                  >
                    {/* Shapes placeholder - could use SVGs, using simple shapes for now */}
                    <div className="w-8 h-8 mr-6 bg-white/20 rounded flex-shrink-0"></div>
                    {opt}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
