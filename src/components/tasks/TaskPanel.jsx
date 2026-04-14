import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Filter, X } from 'lucide-react';
import MiniCalendar from './MiniCalendar';
import TaskCreateModal from './TaskCreateModal';
import TaskRow from './TaskRow';
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

function SectionHeader({ label }) {
  return (
    <div className="px-4 pt-4 pb-1.5 text-[9px] uppercase tracking-widest text-exo-muted/30 border-b border-white/[0.03]">
      {label}
    </div>
  );
}

export default function TaskPanel({ openDestructor }) {
  const [entries,      setEntries]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [typeFilter,   setTypeFilter]   = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [expandedId,   setExpandedId]   = useState(null);
  const [modalEntry,   setModalEntry]   = useState(null); // null=closed, {}=create, entry=edit
  const [showSidebar,  setShowSidebar]  = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchEntries({ status: statusFilter })
      .then(data => setEntries(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const toggleExpand = (id) => setExpandedId(p => p === id ? null : id);

  // ── Filter ──────────────────────────────────────────────────
  const matchesDate = (e) => {
    if (e.entry_type === 'todo')     return e.due_date          === selectedDate;
    if (e.entry_type === 'periodic') return e.next_periodic_due === selectedDate;
    if (e.entry_type === 'goal') {
      if (!e.cycle_start) return false;
      return e.cycle_start <= selectedDate && (!e.cycle_due || selectedDate <= e.cycle_due);
    }
    return false;
  };

  const matchesType = (e) => typeFilter === 'all' || e.entry_type === typeFilter;

  const filtered = entries.filter(e => matchesDate(e) && matchesType(e));

  const pinned   = filtered.filter(e => e.is_pinned);
  const todos    = filtered.filter(e => !e.is_pinned && e.entry_type === 'todo');
  const periodic = filtered.filter(e => !e.is_pinned && e.entry_type === 'periodic');
  const goals    = filtered.filter(e => !e.is_pinned && e.entry_type === 'goal');

  // ── Mutations ────────────────────────────────────────────────
  const mutate = (fn) => fn().then(load).catch(console.error);

  const handleComplete   = (id) => mutate(() => completeEntry(id));
  const handleUpdate     = (id, patch) => mutate(() => updateEntry(id, patch));
  const handleSuspend    = (id) => mutate(() => suspendEntry(id));
  const handleResume     = (id) => mutate(() => resumeEntry(id));
  const handleGcalSync   = (id) => mutate(() => syncGcal(id));
  const handleGcalUnsync = (id) => mutate(() => unsyncGcal(id));
  const handleEdit       = (entry) => setModalEntry(entry);

  const handleDelete = (id) => openDestructor({
    title: '删除任务',
    description: '此操作将归档该任务，无法撤销。',
    onDelete: () => mutate(() => deleteEntry(id)),
  });

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Sidebar Overlay for Mobile */}
      <div 
        className={`lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] transition-opacity duration-300 ${showSidebar ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setShowSidebar(false)}
      />

      {/* ── Left sidebar ── */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 w-[260px] lg:w-[220px] bg-exo-panel border-r border-exo-border flex flex-col z-[100] transition-transform duration-300 ease-out
        ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center justify-between px-4 py-4 lg:hidden">
          <span className="text-xs font-bold text-exo-accent tracking-widest uppercase">Filters</span>
          <button onClick={() => setShowSidebar(false)} className="p-1 text-exo-muted hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <MiniCalendar
            selectedDate={selectedDate}
            onSelectDate={(date) => { setSelectedDate(date); if(window.innerWidth < 1024) setShowSidebar(false); }}
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
      </div>

      {/* ── Right pane ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-noise">
        {/* Header */}
        <div className="flex items-center justify-between px-4 lg:px-6 py-4 border-b border-white/5 flex-shrink-0 bg-[#05060A]/40 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowSidebar(true)}
              className="lg:hidden p-2 -ml-2 text-exo-muted hover:text-exo-accent transition-colors"
            >
              <Filter size={18} />
            </button>
            <span className="text-[10px] uppercase tracking-[0.2em] text-exo-muted/40 font-mono">· · Chronos System · ·</span>
          </div>
          
          <button
            onClick={() => setModalEntry({})}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-exo-border/60 rounded-xl text-exo-muted/50 hover:text-exo-accent hover:border-exo-accent/30 transition-all bg-white/5"
          >
            <Plus size={12} />
            <span className="hidden sm:inline">新建任务</span>
            <span className="sm:hidden">新建</span>
          </button>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-32 text-xs text-exo-muted/30 tracking-widest uppercase">
              加载中...
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="flex items-center justify-center h-32 text-xs text-exo-muted/20 tracking-widest uppercase">
              {selectedDate} 无任务
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="pb-20 lg:pb-8">
              {/* 📌 Pinned */}
              {pinned.length > 0 && (
                <div className="mx-4 mt-4 border border-exo-accent/30 bg-exo-accent/[0.04] rounded-xl overflow-hidden shadow-[0_0_20px_rgba(212,175,55,0.05)]">
                  <div className="px-4 pt-3 pb-1 text-[9px] uppercase tracking-widest text-exo-accent/50">
                    📌 置顶 / Escalated
                  </div>
                  {pinned.map(e => (
                    <TaskRow
                      key={e.id}
                      entry={e}
                      isExpanded={expandedId === e.id}
                      onToggleExpand={toggleExpand}
                      onEdit={handleEdit}
                      onComplete={handleComplete}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                      onSuspend={handleSuspend}
                      onResume={handleResume}
                      onGcalSync={handleGcalSync}
                      onGcalUnsync={handleGcalUnsync}
                    />
                  ))}
                </div>
              )}

              {/* Todo */}
              {todos.length > 0 && (
                <div className="mt-4">
                  <SectionHeader label="Todo" />
                  {todos.map(e => (
                    <TaskRow
                      key={e.id}
                      entry={e}
                      isExpanded={expandedId === e.id}
                      onToggleExpand={toggleExpand}
                      onEdit={handleEdit}
                      onComplete={handleComplete}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                      onSuspend={handleSuspend}
                      onResume={handleResume}
                      onGcalSync={handleGcalSync}
                      onGcalUnsync={handleGcalUnsync}
                    />
                  ))}
                </div>
              )}

              {/* 周期任务 */}
              {periodic.length > 0 && (
                <div className="mt-4">
                  <SectionHeader label="周期任务" />
                  {periodic.map(e => (
                    <TaskRow
                      key={e.id}
                      entry={e}
                      isExpanded={expandedId === e.id}
                      onToggleExpand={toggleExpand}
                      onEdit={handleEdit}
                      onComplete={handleComplete}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                      onSuspend={handleSuspend}
                      onResume={handleResume}
                      onGcalSync={handleGcalSync}
                      onGcalUnsync={handleGcalUnsync}
                    />
                  ))}
                </div>
              )}

              {/* 目标 */}
              {goals.length > 0 && (
                <div className="mt-4">
                  <SectionHeader label="目标" />
                  {goals.map(e => (
                    <TaskRow
                      key={e.id}
                      entry={e}
                      isExpanded={expandedId === e.id}
                      onToggleExpand={toggleExpand}
                      onEdit={handleEdit}
                      onComplete={handleComplete}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                      onSuspend={handleSuspend}
                      onResume={handleResume}
                      onGcalSync={handleGcalSync}
                      onGcalUnsync={handleGcalUnsync}
                    />
                  ))}
                </div>
              )}
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
