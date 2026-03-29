import React, { useState, useEffect } from 'react';
import { X, Users, Crown, Check } from 'lucide-react';
import { createCouncilSession } from '../../utils/councilApi';

const CouncilCreateModal = ({ isOpen, onClose, presets, onSuccess }) => {
  const [name, setName] = useState('');
  const [arbitratorId, setArbitratorId] = useState('');
  const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setError('');
    setSelectedParticipantIds([]);
    const g045 = presets.find(p => p.agent_type === 'g045');
    setArbitratorId(g045 ? String(g045.id) : (presets[0] ? String(presets[0].id) : ''));
  }, [isOpen, presets]);

  if (!isOpen) return null;

  const toggleParticipant = (id) => {
    setSelectedParticipantIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const participantCandidates = presets.filter(p => String(p.id) !== arbitratorId);

  const handleSubmit = async () => {
    if (!arbitratorId) { setError('请选择仲裁者'); return; }
    if (selectedParticipantIds.length < 2) { setError('参与者至少需要 2 位'); return; }
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
    <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0f1014] border border-exo-border rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-exo-border">
          <div className="flex items-center gap-2.5">
            <Users size={18} className="text-exo-gold" />
            <span className="font-bold text-exo-text tracking-wide">召集议会</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-exo-muted hover:text-exo-text hover:bg-white/5"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* 议会名称 */}
          <div>
            <label className="block text-[11px] font-semibold text-exo-muted uppercase tracking-wider mb-1.5">议题名称（可选）</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="留空由仲裁者确认后填入"
              className="w-full bg-black/40 border border-exo-border rounded-lg px-3 py-2 text-sm text-exo-text placeholder-exo-muted/40 focus:outline-none focus:border-exo-gold/50"
            />
          </div>

          {/* 仲裁者 */}
          <div>
            <label className="block text-[11px] font-semibold text-exo-muted uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Crown size={11} className="text-exo-gold" /> 仲裁者
            </label>
            <select
              value={arbitratorId}
              onChange={e => { setArbitratorId(e.target.value); setSelectedParticipantIds(p => p.filter(id => id !== parseInt(e.target.value))); }}
              className="w-full bg-black/40 border border-exo-border rounded-lg px-3 py-2 text-sm text-exo-text focus:outline-none focus:border-exo-gold/50"
            >
              {presets.map(p => (
                <option key={p.id} value={p.id}>{p.name}{p.agent_type === 'g045' ? ' ★' : ''}</option>
              ))}
            </select>
          </div>

          {/* 参与者 */}
          <div>
            <label className="block text-[11px] font-semibold text-exo-muted uppercase tracking-wider mb-1.5">参与者（至少 2 位）</label>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {participantCandidates.length === 0 ? (
                <p className="text-xs text-exo-muted/50 py-2 text-center">无可用参与者</p>
              ) : participantCandidates.map(p => {
                const selected = selectedParticipantIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => toggleParticipant(p.id)}
                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all border ${selected ? 'bg-exo-gold/10 border-exo-gold/30 text-exo-text' : 'border-transparent hover:bg-white/5 text-exo-muted'}`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${selected ? 'bg-exo-gold border-exo-gold' : 'border-exo-border'}`}>
                      {selected && <Check size={10} className="text-black" />}
                    </div>
                    <span className="text-sm font-medium">{p.name}</span>
                    {p.agent_type === 'g045' && <span className="ml-auto text-[10px] text-exo-gold">Superior</span>}
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-exo-muted/50 mt-1">已选 {selectedParticipantIds.length} 位</p>
          </div>

          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="p-5 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-exo-muted border border-exo-border rounded-lg hover:bg-white/5 transition-colors">取消</button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedParticipantIds.length < 2 || !arbitratorId}
            className="flex-1 py-2 text-sm font-semibold bg-exo-gold text-black rounded-lg hover:bg-exo-gold/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? '召集中...' : '召集议会'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CouncilCreateModal;
