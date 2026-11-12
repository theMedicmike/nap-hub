"use client";
import { useEffect, useRef } from "react";

// Lightweight drifting pollen / firefly field on a canvas. Pauses off-screen, honours reduced motion.
export function Fireflies({ density = 1, className = "" }: { density?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0, raf = 0, visible = true;
    type P = { x: number; y: number; r: number; vx: number; vy: number; ph: number; sp: number; hue: number };
    let ps: P[] = [];

    const seed = () => {
      const rect = cv.getBoundingClientRect();
      w = rect.width; h = rect.height;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(70, (w * h) / 26000) * density);
      ps = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: 0.8 + Math.random() * 2.2,
        vx: (Math.random() - 0.5) * 0.18, vy: -0.08 - Math.random() * 0.22,
        ph: Math.random() * Math.PI * 2, sp: 0.008 + Math.random() * 0.02,
        hue: Math.random() < 0.7 ? 68 : 44,
      }));
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        if (!reduce) {
          p.x += p.vx + Math.sin(t / 2400 + p.ph) * 0.12;
          p.y += p.vy;
          p.ph += p.sp;
          if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
          if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
        }
        const a = reduce ? 0.55 : 0.25 + 0.75 * Math.max(0, Math.sin(p.ph));
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
        g.addColorStop(0, `hsla(${p.hue}, 90%, 78%, ${a})`);
        g.addColorStop(0.25, `hsla(${p.hue}, 85%, 62%, ${a * 0.45})`);
        g.addColorStop(1, `hsla(${p.hue}, 80%, 50%, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2); ctx.fill();
      }
    };

    const loop = (t: number) => { draw(t); if (visible && !reduce) raf = requestAnimationFrame(loop); };

    seed();
    if (reduce) draw(0); else raf = requestAnimationFrame(loop);

    const io = new IntersectionObserver(([e]) => {
      const was = visible; visible = e.isIntersecting;
      if (visible && !was && !reduce) raf = requestAnimationFrame(loop);
    });
    io.observe(cv);
    const onResize = () => { seed(); if (reduce) draw(0); };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener("resize", onResize); };
  }, [density]);

  return <canvas ref={ref} className={`ff ${className}`} aria-hidden="true" />;
}
