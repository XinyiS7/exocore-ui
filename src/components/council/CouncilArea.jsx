import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Users, Crown, Loader2, ChevronRight, MessageSquare, Send, X
} from 'lucide-react';
import {
  getCouncilSession, dispatchCouncil, crossExamCouncil, synthesizeCouncil, finishCouncil, subscribeStream
} from '../../utils/councilApi';
import ChatArea from '../chat/ChatArea';
import CouncilStreamView from './CouncilStreamView';

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

// Indicator dot for participant phase_status
const PhaseStatusDot = ({ status }) => {
  if (status === 'generating') return <span className="w-1.5 h-1.5 rounded-full bg-exo-gold animate-pulse shrink-0" />;
  if (status === 'done') return <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />;
  return <span className="w-1.5 h-1.5 rounded-full bg-exo-muted/40 shrink-0" />;
};

// ── CouncilArea ──────────────────────────────────────────────

const CouncilArea = ({ councilId, presets, onBack, setShowConvList, openNewSession }) => {
  const [council, setCouncil] = useState(null);
  const [selectedView, setSelectedView] = useState('phase0');
  // streamBuffers: participantId(string) → { content, reasoning, done }
  const [streamBuffers, setStreamBuffers] = useState({});
  const [synthBuffer, setSynthBuffer] = useState({ content: '', reasoning: '', done: true });
  const [isActing, setIsActing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [showTopicInput, setShowTopicInput] = useState(false);
  const [topicInput, setTopicInput] = useState('');
  const [showSynthOpinion, setShowSynthOpinion] = useState(false);
  const [synthOpinion, setSynthOpinion] = useState('');
  // refetchTrigger: incremented to force CouncilStreamView re-fetch after stream done
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const pollingRef = useRef(null);
  const cancelStreamsRef = useRef([]);

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

  // Cancel any active streams when unmounting or council changes
  const cancelAllStreams = () => {
    cancelStreamsRef.current.forEach(c => c());
    cancelStreamsRef.current = [];
  };

  // ── Action: Dispatch ────────────────────────────────────────
  const handleDispatch = async () => {
    const topic = topicInput.trim() || council?.topic || '';
    setIsActing(true);
    setActionError('');
    setShowTopicInput(false);
    cancelAllStreams();
    setStreamBuffers({});

    try {
      const result = await dispatchCouncil(councilId, topic || undefined);
      await pollOnce();

      result.stream_urls.forEach(({ participant_id, url }) => {
        const pid = String(participant_id);
        setStreamBuffers(prev => ({ ...prev, [pid]: { content: '', reasoning: '', done: false } }));

        const cancel = subscribeStream(
          url,
          (type, text) => {
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
      if (result.stream_urls.length > 0) {
        setSelectedView(`p_${result.stream_urls[0].participant_id}`);
      }
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
      if (result.stream_urls.length > 0) {
        setSelectedView(`p_${result.stream_urls[0].participant_id}`);
      }
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
    setShowSynthOpinion(false);
    cancelAllStreams();
    setSynthBuffer({ content: '', reasoning: '', done: false });
    setSelectedView('synthesis');

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

  const { status, participants, phase0_conversation_id, synthesis_conversation_id, arbitrator_preset_name, topic, round_number } = council;

  const allParticipantsDone = participants.every(p => p.phase_status === 'done');
  const isAnyGenerating = participants.some(p => p.phase_status === 'generating') ||
    (status === 'synthesizing' && !synthBuffer.done);

  // ── Derive agent info for selected view ─────────────────────
  const getViewAgentInfo = () => {
    if (selectedView === 'phase0' || selectedView === 'synthesis') {
      const arbPreset = presets.find(p => p.name === arbitrator_preset_name);
      const avatarSeed = arbitrator_preset_name;
      const avatarUrl = arbPreset
        ? (localStorage.getItem(`exo_agent_avatar_${arbPreset.id}`) || `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(avatarSeed)}`)
        : `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(avatarSeed)}`;
      return { name: arbitrator_preset_name, avatarUrl };
    }
    const pid = selectedView.replace('p_', '');
    const participant = participants.find(p => String(p.id) === pid);
    if (!participant) return { name: 'Core', avatarUrl: `https://api.dicebear.com/9.x/bottts/svg?seed=core` };
    const pPreset = presets.find(p => p.id === participant.preset_id);
    const avatarUrl = pPreset
      ? (localStorage.getItem(`exo_agent_avatar_${pPreset.id}`) || `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(participant.preset_name)}`)
      : `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(participant.preset_name)}`;
    return { name: participant.preset_name, avatarUrl };
  };

  const userNick = localStorage.getItem('exo_user_nick') || 'You';
  const userAvatarUrl = localStorage.getItem('exo_user_avatar_url') ||
    `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(localStorage.getItem('exo_user_avatar_seed') || 'user')}`;

  const agentInfo = getViewAgentInfo();

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

    if (status === 'pre_alignment') {
      if (showTopicInput) {
        return (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={topicInput}
              onChange={e => setTopicInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleDispatch(); if (e.key === 'Escape') setShowTopicInput(false); }}
              placeholder="输入议题（可留空）"
              className="bg-black/40 border border-exo-border rounded-lg px-2.5 py-1 text-xs text-exo-text placeholder-exo-muted/40 focus:outline-none focus:border-exo-gold/50 w-48"
            />
            <button onClick={handleDispatch} className="p-1.5 bg-exo-gold text-black rounded-lg hover:bg-exo-gold/80 transition-colors">
              <Send size={12} />
            </button>
            <button onClick={() => setShowTopicInput(false)} className="p-1.5 text-exo-muted hover:text-exo-text rounded-lg hover:bg-white/5">
              <X size={12} />
            </button>
          </div>
        );
      }
      return (
        <button onClick={() => { setTopicInput(topic || ''); setShowTopicInput(true); }} className="px-3 py-1.5 text-xs font-semibold bg-exo-gold text-black rounded-lg hover:bg-exo-gold/80 transition-colors">
          分发议题
        </button>
      );
    }

    if (status === 'dispatched' && allParticipantsDone) {
      return (
        <div className="flex items-center gap-2">
          <button onClick={handleCrossExam} className="px-3 py-1.5 text-xs font-semibold border border-purple-400/40 text-purple-400 rounded-lg hover:bg-purple-400/10 transition-colors">开始互审</button>
          <button onClick={() => setShowSynthOpinion(true)} className="px-3 py-1.5 text-xs font-semibold bg-exo-gold text-black rounded-lg hover:bg-exo-gold/80 transition-colors">直接综合</button>
        </div>
      );
    }

    if (status === 'cross_exam' && allParticipantsDone) {
      return (
        <button onClick={() => setShowSynthOpinion(true)} className="px-3 py-1.5 text-xs font-semibold bg-exo-gold text-black rounded-lg hover:bg-exo-gold/80 transition-colors">进入综合</button>
      );
    }

    if (status === 'synthesizing' && synthBuffer.done) {
      return (
        <div className="flex items-center gap-2">
          <button onClick={handleFinish} className="px-3 py-1.5 text-xs font-semibold border border-green-400/40 text-green-400 rounded-lg hover:bg-green-400/10 transition-colors">结束议会</button>
          <button onClick={() => { setTopicInput(topic || ''); setShowTopicInput(true); }} className="px-3 py-1.5 text-xs font-semibold bg-exo-gold text-black rounded-lg hover:bg-exo-gold/80 transition-colors">继续分发</button>
        </div>
      );
    }

    if (status === 'finished') {
      return (
        <button onClick={() => { setTopicInput(topic || ''); setShowTopicInput(true); }} className="px-3 py-1.5 text-xs font-semibold bg-exo-gold text-black rounded-lg hover:bg-exo-gold/80 transition-colors">继续分发</button>
      );
    }

    return null;
  };

  // ── Nav items ────────────────────────────────────────────────
  const navItems = [
    { id: 'phase0', label: 'Sub rosa', icon: Crown, sub: arbitrator_preset_name, phase_status: null },
    ...participants.map(p => ({
      id: `p_${p.id}`,
      label: p.preset_name,
      icon: MessageSquare,
      sub: null,
      phase_status: p.phase_status,
    })),
    ...(synthesis_conversation_id ? [{ id: 'synthesis', label: 'Sub rosa', icon: Users, sub: '综合结论', phase_status: null }] : []),
  ];

  const isSelectedActive = (id) => selectedView === id;

  // ── Render right-side view ────────────────────────────────────
  const renderMainView = () => {
    if (selectedView === 'phase0' && phase0_conversation_id) {
      return (
        <ChatArea
          activeSessionId={phase0_conversation_id}
          setShowConvList={setShowConvList}
          openNewSession={openNewSession}
          presets={presets}
          headerTitleOverride="Sub rosa"
        />
      );
    }

    if (selectedView === 'synthesis' && synthesis_conversation_id) {
      const isSynthStreaming = status === 'synthesizing' && !synthBuffer.done;
      return (
        <div className="flex-1 min-w-0 flex flex-col h-full bg-exo-bg">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-exo-border bg-black/20 shrink-0">
            <span className="text-sm font-semibold text-exo-gold">Sub rosa</span>
            <span className="text-[10px] text-exo-muted/60">综合结论</span>
            {isSynthStreaming && <span className="w-2 h-2 rounded-full bg-exo-gold animate-pulse ml-auto" />}
          </div>
          <CouncilStreamView
            conversationId={synthesis_conversation_id}
            streamBuffer={isSynthStreaming ? synthBuffer : null}
            agentName={agentInfo.name}
            agentAvatarUrl={agentInfo.avatarUrl}
            userNick={userNick}
            userAvatarUrl={userAvatarUrl}
            isStreaming={isSynthStreaming}
            refetchTrigger={refetchTrigger}
          />
        </div>
      );
    }

    // Participant view
    const pidStr = selectedView.replace('p_', '');
    const participant = participants.find(p => String(p.id) === pidStr);
    if (participant) {
      const buf = streamBuffers[pidStr];
      const isParticipantStreaming = participant.phase_status === 'generating' || (buf && !buf.done);
      return (
        <div className="flex-1 min-w-0 flex flex-col h-full bg-exo-bg">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-exo-border bg-black/20 shrink-0">
            <PhaseStatusDot status={participant.phase_status} />
            <span className="text-sm font-semibold text-exo-text">{participant.preset_name}</span>
            <span className="text-[10px] text-exo-muted/60">参与者</span>
          </div>
          <CouncilStreamView
            conversationId={participant.conversation_id}
            streamBuffer={isParticipantStreaming ? (buf || null) : null}
            agentName={agentInfo.name}
            agentAvatarUrl={agentInfo.avatarUrl}
            userNick={userNick}
            userAvatarUrl={userAvatarUrl}
            isStreaming={isParticipantStreaming}
            refetchTrigger={refetchTrigger}
          />
        </div>
      );
    }

    return (
      <div className="flex-1 flex items-center justify-center text-exo-muted/40 text-sm">
        请从左侧选择一个视图
      </div>
    );
  };

  return (
    <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
      {/* Synth opinion overlay */}
      {showSynthOpinion && (
        <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4" onClick={() => setShowSynthOpinion(false)}>
          <div className="bg-[#0f1014] border border-exo-border rounded-xl w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-exo-text text-sm">追加意见（可选）</span>
              <button onClick={() => setShowSynthOpinion(false)} className="text-exo-muted hover:text-exo-text"><X size={16} /></button>
            </div>
            <textarea
              autoFocus
              value={synthOpinion}
              onChange={e => setSynthOpinion(e.target.value)}
              placeholder="你对这个议题的看法..."
              rows={3}
              className="w-full bg-black/40 border border-exo-border rounded-lg px-3 py-2 text-sm text-exo-text placeholder-exo-muted/40 focus:outline-none focus:border-exo-gold/50 resize-none"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowSynthOpinion(false)} className="flex-1 py-2 text-xs text-exo-muted border border-exo-border rounded-lg hover:bg-white/5">取消</button>
              <button onClick={handleSynthesize} className="flex-1 py-2 text-xs font-semibold bg-exo-gold text-black rounded-lg hover:bg-exo-gold/80">开始综合</button>
            </div>
          </div>
        </div>
      )}

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

      {/* Body: left nav + right view */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left nav — hidden on mobile via horizontal top strip */}
        <div className="hidden md:flex flex-col w-40 shrink-0 border-r border-exo-border bg-black/20 overflow-y-auto py-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = isSelectedActive(item.id);
            return (
              <button
                key={item.id}
                onClick={() => setSelectedView(item.id)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-all ${active ? 'bg-exo-gold/10 text-exo-gold border-r-2 border-exo-gold' : 'text-exo-muted hover:bg-white/5 hover:text-exo-text border-r-2 border-transparent'}`}
              >
                <Icon size={13} className="shrink-0" />
                <span className="text-xs font-medium truncate flex-1">{item.label}</span>
                {item.phase_status && <PhaseStatusDot status={item.phase_status} />}
              </button>
            );
          })}
        </div>

        {/* Mobile top strip */}
        <div className="md:hidden flex items-center gap-1 px-2 py-1.5 border-b border-exo-border bg-black/20 overflow-x-auto scrollbar-hide absolute top-[theme(spacing.20)] left-0 right-0 z-10 shrink-0" style={{ display: 'none' }}>
          {/* intentionally hidden — layout handled by flex-col on mobile */}
        </div>

        {/* Right content */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Mobile nav strip */}
          <div className="md:hidden flex items-center gap-1 px-2 py-1.5 border-b border-exo-border bg-black/20 overflow-x-auto scrollbar-hide shrink-0">
            {navItems.map(item => {
              const active = isSelectedActive(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedView(item.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all ${active ? 'bg-exo-gold/20 text-exo-gold border border-exo-gold/40' : 'text-exo-muted hover:text-exo-text border border-transparent hover:bg-white/5'}`}
                >
                  {item.label}
                  {item.phase_status && <PhaseStatusDot status={item.phase_status} />}
                </button>
              );
            })}
          </div>
          {renderMainView()}
        </div>
      </div>
    </div>
  );
};

export default CouncilArea;
