# TaskPanel Design Spec
2026-04-10 · Chronos System

## Overview

A dedicated task management panel accessible via the `calendar` tab in the sidebar. Consists of two new components plus wiring into `App.jsx`.

**New files:**
- `src/components/tasks/MiniCalendar.jsx`
- `src/components/tasks/TaskPanel.jsx`

**Modified files:**
- `src/App.jsx` — replace `case 'calendar'` placeholder with `<TaskPanel />`

---

## MiniCalendar.jsx

### Props
| Prop | Type | Description |
|---|---|---|
| `selectedDate` | `string` | ISO date string (`YYYY-MM-DD`), always set |
| `onSelectDate` | `(dateStr: string) => void` | Called when user clicks a day |
| `entries` | `array` | All task entries, used to compute dot markers |

### Behaviour
- Manages `viewYear` / `viewMonth` state internally (month navigation via `<` / `>` buttons)
- On month change (prev/next), calls `onSelectDate` with the 1st of the new month
- No "deselect" — a date is always selected
- Dot marker logic (a day gets a dot if any entry is relevant on that date):
  - `todo`: `due_date === day`
  - `periodic`: `next_periodic_due === day`
  - `goal`: `cycle_start <= day <= cycle_due`

### Visual states
| State | Style |
|---|---|
| Today | `border border-exo-gold/50` |
| Selected | `bg-exo-accent/20 text-exo-accent` |
| Has tasks (dot) | Small `bg-exo-accent/50` dot below the number |
| Default | `text-exo-muted/50 hover:bg-white/5` |

### Layout
- Header: month/year label + `<` / `>` nav buttons
- Grid: Mo–Su header row, then day cells in a 7-column grid
- Width: fits within the 220px left sidebar

---

## TaskPanel.jsx

### State
| Name | Type | Default | Description |
|---|---|---|---|
| `entries` | `array` | `[]` | All fetched entries |
| `loading` | `bool` | `true` | Fetch in progress |
| `selectedDate` | `string` | today | Drives calendar + right-pane filter |
| `typeFilter` | `string` | `'all'` | `'all' \| 'todo' \| 'periodic' \| 'goal'` |
| `statusFilter` | `string` | `'active'` | `'active' \| 'suspended'` |
| `expandedId` | `number\|null` | `null` | Which TaskRow is expanded |
| `modalEntry` | `object\|null` | `null` | `null`=closed, `{}`=create, `entry`=edit |

### Data fetching
- `fetchEntries({ status: statusFilter })` on mount and whenever `statusFilter` changes
- After any mutation (complete / update / delete / suspend / resume / gcal), re-fetch to keep list in sync

### Filter logic (applied client-side after fetch)
1. `typeFilter !== 'all'` → keep only entries where `entry_type === typeFilter`
2. `selectedDate` filter:
   - `todo`: `due_date === selectedDate`
   - `periodic`: `next_periodic_due === selectedDate`
   - `goal`: `cycle_start <= selectedDate <= cycle_due`
3. `is_pinned` entries are pulled out first and rendered in the 📌 section, also subject to the same filters

### Right-pane sections (rendered only when non-empty)
```
📌 置顶 / ESCALATED   ← pinned entries (gold border card)
── Todo               ← entry_type === 'todo'
── 周期任务            ← entry_type === 'periodic'
── 目标               ← entry_type === 'goal'
```

### Layout
```
┌─ Left sidebar (220px, bg-exo-panel) ─┬─ Right pane (flex-1) ──────────────────┐
│  MiniCalendar                         │  Header: CHRONOS SYSTEM  [+ 新建任务]  │
│                                       │  ─────────────────────────────────────  │
│  TYPE (radio)                         │  [全部][Todo][周期][目标]  [状态▾]      │
│  ● 全部 ○ Todo ○ 周期 ○ 目标          │                                        │
│                                       │  Sections (TaskRow components)          │
│  STATUS (radio)                       │                                        │
│  ● 进行中 ○ 已挂起                    │                                        │
└──────────────────────────────────────┴────────────────────────────────────────┘
```

### Mutations wired to TaskRow callbacks
| Callback | API call | Post-action |
|---|---|---|
| `onComplete` | `completeEntry(id)` | re-fetch |
| `onUpdate` | `updateEntry(id, patch)` | re-fetch |
| `onDelete` | opens DestructorModal → `deleteEntry(id)` | re-fetch |
| `onSuspend` | `suspendEntry(id)` | re-fetch |
| `onResume` | `resumeEntry(id)` | re-fetch |
| `onGcalSync` | `syncGcal(id)` | re-fetch |
| `onGcalUnsync` | `unsyncGcal(id)` | re-fetch |
| `onEdit` | sets `modalEntry = entry` | opens TaskCreateModal |

### Props received from App.jsx
- `openDestructor` — shared DestructorModal opener (already passed to other panels)

---

## App.jsx change

Replace:
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

---

## Style reference (from design system)
- Section headers: `text-[10px] uppercase tracking-widest text-exo-muted/40`
- Pinned card: `border border-exo-gold/30 bg-exo-gold/[0.04] rounded-xl`
- Left sidebar: `bg-exo-panel border-r border-exo-border`
- All Tailwind classes must be static strings (no template literal dynamic classes)
