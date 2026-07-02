import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Seal } from "@/components/Seal";

export default function Home() {
  return (
    <>
      <Nav />

      <section className="hero">
        <div className="hero-in">
          <div className="hero-copy">
            <div className="eyebrow">An open framework · offered for review</div>
            <h1>A new foundation for natural health care — and an invitation to help build it.</h1>
            <p>
              NAP is an early-stage framework for treating the root causes of chronic illness, not only its
              symptoms. It isn&apos;t finished, and it isn&apos;t trying to become law or doctrine. It&apos;s a
              beginning — offered openly so the right minds can examine it, challenge it, and shape it.
            </p>
            <div className="hero-cta">
              <Link className="btn btn-gold" href="/shape">Join the build →</Link>
              <Link className="btn btn-ghost" href="/framework">Read the framework</Link>
            </div>
            <div className="hero-fine">
              An early-stage prototype, offered for review and shaping — not medical advice.
            </div>
          </div>
          <div className="hero-seal">
            <Seal size={190} full />
          </div>
        </div>
      </section>

      <section className="sec sec-ivory">
        <div className="wrap">
          <div className="eyebrow-ink">The idea</div>
          <h2 className="serif" style={{ margin: "10px 0 4px" }}>Treat the terrain, not just the symptom.</h2>
          <p className="lead">
            Chronic illness rarely has a single cause. NAP looks upstream — at the accumulated toxic burden,
            nutritional gaps, hormonal disruption, and inflammation that drive disease — and asks what it would
            take to restore the body&apos;s foundation. Every claim is sourced. What&apos;s proven is marked
            proven; what&apos;s still a question is marked a question.
          </p>
          <div className="grid g3" style={{ marginTop: 8 }}>
            <div className="card" style={{ cursor: "default" }}>
              <div className="cat">Root-cause</div>
              <h3>Upstream, not downstream</h3>
              <p>Address the drivers of illness, not only the labels we give its symptoms.</p>
            </div>
            <div className="card" style={{ cursor: "default" }}>
              <div className="cat">Honest</div>
              <h3>Proven vs. proposed</h3>
              <p>A framework that names its own limits is one you can actually trust.</p>
            </div>
            <div className="card" style={{ cursor: "default" }}>
              <div className="cat">Open</div>
              <h3>Built by many hands</h3>
              <p>This is a prototype for a shared standard — and you&apos;re invited to shape it.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="sec sec-ivory2">
        <div className="wrap">
          <div className="eyebrow-ink">The framework</div>
          <h2 className="serif" style={{ margin: "10px 0 4px" }}>Twelve founding documents. A starting point, not a finish line.</h2>
          <p className="lead">The system is formed enough to examine — and unfinished enough to need you. Everything here is open to revision.</p>
          <div className="grid g4">
            <Link className="card" href="/framework#core"><div className="cat">Core framework</div><h3>The thesis</h3><p>The manifesto, the evidence, and the modalities.</p></Link>
            <Link className="card" href="/framework#governance"><div className="cat">Governance &amp; build</div><h3>How it&apos;s governed</h3><p>The council, the architecture, and the coalition.</p></Link>
            <Link className="card" href="/framework#clinical"><div className="cat">Clinical application</div><h3>At the bedside</h3><p>Where the framework meets a real patient.</p></Link>
            <Link className="card" href="/framework#integrity"><div className="cat">Integrity &amp; proof</div><h3>Honest limits</h3><p>Safety, outcomes, and what we haven&apos;t proven yet.</p></Link>
          </div>
          <div style={{ marginTop: 20 }}>
            <Link className="btn btn-ink" href="/framework">Open the full framework →</Link>
          </div>
        </div>
      </section>

      <section className="sec sec-ivory">
        <div className="wrap">
          <div className="eyebrow-ink">Where it stands</div>
          <h2 className="serif" style={{ margin: "10px 0 18px" }}>Honest about the stage we&apos;re at.</h2>
          <div className="status">
            <div><div className="k">Stage</div><div className="v">Early prototype</div></div>
            <div><div className="k">First pilot</div><div className="v">Designed — no outcomes yet</div></div>
            <div><div className="k">Contributors</div><div className="v">Open — join the founders</div></div>
          </div>
          <div style={{ marginTop: 22 }}>
            <Link className="read-back" href="/where-it-stands" style={{ color: "var(--gold)" }}>Read the full status →</Link>
          </div>
        </div>
      </section>

      <section className="join">
        <h2>This is the beginning. Help shape it.</h2>
        <p>
          Bring an idea and our guide will help you sharpen it, show you where it already lives in the framework,
          or help you add something new. Contributors join the founding members.
        </p>
        <div className="avatars">
          <span className="av">MJ</span><span className="av">DR</span><span className="av">LK</span>
          <span className="av-note">the founding wall begins with you</span>
        </div>
        <Link className="btn btn-gold" href="/founders">Add your name to the founders →</Link>
      </section>

      <Footer />
    </>
  );
}
