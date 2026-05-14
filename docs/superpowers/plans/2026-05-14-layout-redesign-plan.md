# ExoCore UI Layout Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite ExoCore frontend layout with dual v1/v2 parallel trees, 3-layer drill-down navigation, Kelivo-inspired mobile shell, and integrated Task+Timeline panel.

**Architecture:** Extract shared state (projects, presets, activeSessionId, modals) into `useAppState` hook. App.jsx renders either v1 layout (unchanged) or v2 AppShell based on a localStorage toggle. V2 has separate DesktopShell (rigid Sidebar) and MobileShell (iOS-style bottom bar + context-aware header). ChatArea and all communication components are reused as-is.

**Tech Stack:** React 18 + Vite, Tailwind CSS (exo-* palette), lucide-react icons, no external router

---

### Task 1: Extract `useAppState` Hook

**Files:**
- Create: `src/hooks/useAppState.js`
- Modify: `src/App.jsx:1-66`

- [ ] **Step 1: Create `src/hooks/useAppState.js`**

Extract data-fetching and shared state from App.jsx into a single hook. Navigation state (currentTab, showConvList, isSidebarExpanded, etc.) stays in App.jsx — it's v1-specific. Only truly shared state comes out.

```js
import { useState, useEffect } from 'react';
import { baseUrl } from '../utils/api';
import { listCouncilSessions } from '../utils/councilApi';

export function useAppState() {
  const [activeSessionId, setActiveSessionId] = useState(() => {
    const saved = localStorage.getItem('exo_active_session');
    return saved ? Number(saved) : null;
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [projects, setProjects] = useState([]);
  const [presets, setPresets] = useState([]);
  const [activeFileProjectId, setActiveFileProjectId] = useState(null);

  // Council state
  const [activeCouncilId, setActiveCouncilId] = useState(null);
  const [councilSessions, setCouncilSessions] = useState([]);

  // Modals
  const [destructorConfig, setDestructorConfig] = useState({ isOpen: false });
  const [newSessionConfig, setNewSessionConfig] = useState({ isOpen: false, initialContext: null });
  const [showCouncilCreate, setShowCouncilCreate] = useState(false);

  // Profile panel
  const [showProfilePanel, setShowProfilePanel] = useState(false);

  // Persist activeSessionId
  useEffect(() => {
    if (activeSessionId) localStorage.setItem('exo_active_session', String(activeSessionId));
    else localStorage.removeItem('exo_active_session');
  }, [activeSessionId]);

  // Fetch projects & presets on mount
  useEffect(() => {
    fetch(`${baseUrl}/api/core/projects/`, { credentials: 'include' })
      .then(res => res.json())
      .then(setProjects)
      .catch(err => console.error('Projects load failed', err));

    fetch(`${baseUrl}/api/agents/presets/`, { credentials: 'include' })
      .then(res => res.json())
      .then(setPresets)
      .catch(err => console.error('Presets load failed', err));
  }, []);

  const refreshPresets = () => {
    fetch(`${baseUrl}/api/agents/presets/`, { credentials: 'include' })
      .then(res => res.json())
      .then(setPresets)
      .catch(err => console.error('Presets refresh failed', err));
  };

  const refreshCouncilSessions = () => {
    listCouncilSessions()
      .then(setCouncilSessions)
      .catch(err => console.error('Council list load failed:', err));
  };

  useEffect(() => { refreshCouncilSessions(); }, [refreshKey]);

  const openDestructor = (config) => setDestructorConfig({ ...config, isOpen: true });
  const openNewSession = (initialContext = null) => setNewSessionConfig({ isOpen: true, initialContext });

  return {
    // Data
    projects, setProjects,
    presets, setPresets,
    // Session
    activeSessionId, setActiveSessionId,
    refreshKey, setRefreshKey,
    activeFileProjectId, setActiveFileProjectId,
    // Council
    activeCouncilId, setActiveCouncilId,
    councilSessions, setCouncilSessions,
    showCouncilCreate, setShowCouncilCreate,
    // Modals
    destructorConfig, setDestructorConfig,
    newSessionConfig, setNewSessionConfig,
    openDestructor, openNewSession,
    // Profile
    showProfilePanel, setShowProfilePanel,
    // Refresh
    refreshPresets, refreshCouncilSessions,
  };
}
```

- [ ] **Step 2: Rewrite `src/App.jsx` to use `useAppState`**

Replace the inline useState/useEffect blocks with the hook. Keep all v1 navigation state and renderMainContent exactly as-is. We're only swapping the data source.

At the top of App.jsx, replace lines 24-65 (all useState/useEffect for shared state + fetch effects) with the hook call:

