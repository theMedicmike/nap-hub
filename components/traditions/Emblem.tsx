import { PlantArt } from "@/components/universe/PlantArt";
import type { PlantKey } from "@/lib/universe";
import type { Emblem as EmblemKey } from "@/lib/traditions";

// Each tradition's emblem: the universe's botanical plates where one fits, plus four drawn
// objects of the written record (palm leaf, papyrus scroll, clay tablet, codex). Same 200 x 240
// box and colour conventions as PlantArt: line = currentColor, fills from --pa-leaf / --pa-bloom.
const LINE = "currentColor";
const LEAF = "var(--pa-leaf, #9cc46a)";
const BLOOM = "var(--pa-bloom, #e8c46a)";

function PalmLeaf() {
  // A bundle of palm-leaf manuscript strips, bound by a cord through two holes.
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(0 ${70 + i * 34}) rotate(${-8 + i * 6} 100 30)`}>
          <rect x="22" y="14" width="156" height="30" rx="14" fill={LEAF} fillOpacity=".35" stroke={LINE} strokeWidth="1.6" />
          {[0, 1, 2].map((l) => <path key={l} d={`M38 ${23 + l * 7} H ${150 - l * 14}`} stroke={LINE} strokeWidth=".9" strokeOpacity=".7" strokeDasharray="5 3 9 3" />)}
          <circle cx="62" cy="29" r="3" fill="none" stroke={LINE} strokeWidth="1.2" />
          <circle cx="138" cy="29" r="3" fill="none" stroke={LINE} strokeWidth="1.2" />
        </g>
      ))}
      <path d="M62 60 C 50 120 74 170 60 214 M138 60 C 150 120 126 170 140 214" stroke={BLOOM} strokeWidth="1.8" fill="none" />
    </g>
  );
}

function Scroll() {
  return (
    <g>
      <rect x="44" y="52" width="112" height="140" fill={BLOOM} fillOpacity=".22" stroke={LINE} strokeWidth="1.6" />
      <rect x="34" y="40" width="132" height="18" rx="9" fill={BLOOM} fillOpacity=".4" stroke={LINE} strokeWidth="1.6" />
      <rect x="34" y="186" width="132" height="18" rx="9" fill={BLOOM} fillOpacity=".4" stroke={LINE} strokeWidth="1.6" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((l) => (
        <path key={l} d={`M58 ${74 + l * 13} H ${142 - (l % 3) * 12}`} stroke={LINE} strokeWidth="1" strokeOpacity=".75" strokeDasharray={l % 2 ? "8 4 3 4" : "4 3 10 3"} />
      ))}
      <path d="M150 196 C 168 210 172 226 160 236" stroke={LEAF} strokeWidth="2" fill="none" />
    </g>
  );
}

function ClayTablet() {
  const rows = [70, 92, 114, 136, 158, 180];
  return (
    <g>
      <path d="M48 46 C 46 40 52 36 60 36 H 140 C 150 36 156 42 154 50 L 160 196 C 161 206 154 212 144 212 H 58 C 48 212 42 206 43 196 Z" fill={BLOOM} fillOpacity=".28" stroke={LINE} strokeWidth="1.8" />
      {rows.map((y, r) => (
        <g key={r}>
          <path d={`M56 ${y + 10} H 148`} stroke={LINE} strokeWidth=".6" strokeOpacity=".4" />
          {Array.from({ length: 6 - (r % 2) }, (_, i) => {
            const x = 62 + i * 15 + (r % 2) * 7;
            return <path key={i} d={`M${x} ${y} l 6 3 l -6 3 z M${x + 6} ${y + 3} h 5`} fill={LINE} fillOpacity=".7" stroke={LINE} strokeWidth=".8" />;
          })}
        </g>
      ))}
    </g>
  );
}

function Codex() {
  return (
    <g>
      <path d="M100 66 C 76 52 46 50 26 56 V 196 C 46 190 76 192 100 206 Z" fill={BLOOM} fillOpacity=".2" stroke={LINE} strokeWidth="1.6" />
      <path d="M100 66 C 124 52 154 50 174 56 V 196 C 154 190 124 192 100 206 Z" fill={BLOOM} fillOpacity=".2" stroke={LINE} strokeWidth="1.6" />
      {[0, 1, 2, 3, 4, 5, 6].map((l) => (
        <g key={l}>
          <path d={`M38 ${82 + l * 15} C 58 ${78 + l * 15} 76 ${80 + l * 15} 90 ${86 + l * 15}`} stroke={LINE} strokeWidth=".9" strokeOpacity=".7" fill="none" />
          <path d={`M110 ${86 + l * 15} C 124 ${80 + l * 15} 142 ${78 + l * 15} 162 ${82 + l * 15}`} stroke={LINE} strokeWidth=".9" strokeOpacity=".7" fill="none" />
        </g>
      ))}
      <path d="M100 206 C 98 222 104 230 100 240" stroke={LEAF} strokeWidth="2" fill="none" />
      <path d="M100 40 C 94 26 100 14 112 8 C 112 22 108 32 100 40Z" fill={LEAF} stroke={LINE} strokeWidth=".8" />
    </g>
  );
}

const DRAWN: Partial<Record<EmblemKey, () => React.ReactElement>> = { palmleaf: PalmLeaf, scroll: Scroll, claytablet: ClayTablet, codex: Codex };

export function Emblem({ emblem, className }: { emblem: EmblemKey; className?: string }) {
  const D = DRAWN[emblem];
  if (!D) return <PlantArt plant={emblem as PlantKey} className={className} />;
  return (
    <svg className={className} viewBox="0 0 200 240" aria-hidden="true" focusable="false">
      <D />
    </svg>
  );
}
