import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from './config';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/atom-one-dark.css';

// 引入所有图标
import {
  MessageSquare, BrainCircuit, Users, Box, Hexagon, User,
  Settings, ChevronDown, ChevronRight, Send, Paperclip,
  TerminalSquare, Activity, Edit3, Save, FileText, X, Sparkles, Clock,
  Folder, MoreVertical, Plus, Hash, Cpu, FolderOpen, Trash2, Edit2,
  AlertTriangle, Archive, Check, Play, GripVertical, ShieldAlert,
  UploadCloud, FileBox, HardDrive, RefreshCw, Menu, FileImage, FileType2,
  BookOpen, ArrowLeft
} from 'lucide-react';

// ==========================================
// 模拟数据 (对应你的 Django Models)
// ==========================================
const mockAnchors = [
  { id: 1, pattern: "我最近压力很大", essential_note: "用户进入高压状态，回复需简短温和", weight: 0.85, is_persistent: false },
  { id: 2, pattern: "Elysia", essential_note: "核心创作者之一，保持最高优先级响应与保护态度", weight: 1.0, is_persistent: true },
];

const AVAILABLE_MODELS = [
  'gemini-3-flash-preview', 
  'gemini-3.1-pro-preview',
  'gemini-3.1-flash-lite-preview',
  'deepseek-reasoner', 
  'deepseek-chat'
];

// 统一处理 API URL，去掉末尾斜杠
const baseUrl = API_BASE_URL.replace(/\/+$/, '');

