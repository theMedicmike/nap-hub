// Server-only helpers for the framework Library and its reader. Reads content/*.md and
// public/audio/manifest.json at build/render time; never writes either.
import fs from "node:fs";
import path from "node:path";
import { Marked } from "marked";
import { DOCS, PUBLISHED_DOCS, type Category, type DocMeta } from "./canon";

// The reading order the Library suggests to a newcomer. It is a real sequence (short to long,
// argument then honesty then science), so it is shown numbered.
export const START_HERE: { slug: string; why: string }[] = [
  { slug: "executive-brief", why: "The whole argument in about five minutes." },
  { slug: "known-limitations-and-roadmap", why: "What is not built or proven yet, named plainly." },
  { slug: "manifesto", why: "The full case, for when you want the long read." },
];

export const SHELF_ORDER: Category[] = ["core", "governance", "clinical", "integrity"];

export const TONE: Record<Category, { bg: string; edge: string }> = {
  core: { bg: "#1e3a2c", edge: "#2f5a40" },
  governance: { bg: "#1b2a52", edge: "#2c4078" },
  clinical: { bg: "#47213a", edge: "#6a3356" },
  integrity: { bg: "#123a40", edge: "#1f5a60" },
};

// Raw HTML in the markdown is escaped, never passed through. (The canon has none today; this
// keeps it that way if a future edit adds some.)
const md = new Marked({
  renderer: {
    html(token) {
      return token.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    },
  },
});

let manifestCache: Record<string, { chunks?: number }> | null = null;
function manifest(): Record<string, { chunks?: number }> {
  if (manifestCache) return manifestCache;
  try {
    manifestCache = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "audio", "manifest.json"), "utf8"));
  } catch {
    manifestCache = {};
  }
  return manifestCache!;
}

function readMd(slug: string): string {
  try {
    return fs.readFileSync(path.join(process.cwd(), "content", `${slug}.md`), "utf8");
  } catch {
    return "";
  }
}

function wordCount(s: string): number {
  return s.replace(/[#>*_`|-]/g, " ").split(/\s+/).filter(Boolean).length;
}

export interface VolumeInfo extends DocMeta {
  minutes: number;
  audioParts: number; // 0 = not narrated yet (the reader falls back to the browser voice)
}

export function volumeInfo(d: DocMeta): VolumeInfo {
  const words = wordCount(readMd(d.slug));
  return { ...d, minutes: Math.max(1, Math.round(words / 230)), audioParts: manifest()[d.slug]?.chunks ?? 0 };
}

export function publishedVolumes(): VolumeInfo[] {
  return PUBLISHED_DOCS.map(volumeInfo);
}

// "PART III. THE EIGHT UNIVERSAL BIOLOGICAL SYSTEMS" -> "Part III. The Eight Universal Biological Systems"
const SMALL = new Set(["a", "an", "and", "as", "at", "by", "for", "in", "of", "on", "or", "the", "to", "with", "vs"]);
export function titleCase(s: string): string {
  if (/[a-z]/.test(s)) return s; // already mixed case
  const words = s.toLowerCase().split(/\s+/).filter(Boolean);
  return words
    .map((w, i) => {
      const bare = w.replace(/[^a-z]/g, "");
      const afterBreak = i === 0 || /[.:]$/.test(words[i - 1]);
      if (/^(i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii|xiii|xiv|xv|xvi|xvii|xviii|xix|xx)[.:]?$/.test(w)) return w.toUpperCase();
      if (/^[a-z][.:]$/.test(w)) return w.toUpperCase(); // "Appendix A."
      if (/^(nap|va|dod|ptsd|tbi|us|u\.s\.)[.:,]?$/.test(w)) return w.toUpperCase();
      if (!afterBreak && SMALL.has(bare)) return w;
      return w.replace(/[a-z]/, (c) => c.toUpperCase());
    })
    .join(" ");
}

function decode(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

export interface DocView {
  html: string; // front matter + body, in source order, for the reader (and its narration sync)
  status: string | null; // the document's own status note, as markdown inline text
  toc: { id: string; title: string; kind: string }[];
}

// Renders a document for the reader. The markup the narration syncs against is unchanged in
// order and text: we only add ids to headings, wrap the title page, and mark the status note
// (which is shown prominently above the text instead, so it is hidden in place, not removed).
export function docView(slug: string): DocView {
  const src = readMd(slug);
  const statusMatch = src.match(/^>\s*\*\*Status of this document([^*]*)\*\*\s*(.+)$/m);
  const status = statusMatch ? `**Status of this document${statusMatch[1].replace(/:\s*$/, "")}:** ${statusMatch[2].trim()}` : null;

  let html = md.parse(src, { async: false }) as string;

  // Heading ids for the contents list.
  let n = 0;
  const h1s: { id: string; title: string }[] = [];
  const h2s: { id: string; title: string }[] = [];
  html = html.replace(/<h([12])>([\s\S]*?)<\/h\1>/g, (_m, lvl: string, inner: string) => {
    const id = `s-${++n}`;
    (lvl === "1" ? h1s : h2s).push({ id, title: decode(inner) });
    return `<h${lvl} id="${id}">${inner}</h${lvl}>`;
  });

  // The first h1 is the document title, already shown in the hero.
  const parts = h1s.slice(1);
  const tocSrc = parts.length >= 3 ? parts : [...parts, ...h2s].sort((a, b) => Number(a.id.slice(2)) - Number(b.id.slice(2)));
  const toc = tocSrc.map((t) => ({ id: t.id, title: titleCase(t.title), kind: "part" }));

  html = html.replace(/<blockquote>(\s*<p><strong>Status of this document)/, '<blockquote class="dr-status-src">$1');
  html = html.replace(/^<h1 id="s-1">/, '<h1 id="s-1" class="dr-title-src">');

  const cut = html.indexOf("<hr>");
  if (cut > 0 && cut < 2500) {
    html = `<div class="dr-front">${html.slice(0, cut)}</div><div class="dr-main">${html.slice(cut)}</div>`;
  } else {
    html = `<div class="dr-main">${html}</div>`;
  }
  return { html, status, toc };
}

export function neighbours(slug: string): { prev: DocMeta | null; next: DocMeta | null; index: number; total: number } {
  const list = PUBLISHED_DOCS;
  const i = list.findIndex((d) => d.slug === slug);
  return { prev: i > 0 ? list[i - 1] : null, next: i >= 0 && i < list.length - 1 ? list[i + 1] : null, index: i, total: list.length };
}

export { DOCS };
