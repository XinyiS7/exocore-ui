import React, { useState, useEffect } from 'react';
import { ArrowLeft, Activity, Save } from 'lucide-react';
import { baseUrl, getCsrfToken } from '../../utils/api';

const ProposalEditPanel = ({ proposal, conversationName, conversationId, onBack }) => {
  const [content, setContent] = useState(proposal?.content || '');
  const [keywords, setKeywords] = useState(
    Array.isArray(proposal?.keywords) ? proposal.keywords.join(', ') : (proposal?.keywords || '')
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [originalMessages, setOriginalMessages] = useState(null);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);

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
      const res = await fetch(`${baseUrl}/api/memory/proposals/${proposal.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify({
          content,
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
        }),
      });
      const json = await res.json();
      setSaveMsg(json.msg || (res.ok ? '保存成功' : '保存失败'));
    } catch {
      setSaveMsg('网络错误');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-exo-border shrink-0">
        <button onClick={onBack} className="p-1.5 text-exo-muted hover:text-white transition-colors rounded hover:bg-white/5">
          <ArrowLeft size={16} />
        </button>
        <div className="flex flex-col overflow-hidden">
          <span className="text-sm font-semibold text-exo-text">编辑摘要</span>
          <span className="text-[10px] text-exo-muted truncate">{conversationName}</span>
        </div>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-4 border-b md:border-b-0 md:border-r border-exo-border">
          <div>
            <label className="block text-[10px] font-bold text-exo-muted uppercase tracking-widest mb-1">摘要内容</label>
            <textarea
              rows={8}
              className="w-full bg-black border border-exo-border rounded-lg px-3 py-2 text-sm text-exo-text focus:outline-none focus:border-exo-gold/50 resize-none transition-colors"
              value={content}
              onChange={e => setContent(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-exo-muted uppercase tracking-widest mb-1">关键词（逗号分隔）</label>
            <input
              className="w-full bg-black border border-exo-border rounded-lg px-3 py-2 text-sm text-exo-text focus:outline-none focus:border-exo-gold/50 transition-colors"
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {keywords.split(',').map(k => k.trim()).filter(Boolean).map((kw, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-exo-gold/10 border border-exo-gold/20 text-exo-gold/80">{kw}</span>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            {saveMsg ? <span className="text-xs text-exo-gold/80">{saveMsg}</span> : <span />}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 bg-exo-gold/10 text-exo-gold hover:bg-exo-gold hover:text-black border border-exo-gold/30 rounded-lg text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isSaving ? <Activity size={14} className="animate-spin" /> : <Save size={14} />}
              {isSaving ? 'SAVING...' : 'SAVE'}
            </button>
          </div>
        </div>
        <div className="flex-1 min-w-0 overflow-y-auto p-4">
          <div className="text-[10px] font-bold text-exo-muted uppercase tracking-widest mb-3">
            原始消息片段 ({proposal?.start_index ?? '?'} – {proposal?.end_index ?? '?'})
          </div>
          {isLoadingMsgs ? (
            <div className="text-center py-8 text-exo-muted text-sm">加载中...</div>
          ) : originalMessages?.length ? (
            <div className="space-y-3">
              {originalMessages.map((msg, i) => (
                <div key={i} className={`flex flex-col gap-0.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className="text-[9px] text-exo-muted/60 px-1 uppercase">{msg.role}</span>
                  <div className={`max-w-[90%] px-3 py-2 rounded-lg text-xs leading-relaxed ${msg.role === 'user' ? 'bg-exo-gold/10 text-exo-text border border-exo-gold/20' : 'bg-white/5 text-exo-muted border border-white/10'}`}>
                    {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-exo-muted/50 text-xs">暂无原始消息数据</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProposalEditPanel;
