import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Activity, X, ChevronLeft } from 'lucide-react';
import MiniCalendar from '../../../components/tasks/MiniCalendar';
import { fetchEntries } from '../../../utils/tasksApi';
import { baseUrl, getCsrfToken } from '../../../utils/api';
import { getUserAvatarUrl, getAgentAvatarUrl } from '../../../utils/avatar';

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  if (/^\d{2}:\d{2}/.test(dateStr)) return dateStr.slice(0, 5);
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
};

export default function TaskPanel({ appState }) {
  const { presets } = appState;
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);
  const [taskEntries, setTaskEntries] = useState([]);
  const [tweets, setTweets] = useState([]);
  const [postContent, setPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const userAvatarUrl = getUserAvatarUrl();
  const userNick = localStorage.getItem('exo_user_nick') || 'You';

  // Fetch tasks
  useEffect(() => {
    fetchEntries({ status: 'active' })
      .then(setTaskEntries)
      .catch(() => setTaskEntries([]));
  }, []);

  // Fetch tweets
  const fetchTweets = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}/api/core/tweets/`, { credentials: 'include' });
      const data = await res.json();
      setTweets(data.tweets || []);
    } catch (err) {
      console.error('Timeline fetch failed', err);
    }
  }, []);

  useEffect(() => { fetchTweets(); }, [fetchTweets]);

  // Post tweet — always posts to today, then jumps to today
  const handlePost = async () => {
    const content = postContent.trim();
    if (!content || isPosting) return;
    setIsPosting(true);
    setPostContent('');
    try {
      const res = await fetch(`${baseUrl}/api/core/tweets/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const newTweet = await res.json();
        setTweets(prev => [{ ...newTweet, replies: newTweet.replies || [] }, ...prev]);
        setSelectedDate(today);
      } else {
        setPostContent(content);
      }
    } catch (err) {
      console.error('Post failed', err);
      setPostContent(content);
    } finally {
      setIsPosting(false);
    }
  };

  // Filter tasks by selected date
  const filteredTasks = taskEntries.filter(e => {
    if (e.status === 'suspended') return false;
    if (e.entry_type === 'todo') return e.due_date === selectedDate;
    if (e.entry_type === 'periodic') return e.next_periodic_due === selectedDate;
    if (e.entry_type === 'goal') {
      return e.cycle_start && e.cycle_due && selectedDate >= e.cycle_start && selectedDate <= e.cycle_due;
    }
    return false;
  });

  // Filter tweets by selected date
  const filteredTweets = tweets.filter(t => {
    if (!t.created_at) return false;
    return t.created_at.slice(0, 10) === selectedDate;
  });

  const getAuthorInfo = (tweet) => {
    if (tweet.author === 'user') {
      return { name: userNick, avatar: userAvatarUrl, isUser: true };
    }
    const presetId = parseInt(tweet.author.split(':')[1]);
    const preset = presets?.find(p => p.id === presetId);
    return { name: preset?.name || 'Agent', avatar: getAgentAvatarUrl(presetId, preset?.name), isUser: false };
  };

  const typeIcon = (entryType) => {
    if (entryType === 'todo') return '○';
    if (entryType === 'periodic') return '↻';
    if (entryType === 'goal') return '◎';
    return '·';
  };

  // --- Calendar sidebar (shared between desktop and mobile) ---
  const calendarPanel = (
    <div className="flex flex-col h-full">
      <div className="p-3 md:p-4">
        <MiniCalendar
          selectedDate={selectedDate}
          onSelectDate={(d) => { setSelectedDate(d); setShowCalendar(false); }}
          entries={taskEntries}
        />
      </div>
      {/* Tasks below calendar */}
      <div className="flex-1 overflow-y-auto px-3 md:px-4 pb-4">
        <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-exo-muted mb-2">
          Tasks · {selectedDate}
        </p>
        {filteredTasks.length === 0 ? (
          <p className="text-[10px] text-exo-muted/60 italic">No tasks</p>
        ) : (
          <div className="space-y-1">
            {filteredTasks.map(task => (
              <div
                key={task.id}
                className={`px-2.5 py-1.5 bg-exo-pure border border-exo-mist-8 rounded text-xs ${
                  task.status === 'suspended' ? 'opacity-40 line-through' : ''
                }`}
              >
                <span className="text-exo-accent mr-1.5">{typeIcon(task.entry_type)}</span>
                <span className="text-exo-text/80">{task.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex-1 h-full flex bg-exo-bg overflow-hidden">
      {/* Desktop: fixed left sidebar */}
      <div className="hidden md:flex w-64 flex-shrink-0 border-r border-exo-mist-8 flex-col">
        {calendarPanel}
      </div>

      {/* Mobile: slide-over calendar backdrop */}
      {showCalendar && (
        <div className="md:hidden fixed inset-0 z-[130]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCalendar(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-exo-pure border-r border-exo-mist-8 shadow-2xl z-[140]">
            <div className="flex items-center justify-between px-3 py-2 border-b border-exo-mist-8">
              <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-exo-muted">Calendar</span>
              <button onClick={() => setShowCalendar(false)} className="p-1 text-exo-muted hover:text-exo-text">
                <X size={14} />
              </button>
            </div>
            {calendarPanel}
          </div>
        </div>
      )}

      {/* Right: Timeline-style main area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Mobile header with date + calendar toggle */}
        <div className="md:hidden flex-shrink-0 h-10 border-b border-exo-mist-8 flex items-center px-3 gap-2 bg-exo-pure">
          <button onClick={() => setShowCalendar(true)} className="p-1 text-exo-muted hover:text-exo-accent">
            <ChevronLeft size={16} strokeWidth={1.5} />
          </button>
          <span className="text-[10px] font-mono text-exo-muted">{selectedDate}</span>
          <div className="flex-1" />
          <span className="text-[9px] font-mono text-exo-muted">{filteredTasks.length} tasks</span>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-8">
            {/* Date indicator (desktop) */}
            <div className="hidden md:flex items-center gap-3">
              <h3 className="text-xs font-medium text-white">{selectedDate}</h3>
              <span className="text-[9px] font-mono text-exo-muted">{filteredTasks.length} tasks · {filteredTweets.length} posts</span>
            </div>

            {/* Post Box — always visible, Timeline style */}
            <div className="bg-exo-pure/40 border border-exo-mist-8 rounded-md p-4 md:p-5">
              <div className="flex gap-3 md:gap-4">
                <img
                  src={userAvatarUrl}
                  className="w-10 h-10 md:w-11 md:h-11 rounded-full border border-exo-mist-10 bg-black object-cover shrink-0"
                  alt={userNick}
                />
                <div className="flex-1 space-y-3">
                  <textarea
                    rows={2}
                    value={postContent}
                    onChange={e => setPostContent(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey && !e.isComposing) { e.preventDefault(); handlePost(); } }}
                    placeholder="Inscribe thought to timeline..."
                    className="w-full bg-transparent text-[13px] text-white outline-none resize-none placeholder:text-exo-muted/30 font-mono leading-relaxed"
                  />
                  <div className="flex justify-between items-center pt-3 border-t border-exo-mist-6">
                    <span className="text-[8px] text-exo-muted font-mono uppercase opacity-40 hidden md:block">Markdown & Links Supported</span>
                    <button
                      onClick={handlePost}
                      disabled={!postContent.trim() || isPosting}
                      className="px-5 py-1.5 bg-white text-exo-pure text-[10px] font-bold rounded-[2px] hover:bg-exo-accent transition-all shadow-brutalist active:scale-95 disabled:opacity-30 flex items-center gap-1.5 uppercase tracking-widest ml-auto"
                    >
                      {isPosting ? <Activity size={11} className="animate-spin" /> : <Send size={11} />}
                      Inscribe
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tasks quick list (mobile — shown inline) */}
            <div className="md:hidden">
              {filteredTasks.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-exo-muted mb-2">Tasks</p>
                  {filteredTasks.map(task => (
                    <div key={task.id} className="px-3 py-2 bg-exo-pure border border-exo-mist-8 rounded text-xs flex items-center gap-2">
                      <span className="text-exo-accent">{typeIcon(task.entry_type)}</span>
                      <span className="text-exo-text/80 truncate">{task.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Timeline posts for selected day */}
            {filteredTweets.length > 0 ? (
              <div className="space-y-0 divide-y divide-exo-mist-4">
                {filteredTweets.map(tweet => {
                  const { name, avatar, isUser } = getAuthorInfo(tweet);
                  return (
                    <div key={tweet.id} className="py-4 md:py-5">
                      <div className="flex gap-3 md:gap-4">
                        <div className="relative shrink-0">
                          <img
                            src={avatar}
                            className={`w-9 h-9 md:w-10 md:h-10 rounded-full border bg-black object-cover shadow-sm ${isUser ? 'border-exo-mist-20' : 'border-exo-accent/40'}`}
                            alt={name}
                          />
                          {!isUser && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-exo-accent rounded-full border-2 border-exo-bg shadow-glow-sharp" title="Neural Agent" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-baseline gap-2">
                            <span className={`text-[12px] font-bold uppercase tracking-tight font-display ${isUser ? 'text-white' : 'text-exo-accent'}`}>{name}</span>
                            <span className="text-[8px] text-exo-muted font-mono opacity-40">[{formatTime(tweet.created_at)}]</span>
                          </div>
                          <p className="text-[13px] text-exo-text/90 whitespace-pre-wrap leading-relaxed">{tweet.content}</p>
                          {/* Replies */}
                          {tweet.replies && tweet.replies.length > 0 && (
                            <div className="mt-2 ml-2 pl-3 border-l border-exo-mist-6 space-y-1.5">
                              {tweet.replies.map(reply => {
                                const rInfo = getAuthorInfo(reply);
                                return (
                                  <div key={reply.id}>
                                    <div className="flex items-baseline gap-2">
                                      <span className={`text-[10px] font-bold uppercase ${rInfo.isUser ? 'text-white/70' : 'text-exo-accent/60'}`}>{rInfo.name}</span>
                                      <span className="text-[7px] text-exo-muted font-mono opacity-30">[{formatTime(reply.created_at)}]</span>
                                    </div>
                                    <p className="text-[11px] text-exo-text/70 mt-0.5">{reply.content}</p>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-exo-muted/20 font-mono text-[10px] uppercase tracking-widest italic">
                {selectedDate === today ? 'No log entries today' : 'No log entries for this date'}
              </div>
            )}

            {/* Invisible divider + New Task/Event area placeholder */}
            <div className="border-t border-exo-mist-4 pt-6">
              <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-exo-muted/50 mb-3">New Entry</p>
              <div className="bg-exo-pure/20 border border-dashed border-exo-mist-8 rounded-md p-6 text-center">
                <p className="text-xs text-exo-muted/40 font-mono">Task & event creation — coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
