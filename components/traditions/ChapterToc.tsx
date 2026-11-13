"use client";
import { useEffect, useState } from "react";

// Sticky "in this chapter" contents with a thread that lights the section being read.
export function ChapterToc({ items }: { items: { id: string; title: string; kind: string }[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    const onScroll = () => {
      const line = window.innerHeight * 0.3;
      let cur = els[0].id;
      for (const el of els) if (el.getBoundingClientRect().top <= line) cur = el.id;
      setActive(cur);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, [items]);

  const idx = Math.max(0, items.findIndex((i) => i.id === active));
  return (
    <nav className="toc" aria-label="In this chapter">
      <p className="toc-h">In this chapter</p>
      <ol style={{ ["--p" as string]: items.length > 1 ? idx / (items.length - 1) : 0 }}>
        {items.map((it, i) => (
          <li key={it.id} className={`${i < idx ? "past" : ""}${i === idx ? " now" : ""} toc-${it.kind}`}>
            <a href={`#${it.id}`} aria-current={i === idx ? "location" : undefined}>{it.title}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
