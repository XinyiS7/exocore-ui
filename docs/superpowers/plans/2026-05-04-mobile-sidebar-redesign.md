# Mobile Sidebar Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mobile sidebar with a narrow 48px icon-only floating overlay, triggered by a top-left hexagon button.

**Architecture:** New `MobileSidebar.jsx` component renders a fixed overlay (backdrop + icon column). `App.jsx` removes the old sidebar slide-in overlay and floating Menu button, wires the new component, and adds hexagon triggers for both standalone and non-standalone modes. Desktop Sidebar is untouched.

**Tech Stack:** React, lucide-react icons, Tailwind CSS (with custom `standalone:` variant)

---

### Task 1: Create MobileSidebar component

**Files:**
- Create: `src/components/layout/MobileSidebar.jsx`

- [ ] **Step 1: Write the component**

```jsx
import React from 'react';
import {
  MessageSquare, BrainCircuit, ScrollText, Settings, Hexagon,
  List, LayoutGrid, Calendar, X
} from 'lucide-react';
import { getUserAvatarUrl } from '../../utils/avatar';

const MobileNavIcon = ({ icon: Icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`w-9 h-9 flex items-center justify-center rounded-[4px] transition-all ${
      isActive
        ? 'bg-exo-accent/10 border border-exo-accent/30 text-exo-accent'
        : 'text-exo-muted hover:text-exo-text hover:bg-white/5'
    }`}
  >
    <Icon size={18} />
  </button>
);

const MobileSidebar = ({
  currentTab,
  setCurrentTab,
  showConvList,
  setShowConvList,
  isOpen,
  onClose,
  onOpenProfile,
}) => {
  if (!isOpen) return null;

  const userAvatarUrl = getUserAvatarUrl();

  const handleTabClick = (tab) => {
    setCurrentTab(tab);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="md:hidden fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Icon column */}
      <div className="md:hidden fixed inset-y-0 left-0 z-[120] w-12 bg-exo-pure border-r border-exo-mist-8 flex flex-col items-center py-3 gap-1.5">
        {/* Hexagon / Home */}
        <MobileNavIcon
          icon={Hexagon}
          isActive={currentTab === 'home'}
          onClick={() => handleTabClick('home')}
        />

        {/* Divider */}
        <div className="w-6 h-px bg-exo-mist-8 my-1" />

        {/* Chat */}
        <MobileNavIcon
          icon={MessageSquare}
          isActive={currentTab === 'chat'}
          onClick={() => handleTabClick('chat')}
        />

        {/* Agent Hub */}
        <MobileNavIcon
          icon={BrainCircuit}
          isActive={currentTab === 'agent_hub'}
          onClick={() => handleTabClick('agent_hub')}
        />

        {/* Timeline */}
        <MobileNavIcon
          icon={ScrollText}
          isActive={currentTab === 'timeline'}
          onClick={() => handleTabClick('timeline')}
        />

        {/* Calendar */}
        <MobileNavIcon
          icon={Calendar}
          isActive={currentTab === 'calendar'}
          onClick={() => handleTabClick('calendar')}
        />

        {/* List toggle (only in chat/council/project) */}
        {(['chat', 'council', 'project'].includes(currentTab)) && (
          <MobileNavIcon
            icon={List}
            isActive={showConvList}
            onClick={() => setShowConvList(!showConvList)}
          />
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Settings */}
        <MobileNavIcon
          icon={Settings}
          isActive={currentTab === 'settings'}
          onClick={() => handleTabClick('settings')}
        />

        {/* User avatar */}
        <button
          onClick={() => { onOpenProfile(); onClose(); }}
          className="w-8 h-8 rounded-[4px] border border-exo-mist-10 overflow-hidden flex-shrink-0 hover:border-exo-accent/30 transition-all"
        >
          <img
            src={userAvatarUrl}
            alt="User"
            className="w-full h-full object-cover bg-exo-pure"
          />
        </button>

        {/* Close X */}
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-[4px] text-exo-muted hover:text-exo-text hover:bg-white/5 transition-all border border-exo-mist-8"
        >
          <X size={14} />
        </button>
      </div>
    </>
  );
};

export default MobileSidebar;
```

- [ ] **Step 2: Verify the file exists and has no syntax errors**

