import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Fireflies } from "@/components/universe/Fireflies";
import { ChapterToc } from "@/components/traditions/ChapterToc";
import { TradArt } from "@/components/traditions/TradArt";
import { Emblem } from "@/components/traditions/Emblem";
import { Blocks, Inline, plainText, type InlineOpts } from "@/lib/md";
import { art } from "@/lib/universe-assets";
import { CHAPTERS, TREE, getChapter, type Chapter, type Section } from "@/lib/traditions";

export const dynamicParams = false;

export function generateStaticParams() {
  return CHAPTERS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getChapter(slug);
  if (!c) return { title: "The Great Traditions — NAP" };
  return { title: `${plainText(c.title)} — The Great Traditions — NAP`, description: plainText(c.hook) };
}

const LABEL: Partial<Record<Section["kind"], { tag: string; note?: string }>> = {
  legend: { tag: "As the tradition tells it" },
  record: { tag: "History", note: "What the written record shows" },
  threads: { tag: "The family line" },
  sources: { tag: "Sources" },
};

function SectionView({ s, opts, c }: { s: Section; opts: InlineOpts; c: Chapter }) {
  const label = LABEL[s.kind];
  if (s.kind === "sources") {
    return (
      <section id={s.id} className="chs chs-sources" aria-labelledby={`${s.id}-h`}>
        <h2 id={`${s.id}-h`}>Sources</h2>
        <p className="chs-src-note">Every bracketed number in this chapter points to one of these.</p>
        <ol className="chs-src">
          {c.sources.map((src) => (
            <li key={src.n} id={`src-${src.n}`} value={src.n}>
              <Inline text={src.text} opts={{ fullUrls: false }} />
            </li>
          ))}
        </ol>
      </section>
    );
  }
  return (
    <section id={s.id} className={`chs chs-${s.kind}`} aria-labelledby={`${s.id}-h`}>
      {s.kind === "legend" && <span className="chs-seal" aria-hidden="true"><Emblem emblem={c.emblem} /></span>}
      {label && (
        <p className="chs-tag">
          <span>{label.tag}</span>
          {label.note && <span className="chs-tag-note">{label.note}</span>}
        </p>
      )}
      <h2 id={`${s.id}-h`}>{s.title}</h2>
      <div className="chs-body"><Blocks blocks={s.blocks} opts={opts} hShift={1} /></div>
    </section>
  );
}

