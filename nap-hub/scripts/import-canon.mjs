// Load the 12 founding documents into Supabase as searchable canon sections.
//   npm run import-canon
// Reads ./content/*.md, splits each by "## " heading, embeds each section,
// and inserts canon_documents + canon_sections.
//
// Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY

import fs from "node:fs";
import path from "node:path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const EMBED_MODEL = "text-embedding-3-small";

if (!SUPABASE_URL || !SERVICE_KEY || !OPENAI_KEY) {
  console.error("Missing env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY");
  process.exit(1);
}

const DOCS = [
  ["executive-brief", "NAP Executive Brief", "core", 1],
  ["manifesto", "NAP Manifesto", "core", 2],
  ["evidence-compendium", "NAP Evidence Compendium", "core", 3],
  ["modalities-compendium", "NAP Modalities Compendium", "core", 4],
  ["standards-council-charter", "NAP Standards Council Charter", "governance", 5],
  ["strategic-infrastructure-architecture", "NAP Strategic Infrastructure Architecture", "governance", 6],
  ["coalition-outreach-playbook", "NAP Coalition Outreach Playbook", "governance", 7],
  ["veteran-health-specialty-track", "NAP Veteran Health Specialty Track", "clinical", 8],
  ["veteran-mh-restoration-protocol", "NAP Veteran Mental Health Restoration Protocol", "clinical", 9],
  ["outcome-registry-framework", "NAP Outcome Registry Framework", "integrity", 10],
  ["clinical-safety-and-practice-standards", "NAP Clinical Safety and Practice Standards", "integrity", 11],
  ["known-limitations-and-roadmap", "NAP Known Limitations and Roadmap", "integrity", 12],
];

function splitSections(md) {
  const lines = md.split("\n");
  const sections = [];
  let heading = "Overview";
  let buf = [];
  const flush = () => {
    const text = buf.join("\n").trim();
    if (text.length > 40) sections.push({ heading, content: text });
    buf = [];
  };
  for (const ln of lines) {
    const m = ln.match(/^##\s+(.+)$/);
    if (m) { flush(); heading = m[1].trim(); } else buf.push(ln);
  }
  flush();
  return sections;
}

async function embed(text) {
  const r = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, 8000) }),
  });
  if (!r.ok) throw new Error("embed failed: " + (await r.text()).slice(0, 200));
  return (await r.json()).data[0].embedding;
}

async function sb(method, pathname, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
    method,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${method} ${pathname} -> ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

async function run() {
  for (const [slug, title, category, order] of DOCS) {
    const file = path.join(process.cwd(), "content", `${slug}.md`);
    if (!fs.existsSync(file)) { console.warn("skip (not found):", slug); continue; }
    const md = fs.readFileSync(file, "utf8");

    const [doc] = await sb("POST", "canon_documents?on_conflict=slug", { slug, title, category, reading_order: order });
    const docId = doc.id;

    const sections = splitSections(md);
    let i = 0;
    for (const s of sections) {
      const embedding = await embed(`${title} — ${s.heading}\n${s.content}`);
      await sb("POST", "canon_sections", {
        document_id: docId,
        document_title: title,
        anchor: slugify(s.heading),
        heading: s.heading,
        content: s.content,
        embedding,
        order_index: i++,
      });
    }
    console.log(`imported ${title}: ${sections.length} sections`);
  }
  console.log("Done. The Shape It guide can now check ideas against the canon.");
}

run().catch((e) => { console.error(e); process.exit(1); });
