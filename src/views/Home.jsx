import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { joinRoom } from '../network/peerClient';
import { initHost } from '../network/peerHost';
import { Button } from '../components/Button';
import { Card, CardContent } from '../components/Card';
import { Input, Label } from '../components/Input';
import { Zap, MonitorPlay } from 'lucide-react';

export default function Home() {
  const [roomCode, setRoomInput] = useState('');
  const [nickname, setNicknameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [adminError, setAdminError] = useState('');

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!roomCode || !nickname) return;

    setLoading(true);
    setError('');
    try {
      await joinRoom(roomCode.toUpperCase(), nickname);
    } catch (err) {
      setError('Could not join room. Check the code and try again.');
      setLoading(false);
    }
  };

  const handleHost = () => {
    setShowAdminPrompt(true);
  };

  const handleAdminSubmit = (e) => {
    e.preventDefault();
    if (adminCode === '11111') {
      useGameStore.getState().setRole(true);
    } else {
      setAdminError('Incorrect admin code');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-[#FCF8F5] text-[#1A1A1A]">
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, type: 'spring' }}
        className="text-center mb-12 z-10 flex flex-col items-center"
      >
        {/* Placeholder for the logo - you can put the actual logo image here */}
        <div className="text-5xl md:text-7xl font-display font-bold mb-2 tracking-widest text-[#1A1A1A]">
          <span className="text-[#C4A661]">S</span>PEAK
        </div>
        <div className="text-5xl md:text-7xl font-display font-bold mb-6 tracking-widest text-[#1A1A1A]">
          SOCIALLY
        </div>
        <p className="text-lg md:text-xl text-slate-600 font-medium tracking-wide">
          Baku Meetup & Social Club | Game Nights | Movie & Speak Club
        </p>
      </motion.div>

      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 z-10">

        {/* Player Join Card */}
        <Card className="border-[#C4A661]/30 box-glow-gold bg-white">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <Zap className="w-8 h-8 text-[#C4A661]" />
              <h2 className="text-3xl font-bold font-display">Join Game</h2>
            </div>

            <form onSubmit={handleJoin} className="space-y-6">
              <div>
                <Label className="text-slate-700">Nickname</Label>
                <Input
                  placeholder="Enter your nickname"
                  value={nickname}
                  onChange={e => setNicknameInput(e.target.value)}
                  maxLength={15}
                  required
                  className="bg-[#FCF8F5] border-slate-300 text-slate-900 focus:border-[#C4A661]"
                />
              </div>
              <div>
                <Label className="text-slate-700">Room Code</Label>
                <Input
                  placeholder="e.g. KHT-A1B2"
                  value={roomCode}
                  onChange={e => setRoomInput(e.target.value.toUpperCase())}
                  required
                  className="bg-[#FCF8F5] border-slate-300 text-slate-900 focus:border-[#C4A661]"
                />
              </div>

              {error && <p className="text-rose-500 text-sm">{error}</p>}

              <Button
                variant="gold"
                className="w-full text-lg py-4"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Connecting...' : 'Enter Game'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Host Game Card */}
        <Card className="border-[#1A1A1A]/20 box-glow-dark flex flex-col justify-between bg-white">
          <CardContent className="p-8 flex flex-col h-full">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <MonitorPlay className="w-8 h-8 text-[#1A1A1A]" />
                <h2 className="text-3xl font-bold font-display">Host Game</h2>
              </div>
              <p className="text-slate-600 mb-8 text-lg">
                Create custom quizzes, invite friends, and run the game from this device.
              </p>
            </div>

            {showAdminPrompt ? (
              <form onSubmit={handleAdminSubmit} className="mt-auto space-y-4">
                <div>
                  <Label className="text-slate-700">Admin Code</Label>
                  <Input
                    type="password"
                    placeholder="Enter admin code"
                    value={adminCode}
                    onChange={e => setAdminCode(e.target.value)}
                    required
                    className="bg-[#FCF8F5] border-slate-300 text-slate-900 focus:border-[#1A1A1A]"
                  />
                  {adminError && <p className="text-rose-500 text-sm mt-2">{adminError}</p>}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setShowAdminPrompt(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" variant="darkGold" className="flex-1">
                    Login
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                variant="darkGold"
                className="w-full text-lg py-4 mt-auto"
                onClick={handleHost}
              >
                Go to Host Dashboard
              </Button>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
