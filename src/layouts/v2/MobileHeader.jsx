import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function MobileHeader({ view, viewParams, onBack }) {
  const isTopLevel = ['dashboard', 'agent_hub', 'project', 'council', 'task'].includes(view)
    && !viewParams.sessionId && !viewParams.agentId && !viewParams.councilId;
  if (isTopLevel && view !== 'settings') return null;

  const title = viewParams.sessionTitle || viewParams.agentName || view;

  return (
    <div className="md:hidden flex-shrink-0 h-10 bg-exo-pure border-b border-exo-mist-6 flex items-center px-3 gap-2">
      <button
        onClick={onBack}
        className="p-1 text-exo-muted hover:text-exo-accent active:scale-90 transition-all"
      >
        <ArrowLeft size={16} strokeWidth={1.5} />
      </button>
      <span className="text-xs font-medium text-exo-text truncate">{title}</span>
    </div>
  );
}
