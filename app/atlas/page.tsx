import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: "The Atlas — NAP" };

export default async function Atlas() {
  const sb = supabaseAdmin();
  let entities: any[] = [];
  let links: any[] = [];
  if (sb) {
    const e = await sb.from("atlas_entities").select("id,type,name,slug,summary").order("type").order("name");
    entities = e.data ?? [];
    const l = await sb.from("atlas_links").select("from_entity,to_entity,relation,evidence_tier,notes");
    links = l.data ?? [];
  }
  const byId: Record<string, any> = {};
  entities.forEach((x) => (byId[x.id] = x));
  const tc = (t: string) => t === "strong" ? "#2f6b45" : t === "moderate" ? "#8a6414" : t === "emerging" ? "#4a5568" : "#7a6a45";

  return (
    <>
      <Nav />
      <section className="hero"><div className="hero-in"><div className="hero-copy">
        <div className="eyebrow">The Atlas · Evidence Explorer</div>
        <h1>How it all connects.</h1>
        <p>A map of the NAP framework — conditions, systems, drivers, and ingredients — each link carrying its evidence grade from the Evidence Compendium. Educational only, not medical advice.</p>
      </div></div></section>
      <section className="sec sec-ivory"><div className="wrap">
        {entities.length === 0 && <p className="lead">The Atlas is set up but not seeded yet.</p>}
        {entities.map((en) => {
          const conns = links.filter((l) => l.from_entity === en.id || l.to_entity === en.id);
          return (
            <div key={en.id} id={en.slug} style={{ marginBottom: 20, background: "#F8F3E8", border: "0.5px solid #e2d8c2", borderRadius: 12, padding: "18px 20px", scrollMarginTop: 80 }}>
              <div style={{ color: "#B48A2F", fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", fontWeight: 600 }}>{en.type}</div>
              <div className="serif" style={{ fontSize: 21, color: "#14233B", margin: "3px 0 6px" }}>{en.name}</div>
              {en.summary && <p style={{ color: "#5b6472", fontSize: 14, margin: "0 0 10px" }}>{en.summary}</p>}
              {conns.map((l, i) => {
                const other = byId[l.from_entity === en.id ? l.to_entity : l.from_entity];
                if (!other) return null;
                const out = l.from_entity === en.id;
                return (
                  <div key={i} style={{ fontSize: 14, padding: "6px 0", borderTop: "0.5px solid #e6dcc6" }}>
                    <span style={{ color: "#5b6472" }}>{out ? "" : "← "}{l.relation}{out ? " → " : " "}</span>
                    <a href={`#${other.slug}`} style={{ color: "#14233B", fontWeight: 600 }}>{other.name}</a>
                    <span style={{ marginLeft: 8, fontSize: 10, textTransform: "uppercase", fontWeight: 600, color: tc(l.evidence_tier) }}>{l.evidence_tier}</span>
                    {l.notes && <div style={{ color: "#8a7a55", fontSize: 11.5, marginTop: 2 }}>{l.notes}</div>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div></section>
      <Footer />
    </>
  );
}
