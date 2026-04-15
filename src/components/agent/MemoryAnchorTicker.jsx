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
      <div className="h-16 flex items-center justify-center border border-dashed border-exo-mist-10 rounded-[2px] bg-black/20 text-[10px] text-exo-muted/40 font-mono uppercase tracking-widest">
        <Activity size={12} className="mr-2 animate-pulse" /> Core Memory Scan: [NULL]
      </div>
    );
  }

  const anchor = anchors[currentIndex];
  const cleanPattern = anchor.pattern.replace(/[()[\]]/g, "");
  const keywords = cleanPattern.split('|').map(k => k.trim()).filter(Boolean).slice(0, 2);

  return (
    <div className="rounded-[2px] bg-black/40 border border-exo-mist-10 p-4 shadow-inner">
      <div className={`transition-all duration-400 ${isFading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
            {keywords.map((kw, i) => (
              <span key={i} className={`text-[9px] px-2 py-0.5 rounded-[2px] font-mono font-bold uppercase tracking-widest whitespace-nowrap ${
                anchor.is_persistent
                  ? 'bg-exo-accent/15 text-exo-accent border border-exo-accent/30'
                  : 'bg-white/5 text-exo-muted border border-exo-mist-10'
              }`}>
                {kw}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {anchor.is_persistent && <ShieldAlert size={10} className="text-exo-accent animate-pulse" title="Persistent Weight" />}
            <span className="text-[9px] text-exo-muted font-mono bg-black px-1.5 py-0.5 rounded-[2px] border border-exo-mist-10 font-bold">
              W:{anchor.current_weight.toFixed(2)}
            </span>
          </div>
        </div>
        <div ref={noteRef} className="h-10 overflow-hidden">
          <p className="text-[11px] text-white/50 leading-relaxed font-mono tracking-tight italic">
            "{anchor.essential_note}"
          </p>
        </div>
      </div>
    </div>
  );
};

export default MemoryAnchorTicker;
