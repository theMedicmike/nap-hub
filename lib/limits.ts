import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Usage caps for every route that spends money (AI model, voice, database writes).
// Two caps per route: one per visitor per hour, and one for the whole site per day.
// The whole-site cap is the bill ceiling: even a bot army cannot spend past it.
// Change a number here, push, and it takes effect on the next deploy.
export const LIMITS = {
  ask:        { perVisitorPerHour: 20, sitePerDay: 400 },
  shape:      { perVisitorPerHour: 15, sitePerDay: 200 },
  speak:      { perVisitorPerHour: 30, sitePerDay: 150 },
  contribute: { perVisitorPerHour: 10, sitePerDay: 200 },
  report:     { perVisitorPerHour: 5,  sitePerDay: 100 },  // harm reports: a database write, not a model call; capped so a bot cannot fill the table
} as const;

export type Route = keyof typeof LIMITS;

// Fallback for when the database cannot be reached: a per-instance memory count, so a database
// outage never removes the cap entirely (it just becomes per-server instead of global).
const mem = new Map<string, { w: number; n: number }>();
function memBump(key: string, window: number, limit: number): boolean {
  const cur = mem.get(key);
  if (!cur || cur.w !== window) { mem.set(key, { w: window, n: 1 }); return true; }
  cur.n += 1;
  return cur.n <= limit;
}

// The visitor's scrambled code: sha256 of a salt plus the IP, 32 hex characters. Also stored with each
// harm report (visitor_hash), so the raw address is never kept anywhere.
export function visitorId(req: NextRequest): string {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  const salt = process.env.SUPABASE_SERVICE_ROLE_KEY || "nap";
  return createHash("sha256").update(salt + "|" + ip).digest("hex").slice(0, 32);
}

async function bump(bucket: string, windowStart: Date, limit: number): Promise<boolean> {
  const sb = supabaseAdmin();
  if (sb) {
    const { data, error } = await sb.rpc("bump_usage", { p_bucket: bucket, p_window: windowStart.toISOString(), p_limit: limit });
    if (!error && typeof data === "boolean") return data;
  }
  return memBump(bucket, windowStart.getTime(), limit);
}

export type LimitResult = { ok: true } | { ok: false; scope: "visitor" | "site" };

// Count this request against both caps. Call it AFTER the crisis/emergency safety floor, so a
// person in crisis always gets the crisis reply, even when the site is over its limit.
export async function checkLimit(req: NextRequest, route: Route): Promise<LimitResult> {
  const now = Date.now();
  const hour = new Date(Math.floor(now / 3_600_000) * 3_600_000);
  const day = new Date(Math.floor(now / 86_400_000) * 86_400_000);
  const L = LIMITS[route];
  if (!(await bump(`${route}:ip:${visitorId(req)}`, hour, L.perVisitorPerHour))) return { ok: false, scope: "visitor" };
  if (!(await bump(`${route}:all`, day, L.sitePerDay))) return { ok: false, scope: "site" };
  return { ok: true };
}

export const BUSY_MESSAGE = {
  visitor: "You've reached the limit for now. Please try again in an hour.",
  site: "The guide has reached its limit for today. Please come back tomorrow.",
};
