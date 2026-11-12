import { Fireflies } from "./Fireflies";
import { PlantArt } from "./PlantArt";

// The opening: the Circle of healers around the glowing willow, drifting slowly, with the
// golden-green thread drawing itself up out of the roots.
export function Hero({ src }: { src: string | null }) {
  return (
    <header className="uh">
      <div className="uh-stage" aria-hidden={src ? undefined : true}>
        {src ? (
          <img
            className="uh-img"
            src={src}
            alt="Eleven healers from across five thousand years stand together around a glowing willow at dusk, its roots lit with a golden-green light."
            fetchPriority="high"
          />
        ) : (
          <div className="uh-img uh-fallback">
            <PlantArt plant="willow" className="uh-fallback-plant" />
          </div>
        )}
      <svg className="uh-thread" viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="uhg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f3e7a0" />
            <stop offset=".55" stopColor="#c9e07a" />
            <stop offset="1" stopColor="#9fd36e" />
          </linearGradient>
          <filter id="uhblur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" /></filter>
        </defs>
        <path className="uh-t uh-t-glow" filter="url(#uhblur)" pathLength={1} d="M662 268 C 640 340 700 392 664 452 S 548 560 604 624 S 760 662 700 700 S 610 740 640 760" />
        <path className="uh-t uh-t-core" pathLength={1} d="M662 268 C 640 340 700 392 664 452 S 548 560 604 624 S 760 662 700 700 S 610 740 640 760" />
        <path className="uh-t uh-t-fine" pathLength={1} d="M664 452 C 760 470 840 520 900 600 S 1010 660 1100 640" />
        <path className="uh-t uh-t-fine uh-t-late" pathLength={1} d="M604 624 C 520 600 420 610 330 660 S 200 690 140 650" />
      </svg>
      </div>
      <Fireflies className="uh-ff" />
      <div className="uh-shade" />
      <div className="uh-copy">
        <p className="uh-kicker">Nutraceutical Assisted Programs</p>
        <h1 className="uh-h1">Every healer pulled the same&nbsp;thread.</h1>
        <p className="uh-sub">5,000 years of healing. One thread. NAP grades it.</p>
        <div className="uh-cta">
          <a className="btn btn-thread" href="#circle">Meet the Circle</a>
          <a className="btn btn-glass" href="#library">Enter the Library</a>
        </div>
      </div>
      <a className="uh-scroll" href="#thread" aria-label="Follow the thread through history">
        <span>Follow the thread</span>
        <svg viewBox="0 0 20 40" aria-hidden="true"><path d="M10 2 C 4 12 16 20 10 30 M5 25 l5 8 5-8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
      </a>
    </header>
  );
}
