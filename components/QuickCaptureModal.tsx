import React, { useState } from 'react';
import { X, Sparkles, Clock } from 'lucide-react';
import { PendingGratitude } from '../types';

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (text: string) => void;
}

export const QuickCaptureModal: React.FC<QuickCaptureModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [text, setText] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (text.trim()) {
      onSave(text.trim());
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
        setText('');
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel rounded-[3rem] p-8 max-w-md w-full animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-300 to-teal-400 rounded-full flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <h3 className="text-lg font-black text-slate-800">感謝を捉える</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        {!isSaved ? (
          <>
            <div className="space-y-4 mb-6">
              <p className="text-sm text-slate-600 leading-relaxed">
                今、感謝が見つかりましたか？
              </p>
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-2xl border border-emerald-100">
                <div className="flex items-center gap-2 text-xs text-emerald-700 mb-2">
                  <Clock size={14} />
                  <span className="font-bold">今の瞬間を捉えよう</span>
                </div>
                <p className="text-xs text-slate-600">
                  夜の日記で振り返ることができます
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <textarea
                placeholder="今、心に浮かんだ感謝を自由に書いて..."
                className="w-full px-5 py-4 rounded-2xl glass-input outline-none font-bold text-slate-700 placeholder:text-slate-300/80 shadow-sm resize-none"
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-[2rem] font-black text-sm hover:bg-slate-200 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!text.trim()}
                  className="flex-1 py-4 bg-gradient-to-r from-emerald-400 to-teal-500 text-white rounded-[2rem] font-black text-sm shadow-lg hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  保存する
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">✨</div>
            <p className="text-lg font-black text-slate-800 mb-2">
              保存しました！
            </p>
            <p className="text-sm text-slate-500">
              夜の日記で振り返れます
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
