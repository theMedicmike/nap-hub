import Link from "next/link";
import { PageShell, Sec } from "@/components/PageShell";
import "../pages.css";

export const metadata = {
  title: "NAP at a glance — NAP",
  description:
    "The whole NAP framework on one page: what it is for, the principles it holds itself to, how it is organized, and an honest line between what exists today and what does not.",
};

const PRINCIPLES = [
  ["Do no harm first", "Safety comes before every other goal. Anything that could hurt someone is named, and acute or serious illness always goes to a doctor."],
  ["Evidence decides", "NAP prefers neither natural care nor conventional medicine. It prefers whatever the evidence supports for this person."],
  ["Alongside, not instead of", "Natural approaches are offered alongside conventional care, never as a reason to delay or stop it."],
  ["Graded, never “proven”", "Every claim carries a grade for how strongly research supports it, and NAP publicly corrects claims, including its own, that the evidence does not support."],
  ["Certifies no one, sells nothing", "NAP issues no credential, accredits no clinic, charges no fees, and names no products."],
  ["Veterans first", "The first population NAP is built and tested for is veterans and their families."],
];

const SYSTEMS = [
  "Detoxification & elimination",
  "Nutrient absorption & assimilation",
  "Energetic production & metabolism",
  "Hormonal & endocrine regulation",
  "Neurological & cognitive function",
  "Immune & inflammatory response",
  "Cardiovascular & circulatory health",
  "Structural & musculoskeletal integrity",
];

const CATEGORIES = [
  "Toxic burden",
  "Nutrient depletion",
  "Microbial imbalance & barrier dysfunction",
  "Hormonal dysregulation",
  "Inflammatory cascade",
  "Energetic & metabolic dysfunction",
  "Immune incompetence & excessive reactivity",
];

const PILLARS: { name: string; what: string; docs: [string, string][] }[] = [
  {
    name: "Evidence",
    what: "What the research shows, graded.",
    docs: [["evidence-compendium", "Evidence Compendium"], ["modalities-compendium", "Modalities Compendium"], ["outcome-registry-framework", "Outcome Registry Framework"]],
  },
  {
    name: "Safety",
    what: "The floor no practice may go below, and the honest limits.",
    docs: [["clinical-safety-and-practice-standards", "Clinical Safety & Practice Standards"], ["known-limitations-and-roadmap", "Known Limitations & Roadmap"]],
  },
  {
    name: "Care",
    what: "How the framework meets a real person.",
    docs: [["executive-brief", "Executive Brief"], ["manifesto", "Manifesto"], ["veteran-health-specialty-track", "Veteran Health Specialty Track"], ["veteran-mh-restoration-protocol", "Veteran Mental Health Restoration Protocol"]],
  },
  {
    name: "Collaboration",
    what: "How it would be governed, built, and shared.",
    docs: [["standards-council-charter", "Standards Council Charter"], ["strategic-infrastructure-architecture", "Strategic Infrastructure Architecture"], ["coalition-outreach-playbook", "Coalition Outreach Playbook"]],
  },
];

const EXISTS = [
  "Twelve founding documents, published as drafts and narrated",
  "184 ingredient–condition links graded for strength of evidence (graded in-house)",
  "An AI guide that answers from the graded evidence and routes any crisis to 988 or 911",
  "A drafted pilot protocol for veterans, using standard validated questionnaires",
];

const NOT_YET = [
  "Outcome data of its own — no one has been enrolled",
  "Independent review of the grades by a clinician, pharmacist, or attorney",
  "A registered pilot study",
  "A seated Standards Council — it has no members",
  "Any clinic or practitioner that has adopted NAP",
];

export default function AtAGlance() {
  return (
    <PageShell
      title="The whole framework, on one page."
      lede={
        <>
          Nutraceutical Assisted Programs (NAP) is a draft framework for natural health care that looks at the
          body&apos;s foundations, not only the symptoms. Here is what it is for, what it holds itself to, and exactly
          how far it has come.
        </>
      }
    >
      <Sec id="why" title="What it is for." wide>
        <div className="ax">
          <div>
            <h3><i className="ax-dot ax-sci-dot" />Vision</h3>
            <p>
              Care that restores the body&apos;s foundations: safe, graded by evidence, and offered alongside
              conventional medicine, never instead of it.
            </p>
          </div>
          <div>
            <h3><i className="ax-dot ax-trad-dot" />Goal</h3>
            <p>Find out, honestly and in public, whether terrain-first care helps people, starting with veterans.</p>
          </div>
        </div>
      </Sec>

      <Sec id="principles" title="What NAP holds itself to.">
        <dl className="pg-rows">
          {PRINCIPLES.map(([t, d]) => (
            <div key={t} className="pg-row">
              <dt>{t}</dt>
              <dd>{d}</dd>
            </div>
          ))}
        </dl>
      </Sec>

      <Sec id="model" title="Eight systems. Seven underlying problems." wide>
        <p style={{ maxWidth: 720 }}>
          NAP looks at a person across eight biological systems and asks which of seven underlying problems may be
          driving trouble in them. This is a proposed way of organizing an assessment, not an established finding.
        </p>
        <div className="ax">
          <div>
            <h3><i className="ax-dot ax-sci-dot" />8 systems</h3>
            <ol className="aag-list">{SYSTEMS.map((s) => <li key={s}>{s}</li>)}</ol>
          </div>
          <div>
            <h3><i className="ax-dot ax-trad-dot" />7 underlying problems</h3>
            <ol className="aag-list">{CATEGORIES.map((s) => <li key={s}>{s}</li>)}</ol>
          </div>
        </div>
      </Sec>

      <Sec id="documents" title="Four pillars, twelve documents.">
        <dl className="pg-rows">
          {PILLARS.map((p) => (
            <div key={p.name} className="pg-row">
              <dt>{p.name}</dt>
              <dd>
                {p.what}
                <span className="aag-docs">
                  {p.docs.map(([slug, title]) => (
                    <Link key={slug} href={`/framework/${slug}`}>{title}</Link>
                  ))}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </Sec>

      <Sec id="status" title="What exists, and what does not yet." wide>
        <div className="ax">
          <div>
            <h3><i className="ax-dot ax-sci-dot" />Exists today</h3>
            <ul className="aag-ul">{EXISTS.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
          <div>
            <h3><i className="ax-dot ax-trad-dot" />Not yet</h3>
            <ul className="aag-ul">{NOT_YET.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
        </div>
        <p className="pg-fine" style={{ maxWidth: 720 }}>
          NAP is designed to work alongside the VA&apos;s Whole Health approach. The VA has not reviewed or endorsed NAP.
        </p>
        <p>
          <Link className="btn btn-gold" href="/framework">Read the documents</Link>{" "}
          <Link className="aag-more" href="/where-it-stands">The full status</Link>
        </p>
      </Sec>
    </PageShell>
  );
}
