import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Loader2, X, Shield, Activity } from 'lucide-react';
import {
  getCouncilSession, dispatchCouncil, crossExamCouncil, synthesizeCouncil, finishCouncil, subscribeStream
} from '../../utils/councilApi';
import ChatArea from '../chat/ChatArea';
import SubRosaBar from './SubRosaBar';
import CouncilGroupChat from './CouncilGroupChat';

// ── Status helpers ───────────────────────────────────────────

const STATUS_LABEL = {
  pre_alignment: 'PENDING / 待对齐',
  dispatched:    'DISPATCHED / 已分发',
  cross_exam:    'CROSS_EXAM / 互审中',
  synthesizing:  'SYNTHESIS / 综合中',
  finished:      'FINISHED / 已完成',
};

const STATUS_COLOR_CLASS = {
  pre_alignment: 'text-exo-muted border-exo-mist-10 bg-exo-pure',
  dispatched:    'text-blue-400 border-blue-400/30 bg-blue-400/5',
  cross_exam:    'text-purple-400 border-purple-400/30 bg-purple-400/5',
  synthesizing:  'text-exo-accent border-exo-accent/30 bg-exo-accent/5',
  finished:      'text-green-400 border-green-400/30 bg-green-400/5',
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
      <div className="flex-1 flex flex-col items-center justify-center text-exo-muted font-mono bg-exo-bg">
        <Loader2 size={24} className="animate-spin mb-4 text-exo-accent" />
        <span className="text-[11px] uppercase tracking-[0.3em]">Neural Council Synchronizing...</span>
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
        <div className="flex items-center gap-2 text-exo-accent text-[10px] font-mono uppercase tracking-widest animate-pulse">
          <Activity size={12} />
          <span>Processing...</span>
        </div>
      );
    }

    const btnBase = "px-4 py-1.5 rounded-[2px] text-[11px] font-bold uppercase tracking-widest transition-all shadow-brutalist active:scale-95";

    if (status === 'dispatched' && allParticipantsDone) {
      return (
        <div className="flex items-center gap-3">
          <button onClick={handleCrossExam} className={`${btnBase} bg-white text-exo-pure hover:bg-purple-500`}>Cross Exam</button>
          <button onClick={handleSynthesize} className={`${btnBase} bg-exo-accent text-exo-pure`}>Synthesize</button>
        </div>
      );
    }

    if (status === 'cross_exam' && allParticipantsDone) {
      return (
        <button onClick={handleSynthesize} className={`${btnBase} bg-exo-accent text-exo-pure`}>Run Synthesis</button>
      );
    }

    if (status === 'synthesizing' && synthBuffer.done) {
      return (
        <div className="flex items-center gap-3">
          <button onClick={handleFinish} className={`${btnBase} bg-white text-exo-pure hover:bg-green-500`}>Finalize</button>
          <button onClick={handleDispatch} className={`${btnBase} bg-exo-accent text-exo-pure`}>Re-Dispatch</button>
        </div>
      );
    }

    if (status === 'finished') {
      return (
        <button onClick={handleDispatch} className={`${btnBase} bg-exo-accent text-exo-pure`}>New Dispatch</button>
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
        className="px-6 py-1.5 bg-exo-accent text-exo-pure rounded-[2px] text-[11px] font-bold uppercase tracking-widest hover:bg-exo-accent/90 shadow-brutalist disabled:opacity-30 flex items-center gap-2"
      >
        {isActing ? <Loader2 size={13} className="animate-spin" /> : <Shield size={13} />} Dispatch
      </button>
    );

    return (
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden bg-exo-bg">
        {actionError && (
          <div className="shrink-0 px-4 py-2 bg-red-600/10 border-b border-red-500/20 text-[10px] font-mono text-red-500 flex items-center justify-between uppercase tracking-widest">
            <span>&gt;&gt; CRITICAL_ERROR: {actionError}</span>
            <button onClick={() => setActionError('')} className="p-1 hover:text-white"><X size={14} /></button>
          </div>
        )}
        <ChatArea
          activeSessionId={phase0_conversation_id}
          setShowConvList={setShowConvList}
          openNewSession={openNewSession}
          presets={presets}
          headerTitleOverride="Alignment Protocol / Sub Rosa"
          rightExtraButton={dispatchButton}
          onBack={onBack}
        />
      </div>
    );
  }

  // ── Phase 1+: SubRosaBar + CouncilGroupChat ───────────────────
  return (
    <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden bg-exo-bg">

      {/* Status strip */}
      <div className="shrink-0 flex items-center gap-4 px-4 h-14 border-b border-exo-mist-10 bg-exo-pure/40 backdrop-blur-md">
        <button onClick={onBack} className="p-2 -ml-2 text-exo-muted hover:text-white rounded transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-[13px] font-bold text-white uppercase tracking-tight font-display truncate">{topic || `COUNCIL_SESSION #${councilId}`}</span>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-exo-accent font-mono uppercase tracking-widest font-bold">Round {round_number}</span>
            <div className="w-1 h-1 rounded-full bg-exo-mist-20" />
            <span className={`text-[9px] font-bold uppercase tracking-widest font-mono ${STATUS_COLOR_CLASS[status]?.split(' ')[0]}`}>
              {STATUS_LABEL[status] || status}
            </span>
          </div>
        </div>
        <div className="shrink-0">{renderActionButtons()}</div>
      </div>

      {actionError && (
        <div className="shrink-0 px-4 py-2 bg-red-600/10 border-b border-red-500/20 text-[10px] font-mono text-red-500 flex items-center justify-between uppercase tracking-widest">
          <span>&gt;&gt; CRITICAL_ERROR: {actionError}</span>
          <button onClick={() => setActionError('')} className="p-1 hover:text-white"><X size={14} /></button>
        </div>
      )}

      {/* Body: SubRosaBar + CouncilGroupChat (relative container for overlay) */}
      <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden bg-noise">
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
