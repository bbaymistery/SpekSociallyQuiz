import Peer from 'peerjs';
import { useGameStore } from '../store/gameStore';

let peer = null;
let connections = {}; // clientId -> dataConnection

const generateShortCode = () => {
  // Returns a 6-digit number between 100000 and 999999
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const initHost = () => {
  const roomCode = generateShortCode();
  
  peer = new Peer(roomCode);

  peer.on('open', (id) => {
    useGameStore.getState().setRole(true);
    useGameStore.getState().setMyId(id);
    useGameStore.getState().setRoomCode(id);
  });

  peer.on('connection', (conn) => {
    connections[conn.peer] = conn;

    conn.on('data', (data) => {
      handleClientMessage(conn.peer, data);
    });

    conn.on('close', () => {
      delete connections[conn.peer];
      useGameStore.getState().removePlayer(conn.peer);
      broadcastGameState();
    });
  });

  peer.on('error', (err) => {
    console.error('PeerJS Host Error:', err);
  });
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
    // data.answerIdx
    const q = store.currentQuiz.questions[store.currentQuestionIndex];
    const isCorrect = q.correctAnswer === data.answerIdx;
    
    // Calculate score using our utility, but here we just rely on the host's time
    // For a real app, client time vs host time might desync, but local network is fast.
    import('../utils/scoring').then(({ calculateScore }) => {
      const pts = calculateScore(q.difficulty, store.timeRemaining, q.timer || 20, isCorrect);
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
  
  // Clean up current question so we don't send the correct answer to clients!
  let clientQuestion = null;
  if (state.currentQuiz && state.currentQuiz.questions[state.currentQuestionIndex]) {
    const fullQ = state.currentQuiz.questions[state.currentQuestionIndex];
    clientQuestion = {
      text: fullQ.question,
      options: fullQ.options,
      difficulty: fullQ.difficulty,
      timer: fullQ.timer
    };
    
    // Only send the correct answer when the round is over to prevent cheating
    if (state.gameState === 'SHOW_ANSWER' || state.gameState === 'LEADERBOARD') {
      clientQuestion.correctAnswer = fullQ.correctAnswer;
    }
  }

  return {
    gameState: state.gameState,
    timeRemaining: state.timeRemaining,
    players: state.players,
    currentQuestion: clientQuestion,
    // Send answers so clients know if they answered, but don't send points until round ends
    answeredCount: Object.keys(state.answers).length
  };
};

export const broadcastGameState = () => {
  const stateUpdate = getSyncableState();
  Object.values(connections).forEach(conn => {
    if (conn.open) {
      conn.send({ type: 'STATE_UPDATE', state: stateUpdate });
    }
  });
};

export const sendToClient = (clientId, msg) => {
  const conn = connections[clientId];
  if (conn && conn.open) {
    conn.send(msg);
  }
};

export const closeHost = () => {
  if (peer) {
    peer.destroy();
    peer = null;
  }
  connections = {};
};
