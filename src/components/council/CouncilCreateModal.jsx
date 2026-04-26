import React, { useState, useEffect, useMemo } from 'react';
import { X, Users, Crown, Check, Shield } from 'lucide-react';
import { createCouncilSession } from '../../utils/councilApi';
import { sortPresets, isSuperiorType } from '../../utils/presets';

const CouncilCreateModal = ({ isOpen, onClose, presets, onSuccess }) => {
  const [name, setName] = useState('');
  const [arbitratorId, setArbitratorId] = useState('');
  const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const sortedPresets = useMemo(() => sortPresets(presets), [presets, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setError('');
    setSelectedParticipantIds([]);
    const g045 = sortedPresets.find(p => isSuperiorType(p.agent_type));
    setArbitratorId(g045 ? String(g045.id) : (sortedPresets[0] ? String(sortedPresets[0].id) : ''));
  }, [isOpen, sortedPresets]);

  if (!isOpen) return null;

  const toggleParticipant = (id) => {
    setSelectedParticipantIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const participantCandidates = sortedPresets.filter(p => String(p.id) !== arbitratorId);

  const handleSubmit = async () => {
    if (!arbitratorId) { setError('ARBITRATOR_REQUIRED'); return; }
    if (selectedParticipantIds.length < 2) { setError('MIN_PARTICIPANTS_2'); return; }
    setIsSubmitting(true);
    setError('');
    try {
      const session = await createCouncilSession({
        name: name.trim() || undefined,
        arbitratorPresetId: parseInt(arbitratorId),
        participantPresetIds: selectedParticipantIds.map(Number),
      });
      onSuccess(session.id);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-exo-pure border border-exo-mist-10 rounded-[2px] w-full max-w-md shadow-[0_0_60px_rgba(0,0,0,0.5)] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-exo-mist-10 bg-exo-pure/50">
          <div className="flex flex-col">
            <h3 className="font-bold text-white flex items-center gap-2 font-mono text-sm uppercase tracking-[0.2em]">
              <Users size={18} className="text-exo-accent" /> Council Convocation
            </h3>
            <span className="text-[9px] text-exo-muted font-mono uppercase tracking-widest opacity-40 mt-1">Multi-Agent Orchestration Protocol</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-exo-muted hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] scrollbar-hide">
          {/* Council Name */}
          <div className="space-y-2">
            <label className="label-caps opacity-50">Council Topic / 议题名称</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="AUTO-GENERATE FROM ARBITRATOR..."
              className="w-full bg-black/60 border border-exo-mist-10 rounded-[2px] px-4 py-2.5 text-sm text-white font-mono focus:border-exo-accent/40 outline-none transition-all placeholder:opacity-20"
            />
          </div>

          {/* Arbitrator */}
          <div className="space-y-2">
            <label className="label-caps opacity-50 flex items-center gap-2">
              <Crown size={12} className="text-exo-accent" /> Arbitrator / 仲裁者
            </label>
            <select
              value={arbitratorId}
              onChange={e => { setArbitratorId(e.target.value); setSelectedParticipantIds(p => p.filter(id => id !== parseInt(e.target.value))); }}
              className="w-full bg-black/60 border border-exo-mist-10 rounded-[2px] px-4 py-2.5 text-sm text-white font-mono focus:border-exo-accent/40 outline-none transition-all cursor-pointer"
            >
              {sortedPresets.map(p => (
                <option key={p.id} value={p.id} className="bg-exo-pure">{p.name}{isSuperiorType(p.agent_type) ? ' [L3_CORE]' : ''}</option>
              ))}
            </select>
          </div>

          {/* Participants */}
          <div className="space-y-3">
            <label className="label-caps opacity-50">Council Members / 参与者 (MIN 2)</label>
            <div className="space-y-1 max-h-48 overflow-y-auto border border-exo-mist-10 rounded-[2px] bg-black/30 p-2 scrollbar-hide">
              {participantCandidates.length === 0 ? (
                <p className="text-[10px] font-mono text-exo-muted/30 py-4 text-center italic uppercase tracking-widest">No candidates available</p>
              ) : participantCandidates.map(p => {
                const selected = selectedParticipantIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => toggleParticipant(p.id)}
                    className={`
                      flex items-center gap-3 p-3 rounded-[2px] cursor-pointer transition-all border
                      ${selected 
                        ? 'bg-exo-accent/10 border-exo-accent/40 text-white' 
                        : 'border-transparent hover:bg-white/5 text-exo-muted/60'}
                    `}
                  >
                    <div className={`w-4 h-4 rounded-[2px] border flex items-center justify-center shrink-0 transition-colors ${selected ? 'bg-exo-accent border-exo-accent' : 'border-exo-mist-10'}`}>
                      {selected && <Check size={10} className="text-exo-pure" strokeWidth={4} />}
                    </div>
                    <span className="text-[12px] font-mono uppercase tracking-tight">{p.name}</span>
                    {isSuperiorType(p.agent_type) && <span className="ml-auto text-[9px] font-mono text-exo-accent opacity-60 font-bold uppercase tracking-widest">[L3]</span>}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center px-1">
              <span className="text-[9px] font-mono text-exo-muted/40 uppercase">Selected: {selectedParticipantIds.length} members</span>
              {selectedParticipantIds.length < 2 && (
                <span className="text-[9px] font-mono text-red-500/60 uppercase animate-pulse">Insufficient headcount</span>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-600/10 border border-red-500/20 rounded-[2px] px-4 py-3 text-[10px] font-mono text-red-500 uppercase tracking-widest leading-relaxed">
              &gt;&gt; CONVOCATION_ERROR: {error}
            </div>
          )}
        </div>

        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 text-[11px] font-bold uppercase tracking-widest text-exo-muted border border-exo-mist-10 rounded-[2px] hover:text-white hover:bg-white/5 transition-all">Abort</button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedParticipantIds.length < 2 || !arbitratorId}
            className="flex-1 py-2 text-[11px] font-bold bg-white text-exo-pure rounded-[2px] hover:bg-exo-accent transition-all shadow-brutalist active:scale-95 disabled:opacity-30 flex items-center justify-center gap-2 uppercase tracking-widest"
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
            {isSubmitting ? 'Summoning...' : 'Convoke Council'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CouncilCreateModal;
