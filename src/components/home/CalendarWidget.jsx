import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Calendar, CheckCircle2, Circle, ChevronLeft, ChevronRight, Target, RefreshCw } from 'lucide-react';
import { 
  fetchEntries, completeEntry, deleteEntry, createEntry 
} from '../../utils/tasksApi';

const REPEAT_OPTIONS = [
  { value: 'none',    label: '不重复' },
  { value: 'daily',   label: '每天' },
  { value: 'weekly',  label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'yearly',  label: '每年' },
];

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

function buildCalendarGrid(year, month) {
  const firstDow = new Date(year, month, 1).getDay();
  const startOffset = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

const EmptyForm = { title: '', deadline: '', repeat: 'none', note: '' };

export default function CalendarWidget() {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [entries, setEntries]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm]           = useState(EmptyForm);

  // ── 拉取任务列表 ───────────────────────────────────────────
  const load = useCallback(() => {
    setLoading(true);
    fetchEntries({ status: 'active' })
      .then(data => setEntries(Array.isArray(data) ? data : []))
      .catch(err => console.error('任务列表拉取失败:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── CRUD ─────────────────────────────────────────────────────
  const addTask = () => {
    if (!form.title.trim()) return;
    
    // 映射到 TaskEntry 结构
    const payload = {
      title: form.title.trim(),
      entry_type: 'todo', // 首页默认添加 todo
      due_date: form.deadline || selectedDate,
      description: form.note.trim() || null,
      // 后端目前用 entry_type 区分，不直接用 repeat 字符串，但可以根据需求扩展
    };

    createEntry(payload)
      .then(newEntry => {
        setEntries(prev => [newEntry, ...prev]);
        setForm(EmptyForm);
        setShowAddForm(false);
      })
      .catch(err => console.error('任务创建失败:', err));
  };

  const handleToggle = (id) => {
    completeEntry(id)
      .then(() => load()) // 重新加载以更新状态（可能导致任务移出 active 列表）
      .catch(err => console.error('任务完成操作失败:', err));
  };

  const handleDelete = (id) => {
    if (!window.confirm('确定要删除此任务吗？')) return;
    deleteEntry(id)
      .then(() => setEntries(prev => prev.filter(e => e.id !== id)))
      .catch(err => console.error('任务删除失败:', err));
  };

  // ── 日历计算 ─────────────────────────────────────────────────
  const cells = buildCalendarGrid(viewYear, viewMonth);
  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const isSelected = (d) => {
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return iso === selectedDate;
  };

  const isTodayDate = (d) =>
    d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

  const getIso = (d) => `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  // 计算哪些天有任务
  const dotDays = new Set();
  entries.forEach(e => {
    if (e.entry_type === 'todo' && e.due_date) dotDays.add(e.due_date);
    if (e.entry_type === 'periodic' && e.next_periodic_due) dotDays.add(e.next_periodic_due);
    if (e.entry_type === 'goal' && e.cycle_start && e.cycle_due) {
      let cur = new Date(e.cycle_start);
      const end = new Date(e.cycle_due);
      // 防止死循环或跨度过大导致性能问题，限制在当前视角月内或合理范围内
      while (cur <= end) {
        dotDays.add(cur.toISOString().slice(0, 10));
        cur.setDate(cur.getDate() + 1);
        if (dotDays.size > 1000) break; // 安全阈值
      }
    }
  });

  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });

  // 过滤当前选中日期的任务
  const filteredEntries = entries.filter(e => {
    if (e.entry_type === 'todo') return e.due_date === selectedDate;
    if (e.entry_type === 'periodic') return e.next_periodic_due === selectedDate;
    if (e.entry_type === 'goal') {
      return e.cycle_start <= selectedDate && (!e.cycle_due || selectedDate <= e.cycle_due);
    }
    return false;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6">

      {/* ── 左列：日历网格 ──────────────────────────────────── */}
      <div className="flex-shrink-0 lg:w-64">
        <div className="bg-exo-surface border border-exo-border/50 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 accent-line-top">
            <button onClick={prevMonth} className="p-1 text-exo-muted hover:text-exo-accent transition-colors"><ChevronLeft size={14} /></button>
            <span className="label-caps text-exo-text/70">{monthName}</span>
            <button onClick={nextMonth} className="p-1 text-exo-muted hover:text-exo-accent transition-colors"><ChevronRight size={14} /></button>
          </div>

          <div className="grid grid-cols-7 px-3 pb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center label-caps text-exo-muted/40 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 px-3 pb-3 gap-y-0.5">
            {cells.map((d, i) => {
              const iso = d ? getIso(d) : null;
              const hasDot = iso && dotDays.has(iso);
              const selected = d && isSelected(d);
              const today_ = d && isTodayDate(d);

              return (
                <div key={i} className="flex items-center justify-center h-8 relative">
                  {d && (
                    <button 
                      onClick={() => setSelectedDate(iso)}
                      className={`w-7 h-7 flex items-center justify-center rounded-full text-xs transition-all relative
                        ${selected
                          ? 'bg-exo-accent text-black font-bold'
                          : today_
                          ? 'border border-exo-accent/40 text-exo-accent'
                          : 'text-exo-text/60 hover:bg-white/5 hover:text-exo-text'
                        }`}
                    >
                      {d}
                      {hasDot && !selected && (
                        <span className="absolute bottom-1 w-1 h-1 rounded-full bg-exo-accent/60" />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 右列：任务列表 ───────────────── */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">

        <div className="bg-exo-surface border border-exo-border/50 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 accent-line-top border-b border-exo-border/30">
            <div className="flex items-center gap-2">
              <Calendar size={13} className="text-exo-muted/50" />
              <span className="label-caps text-exo-muted/60">{selectedDate === todayIso ? '今日任务' : `${selectedDate} 任务`}</span>
            </div>
            <button
              onClick={() => setShowAddForm(p => !p)}
              className="p-1 text-exo-muted hover:text-exo-accent transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* 新增表单 */}
          {showAddForm && (
            <div className="px-4 py-3 border-b border-exo-border/30 bg-exo-metal/50 flex flex-col gap-2">
              <input
                autoFocus
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') addTask(); if (e.key === 'Escape') setShowAddForm(false); }}
                placeholder="任务标题..."
                className="w-full bg-transparent border-b border-exo-border/60 focus:border-exo-accent/40 outline-none text-sm text-exo-text pb-1 transition-colors placeholder:text-exo-muted/30"
              />
              <div className="flex gap-2 flex-wrap items-center">
                <input
                  type="date"
                  value={form.deadline || selectedDate}
                  onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
                  className="bg-exo-metal border border-exo-border/50 rounded px-2 py-1 text-xs text-exo-text/70 outline-none focus:border-exo-accent/30 transition-colors"
                />
                <div className="flex gap-1.5 ml-auto">
                  <button onClick={() => { setShowAddForm(false); setForm(EmptyForm); }} className="px-2 py-1 text-xs text-exo-muted hover:text-white transition-colors">取消</button>
                  <button onClick={addTask} className="px-3 py-1 text-xs bg-exo-accent/10 text-exo-accent border border-exo-accent/20 rounded hover:bg-exo-accent hover:text-black transition-all">添加</button>
                </div>
              </div>
            </div>
          )}

          {/* 任务列表 */}
          <div className="divide-y divide-exo-border/10">
            {loading && (
              <div className="px-4 py-6 text-center label-caps text-exo-muted/30">加载中...</div>
            )}
            {!loading && filteredEntries.length === 0 && (
              <div className="px-4 py-8 text-center text-exo-muted/30 text-xs tracking-wide">
                该日期无待办任务
              </div>
            )}
            {filteredEntries.map(entry => (
              <TodoItem 
                key={entry.id} 
                entry={entry} 
                onToggle={handleToggle} 
                onDelete={handleDelete} 
              />
            ))}
          </div>
        </div>

        {/* Google Calendar — 保持占位 */}
        <div className="bg-exo-surface/40 border border-exo-border/30 rounded-xl overflow-hidden opacity-60">
          <div className="flex items-center justify-between px-4 py-2 border-b border-exo-border/20">
            <div className="flex items-center gap-2">
              <span className="label-caps text-[10px] text-exo-muted/40">External Sync</span>
            </div>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-[11px] text-exo-muted/30">Google Calendar 未连接</span>
            <button disabled className="text-[10px] text-exo-muted/20 border border-exo-border/20 px-2 py-0.5 rounded">CONNECT</button>
          </div>
        </div>

      </div>
    </div>
  );
}

const TYPE_ICONS = {
  todo: Circle,
  periodic: RefreshCw,
  goal: Target
};

function TodoItem({ entry, onToggle, onDelete }) {
  const Icon = TYPE_ICONS[entry.entry_type] || Circle;
  const isCompleted = entry.status === 'completed'; // 虽然我们 load active，但如果是刚刚完成还没刷新列表的情况

  return (
    <div className="group flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
      <button
        onClick={() => onToggle(entry.id)}
        className="mt-0.5 flex-shrink-0 text-exo-muted hover:text-exo-accent transition-colors"
      >
        {isCompleted
          ? <CheckCircle2 size={15} className="text-exo-accent/40" />
          : <Icon size={15} className={entry.entry_type !== 'todo' ? 'text-exo-muted/40' : ''} />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-sm tracking-wide ${isCompleted ? 'line-through text-exo-muted/30' : 'text-exo-text/80'}`}>
          {entry.title}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[10px] uppercase tracking-widest px-1 rounded bg-white/5 text-exo-muted/40`}>
            {entry.entry_type}
          </span>
          {entry.description && (
            <span className="text-[10px] text-exo-muted/30 truncate">{entry.description}</span>
          )}
        </div>
      </div>
      <button
        onClick={() => onDelete(entry.id)}
        className="opacity-0 group-hover:opacity-100 p-0.5 text-exo-muted/40 hover:text-red-400 transition-all flex-shrink-0"
      >
        <X size={12} />
      </button>
    </div>
  );
}

