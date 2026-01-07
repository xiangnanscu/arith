
import React, { useState, useEffect } from 'react';
import { OpType, QuizConfig, MathProblem, QuizHistoryItem, AppView, TrainingStep } from './types';
import { OPERATION_COLORS, OPERATION_NAMES } from './constants';
import { generateQuiz, generateTrainingProblem } from './services/mathEngine';
import NumberPad from './components/NumberPad';
import Visualizer from './components/Visualizer';
import SettingsModal from './components/SettingsModal';

const SHAKE_DURATION_SEC = 2;
const SHAKE_CYCLE_SEC = 0.2;
const SHAKE_REPEAT_COUNT = SHAKE_DURATION_SEC / SHAKE_CYCLE_SEC;

interface MulTestPair {
  a: number;
  b: number;
  userAnswer?: number;
}

// --- Helper Components moved outside to prevent re-mounting on every state change ---

const MathBox = ({ value, color, highlight, active, error, onClick, disabled, style }: { 
  value: any, color?: string, highlight?: boolean, active?: boolean, error?: boolean, onClick?: () => void, disabled?: boolean, style?: React.CSSProperties
}) => (
  <div 
    onClick={!disabled ? onClick : undefined}
    style={style}
    className={`
      w-24 h-24 flex items-center justify-center rounded-[1.8rem] font-black transition-all shadow-md text-5xl border-4
      ${color || 'bg-white text-slate-800 border-slate-50'}
      ${highlight ? 'ring-4 ring-amber-400 scale-105 shadow-lg border-amber-100' : ''}
      ${active ? 'ring-4 ring-white scale-105 shadow-2xl brightness-110' : ''}
      ${error ? 'ring-4 ring-red-500 !border-red-600 animate-shake' : ''}
      ${onClick && !disabled ? 'active:scale-95 cursor-pointer' : 'cursor-default'}
    `}
  >
    {value}
  </div>
);

const Operator = ({ char, style, className = "" }: { char: string, style: React.CSSProperties, className?: string }) => (
  <div 
    style={style}
    className={`text-8xl font-black text-black flex justify-center items-center pointer-events-none ${className}`}
  >
    {char}
  </div>
);