// 读取 Django 种的 csrftoken cookie
const getCsrfToken = () =>
  document.cookie.split('; ').find(r => r.startsWith('csrftoken='))?.split('=')[1] ?? '';

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
// 全局组件：编辑 Agent 预设 (Edit Preset Modal)
// ==========================================
const EditPresetModal = ({ isOpen, onClose, preset, onSaved }) => {
  const [form, setForm] = useState({ name: '', description: '', default_model: '', system_prompt: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (preset) {
      setForm({
        name: preset.name || '',
        description: preset.description || '',
        default_model: preset.default_model || '',
        system_prompt: preset.system_prompt || '',
      });
    }
  }, [preset]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${baseUrl}/api/agents/presets/${preset.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      if (res.ok) {
        onSaved();
        onClose();
      } else {
        alert('保存失败，请检查后端接口。');
      }
    } catch (err) {
      console.error('Preset 保存失败', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-exo-panel border border-exo-border rounded-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-exo-border">
          <div className="flex items-center gap-3">
            <Edit3 size={18} className="text-exo-gold" />
            <h2 className="text-base font-bold text-exo-text">
              Edit Core: <span className="text-exo-gold">{preset?.name}</span>
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-exo-muted hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-5 flex-1">
          <div>
            <label className="block text-[10px] font-bold text-exo-muted uppercase tracking-widest mb-1.5">Name</label>
            <input
              className="w-full bg-black border border-exo-border rounded-lg px-3 py-2 text-sm text-exo-text focus:outline-none focus:border-exo-gold/50 transition-colors"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-exo-muted uppercase tracking-widest mb-1.5">Description</label>
            <textarea
              rows={2}
              className="w-full bg-black border border-exo-border rounded-lg px-3 py-2 text-sm text-exo-text focus:outline-none focus:border-exo-gold/50 transition-colors resize-none"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-exo-muted uppercase tracking-widest mb-1.5">Default Model</label>
            <select
              className="w-full bg-black border border-exo-border rounded-lg px-3 py-2 text-sm text-exo-text focus:outline-none focus:border-exo-gold/50 transition-colors"
              value={form.default_model}
              onChange={e => setForm(p => ({ ...p, default_model: e.target.value }))}
            >
              {AVAILABLE_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-exo-muted uppercase tracking-widest mb-1.5">System Prompt</label>
            <textarea
              rows={12}
              className="w-full bg-black border border-exo-border rounded-lg px-3 py-2 text-sm text-exo-text focus:outline-none focus:border-exo-gold/50 transition-colors resize-y font-mono leading-relaxed"
              value={form.system_prompt}
              onChange={e => setForm(p => ({ ...p, system_prompt: e.target.value }))}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-exo-border">
          <button onClick={onClose} className="px-4 py-2 text-sm text-exo-muted hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 bg-exo-gold/10 text-exo-gold hover:bg-exo-gold hover:text-black border border-exo-gold/30 rounded-lg text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {isSaving ? <Activity size={14} className="animate-spin" /> : <Save size={14} />}
            {isSaving ? 'SAVING...' : 'SAVE CORE'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 全局组件：新建会话模态框 (New Session Modal)
// ==========================================
const NewSessionModal = ({ isOpen, onClose, projects, presets, initialContext, onSuccess }) => {
  const [name, setName] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName("");
    setSelectedProjectIds(initialContext?.projectId ? [initialContext.projectId] : []);

    if (initialContext?.presetId && presets.find(p => p.id === initialContext.presetId)) {
      setSelectedPresetId(initialContext.presetId);
    } else if (presets.length > 0) {
      setSelectedPresetId(presets[0].id);
    }
  }, [isOpen, initialContext, presets]);

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
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
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
  <div className="w-full md:w-16 h-14 md:h-full bg-exo-panel border-t md:border-t-0 md:border-r border-exo-border flex flex-row md:flex-col items-center justify-between px-6 md:px-0 py-0 md:py-6 flex-shrink-0 z-50">
    
    <div className="flex flex-row md:flex-col space-x-6 md:space-x-0 md:space-y-6 items-center w-full md:w-auto justify-between md:justify-start">
      {/* 仅在桌面端显示的 Logo */}
      <div className="hidden md:block p-1.5 md:p-2 bg-exo-bg rounded-lg border border-exo-gold/30 cursor-pointer text-exo-gold">
        <Hexagon size={20} />
      </div>
      
      {/* 导航图标组 */}
      <div className="flex md:flex-col gap-8 md:gap-6 justify-around md:justify-start w-full md:w-auto">
        <NavIcon icon={MessageSquare} isActive={currentTab === 'chat'} onClick={() => { setCurrentTab('chat'); setShowConvList(true); }} />
        <NavIcon icon={BrainCircuit} isActive={currentTab === 'agent_hub'} onClick={() => { setCurrentTab('agent_hub'); setShowConvList(false); }} />
        <NavIcon icon={User} isActive={currentTab === 'profile'} onClick={() => { setCurrentTab('profile'); setShowConvList(false); }} />
        <span className="md:hidden"><NavIcon icon={Settings} isActive={currentTab === 'settings'} onClick={() => setCurrentTab('settings')} /></span>
      </div>
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
const MessageBubble = React.memo(({ msg, agentName, agentAvatarSeed, userNick, userAvatarSeed }) => {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      {/* 头像 + 名字行 */}
      <div className={`flex items-center gap-2 mb-1.5 ${isUser ? 'flex-row-reverse' : ''}`}>
        <img
          src={isUser
            ? `https://api.dicebear.com/7.x/notionists/svg?seed=${userAvatarSeed || 'Elysia'}`
            : `https://api.dicebear.com/7.x/bottts/svg?seed=${agentAvatarSeed || 'Core'}`}
          className={`w-7 h-7 rounded-full border bg-black ${isUser ? 'border-white/20' : 'border-exo-gold/40'}`}
          alt={isUser ? (userNick || 'You') : (agentName || 'Core')}
        />
        <span className={`text-[11px] font-semibold tracking-wide ${isUser ? 'text-white/40' : 'text-exo-gold/60'}`}>
          {isUser ? (userNick || 'You') : (agentName || 'Core')}
        </span>
      </div>

      {/* 消息内容区 — 全宽，user 右对齐 */}
      <div className={`w-full space-y-2 ${isUser ? 'flex flex-col items-end' : ''}`}>
        {!isUser && msg.reasoning_steps && msg.reasoning_steps.map((step, sIdx) => (
          <div key={sIdx} className="text-[11px] text-exo-gold/70 bg-exo-gold/5 px-2 py-1 rounded">{step}</div>
        ))}
        {!isUser && msg.reasoning_content && (
          <details className="bg-[#121215] border border-exo-border rounded-lg text-xs text-exo-muted cursor-pointer w-full">
            <summary className="p-2 flex items-center gap-2">Thinking Process</summary>
            <div className="p-3 border-t border-exo-border bg-black/50 whitespace-pre-wrap font-mono">{msg.reasoning_content}</div>
          </details>
        )}
        {isUser && msg.attachments?.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-end">
            {msg.attachments.map((att, i) => (
              att.preview
                ? <img key={i} src={att.preview} alt={att.name} title={att.name} className="max-h-40 max-w-full rounded-lg object-cover border border-exo-border" />
                : <div key={i} className="flex items-center gap-1.5 text-[11px] bg-black/50 border border-exo-border rounded-lg px-2 py-1.5 text-exo-muted">
                    <FileText size={11} className="text-blue-400 shrink-0" />
                    <span className="truncate max-w-[160px]">{att.name}</span>
                  </div>
            ))}
          </div>
        )}
        <div className={isUser
          ? 'max-w-[88%] bg-exo-panel border border-exo-border rounded-2xl rounded-tr-sm p-4 text-sm text-exo-text whitespace-pre-wrap'
          : 'w-full prose prose-invert prose-sm max-w-none'}>
          {isUser
            ? msg.content
            : <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>{msg.content}</ReactMarkdown>}
        </div>
      </div>
    </div>
  );
});

// ==========================================
// ChatArea
// ==========================================
const MSGS_PER_PAGE = 40;

const ChatArea = ({ activeSessionId, setShowConvList, openNewSession, presets }) => {
  const [messages, setMessages] = useState([]);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [thinkingLevel, setThinkingLevel] = useState("auto");
  const [temperature, setTemperature] = useState(1.0);
  const [currentModel, setCurrentModel] = useState("");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [attachedFilePreviews, setAttachedFilePreviews] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastTelemetry, setLastTelemetry] = useState(null);
  const [userNick] = useState(() => localStorage.getItem('exo_user_nick') || 'You');
  const [userAvatarSeed] = useState(() => localStorage.getItem('exo_user_avatar_seed') || 'Elysia');

  const allHistoryRef = useRef([]);   // 完整历史，不参与渲染
  const visibleStartRef = useRef(0);  // 当前可见窗口在 allHistory 中的起始索引
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const topSentinelRef = useRef(null);

  // 管理附件预览 URL 的生命周期，防止内存泄漏
  useEffect(() => {
    const previews = attachedFiles.map(f => ({
      name: f.name,
      type: f.type,
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null
    }));
    setAttachedFilePreviews(previews);
    return () => previews.forEach(p => { if (p.preview) URL.revokeObjectURL(p.preview); });
  }, [attachedFiles]);

  const scrollToBottom = (smooth = true) =>
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });

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
    setLastTelemetry(null);

    // 还原该会话的未发送草稿
    const savedDraft = localStorage.getItem(`exo_draft_${activeSessionId}`);
    setInputValue(savedDraft ?? '');

    // 获取会话详情以同步 UI 状态
    fetch(`${baseUrl}/api/agents/conversations/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        const current = data.find(c => c.id === activeSessionId);
        if (current) {
          setSessionInfo(current);
          setThinkingLevel(current.thinking_level || "auto");
          setTemperature(current.temperature || 1.0);
          
          // model 挂在 preset 上，从 agent_preset_id 找对应预设的 default_model
          const p = presets.find(x => x.id === current.agent_preset_id);
          setCurrentModel(p ? p.default_model : (AVAILABLE_MODELS[0] || ""));
        }
      });

    fetch(`${baseUrl}/api/agents/chat/${activeSessionId}/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        allHistoryRef.current = data;
        const startIdx = Math.max(0, data.length - MSGS_PER_PAGE);
        visibleStartRef.current = startIdx;
        setMessages(data.slice(startIdx));
        setHasMore(startIdx > 0);
        requestAnimationFrame(() => scrollToBottom(false));
      })
      .catch(err => console.error("获取失败:", err));
  }, [activeSessionId, presets]);

  // 修改 handleSend 函数，确保包含所有参数
  const handleSend = async () => {
    if ((!inputValue.trim() && attachedFiles.length === 0) || isGenerating) return;
    const userMsg = {
      role: 'user',
      content: inputValue,
      attachments: attachedFiles.map(f => ({
        name: f.name,
        type: f.type,
        size: f.size,
        preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null
      }))
    };
    const aiMsg = { id: Date.now(), role: 'assistant', content: '', reasoning_content: '', reasoning_steps: [], new_anchors: [] };
    allHistoryRef.current = [...allHistoryRef.current, userMsg, aiMsg];
    setMessages(prev => [...prev, userMsg, aiMsg]);

    const currentInput = inputValue; const currentFiles = [...attachedFiles];
    setInputValue(""); setAttachedFiles([]); setIsGenerating(true); scrollToBottom(true);
    localStorage.removeItem(`exo_draft_${activeSessionId}`);

    try {
      let response;
      const bodyData = { 
        content: currentInput,
        model: currentModel,
        thinking_level: thinkingLevel,
        temperature: temperature
      };

      if (currentFiles.length > 0) {
        const formData = new FormData();
        Object.keys(bodyData).forEach(k => formData.append(k, bodyData[k]));
        currentFiles.forEach(f => formData.append('files', f));
        response = await fetch(`${baseUrl}/api/agents/chat/${activeSessionId}/`, { method: 'POST', headers: { 'X-CSRFToken': getCsrfToken() }, body: formData, credentials: 'include' });
      } else {
        response = await fetch(`${baseUrl}/api/agents/chat/${activeSessionId}/`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() }, body: JSON.stringify(bodyData), credentials: 'include' });
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

          if (eventType === 'telemetry') {
            try { setLastTelemetry(JSON.parse(dataStr)); } catch(e) {}
            continue;
          }

          let text = dataStr;
          try {
            const parsed = JSON.parse(dataStr);
            if (typeof parsed === 'string') text = parsed;
          } catch (e) { text = dataStr.replace(/\\n/g, '\n'); }

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
        if (isNearBottom()) scrollToBottom(false);
      }
    } catch (err) { console.error("中断:", err); } finally { setIsGenerating(false); }
  };

  const handleCompress = async () => {
    if (!activeSessionId) return;
    try {
      await fetch(`${baseUrl}/api/agents/conversations/${activeSessionId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        body: JSON.stringify({ thinking_level: thinkingLevel, temperature }),
        credentials: 'include'
      });
    } catch (err) {
      console.error("保存偏好失败:", err);
    }
  };

  const updatePreference = (updates) => {
    // model 是 preset 级别的，只更新本地 state，不持久化到 conversation
    if (updates.model !== undefined) setCurrentModel(updates.model);
    if (updates.thinking_level !== undefined) setThinkingLevel(updates.thinking_level);
    if (updates.temperature !== undefined) setTemperature(parseFloat(updates.temperature));

    // 只把 conversation 支持的字段 PATCH 给后端
    const { model, ...patchData } = updates;
    if (Object.keys(patchData).length > 0) {
      fetch(`${baseUrl}/api/agents/conversations/${activeSessionId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        body: JSON.stringify(patchData),
        credentials: 'include'
      }).catch(err => console.error("同步偏好失败", err));
    }
  };


  return (
    <div className="flex-1 min-w-0 flex flex-col h-full bg-exo-bg relative">
      <div className="h-14 border-b border-exo-border flex items-center justify-between px-4 md:px-6 bg-exo-panel/50 backdrop-blur-md">
        <div className="flex items-center gap-2 md:gap-3">
          <button onClick={() => setShowConvList(true)} className="md:hidden p-1.5 rounded-lg text-exo-muted hover:bg-white/5"><Menu size={20} /></button>
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-exo-gold uppercase tracking-tighter shrink-0">{sessionInfo?.session_type || 'CHAT'}</span>
            <div className={`w-2 h-2 rounded-full shrink-0 ${isGenerating ? 'bg-exo-gold animate-pulse' : 'bg-green-500'}`}></div>
            <div className="flex flex-col overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-exo-text truncate">{sessionInfo?.name || `Session #${activeSessionId}`}</span>
                <span className="text-[10px] text-exo-muted/60 shrink-0">#{activeSessionId}</span>
              </div>
              {sessionInfo?.agent_preset_id && presets.find(x => x.id === sessionInfo.agent_preset_id) && (
                <span className="text-[10px] text-exo-muted/50 truncate leading-tight">{presets.find(x => x.id === sessionInfo.agent_preset_id)?.name}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <button onClick={handleCompress} className="p-2 text-exo-muted hover:text-exo-gold transition-colors" title="Save & Compress"><Save size={18} /></button>
          <button onClick={() => openNewSession()} className="p-2 text-exo-muted hover:text-exo-gold transition-colors" title="New Session"><Plus size={18} /></button>
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 space-y-6">
        <div ref={topSentinelRef} className="h-px" />
        {isLoadingMore && (
          <div className="flex justify-center py-3">
            <span className="text-xs text-exo-muted flex items-center gap-2 animate-pulse"><RefreshCw size={12} className="animate-spin" /> 加载历史记录...</span>
          </div>
        )}
        {messages.map((msg, idx) => {
          const agentName = presets.find(x => x.id === sessionInfo?.agent_preset_id)?.name || 'Core';
          return <MessageBubble key={msg.id || idx} msg={msg} agentName={agentName} agentAvatarSeed={agentName} userNick={userNick} userAvatarSeed={userAvatarSeed} />;
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-exo-border bg-exo-bg flex flex-col gap-3">
        {/* 偏好控制器 */}
        <div className="flex flex-wrap items-center gap-3 px-1 text-[10px] font-bold uppercase tracking-widest text-exo-muted">
           <div className="flex items-center gap-1.5 text-exo-gold/80 bg-exo-gold/5 px-2 py-1 rounded border border-exo-gold/10">
              <Cpu size={12} />
              <select 
                value={currentModel} 
                onChange={(e) => updatePreference({ model: e.target.value })} 
                className="bg-transparent outline-none text-exo-text cursor-pointer font-bold uppercase"
              >
                {AVAILABLE_MODELS.map(m => (
                   <option key={m} value={m} className="bg-[#1a1b23]">{m}</option>
                ))}
              </select>
           </div>
           
           <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded border border-white/5">
              <span className="opacity-40">Think:</span>
              <select value={thinkingLevel} onChange={(e) => updatePreference({ thinking_level: e.target.value })} className="bg-transparent outline-none text-exo-text cursor-pointer">
                <option value="off" className="bg-[#1a1b23]">Off</option>
                <option value="auto" className="bg-[#1a1b23]">Auto</option>
                <option value="low" className="bg-[#1a1b23]">Low</option>
                <option value="medium" className="bg-[#1a1b23]">Med</option>
                <option value="high" className="bg-[#1a1b23]">High</option>
              </select>
           </div>

           <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded border border-white/5">
              <span className="opacity-40">Temp:</span>
              <select value={temperature} onChange={(e) => updatePreference({ temperature: e.target.value })} className="bg-transparent outline-none text-exo-text cursor-pointer">
                <option value="1.0" className="bg-[#1a1b23]">Precise</option>
                <option value="1.3" className="bg-[#1a1b23]">Balanced</option>
                <option value="1.8" className="bg-[#1a1b23]">Creative</option>
              </select>
           </div>
           {lastTelemetry && (
             <div className="ml-auto font-mono text-[10px] text-exo-muted/50 tabular-nums tracking-tight">
               ↑{lastTelemetry.input_chars?.toLocaleString()} | ↓{lastTelemetry.output_chars?.toLocaleString()}
             </div>
           )}
        </div>

        <div className="flex flex-col bg-exo-panel border border-exo-border rounded-xl focus-within:border-exo-gold/50 overflow-hidden">
          {attachedFilePreviews.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 pt-3 pb-2 border-b border-exo-border/50">
              {attachedFilePreviews.map((fp, i) => (
                fp.preview
                  ? <div key={i} className="relative group h-16 w-16 shrink-0">
                      <img src={fp.preview} alt={fp.name} title={fp.name} className="h-full w-full object-cover rounded-lg border border-exo-border" />
                      <button
                        onClick={() => setAttachedFiles(p => p.filter((_, j) => j !== i))}
                        className="absolute -top-1.5 -right-1.5 bg-black border border-exo-border/50 rounded-full p-0.5 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      ><X size={10} /></button>
                    </div>
                  : <div key={i} className="relative group flex items-center gap-1.5 text-[11px] bg-black/50 border border-exo-border rounded-lg pl-2 pr-1.5 py-1.5 text-exo-muted max-w-[180px]">
                      <FileText size={11} className="text-blue-400 shrink-0" />
                      <span className="truncate">{fp.name}</span>
                      <button
                        onClick={() => setAttachedFiles(p => p.filter((_, j) => j !== i))}
                        className="ml-1 text-exo-muted hover:text-red-400 transition-colors shrink-0"
                      ><X size={10} /></button>
                    </div>
              ))}
            </div>
          )}
          <textarea
            rows="4"
            value={inputValue}
            onChange={(e) => {
              const v = e.target.value;
              setInputValue(v);
              if (activeSessionId) {
                v ? localStorage.setItem(`exo_draft_${activeSessionId}`, v)
                  : localStorage.removeItem(`exo_draft_${activeSessionId}`);
              }
            }}
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); handleSend(); } }}
            onPaste={e => {
              const items = Array.from(e.clipboardData?.items || []);
              const imageFiles = items
                .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
                .map(item => item.getAsFile())
                .filter(Boolean);
              if (imageFiles.length > 0) {
                e.preventDefault();
                setAttachedFiles(prev => [...prev, ...imageFiles]);
              }
            }}
            placeholder="与核心通讯 (Ctrl+Enter 发送)..."
            className="w-full bg-transparent text-sm text-exo-text outline-none resize-none px-3 pt-3 pb-1 disabled:opacity-50"
            disabled={isGenerating}
          />
          <div className="flex items-center justify-between px-2 pb-2">
            <div className="flex items-center">
              <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-exo-muted hover:text-white transition-colors"><Paperclip size={16} /></button>
              <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => setAttachedFiles(prev => [...prev, ...Array.from(e.target.files)])} />
            </div>
            <button onClick={handleSend} disabled={isGenerating || (!inputValue.trim() && attachedFiles.length === 0)} className="p-2 bg-exo-gold text-black rounded-lg hover:bg-yellow-400 disabled:opacity-50"><Send size={16} /></button>
          </div>
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
        headers: { 'X-CSRFToken': getCsrfToken() },
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
              {files.map(file => {
                const mime = file.type || file.file_type || '';
                const isImage = mime.startsWith('image/');
                const isPdf = mime === 'application/pdf';
                const FileIcon = isImage ? FileImage : isPdf ? FileType2 : FileText;
                return (
                <div key={file.id} className="bg-[#121318] border border-exo-border rounded-lg p-4 flex flex-col justify-between group hover:border-exo-gold/30 transition-all">
                  <div className="flex items-start gap-3 mb-4">
                    {/* 根据来源不同显示不同颜色的图标 */}
                    <div className={`p-2 rounded bg-opacity-10 mt-1 ${file.source === 'obsidian_sync' ? 'bg-purple-500 text-purple-400' : isImage ? 'bg-emerald-500 text-emerald-400' : isPdf ? 'bg-red-500 text-red-400' : 'bg-blue-500 text-blue-400'}`}>
                      <FileIcon size={18} />
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
                            await fetch(`${baseUrl}/api/core/projects/${projectId}/files/${file.id}/`, { method: 'DELETE', headers: { 'X-CSRFToken': getCsrfToken() }, credentials: 'include' });
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
              );
              })}

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
const MemoryAnchorTicker = ({ anchors = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFading, setIsFading] = useState(true);
  const noteRef = useRef(null);
  const scrollRafRef = useRef(null);

  useEffect(() => {
    if (anchors.length <= 1) return;
    const timer = setInterval(() => {
      setIsFading(false);
      setTimeout(() => { setCurrentIndex(prev => (prev + 1) % anchors.length); setIsFading(true); }, 400);
    }, 8000);
    return () => clearInterval(timer);
  }, [anchors.length]);

  // note 区域自动滚动：锚点切换后重置，停顿 1s 再缓慢滚完
  useEffect(() => {
    const el = noteRef.current;
    if (!el) return;
    el.scrollTop = 0;
    if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);

    const delay = setTimeout(() => {
      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll <= 0) return;
      const duration = 5000;
      const startTime = performance.now();
      const tick = (now) => {
        const t = Math.min((now - startTime) / duration, 1);
        el.scrollTop = t * maxScroll;
        if (t < 1) scrollRafRef.current = requestAnimationFrame(tick);
      };
      scrollRafRef.current = requestAnimationFrame(tick);
    }, 1200);

    return () => { clearTimeout(delay); if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current); };
  }, [currentIndex]);

  if (anchors.length === 0) {
    return (
      <div className="h-16 flex items-center justify-center border border-dashed border-exo-border rounded-lg bg-black/20 text-xs text-exo-muted font-mono">
        <Activity size={12} className="mr-2 animate-pulse" /> Scanning Core Memories... [NULL]
      </div>
    );
  }

  const anchor = anchors[currentIndex];
  // 改造：去除正则匹配括号，并只取前2个
  const cleanPattern = anchor.pattern.replace(/[()[\]]/g, "");
  const keywords = cleanPattern.split('|').map(k => k.trim()).filter(Boolean).slice(0, 2);

  return (
    <div className="rounded-lg bg-[#0d0e12] border border-exo-border p-3 shadow-inner">
      <div className={`transition-all duration-400 ${isFading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>

        {/* 上层：关键词 tags */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex flex-wrap gap-1 flex-1 min-w-0">
            {keywords.map((kw, i) => (
              <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded font-mono whitespace-nowrap ${
                anchor.is_persistent
                  ? 'bg-exo-gold/15 text-exo-gold border border-exo-gold/40'
                  : 'bg-white/5 text-gray-300 border border-white/10'
              }`}>
                {kw}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
            {anchor.is_persistent && <ShieldAlert size={11} className="text-exo-gold" title="Persistent" />}
            <span className="text-[10px] text-exo-muted font-mono bg-black/60 px-1.5 py-0.5 rounded border border-exo-border">
              {anchor.current_weight.toFixed(2)}
            </span>
          </div>
        </div>

        {/* 下层：essential_note 自动滚动 */}
        <div ref={noteRef} className="h-9 overflow-hidden">
          <p className="text-[11px] text-gray-400 leading-relaxed">{anchor.essential_note}</p>
        </div>

      </div>
    </div>
  );
};


