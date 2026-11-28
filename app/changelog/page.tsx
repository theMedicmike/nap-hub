import Link from "next/link";
import { PageShell, Sec } from "@/components/PageShell";
import "../pages.css";

export const metadata = {
  title: "Changelog — NAP",
  description: "Every meaningful change to NAP, including corrections. A standard that hides its corrections cannot be trusted.",
};

type Entry = { date: string; title: string; body: string; correction?: boolean; now?: boolean };

// Newest first. Corrections are tagged, never softened or removed.
const ENTRIES: Entry[] = [
  {
    date: "Nov 27, 2026", now: true,
    title: "You can now tell NAP if something hurt you",
    body: "A new page, Report a harm, lets anyone say that something they tried hurt them; a person will read it, and the privacy notice now says what is kept. The guide names a pharmacist or prescriber whenever it names a supplement. Behind the guide, the population and medicine-class warnings inside the 184 safety notes are being drawn out into fields a clinician or pharmacist can approve one by one; none reaches a visitor until it is approved.",
  },
  {
    date: "Nov 21, 2026",
    title: "Clearer ways in: new menu and six new pages",
    body: "A grouped menu that works on phones, a full footer, and new pages on how grades are decided, who governs NAP, contact, privacy, accessibility, and this changelog. AI-made paintings are now disclosed once, quietly, at the foot of every page.",
  },
  {
    date: "Nov 19, 2026", correction: true,
    title: "Seven credential contradictions removed",
    body: "The Library, reader, database, and founders pages were redesigned. Seven places in the founding documents still implied credentials or a working outcome registry; they were corrected, and the audio narration was re-recorded to match.",
  },
  {
    date: "Nov 12, 2026",
    title: "The Living Thread and The Great Traditions",
    body: "A new homepage telling 5,000 years of healing as one story, and fifteen chapters on the world's systems of medicine with a family tree of how they shaped each other. A dead source link in chapter 15 was replaced.",
  },
  {
    date: "Nov 10, 2026", correction: true,
    title: "Three framework conflicts fixed",
    body: "An overstated evidence claim, a “Natural First” line that contradicted “alongside, not instead of,” and leftover credential language were corrected. The guide now carries the full safety note for every ingredient it discusses.",
  },
  {
    date: "Oct 6, 2026", correction: true,
    title: "Truth sweep across the whole site",
    body: "Every claim of accreditation, credentials, centers, or investment was removed. The site now says plainly that NAP is a standard in formation, adopted by no one yet, and that its grading has not been independently reviewed.",
  },
  {
    date: "Sep 9, 2026", correction: true,
    title: "Manifesto contradiction fixed",
    body: "The Manifesto endorsed testing methods that another founding document rules out. It was corrected to match.",
  },
  {
    date: "Sep 8, 2026", correction: true,
    title: "Final verification pass and founder disclosure corrected",
    body: "Nine remaining claims were checked against primary sources and fixed. The founder's conflict-of-interest statement was corrected to the verified facts.",
  },
  {
    date: "Aug 20, 2026", correction: true,
    title: "Statistics and a credential corrected",
    body: "Six statistics were corrected against their original sources, and the founder's credential was corrected to holistic wellness practitioner.",
  },
  {
    date: "Aug 19, 2026", correction: true,
    title: "Full site audit; three documents pulled back",
    body: "An audit led to 151 wording fixes, an honest evidence badge, the FDA disclaimer, and removal of placeholder founders. Three core documents were withdrawn to draft, rebuilt on verified sources, and returned.",
  },
  {
    date: "Aug 16, 2026",
    title: "Listen to every founding document",
    body: "All twelve founding documents gained full audio narration.",
  },
  {
    date: "Jul 7, 2026",
    title: "The database and ingredient pages",
    body: "A searchable database of graded links beside a traditional record of more than 13,000 plants, with a page for every ingredient.",
  },
  {
    date: "Jul 4, 2026",
    title: "Ask the guide",
    body: "A voice-capable guide that answers from the graded evidence and routes anyone in crisis to the Veterans Crisis Line first.",
  },
  {
    date: "Jul 1, 2026",
    title: "NAP goes public",
    body: "The first version of the site and the founding documents, offered for review.",
  },
];

export default function Changelog() {
  return (
    <PageShell
      title="Every change, in the open."
      lede={
        <>
          Systems of medicine improve by admitting what they got wrong. This is the record of what changed on NAP and
          when, corrections included. Nothing here is quietly edited away.
        </>
      }
    >
      <Sec id="log" title="The record.">
        <ol className="cl">
          {ENTRIES.map((e) => (
            <li key={e.date + e.title} className={`cl-e${e.now ? " cl-now" : ""}`}>
              <p className="cl-d">{e.date}</p>
              <div>
                <h3 className="cl-t">{e.title}{e.correction && <span className="cl-tag">Correction</span>}</h3>
                <p className="cl-b">{e.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Sec>
      <Sec id="spot" title="Spot something wrong?">
        <p>
          Every correction above started with someone noticing. If you find an error, <Link href="/shape">bring it to the
          build</Link> or <Link href="/contact">tell us</Link>.
        </p>
      </Sec>
    </PageShell>
  );
}
