import React from 'react';
import Dashboard from './views/Dashboard';
import AgentHub from './views/AgentHub';
import AgentProfile from './views/AgentProfile';
import AgentMemory from './views/AgentMemory';
import ProjectList from './views/ProjectList';
import CouncilList from './views/CouncilList';
import TaskPanel from './views/TaskPanel';
import ChatArea from '../../components/chat/ChatArea';
import CouncilArea from '../../components/council/CouncilArea';
import ProjectFilesArea from '../../components/project/ProjectFilesArea';
import SettingsPanel from '../../components/settings/SettingsPanel';

export default function ContentRouter({ view, setView, viewParams, appState }) {
  const { activeSessionId, setActiveSessionId, setRefreshKey, openNewSession, presets,
          activeCouncilId, setActiveCouncilId, projects, openDestructor,
          showCouncilCreate, setShowCouncilCreate } = appState;

  switch (view) {
    case 'dashboard':
      return <Dashboard appState={appState} setView={setView} />;

    case 'agent_hub':
      return <AgentHub appState={appState} setView={setView} />;

    case 'agent_profile':
      return <AgentProfile appState={appState} setView={setView} viewParams={viewParams} />;

    case 'agent_memory':
      return <AgentMemory appState={appState} setView={setView} viewParams={viewParams} />;

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
      return <Dashboard appState={appState} setView={setView} />;
  }
}
