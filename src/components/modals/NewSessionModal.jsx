import React, { useState, useEffect, useMemo } from 'react';
import { Plus, X, Activity, Folder, Check, MessageSquare, Code2 } from 'lucide-react';
import { baseUrl, getCsrfToken } from '../../utils/api';
import { sortPresets } from '../../utils/presets';

const NewSessionModal = ({ isOpen, onClose, projects, presets, initialContext, onSuccess }) => {
  const sortedPresets = useMemo(() => sortPresets(presets), [presets, isOpen]);
  const [name, setName] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [sessionType, setSessionType] = useState("chat");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName("");
    setSessionType("chat");
    setSelectedProjectIds(initialContext?.projectId ? [initialContext.projectId] : []);

    if (initialContext?.presetId && sortedPresets.find(p => p.id === initialContext.presetId)) {
      setSelectedPresetId(initialContext.presetId);
    } else if (sortedPresets.length > 0) {
      setSelectedPresetId(sortedPresets[0].id);
    }
  }, [isOpen, initialContext, sortedPresets]);

  if (!isOpen) return null;

  const currentPreset = sortedPresets.find(p => p.id === parseInt(selectedPresetId));
  const isG045 = currentPreset?.agent_type === 'g045';

  const toggleProject = (pid) => {
    if (isG045) setSelectedProjectIds(prev => prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]);
    else setSelectedProjectIds(prev => prev.includes(pid) ? [] : [pid]);
  };

  const handleSubmit = async () => {
    if (!selectedPresetId) return alert("System Error: No Agent selected.");
    setIsSubmitting(true);
    const payload = {
      preset_id: parseInt(selectedPresetId),
      name: name.trim() || undefined,
      project_ids: selectedProjectIds,
      session_type: sessionType,
    };

    try {
      const res = await fetch(`${baseUrl}/api/agents/sessions/init/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        body: JSON.stringify(payload),
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess(data.data.session_id);
        onClose();
      } else {
        alert("创建失败: " + JSON.stringify(data));
      }
    } catch (e) {
      alert("网络错误。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-exo-panel border border-exo-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-exo-border flex items-center justify-between bg-black/20">
          <h3 className="font-bold tracking-widest text-exo-text flex items-center gap-2">
            <Plus size={18} className="text-exo-accent" /> INITIALIZE NODE
          </h3>
          <button onClick={onClose} className="text-exo-muted hover:text-white"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-exo-muted uppercase">Session Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Leave blank for auto-generation..." className="w-full bg-black/50 border border-exo-border rounded-lg px-3 py-2 text-sm text-exo-text outline-none focus:border-exo-accent/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-exo-muted uppercase">Select Agent Core</label>
            <div className="grid grid-cols-1 gap-2">
              {sortedPresets.map(preset => (
                <div key={preset.id} onClick={() => { setSelectedPresetId(preset.id); if (preset.agent_type !== 'g045' && selectedProjectIds.length > 1) setSelectedProjectIds([selectedProjectIds[0]]); }}
                  className={`p-3 rounded-lg border cursor-pointer flex justify-between ${parseInt(selectedPresetId) === preset.id ? (preset.agent_type === 'g045' ? 'bg-exo-accent/10 border-exo-accent' : 'bg-white/10 border-white/30') : 'bg-black/30 border-exo-border text-exo-muted'}`}>
                  <div className="flex flex-col">
                    <span className={`text-sm font-bold ${preset.agent_type === 'g045' ? 'text-exo-accent' : 'text-exo-text'}`}>{preset.name}</span>
                    <span className="text-[10px] opacity-70 font-mono">{preset.default_model}</span>
                  </div>
                  {parseInt(selectedPresetId) === preset.id && <Check size={16} className={preset.agent_type === 'g045' ? 'text-exo-accent' : 'text-white'} />}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-exo-muted uppercase">Session Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'chat', label: 'Chat', icon: MessageSquare, desc: 'Conversation mode' },
                { value: 'code', label: 'Code', icon: Code2,         desc: 'Analytic tools on' },
              ].map(({ value, label, icon: Icon, desc }) => (
                <div key={value} onClick={() => setSessionType(value)}
                  className={`p-3 rounded-lg border cursor-pointer flex items-center gap-2 transition-all ${sessionType === value ? 'bg-exo-accent/10 border-exo-accent text-exo-accent' : 'bg-black/30 border-exo-border text-exo-muted hover:border-exo-border/80'}`}>
                  <Icon size={14} />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">{label}</span>
                    <span className="text-[10px] opacity-60">{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-exo-muted uppercase flex justify-between">
              <span>Bind Projects</span><span className="text-[10px] text-exo-accent/70">{isG045 ? 'Cross-Project Allowed' : 'Single Node Lock'}</span>
            </label>
            <div className="max-h-32 overflow-y-auto border border-exo-border rounded-lg bg-black/30 p-1 space-y-1">
              {projects.map(proj => {
                const isSelected = selectedProjectIds.includes(proj.id);
                return (
                  <div key={proj.id} onClick={() => toggleProject(proj.id)} className={`px-3 py-2 rounded text-xs cursor-pointer flex justify-between items-center ${isSelected ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-exo-muted border-transparent'}`}>
                    <div className="flex items-center gap-2"><Folder size={12}/> {proj.name}</div>
                    {isSelected && <Check size={12}/>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-exo-border flex justify-end gap-3 bg-black/40">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-medium text-exo-muted hover:text-white">CANCEL</button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="px-6 py-2 rounded-lg text-xs font-bold bg-exo-accent text-black hover:bg-yellow-400 disabled:opacity-50 flex items-center gap-2">
            {isSubmitting ? <Activity size={14} className="animate-spin" /> : <Plus size={14} />} INITIALIZE
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewSessionModal;
