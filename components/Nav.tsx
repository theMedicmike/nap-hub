import Link from "next/link";
import { Seal } from "./Seal";

// overlay: floats over a full-bleed opening image (the homepage) instead of sitting on a bar.
export function Nav({ overlay = false }: { overlay?: boolean }) {
  return (
    <nav className={`nav${overlay ? " nav-over" : ""}`} aria-label="Main">
      <div className="nav-in">
        <Link className="brand" href="/">
          <Seal size={30} />
          <span>
            <span className="brand-full">Nutraceutical Assisted Programs</span>
            <span className="brand-short">NAP</span>
          </span>
        </Link>
        <div className="nav-links">
          <Link href="/ask">Ask</Link>
          <Link className="nav-keep" href="/traditions">Traditions</Link>
          <Link href="/framework">The framework</Link>
          <Link href="/atlas/brain">The database</Link>
          <Link href="/founders">Founders</Link>
          <Link className="btn btn-thread sm" href="/shape">Join the build</Link>
        </div>
      </div>
    </nav>
  );
}
