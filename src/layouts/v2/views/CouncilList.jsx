import React from 'react';
import ConversationList from '../../../components/chat/ConversationList';

export default function CouncilList({ appState, setView }) {
  const { councilSessions, activeCouncilId, setActiveCouncilId, refreshKey, setRefreshKey, openDestructor, openNewSession, projects, setActiveSessionId, setShowCouncilCreate } = appState;

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
