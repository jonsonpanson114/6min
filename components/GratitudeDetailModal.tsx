import React, { useState, useEffect } from 'react';
import { X, Heart, Sparkles } from 'lucide-react';
import { GratitudeDetail } from '../types';

interface GratitudeDetailModalProps {
  isOpen: boolean;
  gratitudeText: string;
  existingDetail?: GratitudeDetail;
  onClose: () => void;
  onSave: (detail: GratitudeDetail) => void;
}

export const GratitudeDetailModal: React.FC<GratitudeDetailModalProps> = ({
  isOpen,
  gratitudeText,
  existingDetail,
  onClose,
  onSave,
}) => {
  const [why, setWhy] = useState(existingDetail?.why || '');
  const [how, setHow] = useState(existingDetail?.how || '');

  useEffect(() => {
    if (isOpen) {
      setWhy(existingDetail?.why || '');
      setHow(existingDetail?.how || '');
    }
  }, [isOpen, existingDetail]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSave({
      text: gratitudeText,
      why: why.trim() || undefined,
      how: how.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel rounded-[3rem] p-8 max-w-md w-full animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-rose-300 to-pink-400 rounded-full flex items-center justify-center">
              <Heart size={20} className="text-white" />
            </div>
            <h3 className="text-lg font-black text-slate-800">感謝を深める</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        <div className="space-y-6">
          {/* 元の感謝 */}
          <div className="glass-input p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-rose-50">
            <p className="text-sm text-slate-600 mb-2 font-bold">元の感謝</p>
            <p className="font-bold text-slate-800">{gratitudeText}</p>
          </div>

          {/* なぜ感謝なのか？ */}
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest">
              <Sparkles size={14} className="text-amber-400" />
              なぜそれが感謝なの？
            </label>
            <textarea
              placeholder="この感謝を感じる理由は..."
              className="w-full px-5 py-4 rounded-2xl glass-input outline-none font-bold text-slate-700 placeholder:text-slate-300/80 shadow-sm resize-none"
              rows={3}
              value={why}
              onChange={(e) => setWhy(e.target.value)}
            />
            <p className="text-xs text-slate-500 italic">
              例：温かい香りが、一日の始まりの小さな儀式になっているから
            </p>
          </div>

          {/* それがあなたをどうした？ */}
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest">
              <Heart size={14} className="text-rose-400" />
              それがあなたをどうした？
            </label>
            <textarea
              placeholder="その感謝がもたらした変化は..."
              className="w-full px-5 py-4 rounded-2xl glass-input outline-none font-bold text-slate-700 placeholder:text-slate-300/80 shadow-sm resize-none"
              rows={3}
              value={how}
              onChange={(e) => setHow(e.target.value)}
            />
            <p className="text-xs text-slate-500 italic">
              例：「わたしはここにいていい」と安心させてくれるから
            </p>
          </div>

          {/* アクションボタン */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-[2rem] font-black text-sm hover:bg-slate-200 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 py-4 bg-gradient-to-r from-rose-400 to-pink-500 text-white rounded-[2rem] font-black text-sm shadow-lg hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
