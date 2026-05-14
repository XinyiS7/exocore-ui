import React from 'react';

export default function MobileBottomBar({ view, setView, appState }) {
  return (
    <div className="h-12 bg-exo-pure border-t border-exo-mist-8 flex items-center justify-center">
      <p className="text-[8px] font-mono tracking-[0.3em] text-exo-muted">AGENT · PROJECT · COUNCIL · TASK</p>
    </div>
  );
}
