import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "The NAP Database — private preview", robots: { index: false, follow: false } };

const AUTH_COOKIE = "nap_preview";
const COOKIE_PATH = "/atlas/brain";

const CATEGORIES = [
  "Cancers & tumors", "Brain & nervous system", "Mental & emotional health", "Addiction & recovery",
  "Sleep", "Heart & circulation", "Blood & immune system", "Infections", "Metabolic & hormonal",
  "Lungs & breathing", "Digestion, gut & liver", "Kidney & urinary", "Bones, joints & muscles",
  "Skin, hair & nails", "Eyes & vision", "Ears, nose, mouth & throat", "Reproductive & sexual health",
  "Pregnancy, child & development", "Pain", "Wounds, injury & first aid", "Energy, fatigue & vitality",
  "Other traditional & practical uses", "General & other",
];

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
  jar.delete({ name: AUTH_COOKIE, path: "/" });
  redirect(COOKIE_PATH);
}

interface Ent { id: string; type: string; name: string; slug: string; plain_summary: string | null; ingredient_type: string | null; category: string | null; veteran_priority: boolean | null; publish_status: string | null }
const selStyle = { border: ".5px solid #d9cdb2", borderRadius: 8, padding: "10px 12px", fontSize: 13.5, background: "#fff", color: "#14233B", fontFamily: "inherit" } as const;

function evidenceBadge(hasGraded: boolean) {
  return hasGraded
    ? <span style={{ fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "#E1F0E6", color: "#2f6b45" }}>🟢 Proven &amp; graded</span>
    : <span style={{ fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "#F3EED9", color: "#7a6a45" }}>🟤 Traditional record</span>;
}
function vetBadge() {
  return <span style={{ fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "#C9A45A", color: "#14233B" }}>🎖 Veteran</span>;
}

