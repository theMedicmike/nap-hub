import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PageShell, Sec } from "@/components/PageShell";
import "../../pages.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "The NAP Database — NAP", robots: { index: false, follow: false } };

const AUTH_COOKIE = "nap_preview";
const COVERAGE_LIMIT = 60;

async function signIn(formData: FormData): Promise<void> {
  "use server";
  const expected = process.env.PREVIEW_KEY ?? "";
  const key = String(formData.get("key") ?? "");
  const back = String(formData.get("back") ?? "/atlas/brain");
  const safeBack = back.startsWith("/ingredient/") || back === "/atlas/brain" ? back : "/atlas/brain";
  if (!expected || key !== expected) redirect(`${safeBack}?bad=1`);
  const jar = await cookies();
  jar.set(AUTH_COOKIE, key, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 60 * 60 * 24 * 7 });
  redirect(safeBack);
}

interface Ent { id: string; type: string; name: string; slug: string; summary: string | null; ingredient_type: string | null; safety_summary: string | null; plain_summary: string | null; also_known_as: string | null; publish_status: string | null; category: string | null; veteran_priority: boolean | null; formula_ingredients: { name: string; role: string | null }[] | null; origin_text: string | null }
interface Lnk { id: string; from_entity: string; to_entity: string; scientific_tier: string | null; traditional_strength: string | null; safety_note: string | null; status: string; created_at: string | null; last_verified: string | null }
interface CovLnk { id: string; from_entity: string; to_entity: string; relation: string; coverage_use_count: number | null }
interface Src { id: string; citation: string | null; title: string | null; url: string | null }

const TIERS: Record<string, { label: string; plain: string; s: number; rank: number }> = {
  established: { label: "Established", plain: "Strong research that has been repeated and holds up.", s: 1, rank: 5 },
  studied: { label: "Studied", plain: "Real studies exist, but the results are mixed or modest.", s: 0.72, rank: 4 },
  emerging: { label: "Emerging", plain: "Early research looks promising. Not settled.", s: 0.48, rank: 3 },
  minimal: { label: "Minimal", plain: "Very little research. Most of what exists is history, not science.", s: 0.26, rank: 2 },
  none: { label: "None", plain: "We looked and found no research support.", s: 0.08, rank: 1 },
};
const TRAD: Record<string, string> = { deep: "Deep tradition", moderate: "Moderate tradition", limited: "Limited tradition" };
const tier = (t: string | null) => TIERS[(t || "").toLowerCase()] ?? { label: t || "Ungraded", plain: "", s: 0.1, rank: 0 };

// Older summaries were stored cut off at 400 characters. Never show a half sentence: end at the
// last full stop, or say nothing.
function wholeSentences(s: string | null): string | null {
  if (!s) return null;
  const t = s.trim();
  if (t.length < 395 || /[.!?)]$/.test(t)) return t;
  const cut = Math.max(t.lastIndexOf(". "), t.lastIndexOf(".) "), t.lastIndexOf("; "));
  return cut > 120 ? t.slice(0, cut + 1) : null;
}

const monthYear = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }) : null;

function Gate({ back, bad }: { back: string; bad: boolean }) {
  return (
    <PageShell
      title="This record is in private preview."
      lede={
        <>
          The NAP Database is open to reviewers while its grades are checked. You can still read{" "}
          <Link href="/how-we-grade">how every grade is decided</Link>, or <Link href="/ask">ask the guide</Link>, which
          answers from the same graded evidence.
        </>
      }
    >
      <Sec id="key" title="Have a view key?">
        {bad && <p className="db-bad" role="alert">That key didn&apos;t match. Try again.</p>}
        <form action={signIn} className="db-key">
          <input type="hidden" name="back" value={back} />
          <label className="db-sr" htmlFor="db-key-in">View key</label>
          <input id="db-key-in" name="key" type="password" placeholder="View key" autoComplete="off" />
          <button className="btn btn-gold" type="submit">Open the record</button>
        </form>
      </Sec>
    </PageShell>
  );
}

