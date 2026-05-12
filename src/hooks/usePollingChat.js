import { useRef, useCallback } from 'react';
import { baseUrl, getCsrfToken } from '../utils/api';

export const usePollingChat = () => {
  const isPollingRef = useRef(false);
  const typewriterTimerRef = useRef(null);
  const pollingTimerRef = useRef(null);

  const sendMessageAsync = useCallback((payload, sessionId, signal, onDelta) => {
    return new Promise(async (resolve, reject) => {
      isPollingRef.current = true;
      let currentCursor = 0;
      let messageId = null;
      const typewriterQueue = []; // Array of { text: string, type: string }
      let isFlushing = false;

      const cleanup = () => {
        isPollingRef.current = false;
        if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current);
        if (typewriterTimerRef.current) clearTimeout(typewriterTimerRef.current);
      };

      const onAbort = () => {
        cleanup();
        reject(new DOMException('Aborted', 'AbortError'));
      };
      if (signal) {
        signal.addEventListener('abort', onAbort);
      }

      const flushTypewriter = () => {
        if (!isPollingRef.current) return;
        if (typewriterQueue.length > 0) {
          const first = typewriterQueue[0];
          const chunk = first.text.substring(0, 5); // Typing slightly faster
          first.text = first.text.substring(5);
          
          onDelta(chunk, first.type);
          
          if (first.text.length === 0) {
            typewriterQueue.shift();
          }
          typewriterTimerRef.current = setTimeout(flushTypewriter, 20); 
        } else {
          isFlushing = false;
        }
      };

      try {
        const fetchOptions = {
          method: 'POST',
          headers: { 'X-CSRFToken': getCsrfToken() },
          credentials: 'include',
          signal
        };

        if (payload instanceof FormData) {
          fetchOptions.body = payload;
        } else {
          fetchOptions.headers['Content-Type'] = 'application/json';
          fetchOptions.body = JSON.stringify(payload);
        }

        const response = await fetch(`${baseUrl}/api/agents/chat/${sessionId}/?mode=async`, fetchOptions);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        messageId = data.message_id;

        if (!messageId) throw new Error('No message_id returned');

        const poll = async () => {
          if (!isPollingRef.current) return;
          try {
            const pollRes = await fetch(`${baseUrl}/api/agents/chat/${sessionId}/status/?message_id=${messageId}&cursor=${currentCursor}`, {
              headers: { 'X-CSRFToken': getCsrfToken() },
              credentials: 'include',
              signal
            });
            
            if (!pollRes.ok) throw new Error(`HTTP ${pollRes.status}`);
            const pollData = await pollRes.json();
            
            // Handle multiple events if supported by backend, or single delta
            const events = pollData.events || (pollData.delta ? [{ delta: pollData.delta, event_type: pollData.event_type || 'content' }] : []);
            
            if (events.length > 0) {
              let totalDeltaLen = 0;
              events.forEach(ev => {
                totalDeltaLen += ev.delta.length;
                if (typewriterQueue.length > 0 && typewriterQueue[typewriterQueue.length - 1].type === ev.event_type) {
                  typewriterQueue[typewriterQueue.length - 1].text += ev.delta;
                } else {
                  typewriterQueue.push({ text: ev.delta, type: ev.event_type });
                }
              });

              currentCursor = pollData.cursor !== undefined ? pollData.cursor : currentCursor + totalDeltaLen;
              
              if (!isFlushing) {
                isFlushing = true;
                flushTypewriter();
              }
            }

            if (pollData.status === 'done' || pollData.status === 'error') {
              cleanup();
              if (signal) signal.removeEventListener('abort', onAbort);
              
              const flushRemaining = () => {
                while (typewriterQueue.length > 0) {
                  const ev = typewriterQueue.shift();
                  onDelta(ev.text, ev.type);
                }
                if (pollData.status === 'error') {
                   reject(new Error(pollData.error_message || 'Server error'));
                } else {
                   resolve();
                }
              };
              flushRemaining();
              return;
            }

            if (isPollingRef.current) {
              pollingTimerRef.current = setTimeout(poll, 500);
            }
          } catch (err) {
             if (err.name === 'AbortError') return;
             cleanup();
             if (signal) signal.removeEventListener('abort', onAbort);
             reject(err);
          }
        };

        pollingTimerRef.current = setTimeout(poll, 500);
      } catch (err) {
        cleanup();
        if (signal) signal.removeEventListener('abort', onAbort);
        reject(err);
      }
    });
  }, []);

  const abortPolling = useCallback(() => {
    isPollingRef.current = false;
    if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current);
    if (typewriterTimerRef.current) clearTimeout(typewriterTimerRef.current);
  }, []);

  return { sendMessageAsync, abortPolling };
};
