import type { PlantKey } from "@/lib/universe";

// Hand-drawn-feeling botanical emblems for each healer's plant. Pure SVG, no external art.
// Drawn in a 200 x 240 box. Colours come from currentColor (line) + CSS vars (leaf / bloom).

const LEAF = "var(--pa-leaf, #9cc46a)";
const LINE = "currentColor";
const BLOOM = "var(--pa-bloom, #e8c46a)";

function Leaf({ x, y, r, len = 34, w = 9, fill = LEAF }: { x: number; y: number; r: number; len?: number; w?: number; fill?: string }) {
  return (
    <path
      transform={`translate(${x} ${y}) rotate(${r})`}
      d={`M0 0 C ${w} ${-len * 0.3} ${w} ${-len * 0.7} 0 ${-len} C ${-w} ${-len * 0.7} ${-w} ${-len * 0.3} 0 0 Z`}
      fill={fill}
      stroke={LINE}
      strokeWidth="0.8"
      strokeOpacity=".55"
    />
  );
}

function Willow() {
  const leaves = [];
  for (let s = 0; s < 4; s++) {
    const x0 = 40 + s * 38;
    for (let i = 0; i < 7; i++) {
      leaves.push(<Leaf key={`${s}-${i}`} x={x0 + i * 2 + (i % 2 ? 6 : -6)} y={70 + i * 22} r={i % 2 ? 160 : 200} len={30} w={4.5} />);
    }
  }
  return (
    <g>
      <path d="M20 40 C 70 20 130 20 185 44" stroke={LINE} strokeWidth="3" fill="none" />
      {[40, 78, 116, 154].map((x, s) => (
        <path key={s} d={`M${x} ${30 + (s === 0 || s === 3 ? 6 : 0)} C ${x - 6} 90 ${x + 8} 150 ${x + 4} 222`} stroke={LINE} strokeWidth="1.4" fill="none" />
      ))}
      {leaves}
    </g>
  );
}

function Turmeric() {
  return (
    <g>
      <path d="M100 150 C 96 110 98 70 104 20" stroke={LINE} strokeWidth="2" fill="none" />
      <Leaf x={102} y={150} r={-18} len={120} w={28} />
      <Leaf x={100} y={150} r={22} len={100} w={24} />
      <g fill="#d99a3a" stroke={LINE} strokeWidth="1.2">
        <path d="M60 180 C 60 162 88 158 100 166 C 120 156 150 160 150 178 C 168 182 170 202 150 204 C 138 214 110 210 100 204 C 84 214 52 210 50 196 C 40 192 46 178 60 180 Z" />
        <ellipse cx="160" cy="196" rx="16" ry="9" transform="rotate(-20 160 196)" />
        <ellipse cx="44" cy="190" rx="14" ry="8" transform="rotate(25 44 190)" />
      </g>
      <g stroke={LINE} strokeWidth=".8" opacity=".6">
        <path d="M70 186 h10 M96 184 h12 M122 182 h10 M140 190 h8" />
      </g>
    </g>
  );
}

function Wormwood() {
  const fronds = [];
  for (let i = 0; i < 9; i++) {
    const y = 40 + i * 20;
    const side = i % 2 ? 1 : -1;
    fronds.push(
      <g key={i}>
        <path d={`M100 ${y} q ${side * 30} -6 ${side * 52} -22`} stroke={LINE} strokeWidth="1.2" fill="none" />
        {[0.3, 0.55, 0.8].map((t, j) => (
          <Leaf key={j} x={100 + side * 52 * t} y={y - 22 * t * t} r={side * (50 + j * 12)} len={14} w={4} />
        ))}
      </g>
    );
  }
  return (
    <g>
      <path d="M100 228 C 98 170 102 90 100 22" stroke={LINE} strokeWidth="2.2" fill="none" />
      {fronds}
    </g>
  );
}

function Jar() {
  return (
    <g>
      <Leaf x={86} y={70} r={-30} len={50} w={10} />
      <Leaf x={112} y={70} r={26} len={56} w={11} />
      <Leaf x={100} y={70} r={0} len={60} w={9} />
      <path d="M70 70 h60 v14 c 22 10 30 40 26 80 c -4 40 -24 60 -56 60 c -32 0 -52 -20 -56 -60 c -4 -40 4 -70 26 -80 z" fill="#2c5a8a" stroke={LINE} strokeWidth="1.6" />
      <rect x="66" y="62" width="68" height="12" rx="3" fill="#20406a" stroke={LINE} strokeWidth="1.2" />
      <path d="M60 140 c 20 -14 60 -14 80 0" stroke="#f1e6cf" strokeWidth="2" fill="none" opacity=".75" />
      <path d="M58 170 c 22 12 62 12 84 0" stroke="#f1e6cf" strokeWidth="2" fill="none" opacity=".75" />
      <circle cx="100" cy="156" r="10" fill="none" stroke="#f1e6cf" strokeWidth="1.6" opacity=".8" />
    </g>
  );
}

