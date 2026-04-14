import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronDown, ChevronRight, X, Plus, Cpu, Sparkles, Box,
  Folder, FolderOpen, Hash, MoreVertical, Edit2, Trash2,
  ShieldAlert, ChevronLast, PanelLeftClose, PanelLeftOpen, Users,
  Search, MessageSquare
} from 'lucide-react';
import { baseUrl, getCsrfToken } from '../../utils/api';

const ConversationList = ({ 
  activeSessionId, 
  setActiveSessionId, 
  projects = [], 
  refreshKey, 
  setRefreshKey,
  openDestructor, 
  openNewSession, 
  activeFileProjectId, 
  setActiveFileProjectId, 
  showConvList, 
  onClose,
  mode = 'chat', // 'chat' | 'council' | 'project'
  councilSessions = [],
  activeCouncilId,
  setActiveCouncilId,
  onCreateCouncil,
  isMainView = false // Whether it's displayed in the main content area
}) => {
  const [conversations, setConversations] = useState([]);
  const [expandedProjects, setExpandedProjects] = useState(new Set());
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch(`${baseUrl}/api/agents/conversations/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        const sortedData = data.sort((a, b) => new Date(b.last_message_at || b.created_at) - new Date(a.last_message_at || a.created_at));
        setConversations(sortedData);
      })
      .catch(err => console.error("会话列表获取失败:", err));
  }, [refreshKey]);

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

  const filteredConversations = conversations.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.id.toString().includes(searchQuery)
  );

  const g045Sessions = filteredConversations.filter(c => c.agent_type === 'g045' && !councilInternalIds.has(c.id));
  const standardSessions = filteredConversations.filter(c => c.agent_type !== 'g045' && c.project === null && !councilInternalIds.has(c.id));

  const sortedProjects = useMemo(() => {
    if (!projects) return [];
    return [...projects].sort((a, b) => {
      const lastA = conversations.find(c => c.project === a.id)?.last_message_at || 0;
      const lastB = conversations.find(c => c.project === b.id)?.last_message_at || 0;
      return new Date(lastB) - new Date(lastA);
    });
  }, [projects, conversations]);

  const visibleProjects = showAllProjects ? sortedProjects : sortedProjects.slice(0, 2);

  const SessionItem = ({ conv, icon: Icon }) => (
    <div 
      onClick={() => setActiveSessionId(conv.id)} 
      className={`group relative flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${activeSessionId === conv.id ? 'bg-exo-accent/10 text-exo-accent border border-exo-accent/30 shadow-[0_0_15px_rgba(255,215,0,0.05)]' : 'text-exo-muted hover:bg-white/5 border border-transparent'}`}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div className={`p-1.5 rounded-lg ${activeSessionId === conv.id ? 'bg-exo-accent/20' : 'bg-white/5'}`}>
          <Icon size={14} className={activeSessionId === conv.id ? 'text-exo-accent' : 'opacity-50'} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm truncate tracking-wide font-medium">{conv.name || `Session #${conv.id}`}</span>
          {isMainView && <span className="text-[10px] opacity-40 uppercase tracking-tighter">Last activity: {new Date(conv.last_message_at || conv.created_at).toLocaleString()}</span>}
        </div>
      </div>
      <div className="relative shrink-0 flex items-center gap-2">
        <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === conv.id ? null : conv.id); }} className={`p-1.5 rounded-lg hover:bg-white/10 transition-opacity ${activeMenuId === conv.id ? 'opacity-100 text-exo-accent' : 'opacity-0 group-hover:opacity-100'}`}><MoreVertical size={14} /></button>
        {activeMenuId === conv.id && (
          <div className="absolute right-0 top-10 w-40 bg-exo-panel border border-exo-border rounded-xl shadow-2xl z-[110] overflow-hidden text-xs py-1 backdrop-blur-xl">
            <div className="px-4 py-2.5 hover:bg-white/5 flex items-center gap-2 text-exo-text transition-colors" onClick={(e) => {
              e.stopPropagation(); setActiveMenuId(null);
              const newName = prompt("Rename:", conv.name);
              if (newName && newName !== conv.name) {
                fetch(`${baseUrl}/api/agents/conversations/${conv.id}/`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                  credentials: 'include',
                  body: JSON.stringify({ name: newName }),
                }).then(r => { 
                  if (r.ok) {
                    setConversations(p => p.map(c => c.id === conv.id ? {...c, name: newName} : c));
                  }
                });
              }
            }}><Edit2 size={14} /> 重命名</div>
            <div className="px-4 py-2.5 hover:bg-red-500/10 flex items-center gap-2 text-red-400 transition-colors" onClick={(e) => {
              e.stopPropagation(); setActiveMenuId(null);
              openDestructor({
                title: conv.name,
                onDelete: () => {
                  fetch(`${baseUrl}/api/agents/conversations/${conv.id}/`, {
                    method: 'DELETE',
                    headers: { 'X-CSRFToken': getCsrfToken() },
                    credentials: 'include',
                  }).then(r => { 
                    if (r.ok) {
                      setConversations(p => p.filter(c => c.id !== conv.id));
                      if (activeSessionId === conv.id) setActiveSessionId(null);
                    }
                  });
                },
              });
            }}><Trash2 size={14} /> 删除会话</div>
          </div>
        )}
      </div>
    </div>
  );

  const containerClasses = isMainView 
    ? "flex-1 h-full bg-noise flex flex-col overflow-hidden" 
    : `fixed md:relative inset-y-0 left-0 z-[90] w-72 h-full bg-[#05060A]/60 backdrop-blur-2xl border-r border-white/5 flex flex-col flex-shrink-0 shadow-2xl transition-transform duration-300 ${showConvList ? 'translate-x-0' : '-translate-x-full md:hidden'}`;

  return (
    <div className={containerClasses}>
      {/* Search & Header */}
      <div className={`p-6 space-y-4 shrink-0 ${isMainView ? 'max-w-4xl mx-auto w-full' : ''}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-[0.2em] text-exo-accent uppercase">
            {mode === 'chat' && 'Nodes Hub'}
            {mode === 'council' && 'Council Hub'}
            {mode === 'project' && 'Project Repos'}
          </h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => mode === 'council' ? onCreateCouncil() : openNewSession()}
              className="p-2 rounded-xl bg-exo-accent/10 text-exo-accent border border-exo-accent/20 hover:bg-exo-accent hover:text-black transition-all"
            >
              <Plus size={18} />
            </button>
            {!isMainView && <button onClick={onClose} className="md:hidden p-2 rounded-xl text-exo-muted hover:bg-white/5"><X size={18} /></button>}
          </div>
        </div>
        
        <div className="relative group">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-exo-muted/40 group-focus-within:text-exo-accent transition-colors" />
          <input 
            type="text" 
            placeholder="Search active nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-xs focus:border-exo-accent/30 focus:bg-white/10 outline-none transition-all"
          />
        </div>
      </div>

      <div className={`flex-1 flex flex-col overflow-hidden min-h-0 ${isMainView ? 'max-w-4xl mx-auto w-full px-6' : 'px-4'}`}>
          
          {mode === 'chat' && (
            <>
              {/* G045 cognitively superior */}
              {g045Sessions.length > 0 && (
                <div className="flex flex-col overflow-hidden max-h-[40%] shrink-0">
                  <div className="text-[10px] font-bold text-exo-accent/60 flex items-center gap-2 uppercase tracking-[0.2em] px-2 pt-3 pb-1.5 shrink-0">
                    <Sparkles size={12} /> Superior Cognitive
                  </div>
                  <div className="overflow-y-auto custom-scrollbar grid gap-1 pb-2 min-h-0">
                    {g045Sessions.map(conv => <SessionItem key={conv.id} conv={conv} icon={Cpu} />)}
                  </div>
                </div>
              )}

              {/* Divider: G045 → Projects */}
              {g045Sessions.length > 0 && sortedProjects.length > 0 && (
                <div className="h-px bg-exo-border shrink-0" />
              )}

              {/* Projects Zone */}
              {sortedProjects.length > 0 && (
                <div className="flex flex-col overflow-hidden max-h-[40%] shrink-0">
                  <div className="text-[10px] font-bold text-exo-muted/40 flex items-center gap-2 uppercase tracking-[0.2em] px-2 pt-3 pb-1.5 shrink-0">
                    <Box size={12} /> Project Repositories
                  </div>
                  <div className="overflow-y-auto custom-scrollbar flex-1 min-h-0 pb-2">
                    <div className="grid gap-2">
                      {visibleProjects.map(proj => {
                        const isExpanded = expandedProjects.has(proj.id);
                        const projSessions = conversations.filter(c => c.project === proj.id);
                        return (
                          <div key={proj.id} className="space-y-2">
                            <div
                              onClick={() => toggleProject(proj.id)}
                              className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all border ${isExpanded ? 'bg-white/5 border-white/10' : 'border-transparent hover:bg-white/[0.03]'}`}
                            >
                              <div className={`p-2 rounded-xl ${isExpanded ? 'bg-blue-500/10 text-blue-400' : 'bg-white/5 text-exo-muted'}`}>
                                {isExpanded ? <FolderOpen size={18}/> : <Folder size={18}/>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{proj.name}</div>
                                <div className="text-[10px] opacity-30 uppercase tracking-tighter">{projSessions.length} active nodes</div>
                              </div>
                              <ChevronRight size={14} className={`transition-transform opacity-30 ${isExpanded ? 'rotate-90' : ''}`} />
                            </div>
                            {isExpanded && (
                              <div className="pl-6 space-y-1 border-l border-white/5 ml-6 animate-fade-in">
                                <div
                                  onClick={() => { setActiveFileProjectId(proj.id); setActiveSessionId(null); onClose(); }}
                                  className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer text-xs font-bold tracking-tight transition-all ${
                                    activeFileProjectId === proj.id
                                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                      : 'text-blue-400/60 hover:bg-blue-500/5 hover:text-blue-400'
                                  }`}
                                >
                                  <Box size={14} /> ARCHIVE FILES
                                </div>
                                {projSessions.map(conv => <SessionItem key={conv.id} conv={conv} icon={Hash} />)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {sortedProjects.length > 2 && (
                      <button
                        onClick={() => setShowAllProjects(p => !p)}
                        className="text-[10px] text-exo-muted/40 hover:text-exo-muted transition-colors px-2 pt-1 pb-1"
                      >
                        {showAllProjects ? 'show less ↑' : 'show more projects...'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Divider: Projects → Standard */}
              {sortedProjects.length > 0 && standardSessions.length > 0 && (
                <div className="h-px bg-exo-border shrink-0" />
              )}

              {/* Divider: G045 → Standard (when no projects) */}
              {g045Sessions.length > 0 && sortedProjects.length === 0 && standardSessions.length > 0 && (
                <div className="h-px bg-exo-border shrink-0" />
              )}

              {/* Standard Sessions */}
              {standardSessions.length > 0 && (
                <div className="flex flex-col overflow-hidden flex-1 min-h-0">
                  <div className="text-[10px] font-bold text-exo-muted/40 flex items-center gap-2 uppercase tracking-[0.2em] px-2 pt-3 pb-1.5 shrink-0">
                    <MessageSquare size={12} /> Recent Links
                  </div>
                  <div className="overflow-y-auto custom-scrollbar grid gap-1 pb-4 min-h-0 flex-1">
                    {standardSessions.map(conv => <SessionItem key={conv.id} conv={conv} icon={Hash} />)}
                  </div>
                </div>
              )}
            </>
          )}

          {mode === 'council' && (
            <div className="grid gap-2">
              {councilSessions.length === 0 ? (
                 <div className="py-20 text-center opacity-20">
                    <Users size={48} className="mx-auto mb-4" />
                    <p className="text-xs uppercase tracking-widest">No Active Councils</p>
                 </div>
              ) : councilSessions.map(cs => (
                <div
                  key={cs.id}
                  onClick={() => { setActiveCouncilId(cs.id); setActiveSessionId(null); onClose && onClose(); }}
                  className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border ${
                    activeCouncilId === cs.id 
                      ? 'bg-exo-accent/10 border-exo-accent/30 text-exo-accent shadow-[0_0_20px_rgba(255,215,0,0.05)]' 
                      : 'border-white/5 hover:bg-white/5 text-exo-muted hover:text-exo-text'
                  }`}
                >
                  <div className={`p-3 rounded-xl ${activeCouncilId === cs.id ? 'bg-exo-accent/20' : 'bg-white/5'}`}>
                    <Users size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate mb-1">{cs.topic || cs.arbitrator_preset_name || `Council #${cs.id}`}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded border border-exo-accent/20 text-exo-accent/70">{cs.status}</span>
                      <span className="text-[9px] opacity-30">{new Date(cs.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {mode === 'project' && (
             <div className="space-y-3">
                <div className="text-[10px] font-bold text-exo-muted/40 flex items-center gap-2 uppercase tracking-[0.2em]">
                  <Box size={12} /> Project Repositories
                </div>
                <div className="grid gap-2">
                  {sortedProjects.map(proj => {
                    const isExpanded = expandedProjects.has(proj.id) || mode === 'project';
                    const projSessions = conversations.filter(c => c.project === proj.id);
                    return (
                      <div key={proj.id} className="space-y-2">
                        <div 
                          onClick={() => toggleProject(proj.id)}
                          className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all border ${isExpanded ? 'bg-white/5 border-white/10' : 'border-transparent hover:bg-white/[0.03]'}`}
                        >
                          <div className={`p-2 rounded-xl ${isExpanded ? 'bg-blue-500/10 text-blue-400' : 'bg-white/5 text-exo-muted'}`}>
                            {isExpanded ? <FolderOpen size={18}/> : <Folder size={18}/>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{proj.name}</div>
                            <div className="text-[10px] opacity-30 uppercase tracking-tighter">{projSessions.length} active nodes</div>
                          </div>
                          <ChevronRight size={14} className={`transition-transform opacity-30 ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                        {isExpanded && (
                           <div className="pl-6 space-y-1 border-l border-white/5 ml-6 animate-fade-in">
                              <div
                                onClick={() => { setActiveFileProjectId(proj.id); setActiveSessionId(null); onClose(); }}
                                className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer text-xs font-bold tracking-tight transition-all ${
                                  activeFileProjectId === proj.id
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    : 'text-blue-400/60 hover:bg-blue-500/5 hover:text-blue-400'
                                }`}
                              >
                                <Box size={14} /> ARCHIVE FILES
                              </div>
                              {projSessions.map(conv => <SessionItem key={conv.id} conv={conv} icon={Hash} />)}
                           </div>
                        )}
                      </div>
                    );
                  })}
                </div>
             </div>
          )}

          {filteredConversations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 opacity-20 text-center gap-4">
              <ShieldAlert size={40} strokeWidth={1} className="text-exo-muted" />
              <p className="text-[10px] uppercase tracking-[0.3em] font-light leading-relaxed">No Nodes Found<br/>Check Connection</p>
            </div>
          )}
      </div>
    </div>
  );
};

export default ConversationList;