const UnifiedChallengePanel = ({ 
  num1, num2, op, input, onInput, onDelete, onSubmit, onExit, 
  progress = 0, currentStepText = "", showHint, onToggleHint 
}: { 
  num1: number, num2: number, op: string, input: string, 
  onInput: (n: number) => void, onDelete: () => void, onSubmit: () => void, 
  onExit: () => void, progress?: number, currentStepText?: string, showHint: boolean, onToggleHint: () => void 
}) => (
  <div className="fixed inset-0 z-[150] flex flex-col bg-slate-100 animate-fade-in">
    {/* Top Header */}
    <div className="flex items-center justify-between p-6 bg-white shadow-sm z-10 shrink-0">
      <button onClick={onExit} className="px-6 py-2 bg-slate-50 rounded-xl font-bold text-slate-400 border border-slate-100 hover:bg-slate-100 transition-colors">✕ 退出</button>
      {progress > 0 && (
        <div className="flex-1 mx-12 h-6 bg-slate-200 rounded-full overflow-hidden border-2 border-slate-100">
          <div className="h-full bg-indigo-500 transition-all duration-500 ease-out shadow-inner" style={{ width: `${progress}%` }} />
        </div>
      )}
      <div className="font-black text-2xl text-slate-500">{currentStepText}</div>
    </div>

    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8 overflow-y-auto">
      <div className="bg-white rounded-[4rem] p-10 w-full max-w-5xl shadow-2xl relative border-8 border-indigo-50 flex flex-col items-center overflow-hidden">
          
          {/* Lamp Button */}
          <button 
            onClick={onToggleHint}
            className={`absolute top-6 right-6 w-16 h-16 rounded-3xl flex items-center justify-center text-4xl shadow-lg transition-all transform hover:scale-110 active:scale-95 z-20
              ${showHint ? 'bg-indigo-500 text-white' : 'bg-amber-400 text-white animate-pulse'}
            `}
          >
            <span>{showHint ? '✕' : '💡'}</span>
          </button>

          {/* Integrated Hint Area */}
          <div className={`w-full overflow-hidden transition-all duration-300 ease-in-out ${showHint ? 'max-h-[500px] mb-8 opacity-100' : 'max-h-0 opacity-0'}`}>
             <div className="flex flex-col items-center gap-4 bg-indigo-50/50 p-6 rounded-[3rem] border-4 border-dashed border-indigo-100">
                <div className="transform scale-90 sm:scale-100">
                  <Visualizer num1={num1} num2={num2} operation={op as any} showResult={false} isHint={true} />
                </div>
             </div>
          </div>

          {/* Equation Area */}
          <div className={`flex flex-wrap justify-center items-center gap-6 font-black text-slate-800 leading-none transition-all duration-300 ${showHint ? 'text-6xl py-4' : 'text-8xl py-12'}`}>
             <span>{num1}</span>
             <span className="text-indigo-500 opacity-40">{op}</span>
             <span>{num2}</span>
             <span className="text-indigo-500 opacity-40">=</span>
             <div className="relative min-w-[140px] text-center">
                <span className={`transition-colors duration-200 ${input ? 'text-indigo-600' : 'text-slate-100'}`}>
                  {input || '?'}
                </span>
                <div className="absolute -bottom-4 left-0 right-0 h-3 bg-indigo-50 rounded-full overflow-hidden">
                   <div className={`h-full bg-indigo-500 transition-all duration-300 ${input ? 'w-full' : 'w-0'}`} />
                </div>
             </div>
          </div>
      </div>

      <div className="w-full max-w-[500px]">
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
  
  const [history, setHistory] = useState<QuizHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('math-whiz-history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<QuizHistoryItem | null>(null);
  const [selectedReviewProblem, setSelectedReviewProblem] = useState<MathProblem | null>(null);

  const [trainingProblem, setTrainingProblem] = useState<MathProblem | null>(null);
  const [trainingStep, setTrainingStep] = useState<TrainingStep>(TrainingStep.CHOOSE_WHICH);
  const [splitInputs, setSplitInputs] = useState<[string, string]>(['', '']);
  const [activeSplitIdx, setActiveSplitIdx] = useState<0 | 1 | null>(null);
  const [combineInput, setCombineInput] = useState('');
  const [finalInput, setFinalInput] = useState('');
  const [trainingError, setTrainingError] = useState<string | null>(null);
  const [errorBoxIdx, setErrorBoxIdx] = useState<number | null>(null); 

  const [isHintVisible, setIsHintVisible] = useState(false);
  const [trainingScale, setTrainingScale] = useState(1);

  // Multiplication Table Test State
  const [isMulTestMode, setIsMulTestMode] = useState(false);
  const [mulTestPairs, setMulTestPairs] = useState<MulTestPair[]>([]);
  const [activeMulTestPair, setActiveMulTestPair] = useState<MulTestPair | null>(null);
  const [mulTestInput, setMulTestInput] = useState('');
  const [showMulTestResults, setShowMulTestResults] = useState(false);

  useEffect(() => {
    if (view === AppView.TRAINING || view === AppView.MULTIPLICATION_TABLE) {
      const handleResize = () => {
        const width = window.innerWidth;
        const padding = 40;
        const baseWidth = view === AppView.TRAINING ? 460 : 800;
        if (width < baseWidth + padding) {
          setTrainingScale((width - padding) / baseWidth);
        } else {
          setTrainingScale(1);
        }
      };
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [view]);

  const goToMenu = () => {
    setQuizProblems([]);
    setAnswers({});
    setCurrentInput('');
    setIsMulTestMode(false);
    setShowMulTestResults(false);
    setMulTestPairs([]);
    setView(AppView.MENU);
  };

  const selectOperation = (op: OpType) => {
    setConfig(prev => ({
      ...prev,
      selectedOperations: [op]
    }));
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

  const startTraining = () => {
    const p = generateTrainingProblem();
    setTrainingProblem(p);
    setTrainingStep(TrainingStep.CHOOSE_WHICH);
    setSplitInputs(['', '']);
    setActiveSplitIdx(null);
    setCombineInput('');
    setFinalInput('');
    setTrainingError(null);
    setErrorBoxIdx(null);
    setView(AppView.TRAINING);
  };

  const startMulTableTest = () => {
    const allPairs: {a: number, b: number}[] = [];
    for (let r = 1; r <= 9; r++) {
      for (let c = 1; c <= r; c++) {
        allPairs.push({ a: c, b: r });
      }
    }
    const shuffled = allPairs.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 5).map(p => ({ ...p }));
    setMulTestPairs(selected);
    setIsMulTestMode(true);
    setShowMulTestResults(false);
  };

  const handleMulTestAnswerSubmit = () => {
    if (!activeMulTestPair || mulTestInput === '') return;
    const updated = mulTestPairs.map(p => {
      if (p.a === activeMulTestPair.a && p.b === activeMulTestPair.b) {
        return { ...p, userAnswer: parseInt(mulTestInput, 10) };
      }
      return p;
    });
    setMulTestPairs(updated);
    setActiveMulTestPair(null);
    setMulTestInput('');
    setIsHintVisible(false);

    if (updated.every(p => p.userAnswer !== undefined)) {
      setShowMulTestResults(true);
    }
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
    localStorage.setItem('math-whiz-history', JSON.stringify(newHistory));
    setView(AppView.RESULTS);
  };

  const speakFormula = (a: number, b: number) => {
    const numMap = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    const min = Math.min(a, b);
    const max = Math.max(a, b);
    const p = min * max;
    
    let formula = numMap[min] + numMap[max];
    if (p < 10) {
      formula += '得' + numMap[p];
    } else {
      const tens = Math.floor(p / 10);
      const units = p % 10;
      if (tens === 1) {
        if (p === 10) formula += '一十';
        else formula += '十' + numMap[units];
      } else {
        formula += numMap[tens] + '十' + (units === 0 ? '' : numMap[units]);
      }
    }

    const utterance = new SpeechSynthesisUtterance(formula);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const validateTrainingStep = () => {
    if (!trainingProblem) return;
    const { num1, num2 } = trainingProblem;
    if (trainingStep === TrainingStep.HOW_TO_SPLIT) {
      const s1 = parseInt(splitInputs[0]);
      const s2 = parseInt(splitInputs[1]);
      const needed = 20 - num1;
      if (isNaN(s1) || isNaN(s2)) {
        setTrainingError("要把两个框框都填上数字哦！ 🤔");
        return;
      }
      if (s1 === needed && s1 + s2 === num2) {
        setTrainingError(null);
        setErrorBoxIdx(null);
        setTrainingStep(TrainingStep.COMBINE_TEN);
      } else {
        if (s1 !== needed) {
          setTrainingError(`不对哦，${num1} 加几等于 20？数数看！ 🍎`);
          setErrorBoxIdx(0);
        } else {
          setTrainingError(`${s1} 加 ${s2} 应该是 ${num2} 呀！ 🍭`);
          setErrorBoxIdx(1);
        }
      }
    } else if (trainingStep === TrainingStep.COMBINE_TEN) {
      if (parseInt(combineInput) === 20) {
        setTrainingError(null);
        setErrorBoxIdx(null);
        setTrainingStep(TrainingStep.FINAL_ADD);
      } else {
        setTrainingError(`${num1} 加 ${splitInputs[0]} 等于多少呢？提示：它是一个整十数哦！ ✨`);
        setErrorBoxIdx(2);
      }
    } else if (trainingStep === TrainingStep.FINAL_ADD) {
      if (parseInt(finalInput) === num1 + num2) {
        setTrainingError(null);
        setErrorBoxIdx(null);
        setTrainingStep(TrainingStep.SUCCESS);
      } else {
        setTrainingError(`再仔细算一算 20 加 ${splitInputs[1]} 是多少？ 🌈`);
        setErrorBoxIdx(3);
      }
    }
  };

  const renderMultiplicationTable = () => {
    const rows = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    return (
      <div className="min-h-screen bg-indigo-50 flex flex-col items-center p-6 animate-fade-in overflow-y-auto pb-24">
        <div className="w-full max-w-5xl flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
           <button onClick={goToMenu} className="px-6 py-2 bg-white rounded-xl font-bold text-slate-400 shadow-sm border">返回菜单</button>
           <h2 className="text-3xl font-black text-indigo-600">九九乘法口诀表</h2>
           <div className="flex gap-2">
              {!isMulTestMode ? (
                <button onClick={startMulTableTest} className="px-6 py-2 bg-amber-400 text-white rounded-xl font-bold shadow-lg hover:bg-amber-500 transition-all">开始测验 📝</button>
              ) : (
                <button onClick={() => { setIsMulTestMode(false); setMulTestPairs([]); }} className="px-6 py-2 bg-pink-500 text-white rounded-xl font-bold shadow-lg hover:bg-pink-600 transition-all">退出测验</button>
              )}
           </div>
        </div>

        <div 
          className="flex flex-col gap-2 origin-top transition-transform duration-300"
          style={{ transform: `scale(${trainingScale})` }}
        >
          {rows.map(row => (
            <div key={row} className="flex gap-2">
              {rows.slice(0, row).map(col => {
                const testItem = mulTestPairs.find(p => p.a === col && p.b === row);
                const isTested = !!testItem;
                const isAnswered = testItem?.userAnswer !== undefined;

                return (
                  <button
                    key={`${row}-${col}`}
                    onClick={() => {
                      if (isMulTestMode) {
                        if (isTested) setActiveMulTestPair(testItem);
                      } else {
                        speakFormula(col, row);
                      }
                    }}
                    className={`
                      px-5 py-3 rounded-2xl flex items-center justify-center min-w-[120px]
                      bg-white shadow-sm border-2 transition-all
                      ${isMulTestMode && !isTested ? 'opacity-30 grayscale cursor-default' : 'hover:scale-105 active:scale-95'}
                      ${isMulTestMode && isTested && !isAnswered ? 'border-amber-400 bg-amber-50 animate-pulse shadow-md' : 'border-indigo-100'}
                      ${isMulTestMode && isAnswered ? (testItem.userAnswer === col * row ? 'border-green-400 bg-green-50 shadow-sm' : 'border-red-400 bg-red-50 shadow-sm') : 'hover:border-indigo-400'}
                    `}
                  >
                    <div className="text-4xl sm:text-5xl font-black flex items-center tracking-tight">
                      <span className="text-indigo-600">{col}</span>
                      <span className="mx-2 text-indigo-300 text-3xl font-bold">×</span>
                      <span className="text-indigo-600">{row}</span>
                      {isMulTestMode && (
                        <div className="ml-3 flex items-center justify-center min-w-[40px] h-[40px] bg-slate-100 rounded-lg text-3xl">
                           {isAnswered ? testItem.userAnswer : '?'}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-12 p-8 bg-white/70 rounded-[3rem] border-4 border-dashed border-indigo-200 text-center max-w-2xl shadow-sm">
           <p className="text-2xl font-black text-slate-500">
             {isMulTestMode 
               ? "小朋友，点击黄色发亮的方块，填入答案吧！✨" 
               : "小朋友，点击每一个方块，听听口诀吧！🌈"
             }
           </p>
        </div>

        {/* Unified Challeng Panel for Multiplication Test */}
        {activeMulTestPair && (
           <UnifiedChallengePanel 
             num1={activeMulTestPair.a}
             num2={activeMulTestPair.b}
             op="×"
             input={mulTestInput}
             onInput={(n) => setMulTestInput(p => p.length < 3 ? p + n : p)}
             onDelete={() => setMulTestInput(p => p.slice(0, -1))}
             onSubmit={handleMulTestAnswerSubmit}
             onExit={() => { setActiveMulTestPair(null); setMulTestInput(''); setIsHintVisible(false); }}
             currentStepText="口诀挑战"
             showHint={isHintVisible}
             onToggleHint={() => setIsHintVisible(!isHintVisible)}
           />
        )}

        {/* Results Modal */}
        {showMulTestResults && (
           <div className="fixed inset-0 z-[210] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-xl animate-bounce-in">
              <div className="bg-white rounded-[5rem] p-16 w-full max-w-3xl shadow-2xl text-center space-y-10 border-8 border-indigo-100">
                  <h3 className="text-5xl font-black text-slate-700">挑战结束！ 🎈</h3>
                  <div className="text-[12rem] font-black text-indigo-500 leading-none">
                     {mulTestPairs.filter(p => p.userAnswer === p.a * p.b).length} / 5
                  </div>
                  <p className="text-3xl font-black text-slate-400">
                    {mulTestPairs.filter(p => p.userAnswer === p.a * p.b).length === 5 
                      ? "全对啦！你是口诀小专家！🌟" 
                      : "做得很棒！多练练就会更强！🍭"
                    }
                  </p>
                  <div className="flex gap-6 justify-center">
                     <button onClick={() => { setIsMulTestMode(false); setMulTestPairs([]); setShowMulTestResults(false); }} className="flex-1 py-6 bg-slate-100 text-slate-600 rounded-3xl font-black text-2xl border">回学习模式</button>
                     <button onClick={startMulTableTest} className="flex-1 py-6 bg-indigo-500 text-white rounded-3xl font-black text-2xl shadow-xl">再测一次</button>
                  </div>
              </div>
           </div>
        )}
      </div>
    );
  };

  const renderTraining = () => {
    if (!trainingProblem) return null;
    const { num1, num2 } = trainingProblem;
    const BOX_SIZE = 96;
    const HALF_BOX = BOX_SIZE / 2;
    const CONTAINER_WIDTH = 460;
    const COL1_X = 0;
    const COL2_X = 182;
    const COL3_X = 364;
    const ROW1_Y = 0;
    const ROW2_Y = 180;
    const ROW3_Y = 380;
    const ROW4_Y = 640;
    const box1C = { x: COL1_X + HALF_BOX, y: ROW1_Y + HALF_BOX };
    const box2C = { x: COL3_X + HALF_BOX, y: ROW1_Y + HALF_BOX };
    const s1C = { x: COL2_X + HALF_BOX, y: ROW2_Y + HALF_BOX };
    const s2C = { x: COL3_X + HALF_BOX, y: ROW2_Y + HALF_BOX };
    const combineBoxX = (COL1_X + COL2_X) / 2;
    const c10C = { x: combineBoxX + HALF_BOX, y: ROW3_Y + HALF_BOX };
    const dropC = { x: COL3_X + HALF_BOX, y: ROW3_Y + HALF_BOX };
    const finalMidX = (c10C.x + dropC.x) / 2;
    const finalC = { x: finalMidX, y: ROW4_Y + HALF_BOX };
    const STYLE_TEN = "bg-green-500 text-white border-green-600";
    const STYLE_REMAINDER = "bg-amber-400 text-white border-amber-500";

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center p-6 animate-fade-in overflow-y-auto pb-24">
        <div className="w-full max-w-5xl flex justify-between items-center mb-10">
           <button onClick={goToMenu} className="px-6 py-2 bg-white rounded-xl font-bold text-slate-400 shadow-sm border">退出</button>
           <h2 className="text-2xl font-black text-amber-500">凑二十法专项练习</h2>
           <div className="w-20"></div>
        </div>
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-start justify-items-center">
           <div className="bg-white rounded-[4rem] shadow-2xl p-10 pt-16 min-h-[950px] w-full max-w-[580px] flex flex-col items-center relative border-8 border-white overflow-hidden lg:overflow-visible">
              <div 
                className="relative transition-transform duration-300 ease-out" 
                style={{ 
                  width: CONTAINER_WIDTH, 
                  height: 780 * trainingScale,
                  transform: `scale(${trainingScale})`,
                  transformOrigin: 'top center'
                }}
              >
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" style={{ zIndex: 0 }}>
                  {trainingStep >= TrainingStep.HOW_TO_SPLIT && (
                    <g>
                      <path d={`M ${box2C.x} ${box2C.y + HALF_BOX} L ${s1C.x} ${s1C.y - HALF_BOX}`} stroke="#22c55e" strokeWidth="10" fill="none" strokeLinecap="round" />
                      <path d={`M ${box2C.x} ${box2C.y + HALF_BOX} L ${s2C.x} ${s2C.y - HALF_BOX}`} stroke="#fbbf24" strokeWidth="10" fill="none" strokeLinecap="round" />
                    </g>
                  )}
                  {trainingStep >= TrainingStep.COMBINE_TEN && (
                    <g>
                      <path d={`M ${box1C.x} ${box1C.y + HALF_BOX} V ${c10C.y - 120} H ${c10C.x}`} stroke="#22c55e" strokeWidth="8" strokeOpacity="0.4" fill="none" strokeLinecap="round" strokeDasharray="12 12" />
                      <path d={`M ${s1C.x} ${s1C.y + HALF_BOX} V ${c10C.y - 120} H ${c10C.x}`} stroke="#22c55e" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray="12 12" />
                      <path d={`M ${c10C.x} ${c10C.y - 120} V ${c10C.y - HALF_BOX}`} stroke="#22c55e" strokeWidth="8" fill="none" strokeLinecap="round" />
                    </g>
                  )}
                  {trainingStep >= TrainingStep.COMBINE_TEN && (
                    <path d={`M ${s2C.x} ${s2C.y + HALF_BOX} V ${dropC.y - HALF_BOX}`} stroke="#fbbf24" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray="12 12" />
                  )}
                  {trainingStep >= TrainingStep.FINAL_ADD && (
                    <g>
                      <path d={`M ${c10C.x} ${c10C.y + HALF_BOX} V ${finalC.y - 120} H ${finalC.x}`} stroke="#22c55e" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray="12 12" />
                      <path d={`M ${dropC.x} ${dropC.y + HALF_BOX} V ${finalC.y - 120} H ${finalC.x}`} stroke="#fbbf24" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray="12 12" />
                      <path d={`M ${finalC.x} ${finalC.y - 120} V ${finalC.y - HALF_BOX}`} stroke="#4f46e5" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray="12 12" />
                    </g>
                  )}
                </svg>
                <MathBox value={num1} style={{ position: 'absolute', left: COL1_X, top: ROW1_Y }} color={STYLE_TEN} />
                <Operator char="+" style={{ position: 'absolute', left: COL1_X + BOX_SIZE, top: ROW1_Y, width: COL3_X - (COL1_X + BOX_SIZE), height: BOX_SIZE }} />
                <MathBox value={num2} style={{ position: 'absolute', left: COL3_X, top: ROW1_Y }} color={STYLE_REMAINDER} highlight={trainingStep === TrainingStep.CHOOSE_WHICH} onClick={() => { if(trainingStep === TrainingStep.CHOOSE_WHICH) { setTrainingStep(TrainingStep.HOW_TO_SPLIT); setActiveSplitIdx(0); }}} />
                {trainingStep >= TrainingStep.HOW_TO_SPLIT && (
                  <>
                    <MathBox value={splitInputs[0] || (activeSplitIdx === 0 ? '?' : '')} style={{ position: 'absolute', left: COL2_X, top: ROW2_Y }} color={STYLE_TEN} active={activeSplitIdx === 0} error={errorBoxIdx === 0} onClick={() => trainingStep === TrainingStep.HOW_TO_SPLIT && setActiveSplitIdx(0)} />
                    <MathBox value={splitInputs[1] || (activeSplitIdx === 1 ? '?' : '')} style={{ position: 'absolute', left: COL3_X, top: ROW2_Y }} color={STYLE_REMAINDER} active={activeSplitIdx === 1} error={errorBoxIdx === 1} onClick={() => trainingStep === TrainingStep.HOW_TO_SPLIT && setActiveSplitIdx(1)} />
                  </>
                )}
                {trainingStep >= TrainingStep.COMBINE_TEN && (
                  <>
                    <Operator char="+" style={{ position: 'absolute', left: c10C.x - 40, top: c10C.y - 210, width: 80, height: 80, fontSize: '64px' }} />
                    <MathBox value={combineInput || '?'} style={{ position: 'absolute', left: combineBoxX, top: ROW3_Y }} color={STYLE_TEN} highlight={trainingStep === TrainingStep.COMBINE_TEN} error={errorBoxIdx === 2} />
                    <Operator char="+" style={{ position: 'absolute', left: combineBoxX + BOX_SIZE, top: ROW3_Y, width: COL3_X - (combineBoxX + BOX_SIZE), height: BOX_SIZE }} />
                    <MathBox value={splitInputs[1]} style={{ position: 'absolute', left: COL3_X, top: ROW3_Y }} color={STYLE_REMAINDER} />
                  </>
                )}
                {trainingStep >= TrainingStep.FINAL_ADD && (
                  <div className="absolute w-full" style={{ left: finalMidX - HALF_BOX, top: ROW4_Y }}>
                    <MathBox value={finalInput || '?'} color={trainingStep === TrainingStep.SUCCESS ? 'bg-indigo-600 text-white shadow-xl border-indigo-700' : 'bg-white border-indigo-100 text-indigo-400'} active={trainingStep === TrainingStep.FINAL_ADD} error={errorBoxIdx === 3} />
                  </div>
                )}
              </div>
              <div className="mt-auto w-full max-sm pt-4 flex flex-col items-center z-10">
                 {trainingStep === TrainingStep.HOW_TO_SPLIT && (
                    <button onClick={validateTrainingStep} className="w-full max-w-[320px] py-6 bg-amber-500 text-white rounded-3xl font-black text-2xl shadow-lg transform active:scale-95 transition-all">确认拆分! ✓</button>
                 )}
                 {trainingStep === TrainingStep.COMBINE_TEN && (
                    <button onClick={validateTrainingStep} className="w-full max-w-[320px] py-6 bg-indigo-500 text-white rounded-3xl font-black text-2xl shadow-lg transform active:scale-95 transition-all">确认凑二十! ✓</button>
                 )}
                 {trainingStep === TrainingStep.FINAL_ADD && (
                    <button onClick={validateTrainingStep} className="w-full max-w-[320px] py-6 bg-green-500 text-white rounded-3xl font-black text-2xl shadow-lg transform active:scale-95 transition-all">算出最终结果! ✓</button>
                 )}
                 {trainingStep === TrainingStep.SUCCESS && (
                    <div className="flex flex-col gap-6 w-full animate-bounce-in">
                       <div className="flex flex-col items-center gap-2">
                          <div className="text-5xl font-black flex items-center gap-3">
                             <span className="text-green-500">{num1}</span>
                             <span className="text-slate-400">+</span>
                             <span className="text-amber-500">{num2}</span>
                             <span className="text-slate-400">=</span>
                             <span className="text-indigo-600 underline underline-offset-8 decoration-indigo-200">{num1 + num2}</span>
                          </div>
                          <div className="text-center font-black text-green-500 text-2xl mt-2">太棒了！答对了！🌟</div>
                       </div>
                       <div className="flex gap-4">
                        <button onClick={startTraining} className="flex-1 py-5 bg-amber-400 text-white rounded-2xl font-black text-xl shadow-lg transform active:scale-95">再做一题</button>
                        <button onClick={goToMenu} className="flex-1 py-5 bg-slate-800 text-white rounded-2xl font-black text-xl shadow-lg transform active:scale-95">回主页</button>
                       </div>
                    </div>
                 )}
              </div>
           </div>
           <div className="flex flex-col items-center w-full max-w-[500px]">
              <NumberPad disabled={trainingStep === TrainingStep.CHOOSE_WHICH || trainingStep === TrainingStep.SUCCESS} onPress={(n) => {
                  setTrainingError(null);
                  setErrorBoxIdx(null);
                  if (trainingStep === TrainingStep.HOW_TO_SPLIT && activeSplitIdx !== null) {
                    const newInputs: [string, string] = [splitInputs[0], splitInputs[1]];
                    newInputs[activeSplitIdx] = n.toString();
                    setSplitInputs(newInputs);
                    if (activeSplitIdx === 0) setActiveSplitIdx(1);
                  } else if (trainingStep === TrainingStep.COMBINE_TEN) {
                    setCombineInput(p => (p.length < 2 ? p + n : p));
                  } else if (trainingStep === TrainingStep.FINAL_ADD) {
                    setFinalInput(p => (p.length < 2 ? p + n : p));
                  }
              }} onDelete={() => {
                  setTrainingError(null);
                  setErrorBoxIdx(null);
                  if (trainingStep === TrainingStep.HOW_TO_SPLIT && activeSplitIdx !== null) {
                    const newInputs: [string, string] = [splitInputs[0], splitInputs[1]];
                    newInputs[activeSplitIdx] = '';
                    setSplitInputs(newInputs);
                  } else if (trainingStep === TrainingStep.COMBINE_TEN) {
                    setCombineInput(p => p.slice(0, -1));
                  } else if (trainingStep === TrainingStep.FINAL_ADD) {
                    setFinalInput(p => p.slice(0, -1));
                  }
              }} onSubmit={validateTrainingStep} />
              <div className="mt-10 p-8 bg-white/60 rounded-[3rem] border-4 border-dashed border-amber-200 text-center w-full shadow-sm">
                 <p className={`text-xl leading-relaxed font-bold ${trainingError ? 'text-red-500' : 'text-slate-400'}`}>
                    {trainingError ? trainingError : (
                      <>
                        {trainingStep === TrainingStep.CHOOSE_WHICH && "小朋友，点击右边的数字开始拆分吧！✨"}
                        {trainingStep === TrainingStep.HOW_TO_SPLIT && activeSplitIdx === 0 && `我们要先凑出 20，${num1} 加几等于 20？`}
                        {trainingStep === TrainingStep.HOW_TO_SPLIT && activeSplitIdx === 1 && `拆开后还剩下多少？`}
                        {trainingStep === TrainingStep.COMBINE_TEN && `现在把连起来的数字合起来看看！`}
                        {trainingStep === TrainingStep.FINAL_ADD && `最后一步，加上落下来的那个数字！🚀`}
                      </>
                    )}
                 </p>
              </div>
           </div>
        </div>
      </div>
    );
  };

  const renderMenu = () => (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 gap-8 overflow-y-auto">
      <div className="text-center space-y-2">
        <h1 className="text-6xl font-black text-indigo-600 tracking-tight">数学小天才</h1>
        <p className="text-slate-400 text-lg font-bold">快乐学习，开启智慧之门！ 🌟</p>
      </div>

      <div className="w-full max-w-2xl bg-white/50 backdrop-blur-md p-8 rounded-[3.5rem] shadow-xl border-4 border-white space-y-6">
        <h3 className="text-center text-slate-500 font-black text-xl">请选择想要测试的内容：</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[OpType.ADD, OpType.SUB, OpType.MUL, OpType.DIV].map(op => {
            const isSelected = config.selectedOperations.includes(op);
            return (
              <button
                key={op}
                onClick={() => selectOperation(op)}
                className={`
                  p-4 rounded-3xl flex flex-col items-center gap-2 transition-all duration-300
                  ${isSelected 
                    ? `${OPERATION_COLORS[op]} text-white scale-105 shadow-lg ring-4 ring-offset-2 ring-indigo-300` 
                    : 'bg-white text-slate-400 border-2 border-slate-100 hover:bg-slate-50'
                  }
                `}
              >
                <span className="text-4xl font-black">{op}</span>
                <span className="text-sm font-bold">{OPERATION_NAMES[op]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl">
        <button
          onClick={startQuiz}
          className="p-8 bg-indigo-500 text-white rounded-[3rem] shadow-2xl hover:scale-105 transition-all flex flex-col items-center gap-4 group"
        >
          <span className="text-6xl group-hover:rotate-12 transition-transform">📝</span>
          <span className="text-2xl font-black">开始测试</span>
        </button>
        <button
          onClick={startTraining}
          className="p-8 bg-amber-400 text-white rounded-[3rem] shadow-2xl hover:scale-105 transition-all flex flex-col items-center gap-4 group"
        >
          <span className="text-6xl group-hover:scale-110 transition-transform">🧠</span>
          <span className="text-2xl font-black">凑十专项</span>
        </button>
        <button
          onClick={() => setView(AppView.MULTIPLICATION_TABLE)}
          className="p-8 bg-pink-500 text-white rounded-[3rem] shadow-2xl hover:scale-105 transition-all flex flex-col items-center gap-4 group"
        >
          <span className="text-6xl group-hover:-translate-y-2 transition-transform">📊</span>
          <span className="text-2xl font-black">九九乘法表</span>
        </button>
        <button
          onClick={() => setView(AppView.HISTORY)}
          className="p-8 bg-white text-slate-600 rounded-[3rem] shadow-xl hover:scale-105 transition-all flex flex-col items-center gap-4 border-4 border-slate-50"
        >
          <span className="text-6xl">📜</span>
          <span className="text-2xl font-black">挑战记录</span>
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className="p-8 bg-white text-slate-600 rounded-[3rem] shadow-xl hover:scale-105 transition-all flex flex-col items-center gap-4 border-4 border-slate-50"
        >
          <span className="text-6xl">⚙️</span>
          <span className="text-2xl font-black">测试设置</span>
        </button>
      </div>

      {showSettings && (
        <SettingsModal
          currentCount={config.questionCount}
          onSave={(count) => {
            setConfig({ ...config, questionCount: count });
            setShowSettings(false);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );

  const renderQuiz = () => {
    const problem = quizProblems[currentProblemIndex];
    if (!problem) return null;
    const progress = Math.round(((currentProblemIndex) / quizProblems.length) * 100);
    return (
      <UnifiedChallengePanel 
        num1={problem.num1}
        num2={problem.num2}
        op={problem.operation}
        input={currentInput}
        onInput={(n) => currentInput.length < 3 && setCurrentInput(p => p + n)}
        onDelete={() => setCurrentInput(p => p.slice(0, -1))}
        onSubmit={submitAnswer}
        onExit={goToMenu}
        progress={progress}
        currentStepText={`${currentProblemIndex + 1} / ${quizProblems.length}`}
        showHint={isHintVisible}
        onToggleHint={() => setIsHintVisible(!isHintVisible)}
      />
    );
  };

  return (
    <>
      <style>
        {`
          @keyframes slide-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          .animate-slide-up { animation: slide-up 0.4s ease-out forwards; }
          @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }
          .animate-shake { animation: shake ${SHAKE_CYCLE_SEC}s ease-in-out ${SHAKE_REPEAT_COUNT}; }
          @keyframes bounce-in { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.05); } 70% { transform: scale(0.9); } 100% { transform: scale(1); opacity: 1; } }
          .animate-bounce-in { animation: bounce-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
          @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
          .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        `}
      </style>
      {view === AppView.MENU && renderMenu()}
      {view === AppView.QUIZ && renderQuiz()}
      {view === AppView.TRAINING && renderTraining()}
      {view === AppView.MULTIPLICATION_TABLE && renderMultiplicationTable()}
      {view === AppView.RESULTS && (
        <div className="min-h-screen bg-slate-50 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-10 pb-16 pt-10">
            <div className="bg-white rounded-[4rem] p-12 shadow-2xl text-center space-y-6 border-8 border-white">
               <h2 className="text-4xl font-black text-slate-600">完成挑战！ 🎉</h2>
               <div className="text-[10rem] font-black text-indigo-500 leading-none">{Math.round((Object.keys(answers).filter(id => quizProblems.find(q => q.id === id)?.correctAnswer === answers[id]).length / quizProblems.length) * 100)}%</div>
               <div className="flex gap-6 justify-center mt-10">
                  <button onClick={goToMenu} className="px-12 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xl border">主页</button>
                  <button onClick={startQuiz} className="px-12 py-4 bg-indigo-500 text-white rounded-2xl font-black text-xl shadow-lg">再战一局</button>
               </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {quizProblems.map(p => {
                const isCorrect = answers[p.id] === p.correctAnswer;
                return (
                  <button key={p.id} onClick={() => setSelectedReviewProblem({...p, userAnswer: answers[p.id], isCorrect})} className={`flex items-center justify-between p-8 rounded-[2.5rem] border-l-[12px] shadow-xl bg-white transition-transform active:scale-95 ${isCorrect ? 'border-green-400' : 'border-red-400'}`}>
                    <div className="text-3xl font-black text-slate-700">{p.num1} {p.operation} {p.num2} = {answers[p.id]}</div>
                    <div className={`text-5xl ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>{isCorrect ? '✓' : '✕'}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {view === AppView.HISTORY && (
        <div className="min-h-screen bg-slate-50 p-8 animate-fade-in">
          <div className="max-w-4xl mx-auto space-y-8">
             <div className="flex items-center gap-6">
                <button onClick={goToMenu} className="px-8 py-4 bg-white rounded-[2rem] shadow-md font-black text-slate-600 border">⬅ 返回</button>
                <h1 className="text-4xl font-black text-slate-800">成长足迹</h1>
             </div>
             <div className="grid gap-6">
                {history.map((item, idx) => (
                  <button key={idx} onClick={() => { setSelectedHistoryItem(item); setView(AppView.HISTORY_DETAILS); }} className="w-full bg-white p-8 rounded-[3rem] shadow-lg flex items-center justify-between text-left hover:translate-x-2 transition-transform border-4 border-white">
                      <div>
                         <div className="text-lg text-slate-400 font-bold mb-1">{new Date(item.timestamp).toLocaleString()}</div>
                         <div className="text-5xl font-black text-indigo-500">{item.score}%</div>
                      </div>
                      <div className="text-7xl">{item.score === 100 ? '🏆' : '🌟'}</div>
                  </button>
                ))}
             </div>
          </div>
        </div>
      )}
      {view === AppView.HISTORY_DETAILS && selectedHistoryItem && (
        <div className="min-h-screen bg-slate-50 p-8 animate-fade-in">
           <div className="max-w-4xl mx-auto space-y-10">
              <button onClick={() => setView(AppView.HISTORY)} className="px-8 py-4 bg-white rounded-[2rem] shadow-md font-black text-slate-600 border">⬅ 列表</button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedHistoryItem.problems?.map(p => (
                  <button key={p.id} onClick={() => setSelectedReviewProblem(p)} className={`flex items-center justify-between p-8 rounded-[2.5rem] border-l-[12px] shadow-xl bg-white ${p.isCorrect ? 'border-green-400' : 'border-red-400'}`}>
                    <div className="text-3xl font-black text-slate-700">{p.num1} {p.operation} {p.num2} = {p.userAnswer}</div>
                    <div className={`text-5xl ${p.isCorrect ? 'text-green-500' : 'text-red-500'}`}>{p.isCorrect ? '✓' : '✕'}</div>
                  </button>
                ))}
              </div>
           </div>
        </div>
      )}
      {selectedReviewProblem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-[4rem] p-10 w-[95vw] max-w-6xl shadow-2xl relative flex flex-col max-h-[90vh] border-8 border-white">
             <button 
               onClick={() => setSelectedReviewProblem(null)} 
               className="absolute top-6 right-6 p-4 bg-red-500 text-white rounded-full z-10 hover:bg-red-600 transition-colors shadow-lg"
             >
               ✕
             </button>
             <div className="overflow-y-auto space-y-12 py-4">
                <div className="flex justify-center scale-110">
                   <Visualizer num1={selectedReviewProblem.num1} num2={selectedReviewProblem.num2} operation={selectedReviewProblem.operation} showResult={true} />
                </div>
                <div className="text-center space-y-4">
                   <div className="text-3xl font-black text-slate-300">正确答案是</div>
                   <div className="text-[12rem] font-black text-indigo-500 leading-none">{selectedReviewProblem.correctAnswer}</div>
                </div>
             </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
