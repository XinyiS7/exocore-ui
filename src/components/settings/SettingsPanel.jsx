import React, { useState, useEffect } from 'react';
import {
  BookOpen, FolderOpen, Folder, ChevronDown, ChevronRight,
  FileText, Edit3, MessageSquare, Brain, PanelLeftClose, PanelLeftOpen, UserCircle
} from 'lucide-react';
import { baseUrl } from '../../utils/api';
import KnowledgeEditModal from '../modals/KnowledgeEditModal';
import ProposalEditPanel from '../memory/ProposalEditPanel';
import MemoryManager from './MemoryManager';

const SettingsPanel = ({ projects, presets }) => {
  const [activeSettingsTab, setActiveSettingsTab] = useState('memory');
  const [memSubTab, setMemSubTab] = useState('files');
  const [isCollapsedDesktop, setIsCollapsedDesktop] = useState(false);
  const [nickInput, setNickInput] = useState(() => localStorage.getItem('exo_user_nick') || 'Exo User');

  const [expandedProjects, setExpandedProjects] = useState(new Set());
  const [projectFiles, setProjectFiles] = useState({});
  const [loadingProjects, setLoadingProjects] = useState(new Set());
  const [kfEditTarget, setKfEditTarget] = useState(null);

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

  const navBtn = (tab, icon, label) => (
    <button
      onClick={() => setActiveSettingsTab(tab)}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
        activeSettingsTab === tab
          ? 'bg-exo-accent/10 text-exo-accent border border-exo-accent/20'
          : 'text-exo-muted hover:text-exo-text hover:bg-white/5'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="flex-1 h-full flex overflow-hidden bg-noise relative">
      <KnowledgeEditModal
        isOpen={kfEditTarget !== null}
        onClose={() => setKfEditTarget(null)}
        knowledgeId={kfEditTarget}
      />

      {/* Desktop Expand Button (Floating) */}
      <button 
        onClick={() => setIsCollapsedDesktop(false)}
        className={`hidden md:flex absolute top-4 left-4 z-[80] p-2 rounded-xl bg-[#111121]/80 backdrop-blur-md border border-white/10 text-exo-muted hover:text-exo-accent transition-all shadow-lg ${isCollapsedDesktop ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 pointer-events-none'}`}
        title="展开面板"
      >
        <PanelLeftOpen size={16} />
      </button>

      <div className={`hidden md:flex flex-col py-5 px-3 gap-1 shrink-0 bg-[#111121]/30 backdrop-blur-xl border-r border-white/5 transition-all duration-300 overflow-hidden ${isCollapsedDesktop ? 'w-0 opacity-0 border-none px-0' : 'w-56 opacity-100'}`}>
        <div className="flex items-center justify-between px-2 mb-4 shrink-0">
          <span className="text-[10px] font-bold text-exo-muted uppercase tracking-[0.3em]">System Preferences</span>
          <button onClick={() => setIsCollapsedDesktop(true)} className="p-1.5 rounded-xl text-exo-muted hover:text-exo-text hover:bg-white/5 transition-colors" title="收起面板">
            <PanelLeftClose size={16} />
          </button>
        </div>
        {navBtn('memory', <BookOpen size={16} />, '历史管理')}
        {navBtn('memory_mgmt', <Brain size={16} />, '记忆管理')}
        {navBtn('account', <UserCircle size={16} />, '用户管理')}
      </div>

      <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        <div className="flex md:hidden items-center gap-1 px-4 pt-4 pb-2 border-b border-exo-border shrink-0 overflow-x-auto">
          {navBtn('memory', <BookOpen size={14} />, '历史')}
          {navBtn('memory_mgmt', <Brain size={14} />, '记忆')}
          {navBtn('account', <UserCircle size={14} />, '账户')}
        </div>
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
                <div className="flex items-center gap-1 p-4 border-b border-exo-border shrink-0">
                  <button
                    onClick={() => setMemSubTab('files')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${memSubTab === 'files' ? 'bg-exo-accent/10 text-exo-accent border border-exo-accent/20' : 'text-exo-muted hover:text-exo-text hover:bg-white/5'}`}
                  >文件库</button>
                  <button
                    onClick={() => setMemSubTab('proposals')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${memSubTab === 'proposals' ? 'bg-exo-accent/10 text-exo-accent border border-exo-accent/20' : 'text-exo-muted hover:text-exo-text hover:bg-white/5'}`}
                  >会话摘要</button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2">
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
                              {isExpanded ? <FolderOpen size={15} className="text-exo-accent/70" /> : <Folder size={15} className="text-exo-muted" />}
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
                                files.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(file => (
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
                              <MessageSquare size={14} className={isExpanded ? 'text-exo-accent/70 shrink-0' : 'text-exo-muted/50 shrink-0'} />
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
                                proposals.slice().reverse().map(proposal => (
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

        {activeSettingsTab === 'memory_mgmt' && (
          <MemoryManager presets={presets} />
        )}

        {activeSettingsTab === 'account' && (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-2xl space-y-8">
              <section>
                <h3 className="text-sm font-bold text-exo-accent uppercase tracking-widest mb-4">身份识别 / Identity</h3>
                <div className="bg-exo-panel/30 border border-exo-border rounded-xl p-5 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-exo-muted uppercase tracking-wider">用户昵称</label>
                    <div className="flex gap-3">
                      <input 
                        type="text" 
                        value={nickInput}
                        onChange={(e) => setNickInput(e.target.value)}
                        className="flex-1 bg-black/40 border border-exo-border rounded-lg px-3 py-2 text-sm text-exo-text focus:border-exo-accent/40 outline-none transition-all"
                        placeholder="输入你的昵称..."
                      />
                      <button 
                        onClick={() => {
                          localStorage.setItem('exo_user_nick', nickInput);
                          window.dispatchEvent(new Event('user-nick-updated'));
                        }}
                        className="px-4 py-2 bg-exo-accent/10 text-exo-accent border border-exo-accent/20 rounded-lg text-xs font-bold hover:bg-exo-accent hover:text-black transition-all"
                      >
                        保存
                      </button>
                    </div>
                    <p className="text-[10px] text-exo-muted/60 leading-relaxed mt-2">
                      该昵称将用于本地 UI 显示。在会话中，你依然会被标记为 "You" 以保持交互简洁性。
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-exo-accent/60 uppercase tracking-widest mb-4 opacity-50">平台密钥 / Platform Keys (Coming Soon)</h3>
                <div className="bg-exo-panel/20 border border-exo-border/50 rounded-xl p-5 border-dashed">
                  <p className="text-xs text-exo-muted/40 text-center py-4 italic">
                    未来将在此管理各平台 API 密钥（如 OpenAI, Anthropic, Google Cloud 等）
                  </p>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPanel;
