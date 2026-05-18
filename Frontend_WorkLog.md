# Frontend Work Log

> 改动前请先查阅 **ReactSheet.txt** 确认接口格式、字段名、状态机流转，再动手写代码。

---

## 2026-04-08

### 硬科幻视觉系统迭代与多态导航重构

**背景**：为了提升视觉的工业质感和交互的逻辑连贯性，将原有的青色系彻底替换为“冷金（#FFD700）”，并引入 Claude 风格的多态布局。同时解决 Council 模块在高容错场景下的崩溃问题。

**主要改动**

| 模块 | 改动内容 |
|---|---|
| **视觉系统** | 1. 定义 **Cold Gold (#FFD700)** 为核心品牌色；<br>2. 实现“灯管级”渲染：通过 **白色核心 + 金色光晕** 的多层级阴影（`glow-sharp`）模拟高真实感发光；<br>3. 升级 `index.css` 边框实用类，为 `.accent-indicator` 等增加伪元素光芯，提升视觉精度。 |
| **多态布局 (Polymorphism)** | 1. 落地 `Home -> Category Launcher -> Active Workspace` 的流转逻辑；<br>2. 重构 `ConversationList` 支持 `isMainView` 模式，作为全屏 Hub 展示；<br>3. 实现**绝对定位覆盖层**列表，确保打开会话列表时不会挤压/抖动主聊天区域。 |
| **侧边栏 (Sidebar)** | 1. 废弃 Hover 自动展开，改为显式点击切换；<br>2. 优化图标动画：Hexagon Logo 切换为平滑的 **pulse-glow (呼吸灯)** 动效，替代原有的 sharp blink。 |
| **Bugfix & 鲁棒性** | 1. **修复白屏**: 解决 `ConversationList` 因 `projects` prop 缺失导致的解构崩溃（议会/主视图场景）；<br>2. **状态同步**: 修正移动端 Burger Menu 与侧边栏的交互逻辑，确保窄屏下自动遮罩。 |

---

## 2026-04-07

### UI 交互体验升级与核心功能补全

**背景**：完善聊天功能栈（编辑/分支/重新生成/停止），优化输入性能（解决 React 渲染穿透导致卡顿），落地 Claude 风格的悬浮侧边栏，并增加本地账户/昵称设置机制。

**主要改动**

| 模块 | 改动内容 |
|---|---|
| **聊天性能优化** | 彻底修复输入框打字卡顿问题。1. `localStorage` 草稿保存改为 500ms 防抖；2. 使用 `useCallback` 和 `useRef` 固化传给 `MessageBubble` 的函数引用（`onEdit`, `onRegenerate`, `handleBranch`），修复 `React.memo` 缓存被击穿导致的全量列表重绘。 |
| **消息操作** | 1. 接入流中断（`AbortController.abort()`）并支持打断回填；<br>2. 新增**编辑内容**、**重新生成**、**从此处分支** 功能；<br>3. **Bugfix**: 修复 `Ctrl+Enter` 快捷键未正确传递 `editMessageId` 导致编辑被当做新消息发送的问题；<br>4. 优化 `handleSend` 结束后的状态同步，确保 UI 消息列表长度与后端严格一致，实现完美的“原位替换”效果。 |
| **侧边栏 (Sidebar)** | 重构为 "Claude-style" 悬浮展开模式（结合 `group-hover` 与 `backdrop-blur-xl`）；分离显式的桌面折叠状态控制 (`isCollapsedDesktop`)。优化移动端 padding 避免底部导航被截断。 |
| **用户管理** | `SettingsPanel` 增加账号管理（修改代号）；`Sidebar` 标题动态读取 `exo_user_nick`；利用 `window.dispatchEvent('user-nick-updated')` 实现跨组件的 localStorage 状态同步。保持气泡视图中仍统一显示 "You"。 |
| **记忆管理** | `MemoryManager` 增加 `scope` 支持（work/life/hobby/emotion）及手动录入功能，结合 `<datalist>` 实现 Tag 的自动补全。 |
| **新增弹窗** | `BranchSessionModal`: 点击“从此分叉”时弹出确认框，支持用户自定义新分支会话的名称。 |
| **Bugfix (白屏)** | 补全了 `ChatArea.jsx` 中缺失的 `Edit2` 图标和 `MemoryManager.jsx` 中缺失的 `Plus` 图标，解决了因 `lucide-react` 未导入导致的页面白屏问题。 |

---

## 2026-04-05

### 赛博朋克设计系统改造 + Home 控制台

**背景**：整体界面缺乏层次感和质感，字体无差异化，颜色对比过强伤眼。本次对全局设计系统和主要组件进行视觉翻新，并新增 Home 控制台入口。

**设计原则**
- 金色灯线克制：仅出现在关键边界（面板顶部分隔线、活跃项左侧指示条、输入框聚焦光晕）
- 字体统一换为 **Outfit 200**（极细，瘦长，大写效果干净），代码/数值用 **JetBrains Mono**
- 背景加入极淡蓝调（深蓝黑而非纯黑），正文色调暗，降低对比度护眼

**修改文件**

| 文件 | 改动 |
|---|---|
| `tailwind.config.js` | 字体族改为 Outfit + JetBrains Mono；颜色系扩充 `exo-metal`/`exo-surface`（深浅层次）；背景/文字色加入蓝调；新增 `animate-pulse-led`/`animate-fade-in` keyframes |
| `src/index.css` | 引入 Google Fonts（Outfit/JetBrains Mono）；body 基础字重 200；新增工具类 `.gold-line-top`、`.gold-line-bottom`、`.gold-indicator`、`.label-caps` |
| `src/components/layout/Sidebar.jsx` | 顶部渐变金线；活跃 tab 桌面左侧 2px 金条 / 移动端底部金线；六边形 logo 绑定 `home` tab 跳转 |
| `src/components/chat/ConversationList.jsx` | 容器背景 `exo-surface`；标题/分组标签改用 `.label-caps`；Council 状态徽徽章去饱和，改为细边框+低透明度 |
| `src/components/chat/ChatArea.jsx` | Header 边框减弱；状态指示点改用 `pulse-led`；工具栏选项（model/think/temp）改 `.label-caps`；输入框聚焦增加淡金色 shadow 光晕 |
| `src/components/chat/MessageBubble.jsx` | 发送者名称改 `.label-caps`；用户气泡背景改 `exo-metal`；Bookmark 面板顶部加金线 |

**新增文件**

| 文件 | 说明 |
|---|---|
| `src/components/home/HomePanel.jsx` | Home 控制台主视图：页头 + 4 个快捷导航卡（跳转 chat/agent_hub/profile/settings）+ 日程区域 |
| `src/components/home/CalendarWidget.jsx` | 日历组件：当月日历网格（今天金色高亮）+ Google Calendar 预留接口区（未连接状态）+ 本地任务（走 `/api/todos/` REST 接口） |

**API 接口预留（待后端实现）**

```
GET    /api/todos/          → Array<Todo>
POST   /api/todos/          body: { title, note?, deadline?, repeat }
PATCH  /api/todos/{id}/     body: Partial<Todo>
DELETE /api/todos/{id}/     → 204

Todo 字段：id, title, note, deadline(YYYY-MM-DD), repeat(none/daily/weekly/monthly/yearly), completed, created_at

GET    /api/gcal/events/?date=YYYY-MM-DD   → Array<GCalEvent>  （Google Calendar 预留）
GCalEvent 字段：id, title, start, end, calendar_id, color_id, all_day
```

**关键约定**
- Todo 数据不再存 localStorage，完全走后端 API（`credentials: 'include'` + CSRF token）
- 头像跨设备同步问题暂搁置，待后续确认图床方案
- 动态 Tailwind 模板字符串已有存量（ConversationList SessionItem），本次未新增

---

## 2026-03-30

### Council 议会系统 UI 重构（沉浸式群聊布局）

**背景**：前一版左导航 + 右切换视图的呈现方式过于分散。本次重构为沉浸式会议室体验。

**新增文件**

| 文件 | 说明 |
|---|---|
| `src/components/council/SubRosaBar.jsx` | 可折叠 Sub Rosa 面板。收起 = 40px bar；展开 = absolute overlay，`canInteract`（status==='finished'）时内嵌可交互 ChatArea，否则只读 CouncilStreamView |
| `src/components/council/CouncilGroupChat.jsx` | 群聊视图。顶部显示议题气泡（用户右侧），下方按**到达顺序**（`displayOrder`，首个 chunk 时记录）排列参与者线程，底部追加意见 textarea（综合/结束后隐藏） |

**修改文件**

| 文件 | 改动 |
|---|---|
| `src/components/council/CouncilArea.jsx` | 完整重构：`pre_alignment` 渲染 ChatArea + 分发按钮；Phase 1+ 渲染 SubRosaBar + CouncilGroupChat；synthesis 完成时 `synthBuffer.done` 边沿触发自动展开 SubRosaBar；移除左导航面板、synthesis modal、topic inline 输入框 |
| `src/components/council/CouncilStreamView.jsx` | 新增 `assistantOnly` prop（群聊里过滤 user 消息避免重复显示议题）和 `noScroll` prop（inline 展示，父容器统一滚动） |
| `src/components/chat/ChatArea.jsx` | 新增 `rightExtraButton` prop（在 send 按钮前插入自定义按钮，Phase 0 分发按钮用此注入）；新增 `onBack` prop（替代 mobile Menu 按钮，Phase 0 Sub Rosa 用此返回） |
| `src/components/chat/ConversationList.jsx` | 从 `councilSessions` 计算 `councilInternalIds`（phase0 / synthesis / 各参与者会话 ID），g045 和 standard 列表过滤掉这些内部会话 |

**关键约定（新增/变更）**

- Phase 0（`pre_alignment`）= 普通 1v1 ChatArea，标题 **Sub Rosa**，输入框右侧注入**分发**按钮（直接触发 dispatch，不传 topic，后端取 Arbitrator 最后消息）
- Phase 1+ = SubRosaBar（可折叠，收起态 40px）+ CouncilGroupChat 群聊
- 群聊参与者顺序：`displayOrder[]`，dispatch / cross_exam stream 第一个 chunk 到达时 append；重连时由 polling 补全已 done 的参与者
- 综合结束后（`synthBuffer.done` false→true）SubRosaBar **自动展开**，`canInteract=true`（status==='finished'）后 ChatArea 可继续对话
- 追加意见不再走 modal，直接读取 CouncilGroupChat 底部 textarea 的 `synthOpinion` state
- **待后端配合**：synthesis 流结束后将综合结论消息同步存入 `phase0_conversation_id` 对话，前端 Sub Rosa 展开后即可无缝展示

---

## 2026-03-29

### Council 议会系统前端接入（ReactSheet §19）

**新增文件**

| 文件 | 说明 |
|---|---|
| `src/utils/councilApi.js` | Council 全部 REST 接口封装 + 通用 SSE 流订阅函数 |
| `src/components/council/CouncilArea.jsx` | 议会主工作区：状态条、左导航、右会话视图、操作按钮、3s 轮询 |
| `src/components/council/CouncilStreamView.jsx` | 只读对话视图，复用 MessageBubble，支持流式内容追加 |
| `src/components/council/CouncilCreateModal.jsx` | 召集议会弹窗：仲裁者选择 + 参与者多选（≥2） |

**修改文件**

| 文件 | 改动 |
|---|---|
| `src/App.jsx` | 新增 `activeCouncilId` / `councilSessions` 状态；chat tab 优先渲染 CouncilArea |
| `src/components/chat/ConversationList.jsx` | 激活 Council Room 区域：实时列表 + 状态 badge + 召集按钮 |
| `src/components/chat/ChatArea.jsx` | 新增 `headerTitleOverride` prop 供 Sub rosa 场景覆盖标题 |

**关键约定**

- `phase0_conversation_id` 与 `synthesis_conversation_id` 对应的视图前端显示名统一为 **Sub rosa**
- dispatch / cross_exam 返回的多条 `stream_urls` 并行订阅，不串行
- 参与者 phase_status 指示点：idle=灰 / generating=金色脉冲 / done=绿
- 无新增动态 Tailwind 模板字符串（避免触发已知 lightningcss 构建问题）
## 2026-05-13

### 图片上传持久化与预览重构
- 移除了前端 localStorage 对于 Base64 图片预览的依赖，解决了长文本/多图片导致的存储溢出及图片丢失问题。
- 重构 ttachmentStorage.js 中的 enrichMessages，直接映射后端 GET /api/agents/chat/<id>/ 返回的 ttachments_meta 数据。
- 使用后端的 ile_uri 作为组件的 preview 源，结合 Nginx 的 /media/ 代理实现图片的持久化访问。
- 调整 nginx-local.conf 和 nginx.conf 增加 client_max_body_size 100M，加固大附件上传链路。

---

## 2026-05-18

### 会话界面 Bug 修复

**4 个已知问题修复：**

| Bug | 文件 | 修复方式 |
|---|---|---|
| Cache daemon tooltip 被顶部 banner 遮挡 | `ContextCacheIndicator.jsx` | 改用 `createPortal` 渲染 tooltip 到 `document.body`，`position:fixed` + `getBoundingClientRect()` 定位，`z-index:99999` |
| Attachments 管理列表窄屏右侧被截断 | `ChatArea.jsx:619` | 附件面板添加 inline style `maxWidth: calc(100vw - 2rem)` 防止视口溢出 |
| ConversationList 无整体滚动条，下方板块消失 | `ConversationList.jsx` | 外层容器 `overflow-hidden` → `overflow-y-auto`；移除各 section `max-h-[40%]`/`max-h-[55%]` 限制和独立 scrollbar |  
| 会话历史 content 不可编辑 + 缺少 Unresolved 筛选 | `ProposalEditPanel.jsx` + `SettingsPanel.jsx` | 新增 `summary` textarea（120px min-height）并纳入 PATCH payload；SettingsPanel 增加 Unresolved 筛选按钮，过滤 chunks |

### Telemetry 展示重构

- 后端 SSE `telemetry` 事件已下发 `input_chars` / `output_chars` / `cached_input_chars` / `tool_calls` / `model_name` / `platform`，但前端仅渲染了一行 `TX:|RX:`。
- 新增 `sessionTelemetryRef` (useRef) 在整个会话生命周期内累积每次请求的数据。
- **紧凑模式**：bot control bar 右侧显示 `● model_name TX:1,234 RX:567 CACHE:78% TOOLS:3`，一目了然。
- **展开面板**：点击紧凑条弹出 Session Totals（Requests / Total TX / Total RX / Total Cached / Cache Hit Rate / Tool Calls），`absolute bottom-full` 定位。
- 切换会话时自动重置累积数据和展开状态。
- 延迟字段（latency）暂未由后端下发，已标注在计划文档中待后续补充。


