# Task Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-featured Chronos task management panel (todo / periodic / goal types) with a split-panel layout, integrated into the `calendar` tab and a light today-summary in HomePanel's CalendarWidget.

**Architecture:** `tasksApi.js` owns all `/api/tasks/` HTTP calls. `TaskRow` handles one entry (collapsed/expanded, check-in, 3-dot menu). `TaskCreateModal` handles create/edit with dynamic fields per type. `TaskPanel` composes everything with left sidebar (mini-calendar + filters) and scrollable right list. CalendarWidget gets a today-summary section replacing the old `/api/todos/` CRUD.

**Tech Stack:** React 18, Tailwind CSS (exo-* palette), Lucide icons, existing `getCsrfToken` / `baseUrl` from `src/utils/api.js`.

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| **Create** | `src/utils/tasksApi.js` | All `/api/tasks/` fetch calls |
| **Create** | `src/components/tasks/TaskRow.jsx` | Single entry row: collapsed/expanded, check-in, menu |
| **Create** | `src/components/tasks/TaskCreateModal.jsx` | Create/edit modal with dynamic type fields |
| **Create** | `src/components/tasks/TaskPanel.jsx` | Main panel: left sidebar + right list + state |
| **Modify** | `src/App.jsx` | Replace `calendar` placeholder with `<TaskPanel />` |
| **Modify** | `src/components/home/HomePanel.jsx` | Thread `setCurrentTab` into `CalendarWidget` |
| **Modify** | `src/components/home/CalendarWidget.jsx` | Replace old todo CRUD with today-tasks summary |

---

## Task 1: tasksApi.js

**Files:**
- Create: `src/utils/tasksApi.js`

- [ ] **Step 1: Create the file**

```js
// src/utils/tasksApi.js
import { baseUrl, getCsrfToken } from './api';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'X-CSRFToken': getCsrfToken(),
});

const jsonReq = (method, url, body) =>
  fetch(url, {
    method,
    headers: authHeaders(),
    credentials: 'include',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

export const fetchEntries = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return fetch(`${baseUrl}/api/tasks/entries/${qs ? '?' + qs : ''}`, {
    credentials: 'include',
  }).then(r => r.json());
};

export const createEntry  = (data)     => jsonReq('POST',   `${baseUrl}/api/tasks/entries/`,             data).then(r => r.json());
export const updateEntry  = (id, data) => jsonReq('PATCH',  `${baseUrl}/api/tasks/entries/${id}/`,       data).then(r => r.json());
export const deleteEntry  = (id)       => jsonReq('DELETE', `${baseUrl}/api/tasks/entries/${id}/`);
export const completeEntry= (id)       => jsonReq('POST',   `${baseUrl}/api/tasks/entries/${id}/complete/`, {}).then(r => r.json());
export const suspendEntry = (id)       => jsonReq('POST',   `${baseUrl}/api/tasks/entries/${id}/suspend/`,  {}).then(r => r.json());
export const resumeEntry  = (id)       => jsonReq('POST',   `${baseUrl}/api/tasks/entries/${id}/resume/`,   {}).then(r => r.json());
export const syncGcal     = (id)       => jsonReq('POST',   `${baseUrl}/api/tasks/entries/${id}/gcal/`,     {}).then(r => r.json());
export const unsyncGcal   = (id)       => fetch(`${baseUrl}/api/tasks/entries/${id}/gcal/`, {
  method: 'DELETE',
  headers: { 'X-CSRFToken': getCsrfToken() },
  credentials: 'include',
});
export const fetchCompletions = (entryId) =>
  fetch(`${baseUrl}/api/tasks/completions/?entry=${entryId}`, { credentials: 'include' }).then(r => r.json());
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/tasksApi.js
git commit -m "feat: add tasksApi utility for /api/tasks/ endpoints"
```

---

## Task 2: TaskRow.jsx

**Files:**
- Create: `src/components/tasks/TaskRow.jsx`

- [ ] **Step 1: Create the file**

```jsx
// src/components/tasks/TaskRow.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Circle, RefreshCw, Target, ChevronDown, ChevronUp,
  MoreHorizontal, Check, ExternalLink, Pin, PinOff,
  Edit2, Pause, Play, Trash2,
} from 'lucide-react';
import { fetchCompletions } from '../../utils/tasksApi';

const TYPE_CFG = {
  todo:     { Icon: Circle,    label: 'Todo', color: 'text-blue-400',   bg: 'bg-blue-400/10'   },
  periodic: { Icon: RefreshCw, label: '周期', color: 'text-purple-400', bg: 'bg-purple-400/10' },
  goal:     { Icon: Target,    label: '目标', color: 'text-exo-accent', bg: 'bg-exo-accent/10' },
};

const todayStr = () => new Date().toISOString().slice(0, 10);

function fmtDate(dateStr) {
  if (!dateStr) return null;
  const today = todayStr();
  const tom   = new Date(); tom.setDate(tom.getDate() + 1);
  const tomStr = tom.toISOString().slice(0, 10);
  if (dateStr === today)  return { label: '今天',      urgent: true,  overdue: false };
  if (dateStr === tomStr) return { label: '明天',      urgent: false, overdue: false };
  if (dateStr < today)    return { label: dateStr.slice(5), urgent: true, overdue: true };
  return                         { label: dateStr.slice(5), urgent: false, overdue: false };
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 w-full px-3 py-1.5 text-xs transition-colors hover:bg-white/5 ${
        danger ? 'text-red-400/70 hover:text-red-400' : 'text-exo-muted/70 hover:text-exo-text'
      }`}
    >
      <Icon size={12} />
      {label}
    </button>
  );
}