```jsx
import React, { useState, useEffect } from 'react';
import 'highlight.js/styles/atom-one-dark.css';
import { Hexagon, MessageSquare, Users, Plus } from 'lucide-react';
import { useAppState } from './hooks/useAppState';

import DestructorModal from './components/modals/DestructorModal';
import NewSessionModal from './components/modals/NewSessionModal';
import Sidebar from './components/layout/Sidebar';
import MobileSidebar from './components/layout/MobileSidebar';
import ConversationList from './components/chat/ConversationList';
import ChatArea from './components/chat/ChatArea';
import ProjectFilesArea from './components/project/ProjectFilesArea';
import AgentManager from './components/agent/AgentManager';
import Timeline from './components/Timeline';
import UserProfilePanel from './components/UserProfilePanel';
import SettingsPanel from './components/settings/SettingsPanel';
import CouncilArea from './components/council/CouncilArea';
import CouncilCreateModal from './components/council/CouncilCreateModal';
import HomePanel from './components/home/HomePanel';
import TaskPanel from './components/tasks/TaskPanel';

export default function App() {
  const {
    projects, setProjects,
    presets,
    activeSessionId, setActiveSessionId,
    refreshKey, setRefreshKey,
    activeFileProjectId, setActiveFileProjectId,
    activeCouncilId, setActiveCouncilId,
    councilSessions,
    showCouncilCreate, setShowCouncilCreate,
    destructorConfig, setDestructorConfig,
    newSessionConfig, setNewSessionConfig,
    openDestructor, openNewSession,
    showProfilePanel, setShowProfilePanel,
    refreshPresets, refreshCouncilSessions,
  } = useAppState();

  // --- v1 navigation state (unchanged) ---
  const [currentTab, setCurrentTab] = useState(() => localStorage.getItem('exo_active_tab') || 'home');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [showConvList, setShowConvList] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('exo_active_tab', currentTab);
  }, [currentTab]);

  const handleTabChange = (tab) => {
    setCurrentTab(tab);
    if (tab !== 'chat') {
      setActiveSessionId(null);
      localStorage.removeItem('exo_active_session');
      setActiveFileProjectId(null);
    }
    if (tab !== 'council') { setActiveCouncilId(null); }
    setIsMobileSidebarOpen(false);
  };

  // --- renderMainContent (unchanged) ---

  const renderMainContent = () => {
    switch (currentTab) {
      case 'home':
        return <HomePanel setCurrentTab={handleTabChange} />;
      case 'calendar':
        return <TaskPanel openDestructor={openDestructor} />;
      case 'chat':
        if (activeFileProjectId) return <ProjectFilesArea projectId={activeFileProjectId} projects={projects} openDestructor={openDestructor} />;
        if (activeSessionId) return (
          <ChatArea
            activeSessionId={activeSessionId}
            setActiveSessionId={setActiveSessionId}
            setRefreshKey={setRefreshKey}
            setShowConvList={setShowConvList}
            openNewSession={openNewSession}
            presets={presets}
          />
        );
        return (
          <ConversationList
            mode="chat" isMainView={true} activeSessionId={activeSessionId}
            setActiveSessionId={setActiveSessionId} projects={projects} setProjects={setProjects}
            refreshKey={refreshKey} openDestructor={openDestructor} openNewSession={openNewSession}
            activeFileProjectId={activeFileProjectId} setActiveFileProjectId={setActiveFileProjectId}
          />
        );
      case 'project':
        if (activeFileProjectId) return <ProjectFilesArea projectId={activeFileProjectId} projects={projects} openDestructor={openDestructor} />;
        if (activeSessionId) return (
          <ChatArea
            activeSessionId={activeSessionId} setActiveSessionId={setActiveSessionId}
            setRefreshKey={setRefreshKey} setShowConvList={setShowConvList}
            openNewSession={openNewSession} presets={presets}
          />
        );
        return (
          <ConversationList
            mode="project" isMainView={true} projects={projects} setProjects={setProjects}
            refreshKey={refreshKey} openDestructor={openDestructor} openNewSession={openNewSession}
            setActiveFileProjectId={setActiveFileProjectId} setActiveSessionId={setActiveSessionId}
          />
        );
      case 'council':
        if (activeCouncilId) return (
          <CouncilArea councilId={activeCouncilId} presets={presets}
            onBack={() => setActiveCouncilId(null)} setShowConvList={setShowConvList}
            openNewSession={openNewSession} />
        );
        return (
          <ConversationList
            mode="council" isMainView={true} councilSessions={councilSessions}
            activeCouncilId={activeCouncilId} setActiveCouncilId={setActiveCouncilId}
            onCreateCouncil={() => setShowCouncilCreate(true)} refreshKey={refreshKey}
            setRefreshKey={setRefreshKey} openDestructor={openDestructor}
            openNewSession={openNewSession} projects={projects} setActiveSessionId={setActiveSessionId}
          />
        );
      case 'agent_hub':
        return <AgentManager openNewSession={openNewSession} openDestructor={openDestructor}
          setCurrentTab={handleTabChange} presets={presets} refreshPresets={refreshPresets} />;
      case 'timeline':
        return <Timeline presets={presets} />;
      case 'settings':
        return <SettingsPanel projects={projects} presets={presets} openDestructor={openDestructor} />;
      default:
        return <HomePanel setCurrentTab={handleTabChange} />;
    }
  };

  // --- JSX (unchanged, same return block) ---

  return (
    <div className="w-full h-[100dvh] bg-exo-bg text-white font-sans flex overflow-hidden relative selection:bg-exo-accent/30 selection:text-white pt-safe pb-safe">
      <UserProfilePanel isOpen={showProfilePanel} onClose={() => setShowProfilePanel(false)} />
      <DestructorModal {...destructorConfig} onClose={() => setDestructorConfig(p => ({...p, isOpen: false}))} />
      <CouncilCreateModal isOpen={showCouncilCreate} onClose={() => setShowCouncilCreate(false)}
        presets={presets} onSuccess={(newId) => { refreshCouncilSessions(); setActiveCouncilId(newId); handleTabChange('council'); }} />
      <NewSessionModal isOpen={newSessionConfig.isOpen}
        onClose={() => setNewSessionConfig(p => ({...p, isOpen: false}))}
        projects={projects} presets={presets} initialContext={newSessionConfig.initialContext}
        onSuccess={(newSessionId) => { setRefreshKey(prev => prev + 1); setActiveSessionId(newSessionId); if (currentTab === 'home') handleTabChange('chat'); }} />

      <MobileSidebar currentTab={currentTab} setCurrentTab={handleTabChange}
        showConvList={showConvList} setShowConvList={setShowConvList}
        isOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)}
        onOpenProfile={() => setShowProfilePanel(true)} />

      <div className="hidden md:block h-full flex-shrink-0">
        <Sidebar currentTab={currentTab} setCurrentTab={handleTabChange}
          showConvList={showConvList} setShowConvList={setShowConvList}
          isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded}
          onOpenProfile={() => setShowProfilePanel(true)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        <div className="md:hidden h-14 border-b border-exo-mist-10 flex items-center px-4 shrink-0 bg-exo-pure/60 backdrop-blur-md justify-between standalone:hidden">
          <button onClick={() => setIsMobileSidebarOpen(true)} className="p-1.5 text-exo-muted hover:text-exo-accent transition-colors rounded-[4px] border border-exo-mist-8 hover:border-exo-accent/30">
            <Hexagon size={20} />
          </button>
          <div className="text-exo-accent font-mono font-bold tracking-[0.3em] text-[10px] uppercase">ExoCore // Neural.Link</div>
          <div className="w-10" />
        </div>

        <button onClick={() => setIsMobileSidebarOpen(true)}
          className="md:hidden fixed top-3 left-3 z-[100] w-10 h-10 rounded-[4px] bg-exo-pure/90 border border-exo-accent/30 text-exo-accent flex items-center justify-center backdrop-blur-md shadow-glow-gold active:scale-95 transition-all standalone:flex hidden">
          <Hexagon size={20} />
        </button>

        <div className="flex-1 flex flex-row overflow-hidden relative">
          {showConvList && (['chat', 'council', 'project'].includes(currentTab)) && (
            <div className="absolute inset-y-0 left-0 z-[80] w-80 h-full shadow-[30px_0_60px_rgba(0,0,0,0.8)]">
              <ConversationList mode={currentTab} activeSessionId={activeSessionId}
                setActiveSessionId={(id) => { setActiveSessionId(id); setActiveFileProjectId(null); setActiveCouncilId(null); setShowConvList(false); setIsMobileSidebarOpen(false); }}
                projects={projects} setProjects={setProjects} refreshKey={refreshKey} setRefreshKey={setRefreshKey}
                openDestructor={openDestructor} openNewSession={openNewSession}
                activeFileProjectId={activeFileProjectId} setActiveFileProjectId={setActiveFileProjectId}
                showConvList={showConvList} onClose={() => setShowConvList(false)}
                councilSessions={councilSessions} activeCouncilId={activeCouncilId}
                setActiveCouncilId={(id) => { setActiveCouncilId(id); setActiveSessionId(null); setShowConvList(false); setIsMobileSidebarOpen(false); }}
                onCreateCouncil={() => setShowCouncilCreate(true)} />
            </div>
          )}
          <div className="flex-1 min-w-0 overflow-hidden relative h-full">
            {renderMainContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify v1 still works**

Run: `npm run dev`
Check: App loads, all tabs work, chat streaming functions. No regressions.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useAppState.js src/App.jsx
git commit -m "refactor: extract useAppState hook from App.jsx"
```

---

### Task 2: Add Layout Toggle

**Files:**
- Modify: `src/App.jsx` (add toggle state + button injection)
- Modify: `src/components/home/HomePanel.jsx` (add toggle button)

- [ ] **Step 1: Add layout version state to App.jsx**

At the top of the App component, add:

```jsx
const [layoutVersion, setLayoutVersion] = useState(
  () => localStorage.getItem('exo_layout_version') || 'v1'
);

useEffect(() => {
  localStorage.setItem('exo_layout_version', layoutVersion);
}, [layoutVersion]);
```

- [ ] **Step 2: Add toggle button to HomePanel.jsx**

Insert a subtle toggle in the Hero Section, after the `<p>` description line. In `HomePanel.jsx`, after line 61 (`链路延迟 2ms`), add:

