import { supabaseAdmin } from "./supabase";

export interface AtlasEntity {
  id: string;
  type: string;
  name: string;
  slug: string;
  summary: string | null;
}

export interface AtlasLink {
  id: string;
  from_entity: string;
  to_entity: string;
  relation: string;
  evidence_tier: string;
  notes: string | null;
}

export interface Connection {
  other: AtlasEntity;
  relation: string;
  tier: string;
  notes: string | null;
  outgoing: boolean;
}

export const TYPE_LABEL: Record<string, string> = {
  system: "Biological systems",
  driver: "Drivers & exposures",
  condition: "Conditions",
  nutrient: "Ingredients & nutrients",
  modality: "Modalities",
};

export const TYPE_ORDER = ["condition", "driver", "system", "nutrient", "modality"];

export function tierStyle(tier: string): { bg: string; color: string; label: string } {
  switch ((tier || "").toLowerCase()) {
    case "strong":
      return { bg: "#E1F0E6", color: "#2f6b45", label: "Strong" };
    case "moderate":
      return { bg: "#F7EAD0", color: "#8a6414", label: "Moderate" };
    case "emerging":
      return { bg: "#ECEDF1", color: "#4a5568", label: "Emerging" };
    default:
      return { bg: "#EEE7D6", color: "#7a6a45", label: "Framework" };
  }
}

export async function getAllEntities(): Promise<AtlasEntity[]> {
  const sb = supabaseAdmin();
  if (!sb) return [];
  const { data } = await sb
    .from("atlas_entities")
    .select("id,type,name,slug,summary")
    .order("type", { ascending: true })
    .order("name", { ascending: true });
  return (data ?? []) as AtlasEntity[];
}

export async function getEntity(slug: string): Promise<AtlasEntity | null> {
  const sb = supabaseAdmin();
  if (!sb) return null;
  const { data } = await sb
    .from("atlas_entities")
    .select("id,type,name,slug,summary")
    .eq("slug", slug)
    .maybeSingle();
  return (data as AtlasEntity) ?? null;
}

export async function getConnections(entity: AtlasEntity): Promise<Connection[]> {
  const sb = supabaseAdmin();
  if (!sb) return [];

  const { data: linkData } = await sb
    .from("atlas_links")
    .select("id,from_entity,to_entity,relation,evidence_tier,notes")
    .or(`from_entity.eq.${entity.id},to_entity.eq.${entity.id}`);
  const links = (linkData ?? []) as AtlasLink[];
  if (!links.length) return [];

  const otherIds = Array.from(
    new Set(links.map((l) => (l.from_entity === entity.id ? l.to_entity : l.from_entity)))
  );

  const { data: entData } = await sb
    .from("atlas_entities")
    .select("id,type,name,slug,summary")
    .in("id", otherIds);
  const others = (entData ?? []) as AtlasEntity[];
  const byId = new Map(others.map((e) => [e.id, e]));

  const connections: Connection[] = [];
  for (const l of links) {
    const outgoing = l.from_entity === entity.id;
    const otherId = outgoing ? l.to_entity : l.from_entity;
    const other = byId.get(otherId);
    if (!other) continue;
    connections.push({ other, relation: l.relation, tier: l.evidence_tier, notes: l.notes, outgoing });
  }
  return connections;
}

export function isAtlasConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
