import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ElevenLabs voice. "Clyde" (2EiwWnXFnvU5JabPnv8n) = a rugged middle-aged American
// male — a war-veteran voice. To use a different voice, open ElevenLabs → Voices →
// the "..." menu on a voice → Copy Voice ID, and paste it here.
const VOICE_ID = "2EiwWnXFnvU5JabPnv8n";
const ELEVEN_MODEL = "eleven_turbo_v2_5";

export async function POST(req: NextRequest) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return new Response("voice not connected", { status: 503 });
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") return new Response("no text", { status: 400 });
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: "POST",
      headers: {
        "xi-api-key": key,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: text.slice(0, 2500),
        model_id: ELEVEN_MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.15, use_speaker_boost: true },
      }),
    });
    if (!r.ok) return new Response("tts error", { status: 502 });
    const audio = await r.arrayBuffer();
    return new Response(audio, {
      status: 200,
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch {
    return new Response("server error", { status: 500 });
  }
}
