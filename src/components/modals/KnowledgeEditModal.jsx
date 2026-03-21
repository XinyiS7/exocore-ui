import React, { useState, useEffect } from 'react';
import { BookOpen, X, Activity, Save } from 'lucide-react';
import { baseUrl, getCsrfToken } from '../../utils/api';

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

export default KnowledgeEditModal;
