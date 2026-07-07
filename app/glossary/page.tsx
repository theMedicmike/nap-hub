import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// The glossary and the graded database are now one consolidated experience.
export default async function GlossaryRedirect() {
  redirect("/atlas/brain");
}
