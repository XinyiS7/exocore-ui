# ExoCore UI Layout Redesign — Design Specification

**Date**: 2026-05-14
**Status**: Awaiting Review
**Scope**: Complete frontend layout rewrite with parallel-development toggle

---

## 1. Goals

- Rewrite the frontend layout from a flat tab-switching architecture to a 3-layer drill-down structure
- Keep all existing communication functionality (SSE streaming, chat, bookmarks, memory anchors) intact
- Develop the new layout in parallel with the old, gated behind a single toggle
- Fix mobile navigation: consistent top bar, compact iOS-style bottom bar
- De-duplicate sidebar responsibilities: navigation only, no inline conversation lists

## 2. Architecture: Shared State + Dual Component Trees

### 2.1 State Extraction

Extract core shared state from `App.jsx` into a `useAppState()` hook:

```js
// src/hooks/useAppState.js
function useAppState() {
  // projects, presets, activeSessionId, refreshKey,
  // openDestructor, openNewSession, modal states, council state
  // Returns the same shape both layout trees consume
}
```

Both the old layout and the new layout consume this hook. When the new layout is complete, the old tree is deleted and `App.jsx` renders only the new tree.

### 2.2 Layout Toggle

```jsx
// In App.jsx
const [layoutVersion, setLayoutVersion] = useState(
  () => localStorage.getItem('exo_layout_version') || 'v1'
);
```

- `v1` renders the current component tree (unchanged)
- `v2` renders the new component tree (under `src/layouts/v2/`)
- Toggle button lives on the welcome page (HomePanel) as a subtle switch, also persisted to localStorage
- Shared state (`useAppState`) is common to both trees

### 2.3 Directory Structure

```
src/
  hooks/
    useAppState.js          # Shared state hook
  layouts/
    v1/                     # Current layout — kept as-is, no modifications
      (existing App.jsx structure remains)
    v2/                     # New layout
      AppShell.jsx           # Entry point for v2 layout
      DesktopShell.jsx       # Desktop: Sidebar + content area
      MobileShell.jsx        # Mobile: bottom bar + header + content area
      Sidebar.jsx            # New sidebar: rigid, icon-only/expanded
      MobileBottomBar.jsx    # iOS-style compact bottom nav
      MobileHeader.jsx       # Context-aware top bar (← back when drilled down, hidden at top level)
      ContentRouter.jsx      # Switches between top-level views
      views/
        Dashboard.jsx        # Welcome page: recent sessions, quick links, calendar
        AgentHub.jsx         # Layer 1: agent card grid (G045 / Superior / Standard)
        AgentProfile.jsx     # Layer 2: split view (memory anchors | session timeline)
        ProjectList.jsx      # Layer 1: project list with inline sessions
        CouncilList.jsx      # Layer 1: council list with inline sessions
        TaskPanel.jsx        # Task + Timeline integrated view
        UserProfile.jsx      # User profile panel
        SettingsPanel.jsx    # Settings (reuses existing)
      shared/                # Components shared between old and new layouts
        (ChatArea, MessageBubble, ConversationList — reused, not rewritten)
```

Existing components (`ChatArea`, `MessageBubble`, `ConversationList`, `AgentManager`, etc.) remain in `src/components/` and are imported by both v1 and v2 shells.

## 3. Navigation: 3-Layer Drill-Down

### 3.1 Sidebar (Desktop)

Rigid width, no floating behavior. Two states: icon-only (64px) and expanded (224px).

**Top → Bottom**:
1. Logo (returns to Dashboard)
2. Agent Hub
3. Project
4. Council
5. Task (+ Timeline integrated)
6. — spacer —
7. User avatar
8. Settings

Each entry navigates to its Layer 1 view. There is no separate "conversation list" sidebar item — sessions are listed within each section's own view.

### 3.2 Layer Model

| Layer | View | Contents |
|-------|------|----------|
| 1 | Section Home | Card grid / list for that section, with inline session list |
| 2 | ChatArea | Reused existing component — SSE stream, bookmarks, message actions |
| 3 | Floating Panels | ContextCache indicator, Attachment panel — existing floating box pattern |

Breadcrumb path: Layer 1 → click session → Layer 2 (ChatArea), with back navigation.

### 3.3 Mobile Navigation

