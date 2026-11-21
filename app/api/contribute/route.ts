import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { checkLimit } from "@/lib/limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: "storage not connected" }, { status: 503 });
  if (!(await checkLimit(req, "contribute")).ok) return NextResponse.json({ error: "limit" }, { status: 429 });

  const cut = (v: unknown, n: number) => (v == null || v === "" ? null : String(v).slice(0, n));

  try {
    const body = await req.json();

    if (body.kind === "signatory") {
      const { error } = await sb.from("contributors").insert({
        display_name: cut(body.name, 120),
        email: cut(body.email, 254),
        tier: "signatory",
        public_optin: !!body.public,
      });
      if (error) return NextResponse.json({ error: "save failed" }, { status: 502 });
      return NextResponse.json({ ok: true });
    }

    const { error } = await sb.from("contributions").insert({
      contributor_name: cut(body.name, 120),
      contributor_email: cut(body.email, 254),
      type: body.type === "amendment" ? "amendment" : "new",
      title: cut(body.title, 300),
      proposal_text: cut(body.proposal, 20000),
      rationale: cut(body.rationale, 20000),
      target_doc: cut(body.doc, 200),
      status: "pending",
    });
    if (error) return NextResponse.json({ error: "save failed" }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
