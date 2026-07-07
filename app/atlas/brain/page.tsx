import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "The NAP Brain — private preview", robots: { index: false, follow: false } };

const AUTH_COOKIE = "nap_preview";
const COOKIE_PATH = "/atlas/brain";

async function signIn(formData: FormData): Promise<void> {
  "use server";
  const expected = process.env.PREVIEW_KEY ?? "";
  const key = String(formData.get("key") ?? "");
  if (!expected || key !== expected) redirect(`${COOKIE_PATH}?bad=1`);
  const jar = await cookies();
  jar.set(AUTH_COOKIE, key, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 60 * 60 * 24 * 7 });
  redirect(COOKIE_PATH);
}
async function signOut(): Promise<void> {
  "use server";
  const jar = await cookies();
  jar.delete({ name: AUTH_COOKIE, path: COOKIE_PATH });
  redirect(COOKIE_PATH);
}

interface Ent { id: string; type: string; name: string; slug: string; summary: string | null; ingredient_type: string | null; safety_summary: string | null; plain_summary: string | null }
interface Lnk { id: string; from_entity: string; to_entity: string; scientific_tier: string | null; traditional_strength: string | null; convergence_count: number | null; safety_note: string | null; status: string }

const SCI_ORDER: Record<string, number> = { established: 5, studied: 4, emerging: 3, minimal: 2, none: 1 };
const SCI_TIERS = ["established", "studied", "emerging", "minimal", "none"];
const TRAD_TIERS = ["deep", "moderate", "limited"];

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
function sciPlain(t: string | null): string {
  switch ((t || "").toLowerCase()) {
    case "established": return "Backed by strong, repeated research.";
    case "studied": return "Real studies exist, but the evidence is still mixed or modest.";
    case "emerging": return "Early research looks promising, but it's not proven yet.";
    case "minimal": return "Mostly traditional use so far — real science hasn't caught up.";
    case "none": return "No solid research on this yet.";
    default: return "";
  }
}
function tradPlain(t: string | null): string {
  switch ((t || "").toLowerCase()) {
    case "deep": return "Used for centuries, across multiple healing traditions.";
    case "moderate": return "Used traditionally in one or two systems of medicine.";
    case "limited": return "Not a strong traditional history.";
    default: return "";
  }
}
function statusBadge(s: string) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    published: { bg: "#E1F0E6", color: "#2f6b45", label: "Published" },
    in_review: { bg: "#FBEEDA", color: "#8a6414", label: "In review" },
    draft: { bg: "#ECEDF1", color: "#4a5568", label: "Draft" },
    rejected: { bg: "#F2E3E0", color: "#8a3a2a", label: "Rejected" },
  };
  const st = map[s] || map.draft;
  return <span style={{ fontSize: 9.5, letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: st.bg, color: st.color, whiteSpace: "nowrap" }}>{st.label}</span>;
}
function badge(label: string, bg: string, color: string) {
  return <span style={{ fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: bg, color, whiteSpace: "nowrap" }}>{label}</span>;
}

const selStyle = { border: ".5px solid #d9cdb2", borderRadius: 8, padding: "10px 12px", fontSize: 13.5, background: "#fff", color: "#14233B", fontFamily: "inherit" } as const;

