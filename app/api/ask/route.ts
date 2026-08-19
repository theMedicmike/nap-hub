import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
   - Thoughts of suicide or self-harm: the 988 Suicide and Crisis Lifeline — call or text 988 (veterans press 1) — right now. Be caring and direct.
   - Signs of serious infection or sepsis, pregnancy complications, or a child with serious symptoms: urgent professional care.
3. Never claim that NAP, or any nutrient, botanical, or terrain approach, cures, treats, or prevents any disease. Do not use the words cure, treat, reverse, or prevent in connection with any specific disease. Speak only about supporting the body's own systems, and about what research has or has not studied.
4. Be product-neutral: never name or recommend specific products, brands, supplements to buy, or where to buy anything.
5. DRUG AND SUPPLEMENT INTERACTIONS — treat this as a primary safety concern, not an afterthought. Botanicals and nutrients interact with prescription medication. Whenever the conversation touches any nutrient, botanical, or terrain support, say plainly that these can interact with prescription medications and that a pharmacist or prescribing clinician should review anything they are considering alongside what they already take. Be especially direct if they mention blood thinners, blood pressure or heart medication, diabetes medication, thyroid medication, psychiatric medication, immunosuppressants, chemotherapy, transplant medication, seizure medication, or surgery. Never suggest reducing, stopping, or replacing a prescribed medication — that is the prescribing clinician's decision alone.
6. Additional red flags requiring immediate professional care: severe or sudden abdominal pain, high fever with confusion or stiff neck, a head injury with confusion or vomiting, sudden vision loss, inability to urinate, a fall in an older adult, any symptom in an infant or young child, and any pregnancy complication or bleeding in pregnancy.
7. Always frame your help as education, and encourage working with a licensed clinician for anything specific to their situation.

