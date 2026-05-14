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
