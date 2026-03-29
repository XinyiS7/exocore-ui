import React, { useState, useEffect } from 'react';
import 'highlight.js/styles/atom-one-dark.css';
import { Hexagon, MessageSquare } from 'lucide-react';
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

export default function App() {
  const [currentTab, setCurrentTab] = useState('chat');
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [projects, setProjects] = useState([]);
  const [presets, setPresets] = useState([]);
  const [activeFileProjectId, setActiveFileProjectId] = useState(null);
  const [showConvList, setShowConvList] = useState(false);

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

  const [activeCouncilId, setActiveCouncilId] = useState(null);
  const [councilSessions, setCouncilSessions] = useState([]);
  const [showCouncilCreate, setShowCouncilCreate] = useState(false);

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

  return (
    <div className="w-full h-[100dvh] bg-exo-bg text-exo-text font-sans flex flex-col md:flex-row overflow-hidden">

      <DestructorModal {...destructorConfig} onClose={() => setDestructorConfig(p => ({...p, isOpen: false}))} />

      <CouncilCreateModal
        isOpen={showCouncilCreate}
        onClose={() => setShowCouncilCreate(false)}
        presets={presets}
        onSuccess={(newId) => {
          refreshCouncilSessions();
          setActiveCouncilId(newId);
          setActiveSessionId(null);
          setActiveFileProjectId(null);
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
        }}
      />

      {/* Main Content: Order 1 on Mobile, Order 2 on Desktop */}
      <div className="flex-1 min-w-0 h-full flex flex-row relative order-1 md:order-2 overflow-hidden">
        {currentTab === 'chat' && (
          <div className="flex flex-1 min-w-0 h-full flex-row relative">
            <ConversationList
              activeSessionId={activeSessionId}
              setActiveSessionId={(id) => { setActiveSessionId(id); setActiveFileProjectId(null); setActiveCouncilId(null); setShowConvList(false); }}
              projects={projects}
              refreshKey={refreshKey}
              openDestructor={openDestructor}
              openNewSession={openNewSession}
              activeFileProjectId={activeFileProjectId}
              setActiveFileProjectId={setActiveFileProjectId}
              showConvList={showConvList}
              onClose={() => setShowConvList(false)}
              councilSessions={councilSessions}
              activeCouncilId={activeCouncilId}
              setActiveCouncilId={(id) => { setActiveCouncilId(id); setActiveSessionId(null); setActiveFileProjectId(null); }}
              onCreateCouncil={() => setShowCouncilCreate(true)}
            />
            {activeCouncilId ? (
              <CouncilArea
                councilId={activeCouncilId}
                presets={presets}
                onBack={() => setActiveCouncilId(null)}
                setShowConvList={setShowConvList}
                openNewSession={openNewSession}
              />
            ) : activeFileProjectId ? (
              <ProjectFilesArea projectId={activeFileProjectId} projects={projects} openDestructor={openDestructor} />
            ) : activeSessionId ? (
              <ChatArea activeSessionId={activeSessionId} setShowConvList={setShowConvList} openNewSession={openNewSession} presets={presets} />
            ) : (
              <div className="flex-1 min-w-0 flex flex-col items-center justify-center bg-exo-bg gap-4 text-center p-8">
                <Hexagon size={44} className="text-exo-gold/20" />
                <p className="text-exo-muted text-sm">从列表中选择或新建一个会话</p>
                <button onClick={() => setShowConvList(true)} className="md:hidden mt-1 px-4 py-2 text-xs text-exo-gold border border-exo-gold/30 rounded-lg hover:bg-exo-gold/10 flex items-center gap-2">
                  <MessageSquare size={14} /> 打开会话列表
                </button>
              </div>
            )}
          </div>
        )}

        {currentTab === 'agent_hub' && (
          <AgentManager
            openNewSession={openNewSession}
            openDestructor={openDestructor}
            setCurrentTab={setCurrentTab}
            presets={presets}
            refreshPresets={refreshPresets}
          />
        )}
        {currentTab === 'profile' && <UserProfile presets={presets} />}
        {currentTab === 'settings' && <SettingsPanel projects={projects} presets={presets} />}
      </div>

      {/* Sidebar: Order 2 on Mobile (Bottom), Order 1 on Desktop (Left) */}
      <div className="order-2 md:order-1 z-50">
        <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} showConvList={showConvList} setShowConvList={setShowConvList} />
      </div>

    </div>
  );
}
