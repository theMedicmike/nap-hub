import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { checkLimit, BUSY_MESSAGE } from "@/lib/limits";
import { safetyFloor, replyNamesWho, WHO_REPLY } from "@/lib/ask-safety";
import { buildKnowledge, buildMatchers, ensureSafetyNotes, applySafetyTables, type Atlas, type SafetyCheck, type SafetyHit, type SafetyTables } from "@/lib/ask-atlas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Room for the safety-note revision: an answer that named a supplement without its safety note
// gets one more model call (see lib/ask-atlas.ts), so a slow answer can take two model calls.
export const maxDuration = 60;

const MODEL = "claude-sonnet-4-6";

const SYSTEM = `You are the NAP Health Guide — a warm, plain-spoken educational guide to health through the terrain-first lens of Nutraceutical Assisted Programs (NAP). NAP looks upstream at the root drivers of chronic illness: toxic burden, nutritional insufficiency, hormonal disruption, inflammation, and gut and mitochondrial dysfunction. Your job is to help people UNDERSTAND their health and this terrain-first perspective. You are educational. You are not a doctor and you never replace one.

You are grounded in the NAP Atlas — a graded, sourced map of how conditions, drivers, systems, and ingredients connect. Relevant Atlas knowledge is provided below. Ground your answers in it. Every relationship carries an evidence grade — ESTABLISHED, STUDIED, EMERGING, MINIMAL, or NONE. Reflect those grades honestly: say plainly what is well established, what is emerging, and what is still a hypothesis. Never overstate the evidence.

HOW YOU HELP:
- Explain mechanisms and root-cause thinking in plain language — how toxic burden, inflammation, nutrient status, or hormones relate to a concern.
- Teach the terrain-first perspective and what the graded evidence in the Atlas actually shows.
- Discuss general, everyday, non-acute wellness and terrain support at an educational level.
- Be genuinely warm and curious with the person. Engage and teach — do NOT refuse or lecture when you can safely educate.

HARD SAFETY RULES — absolute, and they override everything above:
1. Never diagnose the individual. Never tell a specific person what to take, what dose, or how to treat their condition. Speak in general, educational terms only.
2. RED FLAGS — route immediately and warmly to professional care, and do NOT offer natural or terrain approaches as a treatment:
   - Cancer or suspected cancer: urge them to work with their oncologist and medical team; you may explain general terrain concepts only as supportive context, never as a treatment or cure.
   - Chest pain, signs of stroke, severe shortness of breath, severe bleeding, or any acute severe symptom: tell them to call 911 or emergency services now.
   - Thoughts of suicide or self-harm: the 988 Suicide and Crisis Lifeline — call or text 988 (veterans and their families press 1) — right now. Be caring and direct.
   - Signs of serious infection or sepsis, pregnancy complications, or a child with serious symptoms: urgent professional care.
3. Never claim that NAP, or any nutrient, botanical, or terrain approach, cures, treats, or prevents any disease. Do not use the words cure, treat, reverse, or prevent in connection with any specific disease. Speak only about supporting the body's own systems, and about what research has or has not studied.
4. Be product-neutral: never name or recommend specific products, brands, supplements to buy, or where to buy anything.
5. DRUG AND SUPPLEMENT INTERACTIONS — treat this as a primary safety concern, not an afterthought. Botanicals and nutrients interact with prescription medication. Whenever the conversation touches any nutrient, botanical, or terrain support, say plainly that these can interact with prescription medications and that a pharmacist or prescribing clinician should review anything they are considering alongside what they already take. Be especially direct if they mention blood thinners, blood pressure or heart medication, diabetes medication, thyroid medication, psychiatric medication, immunosuppressants, chemotherapy, transplant medication, seizure medication, or surgery. Never suggest reducing, stopping, or replacing a prescribed medication — that is the prescribing clinician's decision alone.
6. Additional red flags requiring immediate professional care: severe or sudden abdominal pain, high fever with confusion or stiff neck, a head injury with confusion or vomiting, sudden vision loss, inability to urinate, a fall in an older adult, any symptom in an infant or young child, and any pregnancy complication or bleeding in pregnancy.
7. Always frame your help as education, and encourage working with a licensed clinician for anything specific to their situation.
8. NAP CERTIFIES NO ONE. NAP issues no certificate, credential, or license, accredits no clinic or center, has no seal or badge, charges no fees, and takes no investors. If anyone asks how to become NAP-certified, whether they can call themselves NAP-accredited or NAP-approved, or whether they can use a NAP seal, say plainly that no such thing exists and that claiming it would not be true. Never send them to the NAP team or any other channel to ask about it.
9. Never mention, cite, or compare NAP with any international health agency, intergovernmental body, or their strategies, even to deny a link. If someone asks, say NAP is its own independent framework, and move on to how NAP grades the evidence.
10. For veterans' exposure benefits (burn pits, Camp Lejeune, Agent Orange, and others), point them to the VA and an accredited veterans service officer. Do not name filing deadlines or specific claim programs, because those change; the VA and a service officer will have the current ones.

TONE AND FORMAT: Write like a caring practitioner talking with someone across a table — warm, clear, humble, never preachy. Use natural, flowing sentences and short paragraphs. Do NOT use any markdown or formatting symbols: no asterisks, no bold, no bullet points, no dashes or hyphens used as bullets, no "---" dividers, and no headings. It must read like a real person speaking, because your words are often read aloud. When you draw on the Atlas, weave the evidence grade into a sentence naturally — for example, "the evidence here is strong" or "this one is still emerging" — rather than labeling it. LEAD with the safety guidance when a topic is serious: put the referral to professional care and any interaction warning EARLY in your reply, not at the end, because a long answer can be cut off before the end is ever reached. Keep replies reasonably short for the same reason. Remember: this is an early-stage educational tool, not medical advice.`;