export default async function ChapterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getChapter(slug);
  if (!c) notFound();

  const idx = CHAPTERS.findIndex((x) => x.slug === slug);
  const prev = idx > 0 ? getChapter(CHAPTERS[idx - 1].slug) : null;
  const next = idx < CHAPTERS.length - 1 ? getChapter(CHAPTERS[idx + 1].slug) : null;
  const opts: InlineOpts = { citeHref: (n) => `#src-${n}` };
  const minutes = Math.max(1, Math.round(c.words / 230));
  const src = c.art ? art(c.art) : null;

  // This chapter's place on the family tree: what flowed in, what flowed out.
  const mine = new Set(c.nodes);
  const byId = new Map(TREE.nodes.map((n) => [n.id, n]));
  const uniq = (ids: string[]) => [...new Set(ids)].map((id) => byId.get(id)!).filter(Boolean);
  const from = uniq(TREE.edges.filter((e) => mine.has(e.to) && !mine.has(e.from)).map((e) => e.from));
  const to = uniq(TREE.edges.filter((e) => mine.has(e.from) && !mine.has(e.to)).map((e) => e.to));
  const here = c.nodes.map((id) => byId.get(id)!).filter(Boolean);
  const treeHref = `/traditions?node=${c.nodes.join(",")}#tree`;
  const toc = c.sections.map((s) => ({ id: s.id, title: s.title, kind: s.kind }));

  return (
    <div className="uv tr">
      <Nav />
      <main>
        <header className="chh" style={{ ["--glow" as string]: c.sky[1] }}>
          <div className="chh-art" aria-hidden="true">
            <TradArt src={src} sky={c.sky} emblem={c.emblem} eager focal={src ? 45 : 50} />
          </div>
          <div className="chh-shade" />
          <Fireflies className="chh-ff" density={0.5} />
          <div className="chh-copy">
            <Link className="chh-back" href="/traditions#chapters"><span aria-hidden="true">←</span> The Great Traditions</Link>
            <p className="chh-kicker">Chapter {c.num} of {CHAPTERS.length} · {c.region}</p>
            <h1 className="chh-h1">{c.name}</h1>
            {c.subtitle && c.subtitle !== c.region && <p className="chh-subtitle">{c.subtitle}</p>}
            <p className="chh-hook"><Inline text={c.hook} /></p>
            <p className="chh-meta"><span>{c.era}</span><span>{minutes} min read</span><span>{c.sources.length} sources</span></p>
          </div>
        </header>

        <div className="chb">
          <div className="chb-grid">
            <aside className="chb-side">
              <ChapterToc items={toc} />
            </aside>
            <details className="chb-mtoc">
              <summary>In this chapter</summary>
              <ol>{toc.map((t) => <li key={t.id}><a href={`#${t.id}`}>{t.title}</a></li>)}</ol>
            </details>
            <article className="chb-art">
              {c.intro.length > 0 && <div className="chb-intro"><Blocks blocks={c.intro} opts={opts} /></div>}
              {c.sections.map((s) => <SectionView key={s.id} s={s} opts={opts} c={c} />)}
            </article>
          </div>
        </div>

        <section className="cht" aria-labelledby="cht-h">
          <div className="u-wrap">
            <p className="cht-kicker">On the family tree</p>
            <h2 id="cht-h" className="cht-h">Where {c.name} sits among its relatives.</h2>
            <div className="cht-map">
              <div className="cht-col cht-from">
                <p className="cht-col-h">Learned from</p>
                {from.length ? (
                  <ul>{from.map((n) => <li key={n.id} style={{ ["--c" as string]: n.color_hint }}><Link href={`/traditions?node=${n.id}#tree`}>{n.name}</Link></li>)}</ul>
                ) : <p className="cht-none">No earlier tradition is linked on the tree.</p>}
              </div>
              <div className="cht-here">
                {here.map((n) => (
                  <span key={n.id} className="cht-node" style={{ ["--c" as string]: n.color_hint }}>{n.name}</span>
                ))}
              </div>
              <div className="cht-col cht-to">
                <p className="cht-col-h">Passed on to</p>
                {to.length ? (
                  <ul>{to.map((n) => <li key={n.id} style={{ ["--c" as string]: n.color_hint }}><Link href={`/traditions?node=${n.id}#tree`}>{n.name}</Link></li>)}</ul>
                ) : <p className="cht-none">No later tradition is linked on the tree.</p>}
              </div>
            </div>
            <div className="cht-cta"><Link className="btn btn-thread" href={treeHref}>See it lit up on the family tree</Link></div>
          </div>
        </section>

        <nav className="chn" aria-label="More chapters">
          <div className="u-wrap chn-in">
            {prev ? (
              <Link className="chn-card chn-prev" href={`/traditions/${prev.slug}`}>
                <span className="chn-dir"><span aria-hidden="true">←</span> Chapter {prev.num}</span>
                <span className="chn-t">{prev.name}</span>
                <span className="chn-h"><Inline text={prev.hook} /></span>
              </Link>
            ) : <Link className="chn-card chn-prev chn-home" href="/traditions"><span className="chn-dir"><span aria-hidden="true">←</span> Back to</span><span className="chn-t">The Great Traditions</span><span className="chn-h">The family tree and all fifteen stories.</span></Link>}
            {next ? (
              <Link className="chn-card chn-next" href={`/traditions/${next.slug}`}>
                <span className="chn-dir">Chapter {next.num} <span aria-hidden="true">→</span></span>
                <span className="chn-t">{next.name}</span>
                <span className="chn-h"><Inline text={next.hook} /></span>
              </Link>
            ) : <Link className="chn-card chn-next chn-home" href="/traditions#tree"><span className="chn-dir">Back to <span aria-hidden="true">→</span></span><span className="chn-t">The family tree</span><span className="chn-h">See how every tradition connects.</span></Link>}
          </div>
          <p className="tr-quiet">History and heritage, not medical advice. Traditional use is not evidence that a remedy works.</p>
        </nav>
      </main>
      <Footer />
    </div>
  );
}
