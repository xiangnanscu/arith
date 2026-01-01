import React from 'react';

interface SettingsModalProps {
  currentCount: number;
  onSave: (count: number) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ currentCount, onSave, onClose }) => {
  const options = [5, 10, 20, 30];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 w-96 shadow-2xl animate-bounce-in">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">设置</h2>
        
        <div className="mb-6">
          <label className="block text-slate-600 font-bold mb-3">要做多少道题？</label>
          <div className="grid grid-cols-4 gap-2">
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => onSave(opt)}
                className={`py-3 rounded-xl font-bold transition-all ${
                  currentCount === opt 
                    ? 'bg-indigo-500 text-white shadow-lg scale-105' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-700 transition-colors"
        >
          关闭
        </button>
      </div>
    </div>
  );
};

export default SettingsModal;