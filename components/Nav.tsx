"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Seal } from "./Seal";
import { NAV_GROUPS, type NavGroup, type NavItem } from "@/lib/site-map";

function Item({ it, onGo }: { it: NavItem; onGo?: () => void }) {
  if (!it.href) {
    return (
      <span className="mi mi-soon" aria-disabled="true">
        <span className="mi-l">{it.label} <em>soon</em></span>
        <span className="mi-n">{it.note}</span>
      </span>
    );
  }
  return (
    <Link className="mi" href={it.href} onClick={onGo}>
      <span className="mi-l">{it.label}</span>
      <span className="mi-n">{it.note}</span>
    </Link>
  );
}

function Group({ g, open, setOpen, active }: {
  g: NavGroup; open: string | null; setOpen: (v: string | null) => void; active: boolean;
}) {
  const isOpen = open === g.label;
  const id = `dd-${g.label.toLowerCase()}`;
  return (
    <div className="dd" onMouseEnter={() => setOpen(g.label)} onMouseLeave={() => setOpen(null)}>
      <button className={`nl${active ? " on" : ""}`} aria-expanded={isOpen} aria-controls={id}
        onClick={() => setOpen(isOpen ? null : g.label)}>
        {g.label}
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
      </button>
      {isOpen && (
        <div className="dd-panel" id={id}>
          {g.items.map((it) => <Item key={it.label} it={it} />)}
        </div>
      )}
    </div>
  );
}

// overlay: floats over a full-bleed opening image (the homepage) instead of sitting on a bar.
export function Nav({ overlay = false }: { overlay?: boolean }) {
  const path = usePathname() || "/";
  const [open, setOpen] = useState<string | null>(null); // desktop dropdown
  const [sheet, setSheet] = useState(false); // phone menu
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(null); setSheet(false); } };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, []);
  useEffect(() => { document.body.style.overflow = sheet ? "hidden" : ""; }, [sheet]);
  useEffect(() => { setOpen(null); setSheet(false); }, [path]);

  const inGroup = (items: NavItem[]) => items.some((i) => i.href && path.startsWith(i.href));
  const [learn, evidence, about] = NAV_GROUPS;

  return (
    <nav className={`nav${overlay ? " nav-over" : ""}`} aria-label="Main">
      <div className="nav-in" ref={ref}>
        <Link className="brand" href="/">
          <Seal size={30} />
          <span>
            <span className="brand-full">Nutraceutical Assisted Programs</span>
            <span className="brand-short">NAP</span>
          </span>
        </Link>

        <div className="nav-links">
          <Group g={learn} open={open} setOpen={setOpen} active={inGroup(learn.items)} />
          <Group g={evidence} open={open} setOpen={setOpen} active={inGroup(evidence.items)} />
          <Link className={`nl${path.startsWith("/ask") ? " on" : ""}`} href="/ask">Ask</Link>
          <Group g={about} open={open} setOpen={setOpen} active={inGroup(about.items)} />
          <Link className="btn btn-thread sm" href="/shape">Join the build</Link>
        </div>

        <button className="nav-burger" aria-expanded={sheet} aria-controls="nav-sheet" onClick={() => setSheet((s) => !s)}>
          <span className="sr">{sheet ? "Close menu" : "Open menu"}</span>
          <span className={`bars${sheet ? " x" : ""}`} aria-hidden="true"><i /><i /><i /></span>
        </button>
      </div>

      {sheet && createPortal(
        <div className="nav-sheet" id="nav-sheet">
          <div className="sheet-in">
            <Link className="sheet-ask" href="/ask" onClick={() => setSheet(false)}>Ask the NAP guide</Link>
            {NAV_GROUPS.map((g) => (
              <section key={g.label}>
                <h2>{g.label}</h2>
                {g.items.map((it) => <Item key={it.label} it={it} onGo={() => setSheet(false)} />)}
              </section>
            ))}
            <Link className="btn btn-thread" href="/shape" onClick={() => setSheet(false)}>Join the build</Link>
            <p className="sheet-crisis">In crisis? Call or text <a href="tel:988">988</a>, then press 1.</p>
          </div>
        </div>,
        document.body
      )}
    </nav>
  );
}
