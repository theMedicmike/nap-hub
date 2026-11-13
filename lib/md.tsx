// A small, safe Markdown renderer for the subset the Great Traditions chapters use: headings,
// paragraphs, bold/italic, ordered and unordered lists, links, bare URLs, blockquotes, rules,
// and numbered citation markers like [3] or [7, 9]. It builds React elements directly (React
// escapes every string), so no raw HTML from the source ever reaches the page. Only http(s)
// links are made clickable.
import type { ReactNode } from "react";

export type Block =
  | { t: "h"; level: number; text: string }
  | { t: "p"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "ol"; items: { n: number; text: string }[] }
  | { t: "quote"; blocks: Block[] }
  | { t: "hr" };

export function parseBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const out: Block[] = [];
  let para: string[] = [];
  let list: { kind: "ul" | "ol"; items: { n: number; text: string }[] } | null = null;

  const flushPara = () => {
    if (para.length) out.push({ t: "p", text: para.join(" ").trim() });
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    if (list.kind === "ul") out.push({ t: "ul", items: list.items.map((i) => i.text) });
    else out.push({ t: "ol", items: list.items });
    list = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();
    if (!line.trim()) { flushPara(); flushList(); continue; }

    let m: RegExpMatchArray | null;
    if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
      flushPara(); flushList();
      out.push({ t: "h", level: m[1].length, text: m[2].trim() });
      continue;
    }
    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { flushPara(); flushList(); out.push({ t: "hr" }); continue; }
    if (/^>\s?/.test(line)) {
      flushPara(); flushList();
      const q: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, "")); i++; }
      i--;
      out.push({ t: "quote", blocks: parseBlocks(q.join("\n")) });
      continue;
    }
    if ((m = line.match(/^\s*[-*+]\s+(.*)$/))) {
      flushPara();
      if (!list || list.kind !== "ul") { flushList(); list = { kind: "ul", items: [] }; }
      list.items.push({ n: list.items.length + 1, text: m[1] });
      continue;
    }
    if ((m = line.match(/^\s*(\d+)[.)]\s+(.*)$/))) {
      flushPara();
      if (!list || list.kind !== "ol") { flushList(); list = { kind: "ol", items: [] }; }
      list.items.push({ n: Number(m[1]), text: m[2] });
      continue;
    }
    // A continuation line inside a list item (indented or wrapped).
    if (list && /^\s+\S/.test(raw)) {
      const last = list.items[list.items.length - 1];
      last.text += " " + line.trim();
      continue;
    }
    flushList();
    para.push(line.trim());
  }
  flushPara(); flushList();
  return out;
}

export function plainText(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(?!\s)([^*\n]+?)\*/g, "$1")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1")
    .replace(/\s*\[(\d+(?:\s*[,–-]\s*\d+)*)\]/g, "")
    .trim();
}

export function slugify(s: string): string {
  return plainText(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function safeHref(u: string): string | null {
  try {
    const url = new URL(u);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

// Trim sentence punctuation (and an unbalanced closing bracket) off the end of a bare URL.
function trimUrl(u: string): [string, string] {
  let url = u, tail = "";
  for (;;) {
    const last = url.slice(-1);
    if (/[.,;:!?'"*]/.test(last)) { tail = last + tail; url = url.slice(0, -1); continue; }
    if (last === ")" && (url.match(/\(/g)?.length ?? 0) < (url.match(/\)/g)?.length ?? 0)) { tail = last + tail; url = url.slice(0, -1); continue; }
    break;
  }
  return [url, tail];
}

function host(u: string): string {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; }
}

export interface InlineOpts {
  citeHref?: (n: number) => string; // turns [3] into a link
  badges?: boolean; // style "(History.)" / "(Legend.)" style markers as small badges
  fullUrls?: boolean; // show bare URLs as their host (default) or in full
}

const TOKEN =
  /\*\*(.+?)\*\*|\*(?!\s)([^*\n]+?)\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\[(\d+(?:\s*[,–-]\s*\d+)*)\]|(https?:\/\/[^\s<>"]+)/g;

const BADGE = /^\((History|Legend|Debated|Claimed)[^)]*\)$/i;

export function Inline({ text, opts = {} }: { text: string; opts?: InlineOpts }): ReactNode {
  return <>{renderInline(text, opts, "i")}</>;
}

function renderInline(text: string, opts: InlineOpts, kp: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0, k = 0;
  TOKEN.lastIndex = 0;
  const re = new RegExp(TOKEN.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${kp}-${k++}`;
    if (m[1] !== undefined) {
      const inner = m[1];
      if (opts.badges && BADGE.test(inner.trim())) {
        const kind = inner.replace(/[^a-z]/gi, " ").trim().split(/\s+/)[0].toLowerCase();
        out.push(<span key={key} className={`md-badge md-badge-${kind}`}>{inner.replace(/^\(|\)$/g, "").replace(/\.$/, "")}</span>);
      } else {
        out.push(<strong key={key}>{renderInline(inner, opts, key)}</strong>);
      }
    } else if (m[2] !== undefined) {
      out.push(<em key={key}>{renderInline(m[2], opts, key)}</em>);
    } else if (m[3] !== undefined) {
      const href = safeHref(m[4]);
      out.push(href ? <a key={key} href={href} target="_blank" rel="noopener noreferrer">{renderInline(m[3], opts, key)}</a> : m[3]);
    } else if (m[5] !== undefined) {
      if (opts.citeHref) {
        const parts = m[5].split(/(\s*[,–-]\s*)/);
        out.push(
          <sup key={key} className="md-cite">
            {parts.map((p, i) => (/^\d+$/.test(p) ? <a key={i} href={opts.citeHref!(Number(p))} aria-label={`Source ${p}`}>{p}</a> : <span key={i}>{p.trim() === "," ? ", " : p.trim()}</span>))}
          </sup>,
        );
      } else {
        out.push(m[0]);
      }
    } else if (m[6] !== undefined) {
      const [url, tail] = trimUrl(m[6]);
      const href = safeHref(url);
      if (href) {
        out.push(
          <a key={key} className="md-url" href={href} target="_blank" rel="noopener noreferrer" title={url}>
            {opts.fullUrls ? url : host(url)}
          </a>,
        );
      } else out.push(url);
      if (tail) out.push(tail);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Blocks({ blocks, opts = {}, hShift = 0 }: { blocks: Block[]; opts?: InlineOpts; hShift?: number }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.t) {
          case "h": {
            const lvl = Math.min(6, b.level + hShift);
            const Tag = `h${lvl}` as "h2";
            return <Tag key={i} id={slugify(b.text)}><Inline text={b.text} opts={opts} /></Tag>;
          }
          case "p":
            // A paragraph set wholly in italics is an aside (e.g. "This is sacred story, not history").
            return <p key={i} className={/^\*[^*].*\*$/.test(b.text) ? "md-aside" : undefined}><Inline text={b.text} opts={opts} /></p>;
          case "ul":
            return <ul key={i}>{b.items.map((it, j) => <li key={j}><Inline text={it} opts={opts} /></li>)}</ul>;
          case "ol":
            return (
              <ol key={i} start={b.items[0]?.n ?? 1}>
                {b.items.map((it, j) => <li key={j} value={it.n}><Inline text={it.text} opts={opts} /></li>)}
              </ol>
            );
          case "quote":
            return <blockquote key={i}><Blocks blocks={b.blocks} opts={opts} hShift={hShift} /></blockquote>;
          case "hr":
            return <hr key={i} />;
        }
      })}
    </>
  );
}
