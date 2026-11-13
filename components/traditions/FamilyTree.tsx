"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TreeEdge, TreeNode } from "@/lib/traditions";

// The interactive family tree of healing. Time runs left to right on a compressed scale (the
// early millennia are squeezed so 2500 BCE and today both fit); each band is a region; threads are
// the documented transmissions between traditions. Hover, focus or tap a tradition to light its
// whole lineage: everything it learned from and everything that learned from it.

type ChapterRef = { slug: string; num: string; name: string };

const LANES: { key: string; label: string }[] = [
  { key: "#c0392b", label: "China, Korea & Japan" },
  { key: "#8e44ad", label: "Silk Road, Tibet & Mongolia" },
  { key: "#e07b24", label: "India & Sri Lanka" },
  { key: "#a68a64", label: "Mesopotamia" },
  { key: "#c9a227", label: "Egypt" },
  { key: "#2e6da4", label: "Greece, Rome & Byzantium" },
  { key: "#0b6e4f", label: "Persia & the Islamic world" },
  { key: "#9c6644", label: "Africa & its diaspora" },
  { key: "#6b8e23", label: "Europe" },
  { key: "#34495e", label: "Modern science" },
  { key: "#7f8c8d", label: "Modern natural traditions" },
  { key: "#cf5c36", label: "The Americas" },
  { key: "#95a5a6", label: "Empires & crossings" },
  { key: "#2a9d8f", label: "Pacific & Australia" },
];

// Short labels for the map. The panel always shows the full name.
const SHORT: Record<string, string> = {
  sumerian: "Sumerian medicine", babylonian: "Babylonian & Assyrian", egypt: "Egyptian medicine",
  achaemenid: "Achaemenid court", greek: "Greek medicine", "hellenistic-roman": "Hellenistic & Roman",
  tcm: "Chinese medicine", talmudic: "Talmudic medicine", byzantine: "Byzantine medicine", kucha: "Buddhist Central Asia",
  korean: "Korean medicine (Hanui)", kampo: "Kampo (Japan)", "persian-gondishapur": "Gondishapur",
  tibetan: "Tibetan medicine", islamic: "Islamic / Greco-Arabic", salerno: "Monte Cassino & Salerno",
  elias: "Patriarch Elias (claimed)", "european-monastic": "Monastic medicine", "european-university": "University medicine",
  "west-africa": "West African traditions", "unani-south-asia": "Unani in South Asia", amazon: "Amazonian peoples",
  "continental-herbals": "Continental herbals", "variolation-asia": "Asian variolation", "early-modern-european": "Early modern botany",
  nahua: "Nahua medicine", "english-herbals": "English herbals", mongolian: "Mongolian medicine", andean: "Andean medicine",
  buryat: "Buryat medicine", "american-medicine": "American medicine", ottoman: "Ottoman inoculation",
  "southern-africa": "Khoekhoe & San", "european-folk": "European folk remedies", "modern-science": "Modern scientific medicine",
  "australian-flora": "Australian flora, Sydney", homeopathy: "Homeopathy", "missions-licensing": "Missions & licensing",
  "cinchona-plantations": "Cinchona plantations", plains: "Plains nations", osteopathy: "Osteopathy", kneipp: "Kneipp water cure",
  chiropractic: "Chiropractic", naturopathy: "Naturopathy", "global-herbal-trade": "Herbal & tea trade", "nz-state": "NZ state law",
  "us-medical-schools": "US schools after Flexner", "sri-lanka-siddha": "Siddha in Sri Lanka", jamaica: "Jamaican folk medicine",
  "sowa-rigpa-exile": "Sowa Rigpa in exile", "ghana-cpmr": "Ghana plant research", "benefit-sharing": "Benefit-sharing",
  "acupuncture-world": "Acupuncture worldwide", "buddhist-lore": "Jivaka stories", "spanish-colonial": "Spanish colonial Church",
  candomble: "Candomblé", polynesian: "Polynesian voyagers", hawaiian: "Lāʻau lapaʻau", maori: "Rongoā Māori",
  bundjalung: "Bundjalung bush medicine", "vietnam-sea": "Vietnam & SE Asia", "magnetic-healing": "Magnetic healing",
  bonesetting: "Frontier bone-setting", ayurveda: "Ayurveda", siddha: "Siddha",
};

