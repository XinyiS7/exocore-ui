# ConversationList 三区段布局 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 ConversationList chat 模式从单一滚动容器改为 G045（max 40%）/ Projects（max 40%）/ Standard（flex-1）三段独立滚动区段。

**Architecture:** 外层容器从 `overflow-y-auto` 改为 `flex flex-col overflow-hidden`，三个子区段各自带 `overflow-y-auto`。G045 和 Projects 各加 `max-h-[40%] shrink-0`，Standard 用 `flex-1 min-h-0`。Projects 区引入 `visibleProjects` 切片，`showAllProjects` state 已存在，直接复用。

**Tech Stack:** React, Tailwind CSS（已有 `custom-scrollbar` 类），Lucide React 图标

---

## File Map

| 文件 | 操作 |
|------|------|
| `src/components/chat/ConversationList.jsx` | 修改：添加 `visibleProjects`，重构 chat 模式渲染容器及三区段 |

---

### Task 1: 添加 `visibleProjects` 计算值

**Files:**
- Modify: `src/components/chat/ConversationList.jsx`（第 69–76 行附近，`sortedProjects` useMemo 之后）

- [ ] **Step 1: 在 `sortedProjects` useMemo 后面插入 `visibleProjects`**

  在第 76 行（`}, [projects, conversations]);` 结尾）后添加：

  ```jsx
  const visibleProjects = showAllProjects ? sortedProjects : sortedProjects.slice(0, 2);
  ```

- [ ] **Step 2: 验证 dev server 无报错**

  运行：`npm run dev`  
  预期：无编译错误，页面正常加载。

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/chat/ConversationList.jsx
  git commit -m "feat: add visibleProjects slice for ConversationList project zone"
  ```

---

### Task 2: 重构外层滚动容器

**Files:**
- Modify: `src/components/chat/ConversationList.jsx`（第 173 行，外层 `div`）

当前代码（第 173 行）：
```jsx
<div className={`flex-1 overflow-y-auto custom-scrollbar ${isMainView ? 'max-w-4xl mx-auto w-full px-6' : 'px-4'}`}>
  <div className="pb-10 space-y-6">
```

- [ ] **Step 1: 将外层容器改为 flex-col，去掉自身滚动**

  将上述两行替换为：

  ```jsx
  <div className={`flex-1 flex flex-col overflow-hidden min-h-0 ${isMainView ? 'max-w-4xl mx-auto w-full px-6' : 'px-4'}`}>
  ```

  同时找到对应的关闭 `</div></div>` 并去掉内层 `<div className="pb-10 space-y-6">`，只保留一层闭合。

- [ ] **Step 2: Commit**

  ```bash
  git add src/components/chat/ConversationList.jsx
  git commit -m "refactor: change ConversationList outer container to flex-col for zone layout"
  ```

---

### Task 3: 实现 G045 区段（max-height 40%，内部滚动）

**Files:**
- Modify: `src/components/chat/ConversationList.jsx`（`mode === 'chat'` 内 G045 块）

当前 G045 代码（第 179–188 行）：
```jsx
{g045Sessions.length > 0 && (
  <div className="space-y-3">
    <div className="text-[10px] font-bold text-exo-accent/60 flex items-center gap-2 uppercase tracking-[0.2em]">
      <Sparkles size={12} /> Superior Cognitive
    </div>
    <div className="grid gap-1">
      {g045Sessions.map(conv => <SessionItem key={conv.id} conv={conv} icon={Cpu} />)}
    </div>
  </div>
)}
```

- [ ] **Step 1: 替换 G045 区段为带约束的 flex 容器**

  ```jsx
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
  ```

- [ ] **Step 2: 验证 G045 会话多时出现内部滚动条，单个时自然收缩**

  在浏览器中打开侧栏，确认 G045 区不超过侧栏总高度的 40%，多条时滚动条出现在区内。

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/chat/ConversationList.jsx
  git commit -m "feat: G045 zone max-height 40% with internal scroll"
  ```

---

### Task 4: 实现 Projects 区段（max-height 40%，show more，展开会话）

**Files:**
- Modify: `src/components/chat/ConversationList.jsx`

当前 Projects 代码在 `mode === 'project' || (mode === 'chat' && projects.length > 0)` 条件下（第 236–280 行）。  
需要把 `mode === 'chat'` 下的 Projects 渲染移入三区段内，`mode === 'project'` 保持不变。

