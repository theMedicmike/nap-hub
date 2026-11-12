// Server-only: finds which painted art files exist in /public/universe.
// A slot code ("P3", "T4", "L12") matches the first file named "<code>.ext" or "<code>-anything.ext".
import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "public", "universe");
const EXT = /\.(png|jpe?g|webp|avif)$/i;

let cache: string[] | null = null;
function files(): string[] {
  if (cache) return cache;
  try {
    cache = fs.readdirSync(DIR).filter((f) => EXT.test(f)).sort();
  } catch {
    cache = [];
  }
  return cache;
}

export function art(code: string): string | null {
  const re = new RegExp(`^${code}(?:[-_.][^/]*)?${EXT.source}`, "i");
  const hit = files().find((f) => re.test(f) && !new RegExp(`^${code}\\d`, "i").test(f));
  return hit ? `/universe/${hit}` : null;
}
