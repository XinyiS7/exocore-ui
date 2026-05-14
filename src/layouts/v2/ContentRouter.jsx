import React from 'react';

export default function ContentRouter({ view, setView, viewParams, appState }) {
  return (
    <div className="flex-1 flex items-center justify-center text-exo-muted">
      <div className="text-center space-y-2">
        <p className="font-mono text-sm uppercase tracking-[0.3em] text-exo-accent/60">ExoCore v2</p>
        <p className="text-xs text-exo-muted">{view} — content coming soon</p>
      </div>
    </div>
  );
}
