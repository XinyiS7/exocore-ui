import React from 'react';
import { Star, Zap, Cpu } from 'lucide-react';
import { getAgentAvatarUrl } from '../../../utils/avatar';

const SectionHeader = ({ icon: Icon, label, accent }) => (
  <div className="flex items-center gap-2 mb-4">
    <Icon size={14} strokeWidth={1.5} className={accent || 'text-exo-accent'} />
    <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-exo-muted">{label}</span>
  </div>
);

const AgentCard = ({ preset, onClick }) => {
  const avatarUrl = getAgentAvatarUrl(preset.id);
  return (
    <button
      onClick={() => onClick(preset)}
      className="group flex items-center gap-4 p-4 bg-exo-pure border border-exo-mist-10 rounded-md hover:border-exo-accent/30 transition-all text-left w-full"
    >
      <img
        src={avatarUrl}
        className="w-10 h-10 rounded-md border border-exo-mist-10 object-cover bg-exo-pure shrink-0"
        alt={preset.name}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white group-hover:text-exo-accent transition-colors truncate">{preset.name}</p>
        <p className="text-[10px] text-exo-muted truncate mt-0.5">{preset.description || preset.agent_type}</p>
      </div>
    </button>
  );
};

export default function AgentHub({ appState, setView }) {
  const { presets } = appState;
  const g045Presets = presets.filter(p => p.agent_type === 'g045');
  const superiorPresets = presets.filter(p => p.agent_type !== 'g045' && p.agent_type !== 'standard');
  const standardPresets = presets.filter(p => p.agent_type === 'standard');

  const handleAgentClick = (preset) => {
    setView('agent_profile', { agentId: preset.id, agentName: preset.name });
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-exo-bg scrollbar-hide">
      <div className="max-w-5xl mx-auto px-6 md:px-12 py-12 space-y-10">
        {g045Presets.length > 0 && (
          <section>
            <SectionHeader icon={Star} label="G045 Superior Core" accent="text-exo-accent" />
            <div className="bg-exo-pure border border-exo-accent/20 rounded-md p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {g045Presets.map(p => (
                  <AgentCard key={p.id} preset={p} onClick={handleAgentClick} />
                ))}
              </div>
            </div>
          </section>
        )}

        {superiorPresets.length > 0 && (
          <section>
            <SectionHeader icon={Zap} label="Superior Agents" accent="text-purple-400" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {superiorPresets.map(p => (
                <AgentCard key={p.id} preset={p} onClick={handleAgentClick} />
              ))}
            </div>
          </section>
        )}

        {standardPresets.length > 0 && (
          <section>
            <SectionHeader icon={Cpu} label="Standard Agents" accent="text-blue-400" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {standardPresets.map(p => (
                <AgentCard key={p.id} preset={p} onClick={handleAgentClick} />
              ))}
            </div>
          </section>
        )}

        {presets.length === 0 && (
          <div className="text-center py-20 text-exo-muted">
            <p className="font-mono text-sm">No agents configured</p>
          </div>
        )}
      </div>
    </div>
  );
}
