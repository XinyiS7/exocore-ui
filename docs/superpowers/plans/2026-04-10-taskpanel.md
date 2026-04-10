# TaskPanel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Chronos task panel: a left-sidebar mini-calendar + right-pane filtered task list, wired into the existing `calendar` tab in App.jsx.

**Architecture:** Two new components — `MiniCalendar.jsx` (self-contained month grid, emits selected date) and `TaskPanel.jsx` (owns all state, fetches entries, applies date/type/status filters, renders TaskRow sections). TaskCreateModal and TaskRow are already built; this plan wires them together.

**Tech Stack:** React 18, Tailwind CSS (static class names only — no template literals), lucide-react icons, existing `tasksApi.js` utility.

> **Note:** This project has no test suite. Skip all TDD steps — implement directly and verify by running `npm run dev`.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/components/tasks/MiniCalendar.jsx` | Month grid, date selection, dot markers |
| Create | `src/components/tasks/TaskPanel.jsx` | All state, filters, section rendering |
| Modify | `src/App.jsx` | Replace `case 'calendar'` placeholder |

---

## Task 1: MiniCalendar.jsx

**Files:**
- Create: `src/components/tasks/MiniCalendar.jsx`

### What it does
Renders a compact monthly calendar. The parent always provides a `selectedDate`; this component handles month navigation internally and calls `onSelectDate` when the user clicks a day or navigates months.

- [ ] **Step 1: Create the file with the calendar grid helper and skeleton**

```jsx
// src/components/tasks/MiniCalendar.jsx
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function buildGrid(year, month) {
  // Monday-first grid. Returns array of {day: number|null, iso: string|null}
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const offset = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push({ day: null, iso: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, iso });
  }
  return cells;
}

function getDotDays(entries) {
  // Returns a Set of ISO date strings that have at least one relevant entry
  const days = new Set();
  const today = new Date().toISOString().slice(0, 10);
  entries.forEach(e => {
    if (e.entry_type === 'todo'     && e.due_date)          days.add(e.due_date);
    if (e.entry_type === 'periodic' && e.next_periodic_due) days.add(e.next_periodic_due);
    if (e.entry_type === 'goal'     && e.cycle_start && e.cycle_due) {
      // mark every day in the goal's cycle range that falls in the current view
      let cur = new Date(e.cycle_start);
      const end = new Date(e.cycle_due);
      while (cur <= end) {
        days.add(cur.toISOString().slice(0, 10));
        cur.setDate(cur.getDate() + 1);
      }
    }
  });
  return days;
}

