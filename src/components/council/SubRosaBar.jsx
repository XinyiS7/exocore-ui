import React from 'react';
import { Crown, ChevronDown, ChevronUp } from 'lucide-react';
import ChatArea from '../chat/ChatArea';
import CouncilStreamView from './CouncilStreamView';

const SubRosaBar = ({ conversationId, presets, arbitratorPresetName, isExpanded, onToggle, canInteract }) => {
  return (
    <>
      {/* Collapsed bar — always rendered */}
      <div
        className="shrink-0 flex items-center gap-3 px-6 cursor-pointer select-none border-b border-exo-mist-10 bg-exo-pure/60 hover:bg-exo-pure/80 transition-all group"
        style={{ height: '44px' }}
        onClick={onToggle}
      >
        <Crown size={14} className={`shrink-0 transition-all ${isExpanded ? 'text-exo-accent' : 'text-exo-muted opacity-40 group-hover:text-exo-accent group-hover:opacity-100'}`} />
        <span className={`text-[11px] font-bold uppercase tracking-[0.2em] font-mono flex-1 ${isExpanded ? 'text-exo-accent' : 'text-exo-muted/60 group-hover:text-white'}`}>
          Sub Rosa Protocol {isExpanded ? '[ACTIVE]' : '[STANDBY]'}
        </span>
        {arbitratorPresetName && (
          <span className="text-[10px] text-exo-muted/30 font-mono truncate max-w-[150px] uppercase tracking-tighter">Arbitrator: {arbitratorPresetName}</span>
        )}
        {isExpanded
          ? <ChevronUp size={14} className="text-exo-muted shrink-0" />
          : <ChevronDown size={14} className="text-exo-muted shrink-0" />
        }
      </div>

      {/* Expanded overlay */}
      {isExpanded && (
        <div className="absolute inset-0 z-20 flex flex-col bg-exo-bg animate-in fade-in slide-in-from-top-2 duration-300" style={{ top: 0 }}>
          {/* Overlay header bar */}
          <div
            className="shrink-0 flex items-center gap-3 px-6 cursor-pointer select-none border-b border-exo-mist-10 bg-exo-pure/90 backdrop-blur-md hover:bg-exo-pure transition-all group"
            style={{ height: '44px' }}
            onClick={onToggle}
          >
            <Crown size={14} className="text-exo-accent shrink-0 animate-pulse-glow" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] font-mono text-exo-accent flex-1">
              Sub Rosa Protocol [OVERRIDE]
            </span>
            {arbitratorPresetName && (
              <span className="text-[10px] text-white/40 font-mono truncate max-w-[150px] uppercase tracking-tighter italic">Secured Link with {arbitratorPresetName}</span>
            )}
            <ChevronUp size={14} className="text-exo-muted shrink-0" />
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-hidden bg-noise">
            {canInteract ? (
              <ChatArea
                activeSessionId={conversationId}
                presets={presets}
                headerTitleOverride="Sub Rosa / Direct Neural Link"
              />
            ) : (
              <CouncilStreamView
                conversationId={conversationId}
                streamBuffer={null}
                agentName={arbitratorPresetName || 'Arbitrator'}
                agentAvatarUrl={null}
                userNick={localStorage.getItem('exo_user_nick') || 'You'}
                userAvatarUrl={localStorage.getItem('exo_user_avatar_url') || null}
                isStreaming={false}
                refetchTrigger={0}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SubRosaBar;
