import Link from "next/link";
import { Seal } from "./Seal";

export function Nav() {
  return (
    <nav className="nav">
      <div className="nav-in">
        <Link className="brand" href="/">
          <Seal size={30} />
          <span>Nutraceutical Assisted Programs</span>
        </Link>
        <div className="nav-links">
          <Link href="/ask">Ask</Link>
          <Link href="/framework">The framework</Link>
          <Link href="/atlas">The Atlas</Link>
          <Link href="/founders">Founders</Link>
          <Link className="btn btn-gold sm" href="/shape">Join the build</Link>
        </div>
      </div>
    </nav>
  );
}
