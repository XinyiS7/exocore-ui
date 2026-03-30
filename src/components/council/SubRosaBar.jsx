import React from 'react';
import { Crown, ChevronDown, ChevronUp } from 'lucide-react';
import ChatArea from '../chat/ChatArea';
import CouncilStreamView from './CouncilStreamView';

// Collapsible Sub Rosa panel.
// When collapsed: a slim 40px bar showing "Sub Rosa" + expand toggle.
// When expanded: absolute overlay covering the group chat, shows ChatArea (canInteract)
//   or read-only CouncilStreamView.
//
// Props:
//   conversationId       — phase0_conversation_id
//   presets              — passed through to ChatArea
//   arbitratorPresetName — display label
//   isExpanded           — controlled expand state
//   onToggle             — () => void
//   canInteract          — bool: true when council status === 'finished'

const SubRosaBar = ({ conversationId, presets, arbitratorPresetName, isExpanded, onToggle, canInteract }) => {
  return (
    <>
      {/* Collapsed bar — always rendered */}
      <div
        className="shrink-0 flex items-center gap-2 px-4 cursor-pointer select-none border-b border-exo-border bg-black/40 hover:bg-black/60 transition-colors"
        style={{ height: '40px' }}
        onClick={onToggle}
      >
        <Crown size={13} className="text-exo-gold shrink-0" />
        <span className="text-xs font-semibold text-exo-gold flex-1">Sub Rosa</span>
        {arbitratorPresetName && (
          <span className="text-[10px] text-exo-muted/60 truncate max-w-[100px]">{arbitratorPresetName}</span>
        )}
        {isExpanded
          ? <ChevronUp size={13} className="text-exo-muted shrink-0" />
          : <ChevronDown size={13} className="text-exo-muted shrink-0" />
        }
      </div>

      {/* Expanded overlay */}
      {isExpanded && (
        <div className="absolute inset-0 z-20 flex flex-col bg-exo-bg" style={{ top: 0 }}>
          {/* Overlay header bar */}
          <div
            className="shrink-0 flex items-center gap-2 px-4 cursor-pointer select-none border-b border-exo-border bg-black/40 hover:bg-black/60 transition-colors"
            style={{ height: '40px' }}
            onClick={onToggle}
          >
            <Crown size={13} className="text-exo-gold shrink-0" />
            <span className="text-xs font-semibold text-exo-gold flex-1">Sub Rosa</span>
            {arbitratorPresetName && (
              <span className="text-[10px] text-exo-muted/60 truncate max-w-[100px]">{arbitratorPresetName}</span>
            )}
            <ChevronUp size={13} className="text-exo-muted shrink-0" />
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {canInteract ? (
              <ChatArea
                activeSessionId={conversationId}
                presets={presets}
                headerTitleOverride="Sub Rosa"
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
