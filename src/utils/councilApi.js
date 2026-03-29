import { baseUrl, getCsrfToken } from './api';

// ── REST helpers ────────────────────────────────────────────

export const createCouncilSession = async ({ name, arbitratorPresetId, participantPresetIds }) => {
  const res = await fetch(`${baseUrl}/api/council/sessions/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
    credentials: 'include',
    body: JSON.stringify({
      name: name || undefined,
      arbitrator_preset_id: arbitratorPresetId,
      participant_preset_ids: participantPresetIds,
    }),
  });
  if (!res.ok) throw new Error(`创建议会失败: ${res.status}`);
  return res.json();
};

export const listCouncilSessions = async () => {
  const res = await fetch(`${baseUrl}/api/council/sessions/`, { credentials: 'include' });
  if (!res.ok) throw new Error(`获取议会列表失败: ${res.status}`);
  return res.json();
};

export const getCouncilSession = async (sessionId) => {
  const res = await fetch(`${baseUrl}/api/council/sessions/${sessionId}/`, { credentials: 'include' });
  if (!res.ok) throw new Error(`获取议会详情失败: ${res.status}`);
  return res.json();
};

export const dispatchCouncil = async (sessionId, topic) => {
  const res = await fetch(`${baseUrl}/api/council/sessions/${sessionId}/dispatch/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
    credentials: 'include',
    body: JSON.stringify(topic ? { topic } : {}),
  });
  if (!res.ok) throw new Error(`分发失败: ${res.status}`);
  return res.json();
};

export const crossExamCouncil = async (sessionId) => {
  const res = await fetch(`${baseUrl}/api/council/sessions/${sessionId}/cross_exam/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
    credentials: 'include',
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`互审失败: ${res.status}`);
  return res.json();
};

export const synthesizeCouncil = async (sessionId, userOpinion) => {
  const res = await fetch(`${baseUrl}/api/council/sessions/${sessionId}/synthesize/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
    credentials: 'include',
    body: JSON.stringify(userOpinion ? { user_opinion: userOpinion } : {}),
  });
  if (!res.ok) throw new Error(`综合失败: ${res.status}`);
  return res.json();
};

export const finishCouncil = async (sessionId) => {
  const res = await fetch(`${baseUrl}/api/council/sessions/${sessionId}/finish/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
    credentials: 'include',
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`结束议会失败: ${res.status}`);
};

// ── SSE stream subscriber ───────────────────────────────────
// onChunk(type, text) — called for 'thinking' | 'content' events
// onDone()           — called when stream completes
// onError(err)       — called on fetch/parse error
// Returns a cancel function.

export const subscribeStream = (url, onChunk, onDone, onError) => {
  let cancelled = false;

  (async () => {
    try {
      const res = await fetch(`${baseUrl}${url}`, { credentials: 'include' });
      if (!res.ok) {
        onError(new Error(`SSE 请求失败: ${res.status}`));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop();

        for (const block of blocks) {
          if (!block.trim()) continue;
          const lines = block.split('\n');
          let eventType = 'message';
          let dataStr = '';
          for (const line of lines) {
            if (line.startsWith('event:')) eventType = line.substring(6).trim();
            else if (line.startsWith('data:')) dataStr += line.substring(5).trim();
          }
          if (!dataStr) continue;
          if (eventType === 'done' || dataStr === '[DONE]') {
            onDone();
            return;
          }
          if (eventType === 'error') {
            onError(new Error(dataStr));
            return;
          }
          if (eventType === 'thinking' || eventType === 'content') {
            try {
              const text = JSON.parse(dataStr);
              onChunk(eventType, text);
            } catch {
              onChunk(eventType, dataStr);
            }
          }
        }
      }
      if (!cancelled) onDone();
    } catch (err) {
      if (!cancelled) onError(err);
    }
  })();

  return () => { cancelled = true; };
};
