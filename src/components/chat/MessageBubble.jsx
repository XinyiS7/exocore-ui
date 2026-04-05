import React, { useState, useCallback, useEffect } from 'react';
import { FileText, Copy, Bookmark, Check, X, ZoomIn } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { baseUrl, getCsrfToken } from '../../utils/api';

const MessageBubble = React.memo(({ msg, agentName, agentAvatarUrl, userNick, userAvatarUrl }) => {
  const isUser = msg.role === 'user';
  const [copied, setCopied] = useState(false);
  const [showBookmark, setShowBookmark] = useState(false);
  const [bookmarkText, setBookmarkText] = useState('');
  const [bookmarkStatus, setBookmarkStatus] = useState(null); // null | 'saving' | 'done' | 'error'
  const [lightboxSrc, setLightboxSrc] = useState(null);

  // Escape 键关闭 lightbox
  useEffect(() => {
    if (!lightboxSrc) return;
    const handler = e => { if (e.key === 'Escape') setLightboxSrc(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxSrc]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(msg.content || '').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [msg.content]);

  const openBookmark = useCallback(() => {
    setBookmarkText(msg.content || '');
    setBookmarkStatus(null);
    setShowBookmark(true);
  }, [msg.content]);

  const handleBookmarkSubmit = useCallback(async () => {
    if (!bookmarkText.trim()) return;
    setBookmarkStatus('saving');
    try {
      const res = await fetch(`${baseUrl}/api/memory/entries/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify({ message_id: msg.id, raw_text: bookmarkText.trim() }),
      });
      if (res.ok) {
        setBookmarkStatus('done');
        setTimeout(() => { setShowBookmark(false); setBookmarkStatus(null); }, 1500);
      } else {
        setBookmarkStatus('error');
      }
    } catch {
      setBookmarkStatus('error');
    }
  }, [msg.id, bookmarkText]);

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div className={`flex items-center gap-2 mb-1.5 ${isUser ? 'flex-row-reverse' : ''}`}>
        <img
          src={isUser ? userAvatarUrl : agentAvatarUrl}
          className={`w-7 h-7 rounded-full border bg-black object-cover ${isUser ? 'border-white/20' : 'border-exo-gold/40'}`}
          alt={isUser ? (userNick || 'You') : (agentName || 'Core')}
        />
        <span className={`label-caps ${isUser ? 'text-white/30' : 'text-exo-gold/50'}`}>
          {isUser ? (userNick || 'You') : (agentName || 'Core')}
        </span>
      </div>

      <div className={`w-full space-y-2 ${isUser ? 'flex flex-col items-end' : ''}`}>
        {!isUser && msg.reasoning_steps && msg.reasoning_steps.map((step, sIdx) => (
          <div key={sIdx} className="text-[11px] text-exo-gold/70 bg-exo-gold/5 px-2 py-1 rounded">{step}</div>
        ))}
        {!isUser && msg.reasoning_content && (
          <details className="bg-exo-metal border border-exo-border/50 rounded-lg text-xs text-exo-muted cursor-pointer w-full">
            <summary className="p-2 flex items-center gap-2 label-caps">Thinking Process</summary>
            <div className="p-3 border-t border-exo-border bg-black/50 whitespace-pre-wrap font-mono">{msg.reasoning_content}</div>
          </details>
        )}
        {isUser && msg.attachments?.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-end">
            {msg.attachments.map((att, i) => (
              att.preview
                ? <button
                    key={i}
                    onClick={() => setLightboxSrc(att.preview)}
                    className="relative group block h-32 max-w-[200px] rounded-lg overflow-hidden border border-exo-border hover:border-exo-gold/40 transition-colors cursor-zoom-in"
                    title={att.name}
                  >
                    <img src={att.preview} alt={att.name} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                : <div key={i} className="flex items-center gap-1.5 text-[11px] bg-black/50 border border-exo-border rounded-lg px-2 py-1.5 text-exo-muted">
                    <FileText size={11} className="text-blue-400 shrink-0" />
                    <span className="truncate max-w-[160px]">{att.name}</span>
                  </div>
            ))}
          </div>
        )}

        {/* 图片 Lightbox */}
        {lightboxSrc && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
            onClick={() => setLightboxSrc(null)}
          >
            <button
              className="absolute top-4 right-4 p-2 text-white/60 hover:text-white bg-white/10 rounded-full transition-colors"
              onClick={() => setLightboxSrc(null)}
            >
              <X size={20} />
            </button>
            <img
              src={lightboxSrc}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={e => e.stopPropagation()}
              alt="preview"
            />
          </div>
        )}
        <div className={isUser
          ? 'max-w-[88%] bg-exo-metal border border-exo-border/60 rounded-2xl rounded-tr-sm p-4 text-sm text-exo-text whitespace-pre-wrap'
          : 'w-full prose prose-invert prose-sm max-w-none'}>
          {isUser
            ? msg.content
            : <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>{msg.content}</ReactMarkdown>}
        </div>
      </div>

      {/* Action toolbar */}
      <div className={`flex items-center gap-0.5 mt-1 ${isUser ? 'flex-row-reverse' : ''}`}>
        <button
          onClick={handleCopy}
          className="p-1.5 text-exo-muted/25 hover:text-exo-muted transition-colors rounded-lg hover:bg-white/5"
          title="复制"
        >
          {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
        </button>
        {!isUser && (
          <button
            onClick={openBookmark}
            className={`p-1.5 transition-colors rounded-lg hover:bg-exo-gold/10 ${showBookmark ? 'text-exo-gold' : 'text-exo-muted/25 hover:text-exo-gold'}`}
            title="标记到长期记忆"
          >
            <Bookmark size={12} />
          </button>
        )}
      </div>

      {/* Bookmark panel */}
      {showBookmark && (
        <div className="w-full mt-2 border border-exo-gold/15 rounded-xl bg-exo-gold/5 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-exo-gold/10 gold-line-top">
            <span className="label-caps text-exo-gold/60">划线标记到长期记忆</span>
            <button onClick={() => setShowBookmark(false)} className="text-exo-muted/50 hover:text-white transition-colors rounded p-0.5">
              <X size={12} />
            </button>
          </div>
          <div className="p-3 space-y-2">
            <textarea
              value={bookmarkText}
              onChange={e => setBookmarkText(e.target.value)}
              rows={4}
              className="w-full bg-black border border-exo-border rounded-lg px-3 py-2 text-xs text-exo-text outline-none focus:border-exo-gold/50 resize-y font-mono leading-relaxed"
              placeholder="选取要标记的内容..."
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBookmark(false)}
                className="px-3 py-1 text-exo-muted hover:text-white text-xs transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleBookmarkSubmit}
                disabled={bookmarkStatus === 'saving' || bookmarkStatus === 'done'}
                className="px-3 py-1 bg-exo-gold/10 text-exo-gold border border-exo-gold/20 rounded-lg text-xs hover:bg-exo-gold hover:text-black transition-all disabled:opacity-50"
              >
                {bookmarkStatus === 'saving' ? '提交中...'
                  : bookmarkStatus === 'done' ? '✓ 已提交'
                  : bookmarkStatus === 'error' ? '失败，重试'
                  : '发送到记忆'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default MessageBubble;