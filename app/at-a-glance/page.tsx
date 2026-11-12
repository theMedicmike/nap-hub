import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "NAP at a glance — NAP",
  description:
    "The whole NAP framework on one page: what it is for, the principles it holds itself to, how it is organized, and an honest line between what exists today and what does not.",
};

const PRINCIPLES = [
  ["Do no harm first", "Safety comes before every other goal. Anything that could hurt someone is named, and acute or serious illness always goes to a doctor."],
  ["Evidence decides", "NAP prefers neither natural care nor conventional medicine. It prefers whatever the evidence supports for this person."],
  ["Alongside, not instead of", "Natural approaches are offered alongside conventional care, never as a reason to delay or stop it."],
  ["Graded, never \"proven\"", "Every claim carries a grade for how strongly research supports it, and NAP publicly corrects claims — including its own — that the evidence does not support."],
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

const box: React.CSSProperties = {
  background: "#fff",
  border: "1px solid rgba(20,35,59,.12)",
  borderRadius: 10,
  padding: "18px 20px",
};

export default function AtAGlance() {
  return (
    <>
      <style>{`.aag2{grid-template-columns:1fr 1fr}.aag3{grid-template-columns:repeat(3,1fr)}@media(max-width:720px){.aag2,.aag3{grid-template-columns:1fr}}`}</style>
      <Nav />
      <section className="hero">
        <div className="hero-in">
          <div className="hero-copy">
            <div className="eyebrow">NAP at a glance</div>
            <h1>The whole framework, on one page.</h1>
            <p>
              Nutraceutical Assisted Programs (NAP) is a draft framework for natural health care that looks at the
              body&apos;s foundations — not only the symptoms. Here is what it is for, what it holds itself to, and
              exactly how far it has come.
            </p>
          </div>
        </div>
      </section>

      <section className="sec sec-ivory">
        <div className="wrap">
          <div className="grid aag2">
            <div style={box}>
              <div className="eyebrow-ink">Vision</div>
              <p className="lead" style={{ margin: "8px 0 0" }}>
                Care that restores the body&apos;s foundations — safe, graded by evidence, and offered alongside
                conventional medicine, never instead of it.
              </p>
            </div>
            <div style={box}>
              <div className="eyebrow-ink">Goal</div>
              <p className="lead" style={{ margin: "8px 0 0" }}>
                Find out, honestly and in public, whether terrain-first care helps people — starting with veterans.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="sec sec-ivory2">
        <div className="wrap">
          <div className="eyebrow-ink">Principles</div>
          <h2 className="serif" style={{ margin: "10px 0 18px" }}>What NAP holds itself to.</h2>
          <div className="grid aag3">
            {PRINCIPLES.map(([t, d]) => (
              <div key={t} className="card" style={{ cursor: "default" }}>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec sec-ivory">
        <div className="wrap">
          <div className="eyebrow-ink">The model</div>
          <h2 className="serif" style={{ margin: "10px 0 6px" }}>Eight systems. Seven underlying problems.</h2>
          <p className="lead">
            NAP looks at a person across eight biological systems and asks which of seven underlying problems may be
            driving trouble in them. This is a proposed way of organizing an assessment — not an established finding.
          </p>
          <div className="grid aag2">
            <div style={box}>
              <div className="eyebrow-ink">8 systems</div>
              <ol style={{ margin: "10px 0 0", paddingLeft: 20, lineHeight: 1.8 }}>
                {SYSTEMS.map((s) => <li key={s}>{s}</li>)}
              </ol>
            </div>
            <div style={box}>
              <div className="eyebrow-ink">7 underlying problems</div>
              <ol style={{ margin: "10px 0 0", paddingLeft: 20, lineHeight: 1.8 }}>
                {CATEGORIES.map((s) => <li key={s}>{s}</li>)}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="sec sec-ivory2">
        <div className="wrap">
          <div className="eyebrow-ink">The documents</div>
          <h2 className="serif" style={{ margin: "10px 0 18px" }}>Four pillars, twelve documents.</h2>
          <div className="grid g4">
            {PILLARS.map((p) => (
              <div key={p.name} className="card" style={{ cursor: "default" }}>
                <div className="cat">{p.name}</div>
                <p style={{ marginTop: 6 }}>{p.what}</p>
                <ul style={{ margin: "10px 0 0", paddingLeft: 18, lineHeight: 1.7, fontSize: 14 }}>
                  {p.docs.map(([slug, title]) => (
                    <li key={slug}><Link href={`/framework/${slug}`} style={{ color: "var(--ink)" }}>{title}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec sec-ivory">
        <div className="wrap">
          <div className="eyebrow-ink">Where it stands</div>
          <h2 className="serif" style={{ margin: "10px 0 18px" }}>What exists — and what does not, yet.</h2>
          <div className="grid aag2">
            <div style={{ ...box, borderTop: "4px solid #3f7d4e" }}>
              <div className="eyebrow-ink">Exists today</div>
              <ul style={{ margin: "10px 0 0", paddingLeft: 18, lineHeight: 1.8 }}>
                {EXISTS.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
            <div style={{ ...box, borderTop: "4px solid #b48a2f" }}>
              <div className="eyebrow-ink">Not yet</div>
              <ul style={{ margin: "10px 0 0", paddingLeft: 18, lineHeight: 1.8 }}>
                {NOT_YET.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
          </div>
          <p style={{ color: "var(--slate)", fontSize: 13, marginTop: 18, maxWidth: 760 }}>
            NAP is designed to work alongside the VA&apos;s Whole Health approach. The VA has not reviewed or
            endorsed NAP.
          </p>
          <div style={{ marginTop: 22, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="btn btn-ink" href="/framework">Read the documents →</Link>
            <Link className="btn btn-ghost" href="/where-it-stands" style={{ color: "var(--ink)", borderColor: "rgba(20,35,59,.3)" }}>The full status →</Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
