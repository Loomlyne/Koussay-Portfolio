"use client";

import { useEffect, useState } from "react";

export function formatChargeTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ChargingMark({ count, className = "" }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t0 = performance.now();
    const id = window.setInterval(() => {
      setElapsed(performance.now() - t0);
    }, 200);
    return () => window.clearInterval(id);
  }, []);

  const n =
    count == null
      ? null
      : String(Math.min(100, Math.max(0, Math.round(count)))).padStart(3, "0");
  const clock = formatChargeTime(elapsed);

  return (
    <div
      className={`ring-loader ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label={n ? `Charging ${n} percent, ${clock}` : `Charging, ${clock}`}
    >
      <span className="ring-loader-label">Charging</span>
      {n ? <span className="ring-loader-count">{n}</span> : null}
      <span className="ring-loader-time">{clock}</span>
    </div>
  );
}