function Basket() {
  return (
    <g>
      {[60, 78, 96, 114, 132, 148].map((x, i) => (
        <g key={i}>
          <path d={`M${x} 130 C ${x - 4} 100 ${x + 6} 80 ${x + (i % 2 ? 10 : -8)} 54`} stroke={LINE} strokeWidth="1.2" fill="none" />
          <Leaf x={x + (i % 2 ? 6 : -4)} y={96} r={i % 2 ? 30 : -30} len={22} w={6} />
          <circle cx={x + (i % 2 ? 10 : -8)} cy={52} r={5} fill={i % 3 === 0 ? "#b79ad8" : BLOOM} stroke={LINE} strokeWidth=".6" />
        </g>
      ))}
      <path d="M40 126 h120 l-14 84 h-92 z" fill="#8a6234" stroke={LINE} strokeWidth="1.6" />
      <g stroke="#c89a5a" strokeWidth="1.4" fill="none">
        <path d="M44 146 h112 M48 166 h104 M52 186 h96" />
        {[60, 80, 100, 120, 140].map((x) => <path key={x} d={`M${x} 126 l -${(x - 100) / -12} 84`} />)}
      </g>
      <path d="M52 128 C 60 60 140 60 148 128" stroke="#8a6234" strokeWidth="5" fill="none" />
    </g>
  );
}

function Cinchona() {
  return (
    <g>
      <path d="M100 226 C 104 170 94 110 100 30" stroke={LINE} strokeWidth="2" fill="none" />
      <Leaf x={100} y={110} r={-55} len={70} w={22} />
      <Leaf x={100} y={90} r={50} len={64} w={20} />
      <Leaf x={100} y={60} r={-35} len={44} w={14} />
      <g fill="#e7a3b4" stroke={LINE} strokeWidth=".5">
        {[[92, 34], [104, 28], [112, 38], [98, 22], [86, 26]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="5" />)}
      </g>
      <g fill="#9a5a34" stroke={LINE} strokeWidth="1.2">
        <path d="M36 200 c 0 -12 34 -16 46 -6 c -6 10 -40 16 -46 6 z" />
        <path d="M120 206 c 4 -12 40 -12 46 0 c -8 10 -40 10 -46 0 z" />
        <path d="M56 218 c 6 -8 36 -8 44 0 c -8 8 -36 8 -44 0 z" />
      </g>
    </g>
  );
}

function Foxglove() {
  const bells = [];
  for (let i = 0; i < 9; i++) {
    const y = 46 + i * 17;
    const side = i % 2 ? 1 : -1;
    bells.push(
      <path key={i} transform={`translate(${100 + side * 6} ${y}) rotate(${side * 18})`} d="M0 0 c 10 0 14 6 14 22 c -4 4 -24 4 -28 0 c 0 -16 4 -22 14 -22 z" fill="#c779a8" stroke={LINE} strokeWidth=".8" />
    );
  }
  return (
    <g>
      <path d="M100 230 C 98 160 102 80 100 24" stroke={LINE} strokeWidth="2" fill="none" />
      <Leaf x={100} y={222} r={-60} len={70} w={18} />
      <Leaf x={100} y={222} r={60} len={66} w={17} />
      <Leaf x={100} y={210} r={-20} len={40} w={12} />
      {bells}
      {[30, 38].map((y, i) => <circle key={i} cx={100} cy={y} r="3" fill="#b8d080" />)}
    </g>
  );
}

