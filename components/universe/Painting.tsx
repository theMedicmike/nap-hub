import type { PlantKey } from "@/lib/universe";
import { PlantArt } from "./PlantArt";

// Shows the real painting when the file exists; otherwise a painted-feeling placeholder in the
// same world: a dusk sky in the healer's palette, a low sun, layered hills in atmospheric haze,
// a willow branch drifting in from the corner, canvas grain, and their plant drawn as a
// luminous botanical plate.
export function Painting({
  src, alt, focal = 50, sky, plant, name, label = true, className = "", eager = false,
}: {
  src: string | null;
  alt: string;
  focal?: number;
  sky: [string, string, string];
  plant: PlantKey;
  name: string;
  label?: boolean;
  className?: string;
  eager?: boolean;
}) {
  if (src) {
    return (
      <img
        className={`pt-img ${className}`}
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        style={{ objectPosition: `${focal}% 40%` }}
      />
    );
  }
  const [hi, glow, ground] = sky;
  return (
    <div
      className={`pt-ph ${className}`}
      role="img"
      aria-label={`${alt} (painting coming soon)`}
      style={{
        ["--sky" as string]: hi,
        ["--glow" as string]: glow,
        ["--ground" as string]: ground,
        background: `radial-gradient(90% 55% at 50% 72%, ${glow} 0%, transparent 62%),
          linear-gradient(180deg, ${hi} 0%, ${hi} 22%, color-mix(in oklab, ${hi} 45%, ${glow}) 58%, ${glow} 76%, ${ground} 100%)`,
      }}
    >
      <span className="pt-stars" aria-hidden="true" />
      <span className="pt-sun" aria-hidden="true" />
      <svg className="pt-hills" viewBox="0 0 400 140" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 64 C 40 40 80 56 120 42 C 170 24 210 50 250 38 C 300 22 350 48 400 36 V140 H0Z" fill={`color-mix(in oklab, ${hi} 55%, ${glow})`} opacity=".55" />
        <path d="M0 84 C 60 62 110 82 170 70 C 230 58 280 80 340 66 C 370 60 390 64 400 68 V140 H0Z" fill={`color-mix(in oklab, ${ground} 60%, ${hi})`} opacity=".85" />
        <path d="M0 104 C 70 88 140 108 210 96 C 280 84 340 104 400 94 V140 H0Z" fill={ground} />
      </svg>
      <span className="pt-mist" aria-hidden="true" />
      <svg className="pt-halo" viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="100" cy="100" r="92" /><circle cx="100" cy="100" r="78" /><circle cx="100" cy="100" r="60" />
      </svg>
      <PlantArt plant={plant} className="pt-plant" />
      <svg className="pt-willow" viewBox="0 0 200 220" aria-hidden="true">
        <path d="M200 6 C 150 4 110 14 70 34" />
        {[[176, 8], [150, 10], [124, 16], [100, 24], [80, 32]].map(([x, y], i) => (
          <g key={i}>
            <path d={`M${x} ${y} C ${x - 6} ${y + 50} ${x + 4} ${y + 110} ${x - 2} ${y + 150 - i * 18}`} />
            {Array.from({ length: 7 - i }, (_, j) => (
              <path key={j} className="pt-wl" transform={`translate(${x - 2 + (j % 2 ? 4 : -4)} ${y + 18 + j * 19}) rotate(${j % 2 ? 160 : 200})`} d="M0 0 C 3 -5 3 -12 0 -17 C -3 -12 -3 -5 0 0Z" />
            ))}
          </g>
        ))}
      </svg>
      <span className="pt-grain" aria-hidden="true" />
      {label && <span className="pt-name">{name}</span>}
    </div>
  );
}
