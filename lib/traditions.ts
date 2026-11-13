// THE GREAT TRADITIONS: fifteen origin-story chapters and the family tree that links them.
// Chapter text lives in content/traditions/NN-slug.md, fact-checked 2026-11-12 (see the
// checkpoint folder _CHECKPOINTS/2026-11-12_systems-of-medicine). Do not edit facts here or in the
// Markdown without re-checking them against the chapter's sources.
// Server-only (reads the filesystem).
import fs from "node:fs";
import path from "node:path";
import { parseBlocks, plainText, slugify, type Block } from "./md";
import treeJson from "@/content/traditions/family-tree.json";

const DIR = path.join(process.cwd(), "content", "traditions");

export type Emblem =
  | "turmeric" | "wormwood" | "willow" | "jar" | "basket" | "cinchona" | "foxglove" | "periwinkle"
  | "lavender" | "seedling" | "palmleaf" | "scroll" | "claytablet" | "codex";

export interface ChapterMeta {
  slug: string;
  num: string;
  nodes: string[]; // family-tree node ids; the first is the chapter's main node
  era: string; // short label for cards (drawn from the chapter's own dating)
  region: string;
  emblem: Emblem;
  art?: string; // /public/universe slot code for a matching painting, if one exists
  sky: [string, string, string]; // painted-placeholder palette: high sky, horizon glow, ground
}

export const CHAPTERS: ChapterMeta[] = [
  { slug: "ayurveda", num: "01", nodes: ["ayurveda"], era: "Vedic roots, c. 1500 BCE or later", region: "India", emblem: "turmeric", art: "P2", sky: ["#3a2a3e", "#f0b048", "#4a3218"] },
  { slug: "siddha", num: "02", nodes: ["siddha", "sri-lanka-siddha"], era: "Tamil works from c. 450–550 CE", region: "Tamil South India", emblem: "palmleaf", sky: ["#2d2440", "#e08a3c", "#3a2416"] },
  { slug: "chinese-medicine", num: "03", nodes: ["tcm"], era: "Silk texts sealed in 168 BCE", region: "China", emblem: "wormwood", sky: ["#1d2c45", "#c9654a", "#2a1c1a"] },
  { slug: "tibetan-medicine", num: "04", nodes: ["tibetan", "sowa-rigpa-exile"], era: "Four Tantras, usually dated 12th c.", region: "The Tibetan Plateau", emblem: "seedling", sky: ["#1f2350", "#a77bd0", "#231a33"] },
  { slug: "kampo-hanui", num: "05", nodes: ["kampo", "korean"], era: "Through Korea to Japan, 5th–6th c. CE", region: "Korea and Japan", emblem: "wormwood", sky: ["#1b2747", "#d98a7a", "#24202c"] },
  { slug: "egypt", num: "06", nodes: ["egypt"], era: "Medical papyri, c. 1600 BCE", region: "The Nile Valley", emblem: "scroll", art: "P1", sky: ["#2a2350", "#e59a4a", "#3b2a1c"] },
  { slug: "mesopotamia", num: "07", nodes: ["babylonian", "sumerian"], era: "Clay tablets, c. 2500–2100 BCE", region: "Between the two rivers", emblem: "claytablet", sky: ["#2b2440", "#d6a76a", "#3a2c1e"] },
  { slug: "greece-rome", num: "08", nodes: ["greek", "hellenistic-roman"], era: "Hippocratic writings, 5th–4th c. BCE", region: "Greece and the Mediterranean", emblem: "codex", sky: ["#182a52", "#7fb0de", "#1c2638"] },
  { slug: "islamic-unani", num: "09", nodes: ["islamic", "unani-south-asia"], era: "Translation movement, late 700s–900s", region: "Baghdad to Córdoba", emblem: "jar", sky: ["#162c3a", "#5fbf9a", "#17261f"] },
  { slug: "european-herbal", num: "10", nodes: ["european-monastic", "english-herbals", "continental-herbals", "european-folk"], era: "Bald's Leechbook, c. 950", region: "Europe", emblem: "basket", sky: ["#1d2c45", "#a9c46a", "#1f2a1c"] },
  { slug: "americas", num: "11", nodes: ["andean", "nahua", "amazon", "plains"], era: "Coca leaves 8,000+ years old", region: "The Americas", emblem: "cinchona", sky: ["#232848", "#e0845a", "#2c2018"] },
  { slug: "africa", num: "12", nodes: ["west-africa", "southern-africa"], era: "Living traditions; Timbuktu manuscripts", region: "Africa", emblem: "seedling", sky: ["#2a2444", "#d49a5c", "#33251a"] },
  { slug: "pacific-australia", num: "13", nodes: ["bundjalung", "hawaiian", "maori", "polynesian"], era: "Carried in memory and in the land", region: "Australia and the Pacific", emblem: "seedling", sky: ["#14284a", "#5cc0b0", "#162a2a"] },
  { slug: "modern-descendants", num: "14", nodes: ["homeopathy", "kneipp", "naturopathy", "osteopathy", "chiropractic"], era: "1790 onward", region: "Europe and North America", emblem: "lavender", sky: ["#1e2846", "#b0a8c8", "#22222e"] },
  { slug: "modern-science", num: "15", nodes: ["modern-science"], era: "From the 1700s", region: "Worldwide", emblem: "foxglove", art: "P10", sky: ["#152446", "#8fb4e0", "#182234"] },
];

