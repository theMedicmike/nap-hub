import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// SECURITY: this route was previously a fully PUBLIC, ungated dump of every atlas_entity and
// atlas_link — no PREVIEW_KEY check, no evidence-tier firewall, no "traditional use is not a
// health claim" disclaimer, and using the legacy evidence_tier column that made folk-use records
// indistinguishable from graded evidence. The gated, correctly-labeled explorer is /atlas/brain.
// Do NOT reintroduce a data-rendering page here while the site is in private preview.
export default async function AtlasRedirect() {
  redirect("/atlas/brain");
}
