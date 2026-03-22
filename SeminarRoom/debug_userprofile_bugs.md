# UserProfile Bug Analysis — for Claude & Gemini

Date: 2026-03-22
Files involved: `src/components/UserProfile.jsx`, `src/components/modals/AvatarCropModal.jsx`

---

## Bug 1: 拼音输入被打断 / 光标被强制跳回

### 现象
在回复框（TweetCard 内的 textarea）中用拼音输入时，每打一个字母，光标就被强制移到末尾，或者整个输入法候选框消失，组合输入被中断。

### 根本原因

**`TweetCard` 组件定义在 `UserProfile` 函数体内部（第 180 行）。**

```jsx
// UserProfile.jsx
const UserProfile = ({ presets }) => {
  const [replyContent, setReplyContent] = useState('');
  // ...

  const TweetCard = ({ tweet, depth }) => {  // <-- 每次渲染都是新函数引用
    // ...包含 reply textarea
  };
};
```

每当用户在 reply textarea 里打字，`setReplyContent` 触发 `UserProfile` re-render，这会生成一个**全新的 `TweetCard` 函数引用**。React 通过引用比较组件类型，认为新旧 `TweetCard` 是不同的组件，因此**卸载所有旧 TweetCard 实例，挂载全新实例**。
这会直接销毁正在输入的 textarea DOM 节点，打断 IME（输入法）的 composition 会话。

同理，`newPostContent` 变化时也会重新创建 `TweetCard` 引用，连带影响所有已展开的 reply 框。

### 修复方案

将 `TweetCard` 提取到 `UserProfile` 函数**外部**，通过 props 传入所需的状态和回调：

```jsx
// 移到 UserProfile 外面
const TweetCard = ({ tweet, depth, replyingToId, replyContent, setReplyContent, setReplyingToId, isSubmittingReply, handleReply, getAuthorInfo }) => {
  // ...原有逻辑不变，但改用 props
};

const UserProfile = ({ presets }) => {
  // ...
  return (
    // ...
    <TweetCard
      tweet={tweet}
      depth={0}
      replyingToId={replyingToId}
      replyContent={replyContent}
      setReplyContent={setReplyContent}
      setReplyingToId={setReplyingToId}
      isSubmittingReply={isSubmittingReply}
      handleReply={handleReply}
      getAuthorInfo={getAuthorInfo}
    />
  );
};
```

或者，也可以用 `useCallback` 稳定回调引用，但核心问题是组件定义位置，必须移出去。

### 注意
- `getAuthorInfo` 依赖 `presets` 和 `userAvatarUrl`，需要一并传入或用 `useCallback` 包裹后传入
- reply 框的 `onKeyDown` 里已有 `!e.isComposing` 判断（第 210 行），这部分是对的，不需要改

---

## Bug 2: 头像裁剪弹窗只能缩放，无法拖动

### 现象
打开 `AvatarCropModal` 后，滚轮缩放正常，但鼠标按下拖拽图片没有任何反应（位置不移动）。

### 嫌疑原因 A：`pointercancel` 被浏览器触发

容器 div 没有设置 `touch-action: none`。在支持触摸的设备（含触控板笔记本）上，浏览器检测到 `pointerdown` 后，如果不确定是否要接管手势（滚动/缩放），会在短暂等待后发出 `pointercancel` 事件，这会触发 `onPointerCancel={onPointerUp}`，将 `dragRef.current` 重置为 `null`，导致后续 `onPointerMove` 里 `if (!dragRef.current) return` 直接退出。

**用户感受**：点下去瞬间拖拽被取消，完全没有移动效果。而 `wheel` 事件走的是另一条路（`addEventListener` + `preventDefault`），不受影响，所以缩放正常。

**修复**：给裁剪容器加 `touch-action: none`（Tailwind 没有内置这个，需要 inline style 或 arbitrary value）

```jsx
<div
  ref={cropContainerRef}
  className="relative rounded-full border-2 border-exo-gold/60 overflow-hidden cursor-move select-none bg-black"
  style={{ width: CROP_SIZE, height: CROP_SIZE, flexShrink: 0, touchAction: 'none' }}
  // ...
>
```

### 嫌疑原因 B：React 合成事件与 `setPointerCapture` 的时机问题

`setPointerCapture` 必须在同步的 `pointerdown` 事件处理器中调用，且调用对象必须是真实 DOM 节点。React 的 `e.currentTarget` 在合成事件中是正确的 DOM 节点，但某些版本/环境下可能存在时序问题。

备选写法：通过 `ref` 直接操作 DOM，在 `useEffect` 里用 `addEventListener` 注册 pointer 事件（和 wheel/touchmove 一样），避开 React 合成事件层：

```js
useEffect(() => {
  const el = cropContainerRef.current;
  if (!el) return;

  const onDown = (e) => {
    el.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY };
  };
  const onMove = (e) => {
    if (!dragRef.current) return;
    setPos(p => ({ x: p.x + e.clientX - dragRef.current.x, y: p.y + e.clientY - dragRef.current.y }));
    dragRef.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = () => { dragRef.current = null; };

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);

  return () => {
    el.removeEventListener('pointerdown', onDown);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', onUp);
    el.removeEventListener('pointercancel', onUp);
  };
}, []); // dragRef 是 ref，闭包里 .current 始终最新
```

同时移除 JSX 上的 `onPointerDown/Move/Up/Cancel` 属性。

### 嫌疑原因 C：中间层 div 吃掉事件（可能性较低）

容器里有一个 `position: absolute, inset: 0` 的 wrapper div，它覆盖整个圆形区域。图片本身有 `pointerEvents: 'none'`，但 wrapper div 没有。理论上事件会冒泡到容器，但不排除某些浏览器/情况下冒泡被意外阻断。

保险起见可以给 wrapper div 也加 `pointerEvents: 'none'`：

```jsx
<div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
```

---

## 建议修复顺序

1. **先改 Bug 1**（TweetCard 外移）—— 这个原因明确，改动收益大，不影响样式
2. **Bug 2 先试 A**（加 `touchAction: 'none'`）—— 一行代码，成本最低
3. 如果 A 无效，**再试 B**（改用 addEventListener 注册 pointer 事件）
4. C 作为辅助保险可以同时加上

---

*请 Gemini 也看看这两个分析，有不同判断的话欢迎标注在这个文件里或另开文件~*
