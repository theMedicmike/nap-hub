import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Fireflies } from "@/components/universe/Fireflies";
import { Emblem as CatEmblem } from "@/components/universe/Library";
import { CATEGORY_NAME, CATEGORY_DESC } from "@/lib/canon";
import { START_HERE, SHELF_ORDER, TONE, publishedVolumes, type VolumeInfo } from "@/lib/framework";
import "../inner.css";

export const metadata = {
  title: "The framework — NAP",
  description: "The founding documents of the NAP framework — open for review and shaping. Every volume in full, with narration.",
};

function Meta({ v }: { v: VolumeInfo }) {
  return (
    <span className="fw-meta">
      <span>{v.minutes} min read</span>
      <span className={v.audioParts ? "fw-aud" : "fw-aud fw-aud-off"}>
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 8v4h3l4 3V5L6 8H3z" fill="currentColor" /><path d="M13 7.5c1 .8 1 4.2 0 5M15.5 5.5c2.2 2 2.2 7 0 9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
        {v.audioParts ? "Narrated" : "Browser voice"}
      </span>
    </span>
  );
}

export default function Framework() {
  const vols = publishedVolumes();
  const bySlug = new Map(vols.map((v) => [v.slug, v]));
  const start = START_HERE.map((s) => ({ ...s, v: bySlug.get(s.slug) })).filter((s): s is typeof s & { v: VolumeInfo } => !!s.v);
  const maxMin = Math.max(...vols.map((v) => v.minutes), 1);

  return (
    <div className="uv fw">
      <Nav />
      <main>
        <header className="fwh" aria-labelledby="fwh-h">
          <Fireflies className="fwh-ff" density={0.45} />
          <div className="u-wrap fwh-in">
            <div className="fwh-copy">
              <p className="fwh-kicker">The Library</p>
              <h1 id="fwh-h" className="fwh-h1">The founding documents.</h1>
              <p className="fwh-lede">
                This is the full canon, formed enough to examine and unfinished enough to need you. Read any
                document, listen to it, then suggest a change or add something new. Every accepted contribution is
                credited to its author.
              </p>
              <div className="fwh-cta">
                <a className="btn btn-thread" href="#start">Where to begin</a>
                <Link className="btn btn-glass" href="/shape">Shape the framework</Link>
              </div>
            </div>

            <div className="fws" aria-label="Every volume on the shelf">
              <ul className="fws-row">
                {vols.map((v, i) => {
                  const t = TONE[v.category];
                  const w = 1 + Math.log(1 + v.minutes) / Math.log(1 + maxMin);
                  return (
                    <li key={v.slug} className="fws-cell" style={{ ["--i" as string]: i, ["--w" as string]: w.toFixed(3), ["--bk" as string]: t.bg, ["--bk-edge" as string]: t.edge, ["--h" as string]: `${86 + (Number(v.num) * 37) % 14}%` }}>
                      <Link className="fws-spine" href={`/framework/${v.slug}`} aria-label={`${v.title}, ${v.minutes} minute read`}>
                        <span className="fws-band" aria-hidden="true" />
                        <span className="fws-title" aria-hidden="true">{v.title.replace(/^(The )?NAP /, "")}</span>
                        <span className="fws-num" aria-hidden="true">{v.num}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="fws-plank" aria-hidden="true"><span className="fws-thread" /></div>
              <ul className="fws-key" aria-label="Shelves">
                {SHELF_ORDER.map((c) => <li key={c} style={{ ["--bk-edge" as string]: TONE[c].edge }}><a href={`#${c}`}>{CATEGORY_NAME[c]}</a></li>)}
              </ul>
            </div>
          </div>
        </header>

        <section className="fwp" id="start" aria-labelledby="fwp-h">
          <div className="u-wrap">
            <h2 id="fwp-h" className="fw-h2">New here? Start with these three.</h2>
            <p className="u-lede">Read them in this order and you will know what NAP proposes, what it has not done yet, and the full case behind it.</p>
            <ol className="fwp-path">
              {start.map(({ v, why }, i) => (
                <li key={v.slug} className="fwp-step">
                  <span className="fwp-knot" aria-hidden="true">{i + 1}</span>
                  <Link className="fwp-card" href={`/framework/${v.slug}`} style={{ ["--bk" as string]: TONE[v.category].bg, ["--bk-edge" as string]: TONE[v.category].edge }}>
                    <span className="fwp-cover" aria-hidden="true">
                      <span className="fwp-cover-frame" />
                      <span className="fwp-cover-em"><CatEmblem category={v.category} /></span>
                    </span>
                    <span className="fwp-text">
                      <span className="fwp-t">{v.title.replace(/^NAP /, "")}</span>
                      <span className="fwp-why">{why}</span>
                      <Meta v={v} />
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {SHELF_ORDER.map((cat) => {
          const shelf = vols.filter((v) => v.category === cat);
          if (!shelf.length) return null;
          return (
            <section key={cat} id={cat} className="fwc" aria-labelledby={`${cat}-h`} style={{ ["--bk" as string]: TONE[cat].bg, ["--bk-edge" as string]: TONE[cat].edge }}>
              <div className="u-wrap fwc-in">
                <div className="fwc-head">
                  <span className="fwc-em" aria-hidden="true"><CatEmblem category={cat} /></span>
                  <h2 id={`${cat}-h`} className="fwc-h">{CATEGORY_NAME[cat]}</h2>
                  <p className="fwc-desc">{CATEGORY_DESC[cat]}</p>
                </div>
                <ul className="fwc-list">
                  {shelf.map((v) => (
                    <li key={v.slug}>
                      <Link className="fwv" href={`/framework/${v.slug}`}>
                        <span className="fwv-spine" aria-hidden="true"><span>{v.num}</span></span>
                        <span className="fwv-body">
                          <span className="fwv-t">{v.title.replace(/^NAP /, "")}</span>
                          <span className="fwv-d">{v.desc}</span>
                          <Meta v={v} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          );
        })}

        <section className="hands fw-end" aria-labelledby="fw-end-h">
          <svg className="hands-thread" viewBox="0 0 1200 200" preserveAspectRatio="none" aria-hidden="true">
            <path pathLength={1} d="M0 120 C 200 40 360 180 600 110 S 980 60 1200 120" />
          </svg>
          <div className="u-wrap hands-in">
            <h2 id="fw-end-h" className="hands-h">See something missing, or something to&nbsp;sharpen?</h2>
            <p className="u-lede">Bring it to the guide. It will help you sharpen it into a clear proposal.</p>
            <div className="fw-end-cta">
              <Link className="btn btn-thread" href="/shape">Open Shape It</Link>
              <Link className="btn btn-glass" href="/where-it-stands">Where the framework stands</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
