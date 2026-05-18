'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

interface TimerProps {
  totalSeconds: number;
  onTimeUp: () => void;
  running: boolean;
}

export default function Timer({ totalSeconds, onTimeUp, running }: TimerProps) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) {
      onTimeUpRef.current();
      return;
    }
    const id = setInterval(() => {
      setRemaining((r) => {
        const next = r - 1;
        if (next <= 0) {
          clearInterval(id);
          setTimeout(() => onTimeUpRef.current(), 0);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, remaining]);

  const minutes = Math.floor(Math.max(0, remaining) / 60);
  const seconds = Math.max(0, remaining) % 60;
  const pct = (remaining / totalSeconds) * 100;
  const urgent = remaining < 300; // < 5 minutes

  return (
    <div className="flex items-center gap-3">
      <div className={`text-2xl font-mono font-bold tabular-nums ${urgent ? 'text-red-500 animate-pulse' : 'text-slate-700'}`}>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>
      <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${urgent ? 'bg-red-500' : pct > 30 ? 'bg-blue-500' : 'bg-amber-500'}`}
          style={{ width: `${Math.max(0, pct)}%` }}
        />
      </div>
    </div>
  );
}
