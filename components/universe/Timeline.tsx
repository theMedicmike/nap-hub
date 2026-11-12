"use client";
import { useEffect, useRef } from "react";
import type { Healer } from "@/lib/universe";
import { Painting } from "./Painting";
import { PlantArt } from "./PlantArt";

export type Era = Healer & { src: string | null };

// The Living Thread: one full-screen painted panel per era. A single golden-green thread runs
// down the left edge through a knot at every era and draws itself as you scroll.
export function Timeline({ eras }: { eras: Era[] }) {
  const track = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const core = useRef<SVGPathElement>(null);
  const glow = useRef<SVGPathElement>(null);
  const bead = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = track.current, s = svg.current, c = core.current, g = glow.current, b = bead.current;
    if (!el || !s || !c || !g || !b) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let maxP = 0, len = 0, knots: { el: HTMLElement; y: number }[] = [], raf = 0;

    const build = () => {
      const W = el.clientWidth, H = el.scrollHeight;
      const narrow = W < 760;
      const x = narrow ? 22 : 64, amp = narrow ? 12 : 30;
      s.setAttribute("viewBox", `0 0 ${W} ${H}`);
      s.style.height = `${H}px`;
      const top = el.getBoundingClientRect().top;
      knots = Array.from(el.querySelectorAll<HTMLElement>(".era-knot")).map((k) => {
        const r = k.getBoundingClientRect();
        return { el: k, y: r.top + r.height / 2 - top };
      });
      const pts = [0, ...knots.map((k) => k.y), H];
      let d = `M ${x} 0`;
      for (let i = 1; i < pts.length; i++) {
        const y0 = pts[i - 1], y1 = pts[i], dy = y1 - y0, side = i % 2 ? 1 : -1;
        d += ` C ${x + amp * side} ${y0 + dy * 0.35}, ${x - amp * side} ${y0 + dy * 0.65}, ${x} ${y1}`;
      }
      c.setAttribute("d", d); g.setAttribute("d", d);
      len = c.getTotalLength();
      c.style.strokeDasharray = g.style.strokeDasharray = `${len}`;
      update();
    };

    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // The thread stays woven once drawn: it only ever grows.
      maxP = Math.max(maxP, reduce ? 1 : Math.min(1, Math.max(0, (vh * 0.62 - r.top) / r.height)));
      const p = maxP;
      const off = len * (1 - p);
      c.style.strokeDashoffset = g.style.strokeDashoffset = `${off}`;
      const pt = c.getPointAtLength(len * p);
      b.style.transform = `translate(${pt.x}px, ${pt.y}px)`;
      b.style.opacity = p > 0.002 && p < 0.998 ? "1" : "0";
      for (const k of knots) k.el.classList.toggle("lit", k.y <= pt.y + 2);
    };

    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    build();
    const ro = new ResizeObserver(() => build());
    ro.observe(el);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { ro.disconnect(); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <section className="lt" id="thread" aria-labelledby="lt-h">
      <div className="lt-intro">
        <h2 id="lt-h" className="u-h2">Five thousand years. One&nbsp;thread.</h2>
        <p className="u-lede">
          They lived centuries apart and never met. Every one of them did the same four things: watched the body,
          knew the land, learned the plants, and passed on what worked.
        </p>
      </div>
      <div className="lt-track" ref={track}>
        <svg ref={svg} className="lt-svg" aria-hidden="true" preserveAspectRatio="none">
          <path ref={glow} className="lt-glow" d="M 64 0" />
          <path ref={core} className="lt-core" d="M 64 0" />
        </svg>
        <span ref={bead} className="lt-bead" aria-hidden="true" />
        {eras.map((e, i) => (
          <article key={e.id} className={`era ${i % 2 ? "era-l" : "era-r"}`} aria-label={`${e.name}, ${e.era}`}>
            <div className="era-art">
              <div className="era-par">
                <Painting src={e.src} alt={`${e.name}, ${e.role.toLowerCase()}, ${e.place}`} focal={e.focal} sky={e.sky} plant={e.plantKey} name={e.name} label={false} />
              </div>
            </div>
            <div className="era-shade" />
            <span className="era-knot" aria-hidden="true" />
            <div className="era-copy">
              <p className="era-when">{e.era}</p>
              <p className="era-place">{e.place}</p>
              <h3 className="era-name">{e.name}</h3>
              <p className="era-role">{e.role}</p>
              <p className="era-story">{e.story}</p>
              <p className="era-plant">
                <PlantArt plant={e.plantKey} className="era-plant-ic" />
                <span>Carries: {e.plant.charAt(0).toLowerCase() + e.plant.slice(1)}</span>
              </p>
            </div>
          </article>
        ))}
        <div className="lt-end">
          <p>The thread reaches today. It reaches you.</p>
        </div>
      </div>
    </section>
  );
}
