import React from 'react';
import Dashboard from './views/Dashboard';

export default function ContentRouter({ view, setView, viewParams, appState }) {
  if (view === 'dashboard') {
    return <Dashboard appState={appState} setView={setView} setViewParams={setView} />;
  }

  return (
    <div className="flex-1 flex items-center justify-center text-exo-muted">
      <div className="text-center space-y-2">
        <p className="font-mono text-sm uppercase tracking-[0.3em] text-exo-accent/60">ExoCore v2</p>
        <p className="text-xs text-exo-muted">{view} — coming soon</p>
      </div>
    </div>
  );
}
