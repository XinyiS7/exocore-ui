# ExoCore UI - GEMINI.md

ExoCore UI is a React-based Single Page Application (SPA) designed as the frontend for an advanced AI agent system. It provides a sophisticated interface for interacting with various AI models, managing agent presets, and orchestrating multi-agent "Council" sessions.

## Project Overview

- **Core Purpose**: Provide a high-fidelity, cyberpunk-themed interface for AI agent interaction, memory management, and collaborative agent workflows.
- **Main Technologies**:
  - **Frontend**: React 19, Vite, Tailwind CSS (v3.4).
  - **Icons & Styling**: Lucide React, `@tailwindcss/typography` (for Markdown rendering).
  - **Communication**: Axios, Server-Sent Events (SSE) for real-time streaming.
  - **Architecture**: SPA with view-switching based on local state; no external state management libraries (strictly `useState`/`useEffect`).
  - **Backend Integration**: Proxied to a Django API server (port 8000) for `/api` and `/media` routes.

## Building and Running

| Command | Action |
|---|---|
| `npm install` | Install project dependencies. |
| `npm run dev` | Start the Vite development server (port 5173). |
| `npm run build` | Build for production (Dist output in `dist/`). |
| `npm run lint` | Run ESLint checks across the codebase. |
| `npm run preview` | Preview the production build locally. |

**Known Issue**: `npm run build` may fail due to `lightningcss` errors caused by dynamic Tailwind class construction in `ConversationList.jsx`. Avoid adding new dynamic class patterns like `` `bg-${color}/10` ``.

## Development Conventions

### Design System & Aesthetic
- **Fonts**: `Outfit` (Sans-serif, light weight 200) for UI; `JetBrains Mono` for code and values.
- **Colors**: Uses a custom "Exo" palette defined in `tailwind.config.js`:
  - `exo-bg`: Deep blue-black background (`#111121`).
  - `exo-gold`: Primary accent color (`#d4af37`).
  - `exo-surface`/`exo-panel`: Layers for cards and UI components.
- **Animations**: `pulse-led` for active status indicators; `fade-in` for new elements.

### API & Data Fetching
- **Proxy**: All API requests should use relative paths (`/api/...`). The Vite proxy handles routing to the Django backend.
- **Security**: All mutating requests (POST, PATCH, DELETE) must include `credentials: 'include'` and a CSRF token retrieved from the `csrftoken` cookie.
- **Streaming**: Chat responses use SSE. Handlers in `ChatArea.jsx` process typed events like `content`, `thinking`, and `telemetry`.

### Component Structure
- **Root View**: `App.jsx` manages the `currentTab` ('home', 'chat', 'agent_hub', 'profile', 'settings').
- **Modals**: Use `DestructorModal` for any destructive actions (delete, archive) rather than native `window.confirm`.
- **Chat History**: Implements windowed rendering and infinite scroll via `IntersectionObserver` on the `topSentinelRef`.
- **State Flow**: State is typically lifted to `App.jsx` or the nearest common ancestor and passed down as props. Use refs (`useRef`) for non-rendering state like full message history.

### Special Features
- **Council System**: Orchestrates multiple agents. Phase 0 (Sub Rosa) handles alignment, while subsequent phases use a "Group Chat" view.
- **Memory Management**: AI messages can be "bookmarked" (selective snippets) to be saved as memory entries for specific agents.
- **PWA**: Configured via `vite-plugin-pwa`. Ensure service worker compatibility when adding large assets.

## Key Files
- `src/App.jsx`: Main application entry and state coordinator.
- `src/utils/api.js`: Base API configuration and CSRF utilities.
- `src/utils/councilApi.js`: Specialized API for the Council orchestration system.
- `tailwind.config.js`: Source of truth for the project's design system.
- `CLAUDE.md`: Detailed engineering principles and specific technical patterns.
- `Frontend_WorkLog.md`: Historical log of major UI/UX changes and logic updates.
