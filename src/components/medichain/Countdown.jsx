import React, { useState, useEffect } from "react";

export function formatRemaining(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function Countdown({ expiresAt, onEnd }) {
  const compute = () =>
    expiresAt ? Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)) : 0;
  const [left, setLeft] = useState(compute);

  useEffect(() => {
    setLeft(compute());
    const iv = setInterval(() => {
      const l = compute();
      setLeft(l);
      if (l <= 0) {
        clearInterval(iv);
        if (onEnd) onEnd();
      }
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  return <span className="tabular-nums">{formatRemaining(left)}</span>;
}