# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Plan first, work later.

# Communication Principles

**1. First Principles Thinking**:
  1. Identify the scope and scalability of the requirements.
  2. Break down the requirements into the most basic steps or specific problems.
  3. Rebuild a more scalable and maintainable solution from the ground up.

**Abstraction and decoupling**: In complex systems, maintain decoupling of sub-modules and abstract functionality to improve maintenance and update performance. Possess long-term and holistic thinking; never adopt a simple, fragile, single solution for the sake of quick problem-solving. Prioritize maintaining the system's scalability and robustness.

## Commands

```bash
npm run dev       # Start dev server (http://localhost:5173, also accessible on LAN)
npm run build     # Production build (see known issue below)
npm run lint      # ESLint check
npm run preview   # Preview production build
```

There are no tests in this project.

## Architecture

**ExoCore UI** is a React + Vite SPA — the frontend for an AI agent system backed by a Django API server (port 8000). The Vite dev server proxies `/api` and `/media` to `http://127.0.0.1:8000`.

### App structure

`App.jsx` is the root. It manages a `currentTab` string that switches between four views:

| Tab | Component | Purpose |
|---|---|---|
| `chat` | `ConversationList` + `ChatArea` | AI chat with SSE streaming |
| `agent_hub` | `AgentManager` | Agent preset management |
| `profile` | `UserProfile` | Twitter-like internal timeline |
| `settings` | `SettingsPanel` | History & memory management |

`Sidebar` is always visible and handles tab switching. On mobile it renders as a bottom bar; on desktop it's a left column. `ConversationList` slides in as a drawer on mobile.

### State management

No external state library. All state is local React `useState`. `App.jsx` owns top-level shared state (`projects`, `presets`, `activeSessionId`) and passes it down as props. There is no Context or global store.

### API communication

All requests use relative URLs (`/api/...`) — the Vite proxy handles routing to Django. Every mutating request must include the CSRF token from the `csrftoken` cookie, retrieved via `getCsrfToken()` in `src/utils/api.js`. All fetch calls include `credentials: 'include'`.

The chat send flow (`ChatArea.jsx`) uses **SSE streaming**: POST to `/api/agents/chat/{id}/`, then reads the response body as a `ReadableStream`. Events are typed: `content`, `reasoning`, `thinking`, `anchor_created`, `telemetry`.

### Chat history pagination

`ChatArea` fetches the **full message history** on session load and stores it in `allHistoryRef` (a ref, not state). Only the last `MSGS_PER_PAGE = 40` messages are rendered initially in `messages` state. When the user scrolls to the top, an `IntersectionObserver` on `topSentinelRef` fires `loadMoreMessages()`, which slices the next 40 from `allHistoryRef` and prepends them, restoring scroll position via the `scrollHeight` delta pattern. After each SSE stream completes, the history is re-fetched to synchronize real database IDs into the visible messages (needed for the bookmark feature).

### Conversation list grouping

`ConversationList` splits conversations into three visual sections:
- **G045 Superior** — sessions where `agent_type === 'g045'`, shown with gold styling in a bordered card
- **Projects** — sessions with a non-null `project` id, grouped under collapsible project folders; each project folder also has a "Project Files" entry that opens `ProjectFilesArea`
- **Standard Nodes** — all other sessions

### Settings panel

`SettingsPanel` has two top-level tabs (left sidebar):
- **历史管理** (`activeSettingsTab === 'memory'`) — sub-tabs: **文件库** (Obsidian-synced knowledge files, opens `KnowledgeEditModal`) and **会话摘要** (conversation proposals, opens `ProposalEditPanel`)
- **记忆管理** (`activeSettingsTab === 'memory_mgmt'`) — `MemoryManager` component: lists `/api/memory/entries/?preset_id=<id>` with scope/source/is_processed filters, inline edit of `content` + tags (PATCH), and delete

### Message actions

`MessageBubble` renders a small toolbar below each message:
- **Copy** button — copies `msg.content` to clipboard, flashes ✓ for 2 s
- **Bookmark** button (AI messages only) — expands an inline panel pre-filled with the full message text; user can edit to any substring, then POST to `/api/memory/entries/` with `{ message_id, content }`. The same message can be bookmarked multiple times with different selections; deduplication is handled server-side.

### Destructive operations pattern

`DestructorModal` is the shared confirmation dialog for archive/delete actions. Open it via `openDestructor({ title, description, onArchive, onDelete })` passed down from `App.jsx`. Do not use `window.confirm` for destructive UI flows — route through this modal.

### Agent types

Presets have an `agent_type` field. `g045` agents are "Superior Cores" — they display a memory anchor ticker (`MemoryAnchorTicker`) showing live memory snapshots fetched from `/api/agents/presets/{id}/anchors/snapshot/`. Standard agents do not have this feature.

### Available models

Defined in `src/utils/api.js` as `AVAILABLE_MODELS`. Currently: `gemini-3-flash-preview`, `gemini-3.1-pro-preview`, `gemini-3.1-flash-lite-preview`, `deepseek-reasoner`, `deepseek-chat`.

### localStorage keys

| Key | Value |
|---|---|
| `exo_user_avatar_url` | Base64 JPEG of user avatar |
| `exo_user_nick` | Display name |
| `exo_agent_avatar_{presetId}` | Base64 JPEG of agent avatar |
| `exo_draft_{sessionId}` | Unsent message draft |
| `agentHubOrder` | JSON object mapping preset ID to sort order |
| `exo_user_avatar_seed` | Seed for dicebear fallback avatar |

Avatars fall back to dicebear (`notionists` style for user, `bottts` for agents) if no localStorage entry exists.

### Design system

Tailwind CSS with a custom `exo-*` color palette defined in `tailwind.config.js`:

- `exo-bg` — `#050507` (page background)
- `exo-panel` — `#0f1014` (card/panel background)
- `exo-border` — `#1f2027`
- `exo-gold` — `#d4af37` (primary accent)
- `exo-text` — `#e2e8f0`
- `exo-muted` — `#818190`

Use `prose prose-invert prose-sm` (from `@tailwindcss/typography`) for rendering AI markdown responses. **Do not construct Tailwind class names dynamically via template literals** — lightningcss cannot parse them and will break the production build.

### PWA

Configured via `vite-plugin-pwa`. Service worker is disabled in dev mode (`devOptions: { enabled: false }`) to prevent HMR conflicts. API routes use `NetworkFirst` caching; media uses `CacheFirst`.