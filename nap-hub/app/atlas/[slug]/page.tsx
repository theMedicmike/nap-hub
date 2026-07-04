import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { getEntity, getConnections, tierStyle, TYPE_LABEL, TYPE_ORDER, Connection } from "@/lib/atlas";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const e = await getEntity(slug);
  return { title: e ? `${e.name} — NAP Atlas` : "NAP Atlas" };
}

export default async function EntityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entity = await getEntity(slug);
  if (!entity) notFound();

  const connections = await getConnections(entity);
  const grouped: Record<string, Connection[]> = {};
  for (const c of connections) {
    (grouped[c.other.type] ||= []).push(c);
  }
  const orderedTypes = TYPE_ORDER.filter((t) => grouped[t]?.length);

  return (
    <>
      <Nav />
      <main className="read">
        <div className="read-in" style={{ maxWidth: 820 }}>
          <Link className="read-back" href="/atlas">← The Atlas</Link>

          <div style={{ marginTop: 22 }}>
            <div style={{ color: "#B48A2F", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>
              {TYPE_LABEL[entity.type] ?? entity.type}
            </div>
            <h1 className="serif" style={{ fontSize: 30, color: "#14233B", margin: "4px 0 8px", fontWeight: 500 }}>
              {entity.name}
            </h1>
            {entity.summary && (
              <p style={{ color: "#5b6472", fontSize: 15, lineHeight: 1.6, maxWidth: 620 }}>{entity.summary}</p>
            )}
            <div style={{ color: "#8a7a55", fontSize: 12.5, marginTop: 8 }}>
              {connections.length} linked {connections.length === 1 ? "entity" : "entities"}
            </div>
          </div>

          {connections.length === 0 ? (
            <p style={{ color: "#5b6472", fontSize: 14, marginTop: 26 }}>No links recorded yet for this entry.</p>
          ) : (
            orderedTypes.map((type) => (
              <div key={type} style={{ marginTop: 28 }}>
                <div style={{ color: "#B48A2F", fontSize: 10.5, letterSpacing: 1.4, textTransform: "uppercase", fontWeight: 600, marginBottom: 10 }}>
                  {TYPE_LABEL[type] ?? type}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {grouped[type].map((c, i) => {
                    const t = tierStyle(c.tier);
                    return (
                      <Link
                        key={i}
                        href={`/atlas/${c.other.slug}`}
                        style={{
                          display: "block",
                          background: "#F8F3E8",
                          border: "0.5px solid #e2d8c2",
                          borderRadius: 10,
                          padding: "12px 15px",
                          textDecoration: "none",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14.5, color: "#14233B" }}>
                            <span style={{ color: "#5b6472" }}>{c.outgoing ? "" : "← "}{c.relation}{c.outgoing ? " →" : ""} </span>
                            <strong style={{ fontWeight: 600 }}>{c.other.name}</strong>
                          </span>
                          <span style={{ fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 600, padding: "2px 9px", borderRadius: 20, whiteSpace: "nowrap", background: t.bg, color: t.color }}>
                            {t.label}
                          </span>
                        </div>
                        {c.notes && (
                          <div style={{ color: "#8a7a55", fontSize: 12, marginTop: 6, lineHeight: 1.45 }}>{c.notes}</div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          <div style={{ marginTop: 34, paddingTop: 20, borderTop: "0.5px solid #ded3bb", display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="btn btn-gold" href="/shape">Suggest a link or correction</Link>
            <Link className="btn btn-ink" href="/atlas">Back to the Atlas</Link>
          </div>
          <p style={{ color: "#8a7a55", fontSize: 11.5, marginTop: 18 }}>
            Educational map of framework relationships and their evidence grade — not medical advice, and not a treatment recommendation.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