```jsx
<div className="pt-4 flex items-center gap-2">
  <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-exo-muted">Layout</span>
  <button
    onClick={() => {
      const next = localStorage.getItem('exo_layout_version') === 'v2' ? 'v1' : 'v2';
      localStorage.setItem('exo_layout_version', next);
      window.dispatchEvent(new CustomEvent('layout-version-changed', { detail: next }));
    }}
    className="relative w-10 h-5 rounded-full border border-exo-mist-10 bg-exo-pure transition-colors hover:border-exo-accent/30"
  >
    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-exo-accent/60 transition-all ${localStorage.getItem('exo_layout_version') === 'v2' ? 'left-5' : 'left-0.5'}`} />
  </button>
  <span className="text-[10px] font-mono text-exo-muted">
    {localStorage.getItem('exo_layout_version') === 'v2' ? 'v2 (new)' : 'v1'}
  </span>
</div>
```

- [ ] **Step 3: Wire toggle to App.jsx — wrap render tree in conditional**

In App.jsx, replace the return block's main content div (the flex container holding Sidebar + main area) with a conditional. The cleanest approach: wrap the entire v1 layout in a condition, and add an event listener for the toggle.

```jsx
useEffect(() => {
  const handler = (e) => setLayoutVersion(e.detail);
  window.addEventListener('layout-version-changed', handler);
  return () => window.removeEventListener('layout-version-changed', handler);
}, []);
```

Then wrap the v1 JSX in a conditional:

```jsx
return (
  <div className="w-full h-[100dvh] bg-exo-bg text-white font-sans flex overflow-hidden relative selection:bg-exo-accent/30 selection:text-white pt-safe pb-safe">
    {/* Shared modals — always rendered */}
    <UserProfilePanel isOpen={showProfilePanel} onClose={() => setShowProfilePanel(false)} />
    <DestructorModal {...destructorConfig} onClose={() => setDestructorConfig(p => ({...p, isOpen: false}))} />
    <CouncilCreateModal isOpen={showCouncilCreate} onClose={() => setShowCouncilCreate(false)}
      presets={presets} onSuccess={(newId) => { refreshCouncilSessions(); setActiveCouncilId(newId); handleTabChange('council'); }} />
    <NewSessionModal isOpen={newSessionConfig.isOpen}
      onClose={() => setNewSessionConfig(p => ({...p, isOpen: false}))}
      projects={projects} presets={presets} initialContext={newSessionConfig.initialContext}
      onSuccess={(newSessionId) => { setRefreshKey(prev => prev + 1); setActiveSessionId(newSessionId); if (currentTab === 'home') handleTabChange('chat'); }} />

    {layoutVersion === 'v1' ? (
      <>
        {/* --- All existing v1 JSX unchanged --- */}
        <MobileSidebar ... />
        <div className="hidden md:block ..."><Sidebar ... /></div>
        <div className="flex-1 flex flex-col min-w-0 relative h-full">
          ...mobile header...
          <div className="flex-1 flex flex-row overflow-hidden relative">
            ...showConvList panel...
            <div className="flex-1 min-w-0 overflow-hidden relative h-full">
              {renderMainContent()}
            </div>
          </div>
        </div>
      </>
    ) : (
      <div className="flex-1 flex items-center justify-center text-exo-muted">
        <p className="font-mono text-sm">v2 shell — coming soon</p>
      </div>
    )}
  </div>
);
```

- [ ] **Step 4: Verify toggle works**

Run: `npm run dev`
Check: Toggle button on home page. Click it → placeholder text appears. Click again → v1 layout returns. No errors in console.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/components/home/HomePanel.jsx
git commit -m "feat: add v1/v2 layout toggle on welcome page"
```

---

### Task 3: Create v2 Shell Skeleton

**Files:**
- Create: `src/layouts/v2/AppShell.jsx`
- Create: `src/layouts/v2/DesktopShell.jsx`
- Create: `src/layouts/v2/MobileShell.jsx`
- Create: `src/layouts/v2/ContentRouter.jsx`
- Modify: `src/App.jsx` (wire AppShell into v2 branch)

- [ ] **Step 1: Create `src/layouts/v2/ContentRouter.jsx`**

Simple placeholder that switches between top-level views. For now, renders a placeholder.

```jsx
import React from 'react';

export default function ContentRouter({ view, setView, viewParams, appState }) {
  // view: 'dashboard' | 'agent_hub' | 'project' | 'council' | 'task' | 'settings'
  // viewParams: { agentId, sessionId, projectId, councilId, day } etc.
  // Will be wired up as we build each view

  return (
    <div className="flex-1 flex items-center justify-center text-exo-muted">
      <div className="text-center space-y-2">
        <p className="font-mono text-sm uppercase tracking-[0.3em] text-exo-accent/60">ExoCore v2</p>
        <p className="text-xs text-exo-muted">{view} — content coming soon</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/layouts/v2/DesktopShell.jsx`**

```jsx
import React from 'react';
import Sidebar from './Sidebar';
import ContentRouter from './ContentRouter';

export default function DesktopShell({ view, setView, viewParams, appState }) {
  return (
    <div className="hidden md:flex w-full h-full">
      <Sidebar view={view} setView={setView} appState={appState} />
      <div className="flex-1 min-w-0 overflow-hidden">
        <ContentRouter view={view} setView={setView} viewParams={viewParams} appState={appState} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/layouts/v2/MobileShell.jsx`**

```jsx
import React from 'react';
import MobileHeader from './MobileHeader';
import MobileBottomBar from './MobileBottomBar';
import ContentRouter from './ContentRouter';

export default function MobileShell({ view, setView, viewParams, appState }) {
  return (
    <div className="md:hidden w-full h-full flex flex-col">
      <MobileHeader view={view} viewParams={viewParams} onBack={() => setView('dashboard')} />
      <div className="flex-1 min-h-0 overflow-hidden">
        <ContentRouter view={view} setView={setView} viewParams={viewParams} appState={appState} />
      </div>
      <MobileBottomBar view={view} setView={setView} appState={appState} />
    </div>
  );
}
```

- [ ] **Step 4: Create `src/layouts/v2/AppShell.jsx`**

Entry point for v2 layout. Manages v2's own navigation state independently from v1.

```jsx
import React, { useState } from 'react';
import DesktopShell from './DesktopShell';
import MobileShell from './MobileShell';

export default function AppShell({ appState }) {
  const [view, setView] = useState('dashboard');
  const [viewParams, setViewParams] = useState({});

  // viewParams stores drill-down context: { agentId, sessionId, projectId, councilId, day }
  const navigate = (nextView, params = {}) => {
    setViewParams(params);
    setView(nextView);
  };

  return (
    <div className="flex-1 flex min-w-0 h-full">
      <DesktopShell view={view} setView={navigate} viewParams={viewParams} appState={appState} />
      <MobileShell view={view} setView={navigate} viewParams={viewParams} appState={appState} />
    </div>
  );
}
```

- [ ] **Step 5: Create placeholder `src/layouts/v2/Sidebar.jsx`**

```jsx
import React from 'react';

export default function Sidebar({ view, setView, appState }) {
  return (
    <div className="w-16 h-full bg-exo-pure border-r border-exo-mist-8 flex flex-col items-center py-6 gap-4 text-exo-muted">
      <p className="text-[8px] font-mono tracking-[0.3em] text-exo-accent/40 rotate-90 mt-20 whitespace-nowrap">EXOCORE</p>
    </div>
  );
}
```

- [ ] **Step 6: Create placeholder `src/layouts/v2/MobileBottomBar.jsx`**

```jsx
import React from 'react';

export default function MobileBottomBar({ view, setView, appState }) {
  return (
    <div className="h-12 bg-exo-pure border-t border-exo-mist-8 flex items-center justify-center">
      <p className="text-[8px] font-mono tracking-[0.3em] text-exo-muted">AGENT · PROJECT · COUNCIL · TASK</p>
    </div>
  );
}
```

- [ ] **Step 7: Create placeholder `src/layouts/v2/MobileHeader.jsx`**

