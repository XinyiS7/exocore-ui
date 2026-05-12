import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Menu, Save, Plus, RefreshCw, X, FileText,
  Paperclip, Send, Cpu, Activity, Files, ImageIcon, ArrowLeft, Edit2
} from 'lucide-react';
import { baseUrl, getCsrfToken, AVAILABLE_MODELS } from '../../utils/api';
import { getUserAvatarUrl, getAgentAvatarUrl } from '../../utils/avatar';
import { filesToAttachmentData, saveAttachments, enrichMessages } from '../../utils/attachmentStorage';
import MessageBubble from './MessageBubble';
import BranchSessionModal from '../modals/BranchSessionModal';
import ContextCacheIndicator from './ContextCacheIndicator';
import { usePollingChat } from '../../hooks/usePollingChat';

const MSGS_PER_PAGE = 40;

const ChatArea = ({ activeSessionId, setActiveSessionId, setRefreshKey, setShowConvList, openNewSession, presets, headerTitleOverride, rightExtraButton, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const abortControllerRef = useRef(null);
  const [thinkingLevel, setThinkingLevel] = useState("auto");
  const [temperature, setTemperature] = useState(1.0);
  const [currentModel, setCurrentModel] = useState("");
  const [chatMode, setChatMode] = useState(() => localStorage.getItem('exo_chat_mode') || 'sse');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [attachedFilePreviews, setAttachedFilePreviews] = useState([]);
  const blobUrlMapRef = useRef(new Map());
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastTelemetry, setLastTelemetry] = useState(null);
  const [userNick, setUserNick] = useState(() => localStorage.getItem('exo_user_nick') || 'You');
  const [userAvatarUrl] = useState(() => getUserAvatarUrl());

  const { sendMessageAsync } = usePollingChat();

  const [showAttachPanel, setShowAttachPanel] = useState(false);
  const [sessionAttachments, setSessionAttachments] = useState([]);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  
  const isImageFile = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
  };

  const filteredSessionAttachments = sessionAttachments.filter(att => !isImageFile(att.original_filename));
  const filteredPendingAttachments = pendingAttachments.filter(att => !isImageFile(att.original_filename));
  const [newAttachPath, setNewAttachPath] = useState('');
  const [newAttachName, setNewAttachName] = useState('');
  const [isAddingAttach, setIsAddingAttach] = useState(false);

  const [branchingMessageId, setBranchingMessageId] = useState(null);
  const [isBranching, setIsBranching] = useState(false);

  const allHistoryRef = useRef([]);
  const visibleStartRef = useRef(0);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const topSentinelRef = useRef(null);
  const cacheRef = useRef(null);
  // 保存当前正在发送消息的附件转换 Promise（用于 SSE 结束后持久化到 localStorage）
  const pendingAttachConversionRef = useRef(null);
  const textareaRef = useRef(null);
  const draftTimerRef = useRef(null);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  useEffect(() => { autoResize(); }, [inputValue]);

  // Sync userNick if it changes in localStorage (e.g. from settings)
  useEffect(() => {
    const handleStorage = () => {
      setUserNick(localStorage.getItem('exo_user_nick') || 'You');
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('user-nick-updated', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('user-nick-updated', handleStorage);
    };
  }, []);

  // Debounced draft save
  useEffect(() => {
    if (!activeSessionId) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    
    draftTimerRef.current = setTimeout(() => {
      if (inputValue) {
        localStorage.setItem(`exo_draft_${activeSessionId}`, inputValue);
      } else {
        localStorage.removeItem(`exo_draft_${activeSessionId}`);
      }
    }, 500); // 500ms debounce

    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [inputValue, activeSessionId]);

  useEffect(() => {
    const newPreviews = attachedFiles.map(f => {
      if (blobUrlMapRef.current.has(f)) {
        return blobUrlMapRef.current.get(f);
      }
      const preview = f.type.startsWith('image/') ? URL.createObjectURL(f) : null;
      const data = { name: f.name, type: f.type, preview };
      blobUrlMapRef.current.set(f, data);
      return data;
    });

    // Cleanup URLs for files no longer in attachedFiles
    for (const [file, data] of blobUrlMapRef.current.entries()) {
      if (!attachedFiles.includes(file)) {
        if (data.preview) URL.revokeObjectURL(data.preview);
        blobUrlMapRef.current.delete(file);
      }
    }

    setAttachedFilePreviews(newPreviews);
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

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  };

  const handleSend = async (options = {}) => {
    const regenerateMessageId = options.regenerateMessageId;
    const editMessageId = options.editMessageId !== undefined ? options.editMessageId : (regenerateMessageId ? null : editingMessageId);
    
    if ((!inputValue.trim() && !regenerateMessageId && attachedFiles.length === 0) || isGenerating) return;

    let historyToKeep = [...allHistoryRef.current];
    let userMsg = null;
    let aiMsg = { id: Date.now(), role: 'assistant', content: '', reasoning_content: '', reasoning_steps: [], new_anchors: [] };

    if (editMessageId) {
      const idx = historyToKeep.findIndex(m => m.id === editMessageId);
      if (idx !== -1) {
        historyToKeep = historyToKeep.slice(0, idx);
        userMsg = {
          id: editMessageId, // Keep same ID if possible or let backend handle
          role: 'user',
          content: inputValue,
          attachments: attachedFiles.map(f => ({
            name: f.name,
            type: f.type,
            size: f.size,
            preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null
          }))
        };
        historyToKeep.push(userMsg, aiMsg);
      }
    } else if (regenerateMessageId) {
      const idx = historyToKeep.findIndex(m => m.id === regenerateMessageId);
      if (idx !== -1) {
        historyToKeep = historyToKeep.slice(0, idx);
        historyToKeep.push(aiMsg);
      }
    } else {
      userMsg = {
        role: 'user',
        content: inputValue,
        attachments: attachedFiles.map(f => ({
          name: f.name,
          type: f.type,
          size: f.size,
          preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null
        }))
      };
      historyToKeep.push(userMsg, aiMsg);
    }

    allHistoryRef.current = historyToKeep;
    const newStart = Math.max(0, historyToKeep.length - messages.length - (userMsg ? 2 : 1)); // Heuristic to keep view stable
    setMessages(historyToKeep.slice(visibleStartRef.current));

    const currentInput = inputValue;
    const currentFiles = [...attachedFiles];
    const currentPending = [...pendingAttachments];
    
    pendingAttachConversionRef.current = currentFiles.length > 0
      ? filesToAttachmentData(currentFiles)
      : null;

    setInputValue("");
    setAttachedFiles([]);
    setIsGenerating(true);
    setEditingMessageId(null);
    scrollToBottom(true);
    localStorage.removeItem(`exo_draft_${activeSessionId}`);

    abortControllerRef.current = new AbortController();

    try {
      let response;
      const bodyData = {
        content: currentInput,
        model: currentModel,
        thinking_level: thinkingLevel,
        temperature: temperature,
        ...(currentPending.length > 0 && { pending_attachments: currentPending }),
        ...(editMessageId && { edit_message_id: editMessageId }),
        ...(regenerateMessageId && { regenerate_message_id: regenerateMessageId }),
      };

      const fetchOptions = {
        method: 'POST',
        headers: { 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
        signal: abortControllerRef.current.signal,
      };

      if (currentFiles.length > 0 && !regenerateMessageId) {
        const formData = new FormData();
        Object.keys(bodyData).forEach(k => {
          const v = bodyData[k];
          formData.append(k, typeof v === 'object' ? JSON.stringify(v) : v);
        });
        currentFiles.forEach(f => formData.append('files', f));
        fetchOptions.body = formData;
      } else {
        fetchOptions.headers['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify(bodyData);
      }

      if (chatMode === 'async') {
        const payload = (currentFiles.length > 0 && !regenerateMessageId) ? fetchOptions.body : bodyData;
        await sendMessageAsync(payload, activeSessionId, abortControllerRef.current.signal, (text, type) => {
          setMessages(prev => {
            const newMsgs = [...prev];
            const lastMsg = { ...newMsgs[newMsgs.length - 1] };
            if (type === 'thinking') {
              lastMsg.reasoning_content = (lastMsg.reasoning_content || '') + text;
            } else if (type === 'reasoning') {
              const steps = [...(lastMsg.reasoning_steps || [])];
              if (steps.length === 0 || steps[steps.length - 1] !== text) steps.push(text);
              lastMsg.reasoning_steps = steps;
            } else if (type === 'status') {
              lastMsg.status_text = text;
            } else {
              lastMsg.content = (lastMsg.content || '') + text;
              lastMsg.status_text = null;
            }
            newMsgs[newMsgs.length - 1] = lastMsg;
            allHistoryRef.current[allHistoryRef.current.length - 1] = lastMsg;
            return newMsgs;
          });
          if (isNearBottom()) scrollToBottom(false);
        });
      } else {
        response = await fetch(`${baseUrl}/api/agents/chat/${activeSessionId}/`, fetchOptions);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

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

            if (eventType === 'error') {
              let errorMsg = dataStr;
              try { const e = JSON.parse(dataStr); errorMsg = e.message || dataStr; } catch(e) {}
              setMessages(prev => {
                const newMsgs = [...prev];
                const lastMsg = { ...newMsgs[newMsgs.length - 1] };
                lastMsg.status_text = null;
                lastMsg.error = errorMsg;
                newMsgs[newMsgs.length - 1] = lastMsg;
                allHistoryRef.current[allHistoryRef.current.length - 1] = lastMsg;
                return newMsgs;
              });
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
                lastMsg.status_text = null;
              } else if (eventType === 'anchor_created') {
                try { lastMsg.new_anchors = [...(lastMsg.new_anchors || []), JSON.parse(text)]; } catch(e) {}
              } else if (eventType === 'status') {
                lastMsg.status_text = text;
              }
              allHistoryRef.current[allHistoryRef.current.length - 1] = lastMsg;
              return newMsgs;
            });
          }
          if (isNearBottom()) scrollToBottom(false);
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log("Stream aborted by user");
        // Refill input with last user message if it was a normal send or edit
        if (currentInput) {
          setInputValue(currentInput);
          if (activeSessionId) localStorage.setItem(`exo_draft_${activeSessionId}`, currentInput);
        }
      } else {
        console.error("Stream error:", err);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
      // 刷新消息列表以获取真实 DB id（供书签功能及附件持久化使用）
      fetch(`${baseUrl}/api/agents/chat/${activeSessionId}/`, { credentials: 'include' })
        .then(res => res.json())
        .then(async data => {
          if (!Array.isArray(data) || data.length === 0) return;
          const userId = [...data].reverse().find(m => m.role === 'user')?.id;
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
          const enriched = enrichMessages(data);
          allHistoryRef.current = enriched;
          const startIdx = Math.max(0, enriched.length - MSGS_PER_PAGE);
          visibleStartRef.current = startIdx;
          setMessages(enriched.slice(startIdx));
        })
        .catch(() => {});
      // Refresh attachments after every SSE completion
      setPendingAttachments([]);
      fetch(`${baseUrl}/api/agents/conversations/${activeSessionId}/attachments/`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => setSessionAttachments(Array.isArray(data) ? data : []))
        .catch(() => {});
      // Trigger cache check (server may have created/renewed cache during this request)
      cacheRef.current?.refresh();
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

  const handleBranch = useCallback((messageId) => {
    setBranchingMessageId(messageId);
  }, []);

  const onConfirmBranch = async (newName) => {
    if (!branchingMessageId) return;
    setIsBranching(true);
    try {
      const res = await fetch(`${baseUrl}/api/agents/conversations/${activeSessionId}/branch/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify({ 
          branch_from_message_id: branchingMessageId,
          name: newName.trim() || undefined
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const trimmedName = newName.trim();
        if (trimmedName) {
          await fetch(`${baseUrl}/api/agents/conversations/${data.conversation_id}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
            credentials: 'include',
            body: JSON.stringify({ name: trimmedName }),
          }).catch(() => {});
        }
        if (setRefreshKey) setRefreshKey(p => p + 1);
        if (setActiveSessionId) setActiveSessionId(data.conversation_id);
        setBranchingMessageId(null);
      } else {
        alert(data.error || '分叉失败');
      }
    } catch (err) {
      console.error('分叉失败:', err);
    } finally {
      setIsBranching(false);
    }
  };

  const onEdit = useCallback((msg) => {
    setInputValue(msg.content);
    setEditingMessageId(msg.id);
    if (textareaRef.current) textareaRef.current.focus();
  }, []);

  const handleSendRef = useRef(handleSend);
  useEffect(() => { handleSendRef.current = handleSend; }, [handleSend]);

  const onRegenerate = useCallback((msg) => {
    handleSendRef.current({ regenerateMessageId: msg.id });
  }, []);

  return (
    <div className="flex-1 min-w-0 flex flex-col h-full bg-exo-bg relative">
      <div className="h-14 border-b border-exo-mist-10 flex items-center justify-between px-4 md:px-6 bg-exo-pure/40 backdrop-blur-md relative z-20">
        <div className="flex items-center gap-2 md:gap-3">
          {onBack
            ? <button onClick={onBack} className="p-1.5 rounded-[4px] text-exo-muted hover:text-exo-text hover:bg-white/5"><ArrowLeft size={18} /></button>
            : <button onClick={() => setShowConvList(true)} className="md:hidden p-1.5 rounded-[4px] text-exo-muted hover:bg-white/5"><Menu size={20} /></button>
          }
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="label-caps px-1.5 py-0.5 rounded-[2px] bg-exo-accent/10 border border-exo-accent/20 text-exo-accent shrink-0">{sessionInfo?.session_type || 'CHAT'}</span>
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isGenerating ? 'bg-exo-accent animate-blink-sharp' : 'bg-green-500/70'}`}></div>
            <div className="flex flex-col overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-display font-medium text-white tracking-wide truncate">{headerTitleOverride || sessionInfo?.name || `Session #${activeSessionId}`}</span>
                <span className="font-mono text-[10px] text-exo-muted/40 shrink-0">#{activeSessionId}</span>
              </div>
              {sessionInfo?.agent_preset_id && presets.find(x => x.id === sessionInfo.agent_preset_id) && (
                <span className="text-[10px] font-mono text-exo-muted/50 truncate leading-tight uppercase tracking-tighter">{presets.find(x => x.id === sessionInfo.agent_preset_id)?.name}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2 relative">
          <button
            onClick={() => setShowAttachPanel(p => !p)}
            className={`p-2 transition-colors relative ${showAttachPanel ? 'text-exo-accent' : 'text-exo-muted hover:text-exo-accent'}`}
            title="Session Docs"
          >
            <Files size={18} />
            {(filteredSessionAttachments.length + filteredPendingAttachments.length) > 0 && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-exo-accent shadow-glow-gold" />
            )}
          </button>
          {showAttachPanel && (
            <div className="absolute top-full right-0 mt-2 w-80 max-h-[70vh] bg-exo-pure border border-exo-mist-12 rounded-[4px] shadow-2xl z-50 overflow-hidden flex flex-col animate-fade-in">
              <div className="px-4 py-3 border-b border-exo-mist-10 bg-white/5 flex items-center justify-between">
                <span className="label-caps text-exo-muted">挂载文档 ({filteredSessionAttachments.length + filteredPendingAttachments.length})</span>
                <button onClick={() => setShowAttachPanel(false)} className="text-exo-muted hover:text-white transition-colors"><X size={14} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
                {filteredSessionAttachments.map(att => (
                  <div key={att.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded-[2px] group transition-colors border border-transparent hover:border-exo-mist-10">
                    <FileText size={14} className="text-blue-400 shrink-0" />
                    <span className="flex-1 text-xs text-exo-muted group-hover:text-white break-all leading-tight">{att.display_name || att.original_filename}</span>
                    <button onClick={() => handleRemoveAttachment(att)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"><X size={12} /></button>
                  </div>
                ))}
                {filteredPendingAttachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1.5 bg-exo-accent/5 rounded-[2px] border border-exo-accent/20 group">
                    <FileText size={14} className="text-exo-accent/50 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-exo-accent/80 break-all leading-tight">{att.display_name || att.original_filename}</div>
                      <div className="text-[9px] text-exo-accent/40 font-mono tracking-widest uppercase">PENDING</div>
                    </div>
                    <button onClick={() => setPendingAttachments(p => p.filter((_, j) => j !== i))} className="p-1 hover:text-red-400 transition-colors"><X size={12} /></button>
                  </div>
                ))}
                {filteredSessionAttachments.length === 0 && filteredPendingAttachments.length === 0 && !isAddingAttach && (
                  <div className="py-8 text-center text-[10px] text-exo-muted/30 font-mono tracking-widest uppercase">
                    [ 无挂载文档 ]
                  </div>
                )}
                {isAddingAttach && (
                  <div className="p-2 space-y-2 bg-exo-pure/40 rounded-[2px] border border-exo-mist-10">
                    <input
                      value={newAttachPath}
                      onChange={e => setNewAttachPath(e.target.value)}
                      placeholder="文件绝对路径..."
                      autoFocus
                      className="w-full bg-exo-bg border border-exo-mist-10 rounded-[2px] px-2 py-1.5 text-xs text-white outline-none focus:border-exo-accent/50 transition-colors font-mono"
                    />
                    <input
                      value={newAttachName}
                      onChange={e => setNewAttachName(e.target.value)}
                      placeholder="显示名（可选）"
                      className="w-full bg-exo-bg border border-exo-mist-10 rounded-[2px] px-2 py-1.5 text-xs text-white outline-none focus:border-exo-accent/50 transition-colors"
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setIsAddingAttach(false); setNewAttachPath(''); setNewAttachName(''); }} className="px-3 py-1 text-exo-muted hover:text-white text-[11px] uppercase tracking-widest">取消</button>
                      <button onClick={handleAddAttachment} className="px-3 py-1 bg-exo-accent/10 text-exo-accent border border-exo-accent/20 rounded-[2px] text-[11px] uppercase tracking-widest hover:bg-exo-accent hover:text-black transition-all">确认</button>
                    </div>
                  </div>
                )}
              </div>
              {!isAddingAttach && (
                <div className="p-2 border-t border-exo-mist-10 bg-white/5">
                  <button onClick={() => setIsAddingAttach(true)} className="w-full py-2 text-[11px] uppercase tracking-widest text-exo-muted hover:text-white hover:bg-white/5 flex items-center justify-center gap-2 rounded-[2px] border border-dashed border-exo-mist-10 hover:border-exo-mist-20 transition-all">
                    <Plus size={14} /> 挂载外部路径
                  </button>
                </div>
              )}
            </div>
          )}
          <ContextCacheIndicator ref={cacheRef} activeSessionId={activeSessionId} />
          <button onClick={handleCompress} className="p-2 text-exo-muted hover:text-exo-accent transition-colors" title="Save & Compress"><Save size={18} /></button>
          <button onClick={() => openNewSession()} className="p-2 text-exo-muted hover:text-exo-accent transition-colors" title="New Session"><Plus size={18} /></button>
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 space-y-8 scrollbar-hide">
        <div ref={topSentinelRef} className="h-px" />
        {isLoadingMore && (
          <div className="flex justify-center py-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-exo-muted flex items-center gap-2 animate-pulse"><RefreshCw size={12} className="animate-spin" /> 正在加载历史协议记录...</span>
          </div>
        )}
        {messages.map((msg, idx) => {
          const agentPreset = presets.find(x => x.id === sessionInfo?.agent_preset_id);
          const agentName = agentPreset?.name || 'Core';
          return (
            <MessageBubble
              key={msg.id || idx}
              msg={msg}
              agentName={agentName}
              agentAvatarUrl={getAgentAvatarUrl(sessionInfo?.agent_preset_id, agentName)}
              userNick={userNick}
              userAvatarUrl={userAvatarUrl}
              onEdit={onEdit}
              onRegenerate={onRegenerate}
              onBranch={handleBranch}
              isGenerating={isGenerating}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <BranchSessionModal
        isOpen={!!branchingMessageId}
        onClose={() => setBranchingMessageId(null)}
        onConfirm={onConfirmBranch}
        isSubmitting={isBranching}
      />

      <div className="p-4 border-t border-exo-mist-10 bg-exo-pure/80 backdrop-blur-xl flex flex-col gap-3">
        {editingMessageId && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-exo-accent/10 border border-exo-accent/20 rounded-[2px] animate-fade-in">
            <div className="flex items-center gap-2 text-exo-accent text-[10px] font-mono uppercase tracking-widest">
              <Edit2 size={12} />
              <span>正在修正通讯协议数据区块 #{editingMessageId}</span>
            </div>
            <button onClick={() => { setEditingMessageId(null); setInputValue(''); }} className="text-exo-accent/50 hover:text-exo-accent transition-colors"><X size={14} /></button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-4 px-1 text-exo-muted">
          <div className="flex items-center gap-2 text-exo-accent/80 bg-exo-accent/5 px-2 py-1 rounded-[2px] border border-exo-accent/10">
            <Cpu size={12} />
            <select
              value={currentModel}
              onChange={(e) => updatePreference({ model: e.target.value })}
              className="bg-transparent outline-none text-[11px] font-mono uppercase tracking-widest text-exo-accent cursor-pointer"
            >
              {AVAILABLE_MODELS.map(m => (
                <option key={m} value={m} className="bg-exo-pure text-white">{m}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white/[0.04] px-2 py-1 rounded-[2px] border border-white/[0.08]">
            <span className="text-[10px] font-mono uppercase tracking-tighter opacity-40">Mode</span>
            <select value={chatMode} onChange={(e) => {
              const mode = e.target.value;
              setChatMode(mode);
              localStorage.setItem('exo_chat_mode', mode);
            }} className="bg-transparent outline-none text-[11px] font-mono text-white/80 cursor-pointer">
              <option value="sse" className="bg-exo-pure">SSE</option>
              <option value="async" className="bg-exo-pure">Async</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white/[0.04] px-2 py-1 rounded-[2px] border border-white/[0.08]">
            <span className="text-[10px] font-mono uppercase tracking-tighter opacity-40">Think</span>
            <select value={thinkingLevel} onChange={(e) => updatePreference({ thinking_level: e.target.value })} className="bg-transparent outline-none text-[11px] font-mono text-white/80 cursor-pointer">
              <option value="off" className="bg-exo-pure">Off</option>
              <option value="auto" className="bg-exo-pure">Auto</option>
              <option value="low" className="bg-exo-pure">Low</option>
              <option value="medium" className="bg-exo-pure">Med</option>
              <option value="high" className="bg-exo-pure">High</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white/[0.04] px-2 py-1 rounded-[2px] border border-white/[0.08]">
            <span className="text-[10px] font-mono uppercase tracking-tighter opacity-40">Temp</span>
            <select value={temperature} onChange={(e) => updatePreference({ temperature: e.target.value })} className="bg-transparent outline-none text-[11px] font-mono text-white/80 cursor-pointer">
              <option value="1.0" className="bg-exo-pure">Precise</option>
              <option value="1.3" className="bg-exo-pure">Balanced</option>
              <option value="1.8" className="bg-exo-pure">Creative</option>
            </select>
          </div>
          {lastTelemetry && (
            <div className="ml-auto font-mono text-[10px] text-exo-muted/40 tabular-nums tracking-widest">
              TX: {lastTelemetry.input_chars?.toLocaleString()} | RX: {lastTelemetry.output_chars?.toLocaleString()}
            </div>
          )}
        </div>

        <div className="flex flex-col bg-exo-pure border border-exo-mist-10 rounded-[4px] focus-within:border-exo-accent/40 focus-within:shadow-glow-gold transition-all overflow-hidden">
          {attachedFilePreviews.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 pt-3 pb-2 border-b border-exo-mist-10 bg-white/[0.02]">
              {attachedFilePreviews.map((fp, i) => (
                fp.preview
                  ? <div key={i} className="relative group h-14 w-14 shrink-0 bg-exo-bg rounded-[2px] overflow-hidden border border-exo-mist-10">
                      <img 
                        src={fp.preview} 
                        alt={fp.name} 
                        className="h-full w-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = 'none';
                        }}
                      />
                      <button
                        onClick={() => setAttachedFiles(p => p.filter((_, j) => j !== i))}
                        className="absolute inset-0 bg-exo-pure/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      ><X size={14} className="text-exo-accent" /></button>
                    </div>
                  : <div key={i} className="relative group flex items-center gap-1.5 text-[10px] font-mono bg-exo-bg border border-exo-mist-10 rounded-[2px] pl-2 pr-1.5 py-1.5 text-exo-muted transition-colors hover:border-exo-mist-20">
                      <FileText size={11} className="text-blue-400 shrink-0" />
                      <span className="truncate uppercase tracking-tighter">{fp.name}</span>
                      <button
                        onClick={() => setAttachedFiles(p => p.filter((_, j) => j !== i))}
                        className="ml-1 text-exo-muted hover:text-exo-accent transition-colors shrink-0"
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
            placeholder="正在建立加密通讯链路..."
            className="w-full bg-transparent text-sm text-white/90 outline-none resize-none px-4 pt-4 pb-2 disabled:opacity-50 overflow-y-auto min-h-[2.5rem] md:min-h-[5rem] max-h-[40vh] font-sans font-normal"
            disabled={isGenerating}
          />
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-1">
              <button onClick={() => imageInputRef.current?.click()} title="上传视讯数据" className="p-2 text-exo-muted hover:text-exo-accent transition-colors"><ImageIcon size={16} /></button>
              <button onClick={() => fileInputRef.current?.click()} title="挂载文档区块" className="p-2 text-exo-muted hover:text-exo-accent transition-colors"><Paperclip size={16} /></button>
              <input type="file" ref={imageInputRef} className="hidden" multiple accept="image/*" onChange={(e) => setAttachedFiles(prev => [...prev, ...Array.from(e.target.files)])} />
              <input type="file" ref={fileInputRef} className="hidden" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.json,.zip,.py,.js,.ts,.jsx,.tsx,.html,.css,.xml,.yaml,.yml,.toml,.sh,.log" onChange={(e) => setAttachedFiles(prev => [...prev, ...Array.from(e.target.files)])} />
            </div>
            <div className="flex items-center gap-3">
              {rightExtraButton}
              {isGenerating ? (
                <button
                  onClick={handleStop}
                  className="px-4 py-1.5 bg-red-500/10 text-red-500 border border-red-500/30 rounded-[2px] hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em]"
                  title="中止上行链路"
                >
                  <X size={14} />
                  <span>ABORT</span>
                </button>
              ) : (
                <button
                  onClick={() => handleSend(editingMessageId ? { editMessageId: editingMessageId } : {})}
                  disabled={isGenerating || (!inputValue.trim() && attachedFiles.length === 0)}
                  className="p-2 bg-exo-accent text-exo-pure rounded-[2px] hover:shadow-glow-gold hover:bg-exo-accentGlow disabled:opacity-20 disabled:grayscale transition-all"
                >
                  <Send size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