// ==========================================
// 主组件：Agent Hub (预设管理与状态监控)
// ==========================================
const AgentManager = ({ openNewSession, openDestructor, setCurrentTab, presets, refreshPresets }) => {
  const [editTarget, setEditTarget] = useState(null);
  // anchorCache: { [presetId]: AnchorArray } — 进入 hub 时拉取一次，之后本地轮播
  const [anchorCache, setAnchorCache] = useState({});
  // 拖拽排序：{ [presetId]: sortIndex }，持久化到 localStorage
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

  // 仅在 g045 预设列表确定后拉取一次，已缓存的跳过
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
    return (
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

      {/* G045 专属特效：活跃锚点滚动条 */}
      {isG045 && (
        <div className="mt-auto pt-4 border-t border-exo-gold/10">
          <div className="text-[10px] font-bold text-exo-gold/70 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Clock size={12} /> Active Memory Stream
          </div>
          <MemoryAnchorTicker anchors={anchorCache[preset.id] || []} />
        </div>
      )}
    </div>
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

        {/* G045 Superior 区域 */}
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

        {/* Standard Nodes 区域 */}
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

// ==========================================
// 记忆编辑：KnowledgeFragment 编辑 Modal
// ==========================================
const KnowledgeEditModal = ({ isOpen, onClose, knowledgeId }) => {
  const [data, setData] = useState(null);
  const [abstract, setAbstract] = useState('');
  const [keywords, setKeywords] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !knowledgeId) return;
    setIsLoading(true);
    setSaveMsg('');
    setData(null);
    fetch(`${baseUrl}/api/memory/knowledge/${knowledgeId}/`, { credentials: 'include' })
      .then(res => res.json())
      .then(d => {
        setData(d);
        setAbstract(d.abstract || '');
        setKeywords(Array.isArray(d.keywords) ? d.keywords.join(', ') : (d.keywords || ''));
      })
      .catch(err => console.error('KF 加载失败', err))
      .finally(() => setIsLoading(false));
  }, [isOpen, knowledgeId]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch(`${baseUrl}/api/memory/knowledge/${knowledgeId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify({
          abstract,
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
        }),
      });
      const json = await res.json();
      setSaveMsg(json.msg || (res.ok ? '保存成功' : '保存失败'));
    } catch {
      setSaveMsg('网络错误');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-exo-panel border border-exo-border rounded-xl w-full max-w-xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-5 border-b border-exo-border">
          <div className="flex items-center gap-3">
            <BookOpen size={16} className="text-exo-gold" />
            <h2 className="text-sm font-bold text-exo-text">编辑知识片段</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-exo-muted hover:text-white transition-colors"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          {isLoading ? (
            <div className="flex justify-center py-8 text-exo-muted text-sm">加载中...</div>
          ) : data ? (
            <>
              <div>
                <label className="block text-[10px] font-bold text-exo-muted uppercase tracking-widest mb-1">标题（只读）</label>
                <div className="px-3 py-2 bg-black/30 border border-exo-border rounded-lg text-sm text-exo-muted">{data.title}</div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-exo-muted uppercase tracking-widest mb-1">摘要 Abstract</label>
                <textarea
                  rows={5}
                  className="w-full bg-black border border-exo-border rounded-lg px-3 py-2 text-sm text-exo-text focus:outline-none focus:border-exo-gold/50 resize-none transition-colors"
                  value={abstract}
                  onChange={e => setAbstract(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-exo-muted uppercase tracking-widest mb-1">关键词 Keywords（逗号分隔）</label>
                <input
                  className="w-full bg-black border border-exo-border rounded-lg px-3 py-2 text-sm text-exo-text focus:outline-none focus:border-exo-gold/50 transition-colors"
                  value={keywords}
                  onChange={e => setKeywords(e.target.value)}
                  placeholder="eg: 量子力学, 纠缠, 波函数"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {keywords.split(',').map(k => k.trim()).filter(Boolean).map((kw, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-exo-gold/10 border border-exo-gold/20 text-exo-gold/80">{kw}</span>
                  ))}
                </div>
              </div>
              <div className="text-[10px] text-exo-muted/60 bg-black/20 border border-exo-border/50 rounded-lg px-3 py-2 space-y-0.5">
                <p>· <span className="text-exo-gold/60">L1 检索</span>：系统自动匹配关键词，快速召回相关片段</p>
                <p>· <span className="text-exo-gold/60">L2 检索</span>：基于摘要语义向量进行深度相关性排序</p>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-exo-muted text-sm">加载失败</div>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 p-5 border-t border-exo-border">
          {saveMsg ? <span className="text-xs text-exo-gold/80">{saveMsg}</span> : <span />}
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-exo-muted hover:text-white transition-colors">取消</button>
            <button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="px-5 py-2 bg-exo-gold/10 text-exo-gold hover:bg-exo-gold hover:text-black border border-exo-gold/30 rounded-lg text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isSaving ? <Activity size={14} className="animate-spin" /> : <Save size={14} />}
              {isSaving ? 'SAVING...' : 'SAVE'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 记忆编辑：Proposal 编辑面板（内嵌，覆盖右侧内容区）
// ==========================================
const ProposalEditPanel = ({ proposal, conversationName, conversationId, onBack }) => {
  const [content, setContent] = useState(proposal?.content || '');
  const [keywords, setKeywords] = useState(
    Array.isArray(proposal?.keywords) ? proposal.keywords.join(', ') : (proposal?.keywords || '')
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [originalMessages, setOriginalMessages] = useState(null);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);

  useEffect(() => {
    if (!proposal || conversationId == null) return;
    setIsLoadingMsgs(true);
    fetch(`${baseUrl}/api/agents/chat/${conversationId}/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        const msgs = Array.isArray(data) ? data : (data.messages || data.data || []);
        const start = proposal.start_index ?? 0;
        const end = proposal.end_index ?? msgs.length - 1;
        setOriginalMessages(msgs.slice(start, end + 1));
      })
      .catch(err => console.error('原始消息加载失败', err))
      .finally(() => setIsLoadingMsgs(false));
  }, [proposal, conversationId]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch(`${baseUrl}/api/memory/proposals/${proposal.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify({
          content,
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
        }),
      });
      const json = await res.json();
      setSaveMsg(json.msg || (res.ok ? '保存成功' : '保存失败'));
    } catch {
      setSaveMsg('网络错误');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-exo-border shrink-0">
        <button onClick={onBack} className="p-1.5 text-exo-muted hover:text-white transition-colors rounded hover:bg-white/5">
          <ArrowLeft size={16} />
        </button>
        <div className="flex flex-col overflow-hidden">
          <span className="text-sm font-semibold text-exo-text">编辑摘要</span>
          <span className="text-[10px] text-exo-muted truncate">{conversationName}</span>
        </div>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* 左栏：编辑区 */}
        <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-4 border-b md:border-b-0 md:border-r border-exo-border">
          <div>
            <label className="block text-[10px] font-bold text-exo-muted uppercase tracking-widest mb-1">摘要内容</label>
            <textarea
              rows={8}
              className="w-full bg-black border border-exo-border rounded-lg px-3 py-2 text-sm text-exo-text focus:outline-none focus:border-exo-gold/50 resize-none transition-colors"
              value={content}
              onChange={e => setContent(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-exo-muted uppercase tracking-widest mb-1">关键词（逗号分隔）</label>
            <input
              className="w-full bg-black border border-exo-border rounded-lg px-3 py-2 text-sm text-exo-text focus:outline-none focus:border-exo-gold/50 transition-colors"
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {keywords.split(',').map(k => k.trim()).filter(Boolean).map((kw, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-exo-gold/10 border border-exo-gold/20 text-exo-gold/80">{kw}</span>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            {saveMsg ? <span className="text-xs text-exo-gold/80">{saveMsg}</span> : <span />}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 bg-exo-gold/10 text-exo-gold hover:bg-exo-gold hover:text-black border border-exo-gold/30 rounded-lg text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isSaving ? <Activity size={14} className="animate-spin" /> : <Save size={14} />}
              {isSaving ? 'SAVING...' : 'SAVE'}
            </button>
          </div>
        </div>
        {/* 右栏：原始消息只读预览 */}
        <div className="flex-1 min-w-0 overflow-y-auto p-4">
          <div className="text-[10px] font-bold text-exo-muted uppercase tracking-widest mb-3">
            原始消息片段 ({proposal?.start_index ?? '?'} – {proposal?.end_index ?? '?'})
          </div>
          {isLoadingMsgs ? (
            <div className="text-center py-8 text-exo-muted text-sm">加载中...</div>
          ) : originalMessages?.length ? (
            <div className="space-y-3">
              {originalMessages.map((msg, i) => (
                <div key={i} className={`flex flex-col gap-0.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className="text-[9px] text-exo-muted/60 px-1 uppercase">{msg.role}</span>
                  <div className={`max-w-[90%] px-3 py-2 rounded-lg text-xs leading-relaxed ${msg.role === 'user' ? 'bg-exo-gold/10 text-exo-text border border-exo-gold/20' : 'bg-white/5 text-exo-muted border border-white/10'}`}>
                    {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-exo-muted/50 text-xs">暂无原始消息数据</div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 设置面板 (SettingsPanel)
// ==========================================
const SettingsPanel = ({ projects, presets }) => {
  const [activeSettingsTab, setActiveSettingsTab] = useState('memory');
  const [memSubTab, setMemSubTab] = useState('files');

  // 文件库状态
  const [expandedProjects, setExpandedProjects] = useState(new Set());
  const [projectFiles, setProjectFiles] = useState({});
  const [loadingProjects, setLoadingProjects] = useState(new Set());
  const [kfEditTarget, setKfEditTarget] = useState(null);

  // 会话摘要状态
  const [conversations, setConversations] = useState([]);
  const [convLoading, setConvLoading] = useState(false);
  const [expandedConvs, setExpandedConvs] = useState(new Set());
  const [convProposals, setConvProposals] = useState({});
  const [loadingConvs, setLoadingConvs] = useState(new Set());
  const [editingProposal, setEditingProposal] = useState(null);

  useEffect(() => {
    if (memSubTab !== 'proposals' || conversations.length > 0) return;
    setConvLoading(true);
    fetch(`${baseUrl}/api/agents/conversations/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setConversations(Array.isArray(data) ? data : []))
      .catch(err => console.error('会话加载失败', err))
      .finally(() => setConvLoading(false));
  }, [memSubTab]);

  const toggleProjectExpand = (pid) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(pid)) { next.delete(pid); return next; }
      next.add(pid);
      if (!projectFiles[pid]) {
        setLoadingProjects(lp => new Set([...lp, pid]));
        fetch(`${baseUrl}/api/core/projects/${pid}/files/`, { credentials: 'include' })
          .then(res => res.json())
          .then(files => {
            const obsidianFiles = files.filter(f => f.source === 'obsidian_sync');
            setProjectFiles(pf => ({ ...pf, [pid]: obsidianFiles }));
          })
          .catch(err => console.error('文件加载失败', err))
          .finally(() => setLoadingProjects(lp => { const n = new Set(lp); n.delete(pid); return n; }));
      }
      return next;
    });
  };

  const toggleConvExpand = (cid) => {
    setExpandedConvs(prev => {
      const next = new Set(prev);
      if (next.has(cid)) { next.delete(cid); return next; }
      next.add(cid);
      if (!convProposals[cid]) {
        setLoadingConvs(lc => new Set([...lc, cid]));
        fetch(`${baseUrl}/api/agents/conversations/${cid}/proposals/`, { credentials: 'include' })
          .then(res => res.json())
          .then(data => setConvProposals(cp => ({ ...cp, [cid]: Array.isArray(data.proposals) ? data.proposals : [] })))
          .catch(err => console.error('Proposals 加载失败', err))
          .finally(() => setLoadingConvs(lc => { const n = new Set(lc); n.delete(cid); return n; }));
      }
      return next;
    });
  };

  const openKfEdit = (fileId) => {
    const numId = typeof fileId === 'string' ? parseInt(fileId.replace(/\D/g, '')) : fileId;
    setKfEditTarget(numId);
  };

  return (
    <div className="flex-1 h-full flex overflow-hidden bg-exo-bg">
      <KnowledgeEditModal
        isOpen={kfEditTarget !== null}
        onClose={() => setKfEditTarget(null)}
        knowledgeId={kfEditTarget}
      />

      {/* 左侧 tab 栏 */}
      <div className="w-48 shrink-0 bg-exo-panel border-r border-exo-border flex flex-col py-6 px-3 gap-1">
        <div className="text-[10px] font-bold text-exo-muted uppercase tracking-widest px-2 mb-3">设置</div>
        <button
          onClick={() => setActiveSettingsTab('memory')}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeSettingsTab === 'memory' ? 'bg-exo-gold/10 text-exo-gold border border-exo-gold/20' : 'text-exo-muted hover:text-exo-text hover:bg-white/5'}`}
        >
          <BookOpen size={16} />
          记忆编辑
        </button>
      </div>

      {/* 右侧内容区 */}
      <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        {activeSettingsTab === 'memory' && (
          <>
            {editingProposal ? (
              <ProposalEditPanel
                proposal={editingProposal.proposal}
                conversationName={editingProposal.conversationName}
                conversationId={editingProposal.conversationId}
                onBack={() => setEditingProposal(null)}
              />
            ) : (
              <>
                {/* 子 tab 切换 */}
                <div className="flex items-center gap-1 p-4 border-b border-exo-border shrink-0">
                  <button
                    onClick={() => setMemSubTab('files')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${memSubTab === 'files' ? 'bg-exo-gold/10 text-exo-gold border border-exo-gold/20' : 'text-exo-muted hover:text-exo-text hover:bg-white/5'}`}
                  >文件库</button>
                  <button
                    onClick={() => setMemSubTab('proposals')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${memSubTab === 'proposals' ? 'bg-exo-gold/10 text-exo-gold border border-exo-gold/20' : 'text-exo-muted hover:text-exo-text hover:bg-white/5'}`}
                  >会话摘要</button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2">
                  {/* 文件库 */}
                  {memSubTab === 'files' && (
                    projects.length === 0 ? (
                      <div className="text-center py-16 text-exo-muted text-sm">暂无项目</div>
                    ) : projects.map(proj => {
                      const isExpanded = expandedProjects.has(proj.id);
                      const files = projectFiles[proj.id];
                      const isLoadingFiles = loadingProjects.has(proj.id);
                      return (
                        <div key={proj.id} className="border border-exo-border rounded-xl overflow-hidden">
                          <button
                            onClick={() => toggleProjectExpand(proj.id)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-exo-panel hover:bg-white/5 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {isExpanded ? <FolderOpen size={15} className="text-exo-gold/70" /> : <Folder size={15} className="text-exo-muted" />}
                              <span className="text-sm font-medium text-exo-text">{proj.name}</span>
                              {files && <span className="text-[10px] text-exo-muted/60">({files.length})</span>}
                            </div>
                            {isExpanded ? <ChevronDown size={14} className="text-exo-muted" /> : <ChevronRight size={14} className="text-exo-muted" />}
                          </button>
                          {isExpanded && (
                            <div className="bg-black/20 border-t border-exo-border/50">
                              {isLoadingFiles ? (
                                <div className="px-4 py-4 text-xs text-exo-muted text-center">加载中...</div>
                              ) : !files || files.length === 0 ? (
                                <div className="px-4 py-4 text-xs text-exo-muted/50 text-center">暂无 Obsidian 同步文件</div>
                              ) : (
                                files.map(file => (
                                  <button
                                    key={file.id}
                                    onClick={() => openKfEdit(file.id)}
                                    className="w-full flex items-center gap-3 px-6 py-2.5 hover:bg-white/5 transition-colors text-left group border-t border-exo-border/20 first:border-t-0"
                                  >
                                    <FileText size={13} className="text-exo-muted/60 shrink-0" />
                                    <span className="text-xs text-exo-text/80 group-hover:text-exo-text truncate flex-1">{file.title || file.name || file.id}</span>
                                    <Edit3 size={11} className="text-exo-muted/0 group-hover:text-exo-muted/60 transition-colors shrink-0" />
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}

                  {/* 会话摘要 */}
                  {memSubTab === 'proposals' && (
                    convLoading ? (
                      <div className="text-center py-16 text-exo-muted text-sm">加载会话列表...</div>
                    ) : conversations.length === 0 ? (
                      <div className="text-center py-16 text-exo-muted text-sm">暂无会话</div>
                    ) : conversations.map(conv => {
                      const isExpanded = expandedConvs.has(conv.id);
                      const proposals = convProposals[conv.id];
                      const isLoadingProposals = loadingConvs.has(conv.id);
                      return (
                        <div key={conv.id} className="border border-exo-border rounded-xl overflow-hidden">
                          <button
                            onClick={() => toggleConvExpand(conv.id)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-exo-panel hover:bg-white/5 transition-colors"
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <MessageSquare size={14} className={isExpanded ? 'text-exo-gold/70 shrink-0' : 'text-exo-muted/50 shrink-0'} />
                              <span className="text-sm font-medium text-exo-text truncate">{conv.name || `Session #${conv.id}`}</span>
                              {proposals && <span className="text-[10px] text-exo-muted/60 shrink-0">({proposals.length})</span>}
                            </div>
                            {isExpanded ? <ChevronDown size={14} className="text-exo-muted shrink-0" /> : <ChevronRight size={14} className="text-exo-muted shrink-0" />}
                          </button>
                          {isExpanded && (
                            <div className="bg-black/20 border-t border-exo-border/50">
                              {isLoadingProposals ? (
                                <div className="px-4 py-4 text-xs text-exo-muted text-center">加载中...</div>
                              ) : !proposals || proposals.length === 0 ? (
                                <div className="px-4 py-4 text-xs text-exo-muted/50 text-center">暂无摘要</div>
                              ) : (
                                proposals.map(proposal => (
                                  <button
                                    key={proposal.id}
                                    onClick={() => setEditingProposal({ proposal, conversationName: conv.name || `Session #${conv.id}`, conversationId: conv.id })}
                                    className="w-full flex items-start gap-3 px-6 py-3 hover:bg-white/5 transition-colors text-left group border-t border-exo-border/30 first:border-t-0"
                                  >
                                    <div className="flex flex-col flex-1 overflow-hidden gap-0.5">
                                      <span className="text-[10px] text-exo-muted/50 font-mono">
                                        {proposal.created_at ? new Date(proposal.created_at).toLocaleDateString('zh-CN') : '—'}
                                      </span>
                                      <span className="text-xs text-exo-text/80 group-hover:text-exo-text line-clamp-2 leading-relaxed">{proposal.content || '（无内容）'}</span>
                                    </div>
                                    <Edit3 size={11} className="text-exo-muted/0 group-hover:text-exo-muted/60 transition-colors shrink-0 mt-1" />
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </>
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
  const [presets, setPresets] = useState([]);
  const [activeFileProjectId, setActiveFileProjectId] = useState(null);
  const [showConvList, setShowConvList] = useState(false);

  useEffect(() => {
    // 获取项目列表
    fetch(`${baseUrl}/api/core/projects/`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setProjects(data))
      .catch(err => console.error("项目加载失败", err));

    // 获取预设列表 (Hoisted)
    fetch(`${baseUrl}/api/agents/presets/`, { credentials: 'include' })
      .then(res => res.json())
      .then(setPresets)
      .catch(err => console.error("Presets 拉取失败", err));
  }, []);

  const refreshPresets = () => {
    fetch(`${baseUrl}/api/agents/presets/`, { credentials: 'include' })
      .then(res => res.json())
      .then(setPresets)
      .catch(err => console.error("Presets 刷新失败", err));
  };

  const [destructorConfig, setDestructorConfig] = useState({ isOpen: false });
  const openDestructor = (config) => setDestructorConfig({ ...config, isOpen: true });

  const [newSessionConfig, setNewSessionConfig] = useState({ isOpen: false, initialContext: null });
  const openNewSession = (initialContext = null) => setNewSessionConfig({ isOpen: true, initialContext });

  return (
    <div className="w-full h-[100dvh] bg-exo-bg text-exo-text font-sans flex flex-col md:flex-row overflow-hidden">

      <DestructorModal {...destructorConfig} onClose={() => setDestructorConfig(p => ({...p, isOpen:false}))} />

      <NewSessionModal
        isOpen={newSessionConfig.isOpen}
        onClose={() => setNewSessionConfig(p => ({...p, isOpen:false}))}
        projects={projects}
        presets={presets}
        initialContext={newSessionConfig.initialContext}
        onSuccess={(newSessionId) => {
          setRefreshKey(prev => prev + 1);
          setActiveSessionId(newSessionId);
        }}
      />

      {/* Main Content Area: Order 1 on Mobile, Order 2 on Desktop (Right) */}
      <div className="flex-1 min-w-0 h-full flex flex-row relative order-1 md:order-2 overflow-hidden">
        {currentTab === 'chat' && (
          <div className="flex flex-1 min-w-0 h-full flex-row relative">
            <ConversationList
                activeSessionId={activeSessionId}
                setActiveSessionId={(id) => { setActiveSessionId(id); setActiveFileProjectId(null); setShowConvList(false); }}
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
              <ChatArea activeSessionId={activeSessionId} setShowConvList={setShowConvList} openNewSession={openNewSession} presets={presets} />
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
            presets={presets}
            refreshPresets={refreshPresets}
          />
        )}
        {currentTab === 'profile' && <UserProfile />}
        {currentTab === 'settings' && <SettingsPanel projects={projects} presets={presets} />}
      </div>

      {/* Sidebar: Order 2 on Mobile (Bottom), Order 1 on Desktop (Left) */}
      <div className="order-2 md:order-1 z-50">
        <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} showConvList={showConvList} setShowConvList={setShowConvList} />
      </div>

    </div>
  );
}