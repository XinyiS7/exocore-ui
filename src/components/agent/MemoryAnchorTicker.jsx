import React, { useState, useEffect, useRef } from 'react';
import { Activity, ShieldAlert } from 'lucide-react';

const MemoryAnchorTicker = ({ anchors = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFading, setIsFading] = useState(true);
  const noteRef = useRef(null);
  const scrollRafRef = useRef(null);

  useEffect(() => {
    if (anchors.length <= 1) return;
    const timer = setInterval(() => {
      setIsFading(false);
      setTimeout(() => { setCurrentIndex(prev => (prev + 1) % anchors.length); setIsFading(true); }, 400);
    }, 8000);
    return () => clearInterval(timer);
  }, [anchors.length]);

  useEffect(() => {
    const el = noteRef.current;
    if (!el) return;
    el.scrollTop = 0;
    if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);

    const delay = setTimeout(() => {
      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll <= 0) return;
      const duration = 5000;
      const startTime = performance.now();
      const tick = (now) => {
        const t = Math.min((now - startTime) / duration, 1);
        el.scrollTop = t * maxScroll;
        if (t < 1) scrollRafRef.current = requestAnimationFrame(tick);
      };
      scrollRafRef.current = requestAnimationFrame(tick);
    }, 1200);

    return () => { clearTimeout(delay); if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current); };
  }, [currentIndex]);

  if (anchors.length === 0) {
    return (
      <div className="h-16 flex items-center justify-center border border-dashed border-exo-border rounded-lg bg-black/20 text-xs text-exo-muted font-mono">
        <Activity size={12} className="mr-2 animate-pulse" /> Scanning Core Memories... [NULL]
      </div>
    );
  }

  const anchor = anchors[currentIndex];
  const cleanPattern = anchor.pattern.replace(/[()[\]]/g, "");
  const keywords = cleanPattern.split('|').map(k => k.trim()).filter(Boolean).slice(0, 2);

  return (
    <div className="rounded-lg bg-[#0d0e12] border border-exo-border p-3 shadow-inner">
      <div className={`transition-all duration-400 ${isFading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex flex-wrap gap-1 flex-1 min-w-0">
            {keywords.map((kw, i) => (
              <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded font-mono whitespace-nowrap ${
                anchor.is_persistent
                  ? 'bg-exo-accent/15 text-exo-accent border border-exo-accent/40'
                  : 'bg-white/5 text-gray-300 border border-white/10'
              }`}>
                {kw}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
            {anchor.is_persistent && <ShieldAlert size={11} className="text-exo-accent" title="Persistent" />}
            <span className="text-[10px] text-exo-muted font-mono bg-black/60 px-1.5 py-0.5 rounded border border-exo-border">
              {anchor.current_weight.toFixed(2)}
            </span>
          </div>
        </div>
        <div ref={noteRef} className="h-9 overflow-hidden">
          <p className="text-[11px] text-gray-400 leading-relaxed">{anchor.essential_note}</p>
        </div>
      </div>
    </div>
  );
};

export default MemoryAnchorTicker;