TONE AND FORMAT: Write like a caring practitioner talking with someone across a table — warm, clear, humble, never preachy. Use natural, flowing sentences and short paragraphs. Do NOT use any markdown or formatting symbols: no asterisks, no bold, no bullet points, no dashes or hyphens used as bullets, no "---" dividers, and no headings. It must read like a real person speaking, because your words are often read aloud. When you draw on the Atlas, weave the evidence grade into a sentence naturally — for example, "the evidence here is strong" or "this one is still emerging" — rather than labeling it. LEAD with the safety guidance when a topic is serious: put the referral to professional care and any interaction warning EARLY in your reply, not at the end, because a long answer can be cut off before the end is ever reached. Keep replies reasonably short for the same reason. Remember: this is an early-stage educational tool, not medical advice.`;

// SAFETY-CRITICAL: only GRADED claims may be fed to the model as evidence.
// Previously this selected the legacy `evidence_tier` column with NO status filter, which pulled
// all ~69,425 links — including ~69,192 Dr. Duke folk-use ("coverage") records — and labeled every
// one to the model as an evidence grade. The traditional-is-not-evidence firewall existed only on
// the display pages; this is the one place a human actually asks a health question, so it must be
// enforced here first. Filter: scientific_tier NOT NULL (a real graded claim) AND status != coverage.
async function atlasKnowledge(): Promise<string> {
  const sb = supabaseAdmin();
  if (!sb) return "";
  const { data: links } = await sb
    .from("atlas_links")
    .select("from_entity,to_entity,relation,scientific_tier,traditional_strength,safety_note,status")
    .not("scientific_tier", "is", null)
    .neq("status", "coverage");
  const L = (links ?? []) as any[];
  if (!L.length) return "";
  const ids = Array.from(new Set(L.flatMap((l) => [l.from_entity, l.to_entity])));
  const { data: ents } = await sb.from("atlas_entities").select("id,name").in("id", ids);
  const byId: Record<string, any> = {};
  ((ents ?? []) as any[]).forEach((e) => (byId[e.id] = e));
  const lines = L.map((l) => {
    const a = byId[l.from_entity];
    const b = byId[l.to_entity];
    if (!a || !b) return "";
    const sci = String(l.scientific_tier || "").toUpperCase();
    const trad = l.traditional_strength ? `, traditional use: ${l.traditional_strength}` : "";
    const safety = l.safety_note ? ` SAFETY: ${String(l.safety_note).slice(0, 200)}` : "";
    return `[scientific evidence: ${sci}${trad}] ${a.name} — ${l.relation} — ${b.name}.${safety}`;
  }).filter(Boolean);
  const header = `\n\nNAP ATLAS — GRADED CLAIMS ONLY (${lines.length} reviewed claims; ground answers in these and nowhere else):\n`;
  const footer = `\n\nThese are the ONLY graded claims that exist. The Atlas also contains a large historical folk-use record which is deliberately EXCLUDED here because traditional use is not evidence of effectiveness. If a question is not covered by the graded claims above, say plainly that NAP has not reviewed evidence on it yet — never fill the gap from general knowledge and never present traditional use as evidence.`;
  return header + lines.join("\n") + footer;
}

/* ------------------------------------------------------------------------------------------
 * DETERMINISTIC SAFETY FLOOR — runs in CODE, before any model call.
 * Previously the ONLY crisis routing lived inside the model's system prompt, so every failure
 * path bypassed it: missing API key (503), model error (502), model drift, or a truncated reply
 * (max_tokens with the safety referral instructed to come LAST). A crisis response must never
 * depend on a network call succeeding or a model choosing to comply.
 * Mirrors the same code-level interception already used on the book site and the CtD app.
 * ---------------------------------------------------------------------------------------- */
const CRISIS_RE = /\b(suicid\w*|kill (?:myself|me)|hurt (?:myself|me)|harm (?:myself|me)|end (?:it all|my life)|take my life|want to die|better off dead|no reason to live|not worth living|can'?t go on|can'?t do this anymore|don'?t want to (?:be here|live)|self[- ]harm|cutting myself|overdose on)\b/i;

const EMERGENCY_RE = /\b(chest pain|crushing chest|heart attack|can'?t breathe|cannot breathe|trouble breathing|severe shortness of breath|stroke|face drooping|slurred speech|sudden numbness|anaphyla\w*|severe bleeding|bleeding heavily|won'?t stop bleeding|unconscious|unresponsive|seizure|overdosed|poison(?:ed|ing)|sepsis|coughing up blood|vomiting blood)\b/i;

const CRISIS_REPLY = [
  "I'm really glad you told me, and I want to make sure you're talking to a person who can help right now — not a website.",
  "Please reach the Veterans Crisis Line: call or text 988, then press 1. You can also text 838255. It's free, confidential, and available any time, day or night. If you're outside the US, please contact your local emergency number or crisis line.",
  "If you're in immediate danger, please call 911.",
  "You don't have to carry this by yourself, and reaching out was the right thing to do. I'm an educational tool and I'm not equipped to help with this — a real person is, and they're there right now.",
].join("\n\n");

const EMERGENCY_REPLY = [
  "What you're describing could be a medical emergency, so I'm not going to talk about anything else first.",
  "Please call 911 now, or get to an emergency room. If you're not in the US, call your local emergency number.",
  "Please don't wait to see if it passes, and please don't look for a natural or supportive approach for this — this needs emergency medical care right now. I'm an educational tool and I can't assess symptoms.",
].join("\n\n");

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

  // SAFETY FLOOR — before the API-key check, before the model, before anything else.
  const userText = lastUserText(messages);
  if (CRISIS_RE.test(userText)) return NextResponse.json({ reply: CRISIS_REPLY, safety: "crisis" });
  if (EMERGENCY_RE.test(userText)) return NextResponse.json({ reply: EMERGENCY_REPLY, safety: "emergency" });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "guide not connected" }, { status: 503 });
  }
  try {
    const knowledge = await atlasKnowledge();
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 2048, system: SYSTEM + knowledge, messages }),
    });
    if (!r.ok) {
      const t = await r.text();
      return NextResponse.json({ error: "model error", detail: t.slice(0, 300) }, { status: 502 });
    }
    const j = await r.json();
    const reply = j.content?.[0]?.text || "I'm here to help — could you say a bit more about what you're wondering?";
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
