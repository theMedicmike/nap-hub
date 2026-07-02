import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Where it stands — NAP",
  description:
    "An honest account of the stage NAP is at: an early prototype, a designed pilot with no outcomes yet, and an open invitation to contributors.",
};

export default function WhereItStands() {
  return (
    <>
      <Nav />
      <section className="hero">
        <div className="hero-in">
          <div className="hero-copy">
            <div className="eyebrow">Where it stands</div>
            <h1>The honest stage we&apos;re at.</h1>
            <p>The fastest way to lose a serious reader is to overclaim. So here is exactly where NAP is — what exists, what doesn&apos;t, and what comes next.</p>
          </div>
        </div>
      </section>

      <section className="sec sec-ivory">
        <div className="wrap">
          <div className="status">
            <div><div className="k">Stage</div><div className="v">Early prototype</div></div>
            <div><div className="k">First pilot</div><div className="v">Designed — no outcomes yet</div></div>
            <div><div className="k">Contributors</div><div className="v">Open — join the founders</div></div>
          </div>
        </div>
      </section>

      <section className="sec sec-ivory2">
        <div className="wrap" style={{ maxWidth: 760 }}>
          <div className="doc">
            <h2 style={{ border: "none", paddingTop: 0 }}>What exists today</h2>
            <p>A complete founding library of twelve documents — the philosophy, the supporting science, the governance, the clinical application, and an honest accounting of the limits. A clinical pilot study has been fully designed, with validated instruments and a pre-specified analysis plan, ready for review.</p>
            <h2>What does not exist yet</h2>
            <p>Outcome data of our own. The integrated framework is a hypothesis built on established science — each link supported in the peer-reviewed literature — but the combined effect, delivered as a complete program, has not yet been measured. We say this plainly everywhere, because it is the truth, and because a framework that names this honestly is one worth trusting to close the gap.</p>
            <h2>What comes next</h2>
            <p>Run the first pilot and report its results — favorable or not. Open the framework to the contributors and clinicians who can strengthen it. Build the outcome registry that turns practice into published evidence. None of this is a claim that NAP is proven. It is a claim that NAP is worth building, in the open, with many hands.</p>
            <blockquote>This is not something we are trying to push into law or onto doctors. It is the beginning of a prototype for a shared standard in natural health care — offered for review, and built to be shaped.</blockquote>
          </div>
        </div>
      </section>

      <section className="join">
        <h2>Help build what comes next.</h2>
        <p>The honest version of this work needs more minds. Bring yours.</p>
        <Link className="btn btn-gold" href="/shape" style={{ marginTop: 18 }}>Join the build →</Link>
      </section>
      <Footer />
    </>
  );
}