// SAFETY-CRITICAL: only GRADED claims may be fed to the model as evidence.
// Previously this selected the legacy `evidence_tier` column with NO status filter, which pulled
// all ~69,425 links — including ~69,192 Dr. Duke folk-use ("coverage") records — and labeled every
// one to the model as an evidence grade. The traditional-is-not-evidence firewall existed only on
// the display pages; this is the one place a human actually asks a health question, so it must be
// enforced here first. Filter: scientific_tier NOT NULL (a real graded claim) AND status != coverage.
//
// SAFETY NOTES: every graded claim carries a full safety note (interactions, who must avoid it).
// They used to be cut to 200 characters here — after the database had already cut them to 500 —
// so the guide was reasoning from half-sentences (e.g. a sedation warning that stopped mid-word).
// Which claims carry their FULL note, and the check that every supplement the reply names had its
// note in front of the model, live in lib/ask-atlas.ts (pure functions, tested offline).
async function loadAtlas(): Promise<Atlas | null> {
  const sb = supabaseAdmin();
  if (!sb) return null;
  const { data: links } = await sb
    .from("atlas_links")
    .select("from_entity,to_entity,relation,scientific_tier,traditional_strength,safety_note,status")
    .not("scientific_tier", "is", null)
    .neq("status", "coverage");
  const L = (links ?? []) as any[];
  if (!L.length) return null;
  const ids = Array.from(new Set(L.flatMap((l) => [l.from_entity, l.to_entity])));
  const { data: ents } = await sb.from("atlas_entities").select("id,type,name,slug,also_known_as").in("id", ids);
  const E = (ents ?? []) as any[];
  const byId: Record<string, any> = {};
  E.forEach((e) => (byId[e.id] = e));
  return { links: L, byId, matchers: buildMatchers(E), tables: await loadSafetyTables(sb) };
}

// STRUCTURED SAFETY LAYER (db/2026-11-27_safety_layer.sql): population flags and drug-class
// interactions as fields, not prose. Only APPROVED rows are loaded; drafts never reach a visitor.
// If the tables are missing (migration not applied) or empty, both lists are empty and the guide
// behaves exactly as before. The rules that use them live in lib/ask-atlas.ts section 5.
async function loadSafetyTables(sb: NonNullable<ReturnType<typeof supabaseAdmin>>): Promise<SafetyTables> {
  try {
    const [p, d] = await Promise.all([
      sb.from("atlas_population_flags").select("ingredient_id,population,level,note").eq("status", "approved"),
      sb.from("atlas_drug_interactions").select("ingredient_id,drug_class,severity,mechanism,note").eq("status", "approved"),
    ]);
    return { populations: p.error ? [] : ((p.data ?? []) as any[]), drugs: d.error ? [] : ((d.data ?? []) as any[]) };
  } catch {
    return { populations: [], drugs: [] };
  }
}

