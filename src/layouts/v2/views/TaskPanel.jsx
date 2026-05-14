import React, { useState } from 'react';
import OriginalTaskPanel from '../../../components/tasks/TaskPanel';
import Timeline from '../../../components/Timeline';

export default function TaskPanel({ appState }) {
  const { presets, openDestructor } = appState;
  const [activeTab, setActiveTab] = useState('tasks');

  return (
    <div className="flex-1 h-full flex flex-col bg-exo-bg overflow-hidden">
      {/* Header with tab switcher */}
      <div className="flex-shrink-0 border-b border-exo-mist-8 px-6 md:px-12 py-4 flex items-center gap-4">
        <h2 className="text-sm font-medium text-white">任务与时序</h2>
        <div className="flex-1" />
        <div className="flex gap-1 bg-exo-pure border border-exo-mist-8 rounded-md p-0.5">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider rounded transition-all ${
              activeTab === 'tasks' ? 'bg-exo-accent/10 text-exo-accent' : 'text-exo-muted hover:text-exo-text'
            }`}
          >
            Tasks
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider rounded transition-all ${
              activeTab === 'timeline' ? 'bg-exo-accent/10 text-exo-accent' : 'text-exo-muted hover:text-exo-text'
            }`}
          >
            Timeline
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {activeTab === 'tasks' ? (
          <OriginalTaskPanel openDestructor={openDestructor} />
        ) : (
          <Timeline presets={presets} />
        )}
      </div>
    </div>
  );
}
