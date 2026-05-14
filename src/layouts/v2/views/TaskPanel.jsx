import React, { useState, useEffect } from 'react';
import { Clock, MessageSquare } from 'lucide-react';
import MiniCalendar from '../../../components/tasks/MiniCalendar';
import { fetchEntries } from '../../../utils/tasksApi';
import { baseUrl } from '../../../utils/api';

export default function TaskPanel({ appState }) {
  const { presets } = appState;
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);
  const [taskEntries, setTaskEntries] = useState([]);
  const [tweets, setTweets] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch tasks
  useEffect(() => {
    fetchEntries({ status: 'active' })
      .then(setTaskEntries)
      .catch(() => setTaskEntries([]));
  }, []);

  // Fetch tweets
  useEffect(() => {
    setLoading(true);
    fetch(`${baseUrl}/api/core/tweets/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setTweets(data.tweets || []))
      .catch(() => setTweets([]))
      .finally(() => setLoading(false));
  }, []);

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

  // Filter tweets by selected date — root posts matching the date
  const filteredTweets = tweets.filter(t => {
    if (!t.created_at) return false;
    return t.created_at.slice(0, 10) === selectedDate;
  });

  // Resolve author name from presets
  const getAuthorName = (author) => {
    if (!author || author === 'user') return 'You';
    const match = author.match(/^preset:(\d+)$/);
    if (match) {
      const preset = presets.find(p => p.id === Number(match[1]));
      return preset ? preset.name : 'Agent';
    }
    return author;
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const typeIcon = (entryType) => {
    if (entryType === 'todo') return '○';
    if (entryType === 'periodic') return '↻';
    if (entryType === 'goal') return '◎';
    return '·';
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-exo-bg overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-exo-mist-8 px-6 md:px-12 py-4 flex items-center gap-4">
        <h2 className="text-sm font-medium text-white">任务与时序</h2>
        <div className="flex-1" />
        <span className="text-[10px] font-mono text-exo-muted">{selectedDate}</span>
      </div>

      {/* Body: Calendar + Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Calendar sidebar */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-exo-mist-8 p-4 flex-shrink-0">
          <MiniCalendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            entries={taskEntries}
          />
        </div>

        {/* Content for selected date */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">
          {/* Tasks Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={14} strokeWidth={1.5} className="text-exo-accent" />
              <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] text-exo-muted">Tasks</h3>
              {filteredTasks.length > 0 && (
                <span className="text-[10px] font-mono text-exo-muted">({filteredTasks.length})</span>
              )}
            </div>
            {filteredTasks.length === 0 ? (
              <p className="text-xs text-exo-muted py-4">No tasks for this day</p>
            ) : (
              <div className="space-y-1.5">
                {filteredTasks.map(task => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 px-3 py-2.5 bg-exo-pure border border-exo-mist-8 rounded-md ${
                      task.status === 'suspended' ? 'opacity-50' : ''
                    }`}
                  >
                    <span className="text-exo-accent text-xs font-mono">{typeIcon(task.entry_type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs truncate ${task.status === 'suspended' ? 'line-through text-exo-muted' : 'text-white'}`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-[9px] text-exo-muted truncate mt-0.5">{task.description}</p>
                      )}
                    </div>
                    {task.entry_type === 'goal' && task.current_cycle_completions != null && (
                      <span className="text-[9px] text-exo-muted font-mono">
                        {task.current_cycle_completions}/{task.goal_count || '·'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Timeline Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={14} strokeWidth={1.5} className="text-purple-400" />
              <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] text-exo-muted">Timeline</h3>
              {filteredTweets.length > 0 && (
                <span className="text-[10px] font-mono text-exo-muted">({filteredTweets.length})</span>
              )}
            </div>
            {loading && tweets.length === 0 ? (
              <p className="text-xs text-exo-muted py-4">Loading...</p>
            ) : filteredTweets.length === 0 ? (
              <p className="text-xs text-exo-muted py-4">No posts for this day</p>
            ) : (
              <div className="space-y-3">
                {filteredTweets.map(tweet => (
                  <div key={tweet.id} className="bg-exo-pure border border-exo-mist-8 rounded-md p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-medium text-exo-accent/80">{getAuthorName(tweet.author)}</span>
                      <span className="text-[9px] text-exo-muted">{formatTime(tweet.created_at)}</span>
                    </div>
                    <p className="text-xs text-exo-text whitespace-pre-wrap">{tweet.content}</p>
                    {tweet.replies && tweet.replies.length > 0 && (
                      <div className="mt-2 ml-3 pl-3 border-l border-exo-mist-6 space-y-1.5">
                        {tweet.replies.map(reply => (
                          <div key={reply.id}>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[9px] font-medium text-exo-accent/60">{getAuthorName(reply.author)}</span>
                              <span className="text-[8px] text-exo-muted">{formatTime(reply.created_at)}</span>
                            </div>
                            <p className="text-[11px] text-exo-text/80 whitespace-pre-wrap">{reply.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