export interface Section {
  id: string;
  title: string; // heading with any template note in brackets removed
  kind: "legend" | "record" | "keepers" | "passed" | "traveled" | "ideas" | "today" | "threads" | "sources" | "other";
  blocks: Block[];
}

export interface Source { n: number; text: string }

export interface Chapter extends ChapterMeta {
  title: string;
  name: string; // title without the bracketed region
  subtitle: string | null; // the bracketed part of the title, e.g. "India"
  hook: string;
  intro: Block[];
  sections: Section[];
  sources: Source[];
  words: number;
}

const KINDS: [RegExp, Section["kind"]][] = [
  [/^the legend/i, "legend"],
  [/^what the record shows/i, "record"],
  [/^keepers/i, "keepers"],
  [/^how it was passed/i, "passed"],
  [/^how it traveled/i, "traveled"],
  [/^signature/i, "ideas"],
  [/^today/i, "today"],
  [/^threads/i, "threads"],
  [/^sources/i, "sources"],
];

// Internal editorial notes that were never meant for readers.
const isEditorNote = (b: Block) => b.t === "p" && /^\*?fact-check note/i.test(b.text);

function fileFor(slug: string): string | null {
  const f = fs.readdirSync(DIR).find((x) => x.endsWith(`-${slug}.md`) && /^\d\d-/.test(x));
  return f ? path.join(DIR, f) : null;
}

const cache = new Map<string, Chapter>();

export function getChapter(slug: string): Chapter | null {
  if (cache.has(slug)) return cache.get(slug)!;
  const meta = CHAPTERS.find((c) => c.slug === slug);
  const file = meta && fileFor(slug);
  if (!meta || !file) return null;
  const md = fs.readFileSync(file, "utf8");
  const blocks = parseBlocks(md).filter((b) => b.t !== "hr" && !isEditorNote(b));

  let i = 0;
  let title = meta.slug;
  if (blocks[0]?.t === "h" && blocks[0].level === 1) { title = blocks[0].text; i = 1; }
  let hook = "";
  const first = blocks[i];
  if (first?.t === "p" && /^\*[^*].*\*$/.test(first.text)) { hook = first.text.slice(1, -1); i++; }

  const intro: Block[] = [];
  while (i < blocks.length && !(blocks[i].t === "h" && (blocks[i] as { level: number }).level === 2)) intro.push(blocks[i++]);

  const sections: Section[] = [];
  let sources: Source[] = [];
  for (; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.t === "h" && b.level === 2) {
      const t = b.text.replace(/\s*\((?:how|the oldest|named|oral|routes|the worldview|where|bullets)[^)]*\)\s*$/i, "").trim();
      const kind = KINDS.find(([re]) => re.test(t))?.[1] ?? "other";
      sections.push({ id: slugify(t), title: t, kind, blocks: [] });
    } else if (sections.length) {
      sections[sections.length - 1].blocks.push(b);
    }
  }
  const src = sections.find((s) => s.kind === "sources");
  if (src) {
    for (const b of src.blocks) if (b.t === "ol") sources = sources.concat(b.items.map((it) => ({ n: it.n, text: it.text })));
  }

  const m = (title.match(/\(/g)?.length ?? 0) === 1 ? title.match(/^(.*?)\s*\(([^)]+)\)\s*$/) : null;
  const words = md.split(/\s+/).length;
  const ch: Chapter = {
    ...meta, title, name: m ? m[1] : title, subtitle: m ? m[2] : null, hook, intro, sections, sources, words,
  };
  cache.set(slug, ch);
  return ch;
}

export function allChapters(): Chapter[] {
  return CHAPTERS.map((c) => getChapter(c.slug)!).filter(Boolean);
}

export function getOverview(): { title: string; sub: string; intro: Block[]; parts: { id: string; num: string; title: string; blocks: Block[] }[] } {
  const md = fs.readFileSync(path.join(DIR, "family-tree.md"), "utf8");
  const blocks = parseBlocks(md);
  let i = 0, title = "", sub = "";
  if (blocks[0]?.t === "h" && blocks[0].level === 1) { title = blocks[0].text; i = 1; }
  if (blocks[i]?.t === "p" && /^\*[^*].*\*$/.test((blocks[i] as { text: string }).text)) { sub = (blocks[i] as { text: string }).text.slice(1, -1); i++; }
  const intro: Block[] = [];
  const parts: { id: string; num: string; title: string; blocks: Block[] }[] = [];
  for (; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.t === "hr") continue;
    if (b.t === "h" && b.level === 2) {
      const m = b.text.match(/^(\d+)\.\s*(.*)$/);
      parts.push({ id: `story-${slugify(b.text)}`, num: m ? m[1] : String(parts.length + 1), title: m ? m[2] : b.text, blocks: [] });
    } else if (parts.length) parts[parts.length - 1].blocks.push(b);
    else intro.push(b);
  }
  return { title, sub, intro, parts };
}

// ---------- The family tree ----------
export interface TreeNode { id: string; name: string; region: string; era_start: number | null; era_label: string; color_hint: string }
export interface TreeEdge { from: string; to: string; when: string; how: string; source: string; certainty?: string }
export const TREE = treeJson as unknown as { meta: Record<string, string>; nodes: TreeNode[]; edges: TreeEdge[] };

// node id -> the chapter that tells its story
export function nodeChapters(): Record<string, { slug: string; num: string; name: string }> {
  const out: Record<string, { slug: string; num: string; name: string }> = {};
  for (const c of allChapters()) for (const id of c.nodes) if (!out[id]) out[id] = { slug: c.slug, num: c.num, name: c.name };
  return out;
}

export { plainText };
