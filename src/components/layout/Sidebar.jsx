import React from 'react';
import { MessageSquare, BrainCircuit, User, Settings, Hexagon } from 'lucide-react';

const NavIcon = ({ icon: Icon, isActive, onClick }) => (
  <button onClick={onClick} className={`p-2 rounded-lg transition-all ${isActive ? 'text-exo-gold bg-exo-gold/10' : 'text-exo-muted hover:text-exo-text hover:bg-white/5'}`}><Icon size={22} /></button>
);

const Sidebar = ({ currentTab, setCurrentTab, showConvList, setShowConvList }) => (
  <div className="w-full md:w-16 h-14 md:h-full bg-exo-panel border-t md:border-t-0 md:border-r border-exo-border flex flex-row md:flex-col items-center justify-between px-6 md:px-0 py-0 md:py-6 flex-shrink-0 z-50">

    <div className="flex flex-row md:flex-col space-x-6 md:space-x-0 md:space-y-6 items-center w-full md:w-auto justify-between md:justify-start">
      <div className="hidden md:block p-1.5 md:p-2 bg-exo-bg rounded-lg border border-exo-gold/30 cursor-pointer text-exo-gold">
        <Hexagon size={20} />
      </div>

      <div className="flex md:flex-col gap-8 md:gap-6 justify-around md:justify-start w-full md:w-auto">
        <NavIcon icon={MessageSquare} isActive={currentTab === 'chat'} onClick={() => { setCurrentTab('chat'); setShowConvList(true); }} />
        <NavIcon icon={BrainCircuit} isActive={currentTab === 'agent_hub'} onClick={() => { setCurrentTab('agent_hub'); setShowConvList(false); }} />
        <NavIcon icon={User} isActive={currentTab === 'profile'} onClick={() => { setCurrentTab('profile'); setShowConvList(false); }} />
        <span className="md:hidden"><NavIcon icon={Settings} isActive={currentTab === 'settings'} onClick={() => setCurrentTab('settings')} /></span>
      </div>
    </div>

    <div className="hidden md:flex flex-col space-y-6">
      <NavIcon icon={Settings} isActive={currentTab === 'settings'} onClick={() => setCurrentTab('settings')} />
      <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Elysia" className="w-10 h-10 rounded-full border border-exo-border" alt="User" />
    </div>
  </div>
);

export default Sidebar;
