import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Tag, Edit3, Trash2, RefreshCw, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { baseUrl, getCsrfToken } from '../../utils/api';
import { sortPresets } from '../../utils/presets';

const MemoryManager = ({ presets }) => {
  const sortedPresets = useMemo(() => sortPresets(presets), [presets]);
  const [selectedPresetId, setSelectedPresetId] = useState(sortedPresets[0]?.id ?? '');

  useEffect(() => {
    if (!selectedPresetId && sortedPresets.length > 0) {
      setSelectedPresetId(sortedPresets[0].id);
    }
  }, [sortedPresets, selectedPresetId]);

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ scope: '', source: '', is_processed: '' });
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editScope, setEditScope] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  
  const [showNewForm, setShowNewForm] = useState(false);
  const [newText, setNewText] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newScope, setNewScope] = useState('work');
  const [creating, setCreating] = useState(false);

  const [availableTags, setAvailableTags] = useState([]);

  const fetchEntries = useCallback(() => {
    if (!selectedPresetId) return;
    setLoading(true);
    const params = new URLSearchParams({ preset_id: selectedPresetId });
    if (filters.scope) params.set('scope', filters.scope);
    if (filters.source) params.set('source', filters.source);
    if (filters.is_processed !== '') params.set('is_processed', filters.is_processed);
    fetch(`${baseUrl}/api/memory/entries/?${params}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setEntries(Array.isArray(data) ? data : (data.results ?? [])))
      .catch(err => console.error('记忆加载失败', err))
      .finally(() => setLoading(false));
  }, [selectedPresetId, filters]);

  const fetchTags = useCallback(() => {
    if (!selectedPresetId) return;
    fetch(`${baseUrl}/api/memory/entries/tags/?preset_id=${selectedPresetId}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setAvailableTags(data))
      .catch(err => console.error('获取标签失败', err));
  }, [selectedPresetId]);

  useEffect(() => { 
    fetchEntries(); 
    fetchTags();
  }, [fetchEntries, fetchTags]);

  const handleEdit = (entry) => {
    setEditingId(entry.id);
    setEditText(entry.raw_text || '');
    setEditScope(entry.scope || 'work');
    const tags = Array.isArray(entry.tags) ? entry.tags : (entry.tags ? String(entry.tags).split(',') : []);
    setEditTags(tags.join(', '));
  };

  const handleSave = async (id) => {
    setSavingId(id);
    const tags = editTags.split(',').map(t => t.trim()).filter(Boolean);
    try {
      const res = await fetch(`${baseUrl}/api/memory/entries/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify({ raw_text: editText, tags, scope: editScope }),
      });
      if (res.ok) {
        const updated = await res.json();
        setEntries(prev => prev.map(e => e.id === id ? updated : e));
        setEditingId(null);
        fetchTags();
      }
    } catch (err) {
      console.error('保存失败', err);
    } finally {
      setSavingId(null);
    }
  };

  const handleCreate = async () => {
    if (!newText.trim()) return;
    setCreating(true);
    const tags = newTags.split(',').map(t => t.trim()).filter(Boolean);
    try {
      const res = await fetch(`${baseUrl}/api/memory/entries/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify({ 
          preset_id: selectedPresetId, 
          raw_text: newText, 
          tags, 
          scope: newScope 
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setEntries(prev => [created, ...prev]);
        setShowNewForm(false);
        setNewText('');
        setNewTags('');
        fetchTags();
      }
    } catch (err) {
      console.error('创建失败', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除这条记忆条目吗？')) return;
    try {
      const res = await fetch(`${baseUrl}/api/memory/entries/${id}/`, {
        method: 'DELETE',
        headers: { 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
      });
      if (res.ok || res.status === 204) {
        setEntries(prev => prev.filter(e => e.id !== id));
      }
    } catch (err) {
      console.error('删除失败', err);
    }
  };

  const tagsArray = (entry) => {
    if (Array.isArray(entry.tags)) return entry.tags;
    if (typeof entry.tags === 'string' && entry.tags) return entry.tags.split(',').map(t => t.trim()).filter(Boolean);
    return [];
  };

  const SCOPE_LABELS = {
    'work': '工作',
    'life': '生活',
    'hobby': '爱好',
    'emotion': '情感'
  };

  const filterSelect = 'bg-exo-panel border border-exo-border rounded-lg px-2 py-1.5 text-xs text-exo-muted outline-none focus:border-exo-gold/50 cursor-pointer';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Filter bar */}
      <div className="flex items-center gap-2 p-4 border-b border-exo-border shrink-0 flex-wrap">
        <select
          value={selectedPresetId}
          onChange={e => setSelectedPresetId(e.target.value)}
          className="bg-exo-panel border border-exo-border rounded-lg px-2 py-1.5 text-sm text-exo-text outline-none focus:border-exo-gold/50 cursor-pointer"
        >
          {sortedPresets.length === 0 && <option value="">无 Agent</option>}
          {sortedPresets.map(p => (
            <option key={p.id} value={p.id} className="bg-[#1a1b23]">{p.name}</option>
          ))}
        </select>

        <select value={filters.scope} onChange={e => setFilters(f => ({ ...f, scope: e.target.value }))} className={filterSelect}>
          <option value="">所有范围</option>
          {Object.entries(SCOPE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>

        <select value={filters.source} onChange={e => setFilters(f => ({ ...f, source: e.target.value }))} className={filterSelect}>
          <option value="">所有来源</option>
          <option value="highlight">Highlight</option>
          <option value="g045_tool">G045 Tool</option>
          <option value="user_manual">Manual</option>
        </select>

        <select value={filters.is_processed} onChange={e => setFilters(f => ({ ...f, is_processed: e.target.value }))} className={filterSelect}>
          <option value="">全部状态</option>
          <option value="true">已处理</option>
          <option value="false">待处理</option>
        </select>

        <button
          onClick={fetchEntries}
          disabled={loading}
          className="p-1.5 text-exo-muted hover:text-exo-gold transition-colors rounded-lg hover:bg-exo-gold/10 disabled:opacity-40"
          title="刷新"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>

        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${showNewForm ? 'bg-exo-gold text-black' : 'bg-exo-gold/10 text-exo-gold border border-exo-gold/20 hover:bg-exo-gold/20'}`}
        >
          <Plus size={14} /> {showNewForm ? '取消新增' : '新增记忆'}
        </button>

        <span className="ml-auto text-[10px] text-exo-muted/40 font-mono tabular-nums">{entries.length} 条</span>
      </div>

      {/* New Entry Form */}
      {showNewForm && (
        <div className="p-4 border-b border-exo-border bg-exo-gold/5 animate-fade-in shrink-0">
          <div className="space-y-3">
            <textarea
              placeholder="输入记忆内容..."
              value={newText}
              onChange={e => setNewText(e.target.value)}
              rows={3}
              className="w-full bg-black border border-exo-border rounded-xl px-4 py-3 text-sm text-exo-text outline-none focus:border-exo-gold/50 resize-none font-mono"
            />
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px]">
                <input
                  placeholder="标签 (逗号分隔)"
                  value={newTags}
                  onChange={e => setNewTags(e.target.value)}
                  className="w-full bg-black border border-exo-border rounded-lg px-3 py-2 text-xs text-exo-text outline-none focus:border-exo-gold/50"
                  list="available-tags"
                />
                <datalist id="available-tags">
                  {availableTags.map(tag => <option key={tag} value={tag} />)}
                </datalist>
              </div>
              <select
                value={newScope}
                onChange={e => setNewScope(e.target.value)}
                className="bg-black border border-exo-border rounded-lg px-3 py-2 text-xs text-exo-text outline-none focus:border-exo-gold/50 cursor-pointer"
              >
                {Object.entries(SCOPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <button
                onClick={handleCreate}
                disabled={creating || !newText.trim()}
                className="px-6 py-2 bg-exo-gold text-black font-bold rounded-lg text-xs hover:bg-yellow-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {creating ? '提交中...' : '保存记忆'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entry list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading && !entries.length ? (
          <div className="text-center py-16 text-exo-muted text-sm">加载中...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 text-exo-muted text-sm">暂无记忆条目</div>
        ) : entries.map(entry => (
          <div key={entry.id} className="border border-exo-border rounded-xl overflow-hidden bg-exo-panel/50">
            <div className="px-4 py-3">
              {/* Meta row */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {entry.scope && (
                    <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-exo-gold/10 text-exo-gold/70 border border-exo-gold/20">
                      {SCOPE_LABELS[entry.scope] || entry.scope}
                    </span>
                  )}
                  {entry.source && (
                    <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-white/5 text-exo-muted border border-white/10">
                      {entry.source === 'highlight' ? '划线' : entry.source === 'g045_tool' ? '工具' : '手动'}
                    </span>
                  )}
                  {entry.is_processed !== undefined && (
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                      entry.is_processed
                        ? 'bg-green-500/10 text-green-400/70 border-green-500/20'
                        : 'bg-orange-500/10 text-orange-400/70 border-orange-500/20'
                    }`}>
                      {entry.is_processed ? '已处理' : '待处理'}
                    </span>
                  )}
                  {entry.created_at && (
                    <span className="text-[9px] text-exo-muted/40 font-mono">
                      {new Date(entry.created_at).toLocaleDateString('zh-CN')}
                    </span>
                  )}
                </div>
                {editingId !== entry.id && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => handleEdit(entry)}
                      className="p-1.5 text-exo-muted/40 hover:text-exo-gold transition-colors rounded-lg hover:bg-exo-gold/10"
                      title="编辑"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-1.5 text-exo-muted/40 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                      title="删除"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>

              {/* Content */}
              {editingId === entry.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    rows={4}
                    className="w-full bg-black border border-exo-border rounded-lg px-3 py-2 text-xs text-exo-text outline-none focus:border-exo-gold/50 resize-y font-mono leading-relaxed"
                  />
                  <div className="flex flex-wrap gap-2">
                    <div className="flex-1 min-w-[150px]">
                      <input
                        value={editTags}
                        onChange={e => setEditTags(e.target.value)}
                        placeholder="Tags（逗号分隔）"
                        className="w-full bg-black border border-exo-border rounded-lg px-3 py-1.5 text-xs text-exo-text outline-none focus:border-exo-gold/50"
                        list="available-tags-edit"
                      />
                      <datalist id="available-tags-edit">
                        {availableTags.map(tag => <option key={tag} value={tag} />)}
                      </datalist>
                    </div>
                    <select
                      value={editScope}
                      onChange={e => setEditScope(e.target.value)}
                      className="bg-black border border-exo-border rounded-lg px-3 py-1.5 text-xs text-exo-text outline-none focus:border-exo-gold/50 cursor-pointer"
                    >
                      {Object.entries(SCOPE_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => setEditingId(null)} className="px-3 py-1 text-exo-muted hover:text-white text-xs transition-colors">取消</button>
                    <button
                      onClick={() => handleSave(entry.id)}
                      disabled={savingId === entry.id}
                      className="px-3 py-1 bg-exo-gold/10 text-exo-gold border border-exo-gold/20 rounded-lg text-xs hover:bg-exo-gold hover:text-black transition-all disabled:opacity-50"
                    >
                      {savingId === entry.id ? '保存中...' : '保存'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className={`text-xs text-exo-text/80 leading-relaxed mb-1 font-mono whitespace-pre-wrap ${expandedId === entry.id ? '' : 'line-clamp-4'}`}>{entry.raw_text}</p>
                  {entry.raw_text?.length > 200 && (
                    <button
                      onClick={() => setExpandedId(id => id === entry.id ? null : entry.id)}
                      className="flex items-center gap-1 text-[10px] text-exo-muted/50 hover:text-exo-gold transition-colors mb-2"
                    >
                      {expandedId === entry.id
                        ? <><ChevronUp size={10} />收起</>
                        : <><ChevronDown size={10} />展开全文</>}
                    </button>
                  )}
                  {tagsArray(entry).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tagsArray(entry).map((tag, i) => (
                        <span key={i} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400/70 border border-blue-500/20 rounded">
                          <Tag size={8} />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MemoryManager;
