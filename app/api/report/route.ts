import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { checkLimit, visitorId } from "@/lib/limits";
import { CRISIS_RE, EMERGENCY_RE } from "@/lib/ask-safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stores one harm report from /report in harm_reports (db/2026-11-27_harm_reports.sql).
// No email is sent: the address is still an open decision (lib/contact.ts). The reader finds new
// rows with: select * from harm_reports where status = 'new' order by created_at.
// Order: validate (free) -> honeypot -> storage check -> usage cap -> insert, so a request that cannot be
// stored never uses up the visitor's hour.
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const cut = (v: unknown, n: number) => String(v ?? "").replace(/\r\n?/g, "\n").trim().slice(0, n);
  const taken = cut(body.taken, 1000);
  const happened = cut(body.happened, 5000);
  const when = cut(body.when, 200);
  const contact = cut(body.contact, 254);
  if (!taken || !happened) return NextResponse.json({ error: "missing" }, { status: 400 });

  // Honeypot: the form has a hidden "website" field no person sees. A bot that fills it gets a
  // quiet ok and nothing is stored.
  if (cut(body.website, 50)) return NextResponse.json({ ok: true });

  // Crisis or emergency words in the report flag the row for the reader and tell the page to show
  // the 911 / 988 card again. This is a flag, not a triage: the form is not read in real time.
  const urgent = CRISIS_RE.test(happened) || EMERGENCY_RE.test(happened);

  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: "storage not connected" }, { status: 503 });
  if (!(await checkLimit(req, "report")).ok) return NextResponse.json({ error: "limit" }, { status: 429 });

  const { error } = await sb.from("harm_reports").insert({
    what_taken: taken,
    what_happened: happened,
    when_happened: when || null,
    contact: contact || null,
    urgent,
    visitor_hash: visitorId(req),
  });
  if (error) return NextResponse.json({ error: "save failed" }, { status: 502 });
  return NextResponse.json({ ok: true, urgent });
}
