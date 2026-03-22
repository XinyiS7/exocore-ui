import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Activity, CornerDownLeft, Camera } from 'lucide-react';
import { baseUrl, getCsrfToken } from '../utils/api';
import { getUserAvatarUrl, getAgentAvatarUrl } from '../utils/avatar';
import AvatarCropModal from './modals/AvatarCropModal';

const formatTime = (dateStr) => {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
};

const UserProfile = ({ presets }) => {
  const [tweets, setTweets] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextBeforeId, setNextBeforeId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const bottomRef = useRef(null);
  const avatarInputRef = useRef(null);
  const [userAvatarUrl, setUserAvatarUrl] = useState(() => getUserAvatarUrl());
  const [cropFile, setCropFile] = useState(null);

  const userNick = localStorage.getItem('exo_user_nick') || 'You';

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropFile(file);
    e.target.value = '';
  };

  const getAuthorInfo = (tweet) => {
    if (tweet.author === 'user') {
      return {
        name: userNick,
        avatar: userAvatarUrl,
        isUser: true,
      };
    }
    // author 格式："agent:{preset_id}"，如 "agent:1"
    const presetId = parseInt(tweet.author.split(':')[1]);
    const preset = presets?.find(p => p.id === presetId);
    const name = preset?.name || 'G045';
    return {
      name,
      avatar: getAgentAvatarUrl(presetId, name),
      isUser: false,
    };
  };

  const fetchTweets = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/userprofile/tweets/`, { credentials: 'include' });
      const data = await res.json();
      setTweets(data.tweets || []);
      setHasMore(data.has_more);
      setNextBeforeId(data.next_before_id);
    } catch (err) {
      console.error('Timeline fetch failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMoreTweets = useCallback(async () => {
    if (!nextBeforeId || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const res = await fetch(`${baseUrl}/api/userprofile/tweets/?before_id=${nextBeforeId}`, { credentials: 'include' });
      const data = await res.json();
      setTweets(prev => [...prev, ...(data.tweets || [])]);
      setHasMore(data.has_more);
      setNextBeforeId(data.next_before_id);
    } catch (err) {
      console.error('Load more failed', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextBeforeId, isLoadingMore, hasMore]);

  // 进入分页时拉取一次
  useEffect(() => {
    fetchTweets();
  }, []);

  // 滚到底部时触发加载
  useEffect(() => {
    const sentinel = bottomRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) fetchMoreTweets(); },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchMoreTweets]);

  const handlePost = async () => {
    const content = newPostContent.trim();
    if (!content || isPosting) return;
    setIsPosting(true);
    setNewPostContent('');
    try {
      const res = await fetch(`${baseUrl}/api/userprofile/tweets/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const newTweet = await res.json();
        setTweets(prev => [{ ...newTweet, replies: newTweet.replies || [] }, ...prev]);
      } else {
        setNewPostContent(content);
      }
    } catch (err) {
      console.error('Post failed', err);
      setNewPostContent(content);
    } finally {
      setIsPosting(false);
    }
  };

  const addReplyToTree = (tweetList, parentId, newReply) =>
    tweetList.map(tweet => {
      if (tweet.id === parentId) {
        return { ...tweet, replies: [...(tweet.replies || []), { ...newReply, replies: [] }] };
      }
      if (tweet.replies?.length) {
        return {
          ...tweet,
          replies: tweet.replies.map(r =>
            r.id === parentId
              ? { ...r, replies: [...(r.replies || []), { ...newReply, replies: [] }] }
              : r
          ),
        };
      }
      return tweet;
    });

  const handleReply = async (parentId) => {
    const content = replyContent.trim();
    if (!content || isSubmittingReply) return;
    setIsSubmittingReply(true);
    setReplyContent('');
    setReplyingToId(null);
    try {
      const res = await fetch(`${baseUrl}/api/userprofile/tweets/${parentId}/reply/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const newReply = await res.json();
        setTweets(prev => addReplyToTree(prev, parentId, newReply));
      }
    } catch (err) {
      console.error('Reply failed', err);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-exo-bg overflow-hidden">
      {cropFile && (
        <AvatarCropModal
          file={cropFile}
          onConfirm={(dataUrl) => {
            localStorage.setItem('exo_user_avatar_url', dataUrl);
            setUserAvatarUrl(dataUrl);
            setCropFile(null);
          }}
          onCancel={() => setCropFile(null)}
        />
      )}
      <div className="h-14 border-b border-exo-border flex items-center px-6 bg-exo-panel/50 backdrop-blur-md shrink-0">
        <span className="font-bold text-sm text-exo-text tracking-widest uppercase">Timeline</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4">

          {/* 发帖框 */}
          <div className="bg-exo-panel border border-exo-border rounded-xl p-4 mb-4">
            <div className="flex gap-3">
              <div
                className="relative shrink-0 cursor-pointer group"
                onClick={() => avatarInputRef.current?.click()}
                title="点击更换头像"
              >
                <img
                  src={userAvatarUrl}
                  className="w-10 h-10 rounded-full border border-white/20 bg-black object-cover"
                  alt={userNick}
                />
                <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera size={12} className="text-white" />
                </div>
                <input type="file" ref={avatarInputRef} accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
              <div className="flex-1">
                <textarea
                  rows={3}
                  value={newPostContent}
                  onChange={e => setNewPostContent(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey && !e.isComposing) { e.preventDefault(); handlePost(); } }}
                  placeholder="有什么想说的？"
                  className="w-full bg-transparent text-sm text-exo-text outline-none resize-none placeholder:text-exo-muted/40"
                />
                <div className="flex justify-end pt-2 border-t border-exo-border/30">
                  <button
                    onClick={handlePost}
                    disabled={!newPostContent.trim() || isPosting}
                    className="px-5 py-1.5 bg-exo-gold text-black text-xs font-bold rounded-full hover:bg-yellow-400 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                  >
                    {isPosting ? <Activity size={12} className="animate-spin" /> : <Send size={12} />}
                    发布
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 时间线 */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-exo-muted text-sm gap-2">
              <Activity size={16} className="animate-spin" /> 加载中...
            </div>
          ) : tweets.length === 0 ? (
            <div className="text-center py-20 text-exo-muted/40 text-sm">还没有任何记录</div>
          ) : (
            <div className="divide-y divide-exo-border/20">
              {tweets.map(tweet => (
                <TweetCard
                  key={tweet.id}
                  tweet={tweet}
                  depth={0}
                  replyingToId={replyingToId}
                  replyContent={replyContent}
                  setReplyContent={setReplyContent}
                  setReplyingToId={setReplyingToId}
                  isSubmittingReply={isSubmittingReply}
                  handleReply={handleReply}
                  getAuthorInfo={getAuthorInfo}
                />
              ))}
            </div>
          )}

          {/* 无限滚动哨兵 */}
          <div ref={bottomRef} className="h-1" />

          {isLoadingMore && (
            <div className="flex items-center justify-center py-4 text-exo-muted text-xs gap-2">
              <Activity size={12} className="animate-spin" /> 加载更多...
            </div>
          )}

          {!hasMore && tweets.length > 0 && !isLoading && (
            <p className="text-center py-8 text-exo-muted/40 text-xs">啊噢，已经到底啦~</p>
          )}
        </div>
      </div>
    </div>
  );
};

const TweetCard = ({
  tweet,
  depth,
  replyingToId,
  replyContent,
  setReplyContent,
  setReplyingToId,
  isSubmittingReply,
  handleReply,
  getAuthorInfo
}) => {
  const { name, avatar, isUser } = getAuthorInfo(tweet);
  const isReplyingHere = replyingToId === tweet.id;

  return (
    <div className={depth > 0 ? 'ml-10 pl-4 border-l-2 border-exo-border/30' : ''}>
      <div className="flex gap-3 py-3">
        <img
          src={avatar}
          className={`w-9 h-9 rounded-full border shrink-0 bg-black object-cover ${isUser ? 'border-white/20' : 'border-exo-gold/50'}`}
          alt={name}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className={`text-sm font-bold ${isUser ? 'text-exo-text' : 'text-exo-gold'}`}>{name}</span>
            <span className="text-[10px] text-exo-muted/50 font-mono">{formatTime(tweet.created_at)}</span>
          </div>
          <p className="text-sm text-exo-text/90 leading-relaxed whitespace-pre-wrap break-words">{tweet.content}</p>
          <button
            onClick={() => { setReplyingToId(isReplyingHere ? null : tweet.id); setReplyContent(''); }}
            className="mt-2 text-[11px] text-exo-muted/50 hover:text-exo-gold transition-colors flex items-center gap-1"
          >
            <CornerDownLeft size={11} /> 回复
          </button>
          {isReplyingHere && (
            <div className="mt-3 flex gap-2 items-end">
              <textarea
                rows={2}
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey && !e.isComposing) { e.preventDefault(); handleReply(tweet.id); } }}
                placeholder={`回复 ${name}...`}
                autoFocus
                className="flex-1 bg-black/50 border border-exo-border rounded-lg px-3 py-2 text-sm text-exo-text outline-none focus:border-exo-gold/50 resize-none transition-colors"
              />
              <button
                onClick={() => handleReply(tweet.id)}
                disabled={!replyContent.trim() || isSubmittingReply}
                className="px-3 py-2 bg-exo-gold text-black text-xs font-bold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition-colors flex items-center gap-1 shrink-0"
              >
                <Send size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
      {tweet.replies?.map(reply => (
        <TweetCard
          key={reply.id}
          tweet={reply}
          depth={depth + 1}
          replyingToId={replyingToId}
          replyContent={replyContent}
          setReplyContent={setReplyContent}
          setReplyingToId={setReplyingToId}
          isSubmittingReply={isSubmittingReply}
          handleReply={handleReply}
          getAuthorInfo={getAuthorInfo}
        />
      ))}
    </div>
  );
};

export default UserProfile;
