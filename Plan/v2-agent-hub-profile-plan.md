# V2 Agent Hub & AgentProfile — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign v2 AgentHub cards (anchor ticker + drag-drop + responsive), AgentProfile (profile editing + session list + memory management), and MemoryAnchorTicker (keywords fade-out + weight number + smooth scroll).

**Architecture:** Rewrite three views in `src/layouts/v2/views/` (AgentHub, AgentProfile, new AgentMemory), rewrite `MemoryAnchorTicker` component, extend `MemoryManager` with optional `presetId` prop, and wire new `agent_memory` route in ContentRouter. Reuse existing EditPresetModal, AvatarCropModal, and MemoryManager.

**Tech Stack:** React + Tailwind CSS (exo-* palette), no new dependencies.

---

### File Map

| File | Action | Responsibility |
|---|---|---|
| `src/components/agent/MemoryAnchorTicker.jsx` | Rewrite | Keywords fade-out + weight number + smooth CSS scroll |
| `src/layouts/v2/views/AgentHub.jsx` | Rewrite | Card grid with ticker, drag-drop, responsive, anchor fetching |
| `src/layouts/v2/views/AgentProfile.jsx` | Rewrite | Profile editing + session list + memory button |
| `src/layouts/v2/views/AgentMemory.jsx` | Create | Wrapper for MemoryManager with locked preset_id |
| `src/layouts/v2/ContentRouter.jsx` | Modify | Add `agent_memory` route |
| `src/components/settings/MemoryManager.jsx` | Modify | Add optional `presetId` prop to hide preset selector |

---

### Task 1: Rewrite MemoryAnchorTicker — keywords fade-out + weight number + smooth scroll

**Files:**
- Modify: `src/components/agent/MemoryAnchorTicker.jsx`

- [ ] **Step 1: Replace the entire file with the new implementation**

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { Activity, ShieldAlert } from 'lucide-react';

const MemoryAnchorTicker = ({ anchors = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFading, setIsFading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (anchors.length <= 1) return;
    const timer = setInterval(() => {
      setIsFading(false);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % anchors.length);
        setIsFading(true);
      }, 400);
    }, 8000);
    return () => clearInterval(timer);
  }, [anchors.length]);

  // Reset scroll position on anchor change
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [currentIndex]);

  if (anchors.length === 0) {
    return (
      <div className="h-16 flex items-center justify-center border border-dashed border-exo-mist-10 rounded-[2px] bg-black/20 text-[10px] text-exo-muted/40 font-mono uppercase tracking-widest">
        <Activity size={12} className="mr-2 animate-pulse" /> Core Memory Scan: [NULL]
      </div>
    );
  }

  const anchor = anchors[currentIndex];
  const cleanPattern = anchor.pattern.replace(/[()[\]]/g, "");
  const keywords = cleanPattern.split('|').map(k => k.trim()).filter(Boolean).slice(0, 2);

  return (
    <div className="rounded-[2px] bg-black/40 border border-exo-mist-10 p-4 shadow-inner">
      <div className={`transition-all duration-400 ${isFading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
        {/* Keywords row with fade-out + weight number */}
        <div className="flex items-center gap-0 mb-3">
          {/* Scrollable keywords area */}
          <div className="flex-1 min-w-0 overflow-hidden relative h-6">
            <div className="flex gap-1.5 overflow-x-auto whitespace-nowrap pr-10 h-full items-center"
              style={{ scrollbarWidth: 'none' }}>
              {keywords.map((kw, i) => (
                <span key={i} className={`text-[9px] px-2 py-0.5 rounded-[2px] font-mono font-bold uppercase tracking-widest whitespace-nowrap flex-shrink-0 ${
                  anchor.is_persistent
                    ? 'bg-exo-accent/15 text-exo-accent border border-exo-accent/30'
                    : 'bg-white/5 text-exo-muted border border-exo-mist-10'
                }`}>
                  {kw}
                </span>
              ))}
            </div>
            {/* Fade gradient — no visible dividing line */}
            <div className="absolute right-0 top-0 bottom-0 w-12 pointer-events-none"
              style={{ background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.4))' }} />
          </div>

          {/* Weight badge — pure number, no "W:" prefix */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {anchor.is_persistent && <ShieldAlert size={10} className="text-exo-accent animate-pulse" title="Persistent Weight" />}
            <span className="text-[9px] text-exo-muted font-mono bg-black px-1.5 py-0.5 rounded-[2px] border border-exo-mist-10 font-bold min-w-[34px] text-center">
              {anchor.current_weight.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Essential note — smooth CSS auto-scroll */}
        <div className="h-10 overflow-hidden relative">
          <div ref={scrollRef} className="h-full overflow-hidden">
            <p
              className="text-[11px] text-white/50 leading-relaxed font-mono tracking-tight italic whitespace-pre-wrap"
              style={{
                animation: anchor.essential_note && anchor.essential_note.length > 80
                  ? 'ticker-scroll 8s linear infinite'
                  : 'none',
              }}
            >
              "{anchor.essential_note}"
            </p>
          </div>
        </div>
      </div>

      {/* Inject keyframes for smooth scroll animation */}
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateY(0); }
          90% { transform: translateY(calc(-1 * (100% - 40px))); }
          100% { transform: translateY(calc(-1 * (100% - 40px))); }
        }
      `}</style>
    </div>
  );
};

