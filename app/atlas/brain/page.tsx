import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Fireflies } from "@/components/universe/Fireflies";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import "../../inner.css";

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

// "Evidence-graded" means the link carries a scientific tier that has been reviewed — NOT that it
// is proven. The actual tier (Established / Studied / Emerging / Minimal) is shown on the detail
// page. It used to read "Proven & graded", which was false for the Minimal and None tiers ("science
// hasn't caught up" / "no solid research"). Links graded "none" are excluded from the graded set
// upstream, so they no longer show green.
function evidenceBadge(hasGraded: boolean) {
  return hasGraded
    ? <span className="at-badge at-badge-graded"><span className="at-dot" aria-hidden="true" />Evidence-graded</span>
    : <span className="at-badge at-badge-trad"><span className="at-dot" aria-hidden="true" />Traditional record</span>;
}
function vetBadge() {
  return <span className="at-badge at-badge-vet"><span className="at-dot" aria-hidden="true" />Veteran</span>;
}

// Decorative night sky for the Atlas: two kinds of light joined by faint threads. Positions are
// fixed (no data); the real figures appear only after sign-in, exactly as before.
const SKY: { x: number; y: number; r: number; k: "g" | "t" }[] = [
  { x: 640, y: 120, r: 4.2, k: "g" }, { x: 760, y: 190, r: 2.6, k: "t" }, { x: 880, y: 120, r: 3.4, k: "g" },
  { x: 990, y: 230, r: 2.2, k: "t" }, { x: 1100, y: 150, r: 3, k: "t" }, { x: 820, y: 300, r: 2.4, k: "t" },
  { x: 940, y: 380, r: 3.8, k: "g" }, { x: 1080, y: 330, r: 2, k: "t" }, { x: 1160, y: 420, r: 2.6, k: "g" },
  { x: 720, y: 420, r: 2.2, k: "t" }, { x: 860, y: 480, r: 2.8, k: "t" }, { x: 1010, y: 500, r: 2.2, k: "t" },
  { x: 560, y: 260, r: 2, k: "t" }, { x: 1200, y: 260, r: 2.2, k: "t" }, { x: 680, y: 330, r: 3, k: "g" },
];
const THREADS: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [5, 6], [6, 7], [7, 8], [6, 10], [9, 10], [10, 11], [0, 12], [4, 13], [5, 14], [14, 9]];

function Sky() {
  return (
    <svg className="ath-sky" viewBox="0 0 1280 560" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="at-g"><stop offset="0" stopColor="#fbfde6" /><stop offset=".35" stopColor="#d6e68a" /><stop offset="1" stopColor="#d6e68a" stopOpacity="0" /></radialGradient>
        <radialGradient id="at-t"><stop offset="0" stopColor="#fff3d6" /><stop offset=".35" stopColor="#d9a35a" /><stop offset="1" stopColor="#d9a35a" stopOpacity="0" /></radialGradient>
      </defs>
      {THREADS.map(([a, b], i) => (
        <line key={i} className="ath-line" x1={SKY[a].x} y1={SKY[a].y} x2={SKY[b].x} y2={SKY[b].y} style={{ ["--d" as string]: `${i * 0.12}s` }} />
      ))}
      {SKY.map((s, i) => (
        <g key={i} className={`ath-star ath-star-${s.k}`} style={{ ["--d" as string]: `${(i % 7) * 0.6}s` }}>
          <circle cx={s.x} cy={s.y} r={s.r * 6} fill={`url(#at-${s.k})`} opacity=".55" />
          <circle cx={s.x} cy={s.y} r={s.r} fill={s.k === "g" ? "#f4f8cf" : "#ffe9c2"} />
        </g>
      ))}
    </svg>
  );
}

function Legend() {
  return (
    <ul className="at-legend" aria-label="How the database is labeled">
      <li className="at-legend-g">
        <span className="at-legend-star" aria-hidden="true" />
        <span>
          <strong>Evidence-graded</strong> Research graded in-house and tier-scored (Established to Minimal). Not yet
          independently reviewed, and never called proven.
        </span>
      </li>
      <li className="at-legend-t">
        <span className="at-legend-star" aria-hidden="true" />
        <span>
          <strong>Traditional record</strong> Documented folk history, not a claim.
        </span>
      </li>
    </ul>
  );
}

