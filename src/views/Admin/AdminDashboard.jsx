import { useState } from 'react';
import { useQuizStore, useGameStore } from '../../store/gameStore';
import { initHost } from '../../network/peerHost';
import { Button } from '../../components/Button';
import { Card, CardContent } from '../../components/Card';
import { Play, Plus, Trash2, Edit } from 'lucide-react';
import QuizBuilder from './QuizBuilder';

export default function AdminDashboard() {
  const quizzes = useQuizStore(state => state.quizzes);
  const deleteQuiz = useQuizStore(state => state.deleteQuiz);
  
  const [view, setView] = useState('list'); // 'list' | 'build'
  const [editingQuizId, setEditingQuizId] = useState(null);

  const handleStartGame = (quiz) => {
    useGameStore.getState().setQuiz(quiz);
    useGameStore.getState().setGameState('LOBBY');
    initHost(); // Starts the peer and sets room code
  };

  const handleEdit = (id) => {
    setEditingQuizId(id);
    setView('build');
  };

  const handleCreate = () => {
    setEditingQuizId(null);
    setView('build');
  };

  if (view === 'build') {
    return (
      <QuizBuilder 
        quizId={editingQuizId} 
        onBack={() => setView('list')} 
      />
    );
  }

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-10">
        <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#C4A661] to-yellow-300 text-center sm:text-left">
          Host Dashboard
        </h1>
        <Button variant="gold" onClick={handleCreate} className="flex items-center gap-2 w-full sm:w-auto justify-center">
          <Plus className="w-5 h-5" /> Create Quiz
        </Button>
      </div>

      {quizzes.length === 0 ? (
        <Card className="text-center py-20 border-dashed border-2 border-slate-700 bg-slate-800/30">
          <CardContent>
            <h2 className="text-2xl text-slate-400 mb-4">No quizzes found</h2>
            <p className="text-slate-500 mb-6">Create your first quiz to start hosting!</p>
            <Button variant="ghost" onClick={handleCreate}>Start Building</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map(quiz => (
            <Card key={quiz.id} className="flex flex-col">
              <CardContent className="p-6 flex-1 flex flex-col">
                <h3 className="text-2xl font-bold mb-2 truncate">{quiz.title || 'Untitled Quiz'}</h3>
                <p className="text-slate-400 mb-6">{quiz.questions?.length || 0} Questions</p>
                
                <div className="mt-auto flex items-center justify-between gap-2">
                  <Button 
                    variant="neonCyan" 
                    className="flex-1 flex items-center justify-center gap-2 py-2"
                    onClick={() => handleStartGame(quiz)}
                  >
                    <Play className="w-4 h-4 fill-current" /> Host
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button variant="ghost" className="px-3 py-2" onClick={() => handleEdit(quiz.id)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" className="px-3 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-900/30" onClick={() => deleteQuiz(quiz.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
