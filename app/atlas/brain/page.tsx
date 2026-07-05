import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "The NAP Brain — private preview", robots: { index: false, follow: false } };

const AUTH_COOKIE = "nap_preview";
const COOKIE_PATH = "/atlas/brain";

// ---- sign in: view-key verified server-side, stored in an httpOnly cookie. Separate
// from the review key — this grants LOOKING, not approving. ----
async function signIn(formData: FormData): Promise<void> {
  "use server";
  const expected = process.env.PREVIEW_KEY ?? "";
  const key = String(formData.get("key") ?? "");
  if (!expected || key !== expected) redirect(`${COOKIE_PATH}?bad=1`);
  const jar = await cookies();
  jar.set(AUTH_COOKIE, key, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: COOKIE_PATH, maxAge: 60 * 60 * 24 * 7 });
  redirect(COOKIE_PATH);
}
async function signOut(): Promise<void> {
  "use server";
  const jar = await cookies();
  jar.delete({ name: AUTH_COOKIE, path: COOKIE_PATH });
  redirect(COOKIE_PATH);
}

interface Ent { id: string; type: string; name: string; slug: string; summary: string | null; ingredient_type: string | null; traditions: { system: string; use: string }[] | null; safety_summary: string | null; publish_status: string | null }
interface Lnk { id: string; from_entity: string; to_entity: string; relation: string; scientific_tier: string | null; traditional_strength: string | null; convergence_count: number | null; safety_note: string | null; notes: string | null; status: string }
interface Conn { other: Ent; link: Lnk; dir: "to-condition" | "to-ingredient" }

const SCI_ORDER: Record<string, number> = { established: 5, studied: 4, emerging: 3, minimal: 2, none: 1 };
function sciStyle(t: string | null): { bg: string; color: string; label: string } {
  switch ((t || "").toLowerCase()) {
    case "established": return { bg: "#E1F0E6", color: "#2f6b45", label: "Established" };
    case "studied": return { bg: "#F7EAD0", color: "#8a6414", label: "Studied" };
    case "emerging": return { bg: "#ECEDF1", color: "#4a5568", label: "Emerging" };
    case "minimal": return { bg: "#F0EBE1", color: "#7a6a45", label: "Minimal" };
    default: return { bg: "#EEE7D6", color: "#7a6a45", label: t || "—" };
  }
}
function tradStyle(t: string | null): { bg: string; color: string; label: string } {
  switch ((t || "").toLowerCase()) {
    case "deep": return { bg: "#EDE4F3", color: "#5b3f7a", label: "Deep tradition" };
    case "moderate": return { bg: "#F1E9F6", color: "#6b5486", label: "Moderate tradition" };
    case "limited": return { bg: "#F3EFEA", color: "#7a6a55", label: "Limited tradition" };
    default: return { bg: "#F3EFEA", color: "#7a6a55", label: t || "—" };
  }
}
function statusBadge(s: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    published: { bg: "#E1F0E6", color: "#2f6b45", label: "Published" },
    in_review: { bg: "#FBEEDA", color: "#8a6414", label: "Flagged · in review" },
    draft: { bg: "#ECEDF1", color: "#4a5568", label: "Draft" },
    rejected: { bg: "#F2E3E0", color: "#8a3a2a", label: "Rejected" },
  };
  const st = map[s] || map.draft;
  return <span style={{ fontSize: 9.5, letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: st.bg, color: st.color, whiteSpace: "nowrap" }}>{st.label}</span>;
}
function badge(label: string, bg: string, color: string) {
  return <span style={{ fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: bg, color, whiteSpace: "nowrap" }}>{label}</span>;
}

