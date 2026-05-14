# V2 布局后续调整

**Date**: 2026-05-14
**Branch**: `newlayout`
**当前进度**: 框架完成，会话列表、搜索、Task+Timeline 整合、v1↔v2 切换均可用

---

## 1. Agent 新建会话 & 设置入口

- AgentProfile 页面的 [New Session] 按钮目前调用 `openNewSession`，需验证是否正确唤起 NewSessionModal
- AgentProfile 顶部 meta 区目前有 system prompt 可展开编辑（PATCH 保存已实现），但缺少 **name、description、default_model** 的编辑入口
  - 可复用 `EditPresetModal` 或在 AgentProfile 内直接增加 inline 编辑字段
- 考虑在 AgentProfile header 加一个齿轮图标打开 EditPresetModal

## 2. Agent Memory 管理入口

- 左侧 Memory Anchors 列表目前只读展示 anchor 内容 + tags
- 需要增加管理能力：
  - 删除 anchor
  - 编辑 anchor 的 tags / content
  - 手动创建 anchor
- 可能需要一个 "Manage Memory" 按钮，跳转到 SettingsPanel 的 MemoryManager（已有按 preset_id 筛选 + CRUD）
- 或直接在 AgentProfile 左侧增加编辑/删除操作

## 3. Project 正确显示下辖会话和文件

- 当前 `ProjectList` 复用 `ConversationList` 的 project mode，需验证：
  - Project 文件夹展开后是否显示下辖会话
  - "Project Files" 入口是否可用
  - 点击项目文件是否正确打开 `ProjectFilesArea`
- 可能需要确保 `setActiveFileProjectId` 和 `setView('project_files')` 的联动正确

## 4. Telemetry 数据细化

- 当前 ChatArea 的 SSE 流接收 `telemetry` 事件类型，但前端可能没有完整渲染
- 需要在 ChatArea 或对话界面中展示：
  - Token 消耗（每次请求 / 累计）
  - 模型响应延迟
  - 缓存命中率（ContextCache）
- 可以做一个可折叠的 telemetry 面板，或在 MessageBubble 下方显示

---

## 技术备忘

- **API 端点**: 会话用 `/api/agents/conversations/`（直接数组），preset 用 `/api/agents/presets/`
- **v1↔v2 切换**: `localStorage key: exo_layout_version` + `CustomEvent: layout-version-changed`
- **构建**: lightningcss 不能解析动态拼接的 Tailwind class 名，用 inline style 代替
- **ContentRouter**: 所有 v2 view 通过 AppShell 的 `navigate(view, params)` 统一路由
- **组件复用**: ChatArea, MessageBubble, ConversationList, SettingsPanel, CouncilArea 等均为 v1/v2 共享