```jsx
import React from 'react';

export default function MobileHeader({ view, viewParams, onBack }) {
  return (
    <div className="h-10 bg-exo-pure border-b border-exo-mist-8 flex items-center px-3">
      <p className="text-[8px] font-mono tracking-[0.3em] text-exo-muted uppercase">{view}</p>
    </div>
  );
}
```

- [ ] **Step 8: Wire AppShell into App.jsx**

In App.jsx, add the import:

```jsx
import AppShell from './layouts/v2/AppShell';
```

Replace the v2 placeholder in the conditional:

```jsx
) : (
  <AppShell appState={{
    projects, setProjects, presets, activeSessionId, setActiveSessionId,
    refreshKey, setRefreshKey, activeFileProjectId, setActiveFileProjectId,
    activeCouncilId, setActiveCouncilId, councilSessions,
    showCouncilCreate, setShowCouncilCreate,
    destructorConfig, setDestructorConfig,
    newSessionConfig, setNewSessionConfig,
    openDestructor, openNewSession,
    showProfilePanel, setShowProfilePanel,
    refreshPresets, refreshCouncilSessions,
  }} />
)}
```

- [ ] **Step 9: Verify v2 shell renders**

Run: `npm run dev`
Toggle to v2 → see desktop sidebar placeholder + content placeholder. Mobile view (resize browser) → see header + placeholder + bottom bar. Toggle back to v1 → everything works.

- [ ] **Step 10: Commit**

```bash
git add src/layouts/ src/App.jsx
git commit -m "feat: create v2 shell skeleton with desktop/mobile placeholders"
```

---

### Task 4: Build Sidebar Component

**Files:**
- Modify: `src/layouts/v2/Sidebar.jsx`

- [ ] **Step 1: Rewrite Sidebar.jsx with full navigation**

Replace the placeholder with the full sidebar. Two states: icon-only (64px) and expanded (224px). Uses lucide-react icons matching the new nav structure.

```jsx
import React, { useState } from 'react';
import {
  Hexagon, BrainCircuit, FolderKanban, Building2, CheckSquare,
  Settings, PanelLeftOpen, PanelLeftClose
} from 'lucide-react';
import { getUserAvatarUrl } from '../../utils/avatar';

const NavIcon = ({ icon: Icon, label, isActive, onClick, isExpanded }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 w-full px-3 py-2.5 transition-all group/nav relative ${
      isActive ? 'text-exo-accent' : 'text-exo-muted hover:text-exo-text'
    }`}
  >
    <div className={`p-1.5 rounded-md transition-all shrink-0 ${
      isActive ? 'bg-exo-accent/10' : 'group-hover/nav:bg-white/5'
    }`}>
      <Icon size={18} strokeWidth={1.5} />
    </div>
    {isExpanded && (
      <span className="text-sm font-medium whitespace-nowrap text-exo-text">{label}</span>
    )}
    {isActive && (
      <div className="absolute right-0 w-0.5 h-5 bg-exo-accent rounded-l-full" />
    )}
    {!isExpanded && (
      <div className="absolute left-14 px-2 py-1 bg-exo-panel border border-exo-border rounded text-[10px] text-exo-accent opacity-0 group-hover/nav:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100]">
        {label}
      </div>
    )}
  </button>
);

const NAV_ITEMS = [
  { id: 'agent_hub', icon: BrainCircuit, label: '代理中枢' },
  { id: 'project', icon: FolderKanban, label: '工程项目' },
  { id: 'council', icon: Building2, label: '理事会' },
  { id: 'task', icon: CheckSquare, label: '任务与时序' },
];

