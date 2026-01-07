
import React from 'react';
import { OpType } from '../types';

interface VisualizerProps {
  num1: number;
  num2: number;
  operation: OpType;
  showResult: boolean;
  isHint?: boolean;
}

interface DotProps {
  color: string;
  ghost?: boolean;
  crossed?: boolean;
  size?: 'sm' | 'md';
}

const Dot: React.FC<DotProps> = ({ color, ghost, crossed, size = 'md' }) => (
  <div className="relative">
    <div className={`
      ${size === 'md' ? 'w-8 h-8 sm:w-10 sm:h-10' : 'w-6 h-6'} 
      rounded-full ${color} 
      ${ghost ? 'opacity-20 scale-90' : 'shadow-sm border-2 border-white/30 scale-100'}
      transition-all duration-300
    `} />
    {crossed && (
      <div className="absolute inset-0 flex items-center justify-center text-red-600 font-bold text-3xl select-none opacity-80">
        ✕
      </div>
    )}
  </div>
);

const EmptySlot: React.FC = () => <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-200/50 border-2 border-dashed border-slate-300" />;

const Visualizer: React.FC<VisualizerProps> = ({ num1, num2, operation, showResult, isHint }) => {
  
  if (operation === OpType.ADD) {
    const sum = num1 + num2;
    const frame1Size = 10;
    const frame2Size = 10;
    return (
      <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-[2rem] border-4 border-blue-100 shadow-sm">
        <div className="text-indigo-500 font-bold tracking-wide text-lg">{sum > 10 ? "凑十法图解" : "数一数"}</div>
        <div className="flex gap-4 sm:gap-8 overflow-x-auto p-2">
            <div className="grid grid-cols-5 gap-2 p-3 bg-white rounded-xl border-2 border-indigo-100 shadow-inner">
                {Array.from({ length: frame1Size }).map((_, i) => {
                    if (i < num1) return <Dot key={i} color="bg-blue-400" />;
                    const slotIndex = i - num1;
                    if (showResult && slotIndex >= 0 && slotIndex < num2) return <Dot key={i} color="bg-red-400" />;
                    return <EmptySlot key={i} />;
                })}
            </div>
            <div className={`grid grid-cols-5 gap-2 p-3 rounded-xl border-2 ${sum > 10 ? 'bg-white border-indigo-100 shadow-inner' : 'border-transparent'}`}>
                 {Array.from({ length: frame2Size }).map((_, i) => {
                    const redsUsedInFrame1 = Math.max(0, 10 - num1);
                    if (!showResult) {
                         if (i < num2) return <Dot key={i} color="bg-red-400" />;
                         return <EmptySlot key={i} />;
                    } else {
                         const redDotIndex = redsUsedInFrame1 + i;
                         if (redDotIndex < num2) return <Dot key={i} color="bg-red-400" />;
                         if (sum > 10) return <EmptySlot key={i} />;
                         return null;
                    }
                 })}
            </div>
        </div>
      </div>
    );
  }

  if (operation === OpType.SUB) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-[2rem] border-4 border-red-100 shadow-sm">
        <div className="text-red-500 font-bold tracking-wide text-lg">减去 {num2}</div>
        <div className="flex flex-wrap justify-center gap-3 max-w-lg">
           {Array.from({ length: num1 }).map((_, i) => {
               const isCrossed = showResult && i >= (num1 - num2);
               return <Dot key={i} color="bg-blue-400" crossed={isCrossed} ghost={isCrossed} />;
           })}
        </div>
      </div>
    );
  }

  if (operation === OpType.MUL) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-[2rem] border-4 border-amber-100 shadow-sm transition-all">
         <div className="text-amber-600 font-bold tracking-wide text-lg">
           一共 {num2} 组，每组 {num1} 个
        </div>
        <div className="p-4 flex flex-col gap-4 max-w-full overflow-x-auto">
            {Array.from({ length: num2 }).map((_, row) => (
                <div key={row} className="flex items-center gap-4">
                    <span className="text-slate-400 font-black text-sm w-6">#{row + 1}</span>
                    <div className="flex gap-2">
                      {Array.from({ length: num1 }).map((_, col) => (
                          <Dot key={col} color="bg-amber-400" size={isHint ? 'sm' : 'md'} />
                      ))}
                    </div>
                </div>
            ))}
        </div>
      </div>
    );
  }

  if (operation === OpType.DIV) {
      const perGroup = num2 === 0 ? 0 : num1 / num2;
      return (
        <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-[2rem] border-4 border-purple-100 shadow-sm">
             <div className="text-purple-600 font-bold tracking-wide text-lg">把 {num1} 平均分成 {num2} 份</div>
            <div className="flex flex-wrap gap-4 justify-center">
                {Array.from({ length: num2 }).map((_, groupIdx) => (
                    <div key={groupIdx} className="flex flex-col items-center gap-2">
                        <div className="p-3 border-2 border-purple-100 rounded-2xl bg-purple-50 min-w-[80px] min-h-[80px]">
                            <div className="flex flex-wrap gap-1 justify-center">
                                 {Array.from({ length: perGroup }).map((_, itemIdx) => (
                                     <div key={itemIdx} className="w-5 h-5 rounded-full bg-purple-500 shadow-sm" />
                                 ))}
                            </div>
                        </div>
                        <span className="text-purple-400 font-bold text-lg">第 {groupIdx+1} 份</span>
                    </div>
                ))}
            </div>
        </div>
      );
  }
  return null;
};

export default Visualizer;
