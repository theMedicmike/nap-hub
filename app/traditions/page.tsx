import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Fireflies } from "@/components/universe/Fireflies";
import { FamilyTree } from "@/components/traditions/FamilyTree";
import { TradArt } from "@/components/traditions/TradArt";
import { Blocks, Inline } from "@/lib/md";
import { art } from "@/lib/universe-assets";
import { TREE, allChapters, getOverview, nodeChapters } from "@/lib/traditions";

export const metadata = {
  title: "The Great Traditions — Nutraceutical Assisted Programs",
  description:
    "How humanity's healing knowledge began, was carried by memory, chant and song, crossed mountains and seas, and branched into one family tree. Fifteen origin stories, legend and history kept apart. History and heritage, not medical advice.",
};

// Decorative branches for the opening: threads rising from the willow's roots and spreading
// into a crown of glowing points, one colour per family of traditions.
const CROWN: { d: string; c: string; x: number; y: number; delay: number }[] = [
  { d: "M640 560 C 600 470 520 420 420 380 S 250 300 170 250", c: "#e07b24", x: 170, y: 250, delay: 0.5 },
  { d: "M640 560 C 610 460 560 380 500 300 S 420 170 360 120", c: "#a68a64", x: 360, y: 120, delay: 0.7 },
  { d: "M640 560 C 640 440 620 330 600 240 S 580 110 560 70", c: "#c9a227", x: 560, y: 70, delay: 0.9 },
  { d: "M640 560 C 660 450 700 350 740 260 S 800 130 820 90", c: "#2e6da4", x: 820, y: 90, delay: 1.1 },
  { d: "M640 560 C 680 470 760 410 860 360 S 1020 260 1100 210", c: "#c0392b", x: 1100, y: 210, delay: 1.3 },
  { d: "M640 560 C 700 500 820 470 940 450 S 1130 420 1210 380", c: "#2a9d8f", x: 1210, y: 380, delay: 1.5 },
  { d: "M640 560 C 580 510 470 480 350 470 S 140 460 70 420", c: "#cf5c36", x: 70, y: 420, delay: 1.7 },
  { d: "M500 300 C 470 260 430 250 380 250", c: "#0b6e4f", x: 380, y: 250, delay: 1.9 },
  { d: "M740 260 C 780 230 840 220 900 230", c: "#6b8e23", x: 900, y: 230, delay: 2.0 },
  { d: "M860 360 C 900 320 960 300 1010 300", c: "#8e44ad", x: 1010, y: 300, delay: 2.2 },
  { d: "M420 380 C 380 350 330 340 280 350", c: "#9c6644", x: 280, y: 350, delay: 2.3 },
];

const MOVEMENTS = [
  {
    k: "Remembered",
    t: "Before there were books, there were voices.",
    d: "For most of human history, healing knowledge lived in people. It was chanted as verse, sung as lists of plants, told as stories and taught hand to hand, one generation to the next.",
  },
  {
    k: "Carried",
    t: "It crossed mountains and seas.",
    d: "Knowledge moved along the same roads as silk, spice, pilgrims and armies. Translators carried it from one language into the next, and it changed a little with every crossing.",
  },
  {
    k: "Branched",
    t: "Every tradition is family.",
    d: "No system of medicine grew alone. Each one learned from others and gave to others. Followed far enough, the threads make one family tree, and modern medicine is one of its newest branches.",
  },
];

