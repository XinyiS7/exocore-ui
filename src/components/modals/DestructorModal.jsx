import React from 'react';
import { AlertTriangle, Archive, Trash2 } from 'lucide-react';

const DestructorModal = ({ isOpen, onClose, title, description, onArchive, onDelete }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-exo-panel border border-red-900/50 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-red-500/10 p-4 border-b border-red-900/30 flex items-center gap-3 text-red-400">
          <AlertTriangle size={20} className="animate-pulse" />
          <h3 className="font-bold tracking-widest uppercase text-sm">Destruction Protocol</h3>
        </div>
        <div className="p-6 space-y-2 text-sm text-exo-text">
          <p className="font-semibold text-lg">{title}</p>
          <p className="text-exo-muted leading-relaxed">{description}</p>
        </div>
        <div className="p-4 bg-black/40 border-t border-exo-border flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-medium text-exo-muted hover:text-exo-text transition-colors">CANCEL</button>
          <button onClick={() => { onArchive(); onClose(); }} className="px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 text-exo-gold border border-exo-gold/30 hover:bg-exo-gold/10 transition-colors">
            <Archive size={14} /> ARCHIVE
          </button>
          <button onClick={() => { onDelete(); onClose(); }} className="px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)]">
            <Trash2 size={14} /> PURGE
          </button>
        </div>
      </div>
    </div>
  );
};

export default DestructorModal;