export default async function Database({ searchParams }: { searchParams: Promise<{ bad?: string; q?: string; cat?: string; evidence?: string; vet?: string }> }) {
  const sp = await searchParams;
  const expected = process.env.PREVIEW_KEY ?? "";
  const jar = await cookies();
  const authed = Boolean(expected) && jar.get(AUTH_COOKIE)?.value === expected;

  if (!authed) {
    return (
      <>
        <Nav />
        <section className="hero"><div className="hero-in"><div className="hero-copy">
          <div className="eyebrow">The NAP Database · Private preview</div>
          <h1>One database. Every plant, every condition.</h1>
          <p>Graded, evidence-checked ingredients and a 13,000-plant traditional record, side by side — always clearly labeled which is which. Enter the view key to explore.</p>
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
  const q = (sp?.q ?? "").trim();
  const cat = sp?.cat ?? "";
  const evidence = sp?.evidence ?? ""; // "graded" | "traditional" | ""
  const vetOnly = sp?.vet === "1";
  const anyFilter = Boolean(q || cat || evidence || vetOnly);

  let totalConditions = 0, totalIngredients = 0, gradedLinks = 0, coverageLinks = 0;
  let catCounts = new Map<string, number>();
  let gradedCondIds = new Set<string>();
  let resultConditions: Ent[] = [];
  let resultIngredients: Ent[] = [];
  let vetConditions: Ent[] = [];

  if (sb) {
    const [{ count: cCount }, { count: iCount }, { count: gCount }, { count: covCount }] = await Promise.all([
      sb.from("atlas_entities").select("*", { count: "exact", head: true }).eq("type", "condition"),
      sb.from("atlas_entities").select("*", { count: "exact", head: true }).eq("type", "ingredient"),
      sb.from("atlas_links").select("*", { count: "exact", head: true }).not("scientific_tier", "is", null),
      sb.from("atlas_links").select("*", { count: "exact", head: true }).eq("status", "coverage"),
    ]);
    totalConditions = cCount ?? 0; totalIngredients = iCount ?? 0; gradedLinks = gCount ?? 0; coverageLinks = covCount ?? 0;

    const { data: gd } = await sb.from("atlas_links").select("to_entity").not("scientific_tier", "is", null);
    gradedCondIds = new Set((gd ?? []).map((r) => r.to_entity));

    const { data: allConds } = await sb.from("atlas_entities").select("category").eq("type", "condition");
    for (const r of allConds ?? []) catCounts.set(r.category || "General & other", (catCounts.get(r.category || "General & other") || 0) + 1);

    const { data: vd } = await sb.from("atlas_entities").select("id,type,name,slug,plain_summary,ingredient_type,category,veteran_priority,publish_status").eq("type", "condition").eq("veteran_priority", true).order("name");
    vetConditions = (vd ?? []) as Ent[];

    if (anyFilter) {
      let condQuery = sb.from("atlas_entities").select("id,type,name,slug,plain_summary,ingredient_type,category,veteran_priority,publish_status").eq("type", "condition");
      let ingQuery = sb.from("atlas_entities").select("id,type,name,slug,plain_summary,ingredient_type,category,veteran_priority,publish_status").eq("type", "ingredient");
      if (q) { condQuery = condQuery.ilike("name", `%${q}%`); ingQuery = ingQuery.or(`name.ilike.%${q}%,also_known_as.ilike.%${q}%`); }
      if (cat) condQuery = condQuery.eq("category", cat);
      if (vetOnly) condQuery = condQuery.eq("veteran_priority", true);
      const { data: rc } = await condQuery.limit(120);
      let conds = (rc ?? []) as Ent[];
      if (evidence === "graded") conds = conds.filter((c) => gradedCondIds.has(c.id));
      if (evidence === "traditional") conds = conds.filter((c) => !gradedCondIds.has(c.id));
      resultConditions = conds;
      if (cat) { ingQuery = ingQuery.limit(0); } // category filter only applies to conditions
      else if (q) { const { data: ri } = await ingQuery.limit(60); resultIngredients = (ri ?? []) as Ent[]; }
    }
  }

  const condCard = (e: Ent) => (
    <Link key={e.id} href={`/ingredient/${e.slug}`} style={{ display: "block", background: "#fff", border: "0.5px solid #e2d8c2", borderRadius: 11, padding: "14px 16px", textDecoration: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div className="serif" style={{ fontSize: 16.5, color: "#14233B", fontWeight: 500 }}>{e.name}</div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{evidenceBadge(gradedCondIds.has(e.id))}{e.veteran_priority && vetBadge()}</div>
      </div>
      {e.category && <div style={{ color: "#8a7a55", fontSize: 11.5, marginTop: 4 }}>{e.category}</div>}
      {e.plain_summary && <p style={{ color: "#5b6472", fontSize: 12.5, lineHeight: 1.5, margin: "6px 0 0" }}>{e.plain_summary.slice(0, 140)}{e.plain_summary.length > 140 ? "…" : ""}</p>}
    </Link>
  );
  const ingCard = (e: Ent) => (
    <Link key={e.id} href={`/ingredient/${e.slug}`} style={{ display: "block", background: "#fff", border: "0.5px solid #e2d8c2", borderRadius: 11, padding: "14px 16px", textDecoration: "none" }}>
      <div className="serif" style={{ fontSize: 16.5, color: "#14233B", fontWeight: 500 }}>{e.name}</div>
      {e.plain_summary && <p style={{ color: "#5b6472", fontSize: 12.5, lineHeight: 1.5, margin: "6px 0 0" }}>{e.plain_summary.slice(0, 140)}{e.plain_summary.length > 140 ? "…" : ""}</p>}
    </Link>
  );

  return (
    <>
      <Nav />
      <section className="hero"><div className="hero-in"><div className="hero-copy">
        <div className="eyebrow">The NAP Database · Private preview</div>
        <h1>One database. Every plant, every condition.</h1>
        <p>🟢 <strong style={{ color: "#fff" }}>Proven &amp; graded</strong> — real evidence, fact-checked, dual-axis scored. 🟤 <strong style={{ color: "#fff" }}>Traditional record</strong> — documented folk history, not a claim. Both live here, always clearly labeled.</p>
        <div className="status" style={{ marginTop: 20 }}>
          <div><div className="k">Conditions</div><div className="v" style={{ color: "#C9A45A" }}>{totalConditions.toLocaleString()}</div></div>
          <div><div className="k">Ingredients &amp; plants</div><div className="v" style={{ color: "#C9A45A" }}>{totalIngredients.toLocaleString()}</div></div>
          <div><div className="k">Graded connections</div><div className="v" style={{ color: "#C9A45A" }}>{gradedLinks.toLocaleString()}</div></div>
          <div><div className="k">Traditional records</div><div className="v" style={{ color: "#C9A45A" }}>{coverageLinks.toLocaleString()}</div></div>
        </div>
        <div style={{ marginTop: 14 }}><form action={signOut}><button className="btn btn-ghost" type="submit" style={{ padding: "6px 14px", fontSize: 12 }}>Sign out</button></form></div>
      </div></div></section>

      <section className="sec sec-ivory">
        <div className="wrap">
          <form method="get" action={COOKIE_PATH} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", background: "#fff", border: "0.5px solid #e2d8c2", borderRadius: 12, padding: "14px 16px" }}>
            <input name="q" defaultValue={q} placeholder="Search any ingredient or condition…" style={{ ...selStyle, flex: 1, minWidth: 220 }} />
            <select name="cat" defaultValue={cat} style={selStyle}>
              <option value="">All categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c} ({catCounts.get(c) || 0})</option>)}
            </select>
            <select name="evidence" defaultValue={evidence} style={selStyle}>
              <option value="">Proven or traditional</option>
              <option value="graded">🟢 Proven &amp; graded only</option>
              <option value="traditional">🟤 Traditional record only</option>
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#5b6472" }}>
              <input type="checkbox" name="vet" value="1" defaultChecked={vetOnly} /> 🎖 Veteran priority only
            </label>
            <button className="btn btn-gold sm" type="submit">Search</button>
            {anyFilter && <Link href={COOKIE_PATH} style={{ color: "#8a7a55", fontSize: 13 }}>Clear</Link>}
          </form>

          {!anyFilter ? (
            <>
              <div className="eyebrow-ink" style={{ marginTop: 30 }}>🎖 Veteran-priority conditions</div>
              <p className="lead" style={{ marginTop: 6, marginBottom: 12 }}>TBI, blast injury, PTSD, and the other conditions this project exists to serve first — many with little to no historical record, which is exactly the frontier ground real research needs to claim.</p>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))" }}>{vetConditions.map(condCard)}</div>

              <div className="eyebrow-ink" style={{ marginTop: 34 }}>Browse by category</div>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", marginTop: 12 }}>
                {CATEGORIES.map((c) => (
                  <Link key={c} href={`${COOKIE_PATH}?cat=${encodeURIComponent(c)}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "0.5px solid #e2d8c2", borderRadius: 10, padding: "12px 15px", textDecoration: "none", color: "#14233B", fontSize: 14 }}>
                    <span>{c}</span><span style={{ color: "#98895f", fontSize: 12.5 }}>{catCounts.get(c) || 0}</span>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ color: "#8a7a55", fontSize: 13, margin: "20px 0 12px" }}>
                {resultConditions.length + resultIngredients.length} result{resultConditions.length + resultIngredients.length === 1 ? "" : "s"}{cat ? ` in ${cat}` : ""}{q ? ` for "${q}"` : ""}
              </div>
              {resultConditions.length > 0 && (
                <>
                  <div className="eyebrow-ink">Conditions</div>
                  <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", marginTop: 10, marginBottom: 26 }}>{resultConditions.map(condCard)}</div>
                </>
              )}
              {resultIngredients.length > 0 && (
                <>
                  <div className="eyebrow-ink">Ingredients &amp; plants</div>
                  <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", marginTop: 10 }}>{resultIngredients.map(ingCard)}</div>
                </>
              )}
              {resultConditions.length === 0 && resultIngredients.length === 0 && <p className="lead">No matches. Try a different term or clear the filters.</p>}
            </>
          )}
        </div>
      </section>

      <section className="join">
        <h2>See a connection that&apos;s missing — or graded wrong?</h2>
        <p>The database is meant to be shaped. Bring the evidence — a study, a tradition, a correction — and help make it more complete and more honest.</p>
        <Link className="btn btn-gold" href="/shape" style={{ marginTop: 18 }}>Shape the database →</Link>
      </section>
      <Footer />
    </>
  );
}