export default function TraditionsPage() {
  const chapters = allChapters();
  const ov = getOverview();
  const nodeCh = nodeChapters();
  const hero = art("K1");

  return (
    <div className="uv tr">
      <Nav overlay />
      <main>
        {/* ---------- Opening ---------- */}
        <header className="trh">
          <div className="trh-stage" aria-hidden="true">
            {hero && <img className="trh-img" src={hero} alt="" fetchPriority="high" />}
          </div>
          <div className="trh-shade" />
          <svg className="trh-crown" viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <defs>
              <filter id="trhblur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" /></filter>
              <radialGradient id="trhdot"><stop offset="0" stopColor="#fffbe2" /><stop offset=".45" stopColor="#fffbe2" stopOpacity=".55" /><stop offset="1" stopColor="#fffbe2" stopOpacity="0" /></radialGradient>
            </defs>
            {CROWN.map((b, i) => (
              <g key={i} style={{ ["--d" as string]: `${b.delay}s`, ["--c" as string]: b.c }}>
                <path className="trh-b trh-b-glow" filter="url(#trhblur)" pathLength={1} d={b.d} />
                <path className="trh-b" pathLength={1} d={b.d} />
                <circle className="trh-node-halo" cx={b.x} cy={b.y} r="16" />
                <circle className="trh-node" cx={b.x} cy={b.y} r="4.5" />
              </g>
            ))}
            <circle className="trh-root" cx="640" cy="560" r="7" />
          </svg>
          <Fireflies className="trh-ff" density={0.8} />
          <div className="trh-copy">
            <p className="trh-kicker">Fifteen origin stories · one family tree</p>
            <h1 className="trh-h1">The Great Traditions</h1>
            <p className="trh-sub">
              How humanity&apos;s healing knowledge began, was carried by memory, chant and song, crossed mountains
              and seas, and branched into one great family tree.
            </p>
            <div className="trh-cta">
              <a className="btn btn-thread" href="#tree">Explore the family tree</a>
              <a className="btn btn-glass" href="#chapters">Read the fifteen stories</a>
            </div>
          </div>
          <a className="uh-scroll" href="#remembered" aria-label="Begin the story">
            <span>Begin</span>
            <svg viewBox="0 0 20 40" aria-hidden="true"><path d="M10 2 C 4 12 16 20 10 30 M5 25 l5 8 5-8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </a>
        </header>

        {/* ---------- Remembered, carried, branched ---------- */}
        <section className="tri" id="remembered" aria-labelledby="tri-h">
          <div className="u-wrap">
            <h2 id="tri-h" className="u-h2 tri-h">Every remedy has an ancestry.</h2>
            <p className="u-lede">
              Before a plant reached a pharmacy shelf or a textbook, someone remembered it, someone carried it, and
              someone else learned it in a new language. These are the stories of those journeys, from clay tablets and
              palm leaves to the laboratory.
            </p>
            <ol className="tri-moves">
              {MOVEMENTS.map((m, i) => (
                <li key={m.k} style={{ ["--i" as string]: i }}>
                  <span className="tri-k">{m.k}</span>
                  <h3>{m.t}</h3>
                  <p>{m.d}</p>
                </li>
              ))}
            </ol>
            <dl className="tri-stats">
              <div><dt>Traditions told in full</dt><dd>{chapters.length}</dd></div>
              <div><dt>Branches on the tree</dt><dd>{TREE.nodes.length}</dd></div>
              <div><dt>Sourced connections</dt><dd>{TREE.edges.length}</dd></div>
              <div><dt>Years of written record</dt><dd>4,000+</dd></div>
            </dl>
            <p className="tri-honest">
              <span className="md-badge md-badge-legend">Legend</span> and <span className="md-badge md-badge-history">History</span> are
              kept apart. Every chapter tells a tradition&apos;s beginning the way the tradition tells it, then sets out what
              the written record shows, with sources.
            </p>
          </div>
        </section>

        {/* ---------- The overview story ---------- */}
        <section className="trs" aria-labelledby="trs-h">
          <div className="u-wrap trs-wrap">
            <header className="trs-head">
              <p className="trs-kicker">The story in ten crossings</p>
              <h2 id="trs-h" className="u-h2">{ov.title}</h2>
              {ov.sub && <p className="trs-sub">{ov.sub}</p>}
              <div className="trs-intro"><Blocks blocks={ov.intro} opts={{ badges: true }} /></div>
            </header>
            <ol className="trs-steps">
              {ov.parts.map((p) => (
                <li key={p.id} id={p.id} className="trs-step">
                  <span className="trs-knot" aria-hidden="true" />
                  <div className="trs-lead">
                    <span className="trs-num" aria-hidden="true">{p.num.padStart(2, "0")}</span>
                    <h3 className="trs-title">{p.title}</h3>
                  </div>
                  <div className="trs-body"><Blocks blocks={p.blocks} opts={{ badges: true }} /></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- The interactive tree ---------- */}
        <section className="trt" id="tree" aria-labelledby="trt-h">
          <div className="u-wrap">
            <h2 id="trt-h" className="u-h2">Trace a lineage.</h2>
            <p className="u-lede">
              Here is the whole tree at once: {TREE.nodes.length} branches and {TREE.edges.length} sourced connections, laid
              across time and region. Choose any tradition and its family line lights up, with every link explained and
              sourced.
            </p>
          </div>
          <div className="trt-wide">
            <FamilyTree nodes={TREE.nodes} edges={TREE.edges} chapters={nodeCh} />
          </div>
        </section>

        {/* ---------- The fifteen chapters ---------- */}
        <section className="trc" id="chapters" aria-labelledby="trc-h">
          <div className="u-wrap">
            <h2 id="trc-h" className="u-h2">Fifteen origin stories.</h2>
            <p className="u-lede">
              Each one begins with a legend, then follows the record: who kept the knowledge, how it was handed down,
              where it traveled, and where it lives today.
            </p>
            <ul className="trc-grid">
              {chapters.map((c) => (
                <li key={c.slug} style={{ ["--glow" as string]: c.sky[1] }}>
                  <Link className="trc-card" href={`/traditions/${c.slug}`}>
                    <span className="trc-art">
                      <TradArt src={c.art ? art(c.art) : null} sky={c.sky} emblem={c.emblem} />
                      <span className="trc-num">{c.num}</span>
                    </span>
                    <span className="trc-meta">
                      <span className="trc-region">{c.region}</span>
                      <span className="trc-title">{c.name}{c.subtitle && c.subtitle !== c.region ? <em> {c.subtitle}</em> : null}</span>
                      <span className="trc-era">{c.era}</span>
                      <span className="trc-hook"><Inline text={c.hook} /></span>
                      <span className="trc-go">Read the story <span aria-hidden="true">→</span></span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="tr-quiet">History and heritage, not medical advice. Traditional use is not evidence that a remedy works.</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
