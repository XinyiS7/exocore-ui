import React, { useState, useEffect } from 'react';
import { Plus, X, Calendar, CheckCircle2, Circle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

// ─── Todo 数据结构定义 ───────────────────────────────────────────
// localStorage key: 'exo_local_todos'
// {
//   id: string,
//   title: string,
//   note: string | null,
//   deadline: string | null,   // ISO 8601 date, e.g. "2026-04-10"
//   repeat: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly',
//   completed: boolean,
//   createdAt: string,         // ISO 8601
// }

// ─── Google Calendar 事件结构（预留）────────────────────────────
// OAuth token key: 'exo_gcal_token'
// {
//   id: string,
//   title: string,
//   start: string,   // ISO 8601 dateTime or date
//   end: string,
//   calendarId: string,
//   colorId: string | null,
//   allDay: boolean,
// }

const REPEAT_OPTIONS = [
  { value: 'none',    label: '不重复' },
  { value: 'daily',   label: '每天' },
  { value: 'weekly',  label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'yearly',  label: '每年' },
];

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

function buildCalendarGrid(year, month) {
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const startOffset = firstDow === 0 ? 6 : firstDow - 1; // Mon-first offset
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

function loadTodos() {
  try { return JSON.parse(localStorage.getItem('exo_local_todos') || '[]'); }
  catch { return []; }
}

function saveTodos(todos) {
  localStorage.setItem('exo_local_todos', JSON.stringify(todos));
}

const EmptyTodo = { title: '', deadline: '', repeat: 'none', note: '' };

export default function CalendarWidget() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [todos, setTodos] = useState(loadTodos);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(EmptyTodo);

  useEffect(() => { saveTodos(todos); }, [todos]);

  const cells = buildCalendarGrid(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const addTodo = () => {
    if (!form.title.trim()) return;
    const newTodo = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: form.title.trim(),
      note: form.note.trim() || null,
      deadline: form.deadline || null,
      repeat: form.repeat,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setTodos(prev => [newTodo, ...prev]);
    setForm(EmptyTodo);
    setShowAddForm(false);
  };

  const toggleTodo = (id) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTodo = (id) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
  const pendingTodos = todos.filter(t => !t.completed);
  const doneTodos = todos.filter(t => t.completed);

  const isToday = (d) => d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
  const isPast = (d) => new Date(viewYear, viewMonth, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">

      {/* ── 左列：日历网格 ────────────────────────── */}
      <div className="flex-shrink-0 lg:w-64">
        <div className="bg-exo-surface border border-exo-border/50 rounded-xl overflow-hidden">
          {/* 月份导航 */}
          <div className="flex items-center justify-between px-4 py-3 gold-line-top">
            <button onClick={prevMonth} className="p-1 text-exo-muted hover:text-exo-gold transition-colors"><ChevronLeft size={14} /></button>
            <span className="label-caps text-exo-text/70">{monthName}</span>
            <button onClick={nextMonth} className="p-1 text-exo-muted hover:text-exo-gold transition-colors"><ChevronRight size={14} /></button>
          </div>

          {/* 星期表头 */}
          <div className="grid grid-cols-7 px-3 pb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center label-caps text-exo-muted/40 py-1">{d}</div>
            ))}
          </div>

          {/* 日期格子 */}
          <div className="grid grid-cols-7 px-3 pb-3 gap-y-0.5">
            {cells.map((d, i) => (
              <div key={i} className="flex items-center justify-center h-7">
                {d && (
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs transition-colors
                    ${isToday(d)
                      ? 'bg-exo-gold text-black font-medium'
                      : isPast(d)
                      ? 'text-exo-muted/30'
                      : 'text-exo-text/60 hover:text-exo-text'
                    }`}
                  >
                    {d}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 右列：Google Calendar 预留 + Todo ─────── */}
      <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-y-auto scrollbar-hide">

        {/* Google Calendar — 预留接口区 */}
        <div className="bg-exo-surface border border-exo-border/50 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 gold-line-top border-b border-exo-border/30">
            <div className="flex items-center gap-2">
              <Calendar size={13} className="text-exo-muted/50" />
              <span className="label-caps text-exo-muted/60">Google Calendar</span>
            </div>
            <span className="flex items-center gap-1.5 label-caps text-exo-muted/40">
              <span className="w-1.5 h-1.5 rounded-full bg-exo-muted/30 inline-block" />
              未连接
            </span>
          </div>
          <div className="px-4 py-6 flex flex-col items-center gap-3 text-center">
            <p className="text-xs text-exo-muted/40 tracking-wide leading-relaxed">
              连接 Google Calendar 后，<br/>今日日程将显示在这里
            </p>
            <button
              disabled
              className="label-caps px-3 py-1.5 border border-exo-border/50 rounded text-exo-muted/30 cursor-not-allowed"
            >
              连接账户（即将支持）
            </button>
          </div>
        </div>

        {/* 本地 Todo */}
        <div className="bg-exo-surface border border-exo-border/50 rounded-xl overflow-hidden flex-1">
          <div className="flex items-center justify-between px-4 py-3 gold-line-top border-b border-exo-border/30">
            <span className="label-caps text-exo-muted/60">本地任务</span>
            <button
              onClick={() => setShowAddForm(p => !p)}
              className="p-1 text-exo-muted hover:text-exo-gold transition-colors"
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
                onKeyDown={e => { if (e.key === 'Enter') addTodo(); if (e.key === 'Escape') setShowAddForm(false); }}
                placeholder="任务标题..."
                className="w-full bg-transparent border-b border-exo-border/60 focus:border-exo-gold/40 outline-none text-sm text-exo-text pb-1 transition-colors placeholder:text-exo-muted/30"
              />
              <div className="flex gap-2 flex-wrap items-center">
                <input
                  type="date"
                  value={form.deadline}
                  onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
                  className="bg-exo-metal border border-exo-border/50 rounded px-2 py-1 text-xs text-exo-text/70 outline-none focus:border-exo-gold/30 transition-colors"
                />
                <select
                  value={form.repeat}
                  onChange={e => setForm(p => ({ ...p, repeat: e.target.value }))}
                  className="bg-exo-metal border border-exo-border/50 rounded px-2 py-1 text-xs text-exo-text/70 outline-none cursor-pointer"
                >
                  {REPEAT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <div className="flex gap-1.5 ml-auto">
                  <button onClick={() => setShowAddForm(false)} className="px-2 py-1 text-xs text-exo-muted hover:text-white transition-colors">取消</button>
                  <button onClick={addTodo} className="px-3 py-1 text-xs bg-exo-gold/10 text-exo-gold border border-exo-gold/20 rounded hover:bg-exo-gold hover:text-black transition-all">添加</button>
                </div>
              </div>
            </div>
          )}

          {/* Todo 列表 */}
          <div className="divide-y divide-exo-border/20">
            {pendingTodos.length === 0 && doneTodos.length === 0 && (
              <div className="px-4 py-8 text-center text-exo-muted/30 text-xs tracking-wide">暂无任务</div>
            )}
            {pendingTodos.map(todo => (
              <TodoItem key={todo.id} todo={todo} onToggle={toggleTodo} onDelete={deleteTodo} />
            ))}
            {doneTodos.length > 0 && (
              <>
                <div className="px-4 py-1.5 label-caps text-exo-muted/30 bg-exo-metal/30">已完成 {doneTodos.length}</div>
                {doneTodos.map(todo => (
                  <TodoItem key={todo.id} todo={todo} onToggle={toggleTodo} onDelete={deleteTodo} />
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TodoItem({ todo, onToggle, onDelete }) {
  const repeatLabel = REPEAT_OPTIONS.find(o => o.value === todo.repeat)?.label;
  const isOverdue = todo.deadline && !todo.completed && new Date(todo.deadline) < new Date(new Date().toDateString());

  return (
    <div className="group flex items-start gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
      <button onClick={() => onToggle(todo.id)} className="mt-0.5 flex-shrink-0 text-exo-muted hover:text-exo-gold transition-colors">
        {todo.completed ? <CheckCircle2 size={14} className="text-exo-gold/40" /> : <Circle size={14} />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-sm tracking-wide ${todo.completed ? 'line-through text-exo-muted/30' : 'text-exo-text/80'}`}>
          {todo.title}
        </div>
        {(todo.deadline || todo.repeat !== 'none') && (
          <div className="flex items-center gap-2 mt-0.5">
            {todo.deadline && (
              <span className={`label-caps ${isOverdue ? 'text-red-400/60' : 'text-exo-muted/40'}`}>
                {todo.deadline}
              </span>
            )}
            {todo.repeat !== 'none' && (
              <span className="label-caps text-exo-muted/30">{repeatLabel}</span>
            )}
          </div>
        )}
      </div>
      <button
        onClick={() => onDelete(todo.id)}
        className="opacity-0 group-hover:opacity-100 p-0.5 text-exo-muted/40 hover:text-red-400 transition-all flex-shrink-0"
      >
        <X size={12} />
      </button>
    </div>
  );
}
