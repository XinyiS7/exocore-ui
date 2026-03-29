# Frontend Work Log

> 改动前请先查阅 **ReactSheet.txt** 确认接口格式、字段名、状态机流转，再动手写代码。

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
