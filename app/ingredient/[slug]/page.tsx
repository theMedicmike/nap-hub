import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ingredient — NAP", robots: { index: false, follow: false } };

const AUTH_COOKIE = "nap_preview";
const COVERAGE_LIMIT = 60;

async function signIn(formData: FormData): Promise<void> {
  "use server";
  const expected = process.env.PREVIEW_KEY ?? "";
  const key = String(formData.get("key") ?? "");
  const back = String(formData.get("back") ?? "/atlas/brain");
  if (!expected || key !== expected) redirect(`${back}?bad=1`);
  const jar = await cookies();
  jar.set(AUTH_COOKIE, key, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 60 * 60 * 24 * 7 });
  redirect(back);
}

interface Ent { id: string; type: string; name: string; slug: string; summary: string | null; ingredient_type: string | null; safety_summary: string | null; plain_summary: string | null; also_known_as: string | null; publish_status: string | null; category: string | null; veteran_priority: boolean | null }
interface Lnk { id: string; from_entity: string; to_entity: string; scientific_tier: string | null; traditional_strength: string | null; convergence_count: number | null; safety_note: string | null; status: string }
interface CovLnk { id: string; from_entity: string; to_entity: string; coverage_countries: string | null; coverage_note: string | null; coverage_use_count: number | null }

function sciStyle(t: string | null) {
  switch ((t || "").toLowerCase()) {
    case "established": return { bg: "#E1F0E6", color: "#2f6b45", label: "Established", plain: "Backed by strong, repeated research." };
    case "studied": return { bg: "#F7EAD0", color: "#8a6414", label: "Studied", plain: "Real studies exist, but the evidence is mixed or modest." };
    case "emerging": return { bg: "#ECEDF1", color: "#4a5568", label: "Emerging", plain: "Early research looks promising, not proven yet." };
    case "minimal": return { bg: "#F0EBE1", color: "#7a6a45", label: "Minimal", plain: "Mostly traditional use — science hasn't caught up." };
    case "none": return { bg: "#EEE7D6", color: "#7a6a45", label: "None", plain: "No solid research on this yet." };
    default: return { bg: "#EEE7D6", color: "#7a6a45", label: t || "—", plain: "" };
  }
}
function tradStyle(t: string | null) {
  switch ((t || "").toLowerCase()) {
    case "deep": return { bg: "#EDE4F3", color: "#5b3f7a", label: "Deep tradition" };
    case "moderate": return { bg: "#F1E9F6", color: "#6b5486", label: "Moderate tradition" };
    case "limited": return { bg: "#F3EFEA", color: "#7a6a55", label: "Limited tradition" };
    default: return { bg: "#F3EFEA", color: "#7a6a55", label: t || "—" };
  }
}
function badge(label: string, bg: string, color: string) {
  return <span style={{ fontSize: 10.5, letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 700, padding: "3px 11px", borderRadius: 20, background: bg, color, whiteSpace: "nowrap" }}>{label}</span>;
}
const SCI_ORDER: Record<string, number> = { established: 5, studied: 4, emerging: 3, minimal: 2, none: 1 };