// Living traditions far older than their first written record: drawn with a dotted trail of roots.
const DEEP_ROOTS = new Set(["amazon", "andean", "nahua", "plains", "west-africa", "southern-africa", "polynesian", "hawaiian", "maori", "bundjalung"]);

const CERTAINTY: Record<string, string> = { debated: "Debated", claimed: "Claimed", "prestige-only": "Prestige only" };

// Compressed time: [year, x]
const BP: [number, number][] = [[-2500, 0], [-1000, 190], [0, 320], [500, 440], [1000, 580], [1500, 750], [1700, 930], [1800, 1110], [1900, 1370], [2030, 1600]];
const TICKS = [-2500, -2000, -1500, -1000, -500, 1, 500, 1000, 1500, 1700, 1800, 1900, 2000];
const GUTTER = 170; // left space for the lane names
const TOP = 54; // time axis
const ROW = 30;
const LANE_PAD = 12;

function xOfYear(y: number): number {
  const yy = Math.max(BP[0][0], Math.min(BP[BP.length - 1][0], y));
  for (let i = 1; i < BP.length; i++) {
    const [y0, x0] = BP[i - 1], [y1, x1] = BP[i];
    if (yy <= y1) return GUTTER + 24 + x0 + ((yy - y0) / (y1 - y0)) * (x1 - x0);
  }
  return GUTTER + 24 + BP[BP.length - 1][1];
}
const yearLabel = (y: number) => (y < 0 ? `${-y} BCE` : y <= 1000 ? `${y} CE` : `${y}`);

function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const m = (c: number) => Math.round(c + (255 - c) * amt);
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}

