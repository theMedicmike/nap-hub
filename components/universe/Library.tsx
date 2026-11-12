import Link from "next/link";
import type { Category, DocMeta } from "@/lib/canon";
import { CATEGORY_NAME } from "@/lib/canon";

export type Volume = DocMeta & { cover: string | null; draft: boolean };

const TONE: Record<Category, { bg: string; edge: string }> = {
  core: { bg: "#1e3a2c", edge: "#2f5a40" },
  governance: { bg: "#1b2a52", edge: "#2c4078" },
  clinical: { bg: "#47213a", edge: "#6a3356" },
  integrity: { bg: "#123a40", edge: "#1f5a60" },
};

function Emblem({ category }: { category: Category }) {
  const s = { stroke: "#e2c271", fill: "none", strokeWidth: 1.4 } as const;
  if (category === "core")
    return (
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r="30" {...s} opacity=".5" />
        <path d="M40 16 C 56 30 56 50 40 64 C 24 50 24 30 40 16 Z" {...s} />
        <path d="M40 20 V60 M40 34 l8 -6 M40 44 l-8 -6 M40 52 l8 -6" {...s} strokeWidth={1} />
      </svg>
    );
  if (category === "governance")
    return (
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r="26" {...s} />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return <circle key={i} cx={40 + Math.cos(a) * 26} cy={40 + Math.sin(a) * 26} r="3.4" fill="#e2c271" />;
        })}
        <circle cx="40" cy="40" r="6" {...s} />
      </svg>
    );
  if (category === "clinical")
    return (
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <path d="M40 66 C 38 50 42 34 40 14" {...s} />
        {[18, 24, 30, 36].map((y, i) => (
          <ellipse key={y} cx={40 + (i % 2 ? 3 : -3)} cy={y} rx="3" ry="4.4" fill="#e2c271" opacity={0.95 - i * 0.12} />
        ))}
        <path d="M40 58 C 30 52 22 54 16 60 M40 58 C 50 52 58 54 64 60" {...s} />
      </svg>
    );
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <path d="M40 14 V64 M24 64 h32 M18 26 h44" {...s} />
      <path d="M18 26 l-8 18 h16 z M62 26 l-8 18 h16 z" {...s} />
      <circle cx="40" cy="14" r="3" fill="#e2c271" />
    </svg>
  );
}

// The Library: every founding document as a bound volume on a shelf. Each opens the full
// text and narration at /framework/<slug>.
export function Library({ volumes }: { volumes: Volume[] }) {
  return (
    <ul className="lib-shelf">
      {volumes.map((v) => {
        const t = TONE[v.category];
        return (
          <li key={v.slug} className="lib-cell">
            <Link className="book" href={`/framework/${v.slug}`} style={{ ["--bk" as string]: t.bg, ["--bk-edge" as string]: t.edge }}>
              <span className="book-stand"><span className="book-body">
                {v.cover ? (
                  <img className="book-art" src={v.cover} alt="" loading="lazy" decoding="async" />
                ) : (
                  <span className="book-gen" aria-hidden="true">
                    <span className="book-frame" />
                    <span className="book-emblem"><Emblem category={v.category} /></span>
                  </span>
                )}
                <span className="book-text">
                  <span className="book-num">No. {v.num}</span>
                  <span className="book-title">{v.title.replace(/^NAP /, "")}</span>
                  <span className="book-cat">{CATEGORY_NAME[v.category]}</span>
                </span>
              </span>
              </span>
              <span className="book-desc">
                {v.draft ? "Being revised on verified sources." : v.desc}
                <span className="book-go">{v.draft ? "See the notice" : "Read and listen"}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
