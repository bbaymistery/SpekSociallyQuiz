import { io } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';

const SOCKET_SERVER_URL = process.env.NODE_ENV === 'production' 
  ? 'https://speksociallyquiz.onrender.com' // Deployed Render backend
  : 'http://localhost:3001';

let socket = null;

// Ensure we have a socket connection
const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_SERVER_URL);
    
    // Global listener for messages from the host (for clients)
    socket.on('hostMessage', (data) => {
      const store = useGameStore.getState();
      if (!store.isHost) {
        handleHostMessage(data);
      }
    });

    // Global listener for messages from clients (for host)
    socket.on('clientMessage', ({ clientId, data }) => {
      const store = useGameStore.getState();
      if (store.isHost) {
        handleClientMessage(clientId, data);
      }
    });

    // Global listener for client disconnections (for host)
    socket.on('clientLeft', (clientId) => {
      const store = useGameStore.getState();
      if (store.isHost) {
        store.removePlayer(clientId);
        broadcastGameState();
      }
    });
  }
  return socket;
};

// ==========================================
// HOST LOGIC
// ==========================================

const generateShortCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const initHost = () => {
  const roomCode = generateShortCode();
  const s = getSocket();
  
  useGameStore.getState().setRole(true);
  useGameStore.getState().setRoomCode(roomCode);
  
  // Create the room on the server
  s.emit('createRoom', roomCode);
};

export const broadcastGameState = () => {
  const s = getSocket();
  const stateUpdate = getSyncableState();
  const roomCode = useGameStore.getState().roomCode;
  
  if (roomCode) {
    s.emit('hostBroadcast', { roomCode, data: { type: 'STATE_UPDATE', state: stateUpdate } });
  }
};

export const sendToClient = (clientId, msg) => {
  const s = getSocket();
  s.emit('hostSendToClient', { clientId, data: msg });
};

export const closeHost = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

const handleClientMessage = (clientId, data) => {
  const store = useGameStore.getState();
  
  if (data.type === 'JOIN') {
    store.addPlayer({
      id: clientId,
      nickname: data.nickname,
      score: 0,
      color: getRandomColor()
    });
    // Immediately send current state to the new client
    sendToClient(clientId, { type: 'STATE_UPDATE', state: getSyncableState() });
    broadcastGameState(); // tell others the lobby updated
  } else if (data.type === 'ANSWER') {
    const q = store.currentQuiz.questions[store.currentQuestionIndex];
    const isCorrect = q.correctAnswer === data.answerIdx;
    
    const timeTakenMs = Date.now() - store.questionStartTime;
    const totalTimeMs = (q.timer || 20) * 1000;
    const timeRemainingMs = Math.max(0, totalTimeMs - timeTakenMs);
    
    import('../utils/scoring').then(({ calculateScore }) => {
      const pts = calculateScore(q.difficulty, timeRemainingMs, totalTimeMs, isCorrect);
      store.recordAnswer(clientId, data.answerIdx, store.timeRemaining, pts);
      
      // Let client know their answer was received
      sendToClient(clientId, { type: 'ANSWER_ACK' });
    });
  }
};

const getRandomColor = () => {
  const colors = ['#00f3ff', '#ff00ff', '#fffb00', '#00ff66', '#ff6600'];
  return colors[Math.floor(Math.random() * colors.length)];
};

const getSyncableState = () => {
  const state = useGameStore.getState();
  
  let clientQuestion = null;
  if (state.currentQuiz && state.currentQuiz.questions[state.currentQuestionIndex]) {
    const fullQ = state.currentQuiz.questions[state.currentQuestionIndex];
    clientQuestion = {
      text: fullQ.question,
      options: fullQ.options,
      difficulty: fullQ.difficulty,
      timer: fullQ.timer
    };
    
    if (state.gameState === 'SHOW_ANSWER' || state.gameState === 'LEADERBOARD' || state.gameState === 'GAMEOVER') {
      clientQuestion.correctAnswer = fullQ.correctAnswer;
    }
  }

  return {
    gameState: state.gameState,
    timeRemaining: state.timeRemaining,
    players: state.players,
    currentQuestion: clientQuestion,
    answeredCount: Object.keys(state.answers).length
  };
};

// ==========================================
// CLIENT LOGIC
// ==========================================

export const joinRoom = (roomCode, nickname) => {
  return new Promise((resolve, reject) => {
    const s = getSocket();
    
    s.emit('joinRoom', { roomCode, nickname }, (response) => {
      if (response.error) {
        reject(new Error(response.error));
      } else {
        useGameStore.getState().setRole(false);
        useGameStore.getState().setNickname(nickname);
        useGameStore.getState().setRoomCode(roomCode);
        useGameStore.getState().setMyId(s.id); // Store socket ID to track score
        resolve(true);
      }
    });
  });
};

export const sendAnswer = (answerIdx) => {
  const store = useGameStore.getState();
  // Optimistically mark as answered
  store.setLocalAnswer(answerIdx);
  
  const s = getSocket();
  s.emit('clientSendToHost', { type: 'ANSWER', answerIdx });
};

export const leaveRoom = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

const handleHostMessage = (data) => {
  const store = useGameStore.getState();

  if (data.type === 'STATE_UPDATE') {
    const s = data.state;
    
    let nextHasAnswered = store.hasAnswered;
    // If we transition to a new QUESTION state
    if (s.gameState === 'QUESTION' && store.gameState !== 'QUESTION') {
      nextHasAnswered = false;
      store.setLocalAnswer(null);
    }
    
    // If currentQuestion changes text
    if (s.currentQuestion && store.currentQuestion && s.currentQuestion.text !== store.currentQuestion.text) {
      nextHasAnswered = false;
      store.setLocalAnswer(null);
    }
    
    // Safety fallback: if round ends, reset
    if (s.gameState !== 'QUESTION') {
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
