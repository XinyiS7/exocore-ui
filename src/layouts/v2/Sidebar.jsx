import React from 'react';

export default function Sidebar({ view, setView, appState }) {
  return (
    <div className="hidden md:flex w-16 h-full bg-exo-pure border-r border-exo-mist-8 flex-col items-center py-6 gap-4 text-exo-muted">
      <p className="text-[8px] font-mono tracking-[0.3em] text-exo-accent/40 rotate-90 mt-20 whitespace-nowrap">EXOCORE</p>
    </div>
  );
}
