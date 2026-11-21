import Link from "next/link";
import { PageShell, Sec } from "@/components/PageShell";
import { GRADES, GRADE_TOTAL } from "@/lib/universe";
import "../pages.css";

export const metadata = {
  title: "Where it stands — NAP",
  description:
    "An honest account of the stage NAP is at: an early prototype, a designed pilot with no outcomes yet, and an open invitation to contributors.",
};

// The road from a written framework to a proven one. "done" = exists today; "now" = the current step.
const ROAD: { name: string; plain: string; state: "done" | "now" | "ahead" }[] = [
  { name: "Framework written", plain: "Twelve founding documents, published as drafts and narrated.", state: "done" },
  { name: "Evidence graded", plain: `${GRADE_TOTAL} ingredient–condition links graded in-house.`, state: "done" },
  { name: "Pilot designed", plain: "Protocol drafted. Not registered; no one enrolled.", state: "now" },
  { name: "Independent review", plain: "Grades checked by outside clinicians and pharmacists.", state: "ahead" },
  { name: "First outcomes", plain: "The pilot runs and its results are published, favorable or not.", state: "ahead" },
];

function Road() {
  return (
    <div>
      <ol className="road" aria-label="NAP's progress, step by step">
        {ROAD.map((r) => (
          <li key={r.name} className={`road-r road-${r.state}`}>
            <span className="road-knot" aria-hidden="true" />
            <div>
              <p className="road-name">
                {r.name}
                <span className="road-st">{r.state === "done" ? "Done" : r.state === "now" ? "Current step" : "Not yet"}</span>
              </p>
              <p className="road-plain">{r.plain}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function WhereItStands() {
  const count = (n: string) => GRADES.find((g) => g.name === n)?.count ?? 0;
  return (
    <PageShell
      title="The honest stage we're at."
      lede={
        <>
          Every system of medicine was once a draft. The fastest way to lose a serious reader is to overclaim, so here
          is exactly where NAP is: what exists, what doesn&apos;t, and what comes next.
        </>
      }
      aside={<Road />}
    >
      <Sec id="exists" title="What exists today.">
        <p>
          A complete founding library of twelve documents: the philosophy, the supporting science, the governance, the
          clinical application, and an honest accounting of the limits. A clinical pilot protocol has been drafted,
          using validated instruments and a pre-specified analysis plan. It is not yet registered, and no participants
          have been enrolled.
        </p>
      </Sec>

      <Sec id="not-yet" title="What does not exist yet.">
        <p>
          Outcome data of our own. The integrated framework is a hypothesis assembled from individually studied
          mechanisms. So far NAP has graded {GRADE_TOTAL} ingredient–condition links ({count("Established")} established,{" "}
          {count("Studied")} studied, {count("Emerging")} emerging, {count("Minimal")} minimal, {count("None")} with no
          support found). That grading was done in-house and has not yet been reviewed by an independent clinician,
          pharmacist, or regulatory attorney. The combined effect, delivered as a complete program, has not yet been
          measured.
        </p>
        <p>
          We say this plainly everywhere, because it is the truth, and because a framework that names its gaps honestly
          is one worth trusting to close them. <Link href="/how-we-grade">See how the grades are decided.</Link>
        </p>
      </Sec>

      <Sec id="next" title="What comes next.">
        <p>
          Run the first pilot and report its results, favorable or not. Open the framework to the contributors and
          clinicians who can strengthen it. Build the outcome registry that turns practice into published evidence.
          None of this is a claim that NAP is proven. It is a claim that NAP is worth building, in the open, with many
          hands.
        </p>
        <p className="pg-pledge">
          This is not something we are trying to push into law or onto doctors. It is a draft framework for natural
          health care, a standard in formation, adopted by no one yet, offered for review, and built to be shaped.
        </p>
        <p>
          <Link className="btn btn-gold" href="/shape">Join the build</Link>
        </p>
      </Sec>
    </PageShell>
  );
}
