import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/universe/Hero";
import { Timeline, type Era } from "@/components/universe/Timeline";
import { Circle } from "@/components/universe/Circle";
import { Garden } from "@/components/universe/Garden";
import { Library, type Volume } from "@/components/universe/Library";
import { Fireflies } from "@/components/universe/Fireflies";
import { HEALERS, GRADE_TOTAL } from "@/lib/universe";
import { art } from "@/lib/universe-assets";
import { DOCS, CATEGORY_NAME, isDraft, type Category } from "@/lib/canon";

export const metadata = {
  title: "The Living Thread — Nutraceutical Assisted Programs",
  description:
    "Every healer pulled the same thread. 5,000 years of healing, one thread, and an open framework that grades what the evidence actually shows. Not medical advice.",
};

// The honest line, kept in step with /at-a-glance.
const EXISTS = [
  "Twelve founding documents, published as drafts and narrated",
  "184 ingredient–condition links graded for strength of evidence (graded in-house)",
  "An AI guide that answers from the graded evidence and routes any crisis to 988 or 911",
  "A drafted pilot protocol for veterans, using standard validated questionnaires",
];
const NOT_YET = [
  "Outcome data of its own. No one has been enrolled",
  "Independent review of the grades by a clinician, pharmacist, or attorney",
  "A registered pilot study",
  "A seated Standards Council. It has no members",
  "Any clinic or practitioner that has adopted NAP",
];

const CATS: Category[] = ["core", "governance", "clinical", "integrity"];

export default function Home() {
  const eras: Era[] = HEALERS.map((h) => ({ ...h, src: art(h.scene) ?? art(h.portrait) }));
  const portraits: Era[] = HEALERS.map((h) => ({ ...h, src: art(h.portrait) ?? art(h.scene) }));
  const volumes: Volume[] = DOCS.map((d) => ({ ...d, cover: art(`L${Number(d.num)}`), draft: isDraft(d) }));

  return (
    <div className="uv">
      <Nav overlay />
      <main>
        <Hero src={art("K1")} />

        <Timeline eras={eras} />

        <Circle healers={portraits} />

        <section className="turn" id="turn" aria-labelledby="turn-h">
          <Fireflies density={0.5} className="turn-ff" />
          <div className="u-wrap turn-in">
            <p className="turn-pre">Every healer passed on what they believed worked.</p>
            <h2 id="turn-h" className="turn-h">NAP adds one thing: we grade&nbsp;it.</h2>
            <p className="u-lede turn-lede">
              Willow, sweet wormwood and foxglove led to modern medicines only after someone isolated and
              tested what was in them. Most remedies were never tested that way. So every link in the NAP database carries an honest
              grade for how strongly research supports it, and where the answer is &ldquo;we don&apos;t know,&rdquo; it says so.
            </p>
          </div>

          <div className="u-wrap garden-wrap">
            <h3 className="garden-h">The evidence garden</h3>
            <p className="garden-sub">
              {GRADE_TOTAL} ingredient–condition links, graded so far. Taller plants mean stronger evidence. The number is
              how many links landed in each grade.
            </p>
            <Garden />
            <p className="garden-fine">
              Graded in-house, not yet independently reviewed by a clinician, pharmacist, or attorney. A grade describes
              research, not a promise that anything will work for you.
            </p>
            <div className="garden-cta">
              <Link className="btn btn-glass" href="/atlas/brain">Walk the full database</Link>
            </div>
          </div>
        </section>

        <section className="lib" id="library" aria-labelledby="lib-h">
          <div className="u-wrap">
            <h2 id="lib-h" className="u-h2">The Library.</h2>
            <p className="u-lede">
              Twelve founding documents hold the whole framework. Every one is here in full, and every one can be read
              aloud to you. Open any volume.
            </p>
            <ul className="lib-key" aria-label="Shelves">
              {CATS.map((c) => (
                <li key={c} className={`lib-key-${c}`}>{CATEGORY_NAME[c]}</li>
              ))}
            </ul>
            <Library volumes={volumes} />
            <p className="lib-more">
              <Link href="/at-a-glance">The whole framework on one page</Link>
              <Link href="/framework">Browse the shelves by theme</Link>
              <Link href="/glossary">Glossary</Link>
            </p>
          </div>
        </section>

        <section className="today" aria-labelledby="today-h">
          <div className="u-wrap">
            <h2 id="today-h" className="u-h2">The Circle today.</h2>
            <p className="u-lede">
              This story is still being written, and we&apos;d rather tell you exactly where it stands. NAP certifies no
              one and sells nothing.
            </p>
            <div className="today-grid">
              <div className="today-col today-yes">
                <h3>Rooted today</h3>
                <ul>{EXISTS.map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
              <div className="today-col today-not">
                <h3>Still seeds</h3>
                <ul>{NOT_YET.map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
            </div>
            <p className="today-fine">
              NAP is designed to work alongside the VA&apos;s Whole Health approach. The VA has not reviewed or endorsed
              NAP. <Link href="/where-it-stands">Read the full status</Link>
            </p>
          </div>
        </section>

        <section className="hands" aria-labelledby="hands-h">
          <svg className="hands-thread" viewBox="0 0 1200 200" preserveAspectRatio="none" aria-hidden="true">
            <path pathLength={1} d="M0 120 C 200 40 360 180 600 110 S 980 60 1200 120" />
          </svg>
          <div className="u-wrap hands-in">
            <h2 id="hands-h" className="hands-h">The thread is in your&nbsp;hands.</h2>
            <p className="u-lede">Pick it up wherever you like.</p>
            <ul className="hands-ways">
              <li>
                <Link href="/ask">
                  <span className="hw-t">Ask the guide</span>
                  <span className="hw-d">Plain answers grounded in the graded evidence.</span>
                </Link>
              </li>
              <li>
                <Link href="/framework">
                  <span className="hw-t">Read the framework</span>
                  <span className="hw-d">All twelve documents, in full, with narration.</span>
                </Link>
              </li>
              <li>
                <Link href="/founders">
                  <span className="hw-t">Join the build</span>
                  <span className="hw-d">Add your name. Every accepted change is credited to whoever brought it.</span>
                </Link>
              </li>
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
