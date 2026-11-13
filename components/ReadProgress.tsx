"use client";
import { useEffect, useState } from "react";

// A thin glowing thread across the top of the window that fills as you read the target element.
export function ReadProgress({ targetId }: { targetId: string }) {
  const [p, setP] = useState(0);

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      const done = -r.top + window.innerHeight * 0.2;
      // Rounded to 0.1% so React only re-renders when the bar visibly moves.
      setP(total > 0 ? Math.round(Math.max(0, Math.min(1, done / total)) * 1000) / 1000 : 0);
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => { window.removeEventListener("scroll", measure); window.removeEventListener("resize", measure); };
  }, [targetId]);

  return (
    <div className="rp" role="progressbar" aria-label="Reading progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)}>
      <span className="rp-fill" style={{ transform: `scaleX(${p})` }} />
    </div>
  );
}
