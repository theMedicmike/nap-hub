import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ error: "storage not connected" }, { status: 503 });

  try {
    const body = await req.json();

    if (body.kind === "signatory") {
      const { error } = await sb.from("contributors").insert({
        display_name: body.name,
        email: body.email,
        tier: "signatory",
        public_optin: !!body.public,
      });
      if (error) return NextResponse.json({ error: "save failed" }, { status: 502 });
      return NextResponse.json({ ok: true });
    }

    const { error } = await sb.from("contributions").insert({
      contributor_name: body.name || null,
      contributor_email: body.email || null,
      type: body.type || "new",
      title: body.title || null,
      proposal_text: body.proposal || null,
      rationale: body.rationale || null,
      target_doc: body.doc || null,
      status: "pending",
    });
    if (error) return NextResponse.json({ error: "save failed" }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
