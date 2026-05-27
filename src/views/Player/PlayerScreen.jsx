import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { sendAnswer, leaveRoom } from '../../network/peerClient';
import { Button } from '../../components/Button';
import { LogOut, CheckCircle2, XCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useEffect, useState } from 'react';

export default function PlayerScreen() {
  const store = useGameStore();
  const [previousScore, setPreviousScore] = useState(0);
  
  const { 
    gameState, nickname, myId, players,  
    currentQuestion, hasAnswered, timeRemaining 
  } = store;

  // Find my own score/status from players array
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const myPlayerInfo = players.find(p => p.id === myId);
  const myScore = myPlayerInfo?.score || 0;
  const myRank = sortedPlayers.findIndex(p => p.id === myId) + 1;

  // Let's implement the UI first.
  const handleAnswer = (idx) => {
    if (!hasAnswered && gameState === 'QUESTION') {
      sendAnswer(idx);
    }
  };

  const handleLeave = () => {
    leaveRoom();
    store.resetGame();
  };

  useEffect(() => {
    if (gameState === 'QUESTION') {
      setPreviousScore(myScore);
    }
  }, [gameState, myScore]);

  if (gameState === 'LOBBY') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900 text-center">
        <div className="absolute top-4 right-4">
          <Button variant="ghost" onClick={handleLeave} className="text-slate-400">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-4xl font-bold mb-4"
        >
          You're in!
        </motion.div>
        <p className="text-xl text-slate-400">See your nickname on screen</p>
        <div className="mt-8 px-8 py-4 rounded-full bg-slate-800 text-2xl font-bold shadow-xl border border-slate-700">
          {nickname}
        </div>
      </div>
    );
  }

  if (gameState === 'QUESTION') {
    if (hasAnswered) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#1A1A1A] text-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-4xl font-bold mb-4 text-[#C4A661] drop-shadow-lg"
          >
            Answer submitted!
          </motion.div>
          <div className="text-xl mt-2 mb-8 opacity-80 text-slate-300 font-medium">
            Waiting for others to answer...
          </div>
          <div className="w-16 h-16 border-4 border-[#C4A661] border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }

    const percentage = Math.max(0, (timeRemaining / (currentQuestion?.timer || 20)) * 100);
    const colors = [
      { bg: 'bg-rose-600', shadow: 'shadow-[0_4px_0_rgb(159,18,57)]' },
      { bg: 'bg-blue-600', shadow: 'shadow-[0_4px_0_rgb(30,58,138)]' },
      { bg: 'bg-yellow-500', shadow: 'shadow-[0_4px_0_rgb(161,98,7)]' },
      { bg: 'bg-green-600', shadow: 'shadow-[0_4px_0_rgb(21,128,61)]' }
    ];

    return (
      <div className="min-h-screen flex flex-col p-4 bg-slate-900 overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <div className="font-bold text-slate-300">{nickname}</div>
          <div className="font-bold text-cyan-400 bg-slate-800 px-3 py-1 rounded-full text-sm">{myScore} pts</div>
        </div>

        {/* Animated Pacman Timer */}
        <div className="relative w-full h-6 bg-slate-800 rounded-full overflow-hidden border border-slate-700 shadow-inner mb-2">
          <div className="absolute inset-0 flex justify-between items-center px-4">
            {[...Array(15)].map((_, i) => (
              <div key={i} className="w-1 h-1 bg-yellow-500/50 rounded-full" />
            ))}
          </div>
          <motion.div 
            className="absolute top-0 bottom-0 left-0 flex items-center justify-center z-10"
            initial={{ left: '0%' }}
            animate={{ left: `calc(${100 - percentage}% - 14px)` }}
            transition={{ duration: 1, ease: "linear" }}
          >
             <div className="pacman" style={{ transform: 'scale(0.8)' }}></div>
          </motion.div>
        </div>

        {currentQuestion && (
          <div className="text-center mb-4 bg-slate-800/80 p-4 rounded-xl border border-slate-700 shadow-lg flex flex-col items-center">
            <h2 className="text-base md:text-lg font-bold mb-3 text-slate-100 drop-shadow-sm">{currentQuestion.text}</h2>
            <div className="bg-yellow-500/20 text-yellow-400 text-xs font-bold px-4 py-1.5 rounded-full inline-block border border-yellow-500/50">
              <span className="opacity-80 mr-1">Valued at:</span>
              {currentQuestion.difficulty === 'hard' ? '1500' : currentQuestion.difficulty === 'medium' ? '1250' : '1000'} Points
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2 mt-auto">
          {currentQuestion?.options.map((opt, idx) => (
            <motion.button
              key={idx}
              whileTap={{ scale: 0.95, y: 4 }}
              onClick={() => handleAnswer(idx)}
              className={`${colors[idx].bg} ${colors[idx].shadow} rounded-xl active:brightness-90 px-4 py-4 md:py-6 flex items-center justify-between transition-colors`}
            >
              <span className="font-bold text-base md:text-lg text-left text-white drop-shadow-md line-clamp-2">
                {opt}
              </span>
              <div className="w-5 h-5 rounded-full border-2 border-white/50 flex-shrink-0 ml-4"></div>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  if (gameState === 'SHOW_ANSWER' || gameState === 'LEADERBOARD' || gameState === 'GAMEOVER') {
    if ((gameState === 'SHOW_ANSWER' || gameState === 'LEADERBOARD') && currentQuestion?.correctAnswer !== undefined) {
      const isTimeout = store.localAnswer === null;
      const isCorrect = !isTimeout && store.localAnswer === currentQuestion.correctAnswer;
      
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900 text-center relative overflow-hidden">
          {/* Subtle background glow based on correctness */}
          <div className={`absolute inset-0 opacity-20 pointer-events-none transition-colors duration-1000 ${isCorrect ? 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-600 via-transparent to-transparent' : 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-rose-600 via-transparent to-transparent'}`} />
          
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 15, stiffness: 100 }}
            className="z-10 flex flex-col items-center w-full max-w-md"
          >
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-lg ${isCorrect ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-rose-500/20 text-rose-400 border border-rose-500/50'}`}>
              {isCorrect ? <CheckCircle2 className="w-12 h-12" /> : <XCircle className="w-12 h-12" />}
            </div>
            
            <h1 className={`text-4xl font-bold mb-8 ${isCorrect ? 'text-green-400' : 'text-rose-400'}`}>
              {isTimeout ? "Time's Up!" : isCorrect ? "Correct!" : "Incorrect"}
            </h1>
            
            {isCorrect && (
              <div className="bg-slate-800/80 border border-slate-700 w-full rounded-2xl p-6 shadow-xl mb-6">
                <p className="text-4xl font-black text-[#C4A661] mb-2">+{myPlayerInfo?.score - previousScore}</p>
                <p className="text-slate-400 font-medium text-sm uppercase tracking-widest">Points Earned</p>
                
                <div className="w-full h-px bg-slate-700/50 my-4"></div>
                
                <p className="text-slate-400 font-medium text-sm uppercase tracking-widest mb-1">Total Points</p>
                <p className="text-2xl font-bold text-cyan-400">{myScore}</p>
              </div>
            )}

            {!isCorrect && (
              <div className="bg-slate-800/80 border border-slate-700 w-full rounded-2xl p-6 shadow-xl mb-6 flex flex-col items-center">
                <div className="opacity-60 text-xs uppercase tracking-widest mb-3 text-slate-300 font-bold">Correct answer was</div>
                <div className="text-xl font-bold text-white text-center w-full">
                  {currentQuestion.options[currentQuestion.correctAnswer]}
                </div>
                
                <div className="w-full h-px bg-slate-700/50 my-4"></div>
                
                <p className="text-4xl font-black text-rose-500 mb-2">+0</p>
                <p className="text-slate-400 font-medium text-sm uppercase tracking-widest mb-4">Points Earned</p>
                
                <div className="w-full h-px bg-slate-700/50 my-4"></div>
                
                <p className="text-slate-400 font-medium text-sm uppercase tracking-widest mb-1">Total Points</p>
                <p className="text-2xl font-bold text-cyan-400">{myScore}</p>
              </div>
            )}

            <div className="mt-4 bg-[#1A1A1A] border border-[#C4A661]/30 w-full rounded-2xl p-4 shadow-inner flex flex-col items-center">
              <span className="text-slate-400 text-sm font-medium mb-1">Your Rank</span>
              <span className="text-2xl font-bold text-[#C4A661]">
                {myRank}{myRank === 1 ? 'st' : myRank === 2 ? 'nd' : myRank === 3 ? 'rd' : 'th'} Place
              </span>
            </div>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900 text-center">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-4xl font-bold mb-4"
        >
          {gameState === 'LEADERBOARD' ? 'Leaderboard' : 'Game Over!'}
        </motion.div>
        <p className="text-2xl text-slate-400">Look at the main screen</p>
        <div className="mt-12 text-3xl font-bold text-cyan-400">
          Your Score: {myScore}
        </div>
        {gameState === 'GAMEOVER' && (
          <Button variant="ghost" onClick={handleLeave} className="mt-12 text-slate-300 border-slate-600 hover:bg-slate-800 hover:text-white">
             Leave Game
          </Button>
        )}
      </div>
    );
  }

  return null;
}
