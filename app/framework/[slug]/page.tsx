import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { DocReader } from "@/components/DocReader";
import { PUBLISHED_DOCS, getDoc, getDocHtml, isDraft, CATEGORY_NAME } from "@/lib/canon";

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

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) notFound();

  // A document pulled to draft shows an honest revision notice instead of its content. We do NOT
  // call getDocHtml or mount the audio player, so neither the unverified text nor its narration
  // can reach a reader while the document is being rebuilt on verified sources.
  if (isDraft(doc)) {
    return (
      <>
        <Nav />
        <main className="read">
          <div className="read-in doc">
            <Link className="read-back" href="/framework">← The framework</Link>
            <div className="doc-cat">{CATEGORY_NAME[doc.category]} · Document {doc.num}</div>
            <h1>{doc.title}</h1>
            <div className="note" style={{ marginTop: 18, padding: "18px 20px", borderRadius: 12, background: "#F8F3E8", border: "0.5px solid #e2d8c2", lineHeight: 1.7 }}>
              <strong>This document is being revised.</strong> We are rebuilding it on independently
              verified sources and have temporarily removed it from public view so that nothing
              unverified is presented as established. It will return once every claim has been
              checked against a primary source. Thank you for holding us to that standard.
            </div>
            <div className="doc-actions">
              <Link className="btn btn-gold" href="/framework">See the published documents</Link>
              <Link className="btn btn-ink" href="/where-it-stands">Where the framework stands</Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const html = getDocHtml(doc.slug);

  return (
    <>
      <Nav />
      <main className="read">
        <div className="read-in doc">
          <Link className="read-back" href="/framework">← The framework</Link>
          <div className="doc-cat">{CATEGORY_NAME[doc.category]} · Document {doc.num}</div>
          <DocReader slug={doc.slug} title={doc.title} html={html} />
          <div className="doc-actions">
            <Link className="btn btn-gold" href={`/shape?doc=${doc.slug}`}>Suggest a change to this document</Link>
            <Link className="btn btn-ink" href="/founders">Become a contributor</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
