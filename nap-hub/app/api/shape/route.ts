import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-sonnet-4-6";
const EMBED_MODEL = "text-embedding-3-small";

const SYSTEM = `You are the guide to the Nutraceutical Assisted Programs (NAP) framework — an early-stage, openly published prototype for a shared standard in natural, terrain-first health care. NAP is honest that it is not yet proven; a clinical pilot is designed but has no outcome data yet.

Your job is to help a visitor shape an idea into a clear contribution to the framework. In every reply:
1. If relevant canon passages are provided below, tell the person plainly whether their idea ALREADY EXISTS in the framework, PARTIALLY exists, or is NEW — and name the document.
2. If it exists, help them strengthen that principle (an amendment). If it is new, help them place it and structure it.
3. Be a warm, rigorous thinking partner. Sharpen weak ideas, ask one clarifying question when needed, never flatter.
4. Never claim to have changed the framework. You PROPOSE; a human curator reviews and credits every accepted contribution. The integrity of the standard depends on this.
5. Keep replies concise and plain-spoken. Avoid hype. Never give medical advice; NAP is a framework offered for review, not a treatment.

When the idea is well-formed, end your message with a short structured proposal:
PROPOSAL — Title: ... | Type: new or amendment | Document: ... | Summary: ... | Rationale: ...`;

interface Msg { role: string; content: string }

async function embed(text: string): Promise<number[]> {
  const r = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, 8000) }),
  });
  if (!r.ok) throw new Error("embed failed");
  const j = await r.json();
  return j.data[0].embedding;
}

async function retrieve(query: string) {
  if (!process.env.OPENAI_API_KEY || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return [];
  try {
    const embedding = await embed(query);
    const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/match_canon_sections`, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query_embedding: embedding, match_count: 5, match_threshold: 0.2 }),
    });
    if (!r.ok) return [];
    return await r.json();
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "guide not connected" }, { status: 503 });
  }
  try {
    const body = await req.json();
    const messages: Msg[] = body.messages || [];
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const query = lastUser ? lastUser.content : "";

    const matches = await retrieve(query);
    let canon = "";
    if (Array.isArray(matches) && matches.length) {
      canon =
        "\n\nRELEVANT CANON PASSAGES (retrieved for this idea):\n" +
        matches
          .map((m: { document_title?: string; heading?: string; content?: string }) =>
            `• [${m.document_title || ""}] ${m.heading || ""}\n${(m.content || "").slice(0, 700)}`
          )
          .join("\n\n");
    }

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 900,
        system: SYSTEM + canon,
        messages: messages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      return NextResponse.json({ error: "model error", detail: t.slice(0, 300) }, { status: 502 });
    }
    const j = await r.json();
    const reply = j.content?.[0]?.text || "Noted for review.";
    return NextResponse.json({ reply, matched: Array.isArray(matches) ? matches.length : 0 });
  } catch {
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
