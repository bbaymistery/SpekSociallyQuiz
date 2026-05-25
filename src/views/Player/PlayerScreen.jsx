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
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900 text-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-3xl font-bold mb-4"
          >
            Waiting for others...
          </motion.div>
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mt-8"></div>
        </div>
      );
    }

    const colors = ['bg-rose-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'];
    return (
      <div className="min-h-screen flex flex-col p-4 bg-slate-900">
        <div className="flex justify-between items-center mb-4">
          <div className="font-bold text-slate-300">{nickname}</div>
          <div className="flex gap-4">
            <div className="font-bold text-slate-100">{timeRemaining}s</div>
            <div className="font-bold text-cyan-400">{myScore} pts</div>
          </div>
        </div>

        {currentQuestion && (
          <div className="bg-slate-800/80 p-6 rounded-2xl mb-4 text-center border border-slate-700 shadow-lg flex flex-col items-center">
            <h2 className="text-xl md:text-2xl font-bold mb-3">{currentQuestion.text}</h2>
            <div className="bg-yellow-500/20 text-yellow-400 text-sm font-bold px-3 py-1 rounded-full inline-block border border-yellow-500/50">
              {currentQuestion.difficulty === 'hard' ? '1500' : currentQuestion.difficulty === 'medium' ? '1250' : '1000'} Points
            </div>
          </div>
        )}

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
          {currentQuestion?.options.map((opt, idx) => (
            <motion.button
              key={idx}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAnswer(idx)}
              className={`${colors[idx]} rounded-2xl shadow-lg active:brightness-75 p-6 flex items-center justify-center`}
            >
              <span className="text-white font-bold text-xl drop-shadow-md text-center">
                {opt}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  if (gameState === 'SHOW_ANSWER' || gameState === 'LEADERBOARD') {
    // Ideally we'd show correct/incorrect. For now:
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900 text-center">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-4xl font-bold mb-4"
        >
          {gameState === 'LEADERBOARD' ? 'Leaderboard' : 'Time is up!'}
        </motion.div>
        <p className="text-2xl text-slate-400">Look at the main screen</p>
        <div className="mt-12 text-3xl font-bold text-cyan-400">
          Your Score: {myScore}
        </div>
      </div>
    );
  }

  return null;
}
