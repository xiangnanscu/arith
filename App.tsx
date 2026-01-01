
import React, { useState, useEffect, useMemo } from 'react';
import { OpType, QuizConfig, MathProblem, QuizHistoryItem, AppView, TrainingStep } from './types';
import { OPERATION_COLORS, OPERATION_NAMES } from './constants';
import { generateQuiz, generateTrainingProblem } from './services/mathEngine';
import NumberPad from './components/NumberPad';
import Visualizer from './components/Visualizer';
import SettingsModal from './components/SettingsModal';

// 定义摇晃动画的相关配置变量
const SHAKE_DURATION_SEC = 2; // 摇晃总时长（秒）
const SHAKE_CYCLE_SEC = 0.2;  // 单次摇晃周期（秒）
const SHAKE_REPEAT_COUNT = SHAKE_DURATION_SEC / SHAKE_CYCLE_SEC; // 重复次数

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

  // --- Training Specific State ---
  const [trainingProblem, setTrainingProblem] = useState<MathProblem | null>(null);
  const [trainingStep, setTrainingStep] = useState<TrainingStep>(TrainingStep.CHOOSE_WHICH);
  const [splitInputs, setSplitInputs] = useState<[string, string]>(['', '']);
  const [activeSplitIdx, setActiveSplitIdx] = useState<0 | 1 | null>(null);
  const [combineInput, setCombineInput] = useState('');
  const [finalInput, setFinalInput] = useState('');
  const [trainingError, setTrainingError] = useState<string | null>(null);
  const [errorBoxIdx, setErrorBoxIdx] = useState<number | null>(null); 

  // Responsive scaling for Training view
  const [trainingScale, setTrainingScale] = useState(1);

  useEffect(() => {
    if (view === AppView.TRAINING) {
      const handleResize = () => {
        const width = window.innerWidth;
        const padding = 40; // Total horizontal padding/margin to reserve
        const baseWidth = 460; // CONTAINER_WIDTH from renderTraining
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
    setView(AppView.MENU);
  };

  const toggleOperation = (op: OpType) => {
    setConfig(prev => {
      const current = prev.selectedOperations;
      if (current.includes(op)) {
        if (current.length === 1) return prev;
        return { ...prev, selectedOperations: current.filter(o => o !== op) };
      } else {
        return { ...prev, selectedOperations: [...current, op] };
      }
    });
  };

  const startQuiz = () => {
    if (config.selectedOperations.length === 0) return;
    const problems = generateQuiz(config.questionCount, config.selectedOperations);
    setQuizProblems(problems);
    setCurrentProblemIndex(0);
    setCurrentInput('');
    setAnswers({});
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

  const submitAnswer = () => {
    if (currentInput === '') return;
    const problem = quizProblems[currentProblemIndex];
    const val = parseInt(currentInput, 10);
    const newAnswers = { ...answers, [problem.id]: val };
    setAnswers(newAnswers);
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

  const handleTrainingKeyPad = (n: number) => {
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
  };

  const handleTrainingDelete = () => {
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
        <style>
          {`
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              25% { transform: translateX(-8px); }
              75% { transform: translateX(8px); }
            }
            .animate-shake {
              animation: shake ${SHAKE_CYCLE_SEC}s ease-in-out ${SHAKE_REPEAT_COUNT};
            }
          `}
        </style>
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
              <NumberPad disabled={trainingStep === TrainingStep.CHOOSE_WHICH || trainingStep === TrainingStep.SUCCESS} onPress={handleTrainingKeyPad} onDelete={handleTrainingDelete} onSubmit={validateTrainingStep} />
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
                onClick={() => toggleOperation(op)}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
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
      <div className="flex flex-col min-h-screen bg-slate-100">
        <div className="flex items-center justify-between p-6 bg-white shadow-md z-10">
          <button onClick={goToMenu} className="px-6 py-2 bg-slate-100 rounded-xl font-bold text-slate-500 border">✕ 退出</button>
          <div className="flex-1 mx-12 h-6 bg-slate-200 rounded-full overflow-hidden border-2 border-slate-100">
            <div className="h-full bg-indigo-500 transition-all duration-500 ease-out shadow-inner" style={{ width: `${progress}%` }} />
          </div>
          <div className="font-bold text-2xl text-slate-600">{currentProblemIndex + 1} / {quizProblems.length}</div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
          <div className="w-full max-w-3xl bg-white rounded-[4rem] shadow-2xl p-12 flex flex-col items-center animate-bounce-in border-8 border-white">
             <div className="flex items-center gap-6 text-[7rem] font-black text-slate-800 leading-none">
                <span>{problem.num1}</span>
                <span className="text-indigo-500">{problem.operation}</span>
                <span>{problem.num2}</span>
                <span className="text-indigo-500">=</span>
                <div className={`min-w-[1.5em] text-center border-b-[12px] transition-colors duration-200 ${currentInput ? 'text-indigo-600 border-indigo-600' : 'text-slate-200 border-slate-100'}`}>
                  {currentInput || '?'}
                </div>
             </div>
          </div>
          <div className="w-full max-w-[500px]">
            <NumberPad onPress={(n) => currentInput.length < 3 && setCurrentInput(p => p + n)} onDelete={() => setCurrentInput(p => p.slice(0, -1))} onSubmit={submitAnswer} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {view === AppView.MENU && renderMenu()}
      {view === AppView.QUIZ && renderQuiz()}
      {view === AppView.TRAINING && renderTraining()}
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
             <button onClick={() => setSelectedReviewProblem(null)} className="absolute top-6 right-6 p-4 bg-slate-100 rounded-full z-10 hover:bg-slate-200 transition-colors">✕</button>
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
