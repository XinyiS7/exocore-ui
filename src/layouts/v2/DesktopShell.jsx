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
