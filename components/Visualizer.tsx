import React from 'react';
import { OpType } from '../types';

interface VisualizerProps {
  num1: number;
  num2: number;
  operation: OpType;
  showResult: boolean; // If true, show the final state
}

interface DotProps {
  color: string;
  ghost?: boolean;
  crossed?: boolean;
}

// Static Dot component (removed transition classes)
const Dot: React.FC<DotProps> = ({ color, ghost, crossed }) => (
  <div className="relative">
    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${color} ${ghost ? 'opacity-20 scale-90' : 'shadow-sm border-2 border-white/30 scale-100'}`} />
    {crossed && (
      <div className="absolute inset-0 flex items-center justify-center text-red-600 font-bold text-3xl select-none opacity-80">
        ✕
      </div>
    )}
  </div>
);

const EmptySlot: React.FC = () => <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-200/50 border-2 border-dashed border-slate-300" />;

const Visualizer: React.FC<VisualizerProps> = ({ num1, num2, operation, showResult }) => {
  
  // --- ADDITION: Make Ten Strategy ---
  if (operation === OpType.ADD) {
    const sum = num1 + num2;
    const frame1Size = 10;
    const frame2Size = 10;

    return (
      <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-[2rem] border-4 border-blue-100 shadow-sm">
        <div className="text-indigo-500 font-bold tracking-wide text-lg">
          {sum > 10 ? "凑十法图解" : "数一数"}
        </div>
        
        <div className="flex gap-4 sm:gap-8 overflow-x-auto p-2">
            {/* First Frame (Target 10) */}
            <div className="grid grid-cols-5 gap-2 p-3 bg-white rounded-xl border-2 border-indigo-100 shadow-inner">
                {Array.from({ length: frame1Size }).map((_, i) => {
                    // Logic:
                    // 1. Initial blue dots (num1)
                    if (i < num1) return <Dot key={i} color="bg-blue-400" />;
                    
                    // 2. Filled red dots (moved from num2) if result shown
                    // We need (10 - num1) dots from num2 to fill this frame.
                    const slotIndex = i - num1;
                    if (showResult && slotIndex >= 0 && slotIndex < num2) {
                        return <Dot key={i} color="bg-red-400" />;
                    }

                    return <EmptySlot key={i} />;
                })}
            </div>

            {/* Second Frame (Remainder) */}
            <div className={`grid grid-cols-5 gap-2 p-3 rounded-xl border-2 ${sum > 10 ? 'bg-white border-indigo-100 shadow-inner' : 'border-transparent'}`}>
                 {Array.from({ length: frame2Size }).map((_, i) => {
                    // How many reds did we use in Frame 1?
                    const redsUsedInFrame1 = Math.max(0, 10 - num1);
                    
                    if (!showResult) {
                         if (i < num2) return <Dot key={i} color="bg-red-400" />;
                         return <EmptySlot key={i} />;
                    } else {
                         // Result State: We shifted 'redsUsedInFrame1' dots away.
                         const redDotIndex = redsUsedInFrame1 + i;
                         if (redDotIndex < num2) return <Dot key={i} color="bg-red-400" />;
                         
                         // Only show empty slots if we are actually using this frame (i.e. sum > 10)
                         if (sum > 10) return <EmptySlot key={i} />;
                         return null;
                    }
                 })}
            </div>
        </div>
      </div>
    );
  }

  // --- SUBTRACTION: Crossing Out ---
  if (operation === OpType.SUB) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-[2rem] border-4 border-red-100 shadow-sm">
        <div className="text-red-500 font-bold tracking-wide text-lg">
           减去 {num2}
        </div>
        <div className="flex flex-wrap justify-center gap-3 max-w-lg">
           {Array.from({ length: num1 }).map((_, i) => {
               // We cross out the LAST num2 dots.
               // So if i >= (num1 - num2), it is crossed.
               const isCrossed = showResult && i >= (num1 - num2);
               return <Dot key={i} color="bg-blue-400" crossed={isCrossed} ghost={isCrossed} />;
           })}
        </div>
      </div>
    );
  }

  // --- MULTIPLICATION: Grid/Array with Headers ---
  if (operation === OpType.MUL) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-[2rem] border-4 border-amber-100 shadow-sm">
         <div className="text-amber-600 font-bold tracking-wide text-lg">
           {num1} 行，每行 {num2} 个
        </div>
        <div className="p-4 bg-amber-50 rounded-xl border-2 border-amber-200 overflow-x-auto max-w-full">
            <div 
                className="grid gap-2"
                style={{ 
                    // extra column for row numbers
                    gridTemplateColumns: `auto repeat(${num2}, minmax(0, 1fr))` 
                }}
            >
                {/* Header Row (Column Numbers) */}
                <div className="w-8 h-8 sm:w-10 sm:h-10"></div> {/* Empty top-left corner */}
                {Array.from({ length: num2 }).map((_, col) => (
                    <div key={`col-${col}`} className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-amber-200/50 rounded-lg text-amber-700 font-bold text-lg">
                        {col + 1}
                    </div>
                ))}

                {/* Rows with labels */}
                {Array.from({ length: num1 }).map((_, row) => (
                    <React.Fragment key={`row-${row}`}>
                        {/* Row Number Label */}
                        <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-amber-200/50 rounded-lg text-amber-700 font-bold text-lg">
                            {row + 1}
                        </div>
                        {/* Dots for this row */}
                        {Array.from({ length: num2 }).map((_, col) => (
                            <Dot key={`dot-${row}-${col}`} color="bg-amber-400" />
                        ))}
                    </React.Fragment>
                ))}
            </div>
        </div>
      </div>
    );
  }

  // --- DIVISION: Grouping ---
  if (operation === OpType.DIV) {
      const perGroup = num2 === 0 ? 0 : num1 / num2;
      
      return (
        <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-[2rem] border-4 border-purple-100 shadow-sm">
             <div className="text-purple-600 font-bold tracking-wide text-lg">
                把 {num1} 平均分成 {num2} 份
            </div>
            <div className="flex flex-wrap gap-4 justify-center">
                {Array.from({ length: num2 }).map((_, groupIdx) => (
                    <div key={groupIdx} className="flex flex-col items-center gap-2">
                        <div className="relative p-3 border-b-4 border-l-2 border-r-2 border-purple-300 rounded-b-2xl rounded-t-lg bg-purple-50 min-w-[80px] min-h-[80px]">
                            <div className="flex flex-wrap gap-1 justify-center">
                                 {Array.from({ length: perGroup }).map((_, itemIdx) => (
                                     <div key={itemIdx} className="w-5 h-5 rounded-full bg-purple-500 shadow-sm" />
                                 ))}
                            </div>
                        </div>
                        <span className="text-purple-400 font-bold text-2xl">{groupIdx+1}</span>
                    </div>
                ))}
            </div>
        </div>
      );
  }

  return null;
};

export default Visualizer;