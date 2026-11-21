import Link from "next/link";
import { PageShell, Sec } from "@/components/PageShell";
import { GRADES, GRADE_TOTAL } from "@/lib/universe";
import "../pages.css";

export const metadata = {
  title: "How we grade — NAP",
  description:
    "How NAP grades the research behind each ingredient and condition: five grades, two separate axes, and the honest limits of the work so far.",
};

// Plain meanings match the wording on every ingredient page, so a grade means one thing everywhere.
const PLAIN: Record<string, string> = {
  Established: "Strong research that has been repeated and holds up.",
  Studied: "Real studies exist, but the results are mixed or modest.",
  Emerging: "Early research looks promising. Not settled.",
  Minimal: "Very little research. Most of what exists is history, not science.",
  None: "We looked and found no research support.",
};

export default function HowWeGrade() {
  return (
    <PageShell
      title="How a claim earns its grade."
      lede={
        <>
          Every system of medicine rests on one question: how do we know? NAP answers it in public. Each link between an
          ingredient and a condition carries a grade for what research shows, and a separate record of what tradition has
          handed down. The two are never blended.
        </>
      }
      updated="November 21, 2026"
      aside={
        <figure style={{ margin: 0 }}>
          <ol className="gl" aria-label={`Evidence grades across ${GRADE_TOTAL} graded links`}>
            {GRADES.map((g) => (
              <li key={g.name} className="gl-r" style={{ ["--s" as string]: g.height / 100 }}>
                <span className="gl-knot" aria-hidden="true"><i /></span>
                <div>
                  <p className="gl-name">{g.name}</p>
                  <p className="gl-plain">{PLAIN[g.name]}</p>
                </div>
                <p className="gl-n"><b>{g.count}</b><span>links</span></p>
              </li>
            ))}
          </ol>
          <figcaption className="gl-cap">
            {GRADE_TOTAL} ingredient–condition links graded so far. Graded in-house; not yet independently reviewed.
          </figcaption>
        </figure>
      }
    >
      <Sec id="axes" title="Two kinds of knowing, kept apart." wide>
        <div className="ax">
          <div className="ax-sci">
            <h3><i aria-hidden="true" />The research grade</h3>
            <p>
              What published human research shows about one ingredient for one condition. It runs from Established down to
              None. This is the only mark NAP calls evidence.
            </p>
          </div>
          <div className="ax-trad">
            <h3><i aria-hidden="true" />The traditional record</h3>
            <p>
              How people across cultures have used a plant, drawn from a record of more than 13,000 plants. It shows what was
              handed down. It is history, not proof that a remedy works.
            </p>
          </div>
        </div>
        <p className="pg-fine" style={{ marginTop: 16 }}>
          A plant can have thousands of years of use and a research grade of Minimal. Both facts are shown. Neither is
          allowed to stand in for the other.
        </p>
      </Sec>

      <Sec id="built" title="What a grade is built from.">
        <ul>
          <li><strong>Named sources.</strong> Every graded link cites the studies behind it, so anyone can read them.</li>
          <li><strong>The studies that disappoint, too.</strong> Trials that found no effect count against a grade. Leaving them out is how evidence gets inflated.</li>
          <li><strong>A second check that tries to break it.</strong> Each finding is checked again by a reviewer whose job is to prove it wrong. Citations that could not be found in the published record were removed.</li>
          <li><strong>A safety note.</strong> Every link carries who should avoid the ingredient and which medicines it can interact with.</li>
          <li><strong>Plain words.</strong> Every grade comes with a sentence a person without medical training can read.</li>
        </ul>
      </Sec>

      <Sec id="not" title="What a grade is not.">
        <dl className="pg-rows">
          <div className="pg-row"><dt>Not a promise</dt><dd>A grade describes research on groups of people. It cannot say what will happen for you.</dd></div>
          <div className="pg-row"><dt>Not a recommendation</dt><dd>NAP does not tell anyone to take anything. Decisions about your care belong with you and a licensed clinician.</dd></div>
          <div className="pg-row"><dt>Never "proven"</dt><dd>NAP does not use the word. Even Established means strong and repeated, not final.</dd></div>
          <div className="pg-row"><dt>Not for sale</dt><dd>NAP names no products and takes no money for a grade. A grade belongs to an ingredient, never to a brand.</dd></div>
        </dl>
      </Sec>

      <Sec id="who" title="Who has checked it so far.">
        <p>
          The honest answer: the grading was done in-house, using research tools that include AI, and checked against the
          original published papers. It has <strong>not yet</strong> been reviewed by an independent clinician,
          pharmacist, or regulatory attorney.
        </p>
        <p>
          That outside review is the next milestone. When it happens, each reviewed link will show who reviewed it and
          when, and links that have not been reviewed will say so.
        </p>
      </Sec>

      <Sec id="change" title="When a grade changes.">
        <p>
          Grades move when the research moves. A new trial, a retraction, or a correction can raise or lower a grade.
          Changes are recorded on the <Link href="/changelog">changelog</Link>, including the ones that make NAP look
          worse. If you find a study we missed or a grade you think is wrong, <Link href="/shape">bring it to the build</Link>.
        </p>
        <p className="pg-pledge">The grade follows the evidence. Nothing else gets a vote.</p>
      </Sec>

      <Sec id="see" title="See the grades.">
        <p>
          The <Link href="/atlas/brain">database</Link> shows every graded link side by side with its traditional record.
          The founding <Link href="/framework/evidence-compendium">Evidence Compendium</Link> explains the research behind
          the framework as a whole.
        </p>
      </Sec>
    </PageShell>
  );
}