// One model call. Returns the reply text, or the error detail when the API call fails.
async function askModel(system: string, messages: any[]): Promise<{ text: string } | { error: string }> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 2048, system, messages }),
  });
  if (!r.ok) return { error: (await r.text()).slice(0, 300) };
  const j = await r.json();
  return { text: String(j.content?.[0]?.text || "") };
}

/* DETERMINISTIC SAFETY FLOOR — lives in lib/ask-safety.ts (crisis, emergency, child emergency, and
 * the no-WHO rule). It runs in CODE before the usage cap, the API-key check and the model, so a
 * crisis reply never depends on a network call, a key, a model choosing to comply, or the cap. */
function lastUserText(messages: any[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "user") return String(messages[i]?.content ?? "");
  }
  return "";
}

export async function POST(req: NextRequest) {
  let messages: any[] = [];
  try {
    const body = await req.json();
    // Harden the client-supplied transcript: cap turn count and per-message length, and coerce
    // content to a string. Previously history was passed through verbatim, which let a crafted
    // request inject arbitrary context (including fake "assistant" turns) into the system frame.
    messages = ((body.messages ?? []) as any[])
      .slice(-20)
      .map((m) => ({
        role: m?.role === "assistant" ? "assistant" : "user",
        content: String(m?.content ?? "").slice(0, 4000),
      }))
      .filter((m) => m.content.trim().length > 0);
  } catch {
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }

  // SAFETY FLOOR — before the usage cap, the API-key check, the model, before anything else.
  const floor = safetyFloor(lastUserText(messages));
  if (floor) return NextResponse.json(floor);

  // Key check before the cap: a request the guide cannot answer must not use up the visitor's hour.
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "guide not connected" }, { status: 503 });
  }

  // Usage cap: after the safety floor, so a person in crisis is never turned away by a limit.
  const lim = await checkLimit(req, "ask");
  if (!lim.ok) {
    const reply = `${BUSY_MESSAGE[lim.scope]} If this is an emergency, call 911. For thoughts of suicide or crisis, call or text 988 (veterans and their families press 1).`;
    return NextResponse.json({ error: "limit", reply }, { status: 429 });
  }
  try {
    const recent = messages.slice(-6).map((m) => m.content).join("\n");
    // The visitor's own recent words, without the guide's turns: the structured safety rules key off
    // these, so the guide's generic "if you take blood thinners" never triggers its own warning.
    const said = messages.slice(-6).filter((m) => m.role === "user").map((m) => m.content).join("\n");
    const atlas = await loadAtlas();
    const k1 = atlas ? buildKnowledge(atlas, recent) : { text: "", shown: new Set<string>() };
    const first = await askModel(SYSTEM + k1.text, messages);
    if ("error" in first) {
      return NextResponse.json({ error: "model error", detail: first.error }, { status: 502 });
    }
    let reply = first.text || "I'm here to help — could you say a bit more about what you're wondering?";
    // Every supplement the reply names must have had its full Atlas safety note in front of the
    // model; if not, one revision with the notes attached, then a pharmacist line as the backstop.
    let safetyCheck: SafetyCheck | undefined;
    let safetyFlags: SafetyHit[] | undefined;
    if (atlas && first.text) {
      const out = await ensureSafetyNotes({
        atlas,
        system: SYSTEM,
        conversation: recent,
        said,
        first: { reply, shown: k1.shown },
        ask: async (system) => {
          try {
            const r = await askModel(system, messages);
            return "error" in r ? null : r.text;
          } catch {
            return null;
          }
        },
      });
      reply = out.reply;
      safetyCheck = out.check;
      // Structured safety layer: an APPROVED avoid row for an ingredient the final reply names, when the
      // visitor brought up that population or medicine, adds one plain sentence (lib/ask-atlas.ts §5).
      const flagged = applySafetyTables(reply, atlas, said);
      reply = flagged.reply;
      if (flagged.hits.length) safetyFlags = flagged.hits;
    }
    // Standing rule, enforced in code as well as in the prompt: a reply that names the WHO never ships.
    if (replyNamesWho(reply)) return NextResponse.json({ reply: WHO_REPLY, safety: "who" });
    return NextResponse.json({ reply, safetyCheck, safetyFlags });
  } catch {
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