export default async function IngredientPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ bad?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const back = `/ingredient/${slug}`;
  const expected = process.env.PREVIEW_KEY ?? "";
  const jar = await cookies();
  const authed = Boolean(expected) && jar.get(AUTH_COOKIE)?.value === expected;

  if (!authed) {
    return (
      <>
        <Nav />
        <section className="hero"><div className="hero-in"><div className="hero-copy">
          <div className="eyebrow">NAP · Private preview</div>
          <h1>Enter to explore.</h1>
          <p>This detail page is part of the private preview. Enter the view key to continue.</p>
          {sp?.bad && <div className="note" style={{ borderLeftColor: "#a33", color: "#8a3a2a" }}>That key didn&apos;t match. Try again.</div>}
          <form action={signIn} style={{ marginTop: 18, display: "flex", gap: 10, maxWidth: 420, flexWrap: "wrap" }}>
            <input type="hidden" name="back" value={back} />
            <input name="key" type="password" placeholder="View key" autoComplete="off" style={{ flex: 1, minWidth: 180, border: ".5px solid #d9cdb2", borderRadius: 8, padding: "11px 13px", fontSize: 14, background: "#fff" }} />
            <button className="btn btn-gold" type="submit">Explore →</button>
          </form>
        </div></div></section>
        <Footer />
      </>
    );
  }

  const sb = supabaseAdmin();
  let ent: Ent | null = null;
  let conns: { other: Ent; link: Lnk; asIngredient: boolean }[] = [];
  const srcByLink = new Map<string, string[]>();
  let covConns: { other: Ent; link: CovLnk }[] = [];
  let covTotal = 0;

  if (sb) {
    const { data } = await sb.from("atlas_entities")
      .select("id,type,name,slug,summary,ingredient_type,safety_summary,plain_summary,also_known_as,publish_status,category,veteran_priority")
      .eq("slug", slug).maybeSingle();
    ent = (data as Ent) || null;
    if (ent) {
      // ---- graded (scientific) links ----
      const { data: ld } = await sb.from("atlas_links")
        .select("id,from_entity,to_entity,scientific_tier,traditional_strength,convergence_count,safety_note,status")
        .not("scientific_tier", "is", null).or(`from_entity.eq.${ent.id},to_entity.eq.${ent.id}`);
      const links = (ld ?? []) as Lnk[];
      const otherIds = Array.from(new Set(links.map((l) => (l.from_entity === ent!.id ? l.to_entity : l.from_entity))));
      const { data: others } = otherIds.length ? await sb.from("atlas_entities").select("id,type,name,slug,summary,ingredient_type,safety_summary,plain_summary,also_known_as,publish_status,category,veteran_priority").in("id", otherIds) : { data: [] as Ent[] };
      const oById = new Map((others ?? []).map((o) => [o.id, o as Ent]));
      for (const l of links) {
        const asIngredient = l.from_entity === ent.id;
        const other = oById.get(asIngredient ? l.to_entity : l.from_entity);
        if (other) conns.push({ other, link: l, asIngredient });
      }
      conns.sort((a, b) => (SCI_ORDER[(b.link.scientific_tier || "").toLowerCase()] || 0) - (SCI_ORDER[(a.link.scientific_tier || "").toLowerCase()] || 0));
      const linkIds = links.map((l) => l.id);
      if (linkIds.length) {
        const { data: lsd } = await sb.from("atlas_link_sources").select("link_id,source_id").in("link_id", linkIds);
        const srcIds = Array.from(new Set((lsd ?? []).map((x) => x.source_id)));
        const { data: sd } = srcIds.length ? await sb.from("atlas_sources").select("id,citation,title").in("id", srcIds) : { data: [] as { id: string; citation: string | null; title: string | null }[] };
        const sById = new Map((sd ?? []).map((s) => [s.id, s]));
        for (const row of lsd ?? []) { const s = sById.get(row.source_id); if (!s) continue; const arr = srcByLink.get(row.link_id) ?? []; arr.push(s.citation || s.title || ""); srcByLink.set(row.link_id, arr); }
      }

      // ---- traditional (coverage) links — the Duke ethnobotanical layer ----
      const { data: cd, count } = await sb.from("atlas_links")
        .select("id,from_entity,to_entity,coverage_countries,coverage_note,coverage_use_count", { count: "exact" })
        .eq("status", "coverage").or(`from_entity.eq.${ent.id},to_entity.eq.${ent.id}`)
        .order("coverage_use_count", { ascending: false, nullsFirst: false }).limit(COVERAGE_LIMIT);
      covTotal = count ?? 0;
      const covLinks = (cd ?? []) as CovLnk[];
      const covOtherIds = Array.from(new Set(covLinks.map((l) => (l.from_entity === ent!.id ? l.to_entity : l.from_entity))));
      const { data: covOthers } = covOtherIds.length ? await sb.from("atlas_entities").select("id,type,name,slug,summary,ingredient_type,safety_summary,plain_summary,also_known_as,publish_status,category,veteran_priority").in("id", covOtherIds) : { data: [] as Ent[] };
      const covOById = new Map((covOthers ?? []).map((o) => [o.id, o as Ent]));
      for (const l of covLinks) {
        const other = covOById.get(l.from_entity === ent.id ? l.to_entity : l.from_entity);
        if (other) covConns.push({ other, link: l });
      }
    }
  }

  if (!ent) {
    return (
      <>
        <Nav />
        <section className="sec sec-ivory" style={{ minHeight: "50vh" }}><div className="wrap">
          <Link href="/atlas/brain" style={{ color: "#B48A2F", fontSize: 13 }}>← Back to the database</Link>
          <p className="lead" style={{ marginTop: 20 }}>No entry found for &quot;{slug}&quot;.</p>
        </div></section>
        <Footer />
      </>
    );
  }

  const isCoverageOnly = ent.publish_status === "coverage" && conns.length === 0;
  const sci = (t: string | null) => sciStyle(t);

  return (
    <>
      <Nav />
      <section className="hero"><div className="hero-in"><div className="hero-copy">
        <Link href="/atlas/brain" className="read-back" style={{ color: "#C9A45A" }}>← Back to the database</Link>
        <div className="eyebrow" style={{ marginTop: 12 }}>
          {ent.type === "condition" ? "Condition" : "Ingredient"}{ent.ingredient_type ? ` · ${ent.ingredient_type}` : ""}{ent.category ? ` · ${ent.category}` : ""}
        </div>
        <h1 style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {ent.name}
          {ent.veteran_priority && <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", background: "#C9A45A", color: "#14233B", borderRadius: 20, padding: "4px 12px" }}>🎖 Veteran priority</span>}
        </h1>
        {ent.also_known_as && <p style={{ color: "var(--ivory-soft)", fontStyle: "italic", margin: "10px 0 0" }}>Also known as: {ent.also_known_as}</p>}
      </div></div></section>

      <section className="sec sec-ivory">
        <div className="wrap" style={{ maxWidth: 820 }}>
          {ent.plain_summary && (
            <div style={{ background: "#F8F3E8", border: "0.5px solid #e2d8c2", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ color: "#B48A2F", fontSize: 10.5, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>In plain English</div>
              <p style={{ color: "#23303f", fontSize: 16, lineHeight: 1.7, margin: 0 }}>{ent.plain_summary}</p>
            </div>
          )}

          {/* graded connections */}
          {conns.length > 0 && (
            <div style={{ marginTop: 26 }}>
              <div className="eyebrow-ink">🟢 Proven &amp; graded — {ent.type === "condition" ? "ingredients studied for this" : "what real evidence links it to"}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                {conns.map((c) => {
                  const ss = sci(c.link.scientific_tier), ts = tradStyle(c.link.traditional_strength);
                  const srcs = srcByLink.get(c.link.id) ?? [];
                  return (
                    <Link key={c.link.id} href={`/ingredient/${c.other.slug}`} style={{ display: "block", background: "#fff", border: "0.5px solid #e2d8c2", borderRadius: 10, padding: "13px 15px", textDecoration: "none" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: 15.5, color: "#14233B" }}>{c.asIngredient ? "may help with " : "← "}<strong style={{ fontWeight: 600 }}>{c.other.name}</strong></span>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{badge(ss.label, ss.bg, ss.color)}{badge(ts.label, ts.bg, ts.color)}</div>
                      </div>
                      <div style={{ color: "#5b6472", fontSize: 12.5, marginTop: 6 }}>{ss.plain}</div>
                      {c.link.safety_note && <div style={{ color: "#8a7a55", fontSize: 11.5, marginTop: 5 }}><strong style={{ color: "#7a6a45" }}>Safety: </strong>{c.link.safety_note.slice(0, 200)}{c.link.safety_note.length > 200 ? "…" : ""}</div>}
                      {srcs.length > 0 && <div style={{ color: "#98895f", fontSize: 11, marginTop: 4 }}>{srcs.length} source{srcs.length > 1 ? "s" : ""}: {srcs.filter(Boolean).join("  ·  ").slice(0, 240)}</div>}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* traditional / coverage connections */}
          {covConns.length > 0 && (
            <div style={{ marginTop: 26 }}>
              <div className="eyebrow-ink">🟤 Traditional record — {ent.type === "condition" ? `plants recorded for this (${covTotal.toLocaleString()} total)` : `what it's historically been used for (${covTotal.toLocaleString()} total)`}</div>
              <div className="note" style={{ marginTop: 8 }}>This is documented folk/traditional use from Dr. Duke&apos;s Ethnobotanical Database (USDA, public domain) — <strong>not medical evidence and not a health claim.</strong></div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                {covConns.map((c) => (
                  <Link key={c.link.id} href={`/ingredient/${c.other.slug}`} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#F8F3E8", border: "0.5px solid #e2d8c2", borderRadius: 20, padding: "7px 14px", fontSize: 13, color: "#14233B", textDecoration: "none" }}>
                    {c.other.name}
                    {typeof c.link.coverage_use_count === "number" && <span style={{ color: "#98895f", fontSize: 11 }}>({c.link.coverage_use_count})</span>}
                  </Link>
                ))}
              </div>
              {covTotal > COVERAGE_LIMIT && <p style={{ color: "#8a7a55", fontSize: 12.5, marginTop: 10 }}>Showing the top {COVERAGE_LIMIT} of {covTotal.toLocaleString()} — search the database to see more.</p>}
            </div>
          )}

          {covConns.length === 0 && conns.length === 0 && (
            <div style={{ marginTop: 22 }} className="note">No recorded plants yet for this condition — a frontier gap this project exists to fill. If you have real research or a graded ingredient to contribute, <Link href="/shape" style={{ color: "#B48A2F" }}>add it</Link>.</div>
          )}

          {/* clinical detail */}
          {ent.summary && !isCoverageOnly && (
            <details style={{ marginTop: 22 }}>
              <summary style={{ color: "#8a7a55", fontSize: 11.5, letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 600, cursor: "pointer" }}>Clinical detail (for your doctor)</summary>
              <p style={{ color: "#5b6472", fontSize: 14, lineHeight: 1.7, margin: "10px 0 0" }}>{ent.summary}</p>
              {ent.safety_summary && <p style={{ color: "#8a7a55", fontSize: 13, lineHeight: 1.6, marginTop: 10 }}><strong style={{ color: "#7a6a45" }}>Safety: </strong>{ent.safety_summary}</p>}
            </details>
          )}
        </div>
      </section>

      <section className="join">
        <h2>Know more about {ent.name}?</h2>
        <p>Every entry here is an open record — a tradition, a study, a use from your corner of the world. If you can strengthen it, add it.</p>
        <Link className="btn btn-gold" href="/shape" style={{ marginTop: 18 }}>Add what you know →</Link>
      </section>
      <Footer />
    </>
  );
}
