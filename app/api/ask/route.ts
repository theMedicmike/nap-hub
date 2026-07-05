import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-sonnet-4-6";

const SYSTEM = `You are the NAP Health Guide — a warm, plain-spoken educational guide to health through the terrain-first lens of Nutraceutical Assisted Programs (NAP). NAP looks upstream at the root drivers of chronic illness: toxic burden, nutritional insufficiency, hormonal disruption, inflammation, and gut and mitochondrial dysfunction. Your job is to help people UNDERSTAND their health and this terrain-first perspective. You are educational. You are not a doctor and you never replace one.

You are grounded in the NAP Atlas — a graded, sourced map of how conditions, drivers, systems, and ingredients connect. Relevant Atlas knowledge is provided below. Ground your answers in it. Every relationship carries an evidence grade — STRONG, MODERATE, or EMERGING. Reflect those grades honestly: say plainly what is well established, what is emerging, and what is still a hypothesis. Never overstate the evidence.

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
3. Never claim that NAP, or any nutrient, botanical, or terrain approach, cures, treats, or prevents any serious disease.
4. Be product-neutral: never name or recommend specific products, brands, supplements to buy, or where to buy anything.
5. Always frame your help as education, and encourage working with a licensed clinician for anything specific to their situation.

TONE: warm, clear, humble, never preachy. Short paragraphs. No hype words. When you draw on the Atlas, mention the evidence grade. End any serious-topic reply by pointing to the right professional care. Remember: this is an early-stage educational tool, not medical advice.`;

async function atlasKnowledge(): Promise<string> {
  const sb = supabaseAdmin();
  if (!sb) return "";
  const { data: ents } = await sb.from("atlas_entities").select("id,type,name,summary");
  const { data: links } = await sb.from("atlas_links").select("from_entity,to_entity,relation,evidence_tier,notes");
  const E = (ents ?? []) as any[];
  const L = (links ?? []) as any[];
  if (!L.length) return "";
  const byId: Record<string, any> = {};
  E.forEach((e) => (byId[e.id] = e));
  const lines = L.map((l) => {
    const a = byId[l.from_entity];
    const b = byId[l.to_entity];
    if (!a || !b) return "";
    return `[${String(l.evidence_tier || "").toUpperCase()}] ${a.name} — ${l.relation} — ${b.name}${l.notes ? ` (${l.notes})` : ""}`;
  }).filter(Boolean);
  return "\n\nNAP ATLAS KNOWLEDGE (ground answers in this; each line ends with its evidence grade and source):\n" + lines.join("\n");
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "guide not connected" }, { status: 503 });
  }
  try {
    const body = await req.json();
    const messages = ((body.messages ?? []) as any[]).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));
    const knowledge = await atlasKnowledge();
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 1024, system: SYSTEM + knowledge, messages }),
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
