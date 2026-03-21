import React, { useState, useEffect } from 'react';
import {
  ChevronDown, ChevronRight, X, Plus, Cpu, Sparkles, Box,
  Folder, FolderOpen, Hash, MoreVertical, Edit2, Trash2,
  ShieldAlert, Users, Check
} from 'lucide-react';
import { baseUrl } from '../../utils/api';

const ConversationList = ({ activeSessionId, setActiveSessionId, projects, refreshKey, openDestructor, openNewSession, activeFileProjectId, setActiveFileProjectId, showConvList, onClose }) => {
  const [conversations, setConversations] = useState([]);
  const [expandedProjects, setExpandedProjects] = useState(new Set());
  const [activeMenuId, setActiveMenuId] = useState(null);

  useEffect(() => {
    fetch(`${baseUrl}/api/agents/conversations/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        const sortedData = data.sort((a, b) => new Date(b.last_message_at || b.created_at) - new Date(a.last_message_at || a.created_at));
        setConversations(sortedData);
        if (sortedData.length > 0 && !activeSessionId) setActiveSessionId(sortedData[0].id);
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

  const g045Sessions = conversations.filter(c => c.agent_type === 'g045');
  const standardSessions = conversations.filter(c => c.agent_type !== 'g045' && c.project === null);

  const SessionItem = ({ conv, icon: Icon, colorClass }) => (
    <div onClick={() => setActiveSessionId(conv.id)} className={`group relative flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${activeSessionId === conv.id ? `bg-${colorClass}/10 text-${colorClass} border border-${colorClass}/30 shadow-[0_0_10px_rgba(var(--color-${colorClass}),0.1)]` : 'text-exo-muted hover:bg-white/5 border border-transparent'}`}>
      <div className="flex items-center gap-2 overflow-hidden">
        <Icon size={14} className={activeSessionId === conv.id ? `text-${colorClass}` : 'opacity-50'} />
        <span className="text-xs font-medium truncate w-32">{conv.name || `Session #${conv.id}`}</span>
      </div>
      <div className="relative">
        <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === conv.id ? null : conv.id); }} className={`p-1 rounded hover:bg-white/10 ${activeMenuId === conv.id ? 'opacity-100 text-exo-gold' : 'opacity-0 group-hover:opacity-100'}`}><MoreVertical size={14} /></button>
        {activeMenuId === conv.id && (
          <div className="absolute right-0 top-6 w-28 bg-[#1a1b23] border border-exo-border rounded-md shadow-xl z-50 overflow-hidden text-xs">
            <div className="px-3 py-2 hover:bg-white/5 flex items-center gap-2 text-exo-text" onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); const newName = prompt("Rename:", conv.name); if(newName) setConversations(p => p.map(c => c.id === conv.id ? {...c, name: newName} : c)); }}><Edit2 size={12} /> Rename</div>
            <div className="px-3 py-2 hover:bg-red-500/10 flex items-center gap-2 text-red-400" onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); openDestructor({ title: conv.name, description: "归档或彻底删除？", onArchive: () => setConversations(p => p.filter(c=>c.id!==conv.id)), onDelete: () => setConversations(p => p.filter(c=>c.id!==conv.id)) }); }}><Trash2 size={12} /> Delete</div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {showConvList && <div className="md:hidden fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm" onClick={onClose} />}
      <div className={`${showConvList ? 'translate-x-0 opacity-100' : '-translate-x-full md:translate-x-0 opacity-0 md:opacity-100 hidden md:flex'} transition-all duration-300 fixed md:relative inset-y-0 left-0 z-[70] md:z-auto w-72 md:w-64 h-full bg-[#12131a] border-r border-exo-border flex-col flex-shrink-0 shadow-2xl md:shadow-none`}>
        <div className="p-4 border-b border-exo-border text-sm font-bold text-exo-text tracking-widest flex justify-between items-center bg-black/20">
          <span>EXO CORE</span>
          <div className="flex items-center gap-2">
            <button onClick={() => openNewSession()} className="p-1 rounded bg-exo-gold/10 text-exo-gold hover:bg-exo-gold hover:text-black"><Plus size={16} /></button>
            <button onClick={onClose} className="md:hidden p-1 rounded text-exo-muted hover:text-exo-text hover:bg-white/5"><X size={16} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 scrollbar-hide space-y-6" onClick={() => setActiveMenuId(null)}>
          {g045Sessions.length > 0 && (
            <div className="space-y-1 relative">
              <div className="text-[10px] font-bold text-exo-gold uppercase tracking-wider mb-2 flex items-center gap-1 opacity-80"><Cpu size={12} /> G045 Superior</div>
              <div className="p-1.5 rounded-xl border border-exo-gold/20 bg-gradient-to-b from-exo-gold/5 to-transparent space-y-1">
                {g045Sessions.map(conv => <SessionItem key={conv.id} conv={conv} icon={Sparkles} colorClass="exo-gold" />)}
              </div>
            </div>
          )}
          {projects.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-exo-muted uppercase tracking-wider mb-2 flex items-center gap-1"><Box size={12} /> Projects</div>
              {projects.map(proj => {
                const isExpanded = expandedProjects.has(proj.id);
                const projSessions = conversations.filter(c => c.project === proj.id && c.agent_type !== 'g045');
                return (
                  <div key={proj.id} className="space-y-1">
                    <div onClick={() => toggleProject(proj.id)} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer text-exo-text hover:bg-white/5">
                      {isExpanded ? <ChevronDown size={14} className="text-exo-muted"/> : <ChevronRight size={14} className="text-exo-muted"/>}
                      <Folder size={14} className={isExpanded ? "text-blue-400" : "text-exo-muted"} />
                      <span className="text-xs font-medium truncate flex-1">{proj.name}</span>
                      <span className="text-[10px] bg-black/50 px-1.5 rounded text-exo-muted">{projSessions.length}</span>
                    </div>
                    {isExpanded && (
                      <div className="pl-6 pr-1 space-y-1 border-l-2 border-exo-border/50 ml-3 py-1">
                        <div
                          onClick={() => { setActiveFileProjectId(proj.id); setActiveSessionId(null); }}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs font-bold transition-all ${
                            activeFileProjectId === proj.id
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'text-blue-400/70 hover:bg-blue-500/10 hover:text-blue-400 border border-transparent'
                          }`}
                        >
                          <FolderOpen size={14} /> Project Files
                        </div>
                        {projSessions.map(conv => <SessionItem key={conv.id} conv={conv} icon={Hash} colorClass="exo-text" />)}
                        <div onClick={() => openNewSession({ projectId: proj.id })} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer text-exo-muted hover:text-exo-text text-xs border border-dashed border-exo-border mt-1"><Plus size={14} /> New Record</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {standardSessions.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-exo-muted uppercase tracking-wider mb-2 mt-4 flex items-center gap-1"><Hash size={12} /> Standard Nodes</div>
              {standardSessions.map(conv => <SessionItem key={conv.id} conv={conv} icon={Hash} colorClass="exo-text" />)}
            </div>
          )}

          {conversations.length === 0 && projects.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 opacity-30 text-center gap-2">
              <ShieldAlert size={32} className="text-exo-muted" />
              <p className="text-[10px] uppercase tracking-widest leading-relaxed">未发现活动链路<br/>请检查后端连接</p>
            </div>
          )}

          <div className="mt-auto pt-4 border-t border-exo-border/50 opacity-40 grayscale pointer-events-none">
            <div className="text-[10px] font-bold text-exo-muted uppercase tracking-wider mb-2 flex items-center gap-1"><Users size={12} /> Council Room</div>
            <div className="p-2 border border-dashed border-exo-border rounded-lg text-xs text-center text-exo-muted bg-black/20">Sync pending...</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ConversationList;