export default function Sidebar({ view, setView, appState }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const userAvatarUrl = getUserAvatarUrl();
  const userNick = localStorage.getItem('exo_user_nick') || 'Exo User';

  return (
    <div
      className={`h-full flex flex-col items-center justify-between z-[100] transition-all duration-300 ease-out bg-exo-pure border-r border-exo-mist-8 py-6 flex-shrink-0 ${
        isExpanded ? 'w-56' : 'w-16'
      }`}
    >
      {/* Logo — returns to dashboard */}
      <div className="flex flex-col items-center w-full space-y-4">
        <button
          onClick={() => setView('dashboard')}
          className={`flex items-center gap-3 px-3 py-2 w-full group/logo ${
            view === 'dashboard' ? 'text-exo-accent' : 'text-exo-muted hover:text-exo-accent/70'
          }`}
        >
          <div className={`p-1.5 rounded-md border transition-all shrink-0 ${
            view === 'dashboard'
              ? 'border-exo-accent/40 bg-exo-accent/5 shadow-glow-gold'
              : 'border-exo-mist-10 group-hover/logo:border-exo-accent/30'
          }`}>
            <Hexagon size={18} strokeWidth={1.5} />
          </div>
          {isExpanded && (
            <span className="text-[10px] font-bold tracking-[0.3em] text-exo-accent uppercase">ExoCore</span>
          )}
        </button>

        {/* Expand/collapse toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 text-exo-muted hover:text-exo-accent transition-colors self-center"
        >
          {isExpanded ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
        </button>

        <div className="w-8 h-px bg-exo-mist-8" />

        {/* Nav items */}
        <div className="flex flex-col items-center w-full gap-0.5">
          {NAV_ITEMS.map(({ id, icon, label }) => (
            <NavIcon
              key={id}
              icon={icon}
              label={label}
              isActive={view === id}
              isExpanded={isExpanded}
              onClick={() => setView(id)}
            />
          ))}
        </div>
      </div>

      {/* Bottom: User + Settings */}
      <div className="flex flex-col items-center gap-3 w-full">
        {/* Settings */}
        <NavIcon
          icon={Settings}
          label="系统配置"
          isActive={view === 'settings'}
          isExpanded={isExpanded}
          onClick={() => setView('settings')}
        />

        {/* User avatar */}
        <button
          onClick={() => appState.setShowProfilePanel(true)}
          className="flex items-center gap-3 w-full px-3 py-1 hover:bg-white/5 transition-all"
        >
          <img
            src={userAvatarUrl}
            className="w-8 h-8 rounded-md border border-exo-mist-10 object-cover bg-exo-pure hover:border-exo-accent/30 transition-all"
            alt="User"
          />
          {isExpanded && (
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-exo-accent/80 truncate">{userNick}</p>
              <p className="text-[9px] text-exo-muted truncate">EXO-CORE AUTH</p>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify sidebar**

Run: `npm run dev` → toggle to v2.
Check: Sidebar visible on desktop (md+). Icons highlight on click. Expand/collapse works. Logo returns to dashboard.

- [ ] **Step 3: Commit**

```bash
git add src/layouts/v2/Sidebar.jsx
git commit -m "feat: build v2 sidebar with navigation and expand/collapse"
```

---

### Task 5: Build Mobile Shell Components

**Files:**
- Modify: `src/layouts/v2/MobileBottomBar.jsx`
- Modify: `src/layouts/v2/MobileHeader.jsx`

- [ ] **Step 1: Rewrite MobileBottomBar.jsx**

Kelivo-inspired: compact height, thin stroke icons, active state via color + subtle scale, no chunky backgrounds.

```jsx
import React from 'react';
import { BrainCircuit, FolderKanban, Building2, CheckSquare, Settings } from 'lucide-react';

const BOTTOM_ITEMS = [
  { id: 'agent_hub', icon: BrainCircuit, label: 'Agent' },
  { id: 'project', icon: FolderKanban, label: 'Project' },
  { id: 'council', icon: Building2, label: 'Council' },
  { id: 'task', icon: CheckSquare, label: 'Task' },
];

export default function MobileBottomBar({ view, setView }) {
  return (
    <div className="flex-shrink-0 h-12 bg-exo-pure border-t border-exo-mist-6 flex items-center justify-around px-2 safe-bottom">
      {BOTTOM_ITEMS.map(({ id, icon: Icon, label }) => {
        const isActive = view === id;
        return (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 transition-all duration-150 active:scale-95 ${
              isActive ? 'text-exo-accent scale-95' : 'text-exo-muted opacity-60 hover:opacity-100'
            }`}
          >
            <Icon size={17} strokeWidth={1.5} />
            <span className="text-[8px] font-medium tracking-wider uppercase">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite MobileHeader.jsx**

Context-aware: hidden at top-level views, appears with ← back + title when drilled down.

```jsx
import React from 'react';
import { ArrowLeft } from 'lucide-react';

const VIEW_LABELS = {
  dashboard: '',
  agent_hub: '',
  project: '',
  council: '',
  task: '',
  settings: 'Settings',
};

export default function MobileHeader({ view, viewParams, onBack }) {
  // Top-level sections: no header (full-bleed)
  const isTopLevel = ['dashboard', 'agent_hub', 'project', 'council', 'task'].includes(view) && !viewParams.sessionId && !viewParams.agentId;
  if (isTopLevel && view !== 'settings') return null;

  const title = viewParams.sessionTitle || viewParams.agentName || VIEW_LABELS[view] || view;

  return (
    <div className="flex-shrink-0 h-10 bg-exo-pure border-b border-exo-mist-6 flex items-center px-3 gap-2">
      <button
        onClick={onBack}
        className="p-1 text-exo-muted hover:text-exo-accent active:scale-90 transition-all"
      >
        <ArrowLeft size={16} strokeWidth={1.5} />
      </button>
      <span className="text-xs font-medium text-exo-text truncate">{title}</span>
    </div>
  );
}
```

- [ ] **Step 3: Verify mobile shell**

Run: `npm run dev` → toggle to v2 → resize browser to mobile width (<768px).
Check: Bottom bar visible, items highlight on tap. Header hidden at top level. No layout overflow.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/v2/MobileBottomBar.jsx src/layouts/v2/MobileHeader.jsx
git commit -m "feat: build Kelivo-inspired mobile bottom bar and context-aware header"
```

---

### Task 6: Build Dashboard View

**Files:**
- Create: `src/layouts/v2/views/Dashboard.jsx`
- Modify: `src/layouts/v2/ContentRouter.jsx` (wire Dashboard)

- [ ] **Step 1: Create `src/layouts/v2/views/Dashboard.jsx`**

Welcome page with: random welcome banner, 3 most recent sessions (fetched from API), quick-access cards, mini calendar.

```jsx
import React, { useState, useEffect } from 'react';
import { BrainCircuit, FolderKanban, Building2, CheckSquare, Search, ArrowRight, MessageSquare } from 'lucide-react';
import CalendarWidget from '../../../components/home/CalendarWidget';
import { baseUrl } from '../../../utils/api';

const WELCOME_SENTENCES = [
  'Neural link established. All systems nominal.',
  'Welcome back, Operator. The cores await.',
  'Cognitive engines online. Ready for input.',
  'ExoCore grid stable. Proceed with intent.',
  'Synaptic pathways clear. What shall we build?',
];

const QUICK_LINKS = [
  { id: 'agent_hub', icon: BrainCircuit, label: '代理中枢', desc: 'Agent 管理与配置' },
  { id: 'project', icon: FolderKanban, label: '工程项目', desc: '长线任务与文件' },
  { id: 'council', icon: Building2, label: '理事会', desc: '多 Agent 协同' },
  { id: 'task', icon: CheckSquare, label: '任务与时序', desc: '日程与时间线' },
];

export default function Dashboard({ appState, setView, setViewParams }) {
  const userNick = localStorage.getItem('exo_user_nick') || 'Exo User';
  const [recentSessions, setRecentSessions] = useState([]);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    setGreeting(WELCOME_SENTENCES[Math.floor(Math.random() * WELCOME_SENTENCES.length)]);
  }, []);

  useEffect(() => {
    fetch(`${baseUrl}/api/agents/sessions/?limit=3`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setRecentSessions(data.results || data))
      .catch(() => setRecentSessions([]));
  }, [appState.refreshKey]);

  const handleSearchFocus = () => {
    // For now, just navigate to chat. Full search can be added later.
    setView('agent_hub');
  };

  const handleSessionClick = (session) => {
    appState.setActiveSessionId(session.id);
    setView('chat', { sessionId: session.id, sessionTitle: session.title });
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-exo-bg scrollbar-hide">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-72 bg-exo-accent/5 blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 md:px-12 py-12 md:py-20 flex flex-col gap-14 relative z-10">
        {/* Hero */}
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-exo-accent/40" />
            <span className="text-[10px] font-mono uppercase tracking-[0.5em] text-exo-accent/60">ExoCore // System.Ready</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-light leading-ultra-tight tracking-tight text-white">
            Welcome back, <span className="text-exo-accent font-medium">{userNick.toUpperCase()}</span>
          </h1>
          <p className="text-base text-exo-muted max-w-xl font-light">{greeting}</p>

          {/* Search bar */}
          <div className="pt-2 max-w-md">
            <div
              onClick={handleSearchFocus}
              className="flex items-center gap-3 px-4 py-3 bg-exo-pure border border-exo-mist-10 rounded-md hover:border-exo-accent/30 cursor-pointer transition-all group"
            >
              <Search size={16} className="text-exo-muted group-hover:text-exo-accent transition-colors" />
              <span className="text-sm text-exo-muted group-hover:text-exo-text transition-colors">搜索会话...</span>
            </div>
          </div>
        </div>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <div className="space-y-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-3">
              <div className="h-px w-6 bg-exo-accent/30" />
              <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-exo-muted">Recent Sessions</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentSessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => handleSessionClick(session)}
                  className="group flex items-center gap-4 p-5 bg-exo-pure border border-exo-mist-10 rounded-md hover:border-exo-accent/30 hover:shadow-glow-gold transition-all text-left"
                >
                  <div className="p-2.5 rounded-md bg-exo-accent/5 border border-exo-mist-10 text-exo-accent group-hover:shadow-glow-gold transition-all">
                    <MessageSquare size={18} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{session.title || `Session #${session.id}`}</p>
                    <p className="text-[10px] font-mono text-exo-muted mt-0.5">
                      {session.agent_name || 'Agent'} · {session.message_count || 0} msgs
                    </p>
                  </div>
                  <ArrowRight size={14} className="text-exo-mist-20 group-hover:text-exo-accent group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: '0.15s' }}>
          {QUICK_LINKS.map(({ id, icon: Icon, label, desc }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className="group flex flex-col items-center gap-3 p-6 bg-exo-pure border border-exo-mist-10 rounded-md hover:border-exo-accent/30 transition-all text-center"
            >
              <div className="p-3 rounded-md bg-white/[0.03] border border-exo-mist-10 text-exo-accent group-hover:shadow-glow-gold transition-all">
                <Icon size={22} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-medium text-white group-hover:text-exo-accent transition-colors">{label}</p>
                <p className="text-[10px] text-exo-muted mt-0.5 font-mono uppercase tracking-wider">{desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Calendar */}
        <div className="space-y-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-3">
            <div className="h-px w-6 bg-exo-accent/30" />
            <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-exo-muted">Calendar</span>
          </div>
          <div className="bg-exo-pure border border-exo-mist-10 rounded-md p-1">
            <CalendarWidget />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire Dashboard into ContentRouter.jsx**

```jsx
import React from 'react';
import Dashboard from './views/Dashboard';

export default function ContentRouter({ view, setView, viewParams, appState }) {
  if (view === 'dashboard') {
    return <Dashboard appState={appState} setView={setView} setViewParams={setViewParams} />;
  }

  return (
    <div className="flex-1 flex items-center justify-center text-exo-muted">
      <div className="text-center space-y-2">
        <p className="font-mono text-sm uppercase tracking-[0.3em] text-exo-accent/60">ExoCore v2</p>
        <p className="text-xs text-exo-muted">{view} — coming soon</p>
      </div>
    </div>
  );
}
```

Note: ContentRouter needs the `setViewParams` prop. Update `DesktopShell.jsx` and `MobileShell.jsx` to pass it through. Add `viewParams` to the ContentRouter call in both shells, and add `setViewParams` to their prop destructuring. In AppShell.jsx, pass `viewParams` and the navigate function as `setViewParams`:

In AppShell.jsx, update:
```jsx
<DesktopShell view={view} setView={navigate} viewParams={viewParams} appState={appState} />
<MobileShell view={view} setView={navigate} viewParams={viewParams} appState={appState} />
```

And in both shells, pass `viewParams` to ContentRouter.

- [ ] **Step 3: Verify dashboard**

Run: `npm run dev` → toggle to v2.
Check: Welcome banner, recent sessions (if any), quick links navigate correctly, calendar loads. Search bar is visible.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/v2/views/Dashboard.jsx src/layouts/v2/ContentRouter.jsx src/layouts/v2/DesktopShell.jsx src/layouts/v2/MobileShell.jsx src/layouts/v2/AppShell.jsx
git commit -m "feat: build v2 dashboard with recent sessions, quick links, and calendar"
```

---

### Task 7: Build AgentHub View

**Files:**
- Create: `src/layouts/v2/views/AgentHub.jsx`
- Modify: `src/layouts/v2/ContentRouter.jsx` (wire AgentHub)

- [ ] **Step 1: Create `src/layouts/v2/views/AgentHub.jsx`**

Card grid with G045 / Superior / Standard sections. Reuses AgentManager's data but with new layout.

```jsx
import React from 'react';
import { Star, Zap, Cpu } from 'lucide-react';
import { getAgentAvatarUrl } from '../../../utils/avatar';

const SectionHeader = ({ icon: Icon, label, accent }) => (
  <div className="flex items-center gap-2 mb-4">
    <Icon size={14} strokeWidth={1.5} className={accent || 'text-exo-accent'} />
    <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-exo-muted">{label}</span>
  </div>
);

const AgentCard = ({ preset, onClick }) => {
  const avatarUrl = getAgentAvatarUrl(preset.id);
  return (
    <button
      onClick={() => onClick(preset)}
      className="group flex items-center gap-4 p-4 bg-exo-pure border border-exo-mist-10 rounded-md hover:border-exo-accent/30 transition-all text-left w-full"
    >
      <img
        src={avatarUrl}
        className="w-10 h-10 rounded-md border border-exo-mist-10 object-cover bg-exo-pure shrink-0"
        alt={preset.name}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white group-hover:text-exo-accent transition-colors truncate">{preset.name}</p>
        <p className="text-[10px] text-exo-muted truncate mt-0.5">{preset.description || preset.agent_type}</p>
      </div>
    </button>
  );
};

export default function AgentHub({ appState, setView }) {
  const { presets } = appState;

  const g045Presets = presets.filter(p => p.agent_type === 'g045');
  const superiorPresets = presets.filter(p => p.agent_type !== 'g045' && p.agent_type !== 'standard');
  const standardPresets = presets.filter(p => p.agent_type === 'standard');

  const handleAgentClick = (preset) => {
    setView('agent_profile', { agentId: preset.id, agentName: preset.name });
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-exo-bg scrollbar-hide">
      <div className="max-w-5xl mx-auto px-6 md:px-12 py-12 space-y-10">
        {/* G045 Section */}
        {g045Presets.length > 0 && (
          <section>
            <SectionHeader icon={Star} label="G045 Superior Core" accent="text-exo-accent" />
            <div className="bg-exo-pure border border-exo-accent/20 rounded-md p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {g045Presets.map(p => (
                  <AgentCard key={p.id} preset={p} onClick={handleAgentClick} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Superior Section */}
        {superiorPresets.length > 0 && (
          <section>
            <SectionHeader icon={Zap} label="Superior Agents" accent="text-purple-400" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {superiorPresets.map(p => (
                <AgentCard key={p.id} preset={p} onClick={handleAgentClick} />
              ))}
            </div>
          </section>
        )}

        {/* Standard Section */}
        {standardPresets.length > 0 && (
          <section>
            <SectionHeader icon={Cpu} label="Standard Agents" accent="text-blue-400" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {standardPresets.map(p => (
                <AgentCard key={p.id} preset={p} onClick={handleAgentClick} />
              ))}
            </div>
          </section>
        )}

        {presets.length === 0 && (
          <div className="text-center py-20 text-exo-muted">
            <p className="font-mono text-sm">No agents configured</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire AgentHub into ContentRouter.jsx**

Add import and case:
```jsx
import AgentHub from './views/AgentHub';

// in ContentRouter:
if (view === 'agent_hub') {
  return <AgentHub appState={appState} setView={setView} />;
}
```

- [ ] **Step 3: Verify AgentHub**

Run: `npm run dev` → toggle to v2 → click Agent in sidebar.
Check: Agent cards render grouped by type. Clicking a card should navigate (even though AgentProfile isn't built yet — it'll show placeholder).

- [ ] **Step 4: Commit**

```bash
git add src/layouts/v2/views/AgentHub.jsx src/layouts/v2/ContentRouter.jsx
git commit -m "feat: build v2 AgentHub with G045/Superior/Standard card grid"
```

---

### Task 8: Build AgentProfile View

**Files:**
- Create: `src/layouts/v2/views/AgentProfile.jsx`
- Modify: `src/layouts/v2/ContentRouter.jsx` (wire AgentProfile)

- [ ] **Step 1: Create `src/layouts/v2/views/AgentProfile.jsx`**

Split view: left column (30-40%) = memory anchors, right column (60-70%) = session list fetched from API. ConversationList doesn't have an "agent" mode, so we fetch and render sessions inline.

```jsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageSquare, Plus } from 'lucide-react';
import { getAgentAvatarUrl } from '../../../utils/avatar';
import { baseUrl } from '../../../utils/api';

export default function AgentProfile({ appState, setView, viewParams }) {
  const { presets, setActiveSessionId, openNewSession } = appState;
  const preset = presets.find(p => p.id === viewParams.agentId);
  const [anchors, setAnchors] = useState([]);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    if (!preset) return;
    fetch(`${baseUrl}/api/agents/presets/${preset.id}/anchors/snapshot/`, { credentials: 'include' })
      .then(res => res.json())
      .then(setAnchors)
      .catch(() => setAnchors([]));

    fetch(`${baseUrl}/api/agents/sessions/?preset_id=${preset.id}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setSessions(data.results || data))
      .catch(() => setSessions([]));
  }, [preset, appState.refreshKey]);

  if (!preset) {
    return (
      <div className="flex-1 flex items-center justify-center text-exo-muted">
        <p className="font-mono text-sm">Agent not found</p>
      </div>
    );
  }

  const avatarUrl = getAgentAvatarUrl(preset.id);

  const handleSessionClick = (session) => {
    setActiveSessionId(session.id);
    setView('chat', { sessionId: session.id, agentId: preset.id, agentName: preset.name, sessionTitle: session.title });
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-exo-bg">
      {/* Meta Header */}
      <div className="flex-shrink-0 border-b border-exo-mist-8 px-6 md:px-12 py-4 flex items-center gap-4">
        <button onClick={() => setView('agent_hub')} className="p-1.5 text-exo-muted hover:text-exo-accent transition-colors">
          <ArrowLeft size={18} strokeWidth={1.5} />
        </button>
        <img src={avatarUrl} className="w-9 h-9 rounded-md border border-exo-mist-10 object-cover bg-exo-pure" alt={preset.name} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{preset.name}</p>
          <p className="text-[10px] text-exo-muted uppercase tracking-wider">{preset.agent_type}</p>
        </div>
        <button
          onClick={() => openNewSession({ presetId: preset.id })}
          className="flex items-center gap-2 px-4 py-2 bg-exo-accent/10 border border-exo-accent/30 rounded-md text-exo-accent text-xs font-medium hover:bg-exo-accent/20 active:scale-95 transition-all"
        >
          <Plus size={14} strokeWidth={1.5} />
          New Session
        </button>
      </div>

      {/* Split View */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Memory Anchors */}
        <div className="w-full md:w-[35%] lg:w-[30%] border-b md:border-b-0 md:border-r border-exo-mist-8 overflow-y-auto p-4 space-y-3">
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-exo-muted px-2">Memory Anchors</p>
          {anchors.length === 0 ? (
            <p className="text-xs text-exo-muted px-2">No anchors captured yet.</p>
          ) : (
            anchors.map(a => (
              <div key={a.id} className="p-3 bg-exo-pure border border-exo-mist-8 rounded-md">
                <p className="text-xs text-exo-text line-clamp-3">{a.content}</p>
                {a.tags && a.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {a.tags.map(t => (
                      <span key={t} className="text-[9px] px-1.5 py-0.5 bg-exo-accent/10 text-exo-accent rounded">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Right: Session Timeline */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-exo-muted mb-3">Sessions</p>
          {sessions.length === 0 ? (
            <p className="text-xs text-exo-muted">No sessions yet.</p>
          ) : (
            <div className="space-y-2">
              {sessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => handleSessionClick(s)}
                  className="group flex items-center gap-3 w-full p-3 bg-exo-pure border border-exo-mist-8 rounded-md hover:border-exo-accent/30 transition-all text-left"
                >
                  <div className="p-2 rounded-md bg-exo-accent/5 border border-exo-mist-10 text-exo-accent group-hover:shadow-glow-gold transition-all">
                    <MessageSquare size={14} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{s.title || `Session #${s.id}`}</p>
                    <p className="text-[9px] text-exo-muted mt-0.5">{s.message_count || 0} messages</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire AgentProfile into ContentRouter.jsx**

```jsx
import AgentProfile from './views/AgentProfile';

// in ContentRouter:
if (view === 'agent_profile') {
  return <AgentProfile appState={appState} setView={setView} viewParams={viewParams} />;
}
```

- [ ] **Step 3: Verify AgentProfile**

Run: `npm run dev` → v2 → Agent Hub → click an agent.
Check: Header with avatar, name, [New Session] button. Left column shows anchors (or empty state). Right column shows session list.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/v2/views/AgentProfile.jsx src/layouts/v2/ContentRouter.jsx
git commit -m "feat: build v2 AgentProfile with split view (anchors | sessions)"
```

---

### Task 9: Build ProjectList View

**Files:**
- Create: `src/layouts/v2/views/ProjectList.jsx`
- Modify: `src/layouts/v2/ContentRouter.jsx` (wire ProjectList)

- [ ] **Step 1: Create `src/layouts/v2/views/ProjectList.jsx`**

Reuses ConversationList in project mode.

```jsx
import React from 'react';
import ConversationList from '../../../components/chat/ConversationList';

export default function ProjectList({ appState, setView }) {
  const { projects, setProjects, refreshKey, setRefreshKey, openDestructor, openNewSession, setActiveSessionId, setActiveFileProjectId, activeSessionId, activeFileProjectId, presets } = appState;

  return (
    <div className="flex-1 h-full overflow-hidden bg-exo-bg">
      <ConversationList
        mode="project"
        isMainView={true}
        projects={projects}
        setProjects={setProjects}
        refreshKey={refreshKey}
        setRefreshKey={setRefreshKey}
        openDestructor={openDestructor}
        openNewSession={openNewSession}
        setActiveFileProjectId={(id) => {
          setActiveFileProjectId(id);
          if (id) setView('project_files', { projectId: id });
        }}
        setActiveSessionId={(id) => {
          setActiveSessionId(id);
          if (id) setView('chat', { sessionId: id });
        }}
        activeSessionId={activeSessionId}
        activeFileProjectId={activeFileProjectId}
        presets={presets}
      />
    </div>
  );
}
```

- [ ] **Step 2: Wire ProjectList into ContentRouter.jsx**

```jsx
import ProjectList from './views/ProjectList';

// in ContentRouter:
if (view === 'project') {
  return <ProjectList appState={appState} setView={setView} />;
}
```

- [ ] **Step 3: Verify ProjectList**

Run: `npm run dev` → v2 → click Project in sidebar.
Check: Project list with folders renders. Clicking a session navigates to chat (placeholder for now).

- [ ] **Step 4: Commit**

```bash
git add src/layouts/v2/views/ProjectList.jsx src/layouts/v2/ContentRouter.jsx
git commit -m "feat: build v2 ProjectList with inline project sessions"
```

---

### Task 10: Build CouncilList View

**Files:**
- Create: `src/layouts/v2/views/CouncilList.jsx`
- Modify: `src/layouts/v2/ContentRouter.jsx` (wire CouncilList)

- [ ] **Step 1: Create `src/layouts/v2/views/CouncilList.jsx`**

```jsx
import React from 'react';
import ConversationList from '../../../components/chat/ConversationList';

export default function CouncilList({ appState, setView }) {
  const { councilSessions, activeCouncilId, setActiveCouncilId, refreshKey, setRefreshKey, openDestructor, openNewSession, projects, setActiveSessionId, showCouncilCreate, setShowCouncilCreate } = appState;

  return (
    <div className="flex-1 h-full overflow-hidden bg-exo-bg">
      <ConversationList
        mode="council"
        isMainView={true}
        councilSessions={councilSessions}
        activeCouncilId={activeCouncilId}
        setActiveCouncilId={(id) => {
          setActiveCouncilId(id);
          if (id) setView('council_chat', { councilId: id });
        }}
        onCreateCouncil={() => setShowCouncilCreate(true)}
        refreshKey={refreshKey}
        setRefreshKey={setRefreshKey}
        openDestructor={openDestructor}
        openNewSession={openNewSession}
        projects={projects}
        setActiveSessionId={setActiveSessionId}
      />
    </div>
  );
}
```

- [ ] **Step 2: Wire CouncilList into ContentRouter.jsx**

```jsx
import CouncilList from './views/CouncilList';

// in ContentRouter:
if (view === 'council') {
  return <CouncilList appState={appState} setView={setView} />;
}
```

- [ ] **Step 3: Verify CouncilList**

Run: `npm run dev` → v2 → click Council.
Check: Council sessions list renders. Create button works.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/v2/views/CouncilList.jsx src/layouts/v2/ContentRouter.jsx
git commit -m "feat: build v2 CouncilList with council sessions"
```

---

### Task 11: Build TaskPanel (Task + Timeline)

**Files:**
- Create: `src/layouts/v2/views/TaskPanel.jsx`
- Modify: `src/layouts/v2/ContentRouter.jsx` (wire TaskPanel)

- [ ] **Step 1: Create `src/layouts/v2/views/TaskPanel.jsx`**

Integrated calendar + tasks + timeline. Reuses existing MiniCalendar and Timeline components.

```jsx
import React, { useState } from 'react';
import Clock from 'lucide-react';
import TaskPanel_ from '../../../components/tasks/TaskPanel';
import Timeline from '../../../components/Timeline';

export default function TaskPanel({ appState }) {
  const { presets, openDestructor } = appState;
  const [selectedDate, setSelectedDate] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'timeline'

  return (
    <div className="flex-1 h-full flex flex-col bg-exo-bg overflow-hidden">
      {/* Header with date selector */}
      <div className="flex-shrink-0 border-b border-exo-mist-8 px-6 md:px-12 py-4 flex items-center gap-4">
        <h2 className="text-sm font-medium text-white">任务与时序</h2>
        <div className="flex-1" />
        <div className="flex gap-1 bg-exo-pure border border-exo-mist-8 rounded-md p-0.5">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider rounded transition-all ${
              activeTab === 'tasks' ? 'bg-exo-accent/10 text-exo-accent' : 'text-exo-muted hover:text-exo-text'
            }`}
          >
            Tasks
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider rounded transition-all ${
              activeTab === 'timeline' ? 'bg-exo-accent/10 text-exo-accent' : 'text-exo-muted hover:text-exo-text'
            }`}
          >
            Timeline
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {activeTab === 'tasks' ? (
          <TaskPanel_ openDestructor={openDestructor} />
        ) : (
          <Timeline presets={presets} selectedDate={selectedDate} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire TaskPanel into ContentRouter.jsx**

```jsx
import TaskPanel from './views/TaskPanel';

// in ContentRouter:
if (view === 'task') {
  return <TaskPanel appState={appState} />;
}
```

- [ ] **Step 3: Verify TaskPanel**

Run: `npm run dev` → v2 → click Task.
Check: Calendar renders. Tasks tab shows existing task panel. Timeline tab shows timeline.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/v2/views/TaskPanel.jsx src/layouts/v2/ContentRouter.jsx
git commit -m "feat: build v2 TaskPanel with integrated calendar, tasks, and timeline"
```

---

### Task 12: Wire Layer 2 Transitions + Shared Modals

**Files:**
- Modify: `src/layouts/v2/ContentRouter.jsx`
- Modify: `src/layouts/v2/AppShell.jsx`

- [ ] **Step 1: Update ContentRouter to handle chat and council views**

Add cases for `chat`, `council_chat`, `project_files`, `settings` views. These reuse existing components directly.

```jsx
import React from 'react';
import Dashboard from './views/Dashboard';
import AgentHub from './views/AgentHub';
import AgentProfile from './views/AgentProfile';
import ProjectList from './views/ProjectList';
import CouncilList from './views/CouncilList';
import TaskPanel from './views/TaskPanel';

// Reused existing components
import ChatArea from '../../components/chat/ChatArea';
import CouncilArea from '../../components/council/CouncilArea';
import ProjectFilesArea from '../../components/project/ProjectFilesArea';
import SettingsPanel from '../../components/settings/SettingsPanel';
import UserProfilePanel from '../../components/UserProfilePanel';

export default function ContentRouter({ view, setView, viewParams, appState }) {
  const { activeSessionId, setActiveSessionId, setRefreshKey, openNewSession, presets,
          activeCouncilId, setActiveCouncilId, projects, openDestructor,
          showCouncilCreate, setShowCouncilCreate } = appState;

  switch (view) {
    case 'dashboard':
      return <Dashboard appState={appState} setView={setView} setViewParams={setViewParams} />;

    case 'agent_hub':
      return <AgentHub appState={appState} setView={setView} />;

    case 'agent_profile':
      return <AgentProfile appState={appState} setView={setView} viewParams={viewParams} />;

    case 'project':
      return <ProjectList appState={appState} setView={setView} />;

    case 'project_files':
      return <ProjectFilesArea projectId={viewParams.projectId} projects={projects} openDestructor={openDestructor} />;

    case 'council':
      return <CouncilList appState={appState} setView={setView} />;

    case 'council_chat':
      return (
        <CouncilArea
          councilId={viewParams.councilId || activeCouncilId}
          presets={presets}
          onBack={() => setView('council')}
          setShowConvList={() => {}}
          openNewSession={openNewSession}
        />
      );

    case 'chat':
      return (
        <ChatArea
          activeSessionId={viewParams.sessionId || activeSessionId}
          setActiveSessionId={setActiveSessionId}
          setRefreshKey={setRefreshKey}
          setShowConvList={() => {}}
          openNewSession={openNewSession}
          presets={presets}
        />
      );

    case 'task':
      return <TaskPanel appState={appState} />;

    case 'settings':
      return <SettingsPanel projects={projects} presets={presets} openDestructor={openDestructor} />;

    default:
      return <Dashboard appState={appState} setView={setView} setViewParams={setViewParams} />;
  }
}
```

- [ ] **Step 2: Update MobileHeader for drill-down titles**

When `view === 'chat'` or `view === 'council_chat'` or `view === 'agent_profile'`, the header should show. Update `MobileHeader.jsx`:

```jsx
const isTopLevel = ['dashboard', 'agent_hub', 'project', 'council', 'task'].includes(view)
  && !viewParams.sessionId && !viewParams.agentId && !viewParams.councilId;
```

- [ ] **Step 3: Verify full flow**

Run: `npm run dev` → v2.
Test flow: Dashboard → Agent Hub → click agent → AgentProfile → click session → ChatArea loads with SSE streaming.
Test flow: Dashboard → Project → click project session → ChatArea.
Test flow: Dashboard → Council → click council → CouncilArea.
Test: Dashboard → Task → tasks/timeline tabs.
Check: Mobile: bottom bar visible throughout, header appears on drill-down with back button.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/v2/ContentRouter.jsx src/layouts/v2/MobileHeader.jsx
git commit -m "feat: wire all Layer 2 transitions and shared existing components"
```

---

### Task 13: Settings View + Polish + Cleanup

**Files:**
- Modify: `src/layouts/v2/ContentRouter.jsx` (already done in Task 12)
- Modify: `src/layouts/v2/views/Dashboard.jsx` (refine search bar, if needed)
- Modify: `src/App.jsx` (eventual removal of v1 after validation)

- [ ] **Step 1: Verify settings view**

Run: `npm run dev` → v2 → click Settings in sidebar.
Check: SettingsPanel renders with memory management and history tabs.

- [ ] **Step 2: Test all v2 flows end-to-end**

Run through every navigation path:
- Dashboard → Agent Hub → Agent Profile → Session → Chat (SSE streaming works)
- Dashboard → Project → Session → Chat
- Dashboard → Council → Council Chat
- Dashboard → Task → Tasks tab / Timeline tab
- Settings → both sub-tabs
- Mobile: bottom bar, header back button, no overflow/scroll issues
- Toggle back to v1: everything still works

- [ ] **Step 3: Polish mobile interactions**

In `MobileBottomBar.jsx`, ensure transitions are smooth:
```jsx
// Already using active:scale-95 and transition-all — verify it feels good
```

In `MobileHeader.jsx`, add a subtle slide-down animation:
```jsx
// Add className: animate-fade-in (already defined in tailwind.config.js)
```

- [ ] **Step 4: Commit**

```bash
git add src/layouts/v2/
git commit -m "feat: complete v2 layout with all views, navigation, and mobile polish"
```

---

### Post-Implementation: Remove v1 (separate PR)

After v2 is validated and used for a period:

1. Delete `src/App.jsx` v1 branch and `renderMainContent`
2. Remove `layoutVersion` toggle state
3. Remove toggle button from `HomePanel.jsx`
4. Delete `src/components/layout/Sidebar.jsx` and `MobileSidebar.jsx`
5. Move `AppShell.jsx` content into `App.jsx` directly
6. Delete `src/layouts/v1/` (if it was ever created as separate files — currently it's inline in App.jsx)
7. Remove `HomePanel.jsx` (replaced by Dashboard)
