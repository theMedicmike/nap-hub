import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { FounderForm } from "@/components/FounderForm";
import { supabaseAdmin } from "@/lib/supabase";

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

  return (
    <>
      <Nav />
      <section className="hero">
        <div className="hero-in">
          <div className="hero-copy">
            <div className="eyebrow">The founders</div>
            <h1>Built by many hands. Yours can be one of them.</h1>
            <p>NAP is a prototype for a shared standard. The people who examine it, challenge it, and improve it are its founders — and they&apos;re named for it. This is how a framework earns the trust to become real.</p>
          </div>
        </div>
      </section>

      <section className="sec sec-ivory">
        <div className="wrap">
          <div className="eyebrow-ink">How recognition works</div>
          <h2 className="serif" style={{ margin: "10px 0 18px" }}>Three ways to be a founder.</h2>
          <div className="tiers">
            <div className="tier"><div className="tname">Founding Signatory</div><div className="tdesc">You&apos;ve added your name in support of the framework and its mission. The public record of who stood here at the beginning.</div></div>
            <div className="tier"><div className="tname">Contributor</div><div className="tdesc">You brought an idea that was reviewed and accepted into the framework. Your name appears on the principle you shaped.</div></div>
            <div className="tier"><div className="tname">Architect</div><div className="tdesc">You made a major, sustained contribution to the canon. Reserved for the few who help build whole sections of the standard.</div></div>
          </div>
          <div className="note" style={{ marginTop: 22 }}>A real bar, on purpose. You join the wall after a verified endorsement or an accepted contribution — never just an email. A small wall of real builders is worth more than a long list of names.</div>
        </div>
      </section>

      <section className="sec sec-ivory2">
        <div className="wrap">
          <div className="eyebrow-ink">The founding wall</div>
          <h2 className="serif" style={{ margin: "10px 0 14px" }}>It begins here.</h2>
          <div className="wall">
            <div className="wav">MJ</div>
            {founders.map((f, i) => (
              <div key={i} className="wav" title={f.display_name ?? undefined}>{initials(f.display_name)}</div>
            ))}
            <div className="wav" style={{ background: "#1f3454", border: "1px dashed rgba(201,164,90,.5)" }}>+</div>
          </div>
          <p className="lead" style={{ marginTop: 16 }}>Michael Andrew Feller Jones, founder. The next names are yours and your colleagues&apos;.</p>
        </div>
      </section>

      <section className="join">
        <h2>Add your name.</h2>
        <p>Stand on the record as a founding signatory now, or bring an idea through the guide to join as a contributor.</p>
        <FounderForm />
        <p style={{ marginTop: 18 }}>
          <a href="/shape" style={{ color: "var(--gold-bright)", fontSize: 13 }}>Or bring an idea to the guide →</a>
        </p>
      </section>
      <Footer />
    </>
  );
}
