// Drafts rows for the structured safety layer (db/2026-11-27_safety_layer.sql) from the 184 free-text
// safety notes of the graded Atlas. RULE-BASED, NO MODEL: every row is a clause of a safety note in
// which a population word (pregnancy, children, kidney...) or a drug-class word (warfarin, SSRIs...)
// appears, graded avoid / caution / monitor by the nearest signal word in that clause. Every row is
// status = 'draft' and must be approved by a clinician or pharmacist before the Ask guide uses it.
//
// Reads the read-only export made by knowledge/_CHECKPOINTS/2026-11-24_ask-test-and-main-button/
// export-atlas.cjs (never the live database). Writes:
//   db/2026-11-27_safety_rows.sql                          the draft rows, idempotent (on conflict do nothing)
//   <checkpoint>/SAFETY-ROWS-REVIEW.md                     the review sheet, one table per ingredient
//   <checkpoint>/SAMPLE-20.md                              20 rows, every k-th, with their full source notes, for the hand check
//
// Run from the repo root with Node 24 (type stripping lets it import lib/ask-atlas.ts directly):
//   node scripts/draft-safety-rows.mjs [--export <atlas-graded.json>] [--sql <out.sql>] [--review <dir>] [--sample 20]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { POPULATIONS, DRUG_CLASSES, norm, termsRe } from "../lib/ask-atlas.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const knowledge = path.resolve(root, "..", "..");
const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => (a.startsWith("--") ? [a.slice(2), all[i + 1]] : [])).filter((x) => x.length));
const EXPORT = args.export || path.join(knowledge, "_CHECKPOINTS", "2026-11-24_ask-test-and-main-button", "atlas-graded.json");
const SQL_OUT = args.sql || path.join(root, "db", "2026-11-27_safety_rows.sql");
const REVIEW_DIR = args.review || path.join(knowledge, "_CHECKPOINTS", "2026-11-27_nap-safety-layer");
const SAMPLE_N = Number(args.sample || 20);

const { exportedAt, links, ents } = JSON.parse(fs.readFileSync(EXPORT, "utf8"));
const byId = Object.fromEntries(ents.map((e) => [e.id, e]));

