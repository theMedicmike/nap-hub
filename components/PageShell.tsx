import type { ReactNode } from "react";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { Fireflies } from "./universe/Fireflies";

// The shell for NAP's reference pages (How we grade, Who governs NAP, Contact, Privacy,
// Accessibility, Changelog): the twilight opening, then one calm reading column.
export function PageShell({
  title, lede, aside, updated, children,
}: { title: ReactNode; lede: ReactNode; aside?: ReactNode; updated?: string; children: ReactNode }) {
  return (
    <div className="uv pg">
      <Nav />
      <main>
        <header className={`pgh${aside ? " pgh-split" : ""}`}>
          <Fireflies className="pgh-ff" density={0.35} />
          <div className="u-wrap pgh-in">
            <div className="pgh-copy">
              <h1 className="pgh-h1">{title}</h1>
              <p className="pgh-lede">{lede}</p>
              {updated && <p className="pgh-meta">Last updated {updated}</p>}
            </div>
            {aside && <div className="pgh-aside">{aside}</div>}
          </div>
        </header>
        <div className="pgb">{children}</div>
      </main>
      <Footer />
    </div>
  );
}

// One titled stretch of the reading column.
export function Sec({ id, title, children, wide = false }: { id?: string; title: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <section className={`pgs${wide ? " pgs-wide" : ""}`} id={id} aria-labelledby={id ? `${id}-h` : undefined}>
      <h2 className="pgs-h" id={id ? `${id}-h` : undefined}>{title}</h2>
      <div className="pgs-body">{children}</div>
    </section>
  );
}
