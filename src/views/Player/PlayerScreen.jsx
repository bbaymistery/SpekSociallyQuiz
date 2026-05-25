import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { sendAnswer, leaveRoom } from '../../network/peerClient';
import { Button } from '../../components/Button';
import { LogOut, CheckCircle2, XCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

export default function PlayerScreen() {
  const store = useGameStore();
  const { 
    gameState, nickname, myId, players, 
    currentQuestion, hasAnswered, timeRemaining 
  } = store;

  // Find my own score/status from players array
  const myPlayerInfo = players.find(p => p.id === myId);
  const myScore = myPlayerInfo?.score || 0;

  // Check if I got the last question right by looking at my score jump or we can infer from host state.
  // Actually, the host doesn't tell the client if they got it right immediately to prevent cheating.
  // When in SHOW_ANSWER, the currentQuestion has the options and difficulty but not the correctAnswer index directly in state.
  // Wait, I need to make sure the host sends the correctAnswer when state is SHOW_ANSWER!
  // I'll update peerHost getSyncableState to include correctAnswer ONLY if gameState === 'SHOW_ANSWER'.

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

  // Trigger confetti on correct answer
  useEffect(() => {
    if (gameState === 'SHOW_ANSWER' && currentQuestion?.correctAnswer !== undefined) {
      // Find what the user answered... we didn't store the local answer choice.
      // But we can check if they earned points this round? Host only sends updated players array.
      // A simpler way: just show "Look up at the screen!" if we don't have local knowledge.
      // Let's assume the user just looks at the host screen for results for now to keep it simple, Kahoot style.
      // Kahoot actually shows "Correct" or "Incorrect" on the device.
      // To do this, I need to store the local answer choice. 
    }
  }, [gameState]);

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
            className="text-3xl font-bold mb-4 text-[#C4A661]"
          >
            Waiting for others...
          </motion.div>
          <div className="w-16 h-16 border-4 border-[#C4A661] border-t-transparent rounded-full animate-spin mt-8"></div>
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
    // Ideally we'd show correct/incorrect. For now:
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900 text-center">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-4xl font-bold mb-4"
        >
          {gameState === 'LEADERBOARD' ? 'Leaderboard' : gameState === 'GAMEOVER' ? 'Game Over!' : 'Time is up!'}
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
