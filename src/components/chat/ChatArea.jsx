import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Menu, Save, Plus, RefreshCw, X, FileText,
  Paperclip, Send, Cpu, Activity, Files
} from 'lucide-react';
import { baseUrl, getCsrfToken, AVAILABLE_MODELS } from '../../utils/api';
import { getUserAvatarUrl, getAgentAvatarUrl } from '../../utils/avatar';
import { filesToAttachmentData, saveAttachments, enrichMessages } from '../../utils/attachmentStorage';
import MessageBubble from './MessageBubble';

const MSGS_PER_PAGE = 40;

const ChatArea = ({ activeSessionId, setShowConvList, openNewSession, presets }) => {
  const [messages, setMessages] = useState([]);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [thinkingLevel, setThinkingLevel] = useState("auto");
  const [temperature, setTemperature] = useState(1.0);
  const [currentModel, setCurrentModel] = useState("");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [attachedFilePreviews, setAttachedFilePreviews] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastTelemetry, setLastTelemetry] = useState(null);
  const [userNick] = useState(() => localStorage.getItem('exo_user_nick') || 'You');
  const [userAvatarUrl] = useState(() => getUserAvatarUrl());

  const [showAttachPanel, setShowAttachPanel] = useState(false);
  const [sessionAttachments, setSessionAttachments] = useState([]);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [newAttachPath, setNewAttachPath] = useState('');
  const [newAttachName, setNewAttachName] = useState('');
  const [isAddingAttach, setIsAddingAttach] = useState(false);

  const allHistoryRef = useRef([]);
  const visibleStartRef = useRef(0);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const topSentinelRef = useRef(null);
  // 保存当前正在发送消息的附件转换 Promise（用于 SSE 结束后持久化到 localStorage）
  const pendingAttachConversionRef = useRef(null);
  const textareaRef = useRef(null);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  useEffect(() => { autoResize(); }, [inputValue]);

  useEffect(() => {
    const previews = attachedFiles.map(f => ({
      name: f.name,
      type: f.type,
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null
    }));
    setAttachedFilePreviews(previews);
    return () => previews.forEach(p => { if (p.preview) URL.revokeObjectURL(p.preview); });
  }, [attachedFiles]);

  const scrollToBottom = (smooth = true) =>
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });

  const isNearBottom = () => {
    const c = scrollContainerRef.current;
    if (!c) return true;
    return c.scrollHeight - c.scrollTop - c.clientHeight < 120;
  };

  const loadMoreMessages = useCallback(() => {
    if (!hasMore || isLoadingMore) return;
    const container = scrollContainerRef.current;
    const prevScrollHeight = container?.scrollHeight || 0;
    setIsLoadingMore(true);
    const newStart = Math.max(0, visibleStartRef.current - MSGS_PER_PAGE);
    const newSlice = allHistoryRef.current.slice(newStart, visibleStartRef.current);
    visibleStartRef.current = newStart;
    setMessages(prev => [...newSlice, ...prev]);
    setHasMore(newStart > 0);
    setIsLoadingMore(false);
    requestAnimationFrame(() => {
      if (container) container.scrollTop = container.scrollHeight - prevScrollHeight;
    });
  }, [hasMore, isLoadingMore]);

  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMoreMessages(); },
      { root: container, threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMoreMessages]);

  useEffect(() => {
    if (!activeSessionId) return;
    allHistoryRef.current = [];
    visibleStartRef.current = 0;
    setMessages([]);
    setHasMore(false);
    setLastTelemetry(null);
    setSessionAttachments([]);
    setPendingAttachments([]);
    setIsAddingAttach(false);
    setNewAttachPath('');
    setNewAttachName('');

    const savedDraft = localStorage.getItem(`exo_draft_${activeSessionId}`);
    setInputValue(savedDraft ?? '');

    fetch(`${baseUrl}/api/agents/conversations/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        const current = data.find(c => c.id === activeSessionId);
        if (current) {
          setSessionInfo(current);
          setThinkingLevel(current.thinking_level || "auto");
          setTemperature(current.temperature || 1.0);
          const p = presets.find(x => x.id === current.agent_preset_id);
          setCurrentModel(p ? p.default_model : (AVAILABLE_MODELS[0] || ""));
        }
      });

    fetch(`${baseUrl}/api/agents/chat/${activeSessionId}/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        const enriched = enrichMessages(data);
        allHistoryRef.current = enriched;
        const startIdx = Math.max(0, enriched.length - MSGS_PER_PAGE);
        visibleStartRef.current = startIdx;
        setMessages(enriched.slice(startIdx));
        setHasMore(startIdx > 0);
        requestAnimationFrame(() => scrollToBottom(false));
      })
      .catch(err => console.error("获取失败:", err));

    fetch(`${baseUrl}/api/agents/conversations/${activeSessionId}/attachments/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setSessionAttachments(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [activeSessionId, presets]);

  const handleSend = async () => {
    if ((!inputValue.trim() && attachedFiles.length === 0) || isGenerating) return;
    const userMsg = {
      role: 'user',
      content: inputValue,
      attachments: attachedFiles.map(f => ({
        name: f.name,
        type: f.type,
        size: f.size,
        preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null
      }))
    };
    const aiMsg = { id: Date.now(), role: 'assistant', content: '', reasoning_content: '', reasoning_steps: [], new_anchors: [] };
    allHistoryRef.current = [...allHistoryRef.current, userMsg, aiMsg];
    setMessages(prev => [...prev, userMsg, aiMsg]);

    const currentInput = inputValue; const currentFiles = [...attachedFiles];
    const currentPending = [...pendingAttachments];
    // 提前启动附件转 base64 的异步操作，与网络请求并行
    pendingAttachConversionRef.current = currentFiles.length > 0
      ? filesToAttachmentData(currentFiles)
      : null;
    setInputValue(""); setAttachedFiles([]); setIsGenerating(true); scrollToBottom(true);
    localStorage.removeItem(`exo_draft_${activeSessionId}`);

    try {
      let response;
      const bodyData = {
        content: currentInput,
        model: currentModel,
        thinking_level: thinkingLevel,
        temperature: temperature,
        ...(currentPending.length > 0 && { pending_attachments: currentPending }),
      };

      if (currentFiles.length > 0) {
        const formData = new FormData();
        Object.keys(bodyData).forEach(k => {
          const v = bodyData[k];
          formData.append(k, typeof v === 'object' ? JSON.stringify(v) : v);
        });
        currentFiles.forEach(f => formData.append('files', f));
        response = await fetch(`${baseUrl}/api/agents/chat/${activeSessionId}/`, { method: 'POST', headers: { 'X-CSRFToken': getCsrfToken() }, body: formData, credentials: 'include' });
      } else {
        response = await fetch(`${baseUrl}/api/agents/chat/${activeSessionId}/`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() }, body: JSON.stringify(bodyData), credentials: 'include' });
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n'); buffer = blocks.pop();

        for (const block of blocks) {
          const lines = block.split('\n');
          let eventType = 'message'; let dataStr = '';
          for (const line of lines) {
            if (line.startsWith('event:')) eventType = line.substring(6).trim();
            else if (line.startsWith('data:')) dataStr += line.substring(5).trim();
          }
          if (!dataStr || eventType === 'done' || dataStr === '[DONE]') continue;

          if (eventType === 'telemetry') {
            try { setLastTelemetry(JSON.parse(dataStr)); } catch(e) {}
            continue;
          }

          let text = dataStr;
          try {
            const parsed = JSON.parse(dataStr);
            if (typeof parsed === 'string') text = parsed;
          } catch (e) { text = dataStr.replace(/\\n/g, '\n'); }

          setMessages(prev => {
            const newMsgs = [...prev];
            const lastMsg = { ...newMsgs[newMsgs.length - 1] };
            newMsgs[newMsgs.length - 1] = lastMsg;
            if (eventType === 'reasoning') {
              const steps = [...(lastMsg.reasoning_steps || [])];
              if (steps[steps.length - 1] !== text) steps.push(text);
              lastMsg.reasoning_steps = steps;
            } else if (eventType === 'thinking') {
              lastMsg.reasoning_content = (lastMsg.reasoning_content || '') + text;
            } else if (eventType === 'content') {
              lastMsg.content = (lastMsg.content || '') + text;
            } else if (eventType === 'anchor_created') {
              try { lastMsg.new_anchors = [...(lastMsg.new_anchors || []), JSON.parse(text)]; } catch(e) {}
            }
            allHistoryRef.current[allHistoryRef.current.length - 1] = lastMsg;
            return newMsgs;
          });
        }
        if (isNearBottom()) scrollToBottom(false);
      }
    } catch (err) { console.error("中断:", err); } finally {
      setIsGenerating(false);
      // 刷新消息列表以获取真实 DB id（供书签功能及附件持久化使用）
      fetch(`${baseUrl}/api/agents/chat/${activeSessionId}/`, { credentials: 'include' })
        .then(res => res.json())
        .then(async data => {
          if (!Array.isArray(data) || data.length < 2) return;
          const n = data.length;
          const userId = data[n - 2]?.id;
          // 等待附件转换完成并持久化到 localStorage
          if (userId && pendingAttachConversionRef.current) {
            try {
              const attachData = await pendingAttachConversionRef.current;
              if (attachData.length > 0) saveAttachments(userId, attachData);
            } catch (e) {
              console.warn('附件持久化失败:', e);
            }
            pendingAttachConversionRef.current = null;
          }
          allHistoryRef.current = enrichMessages(data);
          setMessages(prev => {
            if (prev.length < 2) return prev;
            const copy = [...prev];
            copy[copy.length - 2] = { ...copy[copy.length - 2], id: data[n - 2]?.id };
            copy[copy.length - 1] = { ...copy[copy.length - 1], id: data[n - 1]?.id };
            return copy;
          });
        })
        .catch(() => {});
      if (currentPending.length > 0) {
        setPendingAttachments([]);
        fetch(`${baseUrl}/api/agents/conversations/${activeSessionId}/attachments/`, { credentials: 'include' })
          .then(res => res.json())
          .then(data => setSessionAttachments(Array.isArray(data) ? data : []))
          .catch(() => {});
      }
    }
  };

  const handleCompress = async () => {
    if (!activeSessionId) return;
    try {
      await fetch(`${baseUrl}/api/agents/conversations/${activeSessionId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        body: JSON.stringify({ thinking_level: thinkingLevel, temperature }),
        credentials: 'include'
      });
    } catch (err) {
      console.error("保存偏好失败:", err);
    }
  };

  const updatePreference = (updates) => {
    if (updates.model !== undefined) setCurrentModel(updates.model);
    if (updates.thinking_level !== undefined) setThinkingLevel(updates.thinking_level);
    if (updates.temperature !== undefined) setTemperature(parseFloat(updates.temperature));

    const { model, ...patchData } = updates;
    if (Object.keys(patchData).length > 0) {
      fetch(`${baseUrl}/api/agents/conversations/${activeSessionId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        body: JSON.stringify(patchData),
        credentials: 'include'
      }).catch(err => console.error("同步偏好失败", err));
    }
  };

  const handleAddAttachment = async () => {
    const path = newAttachPath.trim();
    if (!path) return;
    try {
      const res = await fetch(`${baseUrl}/api/agents/conversations/${activeSessionId}/attachments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify({ storage_path: path, display_name: newAttachName.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setPendingAttachments(prev => [...prev, data]);
        setNewAttachPath('');
        setNewAttachName('');
        setIsAddingAttach(false);
      } else {
        alert(data.error || '挂载失败');
      }
    } catch (err) {
      console.error('挂载附件失败:', err);
    }
  };

  const handleRemoveAttachment = async (att) => {
    try {
      await fetch(`${baseUrl}/api/agents/conversations/${activeSessionId}/attachments/delete/`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify({ source: att.source, id: att.id }),
      });
      setSessionAttachments(prev => prev.filter(a => a.id !== att.id));
    } catch (err) {
      console.error('移除附件失败:', err);
    }
  };

  return (
    <div className="flex-1 min-w-0 flex flex-col h-full bg-exo-bg relative">
      <div className="h-14 border-b border-exo-border flex items-center justify-between px-4 md:px-6 bg-exo-panel/50 backdrop-blur-md">
        <div className="flex items-center gap-2 md:gap-3">
          <button onClick={() => setShowConvList(true)} className="md:hidden p-1.5 rounded-lg text-exo-muted hover:bg-white/5"><Menu size={20} /></button>
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-exo-gold uppercase tracking-tighter shrink-0">{sessionInfo?.session_type || 'CHAT'}</span>
            <div className={`w-2 h-2 rounded-full shrink-0 ${isGenerating ? 'bg-exo-gold animate-pulse' : 'bg-green-500'}`}></div>
            <div className="flex flex-col overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-exo-text truncate">{sessionInfo?.name || `Session #${activeSessionId}`}</span>
                <span className="text-[10px] text-exo-muted/60 shrink-0">#{activeSessionId}</span>
              </div>
              {sessionInfo?.agent_preset_id && presets.find(x => x.id === sessionInfo.agent_preset_id) && (
                <span className="text-[10px] text-exo-muted/50 truncate leading-tight">{presets.find(x => x.id === sessionInfo.agent_preset_id)?.name}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <button
            onClick={() => setShowAttachPanel(p => !p)}
            className={`p-2 transition-colors relative ${showAttachPanel ? 'text-exo-gold' : 'text-exo-muted hover:text-exo-gold'}`}
            title="Session Docs"
          >
            <Files size={18} />
            {(sessionAttachments.length + pendingAttachments.length) > 0 && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-exo-gold" />
            )}
          </button>
          <button onClick={handleCompress} className="p-2 text-exo-muted hover:text-exo-gold transition-colors" title="Save & Compress"><Save size={18} /></button>
          <button onClick={() => openNewSession()} className="p-2 text-exo-muted hover:text-exo-gold transition-colors" title="New Session"><Plus size={18} /></button>
        </div>
      </div>

      {showAttachPanel && (
        <div className="border-b border-exo-border bg-exo-panel/30 px-4 py-3 flex flex-col gap-2">
          <div className="flex flex-wrap gap-2 items-center">
            {sessionAttachments.map(att => (
              <span key={att.id} className="flex items-center gap-1.5 text-[11px] bg-black/50 border border-exo-border rounded-lg px-2 py-1 text-exo-muted">
                <FileText size={10} className="text-blue-400 shrink-0" />
                <span className="max-w-[140px] truncate">{att.display_name || att.original_filename}</span>
                <button onClick={() => handleRemoveAttachment(att)} className="ml-0.5 hover:text-red-400 transition-colors"><X size={10} /></button>
              </span>
            ))}
            {pendingAttachments.map((att, i) => (
              <span key={i} className="flex items-center gap-1.5 text-[11px] bg-exo-gold/5 border border-exo-gold/20 rounded-lg px-2 py-1 text-exo-gold/70">
                <FileText size={10} className="text-exo-gold/50 shrink-0" />
                <span className="max-w-[120px] truncate">{att.display_name || att.original_filename}</span>
                <span className="text-[9px] opacity-50">pending</span>
                <button onClick={() => setPendingAttachments(p => p.filter((_, j) => j !== i))} className="ml-0.5 hover:text-red-400 transition-colors"><X size={10} /></button>
              </span>
            ))}
            {sessionAttachments.length === 0 && pendingAttachments.length === 0 && !isAddingAttach && (
              <span className="text-[11px] text-exo-muted/40 font-mono">[ 无挂载文档 ]</span>
            )}
            {!isAddingAttach && (
              <button onClick={() => setIsAddingAttach(true)} className="text-[11px] text-exo-muted hover:text-white flex items-center gap-1 px-2 py-1 rounded border border-dashed border-exo-border hover:border-exo-muted transition-colors">
                <Plus size={10} /> 挂载
              </button>
            )}
          </div>
          {isAddingAttach && (
            <div className="flex gap-2 items-center flex-wrap">
              <input
                value={newAttachPath}
                onChange={e => setNewAttachPath(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddAttachment(); if (e.key === 'Escape') { setIsAddingAttach(false); setNewAttachPath(''); setNewAttachName(''); } }}
                placeholder="文件绝对路径..."
                autoFocus
                className="flex-1 min-w-0 bg-black border border-exo-border rounded px-2 py-1 text-xs text-exo-text outline-none focus:border-exo-gold/50 transition-colors font-mono"
              />
              <input
                value={newAttachName}
                onChange={e => setNewAttachName(e.target.value)}
                placeholder="显示名（可选）"
                className="w-28 bg-black border border-exo-border rounded px-2 py-1 text-xs text-exo-text outline-none focus:border-exo-gold/50 transition-colors"
              />
              <button onClick={handleAddAttachment} className="px-2 py-1 bg-exo-gold/10 text-exo-gold border border-exo-gold/20 rounded text-xs hover:bg-exo-gold hover:text-black transition-all">确认</button>
              <button onClick={() => { setIsAddingAttach(false); setNewAttachPath(''); setNewAttachName(''); }} className="px-2 py-1 text-exo-muted hover:text-white text-xs transition-colors">取消</button>
            </div>
          )}
        </div>
      )}

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 space-y-6">
        <div ref={topSentinelRef} className="h-px" />
        {isLoadingMore && (
          <div className="flex justify-center py-3">
            <span className="text-xs text-exo-muted flex items-center gap-2 animate-pulse"><RefreshCw size={12} className="animate-spin" /> 加载历史记录...</span>
          </div>
        )}
        {messages.map((msg, idx) => {
          const agentPreset = presets.find(x => x.id === sessionInfo?.agent_preset_id);
          const agentName = agentPreset?.name || 'Core';
          return <MessageBubble key={msg.id || idx} msg={msg} agentName={agentName} agentAvatarUrl={getAgentAvatarUrl(sessionInfo?.agent_preset_id, agentName)} userNick={userNick} userAvatarUrl={userAvatarUrl} />;
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-exo-border bg-exo-bg flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3 px-1 text-[10px] font-bold uppercase tracking-widest text-exo-muted">
          <div className="flex items-center gap-1.5 text-exo-gold/80 bg-exo-gold/5 px-2 py-1 rounded border border-exo-gold/10">
            <Cpu size={12} />
            <select
              value={currentModel}
              onChange={(e) => updatePreference({ model: e.target.value })}
              className="bg-transparent outline-none text-exo-text cursor-pointer font-bold uppercase"
            >
              {AVAILABLE_MODELS.map(m => (
                <option key={m} value={m} className="bg-[#1a1b23]">{m}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded border border-white/5">
            <span className="opacity-40">Think:</span>
            <select value={thinkingLevel} onChange={(e) => updatePreference({ thinking_level: e.target.value })} className="bg-transparent outline-none text-exo-text cursor-pointer">
              <option value="off" className="bg-[#1a1b23]">Off</option>
              <option value="auto" className="bg-[#1a1b23]">Auto</option>
              <option value="low" className="bg-[#1a1b23]">Low</option>
              <option value="medium" className="bg-[#1a1b23]">Med</option>
              <option value="high" className="bg-[#1a1b23]">High</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded border border-white/5">
            <span className="opacity-40">Temp:</span>
            <select value={temperature} onChange={(e) => updatePreference({ temperature: e.target.value })} className="bg-transparent outline-none text-exo-text cursor-pointer">
              <option value="1.0" className="bg-[#1a1b23]">Precise</option>
              <option value="1.3" className="bg-[#1a1b23]">Balanced</option>
              <option value="1.8" className="bg-[#1a1b23]">Creative</option>
            </select>
          </div>
          {lastTelemetry && (
            <div className="ml-auto font-mono text-[10px] text-exo-muted/50 tabular-nums tracking-tight">
              ↑{lastTelemetry.input_chars?.toLocaleString()} | ↓{lastTelemetry.output_chars?.toLocaleString()}
            </div>
          )}
        </div>

        <div className="flex flex-col bg-exo-panel border border-exo-border rounded-xl focus-within:border-exo-gold/50 overflow-hidden">
          {attachedFilePreviews.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 pt-3 pb-2 border-b border-exo-border/50">
              {attachedFilePreviews.map((fp, i) => (
                fp.preview
                  ? <div key={i} className="relative group h-16 w-16 shrink-0">
                      <img src={fp.preview} alt={fp.name} title={fp.name} className="h-full w-full object-cover rounded-lg border border-exo-border" />
                      <button
                        onClick={() => setAttachedFiles(p => p.filter((_, j) => j !== i))}
                        className="absolute -top-1.5 -right-1.5 bg-black border border-exo-border/50 rounded-full p-0.5 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      ><X size={10} /></button>
                    </div>
                  : <div key={i} className="relative group flex items-center gap-1.5 text-[11px] bg-black/50 border border-exo-border rounded-lg pl-2 pr-1.5 py-1.5 text-exo-muted max-w-[180px]">
                      <FileText size={11} className="text-blue-400 shrink-0" />
                      <span className="truncate">{fp.name}</span>
                      <button
                        onClick={() => setAttachedFiles(p => p.filter((_, j) => j !== i))}
                        className="ml-1 text-exo-muted hover:text-red-400 transition-colors shrink-0"
                      ><X size={10} /></button>
                    </div>
              ))}
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => {
              const v = e.target.value;
              setInputValue(v);
              autoResize();
              if (activeSessionId) {
                v ? localStorage.setItem(`exo_draft_${activeSessionId}`, v)
                  : localStorage.removeItem(`exo_draft_${activeSessionId}`);
              }
            }}
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey && !e.isComposing) { e.preventDefault(); handleSend(); } }}
            onPaste={e => {
              const items = Array.from(e.clipboardData?.items || []);
              const imageFiles = items
                .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
                .map(item => item.getAsFile())
                .filter(Boolean);
              if (imageFiles.length > 0) {
                e.preventDefault();
                setAttachedFiles(prev => [...prev, ...imageFiles]);
              }
            }}
            placeholder="与核心通讯 (Ctrl+Enter 发送)..."
            className="w-full bg-transparent text-sm text-exo-text outline-none resize-none px-3 pt-3 pb-1 disabled:opacity-50 overflow-y-auto min-h-[2.5rem] md:min-h-[5rem] max-h-[40vh]"
            disabled={isGenerating}
          />
          <div className="flex items-center justify-between px-2 pb-2">
            <div className="flex items-center">
              <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-exo-muted hover:text-white transition-colors"><Paperclip size={16} /></button>
              <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => setAttachedFiles(prev => [...prev, ...Array.from(e.target.files)])} />
            </div>
            <button onClick={handleSend} disabled={isGenerating || (!inputValue.trim() && attachedFiles.length === 0)} className="p-2 bg-exo-gold text-black rounded-lg hover:bg-yellow-400 disabled:opacity-50"><Send size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
