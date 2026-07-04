import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Category, CATEGORY_NAME, CATEGORY_DESC, docsByCategory } from "@/lib/canon";

export const metadata = {
  title: "The framework — NAP",
  description: "The twelve founding documents of the NAP framework — open for review and shaping.",
};

const ORDER: Category[] = ["core", "governance", "clinical", "integrity"];

export default function Framework() {
  return (
    <>
      <Nav />
      <section className="hero">
        <div className="hero-in">
          <div className="hero-copy">
            <div className="eyebrow">The framework</div>
            <h1>The twelve founding documents.</h1>
            <p>
              This is the full canon — formed enough to examine, unfinished enough to need you. Read any
              document, then suggest a change or add something new. Every accepted contribution is credited to
              its author.
            </p>
            <div className="hero-cta">
              <Link className="btn btn-gold" href="/shape">Shape the framework →</Link>
            </div>
          </div>
        </div>
      </section>

      {ORDER.map((cat, idx) => (
        <section key={cat} id={cat} className={`sec ${idx % 2 === 1 ? "sec-ivory2" : "sec-ivory"}`}>
          <div className="wrap">
            <div className="eyebrow-ink">{CATEGORY_NAME[cat]}</div>
            <p className="lead" style={{ marginTop: 8 }}>{CATEGORY_DESC[cat]}</p>
            <div className="grid g3">
              {docsByCategory(cat).map((d) => (
                <Link key={d.slug} className="card" href={`/framework/${d.slug}`}>
                  <span className="docnum">{d.num}</span>
                  <div className="cat">{CATEGORY_NAME[cat]}</div>
                  <h3>{d.title}</h3>
                  <p>{d.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="join">
        <h2>See something missing, or something to sharpen?</h2>
        <p>Bring it to the guide. It will show you where your idea already lives in the canon, or help you shape something new.</p>
        <Link className="btn btn-gold" href="/shape" style={{ marginTop: 18 }}>Open Shape It →</Link>
      </section>
      <Footer />
    </>
  );
}
