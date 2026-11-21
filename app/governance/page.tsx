import Link from "next/link";
import { PageShell, Sec } from "@/components/PageShell";
import "../pages.css";

export const metadata = {
  title: "Who governs NAP — NAP",
  description:
    "Who runs NAP today, how it is paid for, the conflict-of-interest rules, and the fifteen-seat council designed so no single nation, tradition, or company can control it.",
};

// The fifteen voting seats, as designated in the draft Standards Council Charter, Article III §3.2.
const SEATS: { name: string; n: number }[] = [
  { name: "Ayurvedic tradition", n: 1 },
  { name: "Traditional Chinese medicine", n: 1 },
  { name: "Naturopathic medicine", n: 1 },
  { name: "Functional medicine", n: 1 },
  { name: "Western clinical herbalism", n: 1 },
  { name: "Indigenous healing traditions", n: 1 },
  { name: "Environmental medicine and toxicology", n: 1 },
  { name: "Somatic and contemplative traditions", n: 1 },
  { name: "Integrative endocrine practice", n: 1 },
  { name: "Academic research", n: 1 },
  { name: "Clinical practice, mixed tradition", n: 2 },
  { name: "Patient advocacy", n: 1 },
  { name: "Ethics and governance", n: 1 },
  { name: "At large", n: 1 },
];

function CouncilRing() {
  const outer = 15, inner = 3;
  const pt = (i: number, total: number, r: number) => {
    const a = (i / total) * Math.PI * 2 - Math.PI / 2;
    return [100 + r * Math.cos(a), 100 + r * Math.sin(a)];
  };
  return (
    <figure className="cr" aria-label="The planned council: fifteen voting seats and three advisory seats, none yet filled.">
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <circle className="cr-orbit" cx="100" cy="100" r="86" />
        <circle className="cr-orbit" cx="100" cy="100" r="58" />
        <path className="cr-thread" pathLength={1} d="M100 196 C 92 170 108 150 100 128 S 96 116 100 110" />
        {Array.from({ length: outer }, (_, i) => {
          const [x, y] = pt(i, outer, 86);
          return <circle key={`o${i}`} className="cr-seat" cx={x} cy={y} r="6.2" />;
        })}
        {Array.from({ length: inner }, (_, i) => {
          const [x, y] = pt(i + 0.5, inner, 58);
          return <circle key={`i${i}`} className="cr-adv" cx={x} cy={y} r="4.2" />;
        })}
      </svg>
      <figcaption className="cr-c">
        <b>0 of 15</b>
        <span>voting seats filled.<br />The council is in formation.</span>
      </figcaption>
    </figure>
  );
}

export default function Governance() {
  return (
    <PageShell
      title="Who governs NAP."
      lede={
        <>
          A system of medicine for the whole world cannot belong to one person, one country, or one company. Here is who
          runs NAP today, how it is paid for, and the council designed to take it over.
        </>
      }
      updated="November 21, 2026"
      aside={<CouncilRing />}
    >
      <Sec id="today" title="Who runs it today.">
        <p>
          NAP is operated by <strong>Operation Whole Health</strong>, a Nevada 501(c)(3) nonprofit, and directed by its
          founder, Michael Andrew Feller Jones, who serves as Chair (designate) of the NAP Standards Council while it is
          in formation.
        </p>
        <p>
          The council has no seated members and its charter has not been ratified. Until it is, decisions rest with the
          founder and the nonprofit. We would rather say that plainly than imply a body that does not exist yet.
        </p>
      </Sec>

      <Sec id="money" title="How it is paid for.">
        <dl className="pg-rows">
          <div className="pg-row"><dt>No fees</dt><dd>Reading, listening, asking, and contributing are free.</dd></div>
          <div className="pg-row"><dt>No investors</dt><dd>NAP takes no investment and has no owners to answer to.</dd></div>
          <div className="pg-row"><dt>Nothing for sale</dt><dd>NAP sells nothing and names no products. No company can pay for a grade.</dd></div>
          <div className="pg-row"><dt>No credentials</dt><dd>NAP certifies no one and accredits no clinic. Anyone claiming a NAP credential is not speaking for NAP.</dd></div>
        </dl>
      </Sec>

      <Sec id="conflicts" title="Conflicts of interest.">
        <p>
          <strong>The founder&apos;s disclosure.</strong> The founder directs Operation Whole Health and holds no other
          company or commercial interest. Where the nonprofit uses natural health products in its programs, it buys them
          from a third-party manufacturer for the veterans it serves. The founder receives no compensation.
        </p>
        <p>
          <strong>The rules the council will run on.</strong> Under the draft charter, every member files a disclosure
          each year and summaries are published. Members step out of any decision that touches their own interests. Once
          the council is seated, the founder becomes a non-voting member, must disclose every relevant business tie, and
          can never be given preferential treatment within NAP&apos;s standards.
        </p>
        <p className="pg-fine">
          Source: <Link href="/framework/standards-council-charter">Standards Council Charter</Link>, Article VII
          (draft, not yet ratified).
        </p>
      </Sec>

      <Sec id="council" title="The council it is built to become." wide>
        <p style={{ maxWidth: 680 }}>
          Fifteen voting seats, chosen so that the world&apos;s traditions, researchers, clinicians, and patients all
          have a voice and none can outvote the rest. Three advisory seats sit alongside: legal counsel, a financial
          officer, and the founder, who will not vote.
        </p>
        <ul className="seats" aria-label="The fifteen voting seats">
          {SEATS.map((s) => (
            <li key={s.name}>{s.name}<span>{s.n === 1 ? "1 seat" : `${s.n} seats`}</span></li>
          ))}
        </ul>
      </Sec>

      <Sec id="balance" title="No one gets to hold the thread alone.">
        <ul>
          <li>No single nation may hold more than four voting seats.</li>
          <li>No single continent may hold more than six.</li>
          <li>Every populated continent must hold at least one seat at all times.</li>
          <li>Indigenous seats may be filled from any region.</li>
        </ul>
        <p>
          Want to help seat it? Clinicians, researchers, traditional practitioners, and patient advocates can{" "}
          <Link href="/founders#join">add their name</Link> or <Link href="/shape">propose a change to the charter</Link>.
        </p>
      </Sec>
    </PageShell>
  );
}
