import React, { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import MiniCalendar from './MiniCalendar';
import TaskRow from './TaskRow';
import TaskCreateModal from './TaskCreateModal';
import {
  fetchEntries, completeEntry, updateEntry, deleteEntry,
  suspendEntry, resumeEntry, syncGcal, unsyncGcal,
} from '../../utils/tasksApi';

const todayIso = () => new Date().toISOString().slice(0, 10);

const TYPE_TABS = [
  { value: 'all',      label: '全部' },
  { value: 'todo',     label: 'Todo' },
  { value: 'periodic', label: '周期' },
  { value: 'goal',     label: '目标' },
];

const STATUS_OPTS = [
  { value: 'active',    label: '进行中' },
  { value: 'suspended', label: '已挂起' },
];

export default function TaskPanel({ openDestructor }) {
  const [entries,      setEntries]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [typeFilter,   setTypeFilter]   = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [expandedId,   setExpandedId]   = useState(null);
  const [modalEntry,   setModalEntry]   = useState(null); // null=closed, {}=create, entry=edit

  const load = useCallback(() => {
    setLoading(true);
    fetchEntries({ status: statusFilter })
      .then(data => setEntries(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const toggleExpand = (id) => setExpandedId(p => p === id ? null : id);

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left sidebar ── */}
      <div className="w-[220px] flex-shrink-0 bg-exo-panel border-r border-exo-border flex flex-col overflow-y-auto">
        <MiniCalendar
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          entries={entries}
        />

        {/* Type filter */}
        <div className="px-4 py-3 border-t border-white/5">
          <div className="text-[9px] uppercase tracking-widest text-exo-muted/30 mb-2">Type</div>
          {TYPE_TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setTypeFilter(t.value)}
              className={[
                'flex items-center gap-2 w-full text-xs py-1.5 px-2 rounded-lg transition-colors text-left',
                typeFilter === t.value
                  ? 'text-exo-accent bg-exo-accent/10'
                  : 'text-exo-muted/50 hover:text-exo-muted hover:bg-white/5',
              ].join(' ')}
            >
              <span className={[
                'w-1.5 h-1.5 rounded-full flex-shrink-0',
                typeFilter === t.value ? 'bg-exo-accent' : 'bg-exo-muted/20',
              ].join(' ')} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="px-4 py-3 border-t border-white/5">
          <div className="text-[9px] uppercase tracking-widest text-exo-muted/30 mb-2">Status</div>
          {STATUS_OPTS.map(s => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={[
                'flex items-center gap-2 w-full text-xs py-1.5 px-2 rounded-lg transition-colors text-left',
                statusFilter === s.value
                  ? 'text-exo-accent bg-exo-accent/10'
                  : 'text-exo-muted/50 hover:text-exo-muted hover:bg-white/5',
              ].join(' ')}
            >
              <span className={[
                'w-1.5 h-1.5 rounded-full flex-shrink-0',
                statusFilter === s.value ? 'bg-exo-accent' : 'bg-exo-muted/20',
              ].join(' ')} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Right pane ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
          <span className="text-[10px] uppercase tracking-[0.2em] text-exo-muted/40">· · Chronos System · ·</span>
          <button
            onClick={() => setModalEntry({})}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-exo-border/60 rounded-xl text-exo-muted/50 hover:text-exo-accent hover:border-exo-accent/30 transition-all"
          >
            <Plus size={12} />
            新建任务
          </button>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-32 text-xs text-exo-muted/30 tracking-widest uppercase">
              加载中...
            </div>
          )}
          {!loading && entries.length === 0 && (
            <div className="flex items-center justify-center h-32 text-xs text-exo-muted/20 tracking-widest uppercase">
              暂无任务
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalEntry !== null && (
        <TaskCreateModal
          entry={Object.keys(modalEntry).length ? modalEntry : null}
          onClose={() => setModalEntry(null)}
          onSave={() => { setModalEntry(null); load(); }}
        />
      )}
    </div>
  );
}