export default MemoryAnchorTicker;
```

- [ ] **Step 2: Verify build does not break**

Run: `npx vite build --config vite.config.js 2>&1 | tail -5`
Expected: Build completes without errors related to MemoryAnchorTicker.

---

### Task 2: Rewrite AgentHub — cards with ticker, drag-drop, responsive

**Files:**
- Modify: `src/layouts/v2/views/AgentHub.jsx`

- [ ] **Step 1: Replace the entire file with the new AgentHub**

```jsx
import React, { useState, useEffect } from 'react';
import { Star, Zap, Cpu, GripVertical } from 'lucide-react';
import { getAgentAvatarUrl } from '../../../utils/avatar';
import { baseUrl } from '../../../utils/api';
import { getAgentHubOrder, isSuperiorType } from '../../../utils/presets';
import MemoryAnchorTicker from '../../../components/agent/MemoryAnchorTicker';

const SectionHeader = ({ icon: Icon, label, accent }) => (
  <div className="flex items-center gap-2 mb-4">
    <Icon size={14} strokeWidth={1.5} className={accent || 'text-exo-accent'} />
    <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-exo-muted">{label}</span>
    <div className="h-px flex-1 bg-gradient-to-r from-exo-mist-10 to-transparent" />
  </div>
);

const AgentCard = ({ preset, anchors, isG045, isDragging, isDragOver, onClick, onDragStart, onDragEnd, onDragOver, onDrop }) => {
  const avatarUrl = getAgentAvatarUrl(preset.id);
  const showTicker = (isG045 || preset.agent_type === 'superior') && anchors;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`
        group relative flex flex-col p-4 rounded-md border transition-all cursor-pointer select-none
        ${isG045
          ? 'bg-exo-accent/[0.03] border-exo-accent/20 hover:border-exo-accent/40'
          : 'bg-exo-pure border-exo-mist-10 hover:border-exo-mist-20'
        }
        ${isDragging ? 'opacity-40 scale-[0.98]' : ''}
        ${isDragOver ? (isG045 ? 'border-exo-accent shadow-[0_0_20px_rgba(212,175,55,0.1)]' : 'border-white/40') : ''}
      `}
      onClick={() => onClick(preset)}
    >
      {/* Top row: avatar + name + drag handle */}
      <div className="flex items-start gap-3 mb-3">
        <img
          src={avatarUrl}
          className={`w-10 h-10 rounded-md border object-cover bg-exo-pure shrink-0 ${isG045 ? 'border-exo-accent/30' : 'border-exo-mist-10'}`}
          alt={preset.name}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-bold truncate uppercase tracking-tight ${isG045 ? 'text-exo-accent' : 'text-white group-hover:text-exo-accent transition-colors'}`}>
              {preset.name}
            </p>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-[2px] font-mono uppercase tracking-wider flex-shrink-0 ${
              isG045
                ? 'bg-exo-accent/15 text-exo-accent border border-exo-accent/30'
                : preset.agent_type === 'superior'
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            }`}>
              {preset.agent_type}
            </span>
          </div>
          <p className="text-[10px] text-exo-muted/70 italic mt-1 line-clamp-2 leading-relaxed">
            {preset.description || 'No operational context defined.'}
          </p>
        </div>
        {/* Drag handle */}
        <div className="text-exo-muted/20 hover:text-exo-accent/60 transition-colors cursor-grab shrink-0 p-0.5 hidden sm:block" onClick={e => e.stopPropagation()}>
          <GripVertical size={16} strokeWidth={1.5} />
        </div>
      </div>

      {/* Anchor ticker */}
      {showTicker && (
        <div className="mt-auto pt-3 border-t border-exo-mist-10">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-1.5 ${isG045 ? 'text-exo-accent' : 'text-purple-400'}`}>
              <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
              Active Neural Trace
            </span>
            <span className="text-[8px] font-mono text-exo-muted/30 uppercase tracking-tighter">L3 SYNC</span>
          </div>
          <MemoryAnchorTicker anchors={anchors} />
        </div>
      )}
    </div>
  );
};

export default function AgentHub({ appState, setView }) {
  const { presets } = appState;
  const [anchorCache, setAnchorCache] = useState({});
  const [cardOrder, setCardOrder] = useState(() => getAgentHubOrder());
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const applyOrder = (list) =>
    [...list].sort((a, b) => {
      const orderA = cardOrder[a.id] !== undefined ? cardOrder[a.id] : a.id;
      const orderB = cardOrder[b.id] !== undefined ? cardOrder[b.id] : b.id;
      return orderA - orderB;
    });

  const g045Presets = applyOrder(presets.filter(p => p.agent_type === 'g045'));
  const superiorPresets = applyOrder(presets.filter(p => p.agent_type === 'superior'));
  const standardPresets = applyOrder(presets.filter(p => p.agent_type === 'standard' || (!isSuperiorType(p.agent_type))));

  // Fetch anchors for G045 + Superior agents
  useEffect(() => {
    const targets = [...g045Presets, ...superiorPresets];
    targets.forEach(p => {
      if (anchorCache[p.id] !== undefined) return;
      fetch(`${baseUrl}/api/agents/presets/${p.id}/anchors/snapshot/`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => setAnchorCache(prev => ({ ...prev, [p.id]: Array.isArray(data) ? data : [] })))
        .catch(() => setAnchorCache(prev => ({ ...prev, [p.id]: [] })));
    });
  }, [g045Presets.map(p => p.id).join(','), superiorPresets.map(p => p.id).join(',')]);

  const handleDrop = (srcId, dstId, list) => {
    if (srcId === dstId) return;
    const ids = list.map(p => p.id);
    const newIds = [...ids];
    newIds.splice(newIds.indexOf(srcId), 1);
    newIds.splice(newIds.indexOf(dstId), 0, srcId);
    const newOrder = { ...cardOrder };
    newIds.forEach((id, idx) => { newOrder[id] = idx; });
    setCardOrder(newOrder);
    localStorage.setItem('agentHubOrder', JSON.stringify(newOrder));
  };

  const handleAgentClick = (preset) => {
    setView('agent_profile', { agentId: preset.id, agentName: preset.name });
  };

  const renderSection = (list, isG045, accentClass, icon, label) => {
    if (list.length === 0) return null;
    return (
      <section>
        <SectionHeader icon={icon} label={label} accent={accentClass} />
        <div className={`${isG045 ? 'bg-exo-pure border border-exo-accent/15 rounded-md p-4' : ''}`}>
          <div className={`grid gap-3 ${isG045 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
            {list.map(p => (
              <AgentCard
                key={p.id}
                preset={p}
                anchors={anchorCache[p.id] || []}
                isG045={isG045}
                isDragging={dragging === p.id}
                isDragOver={dragOver === p.id && dragging !== p.id}
                onClick={handleAgentClick}
                onDragStart={() => setDragging(p.id)}
                onDragEnd={() => { setDragging(null); setDragOver(null); }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(p.id); }}
                onDrop={() => { handleDrop(dragging, p.id, list); setDragging(null); setDragOver(null); }}
              />
            ))}
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-exo-bg scrollbar-hide">
      <div className="max-w-5xl mx-auto px-4 md:px-12 py-8 md:py-12 space-y-10">
        {renderSection(g045Presets, true, 'text-exo-accent', Star, 'G045 Superior Core')}
        {renderSection(superiorPresets, false, 'text-purple-400', Zap, 'Superior Agents')}
        {renderSection(standardPresets, false, 'text-blue-400', Cpu, 'Standard Agents')}

        {presets.length === 0 && (
          <div className="text-center py-20 text-exo-muted">
            <p className="font-mono text-sm">No agents configured</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx vite build --config vite.config.js 2>&1 | tail -5`
Expected: Build completes without errors.

---

### Task 3: Rewrite AgentProfile — profile editing + session list + memory button

**Files:**
- Modify: `src/layouts/v2/views/AgentProfile.jsx`

- [ ] **Step 1: Replace the entire file**

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MessageSquare, Plus, Pencil } from 'lucide-react';
import { getAgentAvatarUrl } from '../../../utils/avatar';
import { baseUrl, getCsrfToken, AVAILABLE_MODELS } from '../../../utils/api';
import EditPresetModal from '../../../components/modals/EditPresetModal';
import AvatarCropModal from '../../../components/modals/AvatarCropModal';

export default function AgentProfile({ appState, setView, viewParams }) {
  const { presets, setActiveSessionId, openNewSession, refreshKey, refreshPresets } = appState;
  const preset = presets.find(p => p.id === viewParams.agentId);
  const [sessions, setSessions] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState(() => getAgentAvatarUrl(viewParams.agentId));
  const [cropFile, setCropFile] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const avatarInputRef = useRef(null);

  // Inline editing state
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [savingField, setSavingField] = useState(null);

  const hasMemory = preset && (preset.agent_type === 'g045' || preset.agent_type === 'superior');

  // Fetch sessions for this agent
  useEffect(() => {
    if (!preset) return;
    fetch(`${baseUrl}/api/agents/conversations/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        const agentSessions = (Array.isArray(data) ? data : [])
          .filter(c => c.agent_preset_id === preset.id)
          .sort((a, b) => new Date(b.last_message_at || b.created_at) - new Date(a.last_message_at || a.created_at));
        setSessions(agentSessions);
      })
      .catch(() => setSessions([]));
  }, [preset, refreshKey]);

  // Sync inline edit drafts when preset changes
  useEffect(() => {
    if (preset) {
      setNameDraft(preset.name || '');
      setDescDraft(preset.description || '');
      setAvatarUrl(getAgentAvatarUrl(preset.id));
    }
  }, [preset?.id]);

  if (!preset) {
    return (
      <div className="flex-1 flex items-center justify-center text-exo-muted">
        <p className="font-mono text-sm">Agent not found</p>
      </div>
    );
  }

  const patchPreset = async (fields) => {
    setSavingField(true);
    try {
      await fetch(`${baseUrl}/api/agents/presets/${preset.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify(fields),
      });
      refreshPresets();
    } catch (e) {
      console.error('Failed to save', e);
    } finally {
      setSavingField(false);
    }
  };

  const handleNameBlur = () => {
    setEditingName(false);
    if (nameDraft.trim() && nameDraft !== preset.name) {
      patchPreset({ name: nameDraft.trim() });
    }
  };

  const handleDescBlur = () => {
    setEditingDesc(false);
    if (descDraft !== (preset.description || '')) {
      patchPreset({ description: descDraft });
    }
  };

  const handleModelChange = (e) => {
    patchPreset({ default_model: e.target.value });
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropFile(file);
    e.target.value = '';
  };

  const handleSessionClick = (session) => {
    setActiveSessionId(session.id);
    setView('chat', { sessionId: session.id, agentId: preset.id, agentName: preset.name, sessionTitle: session.name });
  };

  const typeBadgeClass = preset.agent_type === 'g045'
    ? 'bg-exo-accent/15 text-exo-accent border border-exo-accent/30'
    : preset.agent_type === 'superior'
      ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
      : 'bg-blue-500/10 text-blue-400 border border-blue-500/20';

  return (
    <div className="flex-1 h-full flex flex-col bg-exo-bg">
      {cropFile && (
        <AvatarCropModal
          file={cropFile}
          onConfirm={(dataUrl) => {
            localStorage.setItem(`exo_agent_avatar_${preset.id}`, dataUrl);
            setAvatarUrl(dataUrl);
            setCropFile(null);
          }}
          onCancel={() => setCropFile(null)}
        />
      )}

      <EditPresetModal
        isOpen={!!editTarget}
        preset={editTarget || preset}
        onClose={() => setEditTarget(null)}
        onSaved={() => { refreshPresets(); setEditTarget(null); }}
      />

      {/* === Upper: Profile Editing Area === */}
      <div className="flex-shrink-0 border-b border-exo-mist-8 px-4 md:px-12 py-6">
        <div className="flex items-start gap-4 md:gap-6">
          {/* Back button */}
          <button onClick={() => setView('agent_hub')} className="p-1.5 text-exo-muted hover:text-exo-accent transition-colors mt-3">
            <ArrowLeft size={18} strokeWidth={1.5} />
          </button>

          {/* Avatar — click to change */}
          <div
            className="relative shrink-0 cursor-pointer group/avatar"
            onClick={() => avatarInputRef.current?.click()}
          >
            <img
              src={avatarUrl}
              className={`w-16 h-16 md:w-[72px] md:h-[72px] rounded-md border object-cover bg-exo-pure transition-transform group-hover/avatar:scale-105 ${preset.agent_type === 'g045' ? 'border-exo-accent/40' : 'border-exo-mist-10'}`}
              alt={preset.name}
            />
            <div className="absolute inset-0 rounded-md bg-black/60 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity">
              <Pencil size={16} className="text-white" />
            </div>
            <input type="file" ref={avatarInputRef} accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          {/* Name + Description + Model */}
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            {/* Name — inline edit */}
            {editingName ? (
              <input
                autoFocus
                value={nameDraft}
                onChange={e => setNameDraft(e.target.value)}
                onBlur={handleNameBlur}
                onKeyDown={e => { if (e.key === 'Enter') handleNameBlur(); if (e.key === 'Escape') { setNameDraft(preset.name); setEditingName(false); } }}
                className="bg-transparent border-b border-exo-accent text-white text-lg font-bold font-mono uppercase tracking-tight outline-none px-0 py-0 w-full"
              />
            ) : (
              <div className="flex items-center gap-2">
                <h2
                  className="text-lg font-bold text-white font-mono uppercase tracking-tight cursor-pointer border-b border-transparent hover:border-exo-accent/40 transition-colors"
                  onClick={() => { setNameDraft(preset.name || ''); setEditingName(true); }}
                >
                  {preset.name}
                </h2>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-[2px] font-mono uppercase tracking-wider flex-shrink-0 ${typeBadgeClass}`}>
                  {preset.agent_type}
                </span>
              </div>
            )}

            {/* Description — inline edit, one-line */}
            {editingDesc ? (
              <input
                autoFocus
                value={descDraft}
                onChange={e => setDescDraft(e.target.value)}
                onBlur={handleDescBlur}
                onKeyDown={e => { if (e.key === 'Enter') handleDescBlur(); if (e.key === 'Escape') { setDescDraft(preset.description || ''); setEditingDesc(false); } }}
                placeholder="Add a description..."
                className="bg-transparent border-b border-exo-accent text-exo-muted text-xs font-mono italic outline-none px-0 py-0 w-full"
              />
            ) : (
              <p
                className="text-xs text-exo-muted italic cursor-pointer border-b border-transparent hover:border-exo-accent/40 transition-colors"
                onClick={() => { setDescDraft(preset.description || ''); setEditingDesc(true); }}
              >
                {preset.description || 'Click to add description...'}
              </p>
            )}

            {/* Model selector */}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] text-exo-muted font-mono uppercase tracking-wider">Model</span>
              <select
                value={preset.default_model || ''}
                onChange={handleModelChange}
                disabled={savingField}
                className="bg-exo-pure border border-exo-mist-10 rounded-[2px] text-[10px] text-exo-text font-mono px-2 py-1 outline-none focus:border-exo-accent/40 cursor-pointer"
              >
                {AVAILABLE_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={() => openNewSession({ presetId: preset.id })}
              className="flex items-center gap-2 px-4 py-2 bg-exo-accent/10 border border-exo-accent/30 rounded-md text-exo-accent text-xs font-medium hover:bg-exo-accent/20 active:scale-95 transition-all whitespace-nowrap"
            >
              <Plus size={14} strokeWidth={1.5} />
              New Session
            </button>
            {hasMemory && (
              <button
                onClick={() => setView('agent_memory', { agentId: preset.id, agentName: preset.name })}
                className="px-4 py-2 text-exo-muted hover:text-white border border-exo-mist-10 rounded-md text-xs font-medium hover:bg-white/5 active:scale-95 transition-all whitespace-nowrap"
              >
                Manage Memory &rarr;
              </button>
            )}
          </div>
        </div>

        {/* System Prompt bar — click to open EditPresetModal */}
        <div
          onClick={() => setEditTarget(preset)}
          className="mt-4 border border-exo-mist-10 rounded-md px-4 py-2.5 bg-exo-pure cursor-pointer hover:border-exo-accent/30 transition-all flex items-center justify-between group"
        >
          <div className="flex-1 min-w-0">
            <span className="text-[9px] text-exo-muted font-mono uppercase tracking-[0.15em]">System Prompt</span>
            <p className="text-[10px] text-exo-muted/60 truncate mt-0.5">
              {preset.system_prompt || 'No system prompt configured.'}
            </p>
          </div>
          <span className="text-exo-accent/60 text-[10px] flex-shrink-0 ml-3 group-hover:text-exo-accent transition-colors">
            Click to edit &#9998;
          </span>
        </div>
      </div>

      {/* === Lower: Sessions List === */}
      <div className="flex-1 overflow-y-auto px-4 md:px-12 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-exo-muted">Sessions</p>
          {sessions.length > 0 && (
            <span className="text-[9px] text-exo-muted font-mono">{sessions.length} total</span>
          )}
        </div>

        {sessions.length === 0 ? (
          <p className="text-xs text-exo-muted py-8 text-center">No sessions yet. Create one with "New Session".</p>
        ) : (
          <div className="space-y-1.5">
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => handleSessionClick(s)}
                className="group flex items-center gap-3 w-full p-3 bg-exo-pure border border-exo-mist-8 rounded-md hover:border-exo-accent/30 transition-all text-left"
              >
                <div className="p-2 rounded-md bg-exo-accent/5 border border-exo-mist-10 text-exo-accent group-hover:shadow-[0_0_10px_rgba(212,175,55,0.1)] transition-all">
                  <MessageSquare size={14} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{s.name || `Session #${s.id}`}</p>
                  <p className="text-[9px] text-exo-muted mt-0.5">
                    {s.last_message_at ? `Last active: ${new Date(s.last_message_at).toLocaleDateString()}` : 'No messages yet'}
                    {s.message_count != null ? ` · ${s.message_count} msgs` : ''}
                  </p>
                </div>
                <span className="text-exo-muted/30 text-xs group-hover:text-exo-accent/60 transition-colors">&rarr;</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx vite build --config vite.config.js 2>&1 | tail -5`
Expected: Build completes without errors.

---

### Task 4: Extend MemoryManager — add optional presetId prop

**Files:**
- Modify: `src/components/settings/MemoryManager.jsx:6-35`

- [ ] **Step 1: Add presetId prop and conditional behavior**

In `MemoryManager.jsx`, change the function signature from:
```jsx
const MemoryManager = ({ presets, openDestructor }) => {
```
to:
```jsx
const MemoryManager = ({ presets, openDestructor, presetId }) => {
```

- [ ] **Step 2: Initialize selectedPresetId from presetId prop**

Change the line (currently around line 9-10):
```jsx
const sorted = sortPresets(presets);
const [selectedPresetId, setSelectedPresetId] = useState(sorted[0]?.id || null);
```
to:
```jsx
const sorted = sortPresets(presets);
const [selectedPresetId, setSelectedPresetId] = useState(presetId || sorted[0]?.id || null);
```

- [ ] **Step 3: When presetId is provided, keep selectedPresetId in sync**

Add this useEffect after the useState declarations (around line 12):
```jsx
useEffect(() => {
  if (presetId) {
    setSelectedPresetId(presetId);
  }
}, [presetId]);
```

- [ ] **Step 4: Conditionally hide the preset selector**

Find the preset selector `<select>` in the JSX (around lines 186-199 in the filter bar). Wrap it in a conditional:

```jsx
{!presetId && (
  <select
    className="bg-exo-pure border border-exo-mist-10 rounded-[2px] text-[10px] text-exo-text font-mono px-2 py-1.5 outline-none focus:border-exo-accent/40"
    value={selectedPresetId || ''}
    onChange={e => setSelectedPresetId(e.target.value ? Number(e.target.value) : null)}
  >
    <option value="">All Presets</option>
    {sorted.map(p => (
      <option key={p.id} value={p.id}>{p.name}</option>
    ))}
  </select>
)}
```

When `presetId` is provided, show a static label instead:
```jsx
{presetId && (
  <span className="text-[10px] text-exo-muted font-mono uppercase tracking-wider px-2">
    {sorted.find(p => p.id === presetId)?.name || `Preset #${presetId}`}
  </span>
)}
```

- [ ] **Step 5: Verify no regression in SettingsPanel**

Run: `npx vite build --config vite.config.js 2>&1 | tail -5`
Check that SettingsPanel (which uses MemoryManager without `presetId`) still renders correctly.

---

### Task 5: Create AgentMemory view

**Files:**
- Create: `src/layouts/v2/views/AgentMemory.jsx`

- [ ] **Step 1: Create the wrapper component**

```jsx
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import MemoryManager from '../../../components/settings/MemoryManager';

export default function AgentMemory({ appState, setView, viewParams }) {
  const { presets, openDestructor } = appState;
  const preset = presets.find(p => p.id === viewParams.agentId);

  return (
    <div className="flex-1 h-full flex flex-col bg-exo-bg">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-exo-mist-8 px-4 md:px-12 py-4 flex items-center gap-4">
        <button onClick={() => setView('agent_profile', { agentId: viewParams.agentId, agentName: viewParams.agentName })} className="p-1.5 text-exo-muted hover:text-exo-accent transition-colors">
          <ArrowLeft size={18} strokeWidth={1.5} />
        </button>
        <div>
          <p className="text-sm font-medium text-white">{preset?.name || 'Agent'}</p>
          <p className="text-[10px] text-exo-muted uppercase tracking-wider">Memory Management</p>
        </div>
      </div>

      {/* MemoryManager locked to this preset */}
      <div className="flex-1 overflow-hidden">
        <MemoryManager presets={presets} openDestructor={openDestructor} presetId={viewParams.agentId} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx vite build --config vite.config.js 2>&1 | tail -5`
Expected: Build completes without errors.

---

### Task 6: Update ContentRouter — add agent_memory route

**Files:**
- Modify: `src/layouts/v2/ContentRouter.jsx`

- [ ] **Step 1: Add import**

Add after the `AgentProfile` import (line 4):
```jsx
import AgentMemory from './views/AgentMemory';
```

- [ ] **Step 2: Add case in switch**

Add after the `agent_profile` case block:
```jsx
case 'agent_memory':
  return <AgentMemory appState={appState} setView={setView} viewParams={viewParams} />;
```

- [ ] **Step 3: Verify build**

Run: `npx vite build --config vite.config.js 2>&1 | tail -5`
Expected: Build completes without errors.

---

### Task 7: Integration QA

- [ ] **Step 1: Start dev server**

Run: `npm run dev` (keep running in background)

- [ ] **Step 2: Verify Agent Hub renders**

- Navigate to v2 layout, click "Agent Hub" in sidebar
- Verify three sections render: G045 (gold border), Superior (purple header), Standard (blue header)
- Verify G045 and Superior cards show anchor ticker with keywords + weight number
- Verify keywords fade-out on right edge (no visible dividing line)
- Verify Standard cards show NO ticker
- Verify drag-and-drop works (reorder within section, order persists on reload)
- Verify clicking a card navigates to AgentProfile

- [ ] **Step 3: Verify AgentProfile renders**

- Verify avatar, name, description, model dropdown all visible
- Click name → inline edit mode, border turns gold, blur saves
- Click description → inline edit mode, same behavior
- Change model dropdown → auto-saves
- Click "System Prompt" bar → EditPresetModal opens with all fields
- Click avatar → file picker → AvatarCropModal
- Verify "New Session" button works
- Verify "Manage Memory" button visible only for G045/Superior
- Verify sessions list shows below profile area
- Click a session → navigates to chat

- [ ] **Step 4: Verify AgentMemory page**

- Click "Manage Memory" from AgentProfile of a G045 agent
- Verify header shows agent name + "Memory Management"
- Verify preset selector is hidden (locked to this agent)
- Verify CRUD operations work (create/edit/delete memory entries)
- Click back arrow → returns to AgentProfile

- [ ] **Step 5: Mobile responsive check**

- Resize browser to <768px: verify cards stack in 1 column
- Verify drag handles hidden on mobile
- Verify Profile area stacks vertically (avatar top, actions below)
- Verify anchor ticker shows only keywords row (no essential_note on <768px)
