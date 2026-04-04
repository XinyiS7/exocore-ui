# Frontend Work Log

> 改动前请先查阅 **ReactSheet.txt** 确认接口格式、字段名、状态机流转，再动手写代码。

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
