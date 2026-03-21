import React, { useState, useEffect } from 'react';
import { Edit3, X, Activity, Save } from 'lucide-react';
import { baseUrl, getCsrfToken, AVAILABLE_MODELS } from '../../utils/api';

const EditPresetModal = ({ isOpen, onClose, preset, onSaved }) => {
  const [form, setForm] = useState({ name: '', description: '', default_model: '', system_prompt: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (preset) {
      setForm({
        name: preset.name || '',
        description: preset.description || '',
        default_model: preset.default_model || '',
        system_prompt: preset.system_prompt || '',
      });
    }
  }, [preset]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${baseUrl}/api/agents/presets/${preset.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      if (res.ok) {
        onSaved();
        onClose();
      } else {
        alert('保存失败，请检查后端接口。');
      }
    } catch (err) {
      console.error('Preset 保存失败', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-exo-panel border border-exo-border rounded-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-exo-border">
          <div className="flex items-center gap-3">
            <Edit3 size={18} className="text-exo-gold" />
            <h2 className="text-base font-bold text-exo-text">
              Edit Core: <span className="text-exo-gold">{preset?.name}</span>
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-exo-muted hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5 flex-1">
          <div>
            <label className="block text-[10px] font-bold text-exo-muted uppercase tracking-widest mb-1.5">Name</label>
            <input
              className="w-full bg-black border border-exo-border rounded-lg px-3 py-2 text-sm text-exo-text focus:outline-none focus:border-exo-gold/50 transition-colors"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-exo-muted uppercase tracking-widest mb-1.5">Description</label>
            <textarea
              rows={2}
              className="w-full bg-black border border-exo-border rounded-lg px-3 py-2 text-sm text-exo-text focus:outline-none focus:border-exo-gold/50 transition-colors resize-none"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-exo-muted uppercase tracking-widest mb-1.5">Default Model</label>
            <select
              className="w-full bg-black border border-exo-border rounded-lg px-3 py-2 text-sm text-exo-text focus:outline-none focus:border-exo-gold/50 transition-colors"
              value={form.default_model}
              onChange={e => setForm(p => ({ ...p, default_model: e.target.value }))}
            >
              {AVAILABLE_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-exo-muted uppercase tracking-widest mb-1.5">System Prompt</label>
            <textarea
              rows={12}
              className="w-full bg-black border border-exo-border rounded-lg px-3 py-2 text-sm text-exo-text focus:outline-none focus:border-exo-gold/50 transition-colors resize-y font-mono leading-relaxed"
              value={form.system_prompt}
              onChange={e => setForm(p => ({ ...p, system_prompt: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-exo-border">
          <button onClick={onClose} className="px-4 py-2 text-sm text-exo-muted hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 bg-exo-gold/10 text-exo-gold hover:bg-exo-gold hover:text-black border border-exo-gold/30 rounded-lg text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {isSaving ? <Activity size={14} className="animate-spin" /> : <Save size={14} />}
            {isSaving ? 'SAVING...' : 'SAVE CORE'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditPresetModal;
