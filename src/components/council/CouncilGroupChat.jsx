import React, { useEffect, useRef } from 'react';
import CouncilStreamView from './CouncilStreamView';

// Group-chat style view for council phases 1+.
//
// Layout:
//   - Dispatch topic bubble (user, right side)
//   - Participant threads in displayOrder (AI, left side)
//   - Opinion input at the bottom
//
// Props:
//   council           — full council session object
//   streamBuffers     — { [participantId: string]: { content, reasoning, done } }
//   displayOrder      — string[] of participant IDs in arrival order
//   refetchTrigger    — number, increment to force history re-fetch
//   presets           — preset list for avatar lookups
//   userOpinion       — string, the current opinion input value
//   onOpinionChange   — (value: string) => void

const CouncilGroupChat = ({ council, streamBuffers, displayOrder, refetchTrigger, presets, userOpinion, onOpinionChange }) => {
  const bottomRef = useRef(null);
  const userNick = localStorage.getItem('exo_user_nick') || 'You';
  const userAvatarUrl = localStorage.getItem('exo_user_avatar_url') || null;

  const { participants, topic, status } = council;

  // Participants to display: those in displayOrder first, then remaining (pending/streaming not yet started)
  const displayedIds = new Set(displayOrder);
  const remainingParticipants = participants.filter(p => !displayedIds.has(String(p.id)));
  const orderedParticipants = [
    ...displayOrder.map(id => participants.find(p => String(p.id) === id)).filter(Boolean),
    ...remainingParticipants,
  ];

  // Auto-scroll when new stream content arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [streamBuffers]);

  const getParticipantAvatarUrl = (participant) => {
    const preset = presets?.find(p => p.id === participant.preset_id);
    if (preset) {
      const stored = localStorage.getItem(`exo_agent_avatar_${preset.id}`);
      if (stored) return stored;
    }
    return `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(participant.preset_name)}`;
  };

  const isSynthesizing = status === 'synthesizing';
  const isFinished = status === 'finished';

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Scrollable message area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 scrollbar-hide">
        {/* Dispatch topic bubble (user, right side) */}
        {topic && (
          <div className="flex justify-end">
            <div className="flex items-end gap-2 max-w-[75%]">
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] text-exo-muted/60 pr-1">{userNick}</span>
                <div className="bg-exo-gold/20 border border-exo-gold/30 text-exo-text text-sm rounded-2xl rounded-br-sm px-4 py-2.5 leading-relaxed">
                  {topic}
                </div>
              </div>
              {userAvatarUrl ? (
                <img src={userAvatarUrl} alt={userNick} className="w-7 h-7 rounded-full shrink-0 object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full shrink-0 bg-exo-gold/20 flex items-center justify-center text-exo-gold text-[10px] font-bold">
                  {userNick.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Participant threads */}
        {orderedParticipants.map(participant => {
          const pid = String(participant.id);
          const buf = streamBuffers[pid];
          const isStreaming = participant.phase_status === 'generating' || (buf && !buf.done);
          const avatarUrl = getParticipantAvatarUrl(participant);

          return (
            <div key={participant.id} className="space-y-1">
              {/* Participant name header */}
              <div className="flex items-center gap-2 pl-9">
                <span className="text-[10px] font-semibold text-exo-muted/80">{participant.preset_name}</span>
                {participant.phase_status === 'generating' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-exo-gold animate-pulse" />
                )}
                {participant.phase_status === 'done' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                )}
              </div>

              {/* Message thread — avatars rendered by MessageBubble; noScroll so parent scrolls */}
              <CouncilStreamView
                conversationId={participant.conversation_id}
                streamBuffer={isStreaming ? (buf || null) : null}
                agentName={participant.preset_name}
                agentAvatarUrl={avatarUrl}
                userNick={userNick}
                userAvatarUrl={userAvatarUrl}
                isStreaming={isStreaming}
                refetchTrigger={refetchTrigger}
                assistantOnly
                noScroll
              />
            </div>
          );
        })}

        {/* Synthesizing indicator */}
        {isSynthesizing && (
          <div className="flex items-center gap-2 text-exo-gold/60 text-xs pl-2">
            <span className="w-1.5 h-1.5 rounded-full bg-exo-gold animate-pulse inline-block" />
            Arbitrator 正在综合...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Opinion input — shown during dispatched / cross_exam, hidden after synthesizing/finished */}
      {!isSynthesizing && !isFinished && (
        <div className="shrink-0 border-t border-exo-border/50 px-4 py-3 bg-black/20">
          <textarea
            value={userOpinion}
            onChange={e => onOpinionChange(e.target.value)}
            placeholder="追加意见（可选）— 综合时将作为你的观点提交给 Arbitrator"
            rows={2}
            className="w-full bg-black/30 border border-exo-border rounded-lg px-3 py-2 text-sm text-exo-text placeholder-exo-muted/30 focus:outline-none focus:border-exo-gold/40 resize-none scrollbar-hide"
          />
        </div>
      )}
    </div>
  );
};

export default CouncilGroupChat;