export default async function Brain({ searchParams }: { searchParams: Promise<{ bad?: string; q?: string; cond?: string; sci?: string; trad?: string }> }) {
  const sp = await searchParams;
  const expected = process.env.PREVIEW_KEY ?? "";
  const jar = await cookies();
  const authed = Boolean(expected) && jar.get(AUTH_COOKIE)?.value === expected;

  if (!authed) {
    return (
      <>
        <Nav />
        <section className="hero"><div className="hero-in"><div className="hero-copy">
          <div className="eyebrow">The NAP Brain · Private preview</div>
          <h1>A private look inside the brain.</h1>
          <p>The evidence-graded database — every ingredient and condition, graded on two axes: real science and depth of tradition. Not public yet. Enter the view key to explore.</p>
          {sp?.bad && <div className="note" style={{ borderLeftColor: "#a33", color: "#8a3a2a" }}>That key didn&apos;t match. Try again.</div>}
          <form action={signIn} style={{ marginTop: 18, display: "flex", gap: 10, maxWidth: 420, flexWrap: "wrap" }}>
            <input name="key" type="password" placeholder="View key" autoComplete="off" style={{ flex: 1, minWidth: 180, border: ".5px solid #d9cdb2", borderRadius: 8, padding: "11px 13px", fontSize: 14, background: "#fff" }} />
            <button className="btn btn-gold" type="submit">Explore →</button>
          </form>
        </div></div></section>
        <Footer />
      </>
    );
  }

  const sb = supabaseAdmin();
  let entities: Ent[] = [];
  let links: Lnk[] = [];
  const srcByLink = new Map<string, { title: string | null; citation: string | null }[]>();

  if (sb) {
    const { data: ld } = await sb.from("atlas_links")
      .select("id,from_entity,to_entity,scientific_tier,traditional_strength,convergence_count,safety_note,status")
      .not("scientific_tier", "is", null);
    links = (ld ?? []) as Lnk[];
    const entIds = Array.from(new Set(links.flatMap((l) => [l.from_entity, l.to_entity])));
    if (entIds.length) {
      const { data: ed } = await sb.from("atlas_entities")
        .select("id,type,name,slug,summary,ingredient_type,safety_summary,plain_summary")
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
  const conditions = entities.filter((e) => e.type === "condition").sort((a, b) => a.name.localeCompare(b.name));
  const ingredients = entities.filter((e) => e.type === "ingredient");
  // cross-link count per ingredient
  const condCount = new Map<string, Set<string>>();
  for (const l of links) { if (!condCount.has(l.from_entity)) condCount.set(l.from_entity, new Set()); condCount.get(l.from_entity)!.add(l.to_entity); }

  // build a flat, filterable list of graded connections
  type Row = { link: Lnk; ing: Ent; cond: Ent };
  let rows: Row[] = [];
  for (const l of links) {
    const ing = byId.get(l.from_entity), cond = byId.get(l.to_entity);
    if (ing && cond) rows.push({ link: l, ing, cond });
  }

  const q = (sp?.q ?? "").toLowerCase().trim();
  const fCond = sp?.cond ?? "", fSci = sp?.sci ?? "", fTrad = sp?.trad ?? "";
  const totalRows = rows.length;
  rows = rows.filter((r) => {
    if (fCond && r.cond.slug !== fCond) return false;
    if (fSci && (r.link.scientific_tier || "").toLowerCase() !== fSci) return false;
    if (fTrad && (r.link.traditional_strength || "").toLowerCase() !== fTrad) return false;
    if (q && !(r.ing.name.toLowerCase().includes(q) || r.cond.name.toLowerCase().includes(q) || (r.ing.plain_summary || "").toLowerCase().includes(q))) return false;
    return true;
  });
  rows.sort((a, b) =>
    (SCI_ORDER[(b.link.scientific_tier || "").toLowerCase()] || 0) - (SCI_ORDER[(a.link.scientific_tier || "").toLowerCase()] || 0)
    || a.ing.name.localeCompare(b.ing.name));

  const anyFilter = Boolean(q || fCond || fSci || fTrad);

  const card = (r: Row) => {
    const l = r.link;
    const ss = sciStyle(l.scientific_tier), ts = tradStyle(l.traditional_strength);
    const srcs = srcByLink.get(l.id) ?? [];
    const nCond = condCount.get(l.from_entity)?.size ?? 1;
    return (
      <div key={l.id} style={{ background: "#fff", border: "0.5px solid #e2d8c2", borderRadius: 11, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div>
          <div className="serif" style={{ fontSize: 18, color: "#14233B", fontWeight: 500, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <Link href={`/ingredient/${r.ing.slug}`} style={{ color: "#14233B", textDecoration: "none" }}>{r.ing.name}</Link>{nCond >= 2 && <span title={`appears across ${nCond} conditions`} style={{ fontSize: 12 }}>🔗</span>}
          </div>
          <div style={{ color: "#5b6472", fontSize: 13 }}>may help with <Link href={`/ingredient/${r.cond.slug}`} style={{ color: "#14233B", fontWeight: 600, textDecoration: "none" }}>{r.cond.name}</Link></div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {badge(ss.label, ss.bg, ss.color)}
          {badge(ts.label, ts.bg, ts.color)}
          {typeof l.convergence_count === "number" && l.convergence_count > 0 && badge(`${l.convergence_count} traditions`, "#ECEDF1", "#4a5568")}
          {statusBadge(l.status)}
        </div>
        <div style={{ color: "#5b6472", fontSize: 12.5, lineHeight: 1.5 }}><strong style={{ color: "#14233B", fontWeight: 600 }}>In plain terms: </strong>{sciPlain(l.scientific_tier)} {tradPlain(l.traditional_strength)}</div>
        {r.ing.plain_summary && <p style={{ color: "#5b6472", fontSize: 13, lineHeight: 1.55, margin: 0 }}>{r.ing.plain_summary.length > 200 ? r.ing.plain_summary.slice(0, 200) + "…" : r.ing.plain_summary}</p>}
        {(r.ing.summary || l.safety_note || srcs.length > 0) && (
          <details>
            <summary style={{ color: "#8a7a55", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 600, cursor: "pointer" }}>Clinical detail &amp; sources</summary>
            {r.ing.summary && <p style={{ color: "#5b6472", fontSize: 12.5, lineHeight: 1.6, margin: "8px 0 0" }}>{r.ing.summary}</p>}
            {l.safety_note && <div style={{ color: "#8a7a55", fontSize: 11.5, marginTop: 7, lineHeight: 1.45 }}><strong style={{ color: "#7a6a45" }}>Safety: </strong>{l.safety_note}</div>}
            {srcs.length > 0 && <div style={{ color: "#98895f", fontSize: 11, marginTop: 6, lineHeight: 1.45 }}><strong>{srcs.length} source{srcs.length > 1 ? "s" : ""}:</strong> {srcs.map((s) => s.citation || s.title).filter(Boolean).join("  ·  ")}</div>}
          </details>
        )}
      </div>
    );
  };

  return (
    <>
      <Nav />
      <section className="hero"><div className="hero-in"><div className="hero-copy">
        <div className="eyebrow">The NAP Brain · Private preview · The graded database</div>
        <h1>Search the evidence.</h1>
        <p>Every graded connection between an ingredient and a condition — plain-English for anyone, filterable by evidence level and tradition for clinicians. Draft work, under review; not medical advice.</p>
        <div className="status" style={{ marginTop: 20 }}>
          <div><div className="k">Conditions</div><div className="v" style={{ color: "#C9A45A" }}>{conditions.length}</div></div>
          <div><div className="k">Graded connections</div><div className="v" style={{ color: "#C9A45A" }}>{totalRows}</div></div>
          <div><div className="k">Ingredients</div><div className="v" style={{ color: "#C9A45A" }}>{ingredients.length}</div></div>
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/glossary" style={{ color: "#C9A45A", fontSize: 13 }}>Looking for the full 13,000-plant traditional glossary? →</Link>
          <form action={signOut}><button className="btn btn-ghost" type="submit" style={{ padding: "6px 14px", fontSize: 12 }}>Sign out</button></form>
        </div>
      </div></div></section>

      <section className="sec sec-ivory">
        <div className="wrap">
          {/* --- filter / search bar --- */}
          <form method="get" action={COOKIE_PATH} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", background: "#fff", border: "0.5px solid #e2d8c2", borderRadius: 12, padding: "14px 16px" }}>
            <input name="q" defaultValue={sp?.q ?? ""} placeholder="Search ingredient or condition…" style={{ ...selStyle, flex: 1, minWidth: 200 }} />
            <select name="cond" defaultValue={fCond} style={selStyle}>
              <option value="">All conditions</option>
              {conditions.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
            <select name="sci" defaultValue={fSci} style={selStyle}>
              <option value="">Any evidence level</option>
              {SCI_TIERS.map((t) => <option key={t} value={t}>{sciStyle(t).label}</option>)}
            </select>
            <select name="trad" defaultValue={fTrad} style={selStyle}>
              <option value="">Any tradition</option>
              {TRAD_TIERS.map((t) => <option key={t} value={t}>{tradStyle(t).label}</option>)}
            </select>
            <button className="btn btn-gold sm" type="submit">Filter</button>
            {anyFilter && <Link href={COOKIE_PATH} style={{ color: "#8a7a55", fontSize: 13 }}>Clear</Link>}
          </form>

          <div style={{ color: "#8a7a55", fontSize: 13, margin: "18px 0 12px" }}>
            Showing <strong style={{ color: "#14233B" }}>{rows.length}</strong>{rows.length !== totalRows ? ` of ${totalRows}` : ""} connection{rows.length === 1 ? "" : "s"}
            {anyFilter ? ", best evidence first." : ", best evidence first."}
          </div>

          {rows.length === 0 ? (
            <p className="lead">No connections match those filters. Try widening the evidence level, or clear the filters.</p>
          ) : (
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))" }}>{rows.map(card)}</div>
          )}
        </div>
      </section>

      <section className="join">
        <h2>See a connection that&apos;s missing — or graded wrong?</h2>
        <p>The brain is meant to be shaped. Bring the evidence — a study, a tradition, a correction — and help make the map more complete and more honest.</p>
        <Link className="btn btn-gold" href="/shape" style={{ marginTop: 18 }}>Shape the brain →</Link>
      </section>
      <Footer />
    </>
  );
}
