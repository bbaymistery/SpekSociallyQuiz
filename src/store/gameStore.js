import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Store for managing the actual game state (in-memory, volatile)
export const useGameStore = create((set, get) => ({
  isHost: false,
  myId: null,
  roomCode: null,
  nickname: '',
  
  // Game Flow State
  // LOBBY -> QUESTION -> WAITING_ANSWERS -> SHOW_ANSWER -> LEADERBOARD -> QUESTION...
  gameState: 'LOBBY', 
  
  // Host state
  currentQuiz: null,
  currentQuestionIndex: 0,
  players: [], // { id, nickname, score, color }
  answers: {}, // { playerId: { answerIdx, timeRemaining, pointsEarned } }
  
  // Shared state
  timeRemaining: 0,
  currentQuestion: null, // For client view
  hasAnswered: false,    // For client view
  localAnswer: null,     // To track what the client chose
  selectedMusic: '/kahoot_vibe.mp3', // default music
  questionStartTime: null, // Track exact millisecond when question starts
  
  // Actions
  setRole: (isHost) => set({ isHost }),
  setMyId: (myId) => set({ myId }),
  setRoomCode: (roomCode) => set({ roomCode }),
  setNickname: (nickname) => set({ nickname }),
  setGameState: (gameState) => set({ gameState }),
  setLocalAnswer: (idx) => set({ localAnswer: idx }),
  setSelectedMusic: (url) => set({ selectedMusic: url }),
  setQuestionStartTime: (time) => set({ questionStartTime: time }),
  
  setQuiz: (quiz) => set({ currentQuiz: quiz, currentQuestionIndex: 0 }),
  nextQuestion: () => set((state) => ({ 
    currentQuestionIndex: state.currentQuestionIndex + 1,
    gameState: 'QUESTION',
    answers: {}, // reset answers for next question
    localAnswer: null // reset local answer
  })),
  
  addPlayer: (player) => set((state) => {
    // Avoid duplicates
    if (state.players.find(p => p.id === player.id)) return state;
    return { players: [...state.players, player] };
  }),
  
  removePlayer: (playerId) => set((state) => ({
    players: state.players.filter(p => p.id !== playerId)
  })),

  recordAnswer: (playerId, answerIdx, timeRemaining, pointsEarned) => set((state) => ({
    answers: {
      ...state.answers,
      [playerId]: { answerIdx, timeRemaining, pointsEarned }
    }
  })),
  
  applyScores: () => set((state) => {
    const updatedPlayers = state.players.map(p => {
      const pAnswer = state.answers[p.id];
      if (pAnswer && pAnswer.pointsEarned > 0) {
        return { 
          ...p, 
          score: p.score + pAnswer.pointsEarned,
          streak: (p.streak || 0) + 1 
        };
      } else {
        return { 
          ...p, 
          streak: 0 
        };
      }
    });
    // Sort descending
    updatedPlayers.sort((a, b) => b.score - a.score);
    return { players: updatedPlayers };
  }),
  
  setTimeRemaining: (time) => set({ timeRemaining: time }),
  
  resetGame: () => set({
    isHost: false,
    myId: null,
    roomCode: null,
    nickname: '',
    gameState: 'LOBBY',
    currentQuiz: null,
    currentQuestionIndex: 0,
    players: [],
    answers: {},
    timeRemaining: 0,
    currentQuestion: null,
    hasAnswered: false,
    localAnswer: null
  })
}));

// Store for managing saved quizzes (persisted in localStorage)
export const useQuizStore = create(
  persist(
    (set) => ({
      quizzes: [],
      addQuiz: (quiz) => set((state) => ({
        quizzes: [...state.quizzes, { ...quiz, id: Date.now().toString() }]
      })),
      updateQuiz: (id, updatedQuiz) => set((state) => ({
        quizzes: state.quizzes.map(q => q.id === id ? { ...q, ...updatedQuiz } : q)
      })),
      deleteQuiz: (id) => set((state) => ({
        quizzes: state.quizzes.filter(q => q.id !== id)
      }))
    }),
    {
      name: 'kahoot-quizzes-storage',
    }
  )
);
