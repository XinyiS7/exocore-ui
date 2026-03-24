# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Plan first, work later. 

# Communication Principles
**1. First Principles Thinking**:
  1. Identify the scope and scalability of the requirements.
  2. Break down the requirements into the most basic steps or specific problems.
  3. Rebuild a more scalable and maintainable solution from the ground up.

**Abstraction and decoupling**
  In complex systems, maintain decoupling of sub-modules and abstract functionality to improve maintenance and update performance.

  Possess long-term and holistic thinking; never adopt a simple, fragile, 
 single solution for the sake of quick problem-solving. Prioritize maintaining the system's scalability and robustness.


## Commands

```bash
npm run dev       # Start dev server (http://localhost:5173, also accessible on LAN)
npm run build     # Production build
npm run lint      # ESLint check
npm run preview   # Preview production build
```

There are no tests in this project.

## Architecture

**ExoCore UI** is a React + Vite SPA — the frontend for an AI agent system backed by a Django API server (port 8000). The Vite dev server proxies `/api` and `/media` to `http://127.0.0.1:8000`.

### App structure

`App.jsx` is the root. It manages a `currentTab` string that switches between four views rendered in the main content area:

| Tab | Component | Purpose |
|---|---|---|
| `chat` | `ConversationList` + `ChatArea` | AI chat with SSE streaming |
| `agent_hub` | `AgentManager` | Agent preset management |
| `profile` | `UserProfile` | Twitter-like internal timeline |
| `settings` | `SettingsPanel` | Memory / knowledge file management |

`Sidebar` is always visible and handles tab switching. On mobile it renders as a bottom bar; on desktop it's a left column.

### State management

No external state library. All state is local React `useState`. `App.jsx` owns top-level shared state (`projects`, `presets`, `activeSessionId`) and passes it down as props. There is no Context or global store.

### API communication

All requests use relative URLs (`/api/...`) — the Vite proxy handles routing to Django. Every mutating request must include the CSRF token from the `csrftoken` cookie, retrieved via `getCsrfToken()` in `src/utils/api.js`. All fetch calls include `credentials: 'include'`.

The chat send flow (`ChatArea.jsx`) uses **SSE streaming**: POST to `/api/agents/chat/{id}/`, then reads the response body as a `ReadableStream`. Events are typed (`event: content`, `event: reasoning`, `event: thinking`, `event: anchor_created`, `event: telemetry`).

### localStorage keys

Avatars and user preferences are stored client-side only:

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

Use `prose prose-invert prose-sm` (from `@tailwindcss/typography`) for rendering AI markdown responses.

### Agent types

Presets have an `agent_type` field. `g045` agents are "Superior Cores" — they display a memory anchor ticker (`MemoryAnchorTicker`) showing live memory snapshots fetched from `/api/agents/presets/{id}/anchors/snapshot/`. Standard agents do not have this feature.

### Available models

Defined in `src/utils/api.js` as `AVAILABLE_MODELS`. Currently: `gemini-3-flash-preview`, `gemini-3.1-pro-preview`, `gemini-3.1-flash-lite-preview`, `deepseek-reasoner`, `deepseek-chat`.

### PWA

Configured via `vite-plugin-pwa`. Service worker is disabled in dev mode (`devOptions: { enabled: false }`) to prevent HMR conflicts. API routes use `NetworkFirst` caching; media uses `CacheFirst`.