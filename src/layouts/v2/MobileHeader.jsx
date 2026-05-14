import React from 'react';

export default function MobileHeader({ view, viewParams, onBack }) {
  return (
    <div className="h-10 bg-exo-pure border-b border-exo-mist-8 flex items-center px-3">
      <p className="text-[8px] font-mono tracking-[0.3em] text-exo-muted uppercase">{view}</p>
    </div>
  );
}