export default async function EntryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ bad?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const back = `/ingredient/${slug}`;
  const expected = process.env.PREVIEW_KEY ?? "";
  const jar = await cookies();
  const authed = Boolean(expected) && jar.get(AUTH_COOKIE)?.value === expected;
  if (!authed) return <Gate back={back} bad={Boolean(sp?.bad)} />;

  const sb = supabaseAdmin();
  let ent: Ent | null = null;
  const conns: { other: Ent; link: Lnk; asIngredient: boolean }[] = [];
  const srcByLink = new Map<string, Src[]>();
  const covConns: { other: Ent; link: CovLnk }[] = [];
  let covTotal = 0;

  const ENT_COLS = "id,type,name,slug,summary,ingredient_type,safety_summary,plain_summary,also_known_as,publish_status,category,veteran_priority,formula_ingredients,origin_text";

  if (sb) {
    const { data } = await sb.from("atlas_entities").select(ENT_COLS).eq("slug", slug).maybeSingle();
    ent = (data as Ent) || null;
    if (ent) {
      const { data: ld } = await sb.from("atlas_links")
        .select("id,from_entity,to_entity,scientific_tier,traditional_strength,safety_note,status,created_at,last_verified")
        .not("scientific_tier", "is", null).or(`from_entity.eq.${ent.id},to_entity.eq.${ent.id}`);
      const links = (ld ?? []) as Lnk[];
      const otherIds = Array.from(new Set(links.map((l) => (l.from_entity === ent!.id ? l.to_entity : l.from_entity))));
      const { data: others } = otherIds.length ? await sb.from("atlas_entities").select(ENT_COLS).in("id", otherIds) : { data: [] as Ent[] };
      const oById = new Map((others ?? []).map((o) => [o.id, o as Ent]));
      for (const l of links) {
        const asIngredient = l.from_entity === ent.id;
        const other = oById.get(asIngredient ? l.to_entity : l.from_entity);
        if (other) conns.push({ other, link: l, asIngredient });
      }
      conns.sort((a, b) => tier(b.link.scientific_tier).rank - tier(a.link.scientific_tier).rank || a.other.name.localeCompare(b.other.name));
      const linkIds = links.map((l) => l.id);
      if (linkIds.length) {
        const { data: lsd } = await sb.from("atlas_link_sources").select("link_id,source_id").in("link_id", linkIds);
        const srcIds = Array.from(new Set((lsd ?? []).map((x) => x.source_id)));
        const { data: sd } = srcIds.length ? await sb.from("atlas_sources").select("id,citation,title,url").in("id", srcIds) : { data: [] as Src[] };
        const sById = new Map((sd ?? []).map((s) => [s.id, s as Src]));
        for (const row of lsd ?? []) {
          const s = sById.get(row.source_id);
          if (!s) continue;
          const arr = srcByLink.get(row.link_id) ?? [];
          arr.push(s);
          srcByLink.set(row.link_id, arr);
        }
      }

      const { data: cd, count } = await sb.from("atlas_links")
        .select("id,from_entity,to_entity,relation,coverage_use_count", { count: "exact" })
        .eq("status", "coverage").or(`from_entity.eq.${ent.id},to_entity.eq.${ent.id}`)
        .order("coverage_use_count", { ascending: false, nullsFirst: false }).limit(COVERAGE_LIMIT);
      covTotal = count ?? 0;
      const covLinks = (cd ?? []) as CovLnk[];
      const covOtherIds = Array.from(new Set(covLinks.map((l) => (l.from_entity === ent!.id ? l.to_entity : l.from_entity))));
      const { data: covOthers } = covOtherIds.length ? await sb.from("atlas_entities").select(ENT_COLS).in("id", covOtherIds) : { data: [] as Ent[] };
      const covOById = new Map((covOthers ?? []).map((o) => [o.id, o as Ent]));
      for (const l of covLinks) {
        const other = covOById.get(l.from_entity === ent.id ? l.to_entity : l.from_entity);
        if (other) covConns.push({ other, link: l });
      }
    }
  }

  if (!ent) {
    return (
      <PageShell title="No entry found." lede={<>There is no record for &ldquo;{slug}&rdquo;. <Link href="/atlas/brain">Back to the database</Link>.</>}>
        <span />
      </PageShell>
    );
  }

  const kind = ent.type === "condition" ? "Condition" : ent.type === "formula" ? "Classical formula" : "Ingredient";
  const folk = covConns.filter((c) => c.link.relation === "traditionally used for");
  const lab = covConns.filter((c) => c.link.relation === "documented activity (preclinical)");
  const contains = covConns.filter((c) => c.link.relation === "contains");
  const isCoverageOnly = ent.publish_status === "coverage" && conns.length === 0;
  const clinical = isCoverageOnly ? null : wholeSentences(ent.summary);

  const chips = (items: typeof covConns) => (
    <ul className="db-chips">
      {items.map((c) => (
        <li key={c.link.id}>
          <Link href={`/ingredient/${c.other.slug}`}>
            {c.other.name}
            {typeof c.link.coverage_use_count === "number" && <span>{c.link.coverage_use_count}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <PageShell
      title={ent.name}
      lede={
        <>
          <span className="db-kind">
            {kind}
            {ent.ingredient_type ? ` · ${ent.ingredient_type}` : ""}
            {ent.category ? ` · ${ent.category}` : ""}
            {ent.veteran_priority ? " · Veteran priority" : ""}
          </span>
          {ent.plain_summary || "An entry in the NAP Database."}
          {ent.also_known_as && <span className="db-aka">Also known as {ent.also_known_as}</span>}
          {ent.origin_text && <span className="db-aka">Origin: {ent.origin_text}</span>}
        </>
      }
    >
      <p className="db-back pgs"><Link href="/atlas/brain">Back to the database</Link></p>

      {ent.formula_ingredients && ent.formula_ingredients.length > 0 && (
        <Sec id="formula" title={`Traditionally made from ${ent.formula_ingredients.length} ingredients.`}>
          <ul className="db-chips db-chips-plain">
            {ent.formula_ingredients.map((fi, i) => (
              <li key={i}><span>{fi.name}{fi.role ? <em> · {fi.role}</em> : null}</span></li>
            ))}
          </ul>
          <p className="pg-fine">
            This describes a traditional multi-herb formula, its historical makeup and use. There is little to no modern
            clinical-trial evidence for the formula as a whole.
          </p>
        </Sec>
      )}

      {conns.length > 0 && (
        <Sec id="graded" title={ent.type === "condition" ? "Ingredients graded for this." : "What the research shows."} wide>
          <p className="db-intro">
            Each finding below carries a grade for how strongly research supports it, the full safety note, and the
            studies it rests on. A grade describes research, not a promise. Graded in-house and not yet independently
            reviewed. <Link href="/how-we-grade">How a grade is decided</Link>.
          </p>
          <div className="db-finds">
            {conns.map((c) => {
              const t = tier(c.link.scientific_tier);
              const srcs = srcByLink.get(c.link.id) ?? [];
              const graded = monthYear(c.link.created_at);
              const checked = monthYear(c.link.last_verified);
              return (
                <article key={c.link.id} id={`f-${c.link.id}`} className="db-find">
                  <header className="db-find-h">
                    <span className="db-knot" style={{ ["--s" as string]: t.s }} aria-hidden="true"><i /></span>
                    <h3>
                      <Link href={`/ingredient/${c.other.slug}`}>{c.other.name}</Link>
                    </h3>
                    <span className="db-tier">{t.label}</span>
                    {c.link.traditional_strength && <span className="db-trad">{TRAD[c.link.traditional_strength.toLowerCase()] ?? c.link.traditional_strength}</span>}
                  </header>
                  <p className="db-plain">{t.plain}</p>
                  {c.link.safety_note && (
                    <div className="db-safety">
                      <strong>Safety</strong>
                      <p>{c.link.safety_note}</p>
                    </div>
                  )}
                  {srcs.length > 0 && (
                    <div className="db-srcs">
                      <strong>{srcs.length === 1 ? "The study" : `The ${srcs.length} studies`}</strong>
                      <ol>
                        {srcs.map((s) => (
                          <li key={s.id}>
                            {s.url ? (
                              <a href={s.url} target="_blank" rel="noopener noreferrer">{s.citation || s.title}</a>
                            ) : (
                              <span>{s.citation || s.title}</span>
                            )}
                            {s.title && s.citation && <span className="db-src-find">{s.title}</span>}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  <p className="db-meta">
                    {graded ? `Graded ${graded}` : "Graded"}
                    {checked ? ` · Re-checked ${checked}` : ""} · Awaiting independent review ·{" "}
                    <a href={`#f-${c.link.id}`}>Link to this finding</a>
                  </p>
                </article>
              );
            })}
          </div>
        </Sec>
      )}

      {folk.length > 0 && (
        <Sec id="tradition" title={ent.type === "condition" ? `Plants recorded for this in tradition.` : "What it has been used for in tradition."} wide>
          <p className="db-intro">
            Documented folk and traditional use from Dr. Duke&apos;s Ethnobotanical Database (USDA, public domain). This is
            history, not medical evidence and not a health claim. The number is how many records mention it.
          </p>
          {chips(folk)}
          {covTotal > COVERAGE_LIMIT && <p className="pg-fine">Showing the {COVERAGE_LIMIT} most recorded of {covTotal.toLocaleString()}.</p>}
        </Sec>
      )}

      {lab.length > 0 && (
        <Sec id="lab" title={ent.type === "ingredient" ? "Activity seen in lab studies." : "Compounds studied in the lab for this."} wide>
          <p className="db-intro">
            Recorded in published laboratory or animal studies. Not the same as tradition, and not the same as evidence in
            people.
          </p>
          {chips(lab)}
        </Sec>
      )}

      {contains.length > 0 && (
        <Sec id="contains" title={ent.ingredient_type === "terpene" ? "Found in these plants." : "Contains these compounds."} wide>
          {chips(contains)}
        </Sec>
      )}

      {covConns.length === 0 && conns.length === 0 && (
        <Sec id="gap" title="Nothing recorded here yet.">
          <p>
            This is frontier ground: no graded research and no historical record in the database yet. If you have real
            research to contribute, <Link href="/shape">bring it to the build</Link>.
          </p>
        </Sec>
      )}

      {clinical && (
        <Sec id="clinical" title="For your clinician.">
          <p>{clinical}</p>
          {ent.safety_summary && <p><strong>Safety summary.</strong> {ent.safety_summary}</p>}
        </Sec>
      )}

      <Sec id="add" title={`Know more about ${ent.name}?`}>
        <p>
          Every record here is open. A study, a tradition, or a correction from your corner of the world can strengthen it.
        </p>
        <p><Link className="btn btn-gold" href="/shape">Add what you know</Link></p>
      </Sec>
    </PageShell>
  );
}