export default function MiniCalendar({ selectedDate, onSelectDate, entries = [] }) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const initYear  = parseInt(selectedDate.slice(0, 4));
  const initMonth = parseInt(selectedDate.slice(5, 7)) - 1;
  const [viewYear,  setViewYear]  = useState(initYear);
  const [viewMonth, setViewMonth] = useState(initMonth);

  const cells   = buildGrid(viewYear, viewMonth);
  const dotDays = getDotDays(entries);

  const prevMonth = () => {
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    const m = viewMonth === 0 ? 11 : viewMonth - 1;
    setViewYear(y);
    setViewMonth(m);
    const first = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    onSelectDate(first);
  };

  const nextMonth = () => {
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    const m = viewMonth === 11 ? 0 : viewMonth + 1;
    setViewYear(y);
    setViewMonth(m);
    const first = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    onSelectDate(first);
  };

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long',
  });

  return (
    <div className="px-3 py-4 select-none">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1 text-exo-muted/40 hover:text-exo-muted transition-colors rounded">
          <ChevronLeft size={13} />
        </button>
        <span className="text-[10px] uppercase tracking-widest text-exo-text/70">{monthLabel}</span>
        <button onClick={nextMonth} className="p-1 text-exo-muted/40 hover:text-exo-muted transition-colors rounded">
          <ChevronRight size={13} />
        </button>
      </div>

      {/* DOW header */}
      <div className="grid grid-cols-7 mb-1">
        {DOW.map(d => (
          <div key={d} className="text-center text-[9px] text-exo-muted/30 uppercase tracking-wide py-0.5">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((cell, i) => {
          if (!cell.iso) return <div key={i} />;
          const isToday    = cell.iso === todayIso;
          const isSelected = cell.iso === selectedDate;
          const hasDot     = dotDays.has(cell.iso);
          return (
            <button
              key={cell.iso}
              onClick={() => onSelectDate(cell.iso)}
              className={[
                'relative flex flex-col items-center justify-center rounded-lg py-1 text-[11px] transition-all',
                isSelected
                  ? 'bg-exo-accent/20 text-exo-accent'
                  : isToday
                    ? 'border border-exo-accent/50 text-exo-text/80 hover:bg-white/5'
                    : 'text-exo-muted/50 hover:bg-white/5',
              ].join(' ')}
            >
              {cell.day}
              {hasDot && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-exo-accent/50" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/tasks/MiniCalendar.jsx
git commit -m "feat: add MiniCalendar component"
```

---

## Task 2: TaskPanel.jsx — skeleton + data fetching

**Files:**
- Create: `src/components/tasks/TaskPanel.jsx`

Sets up state, fetches entries, and renders a loading/empty shell. No filtering or sections yet.

- [ ] **Step 1: Create TaskPanel with state + fetch**

```jsx
// src/components/tasks/TaskPanel.jsx
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
```

- [ ] **Step 2: Wire into App.jsx**

Open `src/App.jsx`.

Add import at the top with the other component imports:
```jsx
import TaskPanel from './components/tasks/TaskPanel';
```

Replace lines 84–89:
```jsx
      case 'calendar':
        return (
          <div className="flex-1 h-full flex items-center justify-center text-exo-muted/40 text-sm tracking-widest uppercase">
            Task Panel — Coming Soon
          </div>
        );
```
With:
```jsx
      case 'calendar':
        return <TaskPanel openDestructor={openDestructor} />;
```

- [ ] **Step 3: Verify dev server renders the skeleton**

Run `npm run dev`, navigate to the calendar tab. You should see:
- Left sidebar: mini calendar, Type radio, Status radio
- Right pane: header with "新建任务" button
- "加载中..." spinner (or "暂无任务" if API returns empty)

- [ ] **Step 4: Commit**

```bash
git add src/components/tasks/TaskPanel.jsx src/App.jsx
git commit -m "feat: add TaskPanel skeleton with MiniCalendar and data fetch"
```

---

## Task 3: TaskPanel.jsx — filter logic + section rendering

**Files:**
- Modify: `src/components/tasks/TaskPanel.jsx`

Add client-side filtering and render the four sections (pinned, todo, periodic, goal) using existing `TaskRow`.

- [ ] **Step 1: Add filter helpers and mutation handlers inside TaskPanel**

Add these functions inside the `TaskPanel` component body, before the `return` statement:

```jsx
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
  const handleComplete = (id) => completeEntry(id).then(load);

  const handleUpdate = (id, patch) => updateEntry(id, patch).then(load);

  const handleDelete = (id) => openDestructor({
    title: '删除任务',
    description: '此操作将归档该任务，无法撤销。',
    onDelete: () => deleteEntry(id).then(load),
  });

  const handleSuspend  = (id) => suspendEntry(id).then(load);
  const handleResume   = (id) => resumeEntry(id).then(load);
  const handleGcalSync = (id) => syncGcal(id).then(load);
  const handleGcalUnsync = (id) => unsyncGcal(id).then(load);
  const handleEdit     = (entry) => setModalEntry(entry);
```

- [ ] **Step 2: Add section rendering helpers**

Add this helper component at the top of the file, outside `TaskPanel`, after the imports:

```jsx
function SectionHeader({ label }) {
  return (
    <div className="px-4 pt-4 pb-1.5 text-[9px] uppercase tracking-widest text-exo-muted/30 border-b border-white/[0.03]">
      {label}
    </div>
  );
}
```

- [ ] **Step 3: Replace the task list body in the right pane**

Replace the entire contents inside `{/* Task list */}` div (currently the loading/empty states) with:

```jsx
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
            <>
              {/* 📌 Pinned */}
              {pinned.length > 0 && (
                <div className="mx-4 mt-4 border border-exo-accent/30 bg-exo-accent/[0.04] rounded-xl overflow-hidden">
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
                <div>
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
                <div>
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
                <div>
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
            </>
          )}
```

- [ ] **Step 4: Verify in browser**

With `npm run dev` running:
1. Calendar tab shows tasks for today grouped by type
2. Clicking a different day in MiniCalendar updates the list
3. Type filter (left sidebar) narrows sections correctly
4. Status dropdown switches between 进行中 / 已挂起
5. 新建任务 opens `TaskCreateModal`; saving re-fetches and shows the new task
6. TaskRow expand, check-in, edit, suspend/resume, delete all work

- [ ] **Step 5: Commit**

```bash
git add src/components/tasks/TaskPanel.jsx
git commit -m "feat: add TaskPanel filter logic and section rendering"
```

---

## Self-Review

**Spec coverage:**
- ✅ Left sidebar: MiniCalendar + TYPE radio + STATUS radio — Task 1, 2
- ✅ Right pane header + 新建任务 button — Task 2
- ✅ Date selection → filters right pane — Task 3
- ✅ Month navigation → auto-selects 1st of new month — Task 1
- ✅ Dot markers on days with tasks — Task 1
- ✅ Pinned section (gold card) — Task 3
- ✅ Todo / 周期 / 目标 sections — Task 3
- ✅ All TaskRow callbacks wired (complete, edit, delete, suspend, resume, gcal) — Task 3
- ✅ TaskCreateModal for create + edit — Task 2, 3
- ✅ App.jsx wired — Task 2

**Placeholder scan:** No TBD/TODO placeholders present.

**Type consistency:** `handleComplete`, `handleUpdate`, `handleDelete`, `handleSuspend`, `handleResume`, `handleGcalSync`, `handleGcalUnsync`, `handleEdit` — all defined in Task 3 Step 1, all used in Task 3 Step 3. `toggleExpand` defined in Task 2. `SectionHeader` defined in Task 3 Step 2, used in Task 3 Step 3. Consistent throughout.
