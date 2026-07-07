import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "The Living Glossary — NAP", robots: { index: false, follow: false } };

const AUTH_COOKIE = "nap_glossary";
const COOKIE_PATH = "/glossary";

async function signIn(formData: FormData): Promise<void> {
  "use server";
  const expected = process.env.PREVIEW_KEY ?? "";
  const key = String(formData.get("key") ?? "");
  if (!expected || key !== expected) redirect(`${COOKIE_PATH}?bad=1`);
  const jar = await cookies();
  jar.set(AUTH_COOKIE, key, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: COOKIE_PATH, maxAge: 60 * 60 * 24 * 7 });
  redirect(COOKIE_PATH);
}

interface Cov {
  name: string; slug: string; also_known_as: string | null;
  coverage_uses: number | null; coverage_countries: number | null;
  coverage_top_uses: string | null; coverage_top_countries: string | null;
}

function sanitize(q: string): string { return q.replace(/[^a-zA-Z0-9 \-']/g, "").trim().slice(0, 50); }

function card(p: Cov) {
  const uses = p.coverage_uses ?? 0;
  const sparse = uses <= 2;
  return (
    <div key={p.slug} style={{ background: "#fff", border: "0.5px solid #e2d8c2", borderRadius: 11, padding: "15px 17px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div className="serif" style={{ fontSize: 18, color: "#14233B", fontWeight: 500 }}>{p.name}</div>
        <span style={{ fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 700, padding: "2px 9px", borderRadius: 20, whiteSpace: "nowrap", background: sparse ? "#F7EAD0" : "#ECEDF1", color: sparse ? "#8a6414" : "#4a5568" }}>
          {uses} use{uses === 1 ? "" : "s"} · {p.coverage_countries ?? 0} countr{(p.coverage_countries ?? 0) === 1 ? "y" : "ies"}
        </span>
      </div>
      {p.also_known_as && <div style={{ color: "#8a7a55", fontSize: 12, fontStyle: "italic", marginTop: 2 }}>{p.also_known_as}</div>}
      {p.coverage_top_uses && <div style={{ color: "#5b6472", fontSize: 12.5, lineHeight: 1.5, marginTop: 7 }}><strong style={{ color: "#7a6a45" }}>Recorded for: </strong>{p.coverage_top_uses}</div>}
      {p.coverage_top_countries && <div style={{ color: "#98895f", fontSize: 11.5, marginTop: 4 }}>Traditions in: {p.coverage_top_countries}</div>}
      {sparse && (
        <div style={{ marginTop: 9, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ color: "#8a6414", fontSize: 11.5, fontWeight: 600 }}>Barely documented — help strengthen it</span>
          <Link href="/shape" style={{ color: "#B48A2F", fontSize: 11.5 }}>Add what you know →</Link>
        </div>
      )}
    </div>
  );
}

export default async function Glossary({ searchParams }: { searchParams: Promise<{ q?: string; bad?: string }> }) {
  const sp = await searchParams;
  const expected = process.env.PREVIEW_KEY ?? "";
  const jar = await cookies();
  const authed = Boolean(expected) && jar.get(AUTH_COOKIE)?.value === expected;

  if (!authed) {
    return (
      <>
        <Nav />
        <section className="hero">
          <div className="hero-in"><div className="hero-copy">
            <div className="eyebrow">The Living Glossary · Private preview</div>
            <h1>Every plant, a home.</h1>
            <p>Over 13,000 medicinal plants and their recorded traditional uses, drawn from the public-domain USDA ethnobotanical record — a starting point the world can build on. Enter the view key to explore.</p>
            {sp?.bad && <div className="note" style={{ borderLeftColor: "#a33", color: "#8a3a2a" }}>That key didn&apos;t match. Try again.</div>}
            <form action={signIn} style={{ marginTop: 18, display: "flex", gap: 10, maxWidth: 420, flexWrap: "wrap" }}>
              <input name="key" type="password" placeholder="View key" autoComplete="off" style={{ flex: 1, minWidth: 180, border: ".5px solid #d9cdb2", borderRadius: 8, padding: "11px 13px", fontSize: 14, background: "#fff" }} />
              <button className="btn btn-gold" type="submit">Explore →</button>
            </form>
          </div></div>
        </section>
        <Footer />
      </>
    );
  }

  const q = sanitize(sp?.q ?? "");
  const sb = supabaseAdmin();
  let total = 0;
  let results: Cov[] = [];
  let sparse: Cov[] = [];
  const SEL = "name,slug,also_known_as,coverage_uses,coverage_countries,coverage_top_uses,coverage_top_countries";

  if (sb) {
    const { count } = await sb.from("atlas_entities").select("*", { count: "exact", head: true }).eq("publish_status", "coverage");
    total = count ?? 0;
    if (q.length >= 2) {
      const { data } = await sb.from("atlas_entities").select(SEL).eq("publish_status", "coverage")
        .or(`name.ilike.*${q}*,also_known_as.ilike.*${q}*,coverage_top_uses.ilike.*${q}*`)
        .order("coverage_uses", { ascending: false, nullsFirst: false }).limit(90);
      results = (data ?? []) as Cov[];
    } else {
      const { data } = await sb.from("atlas_entities").select(SEL).eq("publish_status", "coverage")
        .order("coverage_uses", { ascending: false, nullsFirst: false }).limit(24);
      results = (data ?? []) as Cov[];
      const { data: sp2 } = await sb.from("atlas_entities").select(SEL).eq("publish_status", "coverage").lte("coverage_uses", 1).limit(9);
      sparse = (sp2 ?? []) as Cov[];
    }
  }

  return (
    <>
      <Nav />
      <section className="hero">
        <div className="hero-in"><div className="hero-copy">
          <div className="eyebrow">The Living Glossary · Private preview</div>
          <h1>{total.toLocaleString()} plants. One home.</h1>
          <p>Every medicinal plant humanity has written down — with the traditional uses, countries, and sources behind them. The well-known and the barely-remembered, side by side. The thin ones are the point: they&apos;re waiting for the world to strengthen them.</p>
          <form method="get" action="/glossary" style={{ marginTop: 20, display: "flex", gap: 10, maxWidth: 480, flexWrap: "wrap" }}>
            <input name="q" defaultValue={q} placeholder="Search a plant or a use (e.g. ginger, cough, fever)…" style={{ flex: 1, minWidth: 220, border: ".5px solid #d9cdb2", borderRadius: 8, padding: "11px 13px", fontSize: 14, background: "#fff" }} />
            <button className="btn btn-gold" type="submit">Search</button>
          </form>
        </div></div>
      </section>

      <section className="sec sec-ivory">
        <div className="wrap">
          <div className="note">Recorded traditional / folk use from Dr. Duke&apos;s Ethnobotanical Database (USDA, public domain). This is documented history of how plants have been used — <strong>not medical evidence and not a health claim.</strong> It exists so the knowledge has a home and the world can build the case.</div>

          {q ? (
            <>
              <div className="eyebrow-ink" style={{ marginTop: 24 }}>{results.length ? `${results.length}${results.length === 90 ? "+" : ""} match${results.length === 1 ? "" : "es"} for “${q}”` : `No matches for “${q}”`}</div>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", marginTop: 14 }}>{results.map(card)}</div>
              {!results.length && <p className="lead" style={{ marginTop: 12 }}>Try a common plant name, a scientific name, or a traditional use like &quot;cough&quot; or &quot;fever.&quot;</p>}
            </>
          ) : (
            <>
              <div className="eyebrow-ink" style={{ marginTop: 24 }}>The most-documented plants across cultures</div>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", marginTop: 14 }}>{results.map(card)}</div>

              <div className="eyebrow-ink" style={{ marginTop: 36 }}>Plants that need you — barely documented, waiting to grow</div>
              <p className="lead" style={{ marginTop: 8, marginBottom: 14 }}>These have almost no recorded use. That&apos;s not a flaw — it&apos;s the whole mission. If you carry knowledge of any of them, this is where it belongs.</p>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))" }}>{sparse.map(card)}</div>
            </>
          )}
        </div>
      </section>

      <section className="join">
        <h2>Know a use we&apos;re missing?</h2>
        <p>Every plant here is an open record. If you carry a tradition, a study, or a story about one of them, add it — that&apos;s how a single line becomes a case the world can trust.</p>
        <Link className="btn btn-gold" href="/shape" style={{ marginTop: 18 }}>Strengthen the record →</Link>
      </section>
      <Footer />
    </>
  );
}