Run: `npx eslint src/components/layout/MobileSidebar.jsx 2>&1`
Expected: No errors (warnings OK)

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/MobileSidebar.jsx
git commit -m "feat: add MobileSidebar component"
```

---

### Task 2: Modify App.jsx — remove old mobile sidebar, add MobileSidebar

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add MobileSidebar import**

At line 8, insert after the existing Sidebar import:

```jsx
import MobileSidebar from './components/layout/MobileSidebar';
```

- [ ] **Step 2: Add isMobileSidebarOpen state**

At line 35 (after `const [showConvList, setShowConvList] = useState(false);`), add:

```jsx
const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
```

- [ ] **Step 3: Update handleTabChange to close mobile sidebar**

At lines 88-98, replace `handleTabChange` body to also close the mobile sidebar on tab switch:

```jsx
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
```

- [ ] **Step 4: Replace the old mobile sidebar overlay and container with MobileSidebar**

Remove lines 234-251 (the sidebar overlay and fixed sidebar container), and replace with MobileSidebar + desktop sidebar:

```jsx
{/* Mobile Sidebar (icon-only floating overlay) */}
<MobileSidebar
  currentTab={currentTab}
  setCurrentTab={handleTabChange}
  showConvList={showConvList}
  setShowConvList={setShowConvList}
  isOpen={isMobileSidebarOpen}
  onClose={() => setIsMobileSidebarOpen(false)}
  onOpenProfile={() => setShowProfilePanel(true)}
/>

{/* Desktop Sidebar (unchanged) */}
<div className="hidden md:block h-full flex-shrink-0">
  <Sidebar
    currentTab={currentTab}
    setCurrentTab={handleTabChange}
    showConvList={showConvList}
    setShowConvList={setShowConvList}
    isExpanded={isSidebarExpanded}
    setIsExpanded={setIsSidebarExpanded}
    onOpenProfile={() => setShowProfilePanel(true)}
  />
</div>
```

- [ ] **Step 5: Replace mobile header hamburger with hexagon trigger**

At lines 256-263, replace the hamburger button with a hexagon that opens the mobile sidebar:

Replace:
```jsx
<div className="md:hidden h-14 border-b border-exo-mist-10 flex items-center px-4 shrink-0 bg-exo-pure/60 backdrop-blur-md justify-between standalone:hidden">
  <button onClick={() => setIsSidebarExpanded(true)} className="p-2 text-exo-muted hover:text-exo-accent transition-colors">
    <Menu size={20} />
  </button>
```

With:
```jsx
<div className="md:hidden h-14 border-b border-exo-mist-10 flex items-center px-4 shrink-0 bg-exo-pure/60 backdrop-blur-md justify-between standalone:hidden">
  <button onClick={() => setIsMobileSidebarOpen(true)} className="p-1.5 text-exo-muted hover:text-exo-accent transition-colors rounded-[4px] border border-exo-mist-8 hover:border-exo-accent/30">
    <Hexagon size={20} />
  </button>
```

Also replace the `import { Hexagon, MessageSquare, Users, Plus, Menu }` at line 3 — remove `Menu` and add `Hexagon` is already imported. Wait, let me check: the import is `import { Hexagon, MessageSquare, Users, Plus, Menu } from 'lucide-react';`. `Hexagon` is already imported, `Menu` is no longer needed in App.jsx. Remove `Menu` from this import.

- [ ] **Step 6: Remove the old floating Menu button, add standalone hexagon trigger**

Remove lines 265-271 (the floating Menu button), replace with a hexagon that is only visible in standalone mode:

```jsx
{/* Hexagon trigger for Standalone PWA mode */}
<button
  onClick={() => setIsMobileSidebarOpen(true)}
  className="md:hidden fixed top-3 left-3 z-[100] w-10 h-10 rounded-[4px] bg-exo-pure/90 border border-exo-accent/30 text-exo-accent flex items-center justify-center backdrop-blur-md shadow-glow-gold active:scale-95 transition-all standalone:flex hidden"
>
  <Hexagon size={20} />
</button>
```

- [ ] **Step 7: Verify no remaining references to removed code**

Run: `npx eslint src/App.jsx 2>&1`
Expected: No errors

Also verify: `grep -n "Menu" src/App.jsx` should show no remaining import of `Menu`.

- [ ] **Step 8: Start dev server and verify desktop behavior is unchanged**

Run: `npm run dev`
Open `http://localhost:5173` at desktop width (>768px).
Expected: Sidebar looks and works exactly as before.

- [ ] **Step 9: Verify mobile behavior in browser DevTools**

Open `http://localhost:5173` in responsive mode (375px width).
Expected:
- Top-left hexagon in header bar (non-standalone)
- Click hexagon → icon sidebar floats in from left with backdrop
- Click icon → navigates to tab, sidebar closes
- Click X → sidebar closes
- Click backdrop → sidebar closes
- Send button is not blocked

- [ ] **Step 10: Commit**

```bash
git add src/App.jsx
git commit -m "feat: integrate MobileSidebar, remove old mobile sidebar overlay and floating menu button"
```
