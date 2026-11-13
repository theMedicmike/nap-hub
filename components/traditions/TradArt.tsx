import type { Emblem as EmblemKey } from "@/lib/traditions";
import { Emblem } from "./Emblem";

// A tradition's picture: the real universe painting where one fits the chapter, otherwise a
// painted dusk landscape in that tradition's own colours with its emblem glowing at the centre.
// Decorative: the chapter title always carries the meaning.
export function TradArt({
  src, sky, emblem, className = "", eager = false, focal = 50,
}: { src: string | null; sky: [string, string, string]; emblem: EmblemKey; className?: string; eager?: boolean; focal?: number }) {
  if (src) {
    return (
      <img className={`pt-img ${className}`} src={src} alt="" loading={eager ? "eager" : "lazy"} decoding="async" style={{ objectPosition: `${focal}% 40%` }} />
    );
  }
  const [hi, glow, ground] = sky;
  return (
    <div
      className={`pt-ph ${className}`}
      aria-hidden="true"
      style={{
        ["--glow" as string]: glow,
        background: `radial-gradient(90% 55% at 50% 72%, ${glow} 0%, transparent 62%),
          linear-gradient(180deg, ${hi} 0%, ${hi} 22%, color-mix(in oklab, ${hi} 45%, ${glow}) 58%, ${glow} 76%, ${ground} 100%)`,
      }}
    >
      <span className="pt-stars" />
      <span className="pt-sun" />
      <svg className="pt-hills" viewBox="0 0 400 140" preserveAspectRatio="none">
        <path d="M0 64 C 40 40 80 56 120 42 C 170 24 210 50 250 38 C 300 22 350 48 400 36 V140 H0Z" fill={`color-mix(in oklab, ${hi} 55%, ${glow})`} opacity=".55" />
        <path d="M0 84 C 60 62 110 82 170 70 C 230 58 280 80 340 66 C 370 60 390 64 400 68 V140 H0Z" fill={`color-mix(in oklab, ${ground} 60%, ${hi})`} opacity=".85" />
        <path d="M0 104 C 70 88 140 108 210 96 C 280 84 340 104 400 94 V140 H0Z" fill={ground} />
      </svg>
      <span className="pt-mist" />
      <svg className="pt-halo" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="92" /><circle cx="100" cy="100" r="78" /><circle cx="100" cy="100" r="60" />
      </svg>
      <Emblem emblem={emblem} className="pt-plant" />
      <span className="pt-grain" />
    </div>
  );
}
