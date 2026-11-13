import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { DocReader } from "@/components/DocReader";
import { ReadProgress } from "@/components/ReadProgress";
import { Fireflies } from "@/components/universe/Fireflies";
import { Emblem as CatEmblem } from "@/components/universe/Library";
import { ChapterToc } from "@/components/traditions/ChapterToc";
import { Inline } from "@/lib/md";
import { PUBLISHED_DOCS, getDoc, isDraft, CATEGORY_NAME, type DocMeta } from "@/lib/canon";
import { TONE, docView, neighbours, volumeInfo } from "@/lib/framework";
import "../../traditions/traditions.css";
import "../../inner.css";

// Only published documents are prerendered. Draft docs still resolve (dynamicParams default) but
// render the "being revised" notice below — never their content.
export function generateStaticParams() {
  return PUBLISHED_DOCS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) return { title: "NAP" };
  if (isDraft(doc)) return { title: `${doc.title} (being revised) — NAP`, robots: { index: false } };
  return { title: `${doc.title} — NAP`, description: doc.desc };
}

function Cover({ doc }: { doc: DocMeta }) {
  return (
    <span className="drh-book" aria-hidden="true">
      <span className="drh-book-body">
        <span className="book-frame" />
        <span className="drh-book-em"><CatEmblem category={doc.category} /></span>
        <span className="drh-book-text">
          <span className="book-num">No. {doc.num}</span>
          <span className="drh-book-title">{doc.title.replace(/^(The )?NAP /, "")}</span>
          <span className="book-cat">{CATEGORY_NAME[doc.category]}</span>
        </span>
      </span>
    </span>
  );
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) notFound();
  const tone = TONE[doc.category];
  const toneStyle = { ["--bk" as string]: tone.bg, ["--bk-edge" as string]: tone.edge };

  // A document pulled to draft shows an honest revision notice instead of its content. We do NOT
  // call docView or mount the audio player, so neither the unverified text nor its narration
  // can reach a reader while the document is being rebuilt on verified sources.
  if (isDraft(doc)) {
    return (
      <div className="uv fw dr">
        <Nav />
        <main>
          <header className="drh" style={toneStyle}>
            <div className="u-wrap drh-in">
              <div className="drh-copy">
                <Link className="chh-back" href="/framework"><span aria-hidden="true">←</span> The framework</Link>
                <p className="drh-kicker">{CATEGORY_NAME[doc.category]}, document {doc.num}</p>
                <h1 className="drh-h1">{doc.title}</h1>
                <div className="dr-status dr-status-dark">
                  <p><strong>This document is being revised.</strong> We are rebuilding it on independently
                  verified sources and have temporarily removed it from public view so that nothing
                  unverified is presented as established. It will return once every claim has been
                  checked against a primary source. Thank you for holding us to that standard.</p>
                </div>
                <div className="fwh-cta">
                  <Link className="btn btn-thread" href="/framework">See the published documents</Link>
                  <Link className="btn btn-glass" href="/where-it-stands">Where the framework stands</Link>
                </div>
              </div>
              <Cover doc={doc} />
            </div>
          </header>
        </main>
        <Footer />
      </div>
    );
  }

  const v = volumeInfo(doc);
  const view = docView(doc.slug);
  const { prev, next, index, total } = neighbours(doc.slug);

  return (
    <div className="uv fw dr">
      <ReadProgress targetId="dr-text" />
      <Nav />
      <main>
        <header className="drh" style={toneStyle}>
          <Fireflies className="drh-ff" density={0.35} />
          <div className="u-wrap drh-in">
            <div className="drh-copy">
              <Link className="chh-back" href="/framework"><span aria-hidden="true">←</span> The Library</Link>
              <p className="drh-kicker">Volume {doc.num}{index >= 0 ? ` of ${total}` : ""}, {CATEGORY_NAME[doc.category].toLowerCase()}</p>
              <h1 className="drh-h1">{doc.title}</h1>
              <p className="drh-hook">{doc.desc}</p>
              <p className="drh-meta">
                <span>{v.minutes} min read</span>
                <span>{v.audioParts ? `Narrated in ${v.audioParts} part${v.audioParts === 1 ? "" : "s"}` : "Read aloud by your browser"}</span>
                {view.toc.length > 0 && <span>{view.toc.length} sections</span>}
              </p>
              <p className="drh-draft">
                <span className="drh-draft-dot" aria-hidden="true" />
                A founding draft, published for review. Not medical advice.
              </p>
            </div>
            <Cover doc={doc} />
          </div>
        </header>

        <div className="chb drb">
          <div className="chb-grid">
            {view.toc.length > 0 && (
              <aside className="chb-side">
                <ChapterToc items={view.toc} heading="In this document" />
              </aside>
            )}
            {view.toc.length > 0 && (
              <details className="chb-mtoc">
                <summary>In this document</summary>
                <ol>{view.toc.map((t) => <li key={t.id}><a href={`#${t.id}`}>{t.title}</a></li>)}</ol>
              </details>
            )}
            <article className="dr-art" id="dr-text" aria-label={doc.title}>
              {view.status && (
                <aside className="dr-status" aria-label="Status of this document">
                  <p className="dr-status-tag">Read this first</p>
                  <p><Inline text={view.status} /></p>
                </aside>
              )}
              <DocReader slug={doc.slug} title={doc.title} html={view.html} />
              <div className="dr-actions">
                <Link className="btn btn-gold" href={`/shape?doc=${doc.slug}`}>Suggest a change to this document</Link>
                <Link className="btn btn-ink" href="/founders">Become a contributor</Link>
              </div>
            </article>
          </div>
        </div>

        <nav className="chn dr-nav" aria-label="More volumes">
          <div className="u-wrap chn-in">
            {prev ? (
              <Link className="chn-card chn-prev" href={`/framework/${prev.slug}`}>
                <span className="chn-dir"><span aria-hidden="true">←</span> Volume {prev.num}</span>
                <span className="chn-t">{prev.title.replace(/^NAP /, "")}</span>
                <span className="chn-h">{prev.desc}</span>
              </Link>
            ) : (
              <Link className="chn-card chn-prev chn-home" href="/framework">
                <span className="chn-dir"><span aria-hidden="true">←</span> Back to</span>
                <span className="chn-t">The Library</span>
                <span className="chn-h">Every founding document, by shelf.</span>
              </Link>
            )}
            {next ? (
              <Link className="chn-card chn-next" href={`/framework/${next.slug}`}>
                <span className="chn-dir">Volume {next.num} <span aria-hidden="true">→</span></span>
                <span className="chn-t">{next.title.replace(/^NAP /, "")}</span>
                <span className="chn-h">{next.desc}</span>
              </Link>
            ) : (
              <Link className="chn-card chn-next chn-home" href="/framework">
                <span className="chn-dir">Back to <span aria-hidden="true">→</span></span>
                <span className="chn-t">The Library</span>
                <span className="chn-h">Every founding document, by shelf.</span>
              </Link>
            )}
          </div>
        </nav>
      </main>
      <Footer />
    </div>
  );
}
