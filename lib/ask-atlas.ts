/* ------------------------------------------------------------------------------------------
 * ATLAS KNOWLEDGE + SAFETY-NOTE CHECK for /api/ask.
 *
 * Rule: the guide must never name a supplement unless that supplement's FULL Atlas safety note
 * was in front of the model when it wrote the answer. The prompt says so, but the 2026-11-27 live
 * re-run showed the model still named ingredients in passing (magnesium and CoQ10 for "tired all
 * the time", NAC and milk thistle for burn pits) because their notes were never attached: notes
 * are attached only to claims whose ingredient or condition the VISITOR mentioned, and "tired"
 * does not match "Energy & fatigue".
 *
 * So the check runs in CODE after the model answers:
 *   1. find every Atlas ingredient the reply names;
 *   2. if any was named without its full note having been shown, ask the model ONCE more to
 *      revise its draft with those notes attached (carry each one's key safety points, early, or
 *      drop the ingredient);
 *   3. if the revision still names an ingredient whose note it never saw (or the revision call
 *      fails), add one plain sentence telling the reader to run it past a pharmacist first.
 * Condition synonyms ("tired" -> Energy & fatigue, "burn pits" -> Detox) attach more notes up
 * front so step 2 is needed less often.
 *
 * No imports, so it can be tested directly with Node (knowledge/_CHECKPOINTS/
 * 2026-11-24_ask-test-and-main-button/verify-safety-notes.mts).
 * ---------------------------------------------------------------------------------------- */

export type AtlasEntity = {
  id: string;
  type?: string | null;
  name: string;
  slug?: string | null;
  also_known_as?: string | null;
};
export type AtlasLink = {
  from_entity: string;
  to_entity: string;
  relation: string;
  scientific_tier?: string | null;
  traditional_strength?: string | null;
  safety_note?: string | null;
};
// `tables` holds the APPROVED rows of the structured safety layer (section 5); absent or empty = the
// behavior before the layer existed.
export type Atlas = { links: AtlasLink[]; byId: Record<string, AtlasEntity>; matchers: IngredientMatcher[]; tables?: SafetyTables };

/* ---------- 1. Which claims get their FULL SAFETY NOTE attached (moved from route.ts) ---------- */

// Every graded claim carries a full safety note (interactions, who must avoid it). The full notes
// are ~1-2k characters each, too large to send all 184 on every request, so the FULL note is
// attached to every claim whose ingredient or condition is mentioned in the recent conversation
// (loose stem match, so "anxious" finds Anxiety; a false match only adds safety text), plus every
// claim of an ingredient passed in `force` (the safety-note check below).
const STOP = new Set(["and", "the", "for", "with", "root", "leaf", "seed", "oral", "extract", "health"]);

