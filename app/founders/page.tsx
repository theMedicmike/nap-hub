import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { FounderForm } from "@/components/FounderForm";
import { Fireflies } from "@/components/universe/Fireflies";
import { supabaseAdmin } from "@/lib/supabase";
import "../inner.css";

export const metadata = {
  title: "The founders — NAP",
  description: "The people building the NAP framework. Add your name as a founding signatory, contributor, or architect.",
};

export const dynamic = "force-dynamic";

interface Contributor { display_name: string | null; tier: string | null }

function initials(name: string | null): string {
  if (!name) return "—";
  return name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

const TIERS = [
  { name: "Founding Signatory", rings: 1, desc: "You've added your name in support of the framework and its mission. The public record of who stood here at the beginning." },
  { name: "Contributor", rings: 2, desc: "You brought an idea that was reviewed and accepted into the framework. Your name appears on the principle you shaped." },
  { name: "Architect", rings: 3, desc: "You made a major, sustained contribution to the canon. Reserved for the few who help build whole sections of the framework." },
];

export default async function Founders() {
  let founders: Contributor[] = [];
  const sb = supabaseAdmin();
  if (sb) {
    const { data } = await sb
      .from("contributors")
      .select("display_name, tier")
      .eq("public_optin", true)
      .order("joined_at", { ascending: true })
      .limit(60);
    if (data) founders = data as Contributor[];
  }

  // The founding wall as a circle of seats around the thread: the founder's seat, every
  // signatory's seat, then open seats waiting. Open seats are decoration, not people.
  const OPEN = Math.max(3, 12 - 1 - founders.length);
  const seats: ({ kind: "founder" } | { kind: "signer"; f: Contributor } | { kind: "open"; last: boolean })[] = [
    { kind: "founder" },
    ...founders.map((f) => ({ kind: "signer" as const, f })),
    ...Array.from({ length: OPEN }, (_, i) => ({ kind: "open" as const, last: i === OPEN - 1 })),
  ];
  const N = seats.length;
  const seatSize = N <= 14 ? 15 : N <= 24 ? 11 : N <= 40 ? 8 : 6; // % of the ring's width

  return (
    <div className="uv fd">
      <Nav />
      <main>
        <header className="fdh" aria-labelledby="fdh-h">
          <Fireflies className="fdh-ff" density={0.5} />
          <div className="u-wrap fdh-in">
            <div className="fdh-copy">
              <p className="fdh-kicker">The founders</p>
              <h1 id="fdh-h" className="fdh-h1">Built by many hands. Yours can be one of&nbsp;them.</h1>
              <p className="fdh-lede">
                NAP is a draft framework — a standard in formation that no one has adopted yet. The people who examine
                it, challenge it, and improve it are its founders — and they&apos;re named for it. This is how a framework
                earns the trust to become real.
              </p>
              <div className="fdh-cta">
                <a className="btn btn-thread" href="#join">Add your name</a>
                <Link className="btn btn-glass" href="/shape">Bring an idea to the guide</Link>
              </div>
            </div>

            <figure className="fdr" aria-labelledby="fdr-cap">
              <div className="fdr-ring" style={{ ["--sz" as string]: `${seatSize}%`, ["--szn" as string]: seatSize }}>
                <svg className="fdr-svg" viewBox="0 0 200 200" aria-hidden="true">
                  <circle className="fdr-orbit" cx="100" cy="100" r="84" />
                  <circle className="fdr-orbit fdr-orbit-2" cx="100" cy="100" r="62" />
                  <path className="fdr-thread" pathLength={1} d="M100 112 C 93 96 107 82 100 66 S 95 50 100 42" />
                  <circle className="fdr-knot" cx="100" cy="42" r="2.6" />
                </svg>
                <div className="fdr-center">
                  <p className="fdr-begins">It begins here.</p>
                </div>
                <ul className="fdr-seats" aria-label="The founding wall">
                  {seats.map((s, i) => {
                    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
                    const pos = { left: `${50 + Math.cos(a) * 42}%`, top: `${50 + Math.sin(a) * 42}%` };
                    if (s.kind === "founder") {
                      return (
                        <li key="founder" className="fdr-seat fdr-founder" style={pos}>
                          <span className="fdr-lamp" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 20 C 10 15 14 11 12 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><path d="M12 12 C 15 11 17 9 17.5 6.5 C 15 7 13 8.5 12 12Z M12 15 C 9 14 7 12.5 6.5 10 C 9 10.5 11 12 12 15Z" fill="currentColor" /></svg></span>
                          <span className="at-sr">Michael Andrew Feller Jones, founder</span>
                        </li>
                      );
                    }
                    if (s.kind === "signer") {
                      return (
                        <li key={`s-${i}`} className="fdr-seat fdr-signer" style={pos} title={s.f.display_name ?? undefined}>
                          <span className="fdr-lamp" aria-hidden="true">{initials(s.f.display_name)}</span>
                          <span className="at-sr">{s.f.display_name ?? "A signatory"}</span>
                        </li>
                      );
                    }
                    return s.last ? (
                      <li key={`o-${i}`} className="fdr-seat fdr-open fdr-add" style={pos}>
                        <a className="fdr-lamp" href="#join" aria-label="An open seat: add your name">+</a>
                      </li>
                    ) : (
                      <li key={`o-${i}`} className="fdr-seat fdr-open" style={pos} aria-hidden="true"><span className="fdr-lamp" /></li>
                    );
                  })}
                </ul>
              </div>
              <figcaption id="fdr-cap" className="fdr-cap">
                <span className="fdr-cap-k">The founding wall</span>
                Michael Andrew Feller Jones, founder. The next names are yours and your colleagues&apos;.
              </figcaption>
            </figure>
          </div>
        </header>

        <section className="fdt" aria-labelledby="fdt-h">
          <div className="u-wrap">
            <p className="fdt-kicker">How recognition works</p>
            <h2 id="fdt-h" className="fd-h2">Three ways to be a founder.</h2>
            <ol className="fdt-list">
              {TIERS.map((t) => (
                <li key={t.name} className="fdt-tier">
                  <svg className="fdt-rings" viewBox="0 0 80 80" aria-hidden="true">
                    {[30, 21, 12].map((r, i) => (
                      <circle key={r} cx="40" cy="40" r={r} className={i < t.rings ? "on" : ""} />
                    ))}
                    <circle cx="40" cy="40" r="3.5" className="dot" />
                  </svg>
                  <h3 className="fdt-name">{t.name}</h3>
                  <p className="fdt-desc">{t.desc}</p>
                </li>
              ))}
            </ol>
            <p className="fdt-note">
              Signatories appear on the wall when they sign; we remove anything that isn&apos;t a real person. No
              contribution has been accepted yet, so no one holds the Contributor or Architect tier today.
            </p>
          </div>
        </section>

        <section className="hands fdj" id="join" aria-labelledby="fdj-h">
          <svg className="hands-thread" viewBox="0 0 1200 200" preserveAspectRatio="none" aria-hidden="true">
            <path pathLength={1} d="M0 120 C 200 40 360 180 600 110 S 980 60 1200 120" />
          </svg>
          <div className="u-wrap hands-in">
            <h2 id="fdj-h" className="hands-h">Add your name.</h2>
            <p className="u-lede">Stand on the record as a founding signatory now, or bring an idea through the guide to join as a contributor.</p>
            <div className="fdj-form"><FounderForm /></div>
            <p className="fdj-more"><Link href="/shape">Or bring an idea to the guide</Link></p>
            <p className="fdj-fine">NAP certifies no one. Being named here is a record of who helped build the framework, not a credential.</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
