import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";

export type Category = "core" | "governance" | "clinical" | "integrity";

export interface DocMeta {
  slug: string;
  num: string;
  title: string;
  category: Category;
  desc: string;
}

export const CATEGORY_NAME: Record<Category, string> = {
  core: "Core framework",
  governance: "Governance & build",
  clinical: "Clinical application",
  integrity: "Integrity & proof",
};

export const CATEGORY_DESC: Record<Category, string> = {
  core: "The thesis: what NAP is, the science under it, and the tools it uses.",
  governance: "How the standard is governed, built, and brought to the world.",
  clinical: "Where the framework meets a real patient.",
  integrity: "Safety, proof, and an honest accounting of the limits.",
};

export const DOCS: DocMeta[] = [
  { slug: "executive-brief", num: "01", title: "NAP Executive Brief", category: "core", desc: "The essential argument in five minutes." },
  { slug: "manifesto", num: "02", title: "NAP Manifesto", category: "core", desc: "Why terrain-first care is the logical next step." },
  { slug: "evidence-compendium", num: "03", title: "NAP Evidence Compendium", category: "core", desc: "The science, with proven and unproven marked." },
  { slug: "modalities-compendium", num: "04", title: "NAP Modalities Compendium", category: "core", desc: "The clinical tools, by domain, with evidence tiers." },
  { slug: "standards-council-charter", num: "05", title: "NAP Standards Council Charter", category: "governance", desc: "The governing body, and how it stays independent." },
  { slug: "strategic-infrastructure-architecture", num: "06", title: "NAP Strategic Infrastructure Architecture", category: "governance", desc: "The phased build, from pilot to federation." },
  { slug: "coalition-outreach-playbook", num: "07", title: "NAP Coalition Outreach Playbook", category: "governance", desc: "How to introduce NAP to each audience." },
  { slug: "veteran-health-specialty-track", num: "08", title: "NAP Veteran Health Specialty Track", category: "clinical", desc: "The framework applied to the veteran population." },
  { slug: "veteran-mh-restoration-protocol", num: "09", title: "NAP Veteran Mental Health Restoration Protocol", category: "clinical", desc: "The first fully specified clinical protocol." },
  { slug: "outcome-registry-framework", num: "10", title: "NAP Outcome Registry Framework", category: "integrity", desc: "The proof engine — turning practice into evidence." },
  { slug: "clinical-safety-and-practice-standards", num: "11", title: "NAP Clinical Safety and Practice Standards", category: "integrity", desc: "Who may practice, and the safety floor." },
  { slug: "known-limitations-and-roadmap", num: "12", title: "NAP Known Limitations and Roadmap", category: "integrity", desc: "An honest ledger of what is not yet done." },
];

export function getDoc(slug: string): DocMeta | undefined {
  return DOCS.find((d) => d.slug === slug);
}

export function docsByCategory(category: Category): DocMeta[] {
  return DOCS.filter((d) => d.category === category);
}

export function getDocHtml(slug: string): string {
  const file = path.join(process.cwd(), "content", `${slug}.md`);
  const md = fs.readFileSync(file, "utf8");
  return marked.parse(md, { async: false }) as string;
}
