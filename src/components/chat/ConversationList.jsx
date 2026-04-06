import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronDown, ChevronRight, X, Plus, Cpu, Sparkles, Box,
  Folder, FolderOpen, Hash, MoreVertical, Edit2, Trash2,
  ShieldAlert, ChevronLast
} from 'lucide-react';
import { baseUrl, getCsrfToken } from '../../utils/api';

const ConversationList = ({ 
  activeSessionId, 
  setActiveSessionId, 
  projects, 
  refreshKey, 
  openDestructor, 
  openNewSession, 
  activeFileProjectId, 
  setActiveFileProjectId, 
  showConvList, 
  onClose,
  isCouncilMode = false, // 新增：是否为议会模式
  councilSessions = [],
  activeCouncilId,
  setActiveCouncilId,
  onCreateCouncil
}) => {
  const [conversations, setConversations] = useState([]);
  const [expandedProjects, setExpandedProjects] = useState(new Set());
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [showAllProjects, setShowAllProjects] = useState(false);

  useEffect(() => {
    fetch(`${baseUrl}/api/agents/conversations/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        const sortedData = data.sort((a, b) => new Date(b.last_message_at || b.created_at) - new Date(a.last_message_at || a.created_at));
        setConversations(sortedData);
        if (sortedData.length > 0 && !activeSessionId && !isCouncilMode) setActiveSessionId(sortedData[0].id);
      })
      .catch(err => console.error("会话列表获取失败:", err));
  }, [refreshKey, isCouncilMode]);

  const toggleProject = (projectId) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) newSet.delete(projectId); else newSet.add(projectId);
      return newSet;
    });
  };

  const councilInternalIds = new Set(
    (councilSessions || []).flatMap(cs => [
      cs.phase0_conversation_id,
      cs.synthesis_conversation_id,
      ...(cs.participants || []).map(p => p.conversation_id),
    ].filter(Boolean))
  );

  const g045Sessions = conversations.filter(c => c.agent_type === 'g045' && !councilInternalIds.has(c.id));
  const standardSessions = conversations.filter(c => c.agent_type !== 'g045' && c.project === null && !councilInternalIds.has(c.id));

  // 项目排序逻辑：按项目中最近会话的活跃时间排序
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const lastA = conversations.find(c => c.project === a.id)?.last_message_at || 0;
      const lastB = conversations.find(c => c.project === b.id)?.last_message_at || 0;
      return new Date(lastB) - new Date(lastA);
    });
  }, [projects, conversations]);

  const visibleProjects = showAllProjects ? sortedProjects : sortedProjects.slice(0, 2);

  const SessionItem = ({ conv, icon: Icon, colorClass }) => (
    <div onClick={() => setActiveSessionId(conv.id)} className={`group relative flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all ${activeSessionId === conv.id ? `bg-${colorClass}/10 text-${colorClass} border border-${colorClass}/30 shadow-[0_0_15px_rgba(var(--color-${colorClass}),0.05)]` : 'text-exo-muted hover:bg-white/5 border border-transparent'}`}>
      <div className="flex items-center gap-2 overflow-hidden">
        <Icon size={14} className={activeSessionId === conv.id ? `text-${colorClass}` : 'opacity-50'} />
        <span className="text-xs truncate w-36 tracking-wide">{conv.name || `Session #${conv.id}`}</span>
      </div>
      <div className="relative shrink-0">
        <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === conv.id ? null : conv.id); }} className={`p-1.5 rounded hover:bg-white/10 transition-opacity ${activeMenuId === conv.id ? 'opacity-100 text-exo-gold' : 'opacity-0 group-hover:opacity-100'}`}><MoreVertical size={14} /></button>
        {activeMenuId === conv.id && (
          <div className="absolute right-0 top-7 w-32 bg-[#1a1b23] border border-exo-border rounded-md shadow-2xl z-50 overflow-hidden text-xs py-1">
            <div className="px-3 py-2 hover:bg-white/5 flex items-center gap-2 text-exo-text transition-colors" onClick={(e) => {
              e.stopPropagation(); setActiveMenuId(null);
              const newName = prompt("Rename:", conv.name);
              if (newName && newName !== conv.name) {
                fetch(`${baseUrl}/api/agents/conversations/${conv.id}/`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                  credentials: 'include',
                  body: JSON.stringify({ name: newName }),
                }).then(r => { if (r.ok) setConversations(p => p.map(c => c.id === conv.id ? {...c, name: newName} : c)); });
              }
            }}><Edit2 size={12} /> 重命名</div>
            <div className="px-3 py-2 hover:bg-red-500/10 flex items-center gap-2 text-red-400 transition-colors" onClick={(e) => {
              e.stopPropagation(); setActiveMenuId(null);
              openDestructor({
                title: conv.name,
                description: "归档或彻底删除？",
                onArchive: () => setConversations(p => p.filter(c => c.id !== conv.id)),
                onDelete: () => {
                  fetch(`${baseUrl}/api/agents/conversations/${conv.id}/`, {
                    method: 'DELETE',
                    headers: { 'X-CSRFToken': getCsrfToken() },
                    credentials: 'include',
                  }).then(r => { if (r.ok) setConversations(p => p.filter(c => c.id !== conv.id)); });
                },
              });
            }}><Trash2 size={12} /> 删除会话</div>
          </div>
        )}
      </div>
    </div>
  );

  // 渲染议会列表逻辑（当作为议会列表使用时）
  if (isCouncilMode) {
    return (
      <>
        {showConvList && <div className="md:hidden fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />}
        <div className={`${showConvList ? 'translate-x-0 opacity-100' : '-translate-x-full md:translate-x-0 opacity-0 md:opacity-100 hidden md:flex'} transition-all duration-300 fixed md:relative inset-y-0 left-0 z-[70] md:z-auto w-72 md:w-64 h-full bg-exo-surface border-r border-exo-border/50 flex flex-col flex-shrink-0 shadow-2xl md:shadow-none overflow-hidden`}>
          <div className="p-4 border-b border-exo-border/50 gold-line-top flex justify-between items-center bg-black/30 shrink-0">
            <span className="label-caps text-exo-text/80 tracking-[0.2em]">COUNCIL HUB</span>
            <div className="flex items-center gap-2">
              <button onClick={() => onCreateCouncil && onCreateCouncil()} className="p-1.5 rounded bg-exo-gold/10 text-exo-gold hover:bg-exo-gold hover:text-black transition-colors"><Plus size={16} /></button>
              <button onClick={onClose} className="md:hidden p-1.5 rounded text-exo-muted hover:text-exo-text hover:bg-white/5 transition-colors"><X size={16} /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
            {(!councilSessions || councilSessions.length === 0) ? (
              <div className="p-8 border border-dashed border-exo-border/30 rounded-2xl text-[11px] text-center text-exo-muted/40 uppercase tracking-widest leading-loose">
                无活跃议事链路<br/>NO ACTIVE COUNCILS
              </div>
            ) : (
              councilSessions.map(cs => (
                <div
                  key={cs.id}
                  onClick={() => {
                    setActiveCouncilId && setActiveCouncilId(cs.id);
                    setActiveSessionId(null);
                    onClose && onClose();
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                    activeCouncilId === cs.id 
                      ? 'bg-exo-gold/10 border-exo-gold/30 text-exo-gold shadow-[0_0_20px_rgba(212,175,55,0.05)]' 
                      : 'border-transparent hover:bg-white/5 text-exo-muted hover:text-exo-text'
                  }`}
                >
                  <Users size={15} className="shrink-0 opacity-70" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate tracking-wide mb-1">
                      {cs.topic || cs.arbitrator_preset_name || `议会 #${cs.id}`}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                        cs.status === 'finished' ? 'border-green-500/30 text-green-500/60' : 'border-exo-gold/30 text-exo-gold/60'
                      }`}>
                        {cs.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {showConvList && <div className="md:hidden fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />}
      <div className={`${showConvList ? 'translate-x-0 opacity-100' : '-translate-x-full md:translate-x-0 opacity-0 md:opacity-100 hidden md:flex'} transition-all duration-300 fixed md:relative inset-y-0 left-0 z-[70] md:z-auto w-72 md:w-64 h-full bg-exo-surface border-r border-exo-border/50 flex flex-col flex-shrink-0 shadow-2xl md:shadow-none overflow-hidden`}>
        
        {/* Header */}
        <div className="p-4 border-b border-exo-border/50 gold-line-top flex justify-between items-center bg-black/30 shrink-0">
          <span className="label-caps text-exo-text/80 tracking-[0.2em]">EXO CORE</span>
          <div className="flex items-center gap-2">
            <button onClick={() => openNewSession()} className="p-1.5 rounded bg-exo-gold/10 text-exo-gold hover:bg-exo-gold hover:text-black transition-colors"><Plus size={16} /></button>
            <button onClick={onClose} className="md:hidden p-1.5 rounded text-exo-muted hover:text-exo-text hover:bg-white/5 transition-colors"><X size={16} /></button>
          </div>
        </div>

        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden" onClick={() => setActiveMenuId(null)}>
          
          {/* G045 Section: Max 50% */}
          {g045Sessions.length > 0 && (
            <div className="shrink-0 max-h-[50%] flex flex-col border-b border-exo-border/20">
              <div className="label-caps text-exo-gold/70 px-4 py-3 flex items-center gap-1.5 bg-black/10 shrink-0"><Cpu size={11} /> G045 Superior</div>
              <div className="overflow-y-auto px-3 pb-3 space-y-1">
                <div className="p-1.5 rounded-xl border border-exo-gold/20 bg-gradient-to-b from-exo-gold/5 to-transparent space-y-1">
                  {g045Sessions.map(conv => <SessionItem key={conv.id} conv={conv} icon={Sparkles} colorClass="exo-gold" />)}
                </div>
              </div>
            </div>
          )}

          {/* Standard Sessions Section: Flex-1 */}
          <div className="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar">
            {projects.length > 0 && (
              <div className="space-y-2">
                <div className="label-caps text-exo-muted/70 mb-2 flex items-center justify-between px-1">
                  <span className="flex items-center gap-1.5"><Box size={11} /> Projects</span>
                  {projects.length > 2 && (
                    <button 
                      onClick={() => setShowAllProjects(!showAllProjects)}
                      className="text-[9px] text-exo-gold/50 hover:text-exo-gold transition-colors flex items-center gap-0.5"
                    >
                      {showAllProjects ? '隐藏' : `显示全部 (${projects.length})`}
                    </button>
                  )}
                </div>
                {visibleProjects.map(proj => {
                  const isExpanded = expandedProjects.has(proj.id);
                  const projSessions = conversations.filter(c => c.project === proj.id && c.agent_type !== 'g045');
                  return (
                    <div key={proj.id} className="space-y-1">
                      <div onClick={() => toggleProject(proj.id)} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer text-exo-text hover:bg-white/5 transition-colors">
                        {isExpanded ? <ChevronDown size={14} className="text-exo-muted"/> : <ChevronRight size={14} className="text-exo-muted"/>}
                        <Folder size={14} className={isExpanded ? "text-blue-400" : "text-exo-muted"} />
                        <span className="text-xs font-medium truncate flex-1">{proj.name}</span>
                        <span className="text-[10px] bg-black/50 px-1.5 rounded text-exo-muted font-mono">{projSessions.length}</span>
                      </div>
                      {isExpanded && (
                        <div className="pl-6 pr-1 space-y-1 border-l-2 border-exo-border/50 ml-3 py-1">
                          <div
                            onClick={() => { setActiveFileProjectId(proj.id); onClose(); }}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs font-bold transition-all ${
                              activeFileProjectId === proj.id
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                                : 'text-blue-400/70 hover:bg-blue-500/10 hover:text-blue-400 border border-transparent'
                            }`}
                          >
                            <FolderOpen size={14} /> Project Files
                          </div>
                          {projSessions.map(conv => <SessionItem key={conv.id} conv={conv} icon={Hash} colorClass="exo-text" />)}
                          <div onClick={() => openNewSession({ projectId: proj.id })} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer text-exo-muted hover:text-exo-text text-xs border border-dashed border-exo-border/50 mt-1 transition-all"><Plus size={14} /> New Record</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {standardSessions.length > 0 && (
              <div className="space-y-1">
                <div className="label-caps text-exo-muted/70 mb-2 mt-2 flex items-center gap-1.5 px-1"><Hash size={11} /> Standard Nodes</div>
                {standardSessions.map(conv => <SessionItem key={conv.id} conv={conv} icon={Hash} colorClass="exo-text" />)}
              </div>
            )}

            {conversations.length === 0 && projects.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 opacity-30 text-center gap-3">
                <ShieldAlert size={32} className="text-exo-muted" />
                <p className="text-[10px] uppercase tracking-[0.2em] leading-relaxed">No Active Link<br/>Check Connection</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ConversationList;
