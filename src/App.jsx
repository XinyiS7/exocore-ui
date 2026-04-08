import React, { useState, useEffect } from 'react';
import 'highlight.js/styles/atom-one-dark.css';
import { Hexagon, MessageSquare, Users, Plus, Menu } from 'lucide-react';
import { baseUrl } from './utils/api';

import DestructorModal from './components/modals/DestructorModal';
import NewSessionModal from './components/modals/NewSessionModal';
import Sidebar from './components/layout/Sidebar';
import ConversationList from './components/chat/ConversationList';
import ChatArea from './components/chat/ChatArea';
import ProjectFilesArea from './components/project/ProjectFilesArea';
import AgentManager from './components/agent/AgentManager';
import UserProfile from './components/UserProfile';
import SettingsPanel from './components/settings/SettingsPanel';
import CouncilArea from './components/council/CouncilArea';
import CouncilCreateModal from './components/council/CouncilCreateModal';
import { listCouncilSessions } from './utils/councilApi';
import HomePanel from './components/home/HomePanel';

export default function App() {
  const [currentTab, setCurrentTab] = useState('home');
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [projects, setProjects] = useState([]);
  const [presets, setPresets] = useState([]);
  const [activeFileProjectId, setActiveFileProjectId] = useState(null);
  
  // Sidebar and List states
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [showConvList, setShowConvList] = useState(false);
  
  // Council state
  const [activeCouncilId, setActiveCouncilId] = useState(null);
  const [councilSessions, setCouncilSessions] = useState([]);
  const [showCouncilCreate, setShowCouncilCreate] = useState(false);

  useEffect(() => {
    fetch(`${baseUrl}/api/core/projects/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setProjects(data))
      .catch(err => console.error("项目加载失败", err));

    fetch(`${baseUrl}/api/agents/presets/`, { credentials: 'include' })
      .then(res => res.json())
      .then(setPresets)
      .catch(err => console.error("Presets 拉取失败", err));
  }, []);

  const refreshPresets = () => {
    fetch(`${baseUrl}/api/agents/presets/`, { credentials: 'include' })
      .then(res => res.json())
      .then(setPresets)
      .catch(err => console.error("Presets 刷新失败", err));
  };

  const refreshCouncilSessions = () => {
    listCouncilSessions()
      .then(setCouncilSessions)
      .catch(err => console.error('Council 列表拉取失败:', err));
  };

  useEffect(() => { refreshCouncilSessions(); }, [refreshKey]);

  const [destructorConfig, setDestructorConfig] = useState({ isOpen: false });
  const openDestructor = (config) => setDestructorConfig({ ...config, isOpen: true });

  const [newSessionConfig, setNewSessionConfig] = useState({ isOpen: false, initialContext: null });
  const openNewSession = (initialContext = null) => setNewSessionConfig({ isOpen: true, initialContext });

  // Helper to reset selections when switching tabs
  const handleTabChange = (tab) => {
    setCurrentTab(tab);
    if (tab !== 'chat') { setActiveSessionId(null); setActiveFileProjectId(null); }
    if (tab !== 'council') { setActiveCouncilId(null); }
    // On mobile, close sidebar after selection
    if (window.innerWidth < 768) setIsSidebarExpanded(false);
  };

  const renderMainContent = () => {
    switch (currentTab) {
      case 'home':
        return <HomePanel setCurrentTab={handleTabChange} />;
      
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
            mode="chat"
            isMainView={true}
            activeSessionId={activeSessionId}
            setActiveSessionId={setActiveSessionId}
            projects={projects}
            refreshKey={refreshKey}
            openDestructor={openDestructor}
            openNewSession={openNewSession}
            activeFileProjectId={activeFileProjectId}
            setActiveFileProjectId={setActiveFileProjectId}
          />
        );

      case 'project':
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
            mode="project"
            isMainView={true}
            projects={projects}
            refreshKey={refreshKey}
            openDestructor={openDestructor}
            openNewSession={openNewSession}
            setActiveFileProjectId={setActiveFileProjectId}
            setActiveSessionId={setActiveSessionId}
          />
        );

      case 'council':
        if (activeCouncilId) return (
          <CouncilArea
            councilId={activeCouncilId}
            presets={presets}
            onBack={() => setActiveCouncilId(null)}
            setShowConvList={setShowConvList}
            openNewSession={openNewSession}
          />
        );
        return (
          <ConversationList
            mode="council"
            isMainView={true}
            councilSessions={councilSessions}
            activeCouncilId={activeCouncilId}
            setActiveCouncilId={setActiveCouncilId}
            onCreateCouncil={() => setShowCouncilCreate(true)}
            refreshKey={refreshKey}
            setRefreshKey={setRefreshKey}
            openDestructor={openDestructor}
            openNewSession={openNewSession}
            projects={projects}
            setActiveSessionId={setActiveSessionId}
          />
        );

      case 'agent_hub':
        return <AgentManager openNewSession={openNewSession} openDestructor={openDestructor} setCurrentTab={handleTabChange} presets={presets} refreshPresets={refreshPresets} />;
      
      case 'profile':
        return <UserProfile presets={presets} />;
      
      case 'settings':
        return <SettingsPanel projects={projects} presets={presets} />;
      
      default:
        return <HomePanel setCurrentTab={handleTabChange} />;
    }
  };

  return (
    <div className="w-full h-[100dvh] bg-noise text-exo-text font-sans flex overflow-hidden relative">
      
      {/* Modals */}
      <DestructorModal {...destructorConfig} onClose={() => setDestructorConfig(p => ({...p, isOpen: false}))} />
      <CouncilCreateModal
        isOpen={showCouncilCreate}
        onClose={() => setShowCouncilCreate(false)}
        presets={presets}
        onSuccess={(newId) => {
          refreshCouncilSessions();
          setActiveCouncilId(newId);
          handleTabChange('council');
        }}
      />
      <NewSessionModal
        isOpen={newSessionConfig.isOpen}
        onClose={() => setNewSessionConfig(p => ({...p, isOpen: false}))}
        projects={projects}
        presets={presets}
        initialContext={newSessionConfig.initialContext}
        onSuccess={(newSessionId) => {
          setRefreshKey(prev => prev + 1);
          setActiveSessionId(newSessionId);
          if (currentTab === 'home') handleTabChange('chat');
        }}
      />

      {/* Sidebar Overlay for Mobile */}
      <div className={`md:hidden fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm transition-opacity ${isSidebarExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsSidebarExpanded(false)} />

      {/* Sidebar Container */}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-[120] md:z-auto transition-transform duration-500 ease-out
        ${isSidebarExpanded ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <Sidebar 
          currentTab={currentTab} 
          setCurrentTab={handleTabChange} 
          showConvList={showConvList} 
          setShowConvList={setShowConvList}
          isExpanded={isSidebarExpanded}
          setIsExpanded={setIsSidebarExpanded}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        
        {/* Mobile Header Toggle */}
        <div className="md:hidden h-14 border-b border-white/5 flex items-center px-4 shrink-0 bg-[#05060A]/40 backdrop-blur-md justify-between">
          <button onClick={() => setIsSidebarExpanded(true)} className="p-2 text-exo-muted hover:text-exo-accent transition-colors">
            <Menu size={20} />
          </button>
          <div className="text-exo-accent font-bold tracking-widest text-xs uppercase">ExoCore</div>
          <div className="w-10" /> {/* Spacer */}
        </div>

        <div className="flex-1 flex flex-row overflow-hidden relative">
          
          {/* Side Column List (Visible in chat/council/project if showConvList is true and NOT in main view) */}
          {showConvList && (['chat', 'council', 'project'].includes(currentTab)) && (
            <div className="absolute inset-y-0 left-0 z-[80] h-full shadow-[20px_0_50px_rgba(0,0,0,0.5)]">
              <ConversationList
                mode={currentTab}
                activeSessionId={activeSessionId}
                setActiveSessionId={(id) => { setActiveSessionId(id); setActiveFileProjectId(null); setActiveCouncilId(null); setShowConvList(false); }}
                projects={projects}
                refreshKey={refreshKey}
                setRefreshKey={setRefreshKey}
                openDestructor={openDestructor}
                openNewSession={openNewSession}
                activeFileProjectId={activeFileProjectId}
                setActiveFileProjectId={setActiveFileProjectId}
                showConvList={showConvList}
                onClose={() => setShowConvList(false)}
                councilSessions={councilSessions}
                activeCouncilId={activeCouncilId}
                setActiveCouncilId={(id) => { setActiveCouncilId(id); setActiveSessionId(null); setShowConvList(false); }}
                onCreateCouncil={() => setShowCouncilCreate(true)}
              />
            </div>
          )}

          {/* Actual Tab Content */}
          <div className="flex-1 min-w-0 overflow-hidden relative h-full">
            {renderMainContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
