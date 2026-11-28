-- NAP Atlas: the STRUCTURED SAFETY LAYER (gap 3 of knowledge/_CHECKPOINTS/2026-11-27_nap-system-gaps/GAPS.md).
--
-- Today every graded link carries one free-text safety_note (823-1,962 characters) and the
-- contraindications column is empty on all 184 rows. The Ask guide's code can check that the model SAW
-- a note; it cannot check that "never in pregnancy" or "not with warfarin" was obeyed, because those
-- facts are prose, not fields. These two tables make them fields:
--
--   atlas_population_flags   ingredient x population  -> avoid | caution
--   atlas_drug_interactions  ingredient x drug class  -> avoid | caution | monitor
--
-- Both are ADDITIVE: nothing existing is dropped, altered or rewritten. Rows start as status='draft'.
-- lib/ask-atlas.ts reads ONLY rows with status='approved', so until a clinician or pharmacist approves
-- a row the guide behaves exactly as before. Drafted rows come from scripts/draft-safety-rows.mjs
-- (db/2026-11-27_safety_rows.sql), which must be reviewed before it is applied.
--
-- NOT APPLIED TO PRODUCTION. To apply (Michael only, after "go"):
--   node knowledge\NAP_SITE\db-runner\runsql.js knowledge\NAP_SITE\nap-hub-repo\db\2026-11-27_safety_layer.sql

create table if not exists atlas_population_flags (
  id            uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references atlas_entities(id) on delete cascade,
  population    text not null check (population in ('pregnancy', 'breastfeeding', 'children', 'kidney', 'liver', 'elderly', 'surgery', 'bleeding_risk')),
  level         text not null check (level in ('avoid', 'caution')),
  note          text,                                   -- one plain clause; read to the visitor when level = avoid, so keep it short and literal
  source        text,                                   -- where the row came from (link ids of the safety notes it was drawn from; "no model used" or the model named)
  status        text not null default 'draft' check (status in ('draft', 'approved', 'rejected')),
  reviewed_by   text,                                   -- the clinician or pharmacist who approved or rejected it
  created_at    timestamptz not null default now(),
  unique (ingredient_id, population)
);
create index if not exists atlas_population_flags_status_idx on atlas_population_flags (status);

create table if not exists atlas_drug_interactions (
  id            uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references atlas_entities(id) on delete cascade,
  drug_class    text not null,                          -- slug from DRUG_CLASSES in lib/ask-atlas.ts (anticoagulants, antidepressants, sedatives, ...)
  severity      text not null check (severity in ('avoid', 'caution', 'monitor')),
  mechanism     text,                                   -- short: "additive bleeding risk", "additive sedation", "changes drug levels"
  note          text,                                   -- one plain clause from the evidence; read to the visitor when severity = avoid
  source        text,
  status        text not null default 'draft' check (status in ('draft', 'approved', 'rejected')),
  reviewed_by   text,
  created_at    timestamptz not null default now(),
  unique (ingredient_id, drug_class)
);
create index if not exists atlas_drug_interactions_status_idx on atlas_drug_interactions (status);

-- Same posture as api_usage: row level security on, no policies, so only the service role reads or writes.
alter table atlas_population_flags enable row level security;
alter table atlas_drug_interactions enable row level security;
