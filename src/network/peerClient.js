import Peer from 'peerjs';
import { useGameStore } from '../store/gameStore';

let peer = null;
let hostConnection = null;
const peerConfig = {
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
      { 
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      { 
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      { 
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ]
  }
};

export const joinRoom = (roomCode, nickname) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        peer = new Peer(peerConfig);

        peer.on('open', (id) => {
          useGameStore.getState().setMyId(id);

          // Connect to the host
          hostConnection = peer.connect(roomCode);

          hostConnection.on('open', () => {
            // Update local state ONLY when connection is successful
            useGameStore.getState().setRole(false);
            useGameStore.getState().setNickname(nickname);
            useGameStore.getState().setRoomCode(roomCode);
            
            // Send join event
            hostConnection.send({ type: 'JOIN', nickname });
            resolve(true);

            // Keep-alive heartbeat to prevent NAT/TURN timeouts
            setInterval(() => {
              if (hostConnection && hostConnection.open) {
                hostConnection.send({ type: 'PING' });
              }
            }, 3000);
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
      } catch (err) {
        console.error('Failed to initialize PeerJS client:', err);
        reject(err);
      }
    }, 10);
  });
};

const handleHostMessage = (data) => {
  try {
    console.log('Received from host:', data);
    const store = useGameStore.getState();

    if (data.type === 'STATE_UPDATE') {
      const s = data.state;
      // When a new question comes in, reset hasAnswered
      const wasLobby = store.gameState !== 'QUESTION';
      const isNowQuestion = s.gameState === 'QUESTION';
      
      let nextHasAnswered = store.hasAnswered;
      if (wasLobby && isNowQuestion) {
        nextHasAnswered = false;
      }
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
  } catch (err) {
    console.error('Error handling host message:', err);
  }
};

export const sendAnswer = (answerIdx) => {
  if (hostConnection && hostConnection.open) {
    hostConnection.send({ type: 'ANSWER', answerIdx });
    useGameStore.getState().setLocalAnswer(answerIdx);
    useGameStore.setState({ hasAnswered: true });
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