export default async function Database({ searchParams }: { searchParams: Promise<{ bad?: string; q?: string; cat?: string; evidence?: string; vet?: string }> }) {
  const sp = await searchParams;
  const expected = process.env.PREVIEW_KEY ?? "";
  const jar = await cookies();
  const authed = Boolean(expected) && jar.get(AUTH_COOKIE)?.value === expected;

  if (!authed) {
    return (
      <div className="uv at">
        <Nav />
        <main>
          <header className="ath ath-gate" aria-labelledby="ath-h">
            <Sky />
            <Fireflies className="ath-ff" density={0.35} />
            <div className="u-wrap ath-in">
              <p className="ath-kicker">The NAP Database, private preview</p>
              <h1 id="ath-h" className="ath-h1">One database. Every plant, every condition.</h1>
              <p className="ath-lede">Graded ingredients (review in progress) and a 13,000-plant traditional record, side by side — always clearly labeled which is which. Enter the view key to explore.</p>
              {sp?.bad && <p className="at-bad" role="alert">That key didn&apos;t match. Try again.</p>}
              <form action={signIn} className="at-key">
                <label className="at-sr" htmlFor="at-key-in">View key</label>
                <input id="at-key-in" name="key" type="password" placeholder="View key" autoComplete="off" />
                <button className="btn btn-thread" type="submit">Explore</button>
              </form>
            </div>
          </header>

          <section className="at-how" aria-labelledby="at-how-h">
            <div className="u-wrap">
              <h2 id="at-how-h" className="at-h2">Two kinds of light, never mixed.</h2>
              <p className="u-lede">Everything in the Atlas carries one of two labels, so a piece of history is never mistaken for a research finding.</p>
              <Legend />
              <p className="at-fine">
                Graded in-house, not yet independently reviewed by a clinician, pharmacist, or attorney. A grade describes
                research, not a promise that anything will work for you. Traditional use is not evidence that a remedy works.
              </p>
            </div>
          </section>
        </main>
        <Footer />
      </div>
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
      sb.from("atlas_links").select("*", { count: "exact", head: true }).not("scientific_tier", "is", null).neq("scientific_tier", "none"),
      sb.from("atlas_links").select("*", { count: "exact", head: true }).eq("status", "coverage"),
    ]);
    totalConditions = cCount ?? 0; totalIngredients = iCount ?? 0; gradedLinks = gCount ?? 0; coverageLinks = covCount ?? 0;

    // A "none" tier means the evidence was reviewed and no support was found — it must NOT count as
    // graded/green. Only tiers carrying actual signal (established/studied/emerging/minimal) do.
    const { data: gd } = await sb.from("atlas_links").select("to_entity").not("scientific_tier", "is", null).neq("scientific_tier", "none");
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

  const condCard = (e: Ent) => {
    const graded = gradedCondIds.has(e.id);
    return (
      <li key={e.id}>
        <Link href={`/ingredient/${e.slug}`} className={`at-card ${graded ? "at-card-g" : "at-card-t"}`}>
          <span className="at-card-top">
            <span className="at-card-n">{e.name}</span>
            <span className="at-card-badges">{evidenceBadge(graded)}{e.veteran_priority && vetBadge()}</span>
          </span>
          {e.category && <span className="at-card-cat">{e.category}</span>}
          {e.plain_summary && <span className="at-card-s">{e.plain_summary.slice(0, 140)}{e.plain_summary.length > 140 ? "…" : ""}</span>}
        </Link>
      </li>
    );
  };
  const ingCard = (e: Ent) => (
    <li key={e.id}>
      <Link href={`/ingredient/${e.slug}`} className="at-card at-card-i">
        <span className="at-card-n">{e.name}</span>
        {e.plain_summary && <span className="at-card-s">{e.plain_summary.slice(0, 140)}{e.plain_summary.length > 140 ? "…" : ""}</span>}
      </Link>
    </li>
  );
  const maxCat = Math.max(1, ...CATEGORIES.map((c) => catCounts.get(c) || 0));
  const total = resultConditions.length + resultIngredients.length;

  return (
    <div className="uv at">
      <Nav />
      <main>
        <header className="ath" aria-labelledby="ath-h">
          <Sky />
          <Fireflies className="ath-ff" density={0.3} />
          <div className="u-wrap ath-in">
            <p className="ath-kicker">The NAP Database, private preview</p>
            <h1 id="ath-h" className="ath-h1">One database. Every plant, every condition.</h1>
            <Legend />
            <dl className="at-stats">
              <div><dt>Conditions</dt><dd>{totalConditions.toLocaleString()}</dd></div>
              <div><dt>Ingredients &amp; plants</dt><dd>{totalIngredients.toLocaleString()}</dd></div>
              <div className="at-stat-g"><dt>Graded connections</dt><dd>{gradedLinks.toLocaleString()}</dd></div>
              <div className="at-stat-t"><dt>Traditional records</dt><dd>{coverageLinks.toLocaleString()}</dd></div>
            </dl>
            <p className="at-fine at-fine-hero">Both live here, always clearly labeled. Graded in-house, not yet independently reviewed.</p>
            <form action={signOut}><button className="btn btn-glass sm" type="submit">Sign out</button></form>
          </div>
        </header>

        <section className="at-body" aria-label="Explore the database">
          <div className="u-wrap">
            <form method="get" action={COOKIE_PATH} className="at-search" role="search">
              <label className="at-sr" htmlFor="at-q">Search</label>
              <input id="at-q" name="q" defaultValue={q} placeholder="Search any ingredient or condition…" className="at-q" />
              <label className="at-sr" htmlFor="at-cat">Category</label>
              <select id="at-cat" name="cat" defaultValue={cat}>
                <option value="">All categories</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c} ({catCounts.get(c) || 0})</option>)}
              </select>
              <label className="at-sr" htmlFor="at-ev">Evidence label</label>
              <select id="at-ev" name="evidence" defaultValue={evidence}>
                <option value="">All</option>
                <option value="graded">Evidence-graded only</option>
                <option value="traditional">Traditional record only</option>
              </select>
              <label className="at-check">
                <input type="checkbox" name="vet" value="1" defaultChecked={vetOnly} /> Veteran priority only
              </label>
              <button className="btn btn-thread sm" type="submit">Search</button>
              {anyFilter && <Link className="at-clear" href={COOKIE_PATH}>Clear</Link>}
            </form>

            {!anyFilter ? (
              <>
                <div className="at-sec">
                  <h2 className="at-h2">Veteran-priority conditions</h2>
                  <p className="at-sub">TBI, blast injury, PTSD, and the other conditions this project exists to serve first — many with little to no historical record, which is exactly the frontier ground real research needs to claim.</p>
                  <ul className="at-grid">{vetConditions.map(condCard)}</ul>
                </div>

                <div className="at-sec">
                  <h2 className="at-h2">Browse by category</h2>
                  <p className="at-sub">Each light is a part of the body or a kind of need. The brighter it glows, the more conditions it holds.</p>
                  <ul className="at-cats">
                    {CATEGORIES.map((c) => {
                      const n = catCounts.get(c) || 0;
                      return (
                        <li key={c}>
                          <Link href={`${COOKIE_PATH}?cat=${encodeURIComponent(c)}`} className="at-cat" style={{ ["--s" as string]: (0.35 + 0.65 * Math.sqrt(n / maxCat)).toFixed(3) }}>
                            <span className="at-cat-star" aria-hidden="true" />
                            <span className="at-cat-n">{c}</span>
                            <span className="at-cat-c">{n}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            ) : (
              <>
                <p className="at-count" role="status">
                  {total} result{total === 1 ? "" : "s"}{cat ? ` in ${cat}` : ""}{q ? ` for "${q}"` : ""}
                </p>
                {resultConditions.length > 0 && (
                  <div className="at-sec">
                    <h2 className="at-h2">Conditions</h2>
                    <ul className="at-grid">{resultConditions.map(condCard)}</ul>
                  </div>
                )}
                {resultIngredients.length > 0 && (
                  <div className="at-sec">
                    <h2 className="at-h2">Ingredients &amp; plants</h2>
                    <ul className="at-grid">{resultIngredients.map(ingCard)}</ul>
                  </div>
                )}
                {total === 0 && <p className="at-empty">No matches. Try a different term or clear the filters.</p>}
              </>
            )}
          </div>
        </section>

        <section className="hands at-end" aria-labelledby="at-end-h">
          <svg className="hands-thread" viewBox="0 0 1200 200" preserveAspectRatio="none" aria-hidden="true">
            <path pathLength={1} d="M0 120 C 200 40 360 180 600 110 S 980 60 1200 120" />
          </svg>
          <div className="u-wrap hands-in">
            <h2 id="at-end-h" className="hands-h">See a connection that&apos;s missing — or graded&nbsp;wrong?</h2>
            <p className="u-lede">The database is meant to be shaped. Bring the evidence — a study, a tradition, a correction — and help make it more complete and more honest.</p>
            <Link className="btn btn-thread" href="/shape">Shape the database</Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
