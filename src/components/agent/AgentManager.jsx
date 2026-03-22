import React, { useState, useEffect, useRef } from 'react';
import {
  BrainCircuit, Cpu, Hash, Edit3, Trash2,
  GripVertical, Play, Sparkles, Clock, Camera
} from 'lucide-react';
import { baseUrl } from '../../utils/api';
import { getAgentAvatarUrl } from '../../utils/avatar';
import EditPresetModal from '../modals/EditPresetModal';
import AvatarCropModal from '../modals/AvatarCropModal';
import MemoryAnchorTicker from './MemoryAnchorTicker';

const AgentManager = ({ openNewSession, openDestructor, setCurrentTab, presets, refreshPresets }) => {
  const [editTarget, setEditTarget] = useState(null);
  const [anchorCache, setAnchorCache] = useState({});
  const [cardOrder, setCardOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem('agentHubOrder') || '{}'); } catch { return {}; }
  });
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const applyOrder = (list) =>
    [...list].sort((a, b) => (cardOrder[a.id] ?? a.id) - (cardOrder[b.id] ?? b.id));

  const g045Presets = applyOrder(presets.filter(p => p.agent_type === 'g045'));
  const standardPresets = applyOrder(presets.filter(p => p.agent_type !== 'g045'));

  const handleDrop = (srcId, dstId, list) => {
    if (srcId === dstId) return;
    const ids = list.map(p => p.id);
    const newIds = [...ids];
    newIds.splice(newIds.indexOf(srcId), 1);
    newIds.splice(newIds.indexOf(dstId), 0, srcId);
    const newOrder = { ...cardOrder };
    newIds.forEach((id, idx) => { newOrder[id] = idx; });
    setCardOrder(newOrder);
    localStorage.setItem('agentHubOrder', JSON.stringify(newOrder));
  };

  useEffect(() => {
    g045Presets.forEach(p => {
      if (anchorCache[p.id] !== undefined) return;
      fetch(`${baseUrl}/api/agents/presets/${p.id}/anchors/snapshot/`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => setAnchorCache(prev => ({ ...prev, [p.id]: Array.isArray(data) ? data : [] })))
        .catch(() => setAnchorCache(prev => ({ ...prev, [p.id]: [] })));
    });
  }, [g045Presets.map(p => p.id).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const AgentCard = ({ preset, isG045, list }) => {
    const isDraggingThis = dragging === preset.id;
    const isDragOver = dragOver === preset.id && !isDraggingThis;
    const avatarInputRef = useRef(null);
    const [avatarUrl, setAvatarUrl] = useState(() => getAgentAvatarUrl(preset.id, preset.name));
    const [cropFile, setCropFile] = useState(null);

    const handleAvatarChange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setCropFile(file);
      e.target.value = '';
    };

    return (
      <>
      {cropFile && (
        <AvatarCropModal
          file={cropFile}
          onConfirm={(dataUrl) => {
            localStorage.setItem(`exo_agent_avatar_${preset.id}`, dataUrl);
            setAvatarUrl(dataUrl);
            setCropFile(null);
          }}
          onCancel={() => setCropFile(null)}
        />
      )}
      <div
        className={`relative flex flex-col p-5 rounded-xl border transition-all hover:bg-white/[0.02] ${
          isG045
            ? 'bg-gradient-to-br from-exo-gold/5 to-transparent border-exo-gold/30 shadow-[0_4px_20px_rgba(255,215,0,0.03)]'
            : 'bg-exo-panel border-exo-border'
        } ${isDraggingThis ? 'opacity-40 scale-95' : ''} ${isDragOver ? (isG045 ? 'border-exo-gold/80 shadow-[0_0_20px_rgba(255,215,0,0.12)]' : 'border-exo-muted/60') : ''}`}
        draggable
        onDragStart={() => setDragging(preset.id)}
        onDragEnd={() => { setDragging(null); setDragOver(null); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(preset.id); }}
        onDrop={() => { handleDrop(dragging, preset.id, list); setDragging(null); setDragOver(null); }}
      >
        {/* 头部：flex-wrap 保证窄卡片上按钮会换行而不溢出 */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="cursor-grab text-exo-muted hover:text-white shrink-0"><GripVertical size={16} /></div>

            {/* 头像 + 上传 */}
            <div
              className="relative shrink-0 cursor-pointer group"
              onClick={() => avatarInputRef.current?.click()}
              title="点击更换头像"
            >
              <img src={avatarUrl} className={`w-12 h-12 rounded-lg border bg-black object-cover ${isG045 ? 'border-exo-gold/50' : 'border-exo-border'}`} alt="Avatar" />
              <div className="absolute inset-0 rounded-lg bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera size={14} className="text-white" />
              </div>
              <input type="file" ref={avatarInputRef} accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            <div className="min-w-0">
              <h3 className={`text-base font-bold flex items-center gap-2 ${isG045 ? 'text-exo-gold' : 'text-exo-text'}`}>
                <span className="truncate">{preset.name}</span>
                {isG045 && <Sparkles size={14} className="text-exo-gold animate-pulse shrink-0" />}
              </h3>
              <p className="text-xs text-exo-muted font-mono mt-0.5 truncate">{preset.default_model}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setEditTarget(preset)}
              className="p-1.5 text-exo-muted hover:text-white bg-black/30 rounded border border-transparent hover:border-exo-border transition-all" title="Edit Core"
            >
              <Edit3 size={14} />
            </button>
            <button
              onClick={() => {
                openDestructor({
                  title: `Target Core: [${preset.name}]`,
                  description: "删除预设将阻止未来通过该模板创建新会话。请问是将关联历史会话移入归档，还是连同会话数据一同物理抹除？",
                  onArchive: () => alert("已触发归档 (API 待对接)"),
                  onDelete: () => alert("已触发抹除 (API 待对接)")
                });
              }}
              className="p-1.5 text-red-500/70 hover:text-red-400 bg-red-500/10 rounded border border-transparent hover:border-red-500/30 transition-all" title="Destroy Core"
            >
              <Trash2 size={14} />
            </button>
            <div className="w-px h-6 bg-exo-border mx-1"></div>
            <button
              onClick={() => {
                openNewSession({ presetId: preset.id });
                setCurrentTab('chat');
              }}
              className="px-3 py-1.5 bg-exo-gold/10 text-exo-gold hover:bg-exo-gold hover:text-black border border-exo-gold/30 rounded flex items-center gap-1 text-xs font-bold transition-all"
            >
              <Play size={12} fill="currentColor" /> INITIATE
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-400 mb-4 line-clamp-2 leading-relaxed">{preset.description}</p>

        {isG045 && (
          <div className="mt-auto pt-4 border-t border-exo-gold/10">
            <div className="text-[10px] font-bold text-exo-gold/70 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Clock size={12} /> Active Memory Stream
            </div>
            <MemoryAnchorTicker anchors={anchorCache[preset.id] || []} />
          </div>
        )}
      </div>
      </>
    );
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-exo-bg p-8 scrollbar-hide">
      <EditPresetModal
        isOpen={!!editTarget}
        preset={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={refreshPresets}
      />
      <div className="max-w-5xl mx-auto space-y-10">
        <div>
          <h2 className="text-3xl font-black text-exo-text mb-2 flex items-center gap-3">
            <BrainCircuit className="text-exo-gold" size={28} /> Central Agent Hub
          </h2>
          <p className="text-exo-muted text-sm">管理系统代理核心预设。配置模型、提示词，并监控高级核心的记忆活动。</p>
        </div>

        {g045Presets.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-exo-gold/20 pb-2">
              <Cpu size={16} className="text-exo-gold" />
              <h3 className="text-sm font-bold text-exo-gold uppercase tracking-widest">Superior Cores (G045)</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {g045Presets.map(p => <AgentCard key={p.id} preset={p} isG045={true} list={g045Presets} />)}
            </div>
          </div>
        )}

        {standardPresets.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-exo-border pb-2 mt-8">
              <Hash size={16} className="text-exo-muted" />
              <h3 className="text-sm font-bold text-exo-muted uppercase tracking-widest">Standard Modules</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {standardPresets.map(p => <AgentCard key={p.id} preset={p} isG045={false} list={standardPresets} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentManager;
