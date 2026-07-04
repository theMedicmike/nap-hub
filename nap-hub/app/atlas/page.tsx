import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "The Atlas — NAP",
  description: "A clickable, evidence-graded map of how conditions, systems, drivers, and ingredients connect across the NAP framework.",
};

interface E { id: string; type: string; name: string; slug: string; summary: string | null }
interface L { from_entity: string; to_entity: string; relation: string; evidence_tier: string; notes: string | null }

const TYPE_LABEL: Record<string, string> = {
  condition: "Conditions",
  driver: "Drivers & exposures",
  system: "Biological systems",
  nutrient: "Ingredients & nutrients",
  modality: "Modalities",
};
const TYPE_ORDER = ["condition", "driver", "system", "nutrient", "modality"];

function tierStyle(tier: string): { bg: string; color: string; label: string } {
  switch ((tier || "").toLowerCase()) {
    case "strong": return { bg: "#E1F0E6", color: "#2f6b45", label: "Strong" };
    case "moderate": return { bg: "#F7EAD0", color: "#8a6414", label: "Moderate" };
    case "emerging": return { bg: "#ECEDF1", color: "#4a5568", label: "Emerging" };
    default: return { bg: "#EEE7D6", color: "#7a6a45", label: "Framework" };
  }
}

const chip = { fontSize: 13.5, color: "#14233B", background: "#F8F3E8", border: "0.5px solid #e2d8c2", borderRadius: 20, padding: "7px 15px", textDecoration: "none" } as const;

export default async function Atlas() {
  const sb = supabaseAdmin();
  let entities: E[] = [];
  let links: L[] = [];
  if (sb) {
    const { data: ed } = await sb.from("atlas_entities").select("id,type,name,slug,summary").order("type").order("name");
    entities = (ed ?? []) as E[];
    const { data: ld } = await sb.from("atlas_links").select("from_entity,to_entity,relation,evidence_tier,notes");
    links = (ld ?? []) as L[];
  }

  const byId = new Map(entities.map((e) => [e.id, e]));
  const conns = new Map<string, { other: E; relation: string; tier: string; notes: string | null; outgoing: boolean }[]>();
  for (const l of links) {
    const a = byId.get(l.from_entity);
    const b = byId.get(l.to_entity);
    if (!a || !b) continue;
    (conns.get(a.id) ?? conns.set(a.id, []).get(a.id)!).push({ other: b, relation: l.relation, tier: l.evidence_tier, notes: l.notes, outgoing: true });
    (conns.get(b.id) ?? conns.set(b.id, []).get(b.id)!).push({ other: a, relation: l.relation, tier: l.evidence_tier, notes: l.notes, outgoing: false });
  }

  const grouped: Record<string, E[]> = {};
  for (const e of entities) (grouped[e.type] ||= []).push(e);
  const types = TYPE_ORDER.filter((t) => grouped[t]?.length);

  return (
    <>
      <Nav />
      <style>{`.apanel{display:none}.apanel:target{display:block;scroll-margin-top:80px}`}</style>

      <section className="hero">
        <div className="hero-in">
          <div className="hero-copy">
            <div className="eyebrow">The Atlas · Evidence Explorer</div>
            <h1>How it all connects.</h1>
            <p>A clickable map of the NAP framework — conditions, systems, drivers, and ingredients, wired together. Every connection carries its evidence grade, drawn from the Evidence Compendium. Pick any entry to open its map.</p>
          </div>
        </div>
      </section>

      <section className="sec sec-ivory">
        <div className="wrap">
          <div className="note">An early, illustrative map — a starting set of entities and graded links from the Evidence Compendium. It grows as the framework is reviewed and sourced. Educational only, not medical advice.</div>

          {entities.length === 0 ? (
            <p className="lead" style={{ marginTop: 20 }}>The Atlas is set up but not yet seeded. Once the starter data is loaded in Supabase, the map appears here.</p>
          ) : (
            types.map((type) => (
              <div key={type} style={{ marginTop: 24 }}>
                <div className="eyebrow-ink">{TYPE_LABEL[type] ?? type}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 11 }}>
                  {grouped[type].map((e) => (
                    <a key={e.id} href={`#${e.slug}`} style={chip}>{e.name}</a>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {entities.length > 0 && (
        <section className="sec sec-ivory2">
          <div className="wrap" style={{ maxWidth: 820 }}>
            {entities.map((e) => {
              const list = conns.get(e.id) ?? [];
              const cg: Record<string, typeof list> = {};
              for (const c of list) (cg[c.other.type] ||= []).push(c);
              const cTypes = TYPE_ORDER.filter((t) => cg[t]?.length);
              return (
                <div key={e.id} id={e.slug} className="apanel" style={{ marginBottom: 18, background: "#fff", border: "0.5px solid #e2d8c2", borderRadius: 12, padding: "22px 22px" }}>
                  <div style={{ color: "#B48A2F", fontSize: 10.5, letterSpacing: 1.6, textTransform: "uppercase", fontWeight: 600 }}>{TYPE_LABEL[e.type] ?? e.type}</div>
                  <div className="serif" style={{ fontSize: 24, color: "#14233B", margin: "3px 0 6px", fontWeight: 500 }}>{e.name}</div>
                  {e.summary && <p style={{ color: "#5b6472", fontSize: 14.5, lineHeight: 1.6, margin: "0 0 6px" }}>{e.summary}</p>}
                  <div style={{ color: "#8a7a55", fontSize: 12, marginBottom: 4 }}>{list.length} linked {list.length === 1 ? "entity" : "entities"}</div>

                  {cTypes.map((t) => (
                    <div key={t} style={{ marginTop: 18 }}>
                      <div style={{ color: "#B48A2F", fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>{TYPE_LABEL[t] ?? t}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {cg[t].map((c, i) => {
                          const ts = tierStyle(c.tier);
                          return (
                            <a key={i} href={`#${c.other.slug}`} style={{ display: "block", background: "#F8F3E8", border: "0.5px solid #e2d8c2", borderRadius: 9, padding: "10px 13px", textDecoration: "none" }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 14, color: "#14233B" }}>
                                  <span style={{ color: "#5b6472" }}>{c.outgoing ? "" : "← "}{c.relation}{c.outgoing ? " →" : ""} </span>
                                  <strong style={{ fontWeight: 600 }}>{c.other.name}</strong>
                                </span>
                                <span style={{ fontSize: 9.5, letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 600, padding: "2px 9px", borderRadius: 20, whiteSpace: "nowrap", background: ts.bg, color: ts.color }}>{ts.label}</span>
                              </div>
                              {c.notes && <div style={{ color: "#8a7a55", fontSize: 11.5, marginTop: 5, lineHeight: 1.45 }}>{c.notes}</div>}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <div style={{ marginTop: 18 }}><Link href="/shape" style={{ color: "#B48A2F", fontSize: 13 }}>Suggest a link or correction →</Link></div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="join">
        <h2>See a link that&apos;s missing — or graded wrong?</h2>
        <p>The Atlas is meant to be shaped. Bring the evidence to the guide and help make the map more complete and more honest.</p>
        <Link className="btn btn-gold" href="/shape" style={{ marginTop: 18 }}>Shape the Atlas →</Link>
      </section>
      <Footer />
    </>
  );
}