**Bottom Bar** — Kelivo-inspired iOS tactile style:
- Compact height (~48px), thin stroke icons, no chunky Material backgrounds
- Active state: color shift + subtle scale (0.95), no heavy background blocks
- Items: Agent, Project, Council, Task, Settings (same order as desktop, fewer items)
- Always visible, consistent across views

**Top Bar** — Context-aware:
- Top-level section: no header bar (full-bleed content)
- Drilled-down (Layer 2, ChatArea): header appears with ← back arrow + session title
- Drilled-down (AgentProfile): header with ← back + agent name

**Interaction style**: opacity + scale transitions on press — no Material ripple, no heavy border/glow active states.

## 4. Welcome Page (Dashboard)

Replaces current `HomePanel`. Located at the root `/` (or dashboard view).

**Content**:
- Random welcome banner (existing mechanic, keep)
- 3 most recent sessions (across all agent types), clickable to jump directly to ChatArea
- Quick-access cards to Agent / Project / Council / Task sections
- Calendar widget (mini month view)

**Search**: A search bar replaces the "New Session" button — searches across session titles/content and navigates to the result.

## 5. Task + Timeline Integration

- `TaskPanel` is the unified view
- Contains a calendar (month grid)
- Clicking a day shows:
  - Tasks due on that day
  - Tweets/timeline entries whose root post date matches that day
  - If a reply thread crosses multiple days, all replies are shown under the root post's day
- This replaces the standalone `Timeline` view; Timeline's functionality is absorbed

## 6. Mobile Shell vs Desktop Shell

Following the Kelivo pattern: separate shell components, shared content.

```
DesktopShell.jsx → Sidebar.jsx + ContentRouter
MobileShell.jsx  → MobileHeader.jsx + ContentRouter + MobileBottomBar.jsx
```

ContentRouter and all views are shared between shells. Only the navigation chrome differs.

**Desktop-specific**: hover states, right-click menus, keyboard shortcuts.
**Mobile-specific**: swipe-back gesture (where feasible), bottom bar, compact header.

## 7. Existing Components — Reuse Policy

| Component | Fate |
|-----------|------|
| `ChatArea` | Reused as-is — Layer 2 in all flows |
| `MessageBubble` | Reused as-is |
| `ConversationList` | Reused as-is — rendered inline within AgentProfile / ProjectList / CouncilList |
| `AgentManager` | Reused as-is — rendered within AgentHub |
| `SettingsPanel` | Reused as-is |
| `MemoryManager` | Reused as-is |
| `CouncilArea` | Reused — may need minor adaptation for new shell |
| `CouncilStreamView` | Reused as-is |
| `UserProfilePanel` | Reused as-is |
| `HomePanel` | Replaced by `Dashboard.jsx` |
| `Sidebar` (current) | Replaced by `Sidebar.jsx` in v2 |
| `MobileSidebar` (current) | Replaced by `MobileBottomBar.jsx` + `MobileHeader.jsx` |
| `Timeline` | Absorbed into `TaskPanel` |

## 8. Implementation Sequence

1. Extract `useAppState` hook from `App.jsx`
2. Add layout toggle (localStorage flag, toggle button on HomePanel)
3. Create `src/layouts/v2/` skeleton with empty shells
4. Build `DesktopShell` + `Sidebar` + `ContentRouter` (static, no views yet)
5. Build `MobileShell` + `MobileBottomBar` + `MobileHeader`
6. Build `Dashboard` (welcome page) — this is the first visible v2 view
7. Build `AgentHub` (Layer 1) → `AgentProfile` (Layer 2)
8. Build `ProjectList` with inline sessions
9. Build `CouncilList` with inline sessions
10. Integrate `TaskPanel` (calendar + timeline merged)
11. Wire up all Layer 2 transitions to `ChatArea` / `CouncilArea`
12. Polish mobile interactions (transitions, swipe-back)
13. Remove v1 tree, toggle, and cleanup `App.jsx`

## 9. Non-Goals

- Rewriting `ChatArea` or SSE streaming logic
- Changing the Django API or backend
- Adding a router library (react-router) — manual view switching is sufficient for this scale
- Redesigning SettingsPanel internals
- Modifying the memory/bookmark system
- Real-time updates or websockets
