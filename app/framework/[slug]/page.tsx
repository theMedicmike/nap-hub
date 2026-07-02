import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { DOCS, getDoc, getDocHtml, CATEGORY_NAME } from "@/lib/canon";

export function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getDoc(slug);
  return { title: doc ? `${doc.title} — NAP` : "NAP", description: doc?.desc };
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) notFound();
  const html = getDocHtml(doc.slug);

  return (
    <>
      <Nav />
      <main className="read">
        <div className="read-in doc">
          <Link className="read-back" href="/framework">← The framework</Link>
          <div className="doc-cat">{CATEGORY_NAME[doc.category]} · Document {doc.num}</div>
          <div dangerouslySetInnerHTML={{ __html: html }} />
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
