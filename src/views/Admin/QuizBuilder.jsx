import { useState, useEffect } from 'react';
import { useQuizStore } from '../../store/gameStore';
import { extractTextFromPDF, extractTextFromImage, extractTextFromPPTX, generateQuestionsFromText } from '../../utils/parser';
import { Button } from '../../components/Button';
import { Card, CardContent } from '../../components/Card';
import { Input, Label } from '../../components/Input';
import { ArrowLeft, Plus, UploadCloud, Save, Trash2 } from 'lucide-react';

export default function QuizBuilder({ quizId, onBack }) {
  const { quizzes, addQuiz, updateQuiz } = useQuizStore();
  const existingQuiz = quizId ? quizzes.find(q => q.id === quizId) : null;
  
  const [title, setTitle] = useState(existingQuiz?.title || '');
  const [questions, setQuestions] = useState(existingQuiz?.questions || []);
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (geminiKey) {
      localStorage.setItem('gemini_api_key', geminiKey);
    }
  }, [geminiKey]);

  const handleSave = () => {
    if (!title.trim()) return alert("Title is required");
    if (questions.length === 0) return alert("Add at least one question");
    
    if (existingQuiz) {
      updateQuiz(quizId, { title, questions });
    } else {
      addQuiz({ title, questions });
    }
    onBack();
  };

  const handleAddEmptyQuestion = () => {
    setQuestions([...questions, {
      id: Date.now().toString(),
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      timeLimit: 20,
      difficulty: 'medium'
    }]);
  };

  const updateQuestion = (index, field, value) => {
    const newQ = [...questions];
    newQ[index] = { ...newQ[index], [field]: value };
    setQuestions(newQ);
  };

  const updateOption = (qIndex, optIndex, value) => {
    const newQ = [...questions];
    newQ[qIndex].options[optIndex] = value;
    setQuestions(newQ);
  };

  const deleteQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsGenerating(true);
    try {
      let text = '';
      if (file.type === 'application/pdf') {
        text = await extractTextFromPDF(file);
      } else if (file.type.startsWith('image/')) {
        text = await extractTextFromImage(file);
      } else if (file.name.endsWith('.pptx') || file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
        text = await extractTextFromPPTX(file);
      } else {
        throw new Error("Unsupported file type. Use PDF, PPTX, or Image.");
      }

      const generated = await generateQuestionsFromText(text, geminiKey);
      if (generated && generated.length > 0) {
        setQuestions([...questions, ...generated]);
      }
    } catch (err) {
      console.error(err);
      alert("Error parsing file: " + err.message);
    }
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="px-3" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold">{existingQuiz ? 'Edit Quiz' : 'Create Quiz'}</h1>
        </div>
        <Button variant="neonCyan" onClick={handleSave} className="flex items-center gap-2">
          <Save className="w-5 h-5" /> Save Quiz
        </Button>
      </div>

      <Card className="mb-8 border-slate-700">
        <CardContent className="p-6">
          <Label>Quiz Title</Label>
          <Input 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            placeholder="E.g. Javascript Fundamentals" 
            className="text-xl font-bold mb-6"
          />
          
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <UploadCloud className="text-fuchsia-400" /> Auto-Generate from Slide (PDF/Image)
            </h3>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <Label>Gemini API Key (Optional, for better AI generation)</Label>
                <Input 
                  type="password"
                  value={geminiKey} 
                  onChange={e => setGeminiKey(e.target.value)} 
                  placeholder="AIzaSy..." 
                />
              </div>
              <div className="relative">
                <Input 
                  type="file" 
                  accept=".pdf,image/*,.pptx" 
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  disabled={isGenerating}
                />
                <Button variant="ghost" disabled={isGenerating} className="w-full">
                  {isGenerating ? 'Generating...' : 'Upload File'}
                </Button>
              </div>
            </div>
            {isGenerating && <p className="text-cyan-400 mt-2 text-sm animate-pulse">Extracting text and generating questions... this may take a moment.</p>}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {questions.map((q, qIndex) => (
          <Card key={q.id} className="relative overflow-visible">
            <div className="absolute -left-4 -top-4 w-8 h-8 bg-cyan-500 text-slate-900 font-bold rounded-full flex items-center justify-center z-10 shadow-lg">
              {qIndex + 1}
            </div>
            <Button 
              variant="ghost" 
              className="absolute right-4 top-4 text-rose-400 px-2 py-1"
              onClick={() => deleteQuestion(qIndex)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            
            <CardContent className="p-6 pt-10">
              <div className="grid md:grid-cols-4 gap-4 mb-4">
                <div className="md:col-span-4">
                  <Label>Question</Label>
                  <Input 
                    value={q.question} 
                    onChange={e => updateQuestion(qIndex, 'question', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Question Type</Label>
                  <select 
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100"
                    value={q.type || 'normal'}
                    onChange={e => {
                      const type = e.target.value;
                      const newOptions = type === 'boolean' ? ['True', 'False'] : ['', '', '', ''];
                      const newQ = [...questions];
                      newQ[qIndex] = { ...newQ[qIndex], type, options: newOptions, correctAnswer: 0 };
                      setQuestions(newQ);
                    }}
                  >
                    <option value="normal">Normal (4 Options)</option>
                    <option value="boolean">True / False</option>
                  </select>
                </div>
                <div>
                  <Label>Time Limit (s)</Label>
                  <select 
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100"
                    value={q.timeLimit}
                    onChange={e => updateQuestion(qIndex, 'timeLimit', parseInt(e.target.value))}
                  >
                    {[10, 15, 20, 30, 35, 40].map(t => (
                      <option key={t} value={t}>{t} Seconds</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Label>Difficulty</Label>
                  <select 
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100"
                    value={q.difficulty}
                    onChange={e => updateQuestion(qIndex, 'difficulty', e.target.value)}
                  >
                    <option value="easy">Easy (Max 1000)</option>
                    <option value="medium">Medium (Max 1250)</option>
                    <option value="hard">Hard (Max 1500)</option>
                  </select>
                </div>
              </div>

              <Label className="mt-4">Answers (Select correct one with radio)</Label>
              <div className="grid md:grid-cols-2 gap-3 mt-2">
                {q.options.map((opt, oIndex) => {
                  const colors = ['bg-rose-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'];
                  return (
                    <div key={oIndex} className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name={`correct-${q.id}`} 
                        checked={q.correctAnswer === oIndex}
                        onChange={() => updateQuestion(qIndex, 'correctAnswer', oIndex)}
                        className="w-5 h-5 accent-cyan-500"
                      />
                      <div className={`w-3 h-10 rounded-l-md ${colors[oIndex]}`}></div>
                      <Input 
                        className="flex-1 !rounded-l-none" 
                        value={opt}
                        onChange={e => updateOption(qIndex, oIndex, e.target.value)}
                        placeholder={`Option ${oIndex + 1}`}
                        disabled={q.type === 'boolean'}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Button variant="ghost" className="border-dashed border-2 border-slate-600 bg-transparent hover:bg-slate-800 hover:border-[#C4A661] hover:text-[#C4A661] text-slate-400 py-8 w-full transition-all flex flex-col items-center justify-center" onClick={handleAddEmptyQuestion}>
          <Plus className="w-8 h-8 mb-2" /> 
          <span className="font-bold text-lg">Add Question</span>
        </Button>
      </div>
    </div>
  );
}
