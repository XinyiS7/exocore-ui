# AsyncChatPolling Implementation Plan

## What
Implement a custom React hook `usePollingChat` to support an asynchronous, polling-based chat mode as an alternative to the existing Server-Sent Events (SSE) mode. 

## Where
- **Hook**: `src/hooks/usePollingChat.js`
- **Integration**: `src/components/chat/ChatArea.jsx`

## Why
To support backend environments or models where long-lived connections (SSE) are unreliable or unsupported, falling back to a robust polling mechanism. The typing animation simulates the streaming experience for users.

## Steps

### 1. Create `usePollingChat` hook
- Implement `sendMessageAsync(payload, sessionId, signal)` function inside the hook.
- It will execute `POST /api/agents/chat/<sid>/?mode=async` with the provided content.
- It will receive `{ message_id, status }`.
- It will start a 500ms polling interval querying `GET /api/agents/chat/<sid>/status/?message_id=<token>&cursor=<N>`.
- The hook will expose callbacks:
  - `onDelta(delta)`: Called when new text is received.
  - `onComplete()`: Called when status is `done`.
  - `onError(error)`: Called if an error occurs.
- It handles the "typewriter animation" incrementally passing pieces of the delta.

### 2. Update `ChatArea.jsx`
- Add a new state `chatMode` defaulting to `'sse'` (or `'async'` based on UI controls).
- Keep the existing `handleSend` implementation for the SSE mode.
- Branch `handleSend` logic to use `usePollingChat` logic when `mode='async'`.
- Pass necessary callbacks to the hook (`onDelta`, `onComplete`, `onError`) to mimic the state updates done in the SSE `content` event.
- *Wait*, instead of a separate UI toggle right now, since the spec says "Keep SSE path for mode=sse", I'll add a UI toggle (a simple select next to the model selector) to let the user choose the communication mode.

### 3. Typewriter Animation Details
- The backend polling endpoint returns `{ status, delta, cursor }`.
- In `ChatArea`, when `onDelta` is called with new text, we append it to the current AI message's `content` state.
- Because polling delivers larger chunks every 500ms, to make it smooth (typewriter effect), the hook itself should internally buffer the `delta` and use `requestAnimationFrame` or `setTimeout` to yield character-by-character (or small chunks) to the `onDelta` callback between the 500ms polls.

## Review Request
This plan follows the specifications in the prompt. Proceeding to implement.