const chip = { fontSize: 13.5, color: "#14233B", background: "#F8F3E8", border: "0.5px solid #e2d8c2", borderRadius: 20, padding: "7px 15px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 7 } as const;

export default async function Brain({ searchParams }: { searchParams: Promise<{ bad?: string }> }) {
  const sp = await searchParams;
  const expected = process.env.PREVIEW_KEY ?? "";
  const jar = await cookies();
  const authed = Boolean(expected) && jar.get(AUTH_COOKIE)?.value === expected;

  if (!authed) {
    return (
      <>
        <Nav />
        <section className="hero">
          <div className="hero-in">
            <div className="hero-copy">
              <div className="eyebrow">The NAP Brain · Private preview</div>
              <h1>A private look inside the brain.</h1>
              <p>This is the evidence-graded map as it&apos;s being built — every ingredient, every condition, every connection, graded on two axes. It&apos;s not public yet. Enter the view key to explore it.</p>
              {sp?.bad && <div className="note" style={{ borderLeftColor: "#a33", color: "#8a3a2a" }}>That key didn&apos;t match. Try again.</div>}
              <form action={signIn} style={{ marginTop: 18, display: "flex", gap: 10, maxWidth: 420, flexWrap: "wrap" }}>
                <input name="key" type="password" placeholder="View key" autoComplete="off" style={{ flex: 1, minWidth: 180, border: ".5px solid #d9cdb2", borderRadius: 8, padding: "11px 13px", fontSize: 14, background: "#fff" }} />
                <button className="btn btn-gold" type="submit">Explore →</button>
              </form>
            </div>
          </div>
        </section>
        <Footer />
      </>
    );
  }

  const sb = supabaseAdmin();
  let entities: Ent[] = [];
  let links: Lnk[] = [];
  const srcByLink = new Map<string, { title: string | null; citation: string | null }[]>();

  if (sb) {
    // The brain = links that carry a dual-axis grade (scientific_tier set).
    const { data: ld } = await sb.from("atlas_links")
      .select("id,from_entity,to_entity,relation,scientific_tier,traditional_strength,convergence_count,safety_note,notes,status")
      .not("scientific_tier", "is", null);
    links = (ld ?? []) as Lnk[];
    const entIds = Array.from(new Set(links.flatMap((l) => [l.from_entity, l.to_entity])));
    if (entIds.length) {
      const { data: ed } = await sb.from("atlas_entities")
        .select("id,type,name,slug,summary,ingredient_type,traditions,safety_summary,publish_status")
        .in("id", entIds);
      entities = (ed ?? []) as Ent[];
    }
    const linkIds = links.map((l) => l.id).filter(Boolean);
    if (linkIds.length) {
      const { data: lsd } = await sb.from("atlas_link_sources").select("link_id,source_id").in("link_id", linkIds);
      const srcIds = Array.from(new Set((lsd ?? []).map((x) => x.source_id)));
      const { data: sd } = srcIds.length
        ? await sb.from("atlas_sources").select("id,title,citation").in("id", srcIds)
        : { data: [] as { id: string; title: string | null; citation: string | null }[] };
      const srcById = new Map((sd ?? []).map((s) => [s.id, s]));
      for (const row of lsd ?? []) {
        const s = srcById.get(row.source_id);
        if (!s) continue;
        (srcByLink.get(row.link_id) ?? srcByLink.set(row.link_id, []).get(row.link_id)!).push({ title: s.title, citation: s.citation });
      }
    }
  }

  const byId = new Map(entities.map((e) => [e.id, e]));
  const conns = new Map<string, Conn[]>();
  for (const l of links) {
    const from = byId.get(l.from_entity);
    const to = byId.get(l.to_entity);
    if (!from || !to) continue;
    (conns.get(to.id) ?? conns.set(to.id, []).get(to.id)!).push({ other: from, link: l, dir: "to-ingredient" });   // condition ← ingredient
    (conns.get(from.id) ?? conns.set(from.id, []).get(from.id)!).push({ other: to, link: l, dir: "to-condition" }); // ingredient → condition
  }

  const conditions = entities.filter((e) => e.type === "condition").sort((a, b) => a.name.localeCompare(b.name));
  const ingredients = entities.filter((e) => e.type === "ingredient").sort((a, b) => a.name.localeCompare(b.name));

  // cross-linked = an ingredient linked to 2+ distinct conditions
  const conditionCount = (e: Ent) => new Set((conns.get(e.id) ?? []).filter((c) => c.dir === "to-condition" && c.other.type === "condition").map((c) => c.other.id)).size;
  const crossLinked = ingredients.filter((e) => conditionCount(e) >= 2);

  const sourceList = (l: Lnk) => srcByLink.get(l.id) ?? [];

  const connRow = (c: Conn) => {
    const ss = sciStyle(c.link.scientific_tier);
    const ts = tradStyle(c.link.traditional_strength);
    const srcs = sourceList(c.link);
    return (
      <a key={c.link.id + c.other.id} href={`#${c.other.slug}`} style={{ display: "block", background: "#F8F3E8", border: "0.5px solid #e2d8c2", borderRadius: 9, padding: "11px 13px", textDecoration: "none" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14.5, color: "#14233B" }}>
            <span style={{ color: "#5b6472" }}>{c.dir === "to-condition" ? "may support → " : "← "}</span>
            <strong style={{ fontWeight: 600 }}>{c.other.name}</strong>
          </span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {badge(ss.label, ss.bg, ss.color)}
            {badge(ts.label, ts.bg, ts.color)}
            {typeof c.link.convergence_count === "number" && c.link.convergence_count > 0 && badge(`${c.link.convergence_count} traditions`, "#ECEDF1", "#4a5568")}
            {statusBadge(c.link.status)}
          </div>
        </div>
        {c.link.safety_note && <div style={{ color: "#8a7a55", fontSize: 11.5, marginTop: 6, lineHeight: 1.45 }}><strong style={{ color: "#7a6a45" }}>Safety: </strong>{c.link.safety_note.slice(0, 220)}{c.link.safety_note.length > 220 ? "…" : ""}</div>}
        {srcs.length > 0 && <div style={{ color: "#98895f", fontSize: 11, marginTop: 5, lineHeight: 1.45 }}>{srcs.length} source{srcs.length > 1 ? "s" : ""}: {srcs.map((s) => s.citation || s.title).filter(Boolean).join(" · ").slice(0, 260)}…</div>}
      </a>
    );
  };

  const total = links.length;

  return (
    <>
      <Nav />
      <style>{`.bpanel{display:none}.bpanel:target{display:block;scroll-margin-top:80px}`}</style>

      <section className="hero">
        <div className="hero-in">
          <div className="hero-copy">
            <div className="eyebrow">The NAP Brain · Private preview</div>
            <h1>The map, as it&apos;s being built.</h1>
            <p>Every connection is graded on two axes — scientific evidence and depth of tradition — and every claim carries its safety note and sources. Draft work, under review. Pick any condition or ingredient to open its map. The ones marked 🔗 appear across more than one condition.</p>
            <div className="status" style={{ marginTop: 22 }}>
              <div><div className="k">Conditions</div><div className="v" style={{ color: "#C9A45A" }}>{conditions.length}</div></div>
              <div><div className="k">Ingredients</div><div className="v" style={{ color: "#C9A45A" }}>{ingredients.length}</div></div>
              <div><div className="k">Connections</div><div className="v" style={{ color: "#C9A45A" }}>{total}</div></div>
              <div><div className="k">🔗 Cross-linked</div><div className="v" style={{ color: "#C9A45A" }}>{crossLinked.length}</div></div>
            </div>
            <div style={{ marginTop: 16 }}>
              <form action={signOut}><button className="btn btn-ghost" type="submit" style={{ padding: "6px 14px", fontSize: 12 }}>Sign out</button></form>
            </div>
          </div>
        </div>
      </section>

      {entities.length === 0 ? (
        <section className="sec sec-ivory"><div className="wrap"><p className="lead">The brain has no graded nodes yet. Load a node in Supabase and it appears here.</p></div></section>
      ) : (
        <>
          <section className="sec sec-ivory">
            <div className="wrap">
              <div className="note">Private preview — draft and in-review claims included, for shaping only. Educational framework, not medical advice. Nothing here is published to the public Atlas until reviewed.</div>

              <div className="eyebrow-ink" style={{ marginTop: 24 }}>Browse by condition</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 11 }}>
                {conditions.map((e) => (
                  <a key={e.id} href={`#${e.slug}`} style={chip}>{e.name}<span style={{ color: "#98895f", fontSize: 11.5 }}>{(conns.get(e.id) ?? []).filter((c) => c.dir === "to-ingredient").length}</span></a>
                ))}
              </div>

              <div className="eyebrow-ink" style={{ marginTop: 26 }}>Browse by ingredient</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 11 }}>
                {ingredients.map((e) => {
                  const n = conditionCount(e);
                  return <a key={e.id} href={`#${e.slug}`} style={chip}>{n >= 2 && <span title="appears across multiple conditions">🔗</span>}{e.name}</a>;
                })}
              </div>
            </div>
          </section>

          <section className="sec sec-ivory2">
            <div className="wrap" style={{ maxWidth: 840 }}>
              {[...conditions, ...ingredients].map((e) => {
                const list = conns.get(e.id) ?? [];
                const rel = e.type === "condition" ? list.filter((c) => c.dir === "to-ingredient") : list.filter((c) => c.dir === "to-condition");
                rel.sort((a, b) => (SCI_ORDER[(b.link.scientific_tier || "").toLowerCase()] || 0) - (SCI_ORDER[(a.link.scientific_tier || "").toLowerCase()] || 0));
                const n = e.type === "ingredient" ? conditionCount(e) : 0;
                return (
                  <div key={e.id} id={e.slug} className="bpanel" style={{ marginBottom: 18, background: "#fff", border: "0.5px solid #e2d8c2", borderRadius: 12, padding: "22px 22px" }}>
                    <div style={{ color: "#B48A2F", fontSize: 10.5, letterSpacing: 1.6, textTransform: "uppercase", fontWeight: 600 }}>{e.type === "condition" ? "Condition" : "Ingredient"}{e.ingredient_type ? ` · ${e.ingredient_type}` : ""}</div>
                    <div className="serif" style={{ fontSize: 25, color: "#14233B", margin: "3px 0 6px", fontWeight: 500, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      {e.name}
                      {n >= 2 && badge(`🔗 in ${n} conditions`, "#F7EAD0", "#8a6414")}
                    </div>
                    {e.summary && <p style={{ color: "#5b6472", fontSize: 14.5, lineHeight: 1.6, margin: "0 0 10px" }}>{e.summary}</p>}

                    {e.type === "ingredient" && e.traditions && e.traditions.length > 0 && (
                      <div style={{ margin: "10px 0 6px" }}>
                        <div style={{ color: "#7a6a45", fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 700, marginBottom: 5 }}>Across traditions</div>
                        {e.traditions.slice(0, 6).map((t, i) => (
                          <div key={i} style={{ fontSize: 12.5, color: "#5b6472", lineHeight: 1.5, marginBottom: 3 }}><strong style={{ color: "#14233B", fontWeight: 600 }}>{t.system}:</strong> {t.use}</div>
                        ))}
                      </div>
                    )}

                    <div style={{ color: "#8a7a55", fontSize: 12, margin: "10px 0 8px" }}>{rel.length} {e.type === "condition" ? "ingredient" : "condition"}{rel.length === 1 ? "" : "s"} linked</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{rel.map(connRow)}</div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
      <Footer />
    </>
  );
}