- [ ] **Step 1: 在 Standard Sessions 块之后（仍在 `mode === 'chat'` 的 `<>` 内）插入 Projects 区段**

  删除原来 `{(mode === 'project' || (mode === 'chat' && projects.length > 0)) && ...}` 中的 chat 分支（只保留 `mode === 'project'` 分支），在 chat 模式 `<>` 末尾添加：

  ```jsx
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
  ```

- [ ] **Step 2: 处理原 `(mode === 'project' || (mode === 'chat' && projects.length > 0))` 条件块**

  将该条件改为仅 `mode === 'project'`：

  ```jsx
  {mode === 'project' && (
    <div className="space-y-3">
      ...（内容与原来 mode === 'project' 分支完全相同）...
    </div>
  )}
  ```

- [ ] **Step 3: 验证 Projects 区表现**
  - 只有 1–2 个项目时：显示全部，无 show more 按钮
  - 3+ 个项目时：默认显示 2 个，show more 出现
  - 展开项目后会话列自然撑开，区段达到 40% 后内部滚动

- [ ] **Step 4: Commit**

  ```bash
  git add src/components/chat/ConversationList.jsx
  git commit -m "feat: Projects zone max-height 40% with show-more and internal scroll"
  ```

---

### Task 5: 实现 Standard Sessions 区段（flex-1，内部滚动）+ 分隔线

**Files:**
- Modify: `src/components/chat/ConversationList.jsx`

当前 Standard Sessions 代码（第 191–200 行）：
```jsx
{standardSessions.length > 0 && (
  <div className="space-y-3">
    <div className="text-[10px] font-bold text-exo-muted/40 flex items-center gap-2 uppercase tracking-[0.2em]">
      <MessageSquare size={12} /> Recent Links
    </div>
    <div className="grid gap-1">
      {standardSessions.map(conv => <SessionItem key={conv.id} conv={conv} icon={Hash} />)}
    </div>
  </div>
)}
```

- [ ] **Step 1: 替换 Standard 区段为 flex-1 容器**

  ```jsx
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
  ```

- [ ] **Step 2: 在各区段之间添加分隔线**

  在 `mode === 'chat'` 的 `<>` 内，每两个相邻区段之间（仅当两者都有内容时）插入：

  ```jsx
  {/* G045 与 Projects 之间 */}
  {g045Sessions.length > 0 && sortedProjects.length > 0 && (
    <div className="h-px bg-exo-border shrink-0" />
  )}

  {/* Projects 与 Standard 之间 */}
  {sortedProjects.length > 0 && standardSessions.length > 0 && (
    <div className="h-px bg-exo-border shrink-0" />
  )}

  {/* G045 与 Standard 之间（无 Projects 时） */}
  {g045Sessions.length > 0 && sortedProjects.length === 0 && standardSessions.length > 0 && (
    <div className="h-px bg-exo-border shrink-0" />
  )}
  ```

- [ ] **Step 3: 验证三区联动**
  - 无 G045 时：Projects 直接顶部，Standard 填满剩余
  - 无 Projects 时：G045 顶部，Standard 填满剩余
  - 三区均有内容时：三段分隔，各自滚动，比例符合设计

- [ ] **Step 4: Commit**

  ```bash
  git add src/components/chat/ConversationList.jsx
  git commit -m "feat: Standard zone flex-1 scroll and inter-zone dividers"
  ```

---

### Task 6: 最终整体验收

**Files:** 只读验证，无需修改

- [ ] **Step 1: 运行 lint 检查**

  ```bash
  npm run lint
  ```

  预期：无新增 ESLint 错误。

- [ ] **Step 2: 手动验证清单**

  | 场景 | 预期 |
  |------|------|
  | G045 只有 1 条 | G045 区紧缩，不浪费空间 |
  | G045 有 6+ 条 | G045 区锁定在 40%，内部出现滚动条 |
  | Projects = 1–2 个 | 无 show more 按钮 |
  | Projects = 3+ 个 | show more 出现，点击展开全部并在 40% 内滚动 |
  | 展开项目会话列 | 会话列自然撑开，Projects 区在 40% 内滚动 |
  | 三区均有内容 | 分隔线正常显示，各区独立滚动 |
  | 无 G045 | G045 区及上方分隔线不出现 |
  | 无 Projects | Projects 区及相关分隔线不出现 |
  | council / project 模式 | 不受影响，行为与修改前相同 |
  | isMainView = true | 布局不受影响 |

- [ ] **Step 3: Commit（如有遗漏修正）**

  ```bash
  git add src/components/chat/ConversationList.jsx
  git commit -m "fix: final adjustments for three-zone ConversationList layout"
  ```
