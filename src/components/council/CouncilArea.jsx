import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Loader2, X } from 'lucide-react';
import {
  getCouncilSession, dispatchCouncil, crossExamCouncil, synthesizeCouncil, finishCouncil, subscribeStream
} from '../../utils/councilApi';
import ChatArea from '../chat/ChatArea';
import SubRosaBar from './SubRosaBar';
import CouncilGroupChat from './CouncilGroupChat';

// ── Status helpers ───────────────────────────────────────────

const STATUS_LABEL = {
  pre_alignment: '待对齐',
  dispatched:    '已分发',
  cross_exam:    '互审中',
  synthesizing:  '综合中',
  finished:      '已完成',
};

const STATUS_COLOR_CLASS = {
  pre_alignment: 'text-exo-muted border-exo-muted/30 bg-exo-muted/10',
  dispatched:    'text-blue-400 border-blue-400/30 bg-blue-400/10',
  cross_exam:    'text-purple-400 border-purple-400/30 bg-purple-400/10',
  synthesizing:  'text-exo-gold border-exo-gold/30 bg-exo-gold/10',
  finished:      'text-green-400 border-green-400/30 bg-green-400/10',
};

// ── CouncilArea ──────────────────────────────────────────────

const CouncilArea = ({ councilId, presets, onBack, setShowConvList, openNewSession }) => {
  const [council, setCouncil] = useState(null);
  // streamBuffers: participantId(string) → { content, reasoning, done }
  const [streamBuffers, setStreamBuffers] = useState({});
  const [synthBuffer, setSynthBuffer] = useState({ content: '', reasoning: '', done: true });
  const [isActing, setIsActing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [synthOpinion, setSynthOpinion] = useState('');
  // refetchTrigger: incremented to force CouncilStreamView re-fetch after stream done
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  // displayOrder: participant IDs in order of first stream chunk arrival
  const [displayOrder, setDisplayOrder] = useState([]);
  // subRosaExpanded: whether the Sub Rosa overlay is shown
  const [subRosaExpanded, setSubRosaExpanded] = useState(false);

  const pollingRef = useRef(null);
  const cancelStreamsRef = useRef([]);
  const prevSynthDone = useRef(true);

  const pollOnce = useCallback(async () => {
    try {
      const data = await getCouncilSession(councilId);
      setCouncil(data);
    } catch (err) {
      console.error('Council 轮询失败:', err);
    }
  }, [councilId]);

  // Initial load + 3s polling
  useEffect(() => {
    pollOnce();
    pollingRef.current = setInterval(pollOnce, 3000);
    return () => {
      clearInterval(pollingRef.current);
      cancelStreamsRef.current.forEach(cancel => cancel());
    };
  }, [pollOnce]);

  // Sync displayOrder when council loads/updates (handle reconnecting to ongoing session)
  useEffect(() => {
    if (!council) return;
    setDisplayOrder(prev => {
      const next = [...prev];
      council.participants.forEach(p => {
        const pid = String(p.id);
        if (p.phase_status === 'done' && !next.includes(pid)) next.push(pid);
      });
      return next.length !== prev.length ? next : prev;
    });
  }, [council]);

  // Auto-expand Sub Rosa when synthesis completes
  useEffect(() => {
    if (prevSynthDone.current === false && synthBuffer.done === true) {
      setSubRosaExpanded(true);
    }
    prevSynthDone.current = synthBuffer.done;
  }, [synthBuffer.done]);

  const cancelAllStreams = () => {
    cancelStreamsRef.current.forEach(c => c());
    cancelStreamsRef.current = [];
  };

  // ── Action: Dispatch ────────────────────────────────────────
  const handleDispatch = async () => {
    setIsActing(true);
    setActionError('');
    cancelAllStreams();
    setStreamBuffers({});
    setDisplayOrder([]);

    try {
      const result = await dispatchCouncil(councilId);
      await pollOnce();

      result.stream_urls.forEach(({ participant_id, url }) => {
        const pid = String(participant_id);
        setStreamBuffers(prev => ({ ...prev, [pid]: { content: '', reasoning: '', done: false } }));

        const cancel = subscribeStream(
          url,
          (type, text) => {
            // Register arrival order on first chunk
            setDisplayOrder(prev => prev.includes(pid) ? prev : [...prev, pid]);
            setStreamBuffers(prev => {
              const cur = prev[pid] || { content: '', reasoning: '', done: false };
              if (type === 'content') return { ...prev, [pid]: { ...cur, content: cur.content + text } };
              if (type === 'thinking') return { ...prev, [pid]: { ...cur, reasoning: cur.reasoning + text } };
              return prev;
            });
          },
          () => {
            setStreamBuffers(prev => ({ ...prev, [pid]: { ...(prev[pid] || {}), done: true } }));
            setRefetchTrigger(n => n + 1);
            pollOnce();
          },
          (err) => console.error(`参与者 ${pid} 流错误:`, err),
        );
        cancelStreamsRef.current.push(cancel);
      });
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsActing(false);
    }
  };

  // ── Action: Cross-Exam ──────────────────────────────────────
  const handleCrossExam = async () => {
    setIsActing(true);
    setActionError('');
    cancelAllStreams();
    setStreamBuffers({});

    try {
      const result = await crossExamCouncil(councilId);
      await pollOnce();

      result.stream_urls.forEach(({ participant_id, url }) => {
        const pid = String(participant_id);
        setStreamBuffers(prev => ({ ...prev, [pid]: { content: '', reasoning: '', done: false } }));

        const cancel = subscribeStream(
          url,
          (type, text) => {
            setDisplayOrder(prev => prev.includes(pid) ? prev : [...prev, pid]);
            setStreamBuffers(prev => {
              const cur = prev[pid] || { content: '', reasoning: '', done: false };
              if (type === 'content') return { ...prev, [pid]: { ...cur, content: cur.content + text } };
              if (type === 'thinking') return { ...prev, [pid]: { ...cur, reasoning: cur.reasoning + text } };
              return prev;
            });
          },
          () => {
            setStreamBuffers(prev => ({ ...prev, [pid]: { ...(prev[pid] || {}), done: true } }));
            setRefetchTrigger(n => n + 1);
            pollOnce();
          },
          (err) => console.error(`参与者 ${pid} 互审流错误:`, err),
        );
        cancelStreamsRef.current.push(cancel);
      });
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsActing(false);
    }
  };

  // ── Action: Synthesize ──────────────────────────────────────
  const handleSynthesize = async () => {
    const opinion = synthOpinion.trim() || undefined;
    setIsActing(true);
    setActionError('');
    cancelAllStreams();
    setSynthBuffer({ content: '', reasoning: '', done: false });

    try {
      const result = await synthesizeCouncil(councilId, opinion);
      await pollOnce();

      const cancel = subscribeStream(
        result.stream_url,
        (type, text) => {
          setSynthBuffer(prev => {
            if (type === 'content') return { ...prev, content: prev.content + text };
            if (type === 'thinking') return { ...prev, reasoning: prev.reasoning + text };
            return prev;
          });
        },
        () => {
          setSynthBuffer(prev => ({ ...prev, done: true }));
          setRefetchTrigger(n => n + 1);
          pollOnce();
        },
        (err) => console.error('综合流错误:', err),
      );
      cancelStreamsRef.current.push(cancel);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsActing(false);
    }
  };

  // ── Action: Finish ──────────────────────────────────────────
  const handleFinish = async () => {
    setIsActing(true);
    setActionError('');
    try {
      await finishCouncil(councilId);
      await pollOnce();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsActing(false);
    }
  };

  if (!council) {
    return (
      <div className="flex-1 flex items-center justify-center text-exo-muted">
        <Loader2 size={20} className="animate-spin mr-2" />
        <span className="text-sm">载入议会...</span>
      </div>
    );
  }

  const { status, participants, phase0_conversation_id, arbitrator_preset_name, topic, round_number } = council;

  const allParticipantsDone = participants.every(p => p.phase_status === 'done');
  const isAnyGenerating = participants.some(p => p.phase_status === 'generating') ||
    (status === 'synthesizing' && !synthBuffer.done);

  // ── Action button logic ──────────────────────────────────────
  const renderActionButtons = () => {
    if (isActing || isAnyGenerating) {
      return (
        <div className="flex items-center gap-1.5 text-exo-muted text-xs">
          <Loader2 size={13} className="animate-spin" />
          <span>处理中...</span>
        </div>
      );
    }

    if (status === 'dispatched' && allParticipantsDone) {
      return (
        <div className="flex items-center gap-2">
          <button onClick={handleCrossExam} className="px-3 py-1.5 text-xs font-semibold border border-purple-400/40 text-purple-400 rounded-lg hover:bg-purple-400/10 transition-colors">开始互审</button>
          <button onClick={handleSynthesize} className="px-3 py-1.5 text-xs font-semibold bg-exo-gold text-black rounded-lg hover:bg-exo-gold/80 transition-colors">直接综合</button>
        </div>
      );
    }

    if (status === 'cross_exam' && allParticipantsDone) {
      return (
        <button onClick={handleSynthesize} className="px-3 py-1.5 text-xs font-semibold bg-exo-gold text-black rounded-lg hover:bg-exo-gold/80 transition-colors">进入综合</button>
      );
    }

    if (status === 'synthesizing' && synthBuffer.done) {
      return (
        <div className="flex items-center gap-2">
          <button onClick={handleFinish} className="px-3 py-1.5 text-xs font-semibold border border-green-400/40 text-green-400 rounded-lg hover:bg-green-400/10 transition-colors">结束议会</button>
          <button onClick={handleDispatch} className="px-3 py-1.5 text-xs font-semibold bg-exo-gold text-black rounded-lg hover:bg-exo-gold/80 transition-colors">继续分发</button>
        </div>
      );
    }

    if (status === 'finished') {
      return (
        <button onClick={handleDispatch} className="px-3 py-1.5 text-xs font-semibold bg-exo-gold text-black rounded-lg hover:bg-exo-gold/80 transition-colors">继续分发</button>
      );
    }

    return null;
  };

  // ── Phase 0: 1v1 Sub Rosa chat with dispatch button ──────────
  if (status === 'pre_alignment') {
    const dispatchButton = (
      <button
        onClick={handleDispatch}
        disabled={isActing}
        className="px-3 py-2 text-xs font-semibold bg-exo-gold text-black rounded-lg hover:bg-exo-gold/80 disabled:opacity-50 transition-colors whitespace-nowrap"
      >
        {isActing ? <Loader2 size={13} className="animate-spin" /> : '分发'}
      </button>
    );

    return (
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        {actionError && (
          <div className="shrink-0 px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-xs text-red-400 flex items-center justify-between">
            <span>{actionError}</span>
            <button onClick={() => setActionError('')} className="ml-2"><X size={12} /></button>
          </div>
        )}
        <ChatArea
          activeSessionId={phase0_conversation_id}
          setShowConvList={setShowConvList}
          openNewSession={openNewSession}
          presets={presets}
          headerTitleOverride="Sub Rosa"
          rightExtraButton={dispatchButton}
          onBack={onBack}
        />
      </div>
    );
  }

  // ── Phase 1+: SubRosaBar + CouncilGroupChat ───────────────────
  return (
    <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">

      {/* Status strip */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-exo-border bg-black/30">
        <button onClick={onBack} className="p-1 text-exo-muted hover:text-exo-text rounded transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
          <span className="text-sm font-semibold text-exo-text truncate">{topic || `议会 #${councilId}`}</span>
          {round_number > 0 && <span className="text-[10px] text-exo-muted/60 shrink-0">轮 {round_number}</span>}
        </div>
        <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${STATUS_COLOR_CLASS[status] || 'text-exo-muted border-exo-muted/30 bg-exo-muted/10'}`}>
          {STATUS_LABEL[status] || status}
        </span>
        <div className="shrink-0">{renderActionButtons()}</div>
      </div>

      {actionError && (
        <div className="shrink-0 px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-xs text-red-400 flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError('')} className="ml-2"><X size={12} /></button>
        </div>
      )}

      {/* Body: SubRosaBar + CouncilGroupChat (relative container for overlay) */}
      <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
        {/* Sub Rosa collapsible bar / overlay */}
        <SubRosaBar
          conversationId={phase0_conversation_id}
          presets={presets}
          arbitratorPresetName={arbitrator_preset_name}
          isExpanded={subRosaExpanded}
          onToggle={() => setSubRosaExpanded(v => !v)}
          canInteract={status === 'finished'}
        />

        {/* Group chat */}
        <CouncilGroupChat
          council={council}
          streamBuffers={streamBuffers}
          displayOrder={displayOrder}
          refetchTrigger={refetchTrigger}
          presets={presets}
          userOpinion={synthOpinion}
          onOpinionChange={setSynthOpinion}
        />
      </div>
    </div>
  );
};

export default CouncilArea;
