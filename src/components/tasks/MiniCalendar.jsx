// src/components/tasks/MiniCalendar.jsx
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function buildGrid(year, month) {
  // Monday-first grid. Returns array of {day: number|null, iso: string|null}
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const offset = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push({ day: null, iso: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, iso });
  }
  return cells;
}

function getDotDays(entries) {
  // Returns a Set of ISO date strings that have at least one relevant entry
  const days = new Set();
  entries.forEach(e => {
    if (e.entry_type === 'todo'     && e.due_date)          days.add(e.due_date);
    if (e.entry_type === 'periodic' && e.next_periodic_due) days.add(e.next_periodic_due);
    if (e.entry_type === 'goal'     && e.cycle_start && e.cycle_due) {
      let cur = new Date(e.cycle_start);
      const end = new Date(e.cycle_due);
      while (cur <= end) {
        days.add(cur.toISOString().slice(0, 10));
        cur.setDate(cur.getDate() + 1);
      }
    }
  });
  return days;
}

export default function MiniCalendar({ selectedDate, onSelectDate, entries = [] }) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const initYear  = parseInt(selectedDate.slice(0, 4));
  const initMonth = parseInt(selectedDate.slice(5, 7)) - 1;
  const [viewYear,  setViewYear]  = useState(initYear);
  const [viewMonth, setViewMonth] = useState(initMonth);

  const cells   = buildGrid(viewYear, viewMonth);
  const dotDays = getDotDays(entries);

  const prevMonth = () => {
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    const m = viewMonth === 0 ? 11 : viewMonth - 1;
    setViewYear(y);
    setViewMonth(m);
    const first = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    onSelectDate(first);
  };

  const nextMonth = () => {
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    const m = viewMonth === 11 ? 0 : viewMonth + 1;
    setViewYear(y);
    setViewMonth(m);
    const first = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    onSelectDate(first);
  };

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long',
  });

  return (
    <div className="px-3 py-4 select-none">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1 text-exo-muted/40 hover:text-exo-muted transition-colors rounded">
          <ChevronLeft size={13} />
        </button>
        <span className="text-[10px] uppercase tracking-widest text-exo-text/70">{monthLabel}</span>
        <button onClick={nextMonth} className="p-1 text-exo-muted/40 hover:text-exo-muted transition-colors rounded">
          <ChevronRight size={13} />
        </button>
      </div>

      {/* DOW header */}
      <div className="grid grid-cols-7 mb-1">
        {DOW.map(d => (
          <div key={d} className="text-center text-[9px] text-exo-muted/30 uppercase tracking-wide py-0.5">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((cell, i) => {
          if (!cell.iso) return <div key={i} />;
          const isToday    = cell.iso === todayIso;
          const isSelected = cell.iso === selectedDate;
          const hasDot     = dotDays.has(cell.iso);
          return (
            <button
              key={cell.iso}
              onClick={() => onSelectDate(cell.iso)}
              className={[
                'relative flex flex-col items-center justify-center rounded-lg py-1 text-[11px] transition-all',
                isSelected
                  ? 'bg-exo-accent/20 text-exo-accent'
                  : isToday
                    ? 'border border-exo-gold/50 text-exo-text/80 hover:bg-white/5'
                    : 'text-exo-muted/50 hover:bg-white/5',
              ].join(' ')}
            >
              {cell.day}
              {hasDot && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-exo-accent/50" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
