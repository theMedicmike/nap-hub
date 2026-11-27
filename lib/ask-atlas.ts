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
export type Atlas = { links: AtlasLink[]; byId: Record<string, AtlasEntity>; matchers: IngredientMatcher[] };

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
export async function ensureSafetyNotes(opts: {
  atlas: Atlas;
  system: string;
  conversation: string;
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
  const second = await ask(system + k2.text + revisionInstruction(first.reply, missing1.map((m) => m.short)));
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
