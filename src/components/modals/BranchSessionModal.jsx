import React, { useState, useEffect } from 'react';
import { GitFork, X, Activity, Check } from 'lucide-react';

const BranchSessionModal = ({ isOpen, onClose, onConfirm, isSubmitting }) => {
  const [name, setName] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-exo-panel border border-exo-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-exo-border flex items-center justify-between bg-black/20">
          <h3 className="font-bold tracking-widest text-exo-text flex items-center gap-2">
            <GitFork size={18} className="text-blue-400" /> BRANCH CONVERSATION
          </h3>
          <button onClick={onClose} className="text-exo-muted hover:text-white"><X size={18}/></button>
        </div>
        
        <div className="p-6 space-y-4">
          <p className="text-sm text-exo-muted leading-relaxed">
            确定要从这条消息开始创建新的分支会话吗？这不会影响当前的对话历史。
          </p>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-exo-gold/60 uppercase tracking-widest">Session Name (Optional)</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="留空则使用默认名称..." 
              className="w-full bg-black/50 border border-exo-border rounded-lg px-3 py-2 text-sm text-exo-text outline-none focus:border-exo-gold/50 transition-colors"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') onConfirm(name); }}
            />
          </div>
        </div>

        <div className="p-4 border-t border-exo-border flex justify-end gap-3 bg-black/40">
          <button 
            onClick={onClose} 
            className="px-4 py-2 rounded-lg text-xs font-medium text-exo-muted hover:text-white transition-colors"
          >
            取消
          </button>
          <button 
            onClick={() => onConfirm(name)} 
            disabled={isSubmitting} 
            className="px-6 py-2 rounded-lg text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500 hover:text-white transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? <Activity size={14} className="animate-spin" /> : <Check size={14} />} 确认分支
          </button>
        </div>
      </div>
    </div>
  );
};

export default BranchSessionModal;
