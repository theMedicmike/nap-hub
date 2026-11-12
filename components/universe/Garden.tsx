"use client";
import { useEffect, useRef, useState } from "react";
import { GRADES, GRADE_TOTAL } from "@/lib/universe";

const BLOOM = ["#e9f29a", "#cfe27c", "#a9cf78", "#8fae86", "#7d8a98"];

// The evidence garden: one plant per grade. Taller plants mean stronger evidence; the count is
// how many of the 184 graded links landed in that grade. Server-rendered fully grown; it only
// "grows in" once JavaScript is running and the garden scrolls into view.
export function Garden() {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"static" | "wait" | "grow">("static");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    setPhase("wait");
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setPhase("grow"); io.disconnect(); }
    }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className={`gd gd-${phase}`} ref={ref}>
      <div className="gd-bed" role="list" aria-label={`Evidence grades across ${GRADE_TOTAL} graded links`}>
        {GRADES.map((g, i) => {
          const H = Math.round(300 * (g.height / 100));
          const leaves = Math.max(1, Math.round(g.height / 16));
          return (
            <div key={g.name} className="gd-plant" role="listitem" style={{ ["--hn" as string]: g.height / 100, ["--d" as string]: `${i * 140}ms`, ["--bl" as string]: BLOOM[i] }}>
              <div className="gd-stem-wrap">
                <svg className="gd-stem" viewBox={`0 0 60 ${H}`} preserveAspectRatio="xMidYMax meet" aria-hidden="true">
                  <path d={`M30 ${H} C 26 ${H * 0.75} 34 ${H * 0.5} 30 ${H * 0.28} C 28 ${H * 0.18} 31 ${H * 0.1} 30 14`} stroke="#9fc370" strokeWidth="2.4" fill="none" />
                  {Array.from({ length: leaves }, (_, j) => {
                    const y = H - 12 - j * ((H - 40) / leaves);
                    const side = j % 2 ? 1 : -1;
                    return <path key={j} transform={`translate(30 ${y}) rotate(${side * 52})`} d="M0 0 C 7 -6 8 -18 0 -26 C -8 -18 -7 -6 0 0Z" fill="#7fae5a" stroke="#d8e68f" strokeWidth=".5" strokeOpacity=".5" />;
                  })}
                  <g transform="translate(30 14)">
                    {[0, 60, 120, 180, 240, 300].map((r) => <ellipse key={r} transform={`rotate(${r}) translate(0 -7)`} rx="4" ry="7" fill="var(--bl)" opacity=".92" />)}
                    <circle r="4" fill="#fff6c8" />
                  </g>
                </svg>
                <span className="gd-halo" aria-hidden="true" />
              </div>
              <div className="gd-label">
                <span className="gd-count">{g.count}</span>
                <span className="gd-name">{g.name}</span>
                <span className="gd-note">{g.note}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
