import React, { useState } from 'react';
import {
  Hexagon, BrainCircuit, FolderKanban, Building2, CheckSquare,
  Settings, PanelLeftOpen, PanelLeftClose, RotateCcw
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
      className={`hidden md:flex h-full flex-col items-center justify-between z-[100] transition-all duration-300 ease-out bg-exo-pure border-r border-exo-mist-8 py-6 flex-shrink-0 ${
        isExpanded ? 'w-56' : 'w-16'
      }`}
    >
      {/* Top section: Logo + Nav */}
      <div className="flex flex-col items-center w-full space-y-4">
        {/* Logo — returns to dashboard */}
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

        {/* Switch to v1 */}
        <button
          onClick={() => {
            localStorage.setItem('exo_layout_version', 'v1');
            window.dispatchEvent(new CustomEvent('layout-version-changed', { detail: 'v1' }));
          }}
          className="flex items-center gap-3 w-full px-3 py-2.5 transition-all group/back text-exo-muted hover:text-exo-accent"
          title="Switch to v1 Layout"
        >
          <div className="p-1.5 rounded-md transition-all shrink-0 group-hover/back:bg-white/5">
            <RotateCcw size={18} strokeWidth={1.5} />
          </div>
          {isExpanded && (
            <span className="text-sm font-medium whitespace-nowrap">返回旧版</span>
          )}
        </button>

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
