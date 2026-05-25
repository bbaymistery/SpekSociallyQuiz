import { useGameStore } from './store/gameStore';
import Home from './views/Home';
import AdminDashboard from './views/Admin/AdminDashboard';
import HostScreen from './views/Admin/HostScreen';
import PlayerScreen from './views/Player/PlayerScreen';

function App() {
  const { isHost, roomCode, nickname, gameState } = useGameStore();

  // Route: Host Flow
  if (isHost) {
    if (gameState === 'LOBBY' && !roomCode) {
      return <AdminDashboard />;
    }
    return <HostScreen />;
  }

  // Route: Player Flow
  if (roomCode && nickname) {
    return <PlayerScreen />;
  }

  // Default: Home (join or start hosting)
  return <Home />;
}

export default App;