function Periwinkle() {
  const flower = (cx: number, cy: number, s: number, key: string) => (
    <g key={key} transform={`translate(${cx} ${cy}) scale(${s})`}>
      {[0, 72, 144, 216, 288].map((r) => (
        <path key={r} transform={`rotate(${r})`} d="M0 0 C 10 -6 18 -20 6 -30 C -2 -26 -8 -14 0 0 Z" fill="#e7a6c6" stroke={LINE} strokeWidth=".6" />
      ))}
      <circle r="4" fill="#b83a6e" />
    </g>
  );
  return (
    <g>
      <path d="M100 230 C 96 190 106 150 100 110" stroke={LINE} strokeWidth="2" fill="none" />
      <path d="M100 170 C 80 150 70 130 64 106" stroke={LINE} strokeWidth="1.4" fill="none" />
      <path d="M100 160 C 120 140 134 124 140 96" stroke={LINE} strokeWidth="1.4" fill="none" />
      <Leaf x={100} y={200} r={-70} len={46} w={14} />
      <Leaf x={100} y={190} r={70} len={46} w={14} />
      <Leaf x={100} y={150} r={-40} len={34} w={10} />
      {flower(100, 100, 1.4, "a")}
      {flower(62, 98, 1, "b")}
      {flower(142, 88, 1.05, "c")}
    </g>
  );
}

function Lavender() {
  const spike = (x: number, lean: number, key: number) => (
    <g key={key}>
      <path d={`M100 230 Q ${100 + lean * 0.4} 140 ${x} 50`} stroke={LINE} strokeWidth="1.4" fill="none" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <ellipse key={i} cx={x + (lean > 0 ? -i * 0.6 : i * 0.6) + (i % 2 ? 3 : -3)} cy={52 + i * 9} rx="4" ry="5.5" fill="#9b84d6" stroke={LINE} strokeWidth=".5" />
      ))}
    </g>
  );
  return (
    <g>
      {[[58, -42], [80, -20], [102, 2], [124, 24], [146, 46]].map(([x, l], i) => spike(x, l, i))}
      <Leaf x={100} y={228} r={-30} len={40} w={6} />
      <Leaf x={100} y={228} r={30} len={40} w={6} />
      <path d="M78 200 h44 l-4 14 h-36 z" fill="#4a5a3a" stroke={LINE} strokeWidth="1" />
    </g>
  );
}

function Tablet() {
  return (
    <g>
      <rect x="40" y="40" width="120" height="170" rx="12" fill="#14243c" stroke={LINE} strokeWidth="2" />
      <rect x="50" y="52" width="100" height="146" rx="5" fill="#1c3352" />
      {[100, 76, 54, 34, 16].map((h, i) => (
        <rect key={i} x={58 + i * 18} y={180 - h} width="12" height={h} rx="3" fill={i === 0 ? "#d9e98a" : `rgba(217,233,138,${0.85 - i * 0.14})`} />
      ))}
      <path d="M58 188 h86" stroke="#f1e6cf" strokeWidth="1" opacity=".5" />
      <Leaf x={156} y={60} r={40} len={40} w={11} />
      <Leaf x={156} y={60} r={80} len={30} w={9} />
    </g>
  );
}

function Seedling() {
  return (
    <g>
      <ellipse cx="100" cy="214" rx="60" ry="12" fill="#4a3522" stroke={LINE} strokeWidth="1" />
      <path d="M100 212 C 98 180 102 150 100 120" stroke={LINE} strokeWidth="2.4" fill="none" />
      <path transform="translate(100 124) rotate(-58)" d="M0 0 C 18 -10 22 -40 0 -58 C -22 -40 -18 -10 0 0 Z" fill={LEAF} stroke={LINE} strokeWidth="1" />
      <path transform="translate(100 124) rotate(58)" d="M0 0 C 18 -10 22 -40 0 -58 C -22 -40 -18 -10 0 0 Z" fill={LEAF} stroke={LINE} strokeWidth="1" />
      <circle cx="100" cy="120" r="34" fill="none" stroke={BLOOM} strokeWidth="1" opacity=".5" />
      <circle cx="100" cy="120" r="52" fill="none" stroke={BLOOM} strokeWidth=".7" opacity=".3" />
    </g>
  );
}

const MAP: Record<PlantKey, () => React.ReactElement> = {
  willow: Willow, turmeric: Turmeric, wormwood: Wormwood, jar: Jar, basket: Basket, cinchona: Cinchona,
  foxglove: Foxglove, periwinkle: Periwinkle, lavender: Lavender, tablet: Tablet, seedling: Seedling,
};

export function PlantArt({ plant, className }: { plant: PlantKey; className?: string }) {
  const Art = MAP[plant];
  return (
    <svg className={className} viewBox="0 0 200 240" aria-hidden="true" focusable="false">
      <Art />
    </svg>
  );
}
