import React, { useEffect, useRef } from 'react';
import CouncilStreamView from './CouncilStreamView';

const CouncilGroupChat = ({ council, streamBuffers, displayOrder, refetchTrigger, presets, userOpinion, onOpinionChange }) => {
  const bottomRef = useRef(null);
  const userNick = localStorage.getItem('exo_user_nick') || 'You';
  const userAvatarUrl = localStorage.getItem('exo_user_avatar_url') || null;

  const { participants, topic, status } = council;

  const displayedIds = new Set(displayOrder);
  const remainingParticipants = participants.filter(p => !displayedIds.has(String(p.id)));
  const orderedParticipants = [
    ...displayOrder.map(id => participants.find(p => String(p.id) === id)).filter(Boolean),
    ...remainingParticipants,
  ];

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
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-noise">
      {/* Scrollable message area */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-8 space-y-10 scrollbar-hide">
        {/* Dispatch topic bubble (user, right side) */}
        {topic && (
          <div className="flex justify-end animate-fade-in">
            <div className="flex items-start gap-4 max-w-[85%]">
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2 pr-1">
                  <span className="text-[10px] font-bold text-exo-muted uppercase tracking-widest opacity-40 font-mono">Operator: {userNick}</span>
                  <div className="w-1 h-3 bg-white/20" />
                </div>
                <div className="bg-white text-exo-pure text-[14px] rounded-[2px] px-5 py-3 shadow-brutalist font-mono leading-relaxed tracking-tight">
                  {topic}
                </div>
              </div>
              {userAvatarUrl ? (
                <img src={userAvatarUrl} alt={userNick} className="w-10 h-10 rounded-full shrink-0 object-cover border border-exo-mist-20" />
              ) : (
                <div className="w-10 h-10 rounded-full shrink-0 bg-white flex items-center justify-center text-exo-pure text-[12px] font-bold">
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
            <div key={participant.id} className="space-y-4 animate-fade-in">
              {/* Participant name header */}
              <div className="flex items-center gap-3 pl-14">
                <div className={`w-1.5 h-1.5 rounded-full ${participant.phase_status === 'generating' ? 'bg-exo-accent animate-pulse-glow' : participant.phase_status === 'done' ? 'bg-green-500' : 'bg-exo-mist-20'}`} />
                <span className="text-[10px] font-bold text-exo-accent uppercase tracking-[0.2em] font-mono">{participant.preset_name} [NODE_{pid}]</span>
                <div className="h-px bg-exo-mist-10 flex-1" />
              </div>

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
          <div className="flex flex-col items-center justify-center py-10 opacity-60">
            <div className="flex items-center gap-3 text-exo-accent text-[11px] font-mono uppercase tracking-[0.3em]">
              <Activity size={16} className="animate-spin" />
              Arbitrator Synchronizing Perspectives...
            </div>
            <div className="w-32 h-0.5 bg-exo-mist-10 mt-4 overflow-hidden relative">
              <div className="absolute inset-0 bg-exo-accent/40 animate-pulse" />
            </div>
          </div>
        )}

        <div ref={bottomRef} className="h-12" />
      </div>

      {/* Opinion input — shown during dispatched / cross_exam, hidden after synthesizing/finished */}
      {!isSynthesizing && !isFinished && (
        <div className="shrink-0 border-t border-exo-mist-10 px-6 py-4 bg-exo-pure/60 backdrop-blur-md">
          <div className="max-w-4xl mx-auto relative group">
            <textarea
              value={userOpinion}
              onChange={e => onOpinionChange(e.target.value)}
              placeholder="APPEND OPERATOR PERSPECTIVE (OPTIONAL) - WILL BE MERGED INTO FINAL SYNTHESIS..."
              rows={2}
              className="w-full bg-black/60 border border-exo-mist-10 rounded-[2px] px-5 py-3 text-sm text-white placeholder:text-white/10 focus:outline-none focus:border-exo-accent/40 resize-none font-mono transition-all"
            />
            <div className="absolute right-4 bottom-3 opacity-20 group-focus-within:opacity-100 transition-opacity">
              <span className="text-[9px] font-mono text-exo-accent uppercase tracking-widest font-bold">Override Input [L2]</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouncilGroupChat;
