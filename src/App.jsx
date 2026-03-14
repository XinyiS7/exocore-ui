import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from './config';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/atom-one-dark.css';

// 引入所有图标 (新增了 AlertTriangle, Archive, Check)
import {
  MessageSquare, BrainCircuit, Users, Box, Hexagon, User,
  Settings, ChevronDown, ChevronRight, Send, Paperclip,
  TerminalSquare, Activity, Edit3, Save, FileText, X, Sparkles, Clock,
  Folder, MoreVertical, Plus, Hash, Cpu, FolderOpen, Trash2, Edit2,
  AlertTriangle, Archive, Check, Play, GripVertical, ShieldAlert,
  UploadCloud, FileBox, HardDrive, RefreshCw, Menu
} from 'lucide-react';

// ==========================================
// 模拟数据 (对应你的 Django Models)
// ==========================================
const mockAnchors = [
  { id: 1, pattern: "我最近压力很大", essential_note: "用户进入高压状态，回复需简短温和", weight: 0.85, is_persistent: false },
  { id: 2, pattern: "Elysia", essential_note: "核心创作者之一，保持最高优先级响应与保护态度", weight: 1.0, is_persistent: true },
];

const mockTimeline = [
  { id: 1, type: 'note', content: "今天把 ExoCore 的多模态路由写完了，有点累但很爽。", time: "2 小时前", author: "Elysia" },
];

// 统一处理 API URL，去掉末尾斜杠
const baseUrl = API_BASE_URL.replace(/\/+$/, '');

