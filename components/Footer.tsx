import Link from "next/link";
import { Seal } from "./Seal";
import { NAV_GROUPS, LEGAL, type NavItem } from "@/lib/site-map";

function FLink({ it }: { it: NavItem }) {
  return it.href
    ? <li><Link href={it.href}>{it.label}</Link></li>
    : <li><span className="soon">{it.label} <em>soon</em></span></li>;
}

export function Footer() {
  return (
    <footer className="foot">
      <div className="foot-crisis">
        <p>
          In crisis or worried about someone? Call or text <a href="tel:988">988</a>, then press 1 for the Veterans
          Crisis Line. In an emergency, call <a href="tel:911">911</a>.
        </p>
      </div>
      <div className="foot-map">
        <div className="foot-brand">
          <Link className="org" href="/"><Seal size={26} /><span>Nutraceutical Assisted Programs</span></Link>
          <p>An open evidence standard for natural care, built in public. A project of Operation Whole Health.</p>
        </div>
        {NAV_GROUPS.map((g) => (
          <div key={g.label} className="foot-col">
            <h2>{g.label}</h2>
            <ul>{g.items.map((it) => <FLink key={it.label} it={it} />)}</ul>
          </div>
        ))}
        <div className="foot-col">
          <h2>Take part</h2>
          <ul>
            <li><Link href="/ask">Ask the guide</Link></li>
            <li><Link href="/shape">Join the build</Link></li>
          </ul>
        </div>
      </div>
      <div className="foot-in">
        <div className="disc">
          An open, early-stage framework offered for review and discussion — not medical advice.
          These statements have not been evaluated by the Food and Drug Administration. Nothing here
          is intended to diagnose, treat, cure, or prevent any disease. Always work with a licensed
          clinician before making any change to your care or medication.
          <span className="foot-art">The paintings on this site are AI-generated illustrations; the people in them are fictional.</span>
        </div>
        <ul className="foot-legal">{LEGAL.map((it) => <FLink key={it.label} it={it} />)}</ul>
      </div>
    </footer>
  );
}
