# Task Panel — Design Spec
**Date:** 2026-04-09  
**Feature:** Chronos System · 日程与习惯追踪  
**Backend API:** `/api/tasks/` (Section 21, ReactSheet.txt)

---

## 1. Overview

新增独立的 `calendar` 标签页，替换当前 `CalendarWidget` 中的旧版 `/api/todos/` 逻辑。分为两个视图层：

- **TaskPanel**（`calendar` tab）：完整的增删改查管理界面
- **CalendarWidget 今日摘要**（HomePanel）：轻量只读 + 快速打卡，保留月历，移除旧 todo CRUD

---

## 2. Entry Types

后端支持三种 `entry_type`，UI 行为各异：

| 类型 | 标识 | 关键字段 | 行动 |
|------|------|---------|------|
| `todo` | ○ | `due_date` | 完成 → 归档（软删除） |
| `periodic` | ↻ | `next_periodic_due`, `interval_unit/value`, `end_type` | 打卡 → `occurrences_done++`，显示下次截止 |
| `goal` | ◎ | `current_cycle_completions / goal_count`, `cycle_due` | 打卡 → 进度条更新，允许超量 |

---

## 3. 文件结构

```
src/
  utils/
    tasksApi.js              # 新建：所有 /api/tasks/ 请求封装
  components/
    tasks/
      TaskPanel.jsx          # 新建：主面板（左栏 + 右栏）
      TaskCreateModal.jsx    # 新建：新建/编辑 Modal（type 切换动态字段）
      TaskRow.jsx            # 新建：单条任务行（折叠/展开）
    home/
      CalendarWidget.jsx     # 修改：移除旧 todo CRUD，加入今日任务摘要
  App.jsx                    # 修改：calendar case 替换占位符
```

---

## 4. TaskPanel 布局

左右分栏，左栏固定 220px，右栏 flex-1：

**左栏**
- 月历网格：从 CalendarWidget 提取 `buildCalendarGrid` 逻辑复用，不重写
- Type 筛选：全部 / Todo / 周期 / 目标（radio 样式）
- Status 筛选：进行中 / 已挂起（进行中默认选中）

**右栏**
- Header：`· · CHRONOS SYSTEM · ·` 标题 + `[＋ 新建任务]` 按钮
- Type tab 快速过滤（与左栏联动）
- 任务列表，按三段分组显示：
  1. 📌 置顶 / Escalated（金边卡片，跨类型）
  2. Todo 段
  3. 周期任务段
  4. 目标段
- 每段为空时不显示该段 header

---

## 5. TaskRow 组件

**折叠态**（默认）
```
[类型图标]  标题  [type badge]  元信息（due/next/进度条）  [✓打卡]  [···菜单]
```

- ⚠ 今日截止 / 已逾期：左侧 2px `border-l border-amber-400/60`
- 目标进度条：`current_cycle_completions / goal_count`，达标后变绿
- `[✓]` 打卡按钮：POST `/complete/`，成功后乐观更新本地状态

**展开态**（点击行展开，不跳页）
- 描述、开始日期、标签
- 已打卡次数 + 最近5条记录（来自 `GET /api/tasks/completions/?entry=<pk>`）
- GCal 操作：`gcal_event_link` 非空显示外链，始终显示推送/取消按钮

**三点菜单项**
```
编辑 | 置顶/取消置顶 | ── | 推送到 GCal | 取消 GCal 链接 | ── | 挂起/恢复 | 删除（归档）
```

---

## 6. TaskCreateModal 组件

- Type 选择器：三个 tab，选定后不可更改（后端限制）
- 公共字段：标题（required）、开始日期（required）、描述、标签
- 动态字段：
  - **todo**：截止日期
  - **periodic**：间隔数 + 单位（天/周/月）；结束方式（永不/次数/日期）
  - **goal**：每 [周期] 完成 [N] 次；周期开始日 + 截止日
- 编辑态：预填所有字段，type 选择器禁用
- 提交：POST（新建）或 PATCH（编辑），成功后刷新列表，关闭 modal

---

## 7. CalendarWidget 修改（HomePanel）

移除旧 `/api/todos/` CRUD，保留月历网格。原"本地任务"区域替换为：

**今日任务摘要**
- 拉取 `GET /api/tasks/entries/?status=active`，客户端筛选今日相关（due today / next_periodic_due today / cycle_due within week）
- 最多显示5条，超出固定高度可滚动
- 每条显示：类型图标 + 标题 + 简短元信息 + `[✓]` 打卡按钮
- 底部固定一行 `[查看全部 →]` → `setCurrentTab('calendar')`
- GCal 占位区块保持不变（disabled 状态）

---

## 8. tasksApi.js 接口

```js
fetchEntries(params)            // GET /api/tasks/entries/
fetchEntry(id)                  // GET /api/tasks/entries/<pk>/
createEntry(data)               // POST /api/tasks/entries/
updateEntry(id, data)           // PATCH /api/tasks/entries/<pk>/
deleteEntry(id)                 // DELETE（软删除 → archived）
completeEntry(id, note?)        // POST /api/tasks/entries/<pk>/complete/
suspendEntry(id)                // POST /api/tasks/entries/<pk>/suspend/
resumeEntry(id)                 // POST /api/tasks/entries/<pk>/resume/
syncGcal(id)                    // POST /api/tasks/entries/<pk>/gcal/
unsyncGcal(id)                  // DELETE /api/tasks/entries/<pk>/gcal/
fetchCompletions(entryId)       // GET /api/tasks/completions/?entry=<pk>
```

所有写操作使用 `getCsrfToken()`，所有请求带 `credentials: 'include'`。

---

## 9. 状态管理

TaskPanel 内部维护所有状态（`useState`），不引入全局 store：

- `entries` — 当前列表
- `filters` — `{ type: 'all'|'todo'|'periodic'|'goal', status: 'active'|'suspended' }`
- `expandedId` — 当前展开行的 id（同一时间只展开一行）
- `editingEntry` — 传入 modal 的 entry（null = 新建模式）
- `menuOpenId` — 三点菜单当前打开的行

打卡后乐观更新本地 `entries` 中对应条目的 `current_cycle_completions` / `occurrences_done`，不重新拉取整个列表。

---

## 10. 样式对齐

见 `TaskPanel_Layout.txt` 第6节，使用现有 `exo-*` 设计系统变量，不新增颜色。

Type badge 颜色：
- `todo` → `text-blue-400 bg-blue-400/10`
- `periodic` → `text-purple-400 bg-purple-400/10`  
- `goal` → `text-exo-accent bg-exo-accent/10`

置顶/escalated 卡片：`border border-exo-gold/30 bg-exo-gold/[0.04]`

---

## 11. 不在本次范围内

- GCal OAuth 连接流程（继续占位显示）
- 移动端底部导航栏的 calendar 入口（结构已预留，后续统一处理）
- 打卡时添加 note 的输入框（后端支持但 UI 暂不实现）