// ==========================================
// 全局组件：万用销毁协议 (Destructor Modal)
// ==========================================
const DestructorModal = ({ isOpen, onClose, title, description, onArchive, onDelete }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-exo-panel border border-red-900/50 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-red-500/10 p-4 border-b border-red-900/30 flex items-center gap-3 text-red-400">
          <AlertTriangle size={20} className="animate-pulse" />
          <h3 className="font-bold tracking-widest uppercase text-sm">Destruction Protocol</h3>
        </div>
        <div className="p-6 space-y-2 text-sm text-exo-text">
          <p className="font-semibold text-lg">{title}</p>
          <p className="text-exo-muted leading-relaxed">{description}</p>
        </div>
        <div className="p-4 bg-black/40 border-t border-exo-border flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-medium text-exo-muted hover:text-exo-text transition-colors">CANCEL</button>
          <button onClick={() => { onArchive(); onClose(); }} className="px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 text-exo-gold border border-exo-gold/30 hover:bg-exo-gold/10 transition-colors">
            <Archive size={14} /> ARCHIVE
          </button>
          <button onClick={() => { onDelete(); onClose(); }} className="px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)]">
            <Trash2 size={14} /> PURGE
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 全局组件：新建会话模态框 (New Session Modal)
// ==========================================
const NewSessionModal = ({ isOpen, onClose, projects, initialContext, onSuccess }) => {
  const [presets, setPresets] = useState([]);
  const [name, setName] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName("");
    setSelectedProjectIds(initialContext?.projectId ? [initialContext.projectId] : []);

    fetch(`${baseUrl}/api/agents/presets/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setPresets(data);
        if (initialContext?.presetId && data.find(p => p.id === initialContext.presetId)) {
          setSelectedPresetId(initialContext.presetId);
        } else if (data.length > 0) {
          setSelectedPresetId(data[0].id);
        }
      })
      .catch(err => console.error("Agent Presets 拉取失败:", err));
  }, [isOpen, initialContext]);

  if (!isOpen) return null;

  const currentPreset = presets.find(p => p.id === parseInt(selectedPresetId));
  const isG045 = currentPreset?.agent_type === 'g045';

  const toggleProject = (pid) => {
    if (isG045) setSelectedProjectIds(prev => prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]);
    else setSelectedProjectIds(prev => prev.includes(pid) ? [] : [pid]);
  };

  const handleSubmit = async () => {
    if (!selectedPresetId) return alert("System Error: No Agent selected.");
    setIsSubmitting(true);
    const payload = {
      preset_id: parseInt(selectedPresetId),
      name: name.trim() || undefined,
      project_ids: selectedProjectIds
    };

    try {
      const res = await fetch(`${baseUrl}/api/agents/sessions/init/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess(data.data.session_id);
        onClose();
      } else {
        alert("创建失败: " + JSON.stringify(data));
      }
    } catch (e) {
      alert("网络错误。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-exo-panel border border-exo-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-exo-border flex items-center justify-between bg-black/20">
          <h3 className="font-bold tracking-widest text-exo-text flex items-center gap-2">
            <Plus size={18} className="text-exo-gold" /> INITIALIZE NODE
          </h3>
          <button onClick={onClose} className="text-exo-muted hover:text-white"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-exo-muted uppercase">Session Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Leave blank for auto-generation..." className="w-full bg-black/50 border border-exo-border rounded-lg px-3 py-2 text-sm text-exo-text outline-none focus:border-exo-gold/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-exo-muted uppercase">Select Agent Core</label>
            <div className="grid grid-cols-1 gap-2">
              {presets.map(preset => (
                <div key={preset.id} onClick={() => { setSelectedPresetId(preset.id); if (preset.agent_type !== 'g045' && selectedProjectIds.length > 1) setSelectedProjectIds([selectedProjectIds[0]]); }}
                  className={`p-3 rounded-lg border cursor-pointer flex justify-between ${parseInt(selectedPresetId) === preset.id ? (preset.agent_type === 'g045' ? 'bg-exo-gold/10 border-exo-gold' : 'bg-white/10 border-white/30') : 'bg-black/30 border-exo-border text-exo-muted'}`}>
                  <div className="flex flex-col">
                    <span className={`text-sm font-bold ${preset.agent_type === 'g045' ? 'text-exo-gold' : 'text-exo-text'}`}>{preset.name}</span>
                    <span className="text-[10px] opacity-70 font-mono">{preset.default_model}</span>
                  </div>
                  {parseInt(selectedPresetId) === preset.id && <Check size={16} className={preset.agent_type === 'g045' ? 'text-exo-gold' : 'text-white'} />}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-exo-muted uppercase flex justify-between">
              <span>Bind Projects</span><span className="text-[10px] text-exo-gold/70">{isG045 ? 'Cross-Project Allowed' : 'Single Node Lock'}</span>
            </label>
            <div className="max-h-32 overflow-y-auto border border-exo-border rounded-lg bg-black/30 p-1 space-y-1">
              {projects.map(proj => {
                const isSelected = selectedProjectIds.includes(proj.id);
                return (
                  <div key={proj.id} onClick={() => toggleProject(proj.id)} className={`px-3 py-2 rounded text-xs cursor-pointer flex justify-between items-center ${isSelected ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-exo-muted border-transparent'}`}>
                    <div className="flex items-center gap-2"><Folder size={12}/> {proj.name}</div>
                    {isSelected && <Check size={12}/>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-exo-border flex justify-end gap-3 bg-black/40">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-medium text-exo-muted hover:text-white">CANCEL</button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="px-6 py-2 rounded-lg text-xs font-bold bg-exo-gold text-black hover:bg-yellow-400 disabled:opacity-50 flex items-center gap-2">
            {isSubmitting ? <Activity size={14} className="animate-spin" /> : <Plus size={14} />} INITIALIZE
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 侧边导航栏
// ==========================================
const Sidebar = ({ currentTab, setCurrentTab, showConvList, setShowConvList }) => (
  <div className="w-12 md:w-16 h-full bg-exo-panel border-r border-exo-border flex flex-col items-center justify-between py-4 md:py-6 z-50 flex-shrink-0">
    <div className="flex flex-col space-y-4 md:space-y-6">
      <div className="p-1.5 md:p-2 bg-exo-bg rounded-lg border border-exo-gold/30 cursor-pointer text-exo-gold"><Hexagon size={20} /></div>
      <NavIcon icon={MessageSquare} isActive={currentTab === 'chat'} onClick={() => { setCurrentTab('chat'); setShowConvList(true); }} />
      <NavIcon icon={BrainCircuit} isActive={currentTab === 'agent_hub'} onClick={() => { setCurrentTab('agent_hub'); setShowConvList(false); }} />
      <NavIcon icon={User} isActive={currentTab === 'profile'} onClick={() => { setCurrentTab('profile'); setShowConvList(false); }} />
    </div>
    <div className="hidden md:flex flex-col space-y-6">
      <NavIcon icon={Settings} isActive={currentTab === 'settings'} onClick={() => setCurrentTab('settings')} />
      <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Elysia" className="w-10 h-10 rounded-full border border-exo-border" alt="User" />
    </div>
  </div>
);
const NavIcon = ({ icon: Icon, isActive, onClick }) => (
  <button onClick={onClick} className={`p-2 rounded-lg transition-all ${isActive ? 'text-exo-gold bg-exo-gold/10' : 'text-exo-muted hover:text-exo-text hover:bg-white/5'}`}><Icon size={22} /></button>
);

// ==========================================
// 改造：动态会话列表
// ==========================================
const ConversationList = ({ activeSessionId, setActiveSessionId, projects, refreshKey, openDestructor, openNewSession, activeFileProjectId, setActiveFileProjectId, showConvList, onClose }) => {
  const [conversations, setConversations] = useState([]);
  const [expandedProjects, setExpandedProjects] = useState(new Set());
  const [activeMenuId, setActiveMenuId] = useState(null);

  useEffect(() => {
    console.log("Fetching conversations from:", `${baseUrl}/api/agents/conversations/`);
    fetch(`${baseUrl}/api/agents/conversations/`, { credentials: 'include' })
      .then(res => {
        console.log("Conversations Response Status:", res.status);
        return res.json();
      })
      .then(data => {
        console.log("Conversations Data Recv:", data);
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
                      onClick={() => {
                        setActiveFileProjectId(proj.id);
                        setActiveSessionId(null); // 点文件时，取消会话的选中高亮
                      }}
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

// ==========================================
// 消息气泡 — memo 隔离，避免历史消息随流式输出重渲染
// ==========================================
const MessageBubble = React.memo(({ msg }) => (
  <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start gap-4'}`}>
    {msg.role !== 'user' && <img src="https://api.dicebear.com/7.x/bottts/svg?seed=G045" className="w-8 h-8 rounded-md border border-exo-gold/50 bg-black mt-1" alt="AI" />}
    <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-exo-panel border border-exo-border rounded-2xl rounded-tr-sm p-4 text-sm text-exo-text' : 'space-y-2'}`}>
      {msg.role !== 'user' && msg.reasoning_steps && msg.reasoning_steps.map((step, sIdx) => <div key={sIdx} className="text-[11px] text-exo-gold/70 bg-exo-gold/5 px-2 py-1 rounded">{step}</div>)}
      {msg.role !== 'user' && msg.reasoning_content && (
        <details className="bg-[#121215] border border-exo-border rounded-lg text-xs text-exo-muted cursor-pointer mb-2">
          <summary className="p-2 flex items-center gap-2">Thinking Process</summary>
          <div className="p-3 border-t border-exo-border bg-black/50 whitespace-pre-wrap font-mono">{msg.reasoning_content}</div>
        </details>
      )}
      <div className={msg.role === 'user' ? 'whitespace-pre-wrap' : 'prose prose-invert prose-sm max-w-none'}>
        {msg.role === 'user' ? msg.content : <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>{msg.content}</ReactMarkdown>}
      </div>
    </div>
  </div>
));

// ==========================================
// ChatArea
// ==========================================
const MSGS_PER_PAGE = 40;

const ChatArea = ({ activeSessionId, setShowConvList }) => {
  const [messages, setMessages] = useState([]);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [thinkingLevel, setThinkingLevel] = useState("auto");
  const [temperature, setTemperature] = useState("1.0");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const allHistoryRef = useRef([]);   // 完整历史，不参与渲染
  const visibleStartRef = useRef(0);  // 当前可见窗口在 allHistory 中的起始索引
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const topSentinelRef = useRef(null);

  const scrollToBottom = (smooth = true) =>
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });

  // 只有用户在接近底部时才自动跟随，避免往上翻看时被强制拉回
  const isNearBottom = () => {
    const c = scrollContainerRef.current;
    if (!c) return true;
    return c.scrollHeight - c.scrollTop - c.clientHeight < 120;
  };

  useEffect(() => {
    if (!activeSessionId) return;
    allHistoryRef.current = [];
    visibleStartRef.current = 0;
    setMessages([]);
    setHasMore(false);
    fetch(`${baseUrl}/api/agents/chat/${activeSessionId}/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        allHistoryRef.current = data;
        const startIdx = Math.max(0, data.length - MSGS_PER_PAGE);
        visibleStartRef.current = startIdx;
        setMessages(data.slice(startIdx));
        setHasMore(startIdx > 0);
        // 等 React 渲染完再滚，否则 DOM 还没更新
        requestAnimationFrame(() => scrollToBottom(false));
      })
      .catch(err => console.error("获取失败:", err));
  }, [activeSessionId]);

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    setIsLoadingMore(true);
    const prevScrollHeight = container.scrollHeight;
    const currentStart = visibleStartRef.current;
    const newStart = Math.max(0, currentStart - MSGS_PER_PAGE);
    const older = allHistoryRef.current.slice(newStart, currentStart);
    visibleStartRef.current = newStart;
    setMessages(prev => [...older, ...prev]);
    setHasMore(newStart > 0);
    requestAnimationFrame(() => {
      if (container) container.scrollTop = container.scrollHeight - prevScrollHeight;
      setIsLoadingMore(false);
    });
  }, [isLoadingMore, hasMore]);

  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { root: container, threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const handleSend = async () => {
    if ((!inputValue.trim() && attachedFiles.length === 0) || isGenerating) return;
    const userMsg = { role: 'user', content: inputValue };
    const aiMsg = { id: Date.now(), role: 'assistant', content: '', reasoning_content: '', reasoning_steps: [], new_anchors: [] };
    allHistoryRef.current = [...allHistoryRef.current, userMsg, aiMsg];
    setMessages(prev => [...prev, userMsg, aiMsg]);

    const currentInput = inputValue; const currentFiles = [...attachedFiles];
    setInputValue(""); setAttachedFiles([]); setIsGenerating(true); scrollToBottom(true);

    try {
      let response;
      if (currentFiles.length > 0) {
        const formData = new FormData(); formData.append('content', currentInput);
        currentFiles.forEach(f => formData.append('files', f));
        response = await fetch(`${baseUrl}/api/agents/chat/${activeSessionId}/`, { method: 'POST', body: formData, credentials: 'include' });
      } else {
        response = await fetch(`${baseUrl}/api/agents/chat/${activeSessionId}/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: currentInput }), credentials: 'include' });
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n'); buffer = blocks.pop();

        for (const block of blocks) {
          const lines = block.split('\n');
          let eventType = 'message'; let dataStr = '';
          for (const line of lines) {
            if (line.startsWith('event:')) eventType = line.substring(6).trim();
            else if (line.startsWith('data:')) dataStr += line.substring(5).trim();
          }
          if (!dataStr || eventType === 'done' || dataStr === '[DONE]') continue;

          // SSE 解析增强：尝试解析 JSON 以自动处理引号和转义字符
          let text = dataStr;
          try {
            // 如果 dataStr 是由 json.dumps 生成的，它会是一个带引号的 JSON 字符串
            const parsed = JSON.parse(dataStr);
            if (typeof parsed === 'string') {
              text = parsed;
            } else {
              // 如果解析出来是对象（虽然不常见），则维持原样或按需处理
              text = dataStr.replace(/\\n/g, '\n');
            }
          } catch (e) {
            // 解析失败（说明不是标准 JSON 字符串），回退到手动替换换行符
            text = dataStr.replace(/\\n/g, '\n');
          }

          setMessages(prev => {
            const newMsgs = [...prev];
            const lastMsg = { ...newMsgs[newMsgs.length - 1] };
            newMsgs[newMsgs.length - 1] = lastMsg;
            if (eventType === 'reasoning') {
              const steps = [...(lastMsg.reasoning_steps || [])];
              if (steps[steps.length - 1] !== text) steps.push(text);
              lastMsg.reasoning_steps = steps;
            } else if (eventType === 'thinking') {
              lastMsg.reasoning_content = (lastMsg.reasoning_content || '') + text;
            } else if (eventType === 'content') {
              lastMsg.content = (lastMsg.content || '') + text;
            } else if (eventType === 'anchor_created') {
              try { lastMsg.new_anchors = [...(lastMsg.new_anchors || []), JSON.parse(text)]; } catch(e) {}
            }
            allHistoryRef.current[allHistoryRef.current.length - 1] = lastMsg;
            return newMsgs;
          });
        }
        // 吸附底部：只在用户本来就在底部时才跟随滚动
        if (isNearBottom()) scrollToBottom(false);
      }
    } catch (err) { console.error("中断:", err); } finally { setIsGenerating(false); }
  };

  return (
    <div className="flex-1 min-w-0 flex flex-col h-full bg-exo-bg relative">
      <div className="h-14 border-b border-exo-border flex items-center justify-between px-4 md:px-6 bg-exo-panel/50 backdrop-blur-md">
        <div className="flex items-center gap-2 md:gap-3">
          <button 
            onClick={() => setShowConvList(true)}
            className="md:hidden p-1.5 rounded-lg text-exo-muted hover:bg-white/5"
          >
            <Menu size={20} />
          </button>
          <div className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-exo-gold animate-pulse' : 'bg-green-500'}`}></div>
          <span className="font-semibold text-exo-text">Session #{activeSessionId}</span>
        </div>
      </div>
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 space-y-6">
        <div ref={topSentinelRef} className="h-px" />
        {isLoadingMore && (
          <div className="flex justify-center py-3">
            <span className="text-xs text-exo-muted flex items-center gap-2 animate-pulse">
              <RefreshCw size={12} className="animate-spin" /> 加载历史记录...
            </span>
          </div>
        )}
        {messages.map((msg, idx) => (
          <MessageBubble key={msg.id || idx} msg={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-exo-border bg-exo-bg flex flex-col gap-2">
        <div className="flex items-end gap-2 bg-exo-panel border border-exo-border rounded-xl p-2 focus-within:border-exo-gold/50">
          <textarea rows="1" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); handleSend(); } }} placeholder="与核心通讯 (Ctrl+Enter 发送)..." className="flex-1 bg-transparent text-sm text-exo-text outline-none resize-none py-2 disabled:opacity-50" disabled={isGenerating}></textarea>
          <button onClick={handleSend} disabled={isGenerating || !inputValue.trim()} className="p-2 bg-exo-gold text-black rounded-lg hover:bg-yellow-400 disabled:opacity-50"><Send size={18} /></button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 核心组件：项目文件控制台 (Project Files Dashboard)
// ==========================================
const ProjectFilesArea = ({ projectId, projects, openDestructor }) => {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const project = projects.find(p => p.id === projectId);

  const fetchFiles = () => {
    fetch(`${baseUrl}/api/core/projects/${projectId}/files/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setFiles(data))
      .catch(err => console.error("文件拉取失败", err));
  };

  useEffect(() => {
    if (projectId) fetchFiles();
  }, [projectId]);

  const handleFileUpload = async (e) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    // 假设后端接口接受 'file' 字段用于上传
    Array.from(selectedFiles).forEach(file => formData.append('file', file));

    try {
      // 请根据你的实际 Django 上传路由调整，这里假设是 POST 到文件列表接口
      const res = await fetch(`${baseUrl}/api/core/projects/${projectId}/files/`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      if (res.ok) {
        fetchFiles(); // 刷新列表
      } else {
        alert("上传失败，请检查后端接口。");
      }
    } catch (err) {
      console.error("上传异常:", err);
    } finally {
      setIsUploading(false);
      e.target.value = ''; // 清空 input
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-exo-bg relative">
      {/* 头部信息 */}
      <div className="h-14 border-b border-exo-border flex items-center justify-between px-6 bg-exo-panel/50 backdrop-blur-md">
        <div className="flex items-center gap-3 text-exo-text">
          <HardDrive size={18} className="text-blue-400" />
          <span className="font-semibold tracking-widest uppercase">DATABANK // {project?.name || 'UNKNOWN_PROJECT'}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchFiles} className="p-2 text-exo-muted hover:text-white transition-colors" title="Sync">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* 上传拖拽区 */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${
              isUploading ? 'border-blue-500 bg-blue-500/10' : 'border-exo-border bg-exo-panel hover:border-exo-gold/50 hover:bg-white/5'
            }`}
          >
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple className="hidden" />
            {isUploading ? (
              <Activity size={32} className="text-blue-400 animate-pulse mb-3" />
            ) : (
              <UploadCloud size={32} className="text-exo-muted mb-3" />
            )}
            <p className="text-sm font-bold text-exo-text">
              {isUploading ? 'UPLOADING DATA TO CORE...' : 'Click or Drag files to inject into Project Memory'}
            </p>
            <p className="text-xs text-exo-muted mt-2">Supports PDF, Markdown, Images, and Text Arrays.</p>
          </div>

          {/* 文件列表区 */}
          <div>
            <h3 className="text-sm font-bold text-exo-text mb-4 border-b border-exo-border pb-2 flex items-center gap-2">
              <FileBox size={16} /> INDEXED FRAGMENTS ({files.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {files.map(file => (
                <div key={file.id} className="bg-[#121318] border border-exo-border rounded-lg p-4 flex flex-col justify-between group hover:border-exo-gold/30 transition-all">
                  <div className="flex items-start gap-3 mb-4">
                    {/* 根据来源不同显示不同颜色的图标 */}
                    <div className={`p-2 rounded bg-opacity-10 mt-1 ${file.source === 'obsidian_sync' ? 'bg-purple-500 text-purple-400' : 'bg-blue-500 text-blue-400'}`}>
                      <FileText size={18} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-bold text-exo-text truncate" title={file.name}>{file.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] uppercase font-mono text-exo-muted bg-black px-1.5 py-0.5 rounded border border-exo-border">
                          {file.source === 'obsidian_sync' ? 'OBSIDIAN' : 'MANUAL'}
                        </span>
                        <span className="text-[10px] text-exo-muted font-mono">{formatBytes(file.size)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-exo-border/50 pt-3">
                    <button
                      onClick={() => alert(`将在此处预览或下载文件: ${file.preview_url || file.url || '暂无链接'}`)}
                      className="text-xs text-exo-muted hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      VIEW
                    </button>
                    <button
                      onClick={() => {
                        if (file.source === 'obsidian_sync') {
                          alert("System Notice: Obsidian 同步文件由本地知识库管理，请在 Obsidian 客户端内删除。");
                          return;
                        }
                        openDestructor({
                          title: `Target: [${file.name}]`,
                          description: "此操作将永久从项目库中抹除该文件，切断所有相关的向量链接。",
                          onArchive: () => alert("文件只能彻底删除，不支持归档。"),
                          onDelete: async () => {
                            await fetch(`${baseUrl}/api/core/projects/${projectId}/files/${file.id}/`, { method: 'DELETE', credentials: 'include' });
                            fetchFiles();
                          }
                        });
                      }}
                      className="text-xs text-red-500/70 hover:text-red-400 px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors"
                    >
                      PURGE
                    </button>
                  </div>
                </div>
              ))}

              {files.length === 0 && (
                <div className="col-span-full py-10 text-center text-exo-muted text-sm font-mono border border-dashed border-exo-border rounded-lg">
                  [ DATABANK EMPTY ]
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// ==========================================
// 其它组件 (占位)
// ==========================================
const UserProfile = () => <div className="flex-1 text-center text-white p-10">Profile 暂缓开发...</div>;
// ==========================================
// 子组件：G045 动态记忆锚点滚动指示器 (Memory Anchor Ticker)
// ==========================================
const MemoryAnchorTicker = ({ presetId }) => {
  const [anchors, setAnchors] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFading, setIsFading] = useState(true);

  useEffect(() => {
    fetch(`${baseUrl}/api/agents/presets/${presetId}/anchors/snapshot/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) setAnchors(data);
      })
      .catch(err => console.error("锚点拉取失败", err));
  }, [presetId]);

  // 轮播动画控制 (每 4 秒切换一次，带淡入淡出)
  useEffect(() => {
    if (anchors.length <= 1) return;
    const timer = setInterval(() => {
      setIsFading(false); // 触发淡出
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % anchors.length);
        setIsFading(true); // 切换数据后触发淡入
      }, 400); // 等待 400ms 淡出动画完成
    }, 8000);
    return () => clearInterval(timer);
  }, [anchors.length]);

  if (anchors.length === 0) {
    return (
      <div className="h-16 flex items-center justify-center border border-dashed border-exo-border rounded-lg bg-black/20 text-xs text-exo-muted font-mono">
        <Activity size={12} className="mr-2 animate-pulse" /> Scanning Core Memories... [NULL]
      </div>
    );
  }

  const currentAnchor = anchors[currentIndex];

  return (
    <div className="relative h-[72px] overflow-hidden rounded-lg bg-[#0d0e12] border border-exo-border p-3 flex flex-col justify-center shadow-inner">
      <div className={`transition-all duration-400 transform ${isFading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
        <div className="flex justify-between items-start mb-1">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded transition-colors ${
              currentAnchor.is_persistent 
                ? 'bg-exo-gold/20 text-exo-gold border border-exo-gold/50 shadow-[0_0_10px_rgba(255,215,0,0.3)]' 
                : 'bg-white/5 text-gray-300 border border-white/10'
            }`}>
              /{currentAnchor.pattern}/
            </span>
            {currentAnchor.is_persistent && <ShieldAlert size={12} className="text-exo-gold drop-shadow-[0_0_5px_rgba(255,215,0,0.8)]" title="Persistent Anchor" />}
          </div>
          <span className="text-[10px] text-exo-muted font-mono bg-black px-1 rounded border border-exo-border">
            WT: {currentAnchor.current_weight.toFixed(2)}
          </span>
        </div>
        <p className="text-[11px] text-gray-400 truncate mt-1.5">{currentAnchor.essential_note}</p>
      </div>
    </div>
  );
};


// ==========================================
// 主组件：Agent Hub (预设管理与状态监控)
// ==========================================
const AgentManager = ({ openNewSession, openDestructor, setCurrentTab }) => {
  const [presets, setPresets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${baseUrl}/api/agents/presets/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setPresets(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Presets 拉取失败", err);
        setIsLoading(false);
      });
  }, []);

  const g045Presets = presets.filter(p => p.agent_type === 'g045');
  const standardPresets = presets.filter(p => p.agent_type !== 'g045');

  const AgentCard = ({ preset, isG045 }) => (
    <div className={`relative flex flex-col p-5 rounded-xl border transition-all hover:bg-white/[0.02] ${
      isG045 
        ? 'bg-gradient-to-br from-exo-gold/5 to-transparent border-exo-gold/30 shadow-[0_4px_20px_rgba(255,215,0,0.03)]' 
        : 'bg-exo-panel border-exo-border'
    }`}>
      {/* 头部信息 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="cursor-grab text-exo-muted hover:text-white"><GripVertical size={16} /></div>
          <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${preset.name}`} className={`w-12 h-12 rounded-lg border bg-black ${isG045 ? 'border-exo-gold/50' : 'border-exo-border'}`} alt="Avatar" />
          <div>
            <h3 className={`text-base font-bold flex items-center gap-2 ${isG045 ? 'text-exo-gold' : 'text-exo-text'}`}>
              {preset.name}
              {isG045 && <Sparkles size={14} className="text-exo-gold animate-pulse" />}
            </h3>
            <p className="text-xs text-exo-muted font-mono mt-0.5">{preset.default_model}</p>
          </div>
        </div>

        {/* 操作区 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => alert(`将打开 ${preset.name} 的配置表单 (待后续迭代)`)}
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

      {/* G045 专属特效：活跃锚点滚动条 */}
      {isG045 && (
        <div className="mt-auto pt-4 border-t border-exo-gold/10">
          <div className="text-[10px] font-bold text-exo-gold/70 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Clock size={12} /> Active Memory Stream
          </div>
          <MemoryAnchorTicker presetId={preset.id} />
        </div>
      )}
    </div>
  );

  return (
    <div className="flex-1 h-full overflow-y-auto bg-exo-bg p-8 scrollbar-hide">
      <div className="max-w-5xl mx-auto space-y-10">
        <div>
          <h2 className="text-3xl font-black text-exo-text mb-2 flex items-center gap-3">
            <BrainCircuit className="text-exo-gold" size={28} /> Central Agent Hub
          </h2>
          <p className="text-exo-muted text-sm">管理系统代理核心预设。配置模型、提示词，并监控高级核心的记忆活动。</p>
        </div>

        {/* G045 Superior 区域 */}
        {g045Presets.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-exo-gold/20 pb-2">
              <Cpu size={16} className="text-exo-gold" />
              <h3 className="text-sm font-bold text-exo-gold uppercase tracking-widest">Superior Cores (G045)</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {g045Presets.map(p => <AgentCard key={p.id} preset={p} isG045={true} />)}
            </div>
          </div>
        )}

        {/* Standard Nodes 区域 */}
        {standardPresets.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-exo-border pb-2 mt-8">
              <Hash size={16} className="text-exo-muted" />
              <h3 className="text-sm font-bold text-exo-muted uppercase tracking-widest">Standard Modules</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {standardPresets.map(p => <AgentCard key={p.id} preset={p} isG045={false} />)}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// ==========================================
// App 根组件 (完整状态与 Modals)
// ==========================================
export default function App() {
  const [currentTab, setCurrentTab] = useState('chat');
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [projects, setProjects] = useState([]);
  const [activeFileProjectId, setActiveFileProjectId] = useState(null);
  const [showConvList, setShowConvList] = useState(false);

  useEffect(() => {
    fetch(`${baseUrl}/api/core/projects/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setProjects(data))
      .catch(err => console.error("项目加载失败", err));
  }, []);

  const [destructorConfig, setDestructorConfig] = useState({ isOpen: false });
  const openDestructor = (config) => setDestructorConfig({ ...config, isOpen: true });

  const [newSessionConfig, setNewSessionConfig] = useState({ isOpen: false, initialContext: null });
  const openNewSession = (initialContext = null) => setNewSessionConfig({ isOpen: true, initialContext });

  return (
    <div className="w-full h-[100dvh] bg-exo-bg text-exo-text font-sans flex flex-row overflow-hidden">

      <DestructorModal {...destructorConfig} onClose={() => setDestructorConfig(p => ({...p, isOpen:false}))} />

      <NewSessionModal
        isOpen={newSessionConfig.isOpen}
        onClose={() => setNewSessionConfig(p => ({...p, isOpen:false}))}
        projects={projects}
        initialContext={newSessionConfig.initialContext}
        onSuccess={(newSessionId) => {
          setRefreshKey(prev => prev + 1);
          setActiveSessionId(newSessionId);
        }}
      />

      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} showConvList={showConvList} setShowConvList={setShowConvList} />

      {currentTab === 'chat' && (
        <div className="flex flex-1 min-w-0 h-full flex-row relative">
          <ConversationList
              activeSessionId={activeSessionId}
              setActiveSessionId={(id) => { setActiveSessionId(id); setShowConvList(false); }}
              projects={projects} refreshKey={refreshKey}
              openDestructor={openDestructor}
              openNewSession={openNewSession}
              activeFileProjectId={activeFileProjectId}
              setActiveFileProjectId={setActiveFileProjectId}
              showConvList={showConvList}
              onClose={() => setShowConvList(false)}
          />
          {activeFileProjectId ? (
            <ProjectFilesArea projectId={activeFileProjectId} projects={projects} openDestructor={openDestructor} />
          ) : activeSessionId ? (
            <ChatArea activeSessionId={activeSessionId} setShowConvList={setShowConvList} />
          ) : (
            <div className="flex-1 min-w-0 flex flex-col items-center justify-center bg-exo-bg gap-4 text-center p-8">
              <Hexagon size={44} className="text-exo-gold/20" />
              <p className="text-exo-muted text-sm">从列表中选择或新建一个会话</p>
              <button onClick={() => setShowConvList(true)} className="md:hidden mt-1 px-4 py-2 text-xs text-exo-gold border border-exo-gold/30 rounded-lg hover:bg-exo-gold/10 flex items-center gap-2">
                <MessageSquare size={14} /> 打开会话列表
              </button>
            </div>
          )}
        </div>
      )}

      {currentTab === 'agent_hub' && (
        <AgentManager
          openNewSession={openNewSession}
          openDestructor={openDestructor}
          setCurrentTab={setCurrentTab}
        />
      )}
      {currentTab === 'profile' && <UserProfile />}
    </div>
  );
}