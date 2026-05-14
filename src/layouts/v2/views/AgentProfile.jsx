import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageSquare, Plus, ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import { getAgentAvatarUrl } from '../../../utils/avatar';
import { baseUrl, getCsrfToken } from '../../../utils/api';

export default function AgentProfile({ appState, setView, viewParams }) {
  const { presets, setActiveSessionId, openNewSession, refreshKey, refreshPresets } = appState;
  const preset = presets.find(p => p.id === viewParams.agentId);
  const [anchors, setAnchors] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [showPrompt, setShowPrompt] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!preset) return;

    fetch(`${baseUrl}/api/agents/presets/${preset.id}/anchors/snapshot/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setAnchors(Array.isArray(data) ? data : []))
      .catch(() => setAnchors([]));

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

  // Sync prompt text when preset changes
  useEffect(() => {
    if (preset) {
      setPromptText(preset.system_prompt || '');
    }
  }, [preset?.id]);

  if (!preset) {
    return (
      <div className="flex-1 flex items-center justify-center text-exo-muted">
        <p className="font-mono text-sm">Agent not found</p>
      </div>
    );
  }

  const avatarUrl = getAgentAvatarUrl(preset.id);

  const handleSessionClick = (session) => {
    setActiveSessionId(session.id);
    setView('chat', { sessionId: session.id, agentId: preset.id, agentName: preset.name, sessionTitle: session.name });
  };

  const handleSavePrompt = async () => {
    setSaving(true);
    try {
      await fetch(`${baseUrl}/api/agents/presets/${preset.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify({ system_prompt: promptText }),
      });
      refreshPresets();
      setEditingPrompt(false);
    } catch (e) {
      console.error('Failed to save system prompt', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-exo-bg">
      {/* Meta Header */}
      <div className="flex-shrink-0 border-b border-exo-mist-8 px-6 md:px-12 py-4 flex items-center gap-4">
        <button onClick={() => setView('agent_hub')} className="p-1.5 text-exo-muted hover:text-exo-accent transition-colors">
          <ArrowLeft size={18} strokeWidth={1.5} />
        </button>
        <img src={avatarUrl} className="w-9 h-9 rounded-md border border-exo-mist-10 object-cover bg-exo-pure" alt={preset.name} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{preset.name}</p>
          <p className="text-[10px] text-exo-muted uppercase tracking-wider">{preset.agent_type}</p>
        </div>
        <button
          onClick={() => openNewSession({ presetId: preset.id })}
          className="flex items-center gap-2 px-4 py-2 bg-exo-accent/10 border border-exo-accent/30 rounded-md text-exo-accent text-xs font-medium hover:bg-exo-accent/20 active:scale-95 transition-all"
        >
          <Plus size={14} strokeWidth={1.5} />
          New Session
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Description & System Prompt Section */}
        <div className="px-6 md:px-12 py-4 border-b border-exo-mist-6 space-y-3">
          {preset.description && (
            <p className="text-sm text-exo-muted">{preset.description}</p>
          )}

          {/* System Prompt — collapsible */}
          <div>
            <button
              onClick={() => setShowPrompt(!showPrompt)}
              className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.3em] text-exo-muted hover:text-exo-accent transition-colors"
            >
              {showPrompt ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              System Prompt
            </button>
            {showPrompt && (
              <div className="mt-2">
                {editingPrompt ? (
                  <div className="space-y-3">
                    <textarea
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      rows={6}
                      className="w-full bg-exo-pure border border-exo-mist-8 rounded-md p-3 text-xs text-exo-text font-mono outline-none focus:border-exo-accent/40 transition-colors resize-y"
                      placeholder="Enter system prompt..."
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSavePrompt}
                        disabled={saving}
                        className="px-3 py-1.5 bg-exo-accent/10 border border-exo-accent/30 rounded text-exo-accent text-[10px] font-medium hover:bg-exo-accent/20 disabled:opacity-50 transition-all"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => { setEditingPrompt(false); setPromptText(preset.system_prompt || ''); }}
                        className="px-3 py-1.5 text-[10px] text-exo-muted hover:text-exo-text transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setEditingPrompt(true)}
                    className="group cursor-pointer bg-exo-pure border border-exo-mist-8 rounded-md p-3 hover:border-exo-accent/30 transition-all"
                  >
                    <p className="text-xs text-exo-text/80 whitespace-pre-wrap line-clamp-4">
                      {promptText || 'No system prompt configured. Click to add.'}
                    </p>
                    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Pencil size={10} className="text-exo-accent/60" />
                      <span className="text-[9px] text-exo-accent/60">Click to edit</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Split View */}
        <div className="flex flex-col md:flex-row">
          {/* Left: Memory Anchors */}
          <div className="w-full md:w-[35%] lg:w-[30%] border-b md:border-b-0 md:border-r border-exo-mist-8 overflow-y-auto p-4 space-y-3">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-exo-muted px-2">Memory Anchors</p>
            {anchors.length === 0 ? (
              <p className="text-xs text-exo-muted px-2">No anchors captured yet.</p>
            ) : (
              anchors.map(a => (
                <div key={a.id} className="p-3 bg-exo-pure border border-exo-mist-8 rounded-md">
                  <p className="text-xs text-exo-text line-clamp-3">{a.content}</p>
                  {a.tags && a.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {a.tags.map(t => (
                        <span key={t} className="text-[9px] px-1.5 py-0.5 bg-exo-accent/10 text-exo-accent rounded">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Right: Session Timeline */}
          <div className="flex-1 p-4">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-exo-muted mb-3">Sessions</p>
            {sessions.length === 0 ? (
              <p className="text-xs text-exo-muted">No sessions yet.</p>
            ) : (
              <div className="space-y-2">
                {sessions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleSessionClick(s)}
                    className="group flex items-center gap-3 w-full p-3 bg-exo-pure border border-exo-mist-8 rounded-md hover:border-exo-accent/30 transition-all text-left"
                  >
                    <div className="p-2 rounded-md bg-exo-accent/5 border border-exo-mist-10 text-exo-accent group-hover:shadow-glow-gold transition-all">
                      <MessageSquare size={14} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{s.name || `Session #${s.id}`}</p>
                      <p className="text-[9px] text-exo-muted mt-0.5">{s.agent_type || 'chat'}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
