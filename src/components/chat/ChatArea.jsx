import React, { useState, useEffect, useRef } from 'react';
import {
  Menu, Save, Plus, RefreshCw, X, FileText,
  Paperclip, Send, Cpu, Activity
} from 'lucide-react';
import { baseUrl, getCsrfToken, AVAILABLE_MODELS } from '../../utils/api';
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
  const [userAvatarSeed] = useState(() => localStorage.getItem('exo_user_avatar_seed') || 'Elysia');

  const allHistoryRef = useRef([]);
  const visibleStartRef = useRef(0);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const topSentinelRef = useRef(null);

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

  useEffect(() => {
    if (!activeSessionId) return;
    allHistoryRef.current = [];
    visibleStartRef.current = 0;
    setMessages([]);
    setHasMore(false);
    setLastTelemetry(null);

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
        allHistoryRef.current = data;
        const startIdx = Math.max(0, data.length - MSGS_PER_PAGE);
        visibleStartRef.current = startIdx;
        setMessages(data.slice(startIdx));
        setHasMore(startIdx > 0);
        requestAnimationFrame(() => scrollToBottom(false));
      })
      .catch(err => console.error("获取失败:", err));
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
    setInputValue(""); setAttachedFiles([]); setIsGenerating(true); scrollToBottom(true);
    localStorage.removeItem(`exo_draft_${activeSessionId}`);

    try {
      let response;
      const bodyData = {
        content: currentInput,
        model: currentModel,
        thinking_level: thinkingLevel,
        temperature: temperature
      };

      if (currentFiles.length > 0) {
        const formData = new FormData();
        Object.keys(bodyData).forEach(k => formData.append(k, bodyData[k]));
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
    } catch (err) { console.error("中断:", err); } finally { setIsGenerating(false); }
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
          <button onClick={handleCompress} className="p-2 text-exo-muted hover:text-exo-gold transition-colors" title="Save & Compress"><Save size={18} /></button>
          <button onClick={() => openNewSession()} className="p-2 text-exo-muted hover:text-exo-gold transition-colors" title="New Session"><Plus size={18} /></button>
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 space-y-6">
        <div ref={topSentinelRef} className="h-px" />
        {isLoadingMore && (
          <div className="flex justify-center py-3">
            <span className="text-xs text-exo-muted flex items-center gap-2 animate-pulse"><RefreshCw size={12} className="animate-spin" /> 加载历史记录...</span>
          </div>
        )}
        {messages.map((msg, idx) => {
          const agentName = presets.find(x => x.id === sessionInfo?.agent_preset_id)?.name || 'Core';
          return <MessageBubble key={msg.id || idx} msg={msg} agentName={agentName} agentAvatarSeed={agentName} userNick={userNick} userAvatarSeed={userAvatarSeed} />;
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
            rows="4"
            value={inputValue}
            onChange={(e) => {
              const v = e.target.value;
              setInputValue(v);
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
            className="w-full bg-transparent text-sm text-exo-text outline-none resize-none px-3 pt-3 pb-1 disabled:opacity-50"
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
