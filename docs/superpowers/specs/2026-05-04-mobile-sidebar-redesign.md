# Mobile Sidebar Redesign

**Date:** 2026-05-04
**Status:** Approved

## Problem

On mobile/standalone PWA:
1. Floating Menu button at `bottom-6 right-6` blocks the send button
2. Page width issues: cache tracker, attachment stats clipped on right, cannot delete
3. Expanding the sidebar shows a large empty panel — useless intermediate state

## Design

Replace the current sidebar expansion mechanism on mobile with a narrow, icon-only floating sidebar triggered by a hexagon button at the top-left.

### States

1. **Default**: Hexagon trigger visible at top-left. No floating sidebar. Full content visible.
2. **Icon bar open**: Narrow (48px) icon column floats over content from left edge, with semi-transparent backdrop. Shows: Hexagon (home), Chat, Agent Hub, Timeline, Calendar, List toggle, Settings, User avatar, Close (X).
3. **Conversation list open** (when List icon clicked): ConversationList slides in as an overlay panel from the left, covering both the icon bar and content.

### Interaction Rules

| Trigger | Action |
|---|---|
| Click hexagon (⬡) | Toggle icon bar open/closed |
| Click nav icon | Navigate to tab, close icon bar |
| Click list icon (☰) | Open conversation list overlay on top |
| Click X | Close icon bar |
| Click backdrop | Close icon bar |
| Select conversation | Close list overlay + icon bar, enter chat |

### Hexagon Trigger Placement

- **Non-standalone mobile**: Inside the top header bar, replacing the hamburger (Menu) button at left.
- **Standalone PWA mobile**: Top header is hidden via `standalone:hidden`. Hexagon renders as a small floating button at `top-4 left-4` (does not block any interactive elements). It must NOT use `standalone:hidden` so it always shows.
- **Desktop**: Hexagon not needed — existing Sidebar handles navigation.

### Breakpoint Behavior

- **`< md` (mobile)**: New `MobileSidebar` component. Old sidebar slide-in overlay removed. Old floating Menu button (`bottom-6 right-6`) removed. `conversationList` overlay (the `absolute inset-y-0 left-0 z-[80] w-80` block) remains for list toggle but is now triggered from MobileSidebar's list icon.
- **`>= md` (desktop)**: Existing Sidebar behavior unchanged.

### Files to Change

| File | Change |
|---|---|
| `App.jsx` | Remove floating Menu button (`bottom-6 right-6`), remove old sidebar overlay, add `MobileSidebar` component, wire `isMobileSidebarOpen` state |
| `Sidebar.jsx` | Unchanged (desktop only) |
| **NEW** `src/components/layout/MobileSidebar.jsx` | Narrow icon-only floating sidebar component with overlay backdrop |

### Not Changing

- Desktop Sidebar behavior
- ConversationList component (reused as-is)
- Tab navigation logic in `handleTabChange`
- `showConvList` state — still used for the conversation list overlay