function parseSources(s: string): { href: string | null; label: string }[] {
  const urls = s.match(/https?:\/\/[^\s;]+/g) ?? [];
  if (!urls.length) return s.trim() ? [{ href: null, label: s.trim() }] : [];
  return urls.map((u) => {
    let label = u;
    try { label = new URL(u).hostname.replace(/^www\./, ""); } catch { /* keep */ }
    return { href: /^https?:\/\//.test(u) ? u : null, label };
  });
}

interface Laid extends TreeNode { x: number; y: number; year: number; placed: boolean; lane: number; short: string; color: string; labelW: number; left: boolean }

export function FamilyTree({ nodes, edges, chapters }: { nodes: TreeNode[]; edges: TreeEdge[]; chapters: Record<string, ChapterRef> }) {
  // ---------- Layout (deterministic, so server and client agree) ----------
  const L = useMemo(() => {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const year: Record<string, number | null> = {};
    for (const n of nodes) year[n.id] = n.era_start;
    // Traditions with no sourced date are placed by their neighbours on the tree.
    for (let it = 0; it < 8; it++) {
      for (const n of nodes) {
        if (n.era_start !== null) continue;
        const ps = edges.filter((e) => e.to === n.id).map((e) => year[e.from]).filter((v): v is number => v !== null);
        const ks = edges.filter((e) => e.from === n.id).map((e) => year[e.to]).filter((v): v is number => v !== null);
        if (ps.length && ks.length) year[n.id] = (Math.max(...ps) + Math.min(...ks)) / 2;
        else if (ps.length) year[n.id] = Math.max(...ps) + 40;
        else if (ks.length) year[n.id] = Math.min(...ks) - 60;
      }
    }
    const laneOf = (n: TreeNode) => Math.max(0, LANES.findIndex((l) => l.key.toLowerCase() === n.color_hint.toLowerCase()));
    const laid: Laid[] = nodes.map((n) => {
      const short = SHORT[n.id] ?? n.name.replace(/\s*\(.*\)$/, "");
      return {
        ...n, year: year[n.id] ?? 2000, placed: n.era_start === null, lane: laneOf(n), short,
        color: lighten(n.color_hint, n.color_hint === "#34495e" ? 0.55 : 0.32), x: 0, y: 0, labelW: short.length * 6.9 + 6, left: false,
      };
    });
    for (const n of laid) n.x = xOfYear(n.year);

    let top = TOP;
    const lanes: { label: string; color: string; y: number; h: number }[] = [];
    LANES.forEach((lane, li) => {
      const inLane = laid.filter((n) => n.lane === li).sort((a, b) => a.x - b.x);
      // Pack labels into as few rows as possible: each label sits right of its point, or left of it
      // when that is the only way to fit the row.
      const rows: [number, number][][] = [];
      const free = (row: [number, number][], a: number, b: number) => row.every(([s0, e0]) => b + 8 < s0 || a > e0 + 8);
      for (const n of inLane) {
        const right: [number, number] = [n.x - 10, n.x + 12 + n.labelW];
        const left: [number, number] = [n.x - 12 - n.labelW, n.x + 10];
        let r = -1;
        for (let k = 0; k < rows.length && r === -1; k++) {
          if (free(rows[k], ...right)) { rows[k].push(right); r = k; }
          else if (left[0] > GUTTER + 30 && free(rows[k], ...left)) { rows[k].push(left); r = k; n.left = true; }
        }
        if (r === -1) { rows.push([right]); r = rows.length - 1; }
        (n as Laid & { row: number }).row = r;
      }
      const nRows = Math.max(1, rows.length);
      const h = nRows * ROW + LANE_PAD * 2;
      for (const n of inLane) n.y = top + LANE_PAD + (n as Laid & { row: number }).row * ROW + ROW / 2;
      lanes.push({ label: lane.label, color: lighten(lane.key, lane.key === "#34495e" ? 0.55 : 0.32), y: top, h });
      top += h;
    });
    const width = Math.ceil(Math.max(...laid.map((n) => n.x + 14 + n.labelW)) + 40);
    const height = top + 16;
    const pos = new Map(laid.map((n) => [n.id, n]));
    const paths = edges.map((e, i) => {
      const a = pos.get(e.from)!, b = pos.get(e.to)!;
      const dx = b.x - a.x;
      const k = Math.max(Math.abs(dx) * 0.5, 46);
      return { i, e, a, b, d: `M${a.x.toFixed(1)} ${a.y.toFixed(1)} C ${(a.x + k).toFixed(1)} ${a.y.toFixed(1)}, ${(b.x - k).toFixed(1)} ${b.y.toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}` };
    });
    return { laid, lanes, width, height, pos, paths, byId };
  }, [nodes, edges]);

  const out = useMemo(() => { const m = new Map<string, string[]>(); for (const e of edges) m.set(e.from, [...(m.get(e.from) ?? []), e.to]); return m; }, [edges]);
  const inc = useMemo(() => { const m = new Map<string, string[]>(); for (const e of edges) m.set(e.to, [...(m.get(e.to) ?? []), e.from]); return m; }, [edges]);

  // ---------- State ----------
  const [sel, setSel] = useState<string | null>(null);
  const [group, setGroup] = useState<string[]>([]);
  const [hover, setHover] = useState<string | null>(null);
  const [drawn, setDrawn] = useState(false);
  const [armed, setArmed] = useState(false);
  const [hoverSide, setHoverSide] = useState<"l" | "r">("r");
  const [selSide, setSelSide] = useState<"l" | "r">("r");
  const scroller = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean; on: boolean }>({ x: 0, left: 0, moved: false, on: false });

  const active = hover ? [hover] : sel ? (group.length && group.includes(sel) ? group : [sel]) : [];
  const shown = hover ?? sel;

  const lineage = useMemo(() => {
    if (!active.length) return null;
    const walk = (start: string[], next: Map<string, string[]>) => {
      const seen = new Set<string>();
      const q = [...start];
      while (q.length) { const id = q.shift()!; for (const n of next.get(id) ?? []) if (!seen.has(n)) { seen.add(n); q.push(n); } }
      return seen;
    };
    const self = new Set(active);
    const anc = walk(active, inc), desc = walk(active, out);
    const nodesOn = new Set([...self, ...anc, ...desc]);
    const edgesOn = new Set<number>(), direct = new Set<number>();
    L.paths.forEach(({ i, e }) => {
      if ((self.has(e.to) || anc.has(e.to)) && anc.has(e.from)) edgesOn.add(i);
      if ((self.has(e.from) || desc.has(e.from)) && desc.has(e.to)) edgesOn.add(i);
      if (self.has(e.from) || self.has(e.to)) { edgesOn.add(i); direct.add(i); }
    });
    return { self, nodesOn, edgesOn, direct };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.join(","), L, inc, out]);

  // On wide screens the panel floats over the tree, on the side away from the chosen tradition.
  const PANEL_W = 384;
  const sideFor = useCallback((id: string): "l" | "r" => {
    const n = L.pos.get(id), s = scroller.current;
    if (!n || !s) return "r";
    return n.x - s.scrollLeft > s.clientWidth * 0.52 ? "l" : "r";
  }, [L]);

  const centerOn = useCallback((id: string, smooth = true) => {
    const n = L.pos.get(id), s = scroller.current;
    if (!n || !s) return;
    const view = window.innerWidth >= 1100 ? s.clientWidth - PANEL_W : s.clientWidth;
    const left = Math.max(0, n.x - view / 2 + 40);
    s.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
  }, [L]);

  const choose = useCallback((id: string | null, opts: { center?: boolean } = {}) => {
    setSel(id);
    setGroup(id ? [id] : []);
    if (id && opts.center) { centerOn(id); setSelSide("r"); }
    else if (id) setSelSide(sideFor(id));
  }, [centerOn, sideFor]);

  // Deep link: /traditions?node=ayurveda or ?node=andean,nahua
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("node");
    if (!p) return;
    const ids = p.split(",").map((s) => s.trim()).filter((s) => L.pos.has(s));
    if (!ids.length) return;
    setSel(ids[0]);
    setGroup(ids);
    setSelSide("r");
    requestAnimationFrame(() => centerOn(ids[0], false));
  }, [L, centerOn]);

  // Draw the threads when the tree scrolls into view.
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setArmed(true);
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setDrawn(true); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Mouse drag to pan (touch already pans natively).
  useEffect(() => {
    const move = (ev: PointerEvent) => {
      const d = drag.current, s = scroller.current;
      if (!d.on || !s) return;
      const dx = ev.clientX - d.x;
      if (Math.abs(dx) > 4) d.moved = true;
      s.scrollLeft = d.left - dx;
    };
    const up = () => { drag.current.on = false; scroller.current?.classList.remove("ft-grabbing"); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, []);

  const onDown = (ev: React.PointerEvent) => {
    if (ev.pointerType !== "mouse" || ev.button !== 0) return;
    const s = scroller.current;
    if (!s) return;
    drag.current = { x: ev.clientX, left: s.scrollLeft, moved: false, on: true };
    s.classList.add("ft-grabbing");
  };

  const nodeClick = (id: string) => {
    if (drag.current.moved) { drag.current.moved = false; return; }
    if (sel === id && group.length <= 1) { choose(null); return; }
    choose(id);
    // On narrow screens the panel sits below the tree; bring it into view.
    if (window.innerWidth < 1100 && panel.current) {
      const r = panel.current.getBoundingClientRect();
      if (r.top > window.innerHeight - 80) panel.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  const shownNode = shown ? L.pos.get(shown) : null;
  const shownIn = shown ? L.paths.filter((p) => p.e.to === shown) : [];
  const shownOut = shown ? L.paths.filter((p) => p.e.from === shown) : [];
  const chapterList = useMemo(() => {
    const seen = new Set<string>();
    return Object.entries(chapters).filter(([, c]) => (seen.has(c.slug) ? false : (seen.add(c.slug), true)))
      .sort((a, b) => a[1].num.localeCompare(b[1].num));
  }, [chapters]);

  const xMax = L.width;
  return (
    <div className={`ft${lineage ? " ft-has-active" : ""}${armed ? " ft-armed" : ""}${drawn ? " ft-drawn" : ""}`}>
            <div className="ft-intro">
              <p className="ft-intro-h">Pick up any thread.</p>
              <p>
                Hover, tap or tab to a tradition to light up its whole family line: everything it learned from, and
                everything that learned from it. Ringed points have a full chapter.
              </p>
              <div className="ft-p-chips">
                {chapterList.map(([id, c]) => (
                  <button key={c.slug} type="button" onClick={() => choose(id, { center: true })}>
                    <span>{c.num}</span>{c.name}
                  </button>
                ))}
              </div>
            </div>
      <div className="ft-stage">
        <div className="ft-frame" ref={frame}>
          <div className="ft-lanes" aria-hidden="true" style={{ height: L.height }}>
            {L.lanes.map((l) => (
              <span key={l.label} className="ft-lane-name" style={{ top: l.y, height: l.h, color: l.color }}>{l.label}</span>
            ))}
          </div>
          <div className="ft-scroll" ref={scroller} onPointerDown={onDown} tabIndex={-1}>
            <svg
              className="ft-svg"
              width={xMax}
              height={L.height}
              viewBox={`0 0 ${xMax} ${L.height}`}
              role="group"
              aria-label="The family tree of healing traditions. Each tradition is a button; choose one to light up its lineage and list its connections."
              onPointerLeave={() => setHover(null)}
            >
              <defs>
                {L.paths.map(({ i, a, b }) => (
                  <linearGradient key={i} id={`ftg${i}`} gradientUnits="userSpaceOnUse" x1={a.x} y1={a.y} x2={b.x === a.x ? b.x + 1 : b.x} y2={b.y}>
                    <stop offset="0" stopColor={a.color} />
                    <stop offset="1" stopColor={b.color} />
                  </linearGradient>
                ))}
              </defs>

              {/* Region bands */}
              {L.lanes.map((l, i) => (
                <rect key={l.label} x={0} y={l.y} width={xMax} height={l.h} className={`ft-band ${i % 2 ? "ft-band-b" : ""}`} />
              ))}

              {/* Time axis */}
              <g className="ft-axis" aria-hidden="true">
                {TICKS.map((t) => {
                  const x = xOfYear(t);
                  return (
                    <g key={t}>
                      <line x1={x} x2={x} y1={TOP - 10} y2={L.height - 8} />
                      <text x={x} y={TOP - 20}>{t === 1 ? "1 CE" : yearLabel(t)}</text>
                    </g>
                  );
                })}
                <text className="ft-axis-today" x={xOfYear(2030) - 4} y={TOP - 20}>Today</text>
              </g>

              {/* Roots older than writing */}
              {L.laid.filter((n) => DEEP_ROOTS.has(n.id)).map((n) => (
                <line key={`r-${n.id}`} className={`ft-roots${lineage?.nodesOn.has(n.id) ? " on" : ""}`} x1={GUTTER + 8} y1={n.y} x2={n.x - 10} y2={n.y} stroke={n.color} />
              ))}

              {/* Threads */}
              <g className="ft-edges">
                {L.paths.map(({ i, e, a, d }) => {
                  const on = lineage?.edgesOn.has(i), dir = lineage?.direct.has(i);
                  const dashed = e.certainty && e.certainty !== "documented";
                  const delay = ((a.x - GUTTER) / (xMax - GUTTER)) * 2.4;
                  return (
                    <g key={i} className={`ft-e${on ? " on" : ""}${dir ? " direct" : ""}${dashed ? " dashed" : ""}`} style={{ ["--d" as string]: `${delay.toFixed(2)}s` }}>
                      <path className="ft-e-glow" d={d} stroke={`url(#ftg${i})`} pathLength={1} />
                      <path className="ft-e-core" d={d} stroke={`url(#ftg${i})`} pathLength={dashed ? undefined : 1} />
                    </g>
                  );
                })}
              </g>

              {/* Traditions */}
              <g className="ft-nodes">
                {L.laid.map((n) => {
                  const ch = chapters[n.id];
                  const isOn = lineage?.nodesOn.has(n.id), isSelf = lineage?.self.has(n.id);
                  const r = ch ? 7.5 : 5.5;
                  return (
                    <g
                      key={n.id}
                      className={`ft-n${ch ? " ft-n-ch" : ""}${isOn ? " on" : ""}${isSelf ? " self" : ""}${sel === n.id ? " pinned" : ""}`}
                      transform={`translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})`}
                      role="button"
                      tabIndex={0}
                      aria-pressed={sel === n.id}
                      aria-label={`${n.name}. ${n.region}. ${n.era_label}.`}
                      onPointerEnter={(ev) => { if (ev.pointerType === "mouse") { setHover(n.id); setHoverSide(sideFor(n.id)); } }}
                      onFocus={(ev) => { if (ev.currentTarget.matches(":focus-visible")) { setHover(n.id); setHoverSide(sideFor(n.id)); } }}
                      onBlur={() => setHover(null)}
                      onClick={() => nodeClick(n.id)}
                      onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); choose(sel === n.id ? null : n.id); } }}
                      style={{ ["--c" as string]: n.color }}
                    >
                      <circle className="ft-n-hit" r={16} />
                      <circle className="ft-n-halo" r={r + 7} />
                      <circle className="ft-n-dot" r={r} />
                      {ch && <circle className="ft-n-ring" r={r + 3.5} />}
                      <text className="ft-n-label" x={n.left ? -(r + 6) : r + 6} y={4} textAnchor={n.left ? "end" : "start"}>{n.short}</text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
          <p className="ft-hint" aria-hidden="true">
            <svg viewBox="0 0 40 16"><path d="M2 8h34m-6-5 6 5-6 5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
            Drag or swipe to travel through time
          </p>
        </div>

        {shownNode && (
        <aside className={`ft-panel ft-side-${hover ? hoverSide : selSide}`} ref={panel} aria-live="polite">
            <div className="ft-p-in" key={shownNode.id} style={{ ["--c" as string]: shownNode.color }}>
              {sel && !hover && <button type="button" className="ft-p-x" aria-label="Close" onClick={() => choose(null)}>×</button>}
              <p className="ft-p-region"><span className="ft-p-dot" />{shownNode.region}</p>
              <h3 className="ft-p-name">{shownNode.name}</h3>
              <p className="ft-p-era">{shownNode.era_label}</p>
              {shownNode.placed && <p className="ft-p-note">No sourced date: placed on the map by its connections.</p>}
              {DEEP_ROOTS.has(shownNode.id) && <p className="ft-p-note">A living tradition far older than its first written record.</p>}
              {chapters[shownNode.id] && (
                <Link className="ft-p-read" href={`/traditions/${chapters[shownNode.id].slug}`}>
                  Read chapter {chapters[shownNode.id].num}: {chapters[shownNode.id].name} <span aria-hidden="true">→</span>
                </Link>
              )}
              {group.length > 1 && sel && !hover && (
                <div className="ft-p-group">
                  <span>Also on this chapter&apos;s branch:</span>
                  {group.filter((g) => g !== sel).map((g) => (
                    <button key={g} type="button" onClick={() => choose(g, { center: true })}>{L.pos.get(g)?.short}</button>
                  ))}
                </div>
              )}
              <EdgeList title="Learned from" items={shownIn} far="a" onPick={(id) => choose(id, { center: true })} />
              <EdgeList title="Passed on to" items={shownOut} far="b" onPick={(id) => choose(id, { center: true })} />
              {!shownIn.length && !shownOut.length && <p className="ft-p-none">No recorded links yet.</p>}
              {sel && !hover && (
                <button type="button" className="ft-p-clear" onClick={() => choose(null)}>Clear selection</button>
              )}
              {hover && sel !== hover && <p className="ft-p-tip">Click to keep this open.</p>}
            </div>
        </aside>
        )}
      </div>

      <div className="ft-legend" aria-label="How to read the tree">
        <span><i className="lg-thread" />A documented transmission</span>
        <span><i className="lg-dash" />Debated or only claimed</span>
        <span><i className="lg-roots" />Roots older than writing</span>
        <span><i className="lg-ring" />Has a full chapter</span>
        <span className="lg-note">Time is compressed: the early millennia are squeezed so 2500 BCE and today both fit.</span>
      </div>

      <details className="ft-list">
        <summary>Read the family tree as a list</summary>
        <div className="ft-list-in">
          {LANES.map((lane, li) => {
            const ns = L.laid.filter((n) => n.lane === li).sort((a, b) => a.year - b.year);
            if (!ns.length) return null;
            return (
              <section key={lane.key}>
                <h4>{lane.label}</h4>
                <ul>
                  {ns.map((n) => {
                    const to = L.paths.filter((p) => p.e.from === n.id);
                    return (
                      <li key={n.id}>
                        <strong>{n.name}</strong> <span className="ft-list-era">{n.era_label}</span>
                        {to.length > 0 && <span className="ft-list-to"> Passed on to: {to.map((p) => p.b.name).join("; ")}.</span>}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </details>
    </div>
  );
}

function EdgeList({ title, items, far, onPick }: {
  title: string;
  items: { i: number; e: TreeEdge; a: Laid; b: Laid }[];
  far: "a" | "b";
  onPick: (id: string) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="ft-p-list">
      <h4>{title} <span>{items.length}</span></h4>
      <ul>
        {items.map(({ i, e, a, b }) => {
          const other = far === "a" ? a : b;
          return (
            <li key={i} style={{ ["--c2" as string]: other.color }}>
              <button type="button" className="ft-p-other" onClick={() => onPick(other.id)}>{other.name}</button>
              <p className="ft-p-when">
                {e.when}
                {e.certainty && CERTAINTY[e.certainty] && <span className={`ft-cert ft-cert-${e.certainty}`}>{CERTAINTY[e.certainty]}</span>}
              </p>
              <p className="ft-p-how">{e.how}</p>
              <p className="ft-p-src">
                {parseSources(e.source).map((s, k) =>
                  s.href ? <a key={k} href={s.href} target="_blank" rel="noopener noreferrer" title={s.href}>{s.label}</a> : <span key={k}>{s.label}</span>,
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