/* ---------- 1. Signals: which way does a clause point? ---------- */
const AVOID_RE = /\b(avoid\w*|contraindicat\w*|do not (?:use|take|combine|give|mix|co-?administer)|don'?t (?:use|take|combine|give|mix)|should not be (?:used|taken|combined|given)|should not (?:use|take|combine|give)|must not|must be avoided|never (?:use|take|combine|give)|not (?:to )?be (?:used|taken|given)|not for (?:use|children|infants)|not recommended|unsafe|dangerous|prohibit\w*|banned|uterine stimulant|abortifacient|emmenagogue|serious risk\w*|serious flag\w*|major contraindication|firm contraindication|contraceptive failure|transplant rejection|treatment failure|life-?threatening|fatal\w*|death|keep (?:all )?\w* ?(?:products )?(?:locked )?away from)\b/gi;
// "Stop two weeks before surgery" is an instruction about SURGERY, so it grades only the surgery flag;
// for a drug named in the same breath ("caution with NSAIDs, and stop 2 weeks before surgery") it is not a signal.
const STOP_BEFORE_RE = /\b(stop(?:ped)? (?:it )?(?:~|about |roughly |at least )?(?:\d+[- ]\d+ |\d+ |one |two |a )?(?:days?|weeks?|week or two) (?:before|prior)|stop before|discontinue\w* before|disclose before)\b/gi;
const MONITOR_RE = /\b(monitor\w*|\bINR\b|check (?:levels|blood|glucose|sugar|labs)|watch for|watch closely|track\w*|supervis\w*|under medical supervision)\b/gi;
// Directive words tell the reader what to do; reason words only explain ("insufficient data"). When a
// clause has any directive, the nearest directive decides; reason words alone mean caution. Otherwise
// "insufficient safety data — avoid oral doses" graded caution because "insufficient" sat nearer.
const CAUTION_RE = /\b(caution\w*|careful\w*|with care|may (?:potentiate|enhance|increase|add|lower|reduce|alter|affect|interact|interfere|raise|worsen|compound|impair|delay)|can (?:potentiate|enhance|increase|add|lower|reduce|alter|affect|interact|interfere|raise|worsen|compound|impair|delay)|could (?:alter|affect|increase|lower)|additive|consult|clinician oversight|clinician-guided|clinician approves|separate\w*|space (?:doses|dosing)|disclose)\b/gi;
const REASON_RE = /\b(potential\w*|possible|possibly|plausible|theoretical\w*|limited data|insufficient|inadequate|not (?:been )?established|lacking|sparse|under-?studied|not (?:well )?studied|unknown|no safety data|at-risk|risk\b|concern\w*)\b/gi;

// Clauses that are not safety statements about the term at all (efficacy claims, comparisons,
// "do not treat it as a replacement for your medication", "do not use it to treat poisoning").
const NOT_SAFETY_RE = /\b(what it does not do|not a proven|no human evidence|does not (?:cure|treat|reverse|reliably|raise|increase|lower|affect|carry)|is not (?:a )?(?:cure|treatment|stimulant|hormone|laxative|proven)|unreplicated|reported no adverse|marker of|unlike\b|compared (?:to|with)|(?:does not|do not|doesn'?t|don'?t|cannot|never|should not|not a|not) (?:replace|substitute|assume|expect)|(?:not|never) (?:be )?used (?:to|as|for|in place)|do not use (?:it|this|them) (?:to|for|as)|to replace\b|replaces? (?:an?|the|your)\b|a substitute\b|substitute for\b|instead of|sole treatment|in place of|rather than|none of the|contrary to)\b/i;
const NOT_PREGNANCY_RE = /unplanned pregnan|contraceptive failure|pregnancy test/i;
// The ingredient's OWN reproductive property is not a drug interaction with birth control.
const NOT_HORMONAL_RE = /(?:used|regarded|employed|known) as an? (?:contraceptive|abortifacient)|antifertility|anti-?implantation|antispermatogenic|herbal contraceptive/i;
const WEAK_EVIDENCE_RE = /\b(animal|rodent|mice|rats?|in[- ]vitro|lab (?:studies|work|models)|preclinical)\b/i;
// A negative finding right next to the term ("no change in liver function", "well tolerated with
// normal kidney panels") is not a flag. Checked in a window of 70 characters either side.
const NEGATED_RE = /\b(no (?:serious|significant|meaningful|clinically significant|proven|clear|liver|kidney|renal|hepatic|organ|effect|increase|adverse|interaction|evidence of)|unchanged|normal(?! (?:dose|doses))|well tolerated|similar to placebo|showed no|showing no|absence of|not (?:an )?established (?:hepatotoxin|nephrotoxin))\b/i;
// Phrases that contain a term but mean something else; blanked before matching.
const MASKS = [
  "insulin sensitivity", "insulin resistance", "insulin levels", "insulin response", "fasting insulin", "insulin signaling", "insulin signalling", "insulin secretion", "insulin like",
  "alcohol extract", "alcohol extracts", "alcohol based", "alcohol tincture", "alcohol tinctures", "alcohol use", "alcohol content", "grain alcohol", "alcohol free", "ethanol acetone",
  "baby aspirin", "aspirin allergy", "aspirin salicylate allergy", "aspirin sensitivity", "aspirin s active form", "requiring transplant", "requiring liver transplant", "liver transplantation",
  "sedative effect", "sedative effects", "sedative properties", "sedative activity", "sedative herb", "sedative herbs", "sedative supplements", "sedating supplements", "hypno sedative",
].map((m) => new RegExp(`(?<![a-z0-9])${m}(?![a-z0-9])`, "g"));
const mask = (n) => MASKS.reduce((s, re) => s.replace(re, (x) => "x".repeat(x.length)), n);
const negatedNear = (n, at, len) => NEGATED_RE.test(n.slice(Math.max(0, at - 70), at + len + 70));

// Short mechanism labels for the drug table, from words in the clause. The class's own mechanism is
// tried first (a stimulants row reads "additive stimulation", not the serotonin flag of the same sentence).
const MECH = {
  bleeding: [/bleed|antiplatelet|anticoagul|platelet|clot|coumarin|salicyl|INR/i, "additive bleeding risk"],
  sedation: [/sedat|CNS depress|drowsi|alertness|GABA|anesthe|hypnotic/i, "additive sedation"],
  serotonin: [/serotonin|serotonergic|monoamine|\bMAO/i, "serotonergic overlap (serotonin syndrome risk)"],
  glucose: [/hypoglyc|blood sugar|blood glucose|glucose|glycemi/i, "additive blood-sugar lowering"],
  pressure: [/hypotens|blood pressure|\bBP\b|antihypertens|bradycard|heart rate/i, "additive blood-pressure or heart-rate lowering"],
  levels: [/CYP|P-?gp|P-glycoprotein|induc\w* |inhibit\w* (?:several|CYP|enzyme|drug|metabol)|metaboli[sz]|blood levels|plasma levels|drug levels|effectiveness of|clearance|UGT|transporter|narrow[- ]therapeutic/i, "changes the drug's blood level (liver enzyme or transporter interaction)"],
  immune: [/immun/i, "immune effects may add to or oppose the drug"],
  absorption: [/absor|chelat|separate|space (?:doses|dosing)|coat|mucilage|delay|dissolve/i, "reduced or delayed absorption; separate the doses"],
  thyroid: [/thyroid|T3|T4|TSH|thyroxine/i, "thyroid hormone effect"],
  hormonal: [/estrogen|hormon|endocrine|androgen|contracept/i, "hormonal activity"],
  liver: [/hepat|liver/i, "additive liver strain"],
  stimulation: [/stimul|activat|tachy|jitter|insomnia|agitation|compound/i, "additive stimulation"],
};
const CLASS_MECH = {
  anticoagulants: ["bleeding"], nsaids: ["bleeding"], antidepressants: ["serotonin"], sedatives: ["sedation"], antidiabetics: ["glucose"],
  antihypertensives: ["pressure", "levels"], pde5_inhibitors: ["pressure"], thyroid: ["thyroid"], immunosuppressants: ["immune", "levels"],
  hormonal: ["levels", "hormonal"], stimulants: ["stimulation"], acid_reducers: ["absorption"], antibiotics: ["absorption"], acetaminophen: ["liver"], statins: ["liver", "levels"],
};
const MECHANISMS = [
  MECH.levels,
  MECH.bleeding,
  MECH.sedation,
  MECH.serotonin,
  MECH.glucose,
  MECH.pressure,
  MECH.immune,
  MECH.absorption,
  [/potassium|electrolyte|sodium|hypercalc|hypermagnes|hyperkal|mineral/i, "electrolyte or mineral shift"],
  MECH.thyroid,
  MECH.hormonal,
  MECH.liver,
  [/\bQT\b/i, "QT prolongation"],
  MECH.stimulation,
  [/Reye/i, "Reye's syndrome risk"],
  [/bacter|fung|infection|catheter/i, "infection risk in vulnerable patients"],
  [/oxalate|kidney stone|stone/i, "kidney stone risk"],
  [/ammonia|nitrogen|glutamate/i, "altered nitrogen handling"],
];

/* ---------- 2. Clauses ---------- */
// Sentence ends (". " before a capital or bracket, or ";"), and the (1) (2) (3) enumerations the notes use.
function clauses(note) {
  return String(note)
    .replace(/\s+/g, " ")
    .split(/(?<=[.;])\s+(?=[A-Z(“"'])|;\s+|\s*\(\d{1,2}\)\s*/)
    .map((c) => c.trim().replace(/^[-–—:,\s]+|[\s,]+$/g, ""))
    .filter((c) => c.length >= 12);
}

function nearest(re, text, at) {
  let best = null;
  re.lastIndex = 0;
  for (const m of text.matchAll(re)) {
    const d = Math.min(Math.abs(m.index - at), Math.abs(m.index + m[0].length - at));
    if (best === null || d < best.d) best = { d, word: m[0] };
  }
  return best;
}

// The level for one term at one position in one clause: the nearest DIRECTIVE word decides; with no
// directive, a reason word ("insufficient data") means caution; with nothing at all, caution, low confidence.
function grade(clause, at, kind, key) {
  const a = nearest(AVOID_RE, clause, at);
  const s = key === "surgery" ? nearest(STOP_BEFORE_RE, clause, at) : null;
  const m = kind === "drug" ? nearest(MONITOR_RE, clause, at) : null;
  const c = nearest(CAUTION_RE, clause, at);
  const cands = [a && { level: "avoid", ...a }, s && { level: "avoid", ...s }, m && { level: "monitor", ...m }, c && { level: "caution", ...c }].filter(Boolean);
  if (!cands.length) {
    const r = nearest(REASON_RE, clause, at);
    return r ? { level: "caution", signal: r.word, confidence: "medium" } : { level: "caution", signal: null, confidence: "low" };
  }
  // Ties go to the more protective word (avoid beats caution beats monitor).
  const rank = { avoid: 0, caution: 1, monitor: 2 };
  cands.sort((x, y) => x.d - y.d || rank[x.level] - rank[y.level]);
  const w = cands[0];
  return { level: w.level, signal: w.word, confidence: w.d <= 90 ? "high" : "medium" };
}

function mechanismOf(clause, slug) {
  for (const k of CLASS_MECH[slug] || []) if (MECH[k][0].test(clause)) return MECH[k][1];
  for (const [re, label] of MECHANISMS) if (re.test(clause)) return label;
  return null;
}

// A clause that opens with ANOTHER Atlas ingredient's name is about that ingredient ("Caffeine
// interacts with numerous drugs", in the L-theanine note), so it drafts no row for this one.
const leadWord = (s) => (s.match(/^[A-Za-z][A-Za-z'’-]*/) || [""])[0].toLowerCase();
const ingredientLeads = new Map(); // first word of the name -> set of ingredient ids
for (const e of ents) {
  if (e.type !== "ingredient") continue;
  const w = leadWord(e.name.replace(/\([^)]*\)/g, " ").trim());
  if (w.length >= 4) (ingredientLeads.get(w) || ingredientLeads.set(w, new Set()).get(w)).add(e.id);
}
const aboutAnotherIngredient = (clause, ing) => {
  const ids = ingredientLeads.get(leadWord(clause));
  return Boolean(ids && !ids.has(ing.id));
};

/* ---------- 3. Walk every note ---------- */
const RANK = { avoid: 3, caution: 2, monitor: 1 };
const popRows = new Map(); // `${ingredient}|${population}` -> row
const drugRows = new Map();
const popRe = Object.fromEntries(POPULATIONS.map((p) => [p.slug, termsRe(p.terms)]));
const drugRe = Object.fromEntries(DRUG_CLASSES.map((d) => [d.slug, termsRe(d.drugs)]));
let clauseCount = 0;

// One row per ingredient x key. The most protective level wins, and the clause that set it is listed first.
function keep(map, key, row) {
  const cur = map.get(key);
  if (!cur) return map.set(key, row);
  const stronger = RANK[row.level] > RANK[cur.level];
  const firmer = RANK[row.level] === RANK[cur.level] && cur.confidence === "low" && row.confidence !== "low";
  if (stronger || firmer) {
    cur.level = row.level; cur.signal = row.signal; cur.confidence = row.confidence;
    cur.clauses = [row.clauses[0], ...cur.clauses.filter((c) => c !== row.clauses[0])];
  } else if (!cur.clauses.includes(row.clauses[0])) cur.clauses.push(row.clauses[0]);
  if (!cur.links.includes(row.links[0])) cur.links.push(row.links[0]);
  if (!cur.mechanism && row.mechanism) cur.mechanism = row.mechanism;
  if (row.weak) cur.weak = true;
}

for (const link of links) {
  const ing = byId[link.from_entity];
  if (!ing || ing.type !== "ingredient" || !link.safety_note) continue;
  for (const clause of clauses(link.safety_note)) {
    clauseCount++;
    if (NOT_SAFETY_RE.test(clause) || aboutAnotherIngredient(clause, ing)) continue;
    const n = mask(norm(clause)); // lower case, punctuation -> spaces, padded, look-alike phrases blanked
    const weak = WEAK_EVIDENCE_RE.test(clause);
    for (const p of POPULATIONS) {
      const re = popRe[p.slug];
      if (!re) continue;
      const m = re.exec(n);
      if (!m) continue;
      if (p.slug === "pregnancy" && NOT_PREGNANCY_RE.test(clause)) continue;
      if (negatedNear(n, m.index, m[0].length)) continue;
      const g = grade(n, m.index, "population", p.slug);
      const level = g.level === "monitor" ? "caution" : g.level;
      keep(popRows, `${ing.id}|${p.slug}`, { ingredient: ing, key: p.slug, level, signal: g.signal, confidence: weak ? "low" : g.confidence, clauses: [clause], links: [link.id], mechanism: null, weak });
    }
    for (const d of DRUG_CLASSES) {
      const re = drugRe[d.slug];
      if (!re) continue;
      const m = re.exec(n);
      if (!m) continue;
      if (d.slug === "hormonal" && NOT_HORMONAL_RE.test(clause)) continue;
      if (negatedNear(n, m.index, m[0].length)) continue;
      const g = grade(n, m.index, "drug", d.slug);
      keep(drugRows, `${ing.id}|${d.slug}`, { ingredient: ing, key: d.slug, level: g.level, signal: g.signal, confidence: weak ? "low" : g.confidence, clauses: [clause], links: [link.id], mechanism: mechanismOf(clause, d.slug), weak });
    }
  }
}

const pops = [...popRows.values()].sort((a, b) => a.ingredient.slug.localeCompare(b.ingredient.slug) || a.key.localeCompare(b.key));
const drugs = [...drugRows.values()].sort((a, b) => a.ingredient.slug.localeCompare(b.ingredient.slug) || a.key.localeCompare(b.key));

/* ---------- 4. SQL ---------- */
const q = (s) => (s == null ? "null" : `'${String(s).replace(/'/g, "''")}'`);
const noteOf = (r) => r.clauses.slice(0, 2).join(" | ").slice(0, 300);
const sourceOf = (r) => `rule-based extraction from atlas_links.safety_note by scripts/draft-safety-rows.mjs (no model); links ${r.links.join(", ")}; signal "${r.signal ?? "none"}", confidence ${r.confidence}`;
const today = new Date().toLocaleDateString("en-CA"); // local date, YYYY-MM-DD
const sql = [];
sql.push(`-- DRAFT safety rows for the NAP Atlas, generated ${today} by scripts/draft-safety-rows.mjs from atlas-graded.json (exported ${exportedAt}).`);
sql.push(`-- Rule-based extraction from the 184 safety notes; NO model was used. Every row is status = 'draft'.`);
sql.push(`-- ${pops.length} population flags for ${new Set(pops.map((r) => r.ingredient.id)).size} ingredients; ${drugs.length} drug-class interactions for ${new Set(drugs.map((r) => r.ingredient.id)).size} ingredients.`);
sql.push(`-- Review sheet: knowledge/_CHECKPOINTS/2026-11-27_nap-safety-layer/SAFETY-ROWS-REVIEW.md. Requires db/2026-11-27_safety_layer.sql first.`);
sql.push(`-- Idempotent: an ingredient x key pair that already exists (for example one a reviewer edited) is left untouched.`);
sql.push(`-- NOT APPLIED TO PRODUCTION. Apply only on Michael's go: node knowledge\\NAP_SITE\\db-runner\\runsql.js <this file>`);
sql.push(`begin;`);
// The comma must come BEFORE the slug comment, or the comment swallows it and the VALUES list breaks.
const rowsSql = (rows, tuple) => rows.map((r, i) => `  (${tuple(r)})${i < rows.length - 1 ? "," : ""} -- ${r.ingredient.slug}`).join("\n");
sql.push(`insert into atlas_population_flags (ingredient_id, population, level, note, source, status) values`);
sql.push(rowsSql(pops, (r) => `${q(r.ingredient.id)}, ${q(r.key)}, ${q(r.level)}, ${q(noteOf(r))}, ${q(sourceOf(r))}, 'draft'`));
sql.push(`on conflict (ingredient_id, population) do nothing;`);
sql.push(`insert into atlas_drug_interactions (ingredient_id, drug_class, severity, mechanism, note, source, status) values`);
sql.push(rowsSql(drugs, (r) => `${q(r.ingredient.id)}, ${q(r.key)}, ${q(r.level)}, ${q(r.mechanism)}, ${q(noteOf(r))}, ${q(sourceOf(r))}, 'draft'`));
sql.push(`on conflict (ingredient_id, drug_class) do nothing;`);
sql.push(`commit;`);
fs.writeFileSync(SQL_OUT, sql.join("\n") + "\n");

/* ---------- 5. Review sheet ---------- */
const popLabel = Object.fromEntries(POPULATIONS.map((p) => [p.slug, p.label]));
const drugLabel = Object.fromEntries(DRUG_CLASSES.map((d) => [d.slug, d.label]));
const md = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
const byIng = new Map();
for (const r of pops) (byIng.get(r.ingredient.slug) || byIng.set(r.ingredient.slug, []).get(r.ingredient.slug)).push({ ...r, kind: "population" });
for (const r of drugs) (byIng.get(r.ingredient.slug) || byIng.set(r.ingredient.slug, []).get(r.ingredient.slug)).push({ ...r, kind: "drug" });
const count = (rows, k) => rows.filter((r) => r.level === k).length;
const rev = [];
rev.push(`# Review sheet: drafted safety rows (${today})`);
rev.push(``);
rev.push(`Source: the 184 safety notes in atlas-graded.json (read-only export, ${exportedAt}). Method: rule-based clause extraction in \`scripts/draft-safety-rows.mjs\`, no model. ${clauseCount} clauses were read; a row is kept when a clause names a population or a drug class, and its level is the nearest signal word in that clause (avoid / caution / monitor). Nothing here is in the database yet; the SQL is \`db/2026-11-27_safety_rows.sql\`, every row \`status = 'draft'\`.`);
rev.push(``);
rev.push(`| | avoid | caution | monitor | total | ingredients |`);
rev.push(`|---|---|---|---|---|---|`);
rev.push(`| Population flags | ${count(pops, "avoid")} | ${count(pops, "caution")} | – | ${pops.length} | ${new Set(pops.map((r) => r.ingredient.id)).size} |`);
rev.push(`| Drug-class interactions | ${count(drugs, "avoid")} | ${count(drugs, "caution")} | ${count(drugs, "monitor")} | ${drugs.length} | ${new Set(drugs.map((r) => r.ingredient.id)).size} |`);
rev.push(``);
rev.push(`Population counts: ${POPULATIONS.map((p) => `${p.slug} ${pops.filter((r) => r.key === p.slug).length}`).join(", ")}.`);
rev.push(`Drug-class counts: ${DRUG_CLASSES.map((d) => `${d.slug} ${drugs.filter((r) => r.key === d.slug).length}`).filter((s) => !/ 0$/.test(s)).join(", ")}.`);
rev.push(``);
rev.push(`## How to review`);
rev.push(``);
rev.push(`For each row: read the clause (the exact words of the safety note), then approve, change the level, rewrite the note into one plain clause (it is read to the visitor when the level is avoid), or reject. Confidence is the script's own: high = a signal word within 90 characters of the term; medium = a signal word further away; low = no signal word (defaulted to caution) or the clause rests on animal or lab data. Once the rows are loaded, a reviewer approves with, for example:`);
rev.push(``);
rev.push("```sql");
rev.push(`update atlas_population_flags set status = 'approved', reviewed_by = 'Name, PharmD', note = 'avoid in pregnancy: it is a uterine stimulant'`);
rev.push(`  where ingredient_id = (select id from atlas_entities where slug = 'ashwagandha') and population = 'pregnancy';`);
rev.push("```");
rev.push(``);
rev.push(`The Ask guide reads only approved rows. Rejected rows stay in the table as a record of what was considered.`);
rev.push(``);
rev.push(`## Rows by ingredient`);
for (const slug of [...byIng.keys()].sort()) {
  const rows = byIng.get(slug);
  rev.push(``);
  rev.push(`### ${rows[0].ingredient.name}  (\`${slug}\`)`);
  rev.push(``);
  rev.push(`| kind | key | level | confidence | mechanism | clause (from the safety note) | links |`);
  rev.push(`|---|---|---|---|---|---|---|`);
  for (const r of rows) {
    rev.push(`| ${r.kind} | ${r.kind === "population" ? `${r.key} (${popLabel[r.key]})` : `${r.key} (${drugLabel[r.key]})`} | **${r.level}** | ${r.confidence}${r.signal ? ` ("${md(r.signal)}")` : ""} | ${r.mechanism ? md(r.mechanism) : ""} | ${md(r.clauses.slice(0, 2).join(" ¦ "))} | ${r.links.map((l) => l.slice(0, 8)).join(", ")} |`);
  }
}
fs.mkdirSync(REVIEW_DIR, { recursive: true });
fs.writeFileSync(path.join(REVIEW_DIR, "SAFETY-ROWS-REVIEW.md"), rev.join("\n") + "\n");

/* ---------- 6. The hand-check sample: every k-th row of each table, with the whole source note ---------- */
const pick = (rows, n) => { const k = Math.max(1, Math.floor(rows.length / n)); return rows.filter((_, i) => i % k === 0).slice(0, n); };
const half = Math.ceil(SAMPLE_N / 2);
const sample = [...pick(pops, half).map((r) => ({ ...r, kind: "population" })), ...pick(drugs, SAMPLE_N - half).map((r) => ({ ...r, kind: "drug" }))];
const sm = [];
sm.push(`# Hand-check sample: ${sample.length} drafted rows (${today})`);
sm.push(``);
sm.push(`Every ${Math.floor(pops.length / half)}th population row and every ${Math.floor(drugs.length / (SAMPLE_N - half))}th drug row, in slug order. For each: the drafted row, then the full safety note(s) it was drawn from. Verdicts are recorded in HAND-CHECK.md.`);
sample.forEach((r, i) => {
  sm.push(``);
  sm.push(`## ${i + 1}. ${r.ingredient.name} × ${r.key} → **${r.level}** (${r.kind}; confidence ${r.confidence}${r.signal ? `, signal "${r.signal}"` : ""}${r.mechanism ? `; mechanism: ${r.mechanism}` : ""})`);
  sm.push(``);
  sm.push(`Clause(s): ${r.clauses.map((c) => `“${c}”`).join("  |  ")}`);
  for (const id of r.links) {
    const l = links.find((x) => x.id === id);
    sm.push(``);
    sm.push(`Full note (link ${id.slice(0, 8)}, ${byId[l.to_entity]?.name}):`);
    sm.push(``);
    sm.push(`> ${l.safety_note}`);
  }
});
fs.writeFileSync(path.join(REVIEW_DIR, "SAMPLE-20.md"), sm.join("\n") + "\n");

console.log(`notes ${links.length}, clauses ${clauseCount}`);
console.log(`population flags: ${pops.length} (avoid ${count(pops, "avoid")}, caution ${count(pops, "caution")}) for ${new Set(pops.map((r) => r.ingredient.id)).size} ingredients`);
console.log(`drug interactions: ${drugs.length} (avoid ${count(drugs, "avoid")}, caution ${count(drugs, "caution")}, monitor ${count(drugs, "monitor")}) for ${new Set(drugs.map((r) => r.ingredient.id)).size} ingredients`);
console.log(`wrote ${path.relative(root, SQL_OUT)}, ${path.join(REVIEW_DIR, "SAFETY-ROWS-REVIEW.md")}, ${path.join(REVIEW_DIR, "SAMPLE-20.md")}`);
