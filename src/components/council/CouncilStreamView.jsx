import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Activity } from 'lucide-react';
import { baseUrl } from '../../utils/api';
import MessageBubble from '../chat/MessageBubble';

// Read-only conversation view that supports live SSE stream overlays.
const CouncilStreamView = ({ conversationId, streamBuffer, agentName, agentAvatarUrl, userNick, userAvatarUrl, isStreaming, refetchTrigger, assistantOnly, noScroll }) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    setIsLoading(true);
    fetch(`${baseUrl}/api/agents/chat/${conversationId}/`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setMessages(Array.isArray(data) ? data : []);
        requestAnimationFrame(scrollToBottom);
      })
      .catch(err => console.error('CouncilStreamView 获取历史失败:', err))
      .finally(() => setIsLoading(false));
  }, [conversationId, refetchTrigger]);

  useEffect(() => {
    if (isStreaming) scrollToBottom();
  }, [streamBuffer?.content, isStreaming]);

  // Build displayed messages: persisted history + live stream overlay
  const displayMessages = [...(assistantOnly ? messages.filter(m => m.role === 'assistant') : messages)];
  if (streamBuffer && !streamBuffer.done && (streamBuffer.content || streamBuffer.reasoning)) {
    displayMessages.push({
      id: '__streaming__',
      role: 'assistant',
      content: streamBuffer.content || '',
      reasoning_steps: streamBuffer.reasoning ? [streamBuffer.reasoning] : undefined,
      attachments: [],
    });
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 opacity-30">
        <Loader2 size={16} className="animate-spin mb-2" />
        <span className="text-[10px] font-mono uppercase tracking-widest">Accessing Log Cluster...</span>
      </div>
    );
  }

  return (
    <div ref={noScroll ? undefined : scrollRef} className={noScroll ? 'space-y-6' : 'flex-1 overflow-y-auto px-4 py-8 space-y-8 scrollbar-hide'}>
      {displayMessages.length === 0 && !isStreaming && (
        <div className="flex items-center justify-center py-6 text-exo-muted/30 font-mono text-[10px] uppercase tracking-widest italic">No neural trace detected</div>
      )}
      {displayMessages.map((msg, idx) => (
        <MessageBubble
          key={msg.id || idx}
          msg={msg}
          agentName={agentName}
          agentAvatarUrl={agentAvatarUrl}
          userNick={userNick}
          userAvatarUrl={userAvatarUrl}
        />
      ))}
      {isStreaming && !(streamBuffer?.content) && (
        <div className="flex items-center gap-3 text-exo-accent/60 text-[10px] font-mono uppercase tracking-[0.2em] pl-16 animate-pulse">
          <Activity size={12} />
          Establishing Output Stream...
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default CouncilStreamView;
