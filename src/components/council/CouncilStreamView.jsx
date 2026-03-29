import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { baseUrl } from '../../utils/api';
import MessageBubble from '../chat/MessageBubble';

// Read-only conversation view that supports live SSE stream overlays.
// Props:
//   conversationId  — the Django conversation ID to fetch history from
//   streamBuffer    — { content: string, reasoning: string, done: boolean } | null
//   agentName       — display name for the AI messages
//   agentAvatarUrl  — avatar URL for the agent
//   userNick        — display name for user
//   userAvatarUrl   — avatar URL for user
//   isStreaming     — boolean, whether a stream is currently active
//   refetchTrigger  — increment to force re-fetch after stream completes

const CouncilStreamView = ({ conversationId, streamBuffer, agentName, agentAvatarUrl, userNick, userAvatarUrl, isStreaming, refetchTrigger }) => {
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
  const displayMessages = [...messages];
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
      <div className="flex-1 flex items-center justify-center text-exo-muted">
        <Loader2 size={20} className="animate-spin mr-2" />
        <span className="text-sm">载入中...</span>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-hide">
      {displayMessages.length === 0 && !isStreaming && (
        <div className="flex items-center justify-center h-full text-exo-muted/40 text-sm">暂无消息</div>
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
        <div className="flex items-center gap-2 text-exo-gold/60 text-xs pl-10">
          <span className="w-1.5 h-1.5 rounded-full bg-exo-gold animate-pulse inline-block" />
          正在生成...
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default CouncilStreamView;