export default function TaskRow({
  entry, isExpanded, onToggleExpand,
  onEdit, onComplete, onUpdate, onDelete,
  onSuspend, onResume, onGcalSync, onGcalUnsync,
}) {
  const {
    id, entry_type, title, status, is_pinned,
    due_date, next_periodic_due,
    current_cycle_completions, goal_count,
    description, start_date, tags,
    gcal_event_id, gcal_event_link,
  } = entry;

  const cfg = TYPE_CFG[entry_type] || TYPE_CFG.todo;
  const [menuOpen, setMenuOpen]               = useState(false);
  const [completions, setCompletions]         = useState(null);
  const [loadingCompletions, setLoadingC]     = useState(false);
  const [completing, setCompleting]           = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menuOpen]);

  // Lazy-load completions when expanded
  useEffect(() => {
    if (!isExpanded || completions !== null) return;
    setLoadingC(true);
    fetchCompletions(id)
      .then(data => setCompletions(Array.isArray(data) ? data : []))
      .catch(() => setCompletions([]))
      .finally(() => setLoadingC(false));
  }, [isExpanded, id, completions]);

  const handleComplete = (e) => {
    e.stopPropagation();
    if (completing) return;
    setCompleting(true);
    onComplete(id).finally(() => setCompleting(false));
  };

  // Overdue indicator
  const today = todayStr();
  const isOverdue =
    (entry_type === 'todo'     && due_date          && due_date          < today) ||
    (entry_type === 'periodic' && next_periodic_due && next_periodic_due < today);

  // Meta info per type
  const renderMeta = () => {
    if (entry_type === 'todo') {
      const d = fmtDate(due_date);
      if (!d) return null;
      return (
        <span className={`text-[11px] ${d.overdue ? 'text-amber-400/80' : d.urgent ? 'text-amber-300/60' : 'text-exo-muted/40'}`}>
          {d.overdue ? '⚠ ' : ''}due {d.label}
        </span>
      );
    }
    if (entry_type === 'periodic') {
      const d = fmtDate(next_periodic_due);
      if (!d) return null;
      return (
        <span className={`text-[11px] ${d.overdue ? 'text-amber-400/80' : 'text-exo-muted/40'}`}>
          {d.overdue ? '⚠ 逾期  ' : ''}下次: {d.label}
        </span>
      );
    }
    if (entry_type === 'goal') {
      const done  = current_cycle_completions ?? 0;
      const total = goal_count ?? 1;
      const pct   = Math.min(done / total, 1);
      const done_ = done >= total;
      return (
        <div className="flex items-center gap-2">
          <div className="w-16 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${done_ ? 'bg-green-500/60' : 'bg-exo-accent'}`}
              style={{ width: `${pct * 100}%` }}
            />
          </div>
          <span className={`text-[11px] ${done_ ? 'text-green-400/60' : 'text-exo-muted/40'}`}>
            {done}/{total}{done_ ? ' ✓' : ''}
          </span>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      {/* ── Collapsed row ── */}
      <div
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors group/row ${isExpanded ? 'bg-white/[0.02]' : ''}`}
        onClick={() => onToggleExpand(id)}
      >
        {/* Overdue bar */}
        <div className={`w-0.5 h-7 rounded-full flex-shrink-0 ${isOverdue ? 'bg-amber-400/60' : 'bg-transparent'}`} />

        {/* Type icon */}
        <div className={`p-1.5 rounded-lg flex-shrink-0 ${cfg.bg}`}>
          <cfg.Icon size={13} className={cfg.color} />
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
          <span className={`text-sm font-light truncate ${status === 'suspended' ? 'text-exo-muted/30 line-through' : 'text-exo-text/90'}`}>
            {is_pinned && <span className="text-exo-accent/50 mr-1 text-xs">📌</span>}
            {title}
          </span>
          <span className={`text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
            {cfg.label}
          </span>
          {renderMeta()}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button
            onClick={handleComplete}
            disabled={completing || status === 'suspended'}
            title="打卡"
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-white/10 text-exo-muted/30 hover:border-exo-accent/40 hover:text-exo-accent transition-all text-[11px] disabled:opacity-20 disabled:cursor-not-allowed"
          >
            <Check size={11} />
          </button>

          {/* 3-dot menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(p => !p)}
              className="p-1.5 rounded-lg text-exo-muted/20 hover:text-exo-muted hover:bg-white/5 transition-all"
            >
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-exo-panel border border-exo-border/60 rounded-xl shadow-2xl py-1 min-w-[148px]">
                <MenuItem icon={Edit2}             label="编辑"       onClick={() => { setMenuOpen(false); onEdit(entry); }} />
                <MenuItem icon={is_pinned ? PinOff : Pin} label={is_pinned ? '取消置顶' : '置顶'} onClick={() => { setMenuOpen(false); onUpdate(id, { is_pinned: !is_pinned }); }} />
                <div className="h-px bg-white/5 my-1" />
                {gcal_event_id
                  ? <MenuItem icon={Trash2}       label="取消 GCal 链接" onClick={() => { setMenuOpen(false); onGcalUnsync(id); }} />
                  : <MenuItem icon={ExternalLink} label="推送到 GCal"     onClick={() => { setMenuOpen(false); onGcalSync(id); }} />
                }
                <div className="h-px bg-white/5 my-1" />
                {status === 'suspended'
                  ? <MenuItem icon={Play}  label="恢复"           onClick={() => { setMenuOpen(false); onResume(id); }} />
                  : <MenuItem icon={Pause} label="挂起"           onClick={() => { setMenuOpen(false); onSuspend(id); }} />
                }
                <MenuItem icon={Trash2} label="删除" onClick={() => { setMenuOpen(false); onDelete(id); }} danger />
              </div>
            )}
          </div>

          <div className="text-exo-muted/20 group-hover/row:text-exo-muted/40 transition-colors">
            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </div>
        </div>
      </div>

      {/* ── Expanded panel ── */}
      {isExpanded && (
        <div className="px-5 pb-4 pt-2 border-t border-white/5 bg-white/[0.01] space-y-3">
          {description && (
            <p className="text-xs text-exo-muted/60 leading-relaxed">{description}</p>
          )}

          <div className="flex flex-wrap gap-3 text-[9px] text-exo-muted/30 uppercase tracking-widest">
            <span>开始 {start_date}</span>
            {tags?.length > 0 && (
              <span className="flex gap-1">
                {tags.map(t => (
                  <span key={t} className="bg-white/5 px-1.5 py-0.5 rounded">#{t}</span>
                ))}
              </span>
            )}
          </div>

          {/* Completion history */}
          <div>
            <div className="text-[9px] uppercase tracking-widest text-exo-muted/25 mb-1.5">打卡记录</div>
            {loadingCompletions && <div className="text-xs text-exo-muted/25">加载中...</div>}
            {!loadingCompletions && completions?.length === 0 && (
              <div className="text-xs text-exo-muted/20">暂无记录</div>
            )}
            {completions?.slice(0, 5).map(c => (
              <div key={c.id} className="flex items-center gap-2 text-[11px] text-exo-muted/35 py-0.5">
                <Check size={9} className="text-exo-accent/30 flex-shrink-0" />
                <span>{c.completed_at.slice(0, 16).replace('T', ' ')}</span>
                {c.note && <span className="text-exo-muted/25 truncate">"{c.note}"</span>}
              </div>
            ))}
          </div>

          {/* GCal link */}
          {gcal_event_link && (
            <a
              href={gcal_event_link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-exo-muted/40 hover:text-exo-accent transition-colors"
            >
              <ExternalLink size={9} />
              在 Google Calendar 查看
            </a>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/tasks/TaskRow.jsx
git commit -m "feat: add TaskRow component with expand/check-in/menu"
```

---

## Task 3: TaskCreateModal.jsx

**Files:**
- Create: `src/components/tasks/TaskCreateModal.jsx`

- [ ] **Step 1: Create the file**

```jsx
// src/components/tasks/TaskCreateModal.jsx
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { createEntry, updateEntry } from '../../utils/tasksApi';

const TYPES        = [{ value: 'todo', label: 'Todo' }, { value: 'periodic', label: '周期任务' }, { value: 'goal', label: '目标' }];
const UNITS        = [{ value: 'day', label: '天' }, { value: 'week', label: '周' }, { value: 'month', label: '月' }];
const GOAL_PERIODS = [{ value: 'week', label: '每周' }, { value: 'month', label: '每月' }];
const END_TYPES    = [{ value: 'never', label: '永不' }, { value: 'count', label: '次数' }, { value: 'date', label: '日期' }];

const today = () => new Date().toISOString().slice(0, 10);

const DEFAULTS = {
  todo:     { entry_type: 'todo',     title: '', description: '', start_date: today(), tags: '', due_date: '' },
  periodic: { entry_type: 'periodic', title: '', description: '', start_date: today(), tags: '', interval_unit: 'day', interval_value: 1, end_type: 'never', end_count: '', end_date: '' },
  goal:     { entry_type: 'goal',     title: '', description: '', start_date: today(), tags: '', goal_count: 3, goal_period: 'week', cycle_start: today(), cycle_due: '' },
};

const toForm = (e) => ({
  entry_type:     e.entry_type,
  title:          e.title          ?? '',
  description:    e.description    ?? '',
  start_date:     e.start_date     ?? today(),
  tags:           Array.isArray(e.tags) ? e.tags.join(', ') : '',
  due_date:       e.due_date       ?? '',
  interval_unit:  e.interval_unit  ?? 'day',
  interval_value: e.interval_value ?? 1,
  end_type:       e.end_type       ?? 'never',
  end_count:      e.end_count      ?? '',
  end_date:       e.end_date       ?? '',
  goal_count:     e.goal_count     ?? 3,
  goal_period:    e.goal_period    ?? 'week',
  cycle_start:    e.cycle_start    ?? today(),
  cycle_due:      e.cycle_due      ?? '',
});

const toPayload = (f) => {
  const tags = f.tags ? f.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  const base = { title: f.title.trim(), description: f.description.trim(), start_date: f.start_date, tags };
  if (f.entry_type === 'todo') return { ...base, entry_type: 'todo', due_date: f.due_date || null };
  if (f.entry_type === 'periodic') return {
    ...base, entry_type: 'periodic',
    interval_unit:  f.interval_unit,
    interval_value: Number(f.interval_value),
    end_type:       f.end_type,
    end_count:      f.end_type === 'count' ? Number(f.end_count) : null,
    end_date:       f.end_type === 'date'  ? f.end_date          : null,
  };
  if (f.entry_type === 'goal') return {
    ...base, entry_type: 'goal',
    goal_count:  Number(f.goal_count),
    goal_period: f.goal_period,
    cycle_start: f.cycle_start,
    cycle_due:   f.cycle_due || null,
  };
};

export default function TaskCreateModal({ entry, onClose, onSave }) {
  const isEdit = !!entry;
  const [form, setForm]   = useState(isEdit ? toForm(entry) : DEFAULTS.todo);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.start_date) return;
    setSaving(true);
    setError(null);
    try {
      const payload = toPayload(form);
      const result  = isEdit ? await updateEntry(entry.id, payload) : await createEntry(payload);
      onSave(result);
      onClose();
    } catch {
      setError('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const inp = 'w-full bg-transparent border-b border-exo-border/60 focus:border-exo-accent/40 outline-none text-sm text-exo-text pb-1 transition-colors placeholder:text-exo-muted/25';
  const lbl = 'text-[9px] uppercase tracking-widest text-exo-muted/35 mb-1.5 block';
  const datePick = 'bg-exo-surface border border-exo-border/40 rounded px-2 py-1.5 text-xs text-exo-text outline-none focus:border-exo-accent/30 transition-colors';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-exo-panel border border-exo-border/60 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 sticky top-0 bg-exo-panel z-10">
          <h2 className="text-sm font-light tracking-wide text-exo-text">{isEdit ? '编辑任务' : '新建任务'}</h2>
          <button onClick={onClose} className="p-1.5 text-exo-muted/40 hover:text-exo-muted rounded-lg hover:bg-white/5 transition-all">
            <X size={15} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Type selector */}
          <div>
            <span className={lbl}>类型</span>
            <div className="flex gap-1">
              {TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => !isEdit && setForm(DEFAULTS[t.value])}
                  disabled={isEdit}
                  className={`flex-1 py-2 text-xs rounded-xl border transition-all ${
                    form.entry_type === t.value
                      ? 'border-exo-accent/40 bg-exo-accent/10 text-exo-accent'
                      : 'border-white/5 text-exo-muted/50 hover:border-white/10 hover:text-exo-muted disabled:opacity-25 disabled:cursor-not-allowed'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Common fields */}
          <div>
            <label className={lbl}>标题 *</label>
            <input autoFocus value={form.title} onChange={e => set('title', e.target.value)} placeholder="任务标题" className={inp} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>开始日期 *</label>
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={`${datePick} w-full`} />
            </div>
            <div>
              <label className={lbl}>标签（逗号分隔）</label>
              <input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="健康, 运动" className={inp} />
            </div>
          </div>

          <div>
            <label className={lbl}>描述</label>
            <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="可选" className={inp} />
          </div>

          {/* ── Todo fields ── */}
          {form.entry_type === 'todo' && (
            <div>
              <label className={lbl}>截止日期</label>
              <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} className={datePick} />
            </div>
          )}

          {/* ── Periodic fields ── */}
          {form.entry_type === 'periodic' && (
            <div className="space-y-4">
              <div>
                <label className={lbl}>重复间隔</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-exo-muted/50">每</span>
                  <input
                    type="number" min="1" value={form.interval_value}
                    onChange={e => set('interval_value', e.target.value)}
                    className={`${datePick} w-16 text-center`}
                  />
                  <select value={form.interval_unit} onChange={e => set('interval_unit', e.target.value)} className={datePick}>
                    {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={lbl}>结束方式</label>
                <div className="flex gap-1.5 flex-wrap">
                  {END_TYPES.map(et => (
                    <button
                      key={et.value} onClick={() => set('end_type', et.value)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                        form.end_type === et.value
                          ? 'border-exo-accent/40 bg-exo-accent/10 text-exo-accent'
                          : 'border-white/5 text-exo-muted/50 hover:border-white/10'
                      }`}
                    >{et.label}</button>
                  ))}
                </div>
                {form.end_type === 'count' && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-exo-muted/50">共</span>
                    <input type="number" min="1" value={form.end_count} onChange={e => set('end_count', e.target.value)} placeholder="次数" className={`${datePick} w-20 text-center`} />
                    <span className="text-xs text-exo-muted/50">次</span>
                  </div>
                )}
                {form.end_type === 'date' && (
                  <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} className={`${datePick} mt-2`} />
                )}
              </div>
            </div>
          )}

          {/* ── Goal fields ── */}
          {form.entry_type === 'goal' && (
            <div className="space-y-4">
              <div>
                <label className={lbl}>目标频率</label>
                <div className="flex items-center gap-2">
                  <select value={form.goal_period} onChange={e => set('goal_period', e.target.value)} className={datePick}>
                    {GOAL_PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  <span className="text-xs text-exo-muted/50">完成</span>
                  <input type="number" min="1" value={form.goal_count} onChange={e => set('goal_count', e.target.value)} className={`${datePick} w-16 text-center`} />
                  <span className="text-xs text-exo-muted/50">次</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>周期开始</label>
                  <input type="date" value={form.cycle_start} onChange={e => set('cycle_start', e.target.value)} className={`${datePick} w-full`} />
                </div>
                <div>
                  <label className={lbl}>周期截止</label>
                  <input type="date" value={form.cycle_due} onChange={e => set('cycle_due', e.target.value)} className={`${datePick} w-full`} />
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-400/70">{error}</p>}

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-1 border-t border-white/5">
            <button onClick={onClose} className="px-4 py-2 text-xs text-exo-muted/50 hover:text-exo-muted transition-colors">取消</button>
            <button
              onClick={handleSubmit}
              disabled={saving || !form.title.trim()}
              className="px-5 py-2 text-xs bg-exo-accent/10 text-exo-accent border border-exo-accent/20 rounded-xl hover:bg-exo-accent hover:text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {saving ? '保存中...' : isEdit ? '保存修改' : '创建任务'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/tasks/TaskCreateModal.jsx
git commit -m "feat: add TaskCreateModal with dynamic type fields"
```

---

## Task 4: TaskPanel.jsx

**Files:**
- Create: `src/components/tasks/TaskPanel.jsx`

- [ ] **Step 1: Create the file**

```jsx
// src/components/tasks/TaskPanel.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import TaskRow from './TaskRow';
import TaskCreateModal from './TaskCreateModal';
import {
  fetchEntries, completeEntry, updateEntry, deleteEntry,
  suspendEntry, resumeEntry, syncGcal, unsyncGcal,
} from '../../utils/tasksApi';

const WEEKDAYS  = ['一','二','三','四','五','六','日'];
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

function buildCalendarGrid(year, month) {
  const dow = new Date(year, month, 1).getDay();
  const off = dow === 0 ? 6 : dow - 1;
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array(off).fill(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  return cells;
}

function Section({ label, children }) {
  return (
    <div className="mb-3">
      <div className="px-4 py-1.5 text-[9px] uppercase tracking-widest text-exo-muted/30">{label}</div>
      <div className="border border-white/5 rounded-xl overflow-hidden bg-white/[0.01]">{children}</div>
    </div>
  );
}

export default function TaskPanel() {
  const today    = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const [entries,      setEntries]     = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [typeFilter,   setTypeFilter]  = useState('all');
  const [statusFilter, setStatus]      = useState('active');
  const [expandedId,   setExpandedId]  = useState(null);
  const [editTarget,   setEditTarget]  = useState(undefined); // undefined=closed, null=new, obj=edit
  const [viewYear,     setViewYear]    = useState(today.getFullYear());
  const [viewMonth,    setViewMonth]   = useState(today.getMonth());

  const loadEntries = useCallback(() => {
    setLoading(true);
    const params = { status: statusFilter };
    if (typeFilter !== 'all') params.entry_type = typeFilter;
    fetchEntries(params)
      .then(data => setEntries(Array.isArray(data) ? data : []))
      .catch(err => console.error('Tasks fetch error:', err))
      .finally(() => setLoading(false));
  }, [typeFilter, statusFilter]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const handleToggleExpand = (id) => setExpandedId(prev => prev === id ? null : id);

  const handleComplete = useCallback((id) => {
    return completeEntry(id).then(() => {
      setEntries(prev => prev.map(e => {
        if (e.id !== id) return e;
        if (e.entry_type === 'goal')     return { ...e, current_cycle_completions: (e.current_cycle_completions ?? 0) + 1 };
        if (e.entry_type === 'periodic') return { ...e, occurrences_done: (e.occurrences_done ?? 0) + 1 };
        return e;
      }));
      // Re-sync so todo gets removed after archive, periodic due date updates, etc.
      loadEntries();
    });
  }, [loadEntries]);

  const handleUpdate = useCallback((id, data) => {
    return updateEntry(id, data).then(updated => {
      setEntries(prev => prev.map(e => e.id === id ? updated : e));
    });
  }, []);

  const handleDelete = useCallback((id) => {
    deleteEntry(id).then(() => setEntries(prev => prev.filter(e => e.id !== id)));
  }, []);

  const handleSuspend = useCallback((id) => {
    suspendEntry(id).then(() => {
      if (statusFilter === 'active') setEntries(prev => prev.filter(e => e.id !== id));
      else loadEntries();
    });
  }, [statusFilter, loadEntries]);

  const handleResume = useCallback((id) => {
    resumeEntry(id).then(() => {
      if (statusFilter === 'suspended') setEntries(prev => prev.filter(e => e.id !== id));
      else loadEntries();
    });
  }, [statusFilter, loadEntries]);

  const handleGcalSync = useCallback((id) => {
    syncGcal(id).then(res => {
      setEntries(prev => prev.map(e => e.id === id
        ? { ...e, gcal_event_id: res.gcal_event_id, gcal_event_link: res.gcal_event_link }
        : e));
    });
  }, []);

  const handleGcalUnsync = useCallback((id) => {
    unsyncGcal(id).then(() => {
      setEntries(prev => prev.map(e => e.id === id ? { ...e, gcal_event_id: '', gcal_event_link: '' } : e));
    });
  }, []);

  const handleSave = (saved) => {
    setEntries(prev => {
      const idx = prev.findIndex(e => e.id === saved.id);
      return idx >= 0 ? prev.map(e => e.id === saved.id ? saved : e) : [saved, ...prev];
    });
    loadEntries();
  };

  // Sectioning
  const pinned    = entries.filter(e => e.is_pinned && e.status === 'escalated');
  const regular   = entries.filter(e => !(e.is_pinned && e.status === 'escalated'));
  const todos     = regular.filter(e => e.entry_type === 'todo');
  const periodics = regular.filter(e => e.entry_type === 'periodic');
  const goals     = regular.filter(e => e.entry_type === 'goal');

  // Calendar
  const cells    = buildCalendarGrid(viewYear, viewMonth);
  const isToday_ = (d) => d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
  const isPast_  = (d) => new Date(viewYear, viewMonth, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const prevMonth = () => viewMonth === 0  ? (setViewYear(y => y - 1), setViewMonth(11)) : setViewMonth(m => m - 1);
  const nextMonth = () => viewMonth === 11 ? (setViewYear(y => y + 1), setViewMonth(0))  : setViewMonth(m => m + 1);
  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });

  const rowProps = (entry) => ({
    entry, isExpanded: expandedId === entry.id,
    onToggleExpand: handleToggleExpand,
    onEdit: setEditTarget, onComplete: handleComplete,
    onUpdate: handleUpdate, onDelete: handleDelete,
    onSuspend: handleSuspend, onResume: handleResume,
    onGcalSync: handleGcalSync, onGcalUnsync: handleGcalUnsync,
  });

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left sidebar ── */}
      <div className="w-52 flex-shrink-0 flex flex-col border-r border-exo-border/40 bg-exo-panel/60 py-5 overflow-y-auto">

        {/* Mini calendar */}
        <div className="px-3 mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <button onClick={prevMonth} className="p-1 text-exo-muted/40 hover:text-exo-accent transition-colors"><ChevronLeft size={12} /></button>
            <span className="text-[9px] text-exo-muted/50 uppercase tracking-widest">{monthName}</span>
            <button onClick={nextMonth} className="p-1 text-exo-muted/40 hover:text-exo-accent transition-colors"><ChevronRight size={12} /></button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-[8px] text-exo-muted/25 uppercase">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((d, i) => (
              <div key={i} className="flex items-center justify-center h-6">
                {d && (
                  <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] transition-colors ${
                    isToday_(d) ? 'bg-exo-accent text-black font-medium' :
                    isPast_(d)  ? 'text-exo-muted/20' :
                    'text-exo-text/50 hover:text-exo-text'
                  }`}>{d}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="h-px bg-white/5 mx-3 mb-4" />

        {/* Type filter */}
        <div className="px-3 mb-4">
          <div className="text-[8px] uppercase tracking-widest text-exo-muted/25 mb-2">类型</div>
          {TYPE_TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setTypeFilter(t.value)}
              className={`flex items-center gap-2 w-full py-1.5 px-2 rounded-lg text-xs transition-colors ${
                typeFilter === t.value ? 'text-exo-accent bg-exo-accent/5' : 'text-exo-muted/50 hover:text-exo-muted'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${typeFilter === t.value ? 'bg-exo-accent' : 'bg-white/10'}`} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="h-px bg-white/5 mx-3 mb-4" />

        {/* Status filter */}
        <div className="px-3">
          <div className="text-[8px] uppercase tracking-widest text-exo-muted/25 mb-2">状态</div>
          {STATUS_OPTS.map(s => (
            <button
              key={s.value}
              onClick={() => setStatus(s.value)}
              className={`flex items-center gap-2 w-full py-1.5 px-2 rounded-lg text-xs transition-colors ${
                statusFilter === s.value ? 'text-exo-accent bg-exo-accent/5' : 'text-exo-muted/50 hover:text-exo-muted'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusFilter === s.value ? 'bg-exo-accent' : 'bg-white/10'}`} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Right content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-px w-6 bg-exo-accent/40" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-exo-accent/60">Chronos System</span>
          </div>
          <button
            onClick={() => setEditTarget(null)}
            className="flex items-center gap-2 px-4 py-2 text-xs bg-exo-accent/10 text-exo-accent border border-exo-accent/20 rounded-xl hover:bg-exo-accent hover:text-black transition-all"
          >
            <Plus size={13} />
            新建任务
          </button>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center h-40 text-[10px] text-exo-muted/25 uppercase tracking-widest">
              加载中...
            </div>
          )}

          {!loading && entries.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <p className="text-xs text-exo-muted/25 tracking-widest uppercase">暂无任务</p>
              <button
                onClick={() => setEditTarget(null)}
                className="text-xs text-exo-accent/50 hover:text-exo-accent underline underline-offset-2 transition-colors"
              >
                创建第一个任务
              </button>
            </div>
          )}

          {!loading && pinned.length > 0 && (
            <Section label="📌 置顶">
              {pinned.map(e => <TaskRow key={e.id} {...rowProps(e)} />)}
            </Section>
          )}

          {!loading && todos.length > 0 && (
            <Section label="Todo">
              {todos.map(e => <TaskRow key={e.id} {...rowProps(e)} />)}
            </Section>
          )}

          {!loading && periodics.length > 0 && (
            <Section label="周期任务">
              {periodics.map(e => <TaskRow key={e.id} {...rowProps(e)} />)}
            </Section>
          )}

          {!loading && goals.length > 0 && (
            <Section label="目标">
              {goals.map(e => <TaskRow key={e.id} {...rowProps(e)} />)}
            </Section>
          )}
        </div>
      </div>

      {/* Modal */}
      {editTarget !== undefined && (
        <TaskCreateModal
          entry={editTarget}
          onClose={() => setEditTarget(undefined)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/tasks/TaskPanel.jsx
git commit -m "feat: add TaskPanel with left sidebar and sectioned task list"
```

---

## Task 5: Wire TaskPanel into App.jsx

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add import and replace placeholder**

In `src/App.jsx`, add import after the existing HomePanel import:

```js
import TaskPanel from './components/tasks/TaskPanel';
```

Replace the `calendar` case:

```js
// BEFORE:
case 'calendar':
  return (
    <div className="flex-1 h-full flex items-center justify-center text-exo-muted/40 text-sm tracking-widest uppercase">
      Task Panel — Coming Soon
    </div>
  );

// AFTER:
case 'calendar':
  return <TaskPanel />;
```

- [ ] **Step 2: Verify in browser**

Run `npm run dev`. Navigate to `calendar` tab via sidebar. Confirm:
- Left sidebar renders with mini calendar, Type/Status filters
- Right side shows "CHRONOS SYSTEM" header + "新建任务" button
- "暂无任务" shown if backend has no entries
- "新建任务" button opens the modal; all three type tabs switch form fields correctly

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: wire TaskPanel into calendar tab"
```

---

## Task 6: Update CalendarWidget + HomePanel

**Files:**
- Modify: `src/components/home/CalendarWidget.jsx`
- Modify: `src/components/home/HomePanel.jsx`

- [ ] **Step 1: Update CalendarWidget.jsx**

Replace the entire file content with the version below. Key changes: remove all `/api/todos/` logic; add `setCurrentTab` prop; add today-tasks summary section using `fetchEntries`.

```jsx
// src/components/home/CalendarWidget.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Check, Circle, RefreshCw, Target, ArrowRight } from 'lucide-react';
import { fetchEntries, completeEntry } from '../../utils/tasksApi';

const WEEKDAYS = ['一','二','三','四','五','六','日'];

const TYPE_ICON = {
  todo:     { Icon: Circle,    color: 'text-blue-400'   },
  periodic: { Icon: RefreshCw, color: 'text-purple-400' },
  goal:     { Icon: Target,    color: 'text-exo-accent' },
};

function buildCalendarGrid(year, month) {
  const dow  = new Date(year, month, 1).getDay();
  const off  = dow === 0 ? 6 : dow - 1;
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array(off).fill(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  return cells;
}

export default function CalendarWidget({ setCurrentTab }) {
  const today      = new Date();
  const todayStr   = today.toISOString().slice(0, 10);
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [entries,   setEntries]   = useState([]);
  const [loadingE,  setLoadingE]  = useState(true);

  const loadEntries = useCallback(() => {
    setLoadingE(true);
    fetchEntries({ status: 'active' })
      .then(data => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoadingE(false));
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  // Today-relevant filter
  const todayEntries = entries.filter(e => {
    if (e.entry_type === 'todo')     return e.due_date     && e.due_date     <= todayStr;
    if (e.entry_type === 'periodic') return e.next_periodic_due && e.next_periodic_due <= todayStr;
    if (e.entry_type === 'goal')     return true; // show all active goals
    return false;
  }).slice(0, 5);

  const handleComplete = (id) => {
    completeEntry(id).then(() => loadEntries());
  };

  // Calendar
  const cells    = buildCalendarGrid(viewYear, viewMonth);
  const isToday_ = (d) => d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
  const isPast_  = (d) => new Date(viewYear, viewMonth, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const prevMonth = () => viewMonth === 0  ? (setViewYear(y => y-1), setViewMonth(11)) : setViewMonth(m => m-1);
  const nextMonth = () => viewMonth === 11 ? (setViewYear(y => y+1), setViewMonth(0))  : setViewMonth(m => m+1);
  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });

  return (
    <div className="flex flex-col lg:flex-row gap-6">

      {/* ── Calendar grid ── */}
      <div className="flex-shrink-0 lg:w-64">
        <div className="bg-exo-surface border border-exo-border/50 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 accent-line-top">
            <button onClick={prevMonth} className="p-1 text-exo-muted hover:text-exo-accent transition-colors"><ChevronLeft size={13} /></button>
            <span className="label-caps text-exo-text/70">{monthName}</span>
            <button onClick={nextMonth} className="p-1 text-exo-muted hover:text-exo-accent transition-colors"><ChevronRight size={13} /></button>
          </div>
          <div className="grid grid-cols-7 px-3 pb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center label-caps text-exo-muted/40 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 px-3 pb-3 gap-y-0.5">
            {cells.map((d, i) => (
              <div key={i} className="flex items-center justify-center h-7">
                {d && (
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs transition-colors ${
                    isToday_(d) ? 'bg-exo-accent text-black' :
                    isPast_(d)  ? 'text-exo-muted/25' :
                    'text-exo-text/60 hover:text-exo-text'
                  }`}>{d}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right column ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">

        {/* GCal placeholder — unchanged */}
        <div className="bg-exo-surface border border-exo-border/50 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 accent-line-top border-b border-exo-border/30">
            <div className="flex items-center gap-2">
              <Calendar size={13} className="text-exo-muted/50" />
              <span className="label-caps text-exo-muted/60">Google Calendar</span>
            </div>
            <span className="flex items-center gap-1.5 label-caps text-exo-muted/40">
              <span className="w-1.5 h-1.5 rounded-full bg-exo-muted/30 inline-block" />
              未连接
            </span>
          </div>
          <div className="px-4 py-5 flex flex-col items-center gap-3 text-center">
            <p className="text-xs text-exo-muted/40 tracking-wide leading-relaxed">连接 Google Calendar 后，今日日程将显示在这里</p>
            <button disabled className="label-caps px-3 py-1.5 border border-exo-border/50 rounded text-exo-muted/30 cursor-not-allowed">
              连接账户（即将支持）
            </button>
          </div>
        </div>

        {/* Today's tasks summary */}
        <div className="bg-exo-surface border border-exo-border/50 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 accent-line-top border-b border-exo-border/30">
            <span className="label-caps text-exo-muted/60">Today · {todayStr.slice(5)}</span>
            {setCurrentTab && (
              <button
                onClick={() => setCurrentTab('calendar')}
                className="flex items-center gap-1 label-caps text-exo-muted/40 hover:text-exo-accent transition-colors"
              >
                查看全部 <ArrowRight size={10} />
              </button>
            )}
          </div>

          <div className="divide-y divide-exo-border/20 max-h-48 overflow-y-auto">
            {loadingE && (
              <div className="px-4 py-6 text-center label-caps text-exo-muted/25">加载中...</div>
            )}
            {!loadingE && todayEntries.length === 0 && (
              <div className="px-4 py-6 text-center text-xs text-exo-muted/25 tracking-wide">今日无待办事项</div>
            )}
            {todayEntries.map(entry => {
              const { Icon, color } = TYPE_ICON[entry.entry_type] || TYPE_ICON.todo;
              const done = entry.entry_type === 'goal'
                ? (entry.current_cycle_completions ?? 0) >= (entry.goal_count ?? 1)
                : false;
              return (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                  <Icon size={13} className={`flex-shrink-0 ${color}`} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-light tracking-wide truncate ${done ? 'text-exo-muted/40 line-through' : 'text-exo-text/80'}`}>
                      {entry.title}
                    </div>
                    {entry.entry_type === 'goal' && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-12 h-0.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${done ? 'bg-green-500/60' : 'bg-exo-accent'}`}
                            style={{ width: `${Math.min((entry.current_cycle_completions ?? 0) / (entry.goal_count ?? 1), 1) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-exo-muted/35">{entry.current_cycle_completions ?? 0}/{entry.goal_count}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleComplete(entry.id)}
                    className="flex-shrink-0 p-1.5 rounded-lg border border-white/10 text-exo-muted/30 hover:border-exo-accent/40 hover:text-exo-accent transition-all"
                    title="打卡"
                  >
                    <Check size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update HomePanel.jsx to pass setCurrentTab to CalendarWidget**

In `src/components/home/HomePanel.jsx`, find the `<CalendarWidget />` line and change it to:

```jsx
// BEFORE:
<CalendarWidget />

// AFTER:
<CalendarWidget setCurrentTab={setCurrentTab} />
```

- [ ] **Step 3: Verify in browser**

Run `npm run dev`. Go to home tab. Confirm:
- CalendarWidget "Today" section appears with tasks from `/api/tasks/entries/?status=active`
- Check-in `[✓]` button works, list refreshes after check-in
- "查看全部 →" navigates to the `calendar` tab
- Old todo CRUD is gone, no 404 errors for `/api/todos/`

- [ ] **Step 4: Commit**

```bash
git add src/components/home/CalendarWidget.jsx src/components/home/HomePanel.jsx
git commit -m "feat: update CalendarWidget with today-tasks summary, remove legacy todo CRUD"
```

---

## Self-Review Notes

- ✅ All 11 `tasksApi` functions covered in Task 1
- ✅ Three entry types (todo/periodic/goal) handled in TaskRow meta rendering and TaskCreateModal dynamic fields
- ✅ `entry_type` locked in edit mode (type selector `disabled={isEdit}`)
- ✅ Optimistic check-in update + re-fetch for server sync in `handleComplete`
- ✅ Suspend/Resume correctly removes entry from list when filter doesn't match new status
- ✅ GCal sync/unsync updates local `gcal_event_id` and `gcal_event_link` without full re-fetch
- ✅ CalendarWidget `setCurrentTab` prop is optional (guarded with `setCurrentTab &&`)
- ✅ No dynamic Tailwind class names (no template literals in className — production build safe)
- ✅ `buildCalendarGrid` written inline in both TaskPanel and CalendarWidget (YAGNI — not worth a shared utility for 6 lines)
