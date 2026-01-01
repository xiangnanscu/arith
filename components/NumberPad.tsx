import React from 'react';

interface NumberPadProps {
  onPress: (num: number) => void;
  onDelete: () => void;
  onSubmit: () => void;
  disabled?: boolean;
}

const NumberPad: React.FC<NumberPadProps> = ({ onPress, onDelete, onSubmit, disabled }) => {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

  return (
    <div className="flex flex-col gap-3 w-full max-w-lg mx-auto p-4 bg-white/50 rounded-3xl shadow-lg backdrop-blur-sm">
      <div className="grid grid-cols-5 gap-3">
        {numbers.map((num) => (
          <button
            key={num}
            disabled={disabled}
            onClick={() => onPress(num)}
            className={`
              aspect-square rounded-2xl text-3xl font-bold text-white shadow-[0_4px_0_rgba(0,0,0,0.2)]
              transition-all active:shadow-none active:translate-y-1
              ${disabled ? 'bg-slate-300 cursor-not-allowed' : 'bg-indigo-400 hover:bg-indigo-500'}
            `}
          >
            {num}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          disabled={disabled}
          onClick={onDelete}
          className={`
            py-4 rounded-2xl text-2xl font-bold text-white shadow-[0_4px_0_rgba(0,0,0,0.2)]
            transition-all active:shadow-none active:translate-y-1
            ${disabled ? 'bg-slate-300' : 'bg-red-400 hover:bg-red-500'}
          `}
        >
          ⌫ 删除
        </button>
        <button
          disabled={disabled}
          onClick={onSubmit}
          className={`
            py-4 rounded-2xl text-2xl font-bold text-white shadow-[0_4px_0_rgba(0,0,0,0.2)]
            transition-all active:shadow-none active:translate-y-1
            ${disabled ? 'bg-slate-300' : 'bg-green-500 hover:bg-green-600'}
          `}
        >
          提交 ✓
        </button>
      </div>
    </div>
  );
};

export default NumberPad;