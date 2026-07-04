import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { getAllEntities, TYPE_LABEL, TYPE_ORDER, AtlasEntity } from "@/lib/atlas";

export const metadata = {
  title: "The Atlas — NAP",
  description: "A clickable, evidence-graded map of how conditions, systems, drivers, and ingredients connect across the NAP framework.",
};

export const dynamic = "force-dynamic";

export default async function AtlasHome() {
  const entities = await getAllEntities();
  const grouped: Record<string, AtlasEntity[]> = {};
  for (const e of entities) {
    (grouped[e.type] ||= []).push(e);
  }
  const orderedTypes = TYPE_ORDER.filter((t) => grouped[t]?.length);

  return (
    <>
      <Nav />
      <section className="hero">
        <div className="hero-in">
          <div className="hero-copy">
            <div className="eyebrow">The Atlas · Evidence Explorer</div>
            <h1>How it all connects.</h1>
            <p>
              A clickable map of the NAP framework — conditions, biological systems, drivers, and ingredients,
              wired together. Every connection carries its evidence grade, drawn from the Evidence Compendium.
              Click anything to follow the threads.
            </p>
          </div>
        </div>
      </section>

      <section className="sec sec-ivory">
        <div className="wrap">
          <div className="note">
            An early, illustrative map — a starting set of entities and graded links from the Evidence Compendium.
            It grows as the framework is reviewed and sourced. Educational only, not medical advice.
          </div>

          {entities.length === 0 ? (
            <p className="lead" style={{ marginTop: 20 }}>
              The Atlas is set up but not yet seeded. Once the starter data is loaded, the map appears here.
            </p>
          ) : (
            orderedTypes.map((type) => (
              <div key={type} style={{ marginTop: 26 }}>
                <div className="eyebrow-ink">{TYPE_LABEL[type] ?? type}</div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 9,
                    marginTop: 11,
                  }}
                >
                  {grouped[type].map((e) => (
                    <Link
                      key={e.id}
                      href={`/atlas/${e.slug}`}
                      style={{
                        fontSize: 13.5,
                        color: "#14233B",
                        background: "#F8F3E8",
                        border: "0.5px solid #e2d8c2",
                        borderRadius: 20,
                        padding: "7px 15px",
                        textDecoration: "none",
                      }}
                    >
                      {e.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="join">
        <h2>See a link that&apos;s missing — or graded wrong?</h2>
        <p>The Atlas is meant to be shaped. Bring the evidence to the guide and help make the map more complete and more honest.</p>
        <Link className="btn btn-gold" href="/shape" style={{ marginTop: 18 }}>Shape the Atlas →</Link>
      </section>
      <Footer />
    </>
  );
}
