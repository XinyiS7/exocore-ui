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
