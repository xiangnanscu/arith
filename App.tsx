
import React, { useState, useEffect } from 'react';
import { OpType, QuizConfig, MathProblem, QuizHistoryItem, AppView } from './types';
import { OPERATION_COLORS, OPERATION_NAMES } from './constants';
import { generateQuiz } from './services/mathEngine';
import NumberPad from './components/NumberPad';
import Visualizer from './components/Visualizer';
import SettingsModal from './components/SettingsModal';

interface MulTestPair {
  a: number;
  b: number;
  userAnswer?: number;
}

const UnifiedChallengePanel = ({ 
  num1, num2, op, input, onInput, onDelete, onSubmit, onExit, 
  progress = 0, currentStepText = "", showHint, onToggleHint 
}: { 
  num1: number, num2: number, op: string, input: string, 
  onInput: (n: number) => void, onDelete: () => void, onSubmit: () => void, 
  onExit: () => void, progress?: number, currentStepText?: string, showHint: boolean, onToggleHint: () => void 
}) => (
  <div className="fixed inset-0 z-[150] flex flex-col bg-slate-100 animate-fade-in overflow-hidden">
    <div className="flex items-center justify-between p-4 sm:p-6 bg-white shadow-sm z-10 shrink-0">
      <button onClick={onExit} className="px-4 sm:px-6 py-2 bg-slate-50 rounded-xl font-bold text-slate-400 border border-slate-100 hover:bg-slate-100 transition-colors">✕ 退出</button>
      {progress > 0 && (
        <div className="flex-1 mx-4 sm:mx-12 h-4 sm:h-6 bg-slate-200 rounded-full overflow-hidden border-2 border-slate-100">
          <div className="h-full bg-indigo-500 transition-all duration-500 ease-out shadow-inner" style={{ width: `${progress}%` }} />
        </div>
      )}
      <div className="font-black text-xl sm:text-2xl text-slate-500">{currentStepText}</div>
    </div>

    <div className="flex-1 flex flex-col items-center justify-start sm:justify-center p-4 sm:p-6 gap-4 sm:gap-8 overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] sm:rounded-[4rem] p-6 sm:p-10 w-full max-w-5xl shadow-2xl relative border-4 sm:border-8 border-indigo-50 flex flex-col items-center shrink-0">
          <button 
            onClick={onToggleHint}
            className={`absolute top-4 right-4 sm:top-6 sm:right-6 w-12 h-12 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl flex items-center justify-center text-2xl sm:text-4xl shadow-lg transition-all transform hover:scale-110 active:scale-95 z-20
              ${showHint ? 'bg-indigo-500 text-white' : 'bg-amber-400 text-white animate-pulse'}
            `}
          >
            <span>{showHint ? '✕' : '💡'}</span>
          </button>

          <div className={`w-full overflow-hidden transition-all duration-300 ease-in-out ${showHint ? 'max-h-[400px] mb-4 sm:mb-8 opacity-100' : 'max-h-0 opacity-0'}`}>
             <div className="flex flex-col items-center gap-2 sm:gap-4 bg-indigo-50/50 p-4 sm:p-6 rounded-[2rem] sm:rounded-[3rem] border-4 border-dashed border-indigo-100">
                <div className="transform scale-75 sm:scale-100">
                  <Visualizer num1={num1} num2={num2} operation={op as any} showResult={false} isHint={true} />
                </div>
             </div>
          </div>

          <div className={`flex flex-wrap justify-center items-center gap-4 sm:gap-6 font-black text-slate-800 leading-none transition-all duration-300 ${showHint ? 'text-4xl sm:text-6xl py-2' : 'text-6xl sm:text-8xl py-6 sm:py-12'}`}>
             <span>{num1}</span>
             <span className="text-indigo-500 opacity-40">{op}</span>
             <span>{num2}</span>
             <span className="text-indigo-500 opacity-40">=</span>
             <div className="relative min-w-[100px] sm:min-w-[140px] text-center">
                <span className={`transition-colors duration-200 ${input ? 'text-indigo-600' : 'text-slate-100'}`}>
                  {input || '?'}
                </span>
                <div className="absolute -bottom-2 sm:-bottom-4 left-0 right-0 h-2 sm:h-3 bg-indigo-50 rounded-full overflow-hidden">
                   <div className={`h-full bg-indigo-500 transition-all duration-300 ${input ? 'w-full' : 'w-0'}`} />
                </div>
             </div>
          </div>
      </div>

      <div className="w-full max-w-[500px] mt-auto sm:mt-0">
        <NumberPad onPress={onInput} onDelete={onDelete} onSubmit={onSubmit} />
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.MENU);
  const [config, setConfig] = useState<QuizConfig>({
    questionCount: 5,
    selectedOperations: [OpType.ADD]
  });
  const [showSettings, setShowSettings] = useState(false);

  const [quizProblems, setQuizProblems] = useState<MathProblem[]>([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState<string>('');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isHintVisible, setIsHintVisible] = useState(false);
  const [uiScale, setUiScale] = useState(1);

  const [history, setHistory] = useState<QuizHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('math-whiz-history-v2');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [selectedReviewProblem, setSelectedReviewProblem] = useState<MathProblem | null>(null);

  // Multiplication Table State
  const [isMulTestMode, setIsMulTestMode] = useState(false);
  const [mulTestPairs, setMulTestPairs] = useState<MulTestPair[]>([]);
  const [activeMulTestPair, setActiveMulTestPair] = useState<MulTestPair | null>(null);
  const [mulTestInput, setMulTestInput] = useState('');
  const [showMulTestResults, setShowMulTestResults] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const targetWidth = view === AppView.MULTIPLICATION_TABLE ? 1100 : 460;
      const targetHeight = view === AppView.MULTIPLICATION_TABLE ? 700 : 850;
      const scaleW = (width - 40) / targetWidth;
      const scaleH = (height - 100) / targetHeight;
      setUiScale(Math.min(1.1, Math.max(0.4, Math.min(scaleW, scaleH))));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [view]);

  const goToMenu = () => {
    setView(AppView.MENU);
    setQuizProblems([]);
    setAnswers({});
    setCurrentInput('');
    setIsMulTestMode(false);
    setShowMulTestResults(false);
  };

  const startQuiz = () => {
    if (config.selectedOperations.length === 0) return;
    const problems = generateQuiz(config.questionCount, config.selectedOperations);
    setQuizProblems(problems);
    setCurrentProblemIndex(0);
    setCurrentInput('');
    setAnswers({});
    setIsHintVisible(false);
    setView(AppView.QUIZ);
  };

  const submitAnswer = () => {
    if (currentInput === '') return;
    const problem = quizProblems[currentProblemIndex];
    const val = parseInt(currentInput, 10);
    const newAnswers = { ...answers, [problem.id]: val };
    setAnswers(newAnswers);
    setIsHintVisible(false);
    if (currentProblemIndex < quizProblems.length - 1) {
      setCurrentProblemIndex(prev => prev + 1);
      setCurrentInput('');
    } else {
      finishQuiz(newAnswers);
    }
  };

  const finishQuiz = (finalAnswers: Record<string, number>) => {
    let correctCount = 0;
    const resultDetails = quizProblems.map(p => {
      const isCorrect = finalAnswers[p.id] === p.correctAnswer;
      if (isCorrect) correctCount++;
      return { ...p, userAnswer: finalAnswers[p.id], isCorrect };
    });

    const newItem: QuizHistoryItem = {
      timestamp: Date.now(),
      totalQuestions: quizProblems.length,
      correctCount,
      score: Math.round((correctCount / quizProblems.length) * 100),
      operations: config.selectedOperations,
      problems: resultDetails
    };
    
    const newHistory = [newItem, ...history].slice(0, 50);
    setHistory(newHistory);
    localStorage.setItem('math-whiz-history-v2', JSON.stringify(newHistory));
    setView(AppView.RESULTS);
  };

  const speakFormula = (a: number, b: number) => {
    const numMap = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    const min = Math.min(a, b);
    const max = Math.max(a, b);
    const p = min * max;
    let formula = numMap[min] + numMap[max] + (p < 10 ? '得' + numMap[p] : (p === 10 ? '一十' : (Math.floor(p/10) === 1 ? '十' + numMap[p%10] : numMap[Math.floor(p/10)] + '十' + (p%10 === 0 ? '' : numMap[p%10]))));
    const utterance = new SpeechSynthesisUtterance(formula);
    utterance.lang = 'zh-CN';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const startMulTableTest = () => {
    const allPairs: {a: number, b: number}[] = [];
    for (let r = 1; r <= 9; r++) for (let c = 1; c <= r; c++) allPairs.push({ a: c, b: r });
    const selected = allPairs.sort(() => 0.5 - Math.random()).slice(0, 5);
    setMulTestPairs(selected);
    setIsMulTestMode(true);
    setShowMulTestResults(false);
  };

  const renderMenu = () => (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 gap-8 overflow-y-auto">
      <div className="text-center space-y-2">
        <h1 className="text-5xl sm:text-7xl font-black text-indigo-600 tracking-tight">数学小天才</h1>
        <p className="text-slate-400 text-lg sm:text-xl font-bold">快乐口算，智慧成长！ 🌟</p>
      </div>

      <div className="w-full max-w-2xl bg-white/50 backdrop-blur-md p-6 sm:p-10 rounded-[3rem] sm:rounded-[4rem] shadow-xl border-4 border-white space-y-8">
        <div>
          <h3 className="text-center text-slate-500 font-black text-xl mb-6">选择想要练习的算法</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[OpType.ADD, OpType.SUB, OpType.MUL, OpType.DIV].map(op => {
              const isSelected = config.selectedOperations.includes(op);
              return (
                <button
                  key={op}
                  onClick={() => setConfig({ ...config, selectedOperations: [op] })}
                  className={`
                    p-4 rounded-3xl flex flex-col items-center gap-2 transition-all duration-300
                    ${isSelected 
                      ? `${OPERATION_COLORS[op]} text-white scale-105 shadow-lg ring-4 ring-offset-2 ring-indigo-300` 
                      : 'bg-white text-slate-400 border-2 border-slate-100 hover:bg-slate-50'
                    }
                  `}
                >
                  <span className="text-4xl sm:text-5xl font-black">{op}</span>
                  <span className="text-sm font-bold">{OPERATION_NAMES[op]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={startQuiz}
            className="flex-1 p-6 sm:p-8 bg-indigo-500 text-white rounded-[2.5rem] shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-4 group"
          >
            <span className="text-4xl group-hover:rotate-12 transition-transform">📝</span>
            <span className="text-2xl font-black">开始测试</span>
          </button>
          <button
            onClick={() => setView(AppView.MULTIPLICATION_TABLE)}
            className="flex-1 p-6 sm:p-8 bg-pink-500 text-white rounded-[2.5rem] shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-4 group"
          >
            <span className="text-4xl group-hover:-translate-y-2 transition-transform">📊</span>
            <span className="text-2xl font-black">乘法口诀</span>
          </button>
        </div>
      </div>

      <div className="flex gap-4 w-full max-w-2xl">
        <button onClick={() => setView(AppView.HISTORY)} className="flex-1 py-4 bg-white text-slate-600 rounded-3xl shadow-md font-bold flex items-center justify-center gap-2 border">📜 成长记录</button>
        <button onClick={() => setShowSettings(true)} className="flex-1 py-4 bg-white text-slate-600 rounded-3xl shadow-md font-bold flex items-center justify-center gap-2 border">⚙️ 设置题量</button>
      </div>

      {showSettings && <SettingsModal currentCount={config.questionCount} onSave={(c) => { setConfig({...config, questionCount: c}); setShowSettings(false); }} onClose={() => setShowSettings(false)} />}
    </div>
  );

  const renderMulTable = () => (
    <div className="min-h-screen bg-indigo-50 flex flex-col items-center p-4 sm:p-6 animate-fade-in overflow-y-auto pb-24">
      <div className="w-full max-w-6xl flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
         <button onClick={goToMenu} className="px-6 py-2 bg-white rounded-xl font-bold text-slate-400 border">返回</button>
         <h2 className="text-3xl font-black text-indigo-600">九九乘法口诀表</h2>
         <button onClick={startMulTableTest} className="px-6 py-2 bg-amber-400 text-white rounded-xl font-bold shadow-lg">测验模式</button>
      </div>
      <div className="flex flex-col gap-2 origin-top" style={{ transform: `scale(${uiScale})` }}>
        {[1,2,3,4,5,6,7,8,9].map(r => (
          <div key={r} className="flex gap-2">
            {[1,2,3,4,5,6,7,8,9].slice(0, r).map(c => {
              const testItem = mulTestPairs.find(p => p.a === c && p.b === r);
              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => isMulTestMode ? testItem && setActiveMulTestPair(testItem) : speakFormula(c, r)}
                  className={`px-4 py-3 rounded-2xl flex items-center justify-center min-w-[100px] bg-white border-2 transition-all ${isMulTestMode && !testItem ? 'opacity-20' : 'hover:scale-105'} ${isMulTestMode && testItem && !testItem.userAnswer ? 'border-amber-400 animate-pulse' : 'border-indigo-100'}`}
                >
                  <span className="text-3xl font-black text-indigo-600">{c}×{r}{isMulTestMode && testItem?.userAnswer !== undefined ? `=${testItem.userAnswer}` : ''}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {activeMulTestPair && <UnifiedChallengePanel num1={activeMulTestPair.a} num2={activeMulTestPair.b} op="×" input={mulTestInput} onInput={(n) => setMulTestInput(p => p.length < 3 ? p + n : p)} onDelete={() => setMulTestInput(p => p.slice(0, -1))} onSubmit={() => { const updated = mulTestPairs.map(p => p.a === activeMulTestPair.a && p.b === activeMulTestPair.b ? {...p, userAnswer: parseInt(mulTestInput)} : p); setMulTestPairs(updated); setActiveMulTestPair(null); setMulTestInput(''); if(updated.every(p => p.userAnswer !== undefined)) setShowMulTestResults(true); }} onExit={() => {setActiveMulTestPair(null); setMulTestInput('');}} currentStepText="口诀挑战" showHint={isHintVisible} onToggleHint={() => setIsHintVisible(!isHintVisible)} />}
      {showMulTestResults && (
        <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white p-12 rounded-[3rem] text-center space-y-8 max-w-lg w-full">
            <h3 className="text-4xl font-black text-slate-700">挑战结果 🎈</h3>
            <div className="text-9xl font-black text-indigo-500">{mulTestPairs.filter(p => p.userAnswer === p.a * p.b).length}/5</div>
            <button onClick={() => {setIsMulTestMode(false); setShowMulTestResults(false);}} className="w-full py-4 bg-indigo-500 text-white rounded-2xl font-black text-xl">太棒了！</button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-slate-50 min-h-screen">
      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
      `}</style>
      {view === AppView.MENU && renderMenu()}
      {view === AppView.QUIZ && (
        <UnifiedChallengePanel 
          num1={quizProblems[currentProblemIndex]?.num1}
          num2={quizProblems[currentProblemIndex]?.num2}
          op={quizProblems[currentProblemIndex]?.operation}
          input={currentInput}
          onInput={(n) => currentInput.length < 3 && setCurrentInput(p => p + n)}
          onDelete={() => setCurrentInput(p => p.slice(0, -1))}
          onSubmit={submitAnswer}
          onExit={goToMenu}
          progress={Math.round((currentProblemIndex / quizProblems.length) * 100)}
          currentStepText={`${currentProblemIndex + 1} / ${quizProblems.length}`}
          showHint={isHintVisible}
          onToggleHint={() => setIsHintVisible(!isHintVisible)}
        />
      )}
      {view === AppView.MULTIPLICATION_TABLE && renderMulTable()}
      {view === AppView.RESULTS && (
        <div className="min-h-screen p-6 flex flex-col items-center">
          <div className="max-w-4xl w-full space-y-8 pb-20">
            <div className="bg-white p-12 rounded-[4rem] shadow-2xl text-center space-y-6">
              <h2 className="text-4xl font-black text-slate-600">测试结束！ 🎉</h2>
              <div className="text-[10rem] font-black text-indigo-500 leading-none">{Math.round((Object.values(history[0]?.problems || []).filter(p => p.isCorrect).length / quizProblems.length) * 100)}%</div>
              <div className="flex gap-4 justify-center mt-10">
                <button onClick={goToMenu} className="px-12 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xl border">返回首页</button>
                <button onClick={startQuiz} className="px-12 py-4 bg-indigo-500 text-white rounded-2xl font-black text-xl shadow-lg">再做一遍</button>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {quizProblems.map(p => {
                const isCorrect = answers[p.id] === p.correctAnswer;
                return (
                  <button key={p.id} onClick={() => setSelectedReviewProblem({...p, userAnswer: answers[p.id], isCorrect})} className={`flex items-center justify-between p-8 bg-white rounded-[2.5rem] border-l-[12px] shadow-xl ${isCorrect ? 'border-green-400' : 'border-red-400'}`}>
                    <span className="text-3xl font-black text-slate-700">{p.num1} {p.operation} {p.num2} = {answers[p.id]}</span>
                    <span className={`text-5xl ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>{isCorrect ? '✓' : '✕'}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {view === AppView.HISTORY && (
        <div className="min-h-screen p-8 max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-6">
            <button onClick={goToMenu} className="px-8 py-4 bg-white rounded-[2rem] shadow-md font-black text-slate-600 border">⬅ 返回</button>
            <h1 className="text-4xl font-black text-slate-800">成长记录</h1>
          </div>
          <div className="grid gap-6">
            {history.map((item, idx) => (
              <div key={idx} className="bg-white p-8 rounded-[3rem] shadow-lg flex items-center justify-between">
                <div>
                  <div className="text-lg text-slate-400 font-bold">{new Date(item.timestamp).toLocaleString()}</div>
                  <div className="text-5xl font-black text-indigo-500">{item.score}%</div>
                </div>
                <div className="text-7xl">{item.score === 100 ? '🏆' : '🌟'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {selectedReviewProblem && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white p-12 rounded-[4rem] max-w-4xl w-full relative">
            <button onClick={() => setSelectedReviewProblem(null)} className="absolute top-6 right-6 w-12 h-12 bg-red-500 text-white rounded-full font-bold">✕</button>
            <div className="flex flex-col items-center gap-12">
              <Visualizer num1={selectedReviewProblem.num1} num2={selectedReviewProblem.num2} operation={selectedReviewProblem.operation} showResult={true} />
              <div className="text-center">
                <div className="text-3xl font-black text-slate-300">正确答案是</div>
                <div className="text-[10rem] font-black text-indigo-500 leading-none">{selectedReviewProblem.correctAnswer}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
