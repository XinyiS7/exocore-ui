import React, { useState, useEffect } from 'react';
import { ArrowLeft, Activity, Save, Database, History } from 'lucide-react';
import { baseUrl, getCsrfToken } from '../../utils/api';

const ProposalEditPanel = ({ proposal, conversationName, conversationId, onBack }) => {
  const [content, setContent] = useState(proposal?.summary || '');
  const [keywords, setKeywords] = useState(
    Array.isArray(proposal?.keywords) ? proposal.keywords.join(', ') : (proposal?.keywords || '')
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [originalMessages, setOriginalMessages] = useState(null);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);

  // 拉取 history_chunk 详情以获取 raw_text（比列表里的 summary 更完整）
  useEffect(() => {
    if (!proposal?.id) return;
    fetch(`${baseUrl}/api/memory/history_chunks/${proposal.id}/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.raw_text) setContent(data.raw_text);
        if (data.keywords) setKeywords(Array.isArray(data.keywords) ? data.keywords.join(', ') : data.keywords);
      })
      .catch(err => console.error('history_chunk 详情加载失败', err));
  }, [proposal?.id]);

  useEffect(() => {
    if (!proposal || conversationId == null) return;
    setIsLoadingMsgs(true);
    fetch(`${baseUrl}/api/agents/chat/${conversationId}/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        const msgs = Array.isArray(data) ? data : (data.messages || data.data || []);
        const start = proposal.start_index ?? 0;
        const end = proposal.end_index ?? msgs.length - 1;
        setOriginalMessages(msgs.slice(start, end + 1));
      })
      .catch(err => console.error('原始消息加载失败', err))
      .finally(() => setIsLoadingMsgs(false));
  }, [proposal, conversationId]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch(`${baseUrl}/api/memory/history_chunks/${proposal.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify({
          raw_text: content,
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
        }),
      });
      const json = await res.json();
      setSaveMsg(json.msg || (res.ok ? 'SUCCESS' : 'FAILURE'));
    } catch {
      setSaveMsg('NETWORK_ERROR');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-exo-bg bg-noise animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 h-16 border-b border-exo-mist-10 bg-exo-pure/40 backdrop-blur-md shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 text-exo-muted hover:text-white transition-all hover:bg-white/5 rounded-[2px]">
          <ArrowLeft size={18} />
        </button>
        <div className="flex flex-col overflow-hidden">
          <div className="flex items-center gap-2">
            <Database size={14} className="text-exo-accent" />
            <span className="text-[13px] font-bold text-white uppercase tracking-[0.2em] font-display">Refine Neural Summary / 摘要优化</span>
          </div>
          <span className="text-[9px] text-exo-muted font-mono uppercase tracking-widest opacity-40 mt-0.5 truncate">
            Source: {conversationName}{proposal?.topic ? ` · ${proposal.topic}` : ''}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Left: Edit Form */}
        <div className="flex-1 min-w-0 overflow-y-auto p-6 space-y-8 border-b md:border-b-0 md:border-r border-exo-mist-10 scrollbar-hide">
          <div className="space-y-3">
            <label className="label-caps opacity-50">Abstract Content / 摘要内容</label>
            <textarea
              rows={10}
              className="w-full bg-black/60 border border-exo-mist-10 rounded-[2px] px-5 py-4 text-[14px] text-white font-mono focus:border-exo-accent/40 outline-none transition-all resize-none leading-relaxed"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="INPUT CONSOLIDATED PERSPECTIVE..."
            />
          </div>

          <div className="space-y-3">
            <label className="label-caps opacity-50">Taxonomy Tags / 关键词 (COMMA SEPARATED)</label>
            <input
              className="w-full bg-black/60 border border-exo-mist-10 rounded-[2px] px-5 py-2.5 text-sm text-white font-mono focus:border-exo-accent/40 outline-none transition-all uppercase placeholder:opacity-20"
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              placeholder="EG: ARCHITECTURE, DESIGN, VOID..."
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {keywords.split(',').map(k => k.trim()).filter(Boolean).map((kw, i) => (
                <span key={i} className="text-[9px] font-bold px-2 py-0.5 rounded-[2px] bg-exo-accent/5 border border-exo-accent/20 text-exo-accent/70 uppercase tracking-tighter">{kw}</span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-exo-mist-6">
            <div className="flex-1">
              {saveMsg && (
                <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${saveMsg.includes('SUCCESS') ? 'text-exo-accent' : 'text-red-500'}`}>
                  &gt;&gt; STATUS: {saveMsg}
                </span>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-8 py-2 bg-white text-exo-pure rounded-[2px] text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-exo-accent transition-all shadow-brutalist active:scale-95 disabled:opacity-30 flex items-center gap-3"
            >
              {isSaving ? <Activity size={14} className="animate-spin" /> : <Save size={14} />}
              {isSaving ? 'COMMITTING...' : 'COMMIT TO CORE'}
            </button>
          </div>
        </div>

        {/* Right: Original Context */}
        <div className="flex-1 min-w-0 overflow-y-auto p-6 bg-black/20 scrollbar-hide">
          <div className="flex items-center gap-2 mb-6 opacity-40">
            <History size={14} />
            <h3 className="text-[10px] font-bold text-white uppercase tracking-[0.2em] font-mono">
              Neural Trace Context ({proposal?.start_index ?? '?'} – {proposal?.end_index ?? '?'})
            </h3>
          </div>

          {isLoadingMsgs ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-30">
              <Activity size={24} className="animate-spin mb-4" />
              <span className="text-[10px] font-mono uppercase tracking-widest">Reconstructing Stream...</span>
            </div>
          ) : originalMessages?.length ? (
            <div className="space-y-6">
              {originalMessages.map((msg, i) => (
                <div key={i} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 px-1 opacity-40">
                    <span className="text-[9px] font-bold uppercase font-mono tracking-tighter">{msg.role}</span>
                    <div className="w-1 h-1 rounded-full bg-white" />
                  </div>
                  <div className={`
                    max-w-[92%] px-4 py-3 rounded-[2px] text-[13px] font-mono tracking-tight leading-relaxed border
                    ${msg.role === 'user' 
                      ? 'bg-white text-exo-pure border-white shadow-brutalist' 
                      : 'bg-exo-pure text-white/80 border-exo-mist-10'
                    }
                  `}>
                    {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-20 opacity-20 italic">
              <span className="text-[10px] font-mono uppercase tracking-widest">Trace data unavailable</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProposalEditPanel;
