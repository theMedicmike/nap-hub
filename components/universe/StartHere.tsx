import Link from "next/link";

// Four doors into NAP, one per kind of visitor. Sits right under the hero so a person who came
// with a purpose can go straight there; the story below is for everyone who wants to wander.
const DOORS: { who: string; why: string; links: [string, string][] }[] = [
  {
    who: "You, or someone you care for",
    why: "Understand a health concern and what the research actually says, in plain words.",
    links: [
      ["/ask", "Ask the guide"],
      ["/atlas/brain", "Look up an ingredient"],
      ["/framework/veteran-health-specialty-track", "For veterans and families"],
    ],
  },
  {
    who: "Clinicians",
    why: "See the safety floor, the clinical tools, and how strong the evidence is behind each one.",
    links: [
      ["/framework/clinical-safety-and-practice-standards", "Safety and practice standards"],
      ["/framework/modalities-compendium", "The clinical tools"],
      ["/how-we-grade", "How a grade is decided"],
    ],
  },
  {
    who: "Researchers",
    why: "Check the grades, test the method, and see the gaps we have not closed.",
    links: [
      ["/framework/evidence-compendium", "The graded evidence"],
      ["/framework/known-limitations-and-roadmap", "Known limitations"],
      ["/framework/outcome-registry-framework", "How outcomes would be measured"],
    ],
  },
  {
    who: "Builders",
    why: "Shape the framework itself. Every accepted change is credited to whoever brought it.",
    links: [
      ["/shape", "Propose a change"],
      ["/founders#join", "Add your name"],
      ["/governance", "Who governs NAP"],
    ],
  },
];

export function StartHere() {
  return (
    <section className="start" id="start" aria-labelledby="start-h">
      <div className="u-wrap">
        <h2 id="start-h" className="start-h">Start where you are.</h2>
        <p className="start-lede">
          A system of medicine serves many people at once. Choose your way in, or keep scrolling for the story of
          where it all came from.
        </p>
        <ul className="start-doors">
          {DOORS.map((d) => (
            <li key={d.who} className="start-door">
              <h3 className="start-who">{d.who}</h3>
              <p className="start-why">{d.why}</p>
              <ul className="start-links">
                {d.links.map(([href, label]) => (
                  <li key={href}>
                    <Link href={href}>
                      {label}
                      <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
