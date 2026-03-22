import React from 'react';
import { FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

const MessageBubble = React.memo(({ msg, agentName, agentAvatarUrl, userNick, userAvatarUrl }) => {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div className={`flex items-center gap-2 mb-1.5 ${isUser ? 'flex-row-reverse' : ''}`}>
        <img
          src={isUser ? userAvatarUrl : agentAvatarUrl}
          className={`w-7 h-7 rounded-full border bg-black object-cover ${isUser ? 'border-white/20' : 'border-exo-gold/40'}`}
          alt={isUser ? (userNick || 'You') : (agentName || 'Core')}
        />
        <span className={`text-[11px] font-semibold tracking-wide ${isUser ? 'text-white/40' : 'text-exo-gold/60'}`}>
          {isUser ? (userNick || 'You') : (agentName || 'Core')}
        </span>
      </div>

      <div className={`w-full space-y-2 ${isUser ? 'flex flex-col items-end' : ''}`}>
        {!isUser && msg.reasoning_steps && msg.reasoning_steps.map((step, sIdx) => (
          <div key={sIdx} className="text-[11px] text-exo-gold/70 bg-exo-gold/5 px-2 py-1 rounded">{step}</div>
        ))}
        {!isUser && msg.reasoning_content && (
          <details className="bg-[#121215] border border-exo-border rounded-lg text-xs text-exo-muted cursor-pointer w-full">
            <summary className="p-2 flex items-center gap-2">Thinking Process</summary>
            <div className="p-3 border-t border-exo-border bg-black/50 whitespace-pre-wrap font-mono">{msg.reasoning_content}</div>
          </details>
        )}
        {isUser && msg.attachments?.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-end">
            {msg.attachments.map((att, i) => (
              att.preview
                ? <img key={i} src={att.preview} alt={att.name} title={att.name} className="max-h-40 max-w-full rounded-lg object-cover border border-exo-border" />
                : <div key={i} className="flex items-center gap-1.5 text-[11px] bg-black/50 border border-exo-border rounded-lg px-2 py-1.5 text-exo-muted">
                    <FileText size={11} className="text-blue-400 shrink-0" />
                    <span className="truncate max-w-[160px]">{att.name}</span>
                  </div>
            ))}
          </div>
        )}
        <div className={isUser
          ? 'max-w-[88%] bg-exo-panel border border-exo-border rounded-2xl rounded-tr-sm p-4 text-sm text-exo-text whitespace-pre-wrap'
          : 'w-full prose prose-invert prose-sm max-w-none'}>
          {isUser
            ? msg.content
            : <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>{msg.content}</ReactMarkdown>}
        </div>
      </div>
    </div>
  );
});

export default MessageBubble;
