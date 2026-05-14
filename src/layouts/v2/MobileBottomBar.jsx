import React from 'react';
import { BrainCircuit, FolderKanban, Building2, CheckSquare } from 'lucide-react';

const BOTTOM_ITEMS = [
  { id: 'agent_hub', icon: BrainCircuit, label: 'Agent' },
  { id: 'project', icon: FolderKanban, label: 'Project' },
  { id: 'council', icon: Building2, label: 'Council' },
  { id: 'task', icon: CheckSquare, label: 'Task' },
];

export default function MobileBottomBar({ view, setView }) {
  return (
    <div className="md:hidden flex-shrink-0 h-12 bg-exo-pure border-t border-exo-mist-6 flex items-center justify-around px-2 safe-bottom">
      {BOTTOM_ITEMS.map(({ id, icon: Icon, label }) => {
        const isActive = view === id;
        return (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 transition-all duration-150 active:scale-95 ${
              isActive ? 'text-exo-accent scale-95' : 'text-exo-muted opacity-60 hover:opacity-100'
            }`}
          >
            <Icon size={17} strokeWidth={1.5} />
            <span className="text-[8px] font-medium tracking-wider uppercase">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
