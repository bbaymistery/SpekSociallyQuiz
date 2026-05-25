import Peer from 'peerjs';
import { useGameStore } from '../store/gameStore';

let peer = null;
let hostConnection = null;
const peerConfig = {
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ]
  }
};

export const joinRoom = (roomCode, nickname) => {
  return new Promise((resolve, reject) => {
    peer = new Peer(peerConfig);

    peer.on('open', (id) => {
      useGameStore.getState().setRole(false);
      useGameStore.getState().setMyId(id);
      useGameStore.getState().setNickname(nickname);
      useGameStore.getState().setRoomCode(roomCode);

      // Connect to the host
      hostConnection = peer.connect(roomCode);

      hostConnection.on('open', () => {
        // Send join event
        hostConnection.send({ type: 'JOIN', nickname });
        resolve(true);
      });

      hostConnection.on('data', (data) => {
        handleHostMessage(data);
      });

      hostConnection.on('close', () => {
        console.log('Connection to host closed');
        useGameStore.getState().resetGame();
        alert('Host ended the game. Returning to home page.');
      });
      
      hostConnection.on('error', (err) => {
        console.error('Connection error:', err);
        reject(err);
      });
    });

    peer.on('error', (err) => {
      console.error('PeerJS Client Error:', err);
      reject(err);
    });
  });
};

const handleHostMessage = (data) => {
  const store = useGameStore.getState();

  if (data.type === 'STATE_UPDATE') {
    const s = data.state;
    // When a new question comes in, reset hasAnswered
    const wasLobby = store.gameState !== 'QUESTION';
    const isNowQuestion = s.gameState === 'QUESTION';
    
    // We should reset hasAnswered if transitioning TO a QUESTION state
    // But since state might spam, only reset if it changed.
    let nextHasAnswered = store.hasAnswered;
    if (wasLobby && isNowQuestion) {
      nextHasAnswered = false;
    }
    // Alternatively, if the currentQuestion changes text, reset.
    if (s.currentQuestion && store.currentQuestion && s.currentQuestion.text !== store.currentQuestion.text) {
      nextHasAnswered = false;
    }

    useGameStore.setState({
      gameState: s.gameState,
      timeRemaining: s.timeRemaining,
      players: s.players,
      currentQuestion: s.currentQuestion,
      hasAnswered: nextHasAnswered
    });
  } else if (data.type === 'ANSWER_ACK') {
    useGameStore.setState({ hasAnswered: true });
  }
};

export const sendAnswer = (answerIdx) => {
  if (hostConnection && hostConnection.open) {
    hostConnection.send({ type: 'ANSWER', answerIdx });
  }
};

export const leaveRoom = () => {
  if (hostConnection) {
    hostConnection.close();
  }
  if (peer) {
    peer.destroy();
    peer = null;
  }
};