// Substring keys (full name, stems of long words) plus whole-word keys (short words like "gut", "fish").
function mentionKeys(name: string): { sub: string[]; word: string[] } {
  const sub = new Set<string>();
  const word = new Set<string>();
  for (const part of name.split(";")) {
    const base = part.replace(/\([^)]*\)/g, " ").toLowerCase().replace(/[^a-z0-9\s'-]/g, " ").replace(/\s+/g, " ").trim();
    if (base.length >= 3) sub.add(base);
    for (const w of base.split(/[\s/-]+/)) {
      if (STOP.has(w)) continue;
      if (w.length >= 5) sub.add(w.slice(0, Math.max(4, w.length - 3)));
      else if (w.length >= 3 && /[a-z]/.test(w)) word.add(w);
    }
  }
  return { sub: Array.from(sub), word: Array.from(word) };
}

// Everyday words for the 12 Atlas conditions, so a visitor's own phrasing attaches the notes up
// front. Keyed by the start of the condition's name, lower case. Matched against the normalized
// conversation (see norm), so multi-word phrases work; keep each one specific enough that it
// does not fire on ordinary sentences.
export const CONDITION_WORDS: Record<string, string[]> = {
  "insomnia": ["sleep", "sleeping", "insomnia", "cant sleep", "waking up", "wake up at", "nightmares", "restless nights"],
  "anxiety": ["anxious", "anxiety", "stress", "stressed", "worry", "worried", "panic", "nervous", "on edge", "ptsd", "overwhelmed"],
  "depression": ["depressed", "depression", "mood", "sad", "low mood", "hopeless", "no motivation"],
  "pain": ["pain", "painful", "ache", "aches", "aching", "sore", "joint", "joints", "arthritis", "inflammation", "inflamed", "headache", "migraine", "back pain"],
  "energy": ["tired", "fatigue", "fatigued", "exhausted", "exhaustion", "energy", "worn out", "sluggish", "drained", "no energy"],
  "focus": ["focus", "memory", "brain fog", "foggy", "concentrate", "concentration", "forgetful", "tbi", "tbis", "concussion", "brain injury", "blast", "blasts", "cognitive"],
  "gut health": ["gut", "digestion", "digestive", "bloating", "bloated", "stomach", "ibs", "constipation", "constipated", "diarrhea", "reflux", "heartburn", "bowel"],
  "gut overgrowth": ["sibo", "candida", "yeast overgrowth", "parasite", "parasites", "overgrowth", "dysbiosis"],
  "hormones": ["testosterone", "hormone", "hormones", "libido", "sex drive", "erectile", "menopause", "low t"],
  "detox": ["toxic", "toxin", "toxins", "detox", "burn pit", "burn pits", "chemical", "chemicals", "exposure", "exposed", "heavy metal", "heavy metals", "mercury", "arsenic", "camp lejeune", "agent orange", "solvents", "pfas"],
  "immune": ["immune", "immunity", "infection", "infections", "flu", "virus", "getting sick"],
  "respiratory": ["lung", "lungs", "breathing", "cough", "coughing", "asthma", "copd", "respiratory", "sinus", "burn pit", "burn pits"],
};

function conditionWordsFor(name: string): string[] {
  const n = name.toLowerCase();
  for (const k of Object.keys(CONDITION_WORDS)) if (n.startsWith(k)) return CONDITION_WORDS[k];
  return [];
}

export function buildKnowledge(
  atlas: Atlas,
  conversation: string,
  force: Set<string> = new Set(),
): { text: string; shown: Set<string> } {
  const convo = conversation.toLowerCase();
  const convoWords = new Set(convo.split(/[^a-z0-9]+/));
  const convoNorm = norm(conversation);
  const mentioned = (e: AtlasEntity) => {
    const k = mentionKeys(`${e.name};${e.also_known_as ?? ""}`);
    if (k.sub.some((s) => convo.includes(s)) || k.word.some((w) => convoWords.has(w))) return true;
    if (e.type === "condition") return conditionWordsFor(e.name).some((w) => convoNorm.includes(` ${norm(w).trim()} `));
    return false;
  };
  const shown = new Set<string>();
  const lines = atlas.links
    .map((l) => {
      const a = atlas.byId[l.from_entity];
      const b = atlas.byId[l.to_entity];
      if (!a || !b) return "";
      const sci = String(l.scientific_tier || "").toUpperCase();
      const trad = l.traditional_strength ? `, traditional use: ${l.traditional_strength}` : "";
      const relevant = force.has(a.id) || force.has(b.id) || mentioned(a) || mentioned(b);
      const withNote = Boolean(l.safety_note) && relevant;
      if (withNote) {
        if (a.type === "ingredient") shown.add(a.id);
        if (b.type === "ingredient") shown.add(b.id);
      }
      const safety = withNote ? ` FULL SAFETY NOTE: ${String(l.safety_note)}` : "";
      return `[scientific evidence: ${sci}${trad}] ${a.name} — ${l.relation} — ${b.name}.${safety}`;
    })
    .filter(Boolean);
  if (!lines.length) return { text: "", shown };
  const header = `\n\nNAP ATLAS — GRADED CLAIMS ONLY (${lines.length} claims, graded in-house and not yet independently reviewed; ground answers in these and nowhere else):\n`;
  const footer = `\n\nThese are the ONLY graded claims that exist. The Atlas also contains a large historical folk-use record which is deliberately EXCLUDED here because traditional use is not evidence of effectiveness. If a question is not covered by the graded claims above, say plainly that NAP has not reviewed evidence on it yet — never fill the gap from general knowledge and never present traditional use as evidence.\n\nSAFETY NOTES: a FULL SAFETY NOTE is attached to every claim whose ingredient or condition appears in this conversation. Whenever you discuss an ingredient, carry its most important safety points (who should avoid it, key medication interactions) into your reply, early. Do NOT name any ingredient whose FULL SAFETY NOTE is not shown above, not even in passing or as one item in a list. Talk about the body system instead (for example liver clearance, the gut lining, or sleep regulation), and invite the person to name an ingredient they are curious about so its safety guidance can be included.`;
  return { text: header + lines.join("\n") + footer, shown };
}

/* ---------- 2. Which Atlas ingredients does a reply name? ---------- */

// Lower case, apostrophes dropped (lion's / lions / lion’s), everything else that is not a letter
// or digit becomes a space, padded so " key " is a whole-word test.
export function norm(s: string): string {
  return " " + s.toLowerCase().replace(/['’‘`]/g, "").replace(/[^a-z0-9]+/g, " ").trim() + " ";
}

export type IngredientMatcher = {
  id: string;
  slug: string;
  short: string; // the name used in prose: "NAC", "Coenzyme Q10", "Omega-3 fish oil"
  plain: string[]; // normalized keys, matched case-insensitively as whole words (plural s allowed)
  exact: RegExp[]; // acronyms like SAMe, PEA, NAC: matched case-sensitively so "same" and "pea" never fire
  trigger: boolean; // false = named often in passing as advice to AVOID (caffeine); never forces a rewrite
};

// Keys the alias lists produce that are not names (descriptors, split artifacts, too short), or
// that mean something else in a veteran's question (EPA is also the agency).
const DENY_KEYS = new Set([
  "ac", "c8", "cr", "se", "ps", "gln", "q", "epa", "reduced", "purified", "topical", "liposomal", "glycinate",
  "bisglycinate", "enteric coated", "inner leaf", "soluble fiber", "medicinal mushroom", "green algae",
  "organic sulfur", "plant based enzymes", "live beneficial bacteria", "otc creams", "beet shot", "the magic stone",
  "from coconut", "for deficiency related fatigue", "elemental iron", "hemp extract", "pineapple enzyme",
]);
const DENY_WORDS = /standardi[sz]ed|marketed|brand|active|compound|constituent|marker|component|found in|formerly|related|confused|distinct|context|combination|often|sold as|products|pathway|supplements|\bsyn\b|\bthe\b|\bnot\b|\balso\b|=|:/i;

// The way people and the model actually write some of these.
const EXTRA_KEYS: Record<string, string[]> = {
  "omega-3-fish-oil": ["omega-3", "omega 3", "omega-3s", "fish oils"],
  "vitamin-d3": ["vitamin d3", "vitamin d2", "vitamin d"],
  "vitamin-b12": ["b12", "vitamin b-12"],
  "rhodiola-rosea": ["rhodiola"],
  "bacopa-monnieri": ["bacopa"],
  "tribulus": ["tribulus"],
  "andrographis": ["andrographis"],
  "astragalus": ["astragalus"],
  "galphimia-glauca": ["galphimia"],
  "psyllium": ["psyllium"],
  "valerian-root": ["valerian"],
  "dandelion-root": ["dandelion"],
  "burdock": ["burdock"],
  "marshmallow-root": ["marshmallow root"],
  "artichoke-leaf": ["artichoke extract", "artichoke leaf"],
  "passionflower": ["passion flower"],
  "pine-bark": ["pine bark"],
  "l-carnitine": ["carnitine", "acetyl l carnitine", "alcar"],
  "l-theanine": ["theanine"],
  "nac": ["n acetyl cysteine", "n-acetyl cysteine"],
  "probiotics": ["probiotic"],
  "prebiotics": ["prebiotic"],
  "beta-glucans": ["beta glucan"],
  "digestive-enzymes": ["digestive enzyme"],
  "magnesium-glycinate": ["magnesium"],
  "milk-thistle": ["milk thistle"],
  "holy-basil-tulsi": ["holy basil", "tulsi"],
  "turmeric": ["turmeric", "curcumin"],
  "coq10": ["coq10", "co q10", "coenzyme q10", "ubiquinol"],
  "saccharomyces-boulardii": ["s boulardii", "boulardii"],
  "dgl-licorice": ["dgl"],
  "ashwagandha": ["ashwagandha"],
};
const NO_TRIGGER = new Set(["caffeine"]);

// The name as it reads mid-sentence: "magnesium", "milk thistle", "NAC", "Coenzyme Q10", "St. John's Wort".
const KEEP_CAPS = /^(St\.|California|Siberian|Indian|Asian|Korean|Peruvian|Oregon|Chios|French|Saccharomyces|Coenzyme)/;
function shortName(name: string): string {
  const s = name.replace(/\([^)]*\)/g, " ").split(/\s+\/\s+/)[0].replace(/\s+/g, " ").trim();
  return !KEEP_CAPS.test(s) && /^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s;
}

export function buildMatchers(ents: AtlasEntity[]): IngredientMatcher[] {
  const out: IngredientMatcher[] = [];
  for (const e of ents) {
    if (e.type !== "ingredient") continue;
    const raw = new Set<string>();
    e.name.replace(/\([^)]*\)/g, " ").split(/\s+\/\s+/).forEach((p) => raw.add(p.trim()));
    (e.name.match(/\(([^)]*)\)/g) || []).forEach((p) => p.slice(1, -1).split(/[,;/]/).forEach((x) => raw.add(x.trim())));
    String(e.also_known_as || "")
      .split(/Note:/i)[0]
      .replace(/\([^)]*\)/g, " ")
      .split(/[;,]|\s\/\s/)
      .forEach((x) => {
        const k = x.replace(/["“”]/g, "").trim();
        // "silibinin/silybin" -> both; "baker's/brewer's yeast glucan" stays whole (has spaces)
        if (!/\s/.test(k) && k.includes("/")) k.split("/").forEach((y) => raw.add(y.trim()));
        else raw.add(k);
      });
    (EXTRA_KEYS[e.slug || ""] || []).forEach((k) => raw.add(k));

    const plain = new Set<string>();
    const exact: RegExp[] = [];
    for (const k0 of raw) {
      const k = k0.trim();
      if (!k || k.length > 40 || k.split(/\s+/).length > 4) continue;
      if (/^[-/\d]/.test(k) && !/^5-HTP$/i.test(k)) continue; // split artifacts like "6-glucan", "3/1"
      if (/-1$/.test(k) || DENY_WORDS.test(k)) continue;
      const n = norm(k).trim();
      if (n.replace(/[^a-z0-9]/g, "").length < 3 || DENY_KEYS.has(n)) continue;
      // Acronyms and mixed-case codes (NAC, SAMe, PEA, CoQ10, PtdSer): exact case, whole word.
      const upper = (k.match(/[A-Z]/g) || []).length;
      if (!/\s/.test(k) && upper >= 2 && k.length <= 8) {
        const esc = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        exact.push(new RegExp(`(?<![A-Za-z0-9])${esc}s?(?![A-Za-z0-9])`));
      } else {
        plain.add(n);
        // "Probiotics" also as "probiotic"; only for long single words so "hops" never becomes "hop"
        if (!n.includes(" ") && n.length >= 8 && n.endsWith("s")) plain.add(n.slice(0, -1));
      }
    }
    out.push({ id: e.id, slug: e.slug || "", short: shortName(e.name), plain: Array.from(plain), exact, trigger: !NO_TRIGGER.has(e.slug || "") });
  }
  return out;
}

export function ingredientsNamed(text: string, matchers: IngredientMatcher[]): IngredientMatcher[] {
  const t = norm(text);
  return matchers.filter(
    (m) => m.plain.some((k) => t.includes(` ${k} `) || t.includes(` ${k}s `) || t.includes(` ${k}es `)) || m.exact.some((re) => re.test(text)),
  );
}

/* ---------- 3. The check itself ---------- */

export function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function revisionInstruction(draft: string, names: string[]): string {
  return `\n\nSAFETY CHECK: your first draft of this reply (below) named ${listNames(names)} without their FULL SAFETY NOTES in front of you. Those notes are now attached to the claims above. Revise the draft. For every ingredient you keep, put its most important safety points (who should avoid it, key medication interactions) into the reply, early. If an ingredient is not central to the answer, leave it out. Do not name any other ingredient whose FULL SAFETY NOTE is not shown above. Keep everything else that was right about the draft, follow every rule above, and reply with the revised answer only, with no preamble about revising.\n\nFIRST DRAFT:\n${draft}`;
}

export function pharmacistLine(names: string[]): string {
  const them = names.length > 1 ? "them" : "it";
  return `\n\nOne more safety point: this answer mentioned ${listNames(names)}, and NAP's full safety notes for ${them} were not part of it. Before you try ${them}, please run ${them} past a pharmacist or your prescriber, especially if you take any medication.`;
}

export type SafetyCheck = { named: string[]; revised: boolean; appended: string[] };
export type ModelCall = (system: string) => Promise<string | null>; // null = the call failed

// Runs after the first answer. `system` is the full system prompt WITHOUT the knowledge block.
// `said` is the visitor's own recent words (no guide turns); it decides which approved safety-table
// rows apply (section 5). It defaults to `conversation`.
export async function ensureSafetyNotes(opts: {
  atlas: Atlas;
  system: string;
  conversation: string;
  said?: string;
  first: { reply: string; shown: Set<string> };
  ask: ModelCall;
}): Promise<{ reply: string; check: SafetyCheck }> {
  const { atlas, system, conversation, first, ask } = opts;
  const named1 = ingredientsNamed(first.reply, atlas.matchers);
  const missing1 = named1.filter((m) => m.trigger && !first.shown.has(m.id));
  const check: SafetyCheck = { named: named1.map((m) => m.short), revised: false, appended: [] };
  if (!missing1.length) return { reply: first.reply, check };

  const force = new Set(missing1.map((m) => m.id));
  const k2 = buildKnowledge(atlas, conversation, force);
  // Approved caution / monitor rows for the ingredients the draft names ride along on the revision.
  const flags = cautionBlock(safetyHitsFor(atlas.tables, named1, opts.said ?? conversation));
  const second = await ask(system + k2.text + flags + revisionInstruction(first.reply, missing1.map((m) => m.short)));
  if (!second || !second.trim()) {
    check.appended = missing1.map((m) => m.short);
    return { reply: first.reply + pharmacistLine(check.appended), check };
  }
  const named2 = ingredientsNamed(second, atlas.matchers);
  const missing2 = named2.filter((m) => m.trigger && !k2.shown.has(m.id));
  check.named = named2.map((m) => m.short);
  check.revised = true;
  if (!missing2.length) return { reply: second, check };
  check.appended = missing2.map((m) => m.short);
  return { reply: second + pharmacistLine(check.appended), check };
}

/* ---------- 4. The structured safety layer: shared vocabulary ---------- */

// Two tables (db/2026-11-27_safety_layer.sql) turn the prose of the safety notes into fields:
// atlas_population_flags (ingredient x population -> avoid | caution) and atlas_drug_interactions
// (ingredient x drug class -> avoid | caution | monitor). The words below are the ONE vocabulary
// both sides use: scripts/draft-safety-rows.mjs matches `terms` / `drugs` inside the safety notes
// to draft rows, and the guide matches the same words (plus the everyday `said` words) in what the
// visitor wrote to decide which rows apply. Each term is matched as whole words in norm() text
// (lower case, apostrophes dropped, punctuation -> spaces); a trailing * allows any ending.

export type Population = "pregnancy" | "breastfeeding" | "children" | "kidney" | "liver" | "elderly" | "surgery" | "bleeding_risk";
export type PopulationDef = { slug: Population; label: string; terms: string[]; said: string[] };
export type DrugClassDef = { slug: string; label: string; drugs: string[]; said: string[] };

// `label` completes the sentence "<ingredient> should be avoided ...".
export const POPULATIONS: PopulationDef[] = [
  { slug: "pregnancy", label: "in pregnancy",
    terms: ["pregnan*", "prenatal", "trying to conceive", "trying to get pregnant", "trying for a baby", "expecting a baby", "first trimester", "second trimester", "third trimester", "uterine stimulant", "abortifacient", "emmenagogue", "teratogen*"],
    said: ["ttc", "ivf", "fertility treatment*"] },
  { slug: "breastfeeding", label: "while breastfeeding",
    terms: ["breastfeed*", "breast feed*", "breastfed", "breast fed", "lactat*", "nursing mother*", "nursing a baby", "nursing my baby", "while nursing", "still nursing", "breast milk", "chestfeed*"],
    said: ["pumping milk", "my milk supply"] },
  { slug: "children", label: "in children",
    terms: ["child*", "kid", "kids", "toddler*", "infant*", "baby", "babies", "newborn*", "teen", "teens", "teenager*", "adolescen*", "pediatric*", "paediatric*", "prepubertal", "boys", "girls"],
    said: ["my son", "my daughter", "my grandson", "my granddaughter", "my little one", "my little ones", "my youngest", "my oldest"] },
  // Kidney and liver: in the notes only a DISEASE context counts ("liver disease", "renal impairment"),
  // because the organ word alone appears in "metabolized by the liver" and "no change in liver function".
  // In the visitor's own words the bare organ is enough ("I want to support my liver").
  { slug: "kidney", label: "by people with kidney disease",
    terms: ["kidney disease*", "kidney impairment", "kidney failure", "kidney problem*", "kidney condition*", "kidney injury", "kidney stone*", "kidney transplant*", "renal impairment", "renal failure", "renal disease*", "renal insufficiency", "renal burden", "renal irritation", "dialysis", "ckd", "nephrotox*", "nephropathy", "stone former*"],
    said: ["kidney", "kidneys", "renal"] },
  { slug: "liver", label: "by people with liver disease",
    terms: ["liver disease*", "liver impairment", "liver failure", "liver problem*", "liver condition*", "liver injury", "liver damage", "liver toxicity", "liver transplant*", "existing liver", "advanced liver", "active liver", "hepatic impairment", "hepatic encephalopathy", "hepatic failure", "hepatic injury", "hepatic disease*", "hepatic dysfunction", "hepatic burden", "hepatitis", "cirrhosis", "cirrhotic", "fatty liver", "nafld", "hepatotox*", "dili", "abnormal lft*", "elevated liver enzymes"],
    said: ["liver", "livers", "hepatic", "liver enzymes"] },
  { slug: "elderly", label: "by older adults",
    terms: ["elderly", "older adult*", "older people", "older patients", "older men", "older women", "geriatric*", "frail*", "seniors", "senior citizen*", "nursing home*"],
    said: ["my grandmother", "my grandfather", "grandma", "grandpa", "in his 70s", "in her 70s", "in their 70s", "in his 80s", "in her 80s", "in their 80s", "in his 90s", "in her 90s", "in their 90s"] },
  { slug: "surgery", label: "around surgery",
    terms: ["surgery", "surgeries", "surgical", "surgeon*", "anesthe*", "anaesthe*", "perioperative", "preoperative", "postoperative", "pre op", "post op", "preop", "postop", "elective procedure*"],
    said: ["having an operation", "an operation on", "my operation", "going under", "dental extraction*", "wisdom teeth", "tooth pulled", "colonoscopy", "endoscopy", "biopsy"] },
  { slug: "bleeding_risk", label: "by people with a bleeding disorder",
    terms: ["bleeding disorder*", "clotting disorder*", "hemophilia", "haemophilia", "von willebrand", "thrombocytopenia", "low platelet*", "active bleeding", "peptic ulcer*", "bleeding ulcer*", "gi bleed*", "bleed easily", "bleeds easily", "bruise easily", "bruises easily", "easy bruising"],
    said: ["hemorrhag*", "haemorrhag*"] },
];

// `drugs`: medicine names and class words, matched in the notes AND in the conversation.
// `said`: conversation only (conditions and everyday phrases that imply the class).
// `label` completes "<ingredient> should be avoided with ...". No product brands in labels.
export const DRUG_CLASSES: DrugClassDef[] = [
  { slug: "anticoagulants", label: "blood thinners",
    drugs: ["blood thinner*", "anticoagul*", "antiplatelet*", "anti platelet*", "warfarin", "coumadin", "jantoven", "eliquis", "apixaban", "xarelto", "rivaroxaban", "pradaxa", "dabigatran", "savaysa", "edoxaban", "heparin", "enoxaparin", "lovenox", "fondaparinux", "plavix", "clopidogrel", "brilinta", "ticagrelor", "effient", "prasugrel", "aspirin", "doac", "doacs", "noac", "noacs"],
    said: ["blood clot*", "a clot", "afib", "atrial fibrillation", "stent", "stents", "dvt", "pulmonary embolism"] },
  { slug: "nsaids", label: "anti-inflammatory painkillers (NSAIDs)",
    drugs: ["nsaid*", "ibuprofen", "advil", "motrin", "naproxen", "aleve", "naprosyn", "diclofenac", "voltaren", "meloxicam", "mobic", "celecoxib", "celebrex", "indomethacin", "ketorolac", "toradol", "etodolac"],
    said: [] },
  { slug: "antidepressants", label: "antidepressants and other serotonin-acting medicines",
    drugs: ["antidepressant*", "ssri", "ssris", "snri", "snris", "maoi", "maois", "mao inhibitor*", "monoamine oxidase inhibitor*", "serotonergic*", "serotonin syndrome", "sertraline", "zoloft", "fluoxetine", "prozac", "escitalopram", "lexapro", "citalopram", "celexa", "paroxetine", "paxil", "fluvoxamine", "luvox", "venlafaxine", "effexor", "duloxetine", "cymbalta", "desvenlafaxine", "pristiq", "vilazodone", "vortioxetine", "trintellix", "bupropion", "wellbutrin", "trazodone", "mirtazapine", "remeron", "amitriptyline", "nortriptyline", "imipramine", "tricyclic*", "tramadol", "triptan*", "sumatriptan", "rizatriptan", "lithium", "buspirone", "buspar", "phenelzine", "nardil", "selegiline", "tranylcypromine", "linezolid", "dextromethorphan"],
    said: ["my antidepressant", "depression medication*", "depression med*", "anxiety medication*", "anxiety med*", "psych med*", "psychiatric medication*", "bipolar", "mood stabilizer*"] },
  { slug: "sedatives", label: "sedatives, sleep medicines, opioids or alcohol",
    drugs: ["sedative*", "cns depressant*", "benzodiazepine*", "benzo", "benzos", "alprazolam", "xanax", "diazepam", "valium", "lorazepam", "ativan", "clonazepam", "klonopin", "temazepam", "restoril", "zolpidem", "ambien", "eszopiclone", "lunesta", "zaleplon", "z drug*", "sleeping pill*", "sleep aid*", "sleep medication*", "sleep med*", "hypnotic*", "opioid*", "opiate*", "oxycodone", "oxycontin", "percocet", "hydrocodone", "vicodin", "norco", "morphine", "fentanyl", "methadone", "buprenorphine", "suboxone", "codeine", "tapentadol", "barbiturate*", "phenobarbital", "gabapentin", "neurontin", "pregabalin", "lyrica", "muscle relaxant*", "cyclobenzaprine", "flexeril", "baclofen", "tizanidine", "carisoprodol", "hydroxyzine", "diphenhydramine", "benadryl", "alcohol"],
    said: ["drink alcohol", "drinks alcohol", "heavy drinker", "beers", "wine", "whiskey", "vodka", "bourbon", "liquor", "nightcap", "hangover*"] },
  { slug: "antidiabetics", label: "diabetes medicines",
    drugs: ["antidiabetic*", "anti diabetic*", "diabetes medication*", "diabetes med*", "diabetic medication*", "glucose lowering drug*", "glucose lowering medication*", "blood sugar medication*", "hypoglycemic agent*", "hypoglycaemic agent*", "oral hypoglycemic*", "insulin", "metformin", "glucophage", "glipizide", "glyburide", "glimepiride", "sulfonylurea*", "pioglitazone", "actos", "sitagliptin", "januvia", "linagliptin", "tradjenta", "empagliflozin", "jardiance", "dapagliflozin", "farxiga", "canagliflozin", "invokana", "sglt2*", "semaglutide", "ozempic", "wegovy", "rybelsus", "liraglutide", "victoza", "saxenda", "dulaglutide", "trulicity", "tirzepatide", "mounjaro", "zepbound", "glp 1*", "exenatide", "acarbose"],
    said: ["diabetes", "diabetic", "prediabetes", "prediabetic", "a1c", "blood sugar"] },
  { slug: "antihypertensives", label: "blood pressure or heart medicines",
    drugs: ["antihypertensive*", "anti hypertensive*", "blood pressure medication*", "blood pressure med*", "blood pressure pill*", "blood pressure lowering drug*", "bp med*", "heart medication*", "heart med*", "cardiac medication*", "ace inhibitor*", "lisinopril", "zestril", "enalapril", "ramipril", "benazepril", "losartan", "cozaar", "valsartan", "diovan", "olmesartan", "irbesartan", "telmisartan", "arbs", "amlodipine", "norvasc", "nifedipine", "diltiazem", "verapamil", "calcium channel blocker*", "metoprolol", "lopressor", "toprol", "atenolol", "propranolol", "carvedilol", "coreg", "bisoprolol", "nebivolol", "beta blocker*", "hydrochlorothiazide", "hctz", "chlorthalidone", "furosemide", "lasix", "torsemide", "bumetanide", "spironolactone", "aldactone", "eplerenone", "diuretic*", "water pill*", "thiazide*", "potassium sparing", "clonidine", "prazosin", "minipress", "doxazosin", "hydralazine", "nitroglycerin", "isosorbide", "digoxin", "lanoxin", "amiodarone", "flecainide", "sotalol", "entresto", "sacubitril", "ivabradine"],
    said: ["high blood pressure", "hypertension", "heart failure", "arrhythmia", "afib", "atrial fibrillation"] },
  { slug: "thyroid", label: "thyroid medicines",
    drugs: ["thyroid medication*", "thyroid med*", "thyroid hormone replacement", "levothyroxine", "synthroid", "levoxyl", "unithroid", "tirosint", "euthyrox", "liothyronine", "cytomel", "armour thyroid", "np thyroid", "desiccated thyroid", "methimazole", "tapazole", "propylthiouracil", "antithyroid*"],
    said: ["thyroid", "hypothyroid*", "hyperthyroid*", "hashimoto*", "graves disease"] },
  { slug: "immunosuppressants", label: "immune-suppressing medicines",
    drugs: ["immunosuppressant*", "immunosuppressive*", "immunosuppressed", "immunocompromised", "transplant patient*", "transplant recipient*", "transplant medication*", "transplant drug*", "organ transplant*", "after a transplant", "post transplant", "anti rejection", "tacrolimus", "prograf", "cyclosporin*", "ciclosporin*", "sirolimus", "everolimus", "mycophenolate", "cellcept", "azathioprine", "imuran", "methotrexate", "prednisone", "prednisolone", "methylprednisolone", "dexamethasone", "corticosteroid*", "glucocorticoid*", "budesonide", "humira", "adalimumab", "enbrel", "etanercept", "remicade", "infliximab", "rituximab", "rituxan", "ocrevus", "biologics", "biologic drug*", "biologic therap*", "tnf inhibitor*", "tnf blocker*", "anti tnf", "jak inhibitor*", "rinvoq", "xeljanz", "tofacitinib", "upadacitinib", "abatacept", "ustekinumab", "stelara", "secukinumab", "dupixent", "dupilumab", "hydroxychloroquine", "plaquenil", "leflunomide", "sulfasalazine"],
    said: ["transplant", "transplanted", "autoimmune*", "lupus", "rheumatoid", "crohns", "crohn", "ulcerative colitis", "multiple sclerosis", "psoriasis", "on steroids", "steroids"] },
  { slug: "chemotherapy", label: "cancer treatments",
    drugs: ["chemotherap*", "chemo", "oncolog*", "cancer treatment*", "cancer therap*", "cancer drug*", "anticancer drug*", "radiation therap*", "radiotherap*", "tamoxifen", "letrozole", "anastrozole", "exemestane", "aromatase inhibitor*", "imatinib", "gleevec", "irinotecan", "cyclophosphamide", "doxorubicin", "cisplatin", "carboplatin", "paclitaxel", "docetaxel", "capecitabine", "immunotherap*", "checkpoint inhibitor*", "keytruda", "pembrolizumab", "opdivo", "nivolumab", "ipilimumab", "enzalutamide", "abiraterone", "lupron", "leuprolide"],
    said: ["cancer", "tumor", "tumour", "lymphoma", "leukemia", "melanoma", "in remission"] },
  { slug: "antiepileptics", label: "seizure medicines",
    drugs: ["antiepileptic*", "anti epileptic*", "anticonvulsant*", "anti seizure*", "antiseizure*", "seizure medication*", "seizure med*", "epilepsy medication*", "carbamazepine", "tegretol", "phenytoin", "dilantin", "valproate", "valproic acid", "divalproex", "depakote", "lamotrigine", "lamictal", "levetiracetam", "keppra", "topiramate", "topamax", "oxcarbazepine", "trileptal", "lacosamide", "vimpat", "zonisamide", "clobazam", "onfi", "primidone"],
    said: ["epilepsy", "epileptic", "seizure disorder", "my seizures", "seizures"] },
  { slug: "statins", label: "cholesterol medicines (statins)",
    drugs: ["statin", "statins", "atorvastatin", "lipitor", "simvastatin", "zocor", "rosuvastatin", "crestor", "pravastatin", "lovastatin", "pitavastatin", "cholesterol medication*", "cholesterol med*", "ezetimibe", "zetia"],
    said: ["high cholesterol", "cholesterol"] },
  { slug: "hormonal", label: "hormone therapies or birth control",
    drugs: ["oral contraceptive*", "contraceptive pill*", "contraceptives", "hormonal contracept*", "birth control*", "the pill", "estrogen therap*", "estrogen replacement*", "estradiol", "progestin*", "hormone replacement therap*", "menopausal hormone replacement", "hrt", "menopausal hormone therapy", "testosterone therap*", "testosterone replacement*", "trt", "testosterone injection*", "testosterone gel", "androgen therap*", "anabolic steroid*", "hormone therap*"],
    said: ["estrogen", "estrogens", "oestrogen", "progesterone", "iud", "nexplanon", "depo provera", "on hormones"] },
  { slug: "antiretrovirals", label: "HIV medicines",
    drugs: ["antiretroviral*", "hiv medication*", "hiv med*", "hiv drug*", "protease inhibitor*", "saquinavir", "ritonavir", "indinavir", "lopinavir", "darunavir", "atazanavir", "efavirenz", "nevirapine", "dolutegravir", "bictegravir", "biktarvy", "truvada", "descovy", "genvoya", "triumeq", "tenofovir", "emtricitabine", "hepatitis c treatment*", "sofosbuvir", "epclusa", "harvoni", "mavyret"],
    said: ["hiv", "hiv positive"] },
  { slug: "stimulants", label: "stimulant medicines (ADHD medicines)",
    drugs: ["stimulant medication*", "stimulant medicine*", "stimulant drug*", "prescription stimulant*", "with stimulants", "and stimulants", "or stimulants", "other stimulants", "adhd medication*", "adhd med*", "adhd stimulant*", "amphetamine*", "adderall", "vyvanse", "lisdexamfetamine", "dextroamphetamine", "dexedrine", "methylphenidate", "ritalin", "concerta", "focalin", "dexmethylphenidate", "modafinil", "provigil", "armodafinil", "nuvigil", "phentermine", "atomoxetine", "strattera"],
    said: ["adhd", "stimulants", "my stimulant"] },
  { slug: "antibiotics", label: "antibiotics",
    drugs: ["antibiotic*", "antibacterial drug*", "fluoroquinolone*", "quinolone*", "ciprofloxacin", "cipro", "levofloxacin", "levaquin", "moxifloxacin", "tetracycline*", "doxycycline", "minocycline", "amoxicillin", "augmentin", "penicillin*", "cephalexin", "keflex", "azithromycin", "zithromax", "z pak", "clarithromycin", "erythromycin", "metronidazole", "flagyl", "nitrofurantoin", "macrobid", "sulfamethoxazole", "bactrim", "rifampin", "rifampicin", "isoniazid"],
    said: ["on antibiotics", "a course of antibiotics", "uti"] },
  { slug: "antifungals", label: "antifungal medicines",
    drugs: ["antifungal*", "fluconazole", "diflucan", "ketoconazole", "itraconazole", "voriconazole", "terbinafine", "lamisil", "nystatin", "amphotericin", "clotrimazole", "miconazole", "griseofulvin"],
    said: [] },
  { slug: "acid_reducers", label: "acid-reducing medicines",
    drugs: ["proton pump inhibitor*", "ppi", "ppis", "omeprazole", "prilosec", "esomeprazole", "nexium", "pantoprazole", "protonix", "lansoprazole", "prevacid", "rabeprazole", "dexlansoprazole", "h2 blocker*", "h2 antagonist*", "famotidine", "pepcid", "ranitidine", "zantac", "cimetidine", "tagamet", "antacid*", "tums", "acid reducer*", "acid blocker*", "heartburn medication*", "reflux medication*"],
    said: ["reflux medicine", "gerd medication*"] },
  { slug: "antipsychotics", label: "antipsychotic or Parkinson's medicines",
    drugs: ["antipsychotic*", "neuroleptic*", "levodopa", "l dopa", "carbidopa", "sinemet", "dopamine agonist*", "pramipexole", "mirapex", "ropinirole", "requip", "rasagiline", "parkinsons medication*", "parkinson medication*", "quetiapine", "seroquel", "olanzapine", "zyprexa", "risperidone", "risperdal", "aripiprazole", "abilify", "haloperidol", "haldol", "clozapine", "clozaril", "ziprasidone", "lurasidone", "latuda", "paliperidone", "invega", "chlorpromazine"],
    said: ["parkinsons", "parkinson", "schizophrenia", "bipolar", "mood stabilizer*"] },
  { slug: "pde5_inhibitors", label: "erectile dysfunction medicines",
    drugs: ["sildenafil", "viagra", "revatio", "tadalafil", "cialis", "vardenafil", "levitra", "avanafil", "pde5 inhibitor*", "pde 5 inhibitor*", "phosphodiesterase inhibitor*", "erectile dysfunction medication*", "ed medication*", "ed med*", "ed pill*"],
    said: ["erectile dysfunction"] },
  { slug: "acetaminophen", label: "acetaminophen (paracetamol)",
    drugs: ["acetaminophen", "tylenol", "paracetamol"],
    said: [] },
];

// One regular expression for a term list, to run on norm() text: whole words, * = any ending.
export function termsRe(terms: string[]): RegExp | null {
  const parts = terms
    .map((t) => {
      const star = t.endsWith("*");
      const n = norm(star ? t.slice(0, -1) : t).trim();
      if (!n) return "";
      const esc = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return star ? `${esc}[a-z0-9]*` : esc;
    })
    .filter(Boolean);
  return parts.length ? new RegExp(`(?<![a-z0-9])(?:${parts.join("|")})(?![a-z0-9])`) : null;
}

const POP_SAID_RE = POPULATIONS.map((p) => ({ slug: p.slug, re: termsRe([...p.terms, ...p.said]) }));
const DRUG_SAID_RE = DRUG_CLASSES.map((d) => ({ slug: d.slug, re: termsRe([...d.drugs, ...d.said]) }));

// Ages the visitor states: "my 6 year old", "a 3 month old", "I'm 72", "age 80", "he is 15".
function agesSaid(n: string): { child: boolean; elderly: boolean } {
  let child = false, elderly = false;
  if (/(?<![a-z0-9])\d{1,2} (?:week|weeks|month|months) old(?![a-z0-9])/.test(n)) child = true;
  for (const m of n.matchAll(/(?<![a-z0-9])(\d{1,3}) (?:year|years|yr|yrs) old(?![a-z0-9])/g)) {
    const age = Number(m[1]);
    if (age <= 17) child = true;
    if (age >= 65) elderly = true;
  }
  for (const m of n.matchAll(/(?<![a-z0-9])(?:age|aged|i m|i am|im|he s|she s|he is|she is|turning|turned|now) (\d{2,3})(?![a-z0-9])/g)) {
    const age = Number(m[1]);
    if (age >= 65 && age <= 110) elderly = true;
    if (age >= 10 && age <= 17) child = true;
  }
  return { child, elderly };
}

/** Populations the visitor's own words bring up (not the guide's replies, which warn generically). */
export function populationsMentioned(said: string): Population[] {
  const n = norm(said);
  const out = new Set<Population>();
  for (const p of POP_SAID_RE) if (p.re && p.re.test(n)) out.add(p.slug);
  const ages = agesSaid(n);
  if (ages.child) out.add("children");
  if (ages.elderly) out.add("elderly");
  return Array.from(out);
}

/** Drug classes the visitor's own words bring up, by medicine name, class word or condition. */
export function drugClassesMentioned(said: string): string[] {
  const n = norm(said);
  return DRUG_SAID_RE.filter((d) => d.re && d.re.test(n)).map((d) => d.slug);
}

/* ---------- 5. The structured safety layer: the rules ---------- */

// route.ts loads the two tables' APPROVED rows next to the Atlas. Then:
//   * an `avoid` row for an ingredient the reply names, when the visitor's own words brought up that
//     population or a medicine in that class, adds ONE plain sentence naming the ingredient and the
//     reason (applySafetyTables, after the safety-note check);
//   * `caution` and `monitor` rows for the ingredients a draft names are attached to the revision
//     prompt (cautionBlock, inside ensureSafetyNotes).
// Only the visitor's words count (`said`), never the guide's own replies, which warn generically
// about blood thinners and pregnancy all the time. With no tables, or no approved rows, nothing here
// changes a reply.

export type PopulationFlag = { ingredient_id: string; population: string; level: string; note?: string | null };
export type DrugInteraction = { ingredient_id: string; drug_class: string; severity: string; mechanism?: string | null; note?: string | null };
export type SafetyTables = { populations: PopulationFlag[]; drugs: DrugInteraction[] };
export type SafetyHit = {
  ingredient: string; // the name as it reads mid-sentence ("ashwagandha", "NAC")
  slug: string;
  kind: "population" | "drug";
  key: string; // population slug or drug-class slug
  level: "avoid" | "caution" | "monitor";
  label: string; // completes "should be avoided ...": "in pregnancy", "with blood thinners"
  reason: string | null;
};

const POP_LABEL: Record<string, string> = Object.fromEntries(POPULATIONS.map((p) => [p.slug, p.label]));
const DRUG_LABEL: Record<string, string> = Object.fromEntries(DRUG_CLASSES.map((d) => [d.slug, d.label]));

// A row's note, as one spoken-length reason: first clause only, cut at a word, no trailing punctuation.
export function shortReason(note: string | null | undefined, max = 160): string | null {
  if (!note) return null;
  let t = String(note).split(" | ")[0].replace(/\s+/g, " ").trim();
  if (!t) return null;
  if (t.length > max) {
    t = t.slice(0, max);
    const sp = t.lastIndexOf(" ");
    if (sp > 60) t = t.slice(0, sp);
    t = t.replace(/[\s,;:(—–-]+$/, "") + "…";
  }
  if (/^[A-Z][a-z]/.test(t)) t = t[0].toLowerCase() + t.slice(1);
  return t.replace(/[.;,\s]+$/, "");
}

/** The approved rows that apply: ingredients the reply names x what the visitor's own words brought up. */
export function safetyHitsFor(tables: SafetyTables | undefined, named: IngredientMatcher[], said: string): SafetyHit[] {
  if (!tables || !named.length) return [];
  const pops = new Set<string>(populationsMentioned(said));
  const classes = new Set<string>(drugClassesMentioned(said));
  if (!pops.size && !classes.size) return [];
  const byIng = new Map(named.map((m) => [m.id, m]));
  const level = (s: string): SafetyHit["level"] => (s === "avoid" ? "avoid" : s === "monitor" ? "monitor" : "caution");
  const hits: SafetyHit[] = [];
  for (const r of tables.populations || []) {
    const m = byIng.get(r.ingredient_id);
    if (!m || !pops.has(r.population)) continue;
    hits.push({ ingredient: m.short, slug: m.slug, kind: "population", key: r.population, level: level(r.level), label: POP_LABEL[r.population] || r.population, reason: shortReason(r.note) });
  }
  for (const r of tables.drugs || []) {
    const m = byIng.get(r.ingredient_id);
    if (!m || !classes.has(r.drug_class)) continue;
    hits.push({ ingredient: m.short, slug: m.slug, kind: "drug", key: r.drug_class, level: level(r.severity), label: `with ${DRUG_LABEL[r.drug_class] || r.drug_class}`, reason: r.mechanism || shortReason(r.note) });
  }
  return hits;
}

/** Caution and monitor rows as text for the revision prompt; "" when there are none. */
export function cautionBlock(hits: SafetyHit[]): string {
  const rows = hits.filter((h) => h.level !== "avoid");
  if (!rows.length) return "";
  const lines = rows.map((h) => `- ${h.ingredient}: ${h.level} ${h.label}${h.reason ? ` — ${h.reason}` : ""}`);
  return `\n\nREVIEWED SAFETY FLAGS (structured rows approved by a reviewer; each one applies here because the person brought up that population or medicine):\n${lines.join("\n")}\nFor every ingredient you keep, carry its flag into the reply in plain words, early.`;
}

/** Avoid rows as one plain sentence; "" when there are none. One ingredient's flags are grouped. */
export function avoidSentence(hits: SafetyHit[]): string {
  const perIngredient = new Map<string, { name: string; parts: string[]; keys: Set<string> }>();
  for (const h of hits) {
    if (h.level !== "avoid") continue;
    const g = perIngredient.get(h.slug) || { name: h.ingredient, parts: [], keys: new Set<string>() };
    if (g.keys.has(h.key)) continue;
    g.keys.add(h.key);
    g.parts.push(`${h.label}${h.reason ? ` (${h.reason})` : ""}`);
    perIngredient.set(h.slug, g);
  }
  if (!perIngredient.size) return "";
  const items = Array.from(perIngredient.values()).map((g) => `${g.name} should be avoided ${g.parts.join(" and ")}`);
  return `\n\nOne more safety point from NAP's reviewed safety data, to take to your pharmacist or prescriber: ${listNames(items)}.`;
}

/** After the final reply: add the avoid sentence when an approved avoid row applies to an ingredient it names. */
export function applySafetyTables(reply: string, atlas: Atlas, said: string): { reply: string; hits: SafetyHit[]; appended: boolean } {
  const hits = safetyHitsFor(atlas.tables, ingredientsNamed(reply, atlas.matchers), said);
  const line = avoidSentence(hits);
  return { reply: line ? reply + line : reply, hits, appended: Boolean(line) };
}
