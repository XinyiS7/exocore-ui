# V2 Agent Hub & AgentProfile Design

**Date**: 2026-05-19
**Branch**: `newlayout`
**Status**: Design approved, pending implementation

---

## 1. Agent Hub — Card Grid

### 1.1 Layout

Three sections, vertical order: G045 → Superior → Standard. Each section has its own drag-and-drop zone.

| Section | Accent | Columns (lg/md/sm) | Anchor Ticker | Drag |
|---|---|---|---|---|
| G045 Superior Core | Gold (`exo-accent`) | 1 / 1 / 1 | Yes | No (single card) |
| Superior Agents | Purple (`purple-400`) | 3 / 2 / 1 | Yes | Yes |
| Standard Agents | Blue (`blue-400`) | 3 / 2 / 1 | No | Yes |

### 1.2 Card Structure

Each card (clickable, navigates to AgentProfile):
- **Avatar** — top-left, 56px (G045) / 40px (Superior/Standard)
- **Name** + agent_type badge
- **Description** — one-line italic, `line-clamp-2`
- **Drag handle** — ⋮⋮ icon, top-right, hidden on mobile
- **Anchor Ticker** (G045 & Superior only) — below a divider line

### 1.3 Anchor Ticker Redesign

Fix: keywords overflow beyond card, clipped by weight badge.

**Keywords row**: `[ horizontal scroll area | weight_number ]`
- Keywords scroll horizontally, no visible scrollbar
- Right edge: `linear-gradient(to right, transparent, card-bg 70%)` fade-out, **no dividing line**
- Weight badge: pure number (e.g., `0.87`), no "W:" prefix, in a small bordered box

**Essential note scroll**: Replace `requestAnimationFrame` jump-scroll with CSS `transform: translateY()` animation for smooth, non-jerky motion.

**Mobile**: Anchor area reduced to keywords row only; essential_note hidden.

### 1.4 Interactions

- **Click anywhere on card** → `setView('agent_profile', { agentId, agentName })`
- **Drag ⋮⋮ handle** → reorder within section, persisted to `localStorage` (`agentHubOrder`)
- No edit/delete/initiate buttons on cards

---

## 2. AgentProfile — Detail View

### 2.1 Layout — Upper Profile Area

Social-media-style profile editing:

```
[← Back] [AVATAR (click to change)] [Name (inline edit)]     [type badge]
                                   [Description (inline edit)]
                                   [Model: dropdown]

                                   [System Prompt preview bar — "Click to edit ✎"]

                                   [+ New Session] [Manage Memory →]
```

- **Avatar**: Click → file picker → `AvatarCropModal`, PATCH save
- **Name**: Click → border-bottom highlights gold, blur auto-PATCHes
- **Description**: Same inline edit pattern, one-line italic
- **Model**: `<select>` dropdown, auto-PATCH on change
- **System Prompt**: Click → opens `EditPresetModal` (reuses existing modal, unified editing for name/description/model/system_prompt)
- **New Session**: Calls `openNewSession({ presetId })`
- **Manage Memory**: Visible only for G045 & Superior agents; navigates to dedicated Memory management view

### 2.2 Layout — Lower Sessions List

Flat list of sessions for this agent, fetched from `/api/agents/conversations/` filtered by `agent_preset_id`.

Each row: icon + session name + last-active timestamp + message count.
Click → `setView('chat', { sessionId, ... })`.

### 2.3 MemoryEntry Management (G045/Superior only)

Navigated via "Manage Memory →" button. Opens a separate view/page (not modal).

Reuses `MemoryManager` component from `SettingsPanel` with `preset_id` filter pre-applied. Full CRUD: create/edit/delete memory entries, filter by scope/source/is_processed.

---

## 3. Responsive Breakpoints

| Breakpoint | G045 | Superior/Standard cols | Drag | Notes |
|---|---|---|---|---|
| lg+ (≥1024px) | 1 wide | 3 cols | Yes | Full anchor ticker |
| md (768-1023px) | 1 wide | 2 cols | Yes | Full anchor ticker |
| sm (<768px) | 1 wide | 1 col stack | No | Keywords only, no essential_note |

Mobile-specific: page padding `px-4` (vs `px-6 md:px-12`), bottom safe-area for MobileBottomBar.

---

## 4. New/Changed Routes

| View key | Component | Purpose |
|---|---|---|
| `agent_hub` | `AgentHub` (rewritten) | Card grid with tickers |
| `agent_profile` | `AgentProfile` (rewritten) | Profile + sessions + memory link |
| `agent_memory` | New view or MemoryManager reuse | MemoryEntry CRUD per agent |

---

## 5. Shared Components

- `EditPresetModal` — reused for system prompt editing (already exists)
- `AvatarCropModal` — reused for avatar upload (already exists)
- `MemoryManager` — reused for MemoryEntry management (already exists in SettingsPanel)
- `MemoryAnchorTicker` — redesigned (keywords fade-out + smooth scroll + weight number)

---

## 6. Implementation Order

1. Rewrite `MemoryAnchorTicker` — keywords fade-out + weight number + smooth scroll
2. Rewrite `AgentHub` — new card design with ticker, drag-drop, responsive grid
3. Rewrite `AgentProfile` — upper profile editing + lower session list + memory button
4. Add `agent_memory` route — wire MemoryManager with preset_id filter
5. Register new routes in `ContentRouter`
6. Polish: animations, transitions, mobile QA
