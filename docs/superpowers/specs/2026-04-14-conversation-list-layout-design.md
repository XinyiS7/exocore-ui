# ConversationList 三区段布局重设计

**日期**: 2026-04-14  
**范围**: `src/components/chat/ConversationList.jsx`（仅 `mode === 'chat'` 分支）

---

## 目标

将 ConversationList 的 chat 模式从单一滚动容器改为三个独立高度区段，使每个区段有明确的视觉边界与独立滚动，提升空间利用率和导航层级感。

---

## 布局结构（方案 B）

侧栏可用高度（header 以下）被分为三个垂直区段，从上到下固定顺序：

```
┌─────────────────────────────┐
│  G045 Superior Cognitive    │  max-height: 40%  · overflow-y: auto
│  (内部滚动)                  │
├─────────────────────────────┤
│  Project Repos              │  max-height: 40%  · overflow-y: auto
│  (内部滚动)                  │
├─────────────────────────────┤
│  Recent Links               │  flex: 1          · overflow-y: auto
│  (普通会话，填充剩余)         │
└─────────────────────────────┘
```

三个区段之间用 1px `exo-border` 分隔线隔开。各区段均独立滚动，互不影响。

---

## 各区段规格

### 1. G045 区（Superior Cognitive）

- 仅当存在 `agent_type === 'g045'` 的会话时渲染。
- 最大高度 40%（`max-h-[40%]`），超出时内部出现细滚动条。
- 标签图标保持原有 `<Sparkles size={12} />` + 文字 `Superior Cognitive`，样式不变。
- 会话条目样式不变（`SessionItem` 组件）。

### 2. Projects 区（Project Repos）

- 仅当存在项目（`projects.length > 0`）时渲染。
- 最大高度 40%（`max-h-[40%]`），超出时内部滚动。
- **默认只显示最近活跃的 2 个项目**（按 `last_message_at` 降序，取前两条）。
- 2 条之后显示无边框 `show more projects...` 按钮（`showAllProjects` state 控制）：
  - 点击展开全部项目，按钮变为 `show less ↑`。
  - 展开后整个区段仍受 max-height 40% 约束，内部滚动。
- **项目展开逻辑**：点击项目行 toggle `expandedProjects` Set，会话列在项目行正下方自然撑开（`animate-fade-in`），整个 Projects 区内部滚动容纳。
- 现有 `sortedProjects`、`expandedProjects`、`toggleProject`、`showAllProjects` state 均保留，只调整渲染逻辑（`visibleProjects` 切片）。

### 3. 普通会话区（Recent Links）

- 筛选条件不变：`agent_type !== 'g045'` 且 `project === null` 且不在 `councilInternalIds` 中。
- `flex: 1`，填充三区段中剩余的所有高度。
- 内部 `overflow-y: auto`，独立滚动。

---

## 外层容器变更

当前 `flex-1 overflow-y-auto` 的单一滚动容器改为：

```jsx
<div className="flex-1 flex flex-col overflow-hidden px-4">
  {/* G045 zone */}
  {/* divider */}
  {/* Projects zone */}
  {/* divider */}
  {/* Standard zone */}
</div>
```

每个区段结构：

```jsx
<div className="flex flex-col overflow-hidden max-h-[40%]">   {/* 或 flex-1 */}
  <div className="zone-label ...">标签</div>
  <div className="overflow-y-auto custom-scrollbar flex-1 pb-2">
    {/* 条目列表 */}
  </div>
</div>
```

---

## 不变的内容

- `SessionItem` 内部样式与交互（hover、active、菜单）完全不变。
- 项目行样式（Folder/FolderOpen 图标、展开动画、ProjectFiles 条目）不变。
- `councilInternalIds` 过滤逻辑不变。
- `council` 和 `project` 模式渲染路径不变。
- `isMainView` 分支不变。
- 搜索过滤逻辑不变。

---

## 边界情况

| 情况 | 行为 |
|------|------|
| G045 区为空 | 不渲染该区段及其分隔线 |
| Projects 区为空 | 不渲染该区段及其分隔线 |
| 普通会话为空 | 区段仍占位（flex-1），但内容为空 |
| 三区均有内容但各自内容很少 | 各区收缩至内容高度，普通会话区 flex-1 填充剩余 |
| G045 会话极多 | G045 区在 40% 处截断，内部滚动 |
| Projects 全部展开且极多 | Projects 区在 40% 处截断，内部滚动 |
