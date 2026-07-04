-- NAP "Shape It" — Supabase schema
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query → Run).
-- It enables vector search, creates the canon + contribution tables, and the
-- retrieval function the /api/shape guide calls.

create extension if not exists vector;

-- The 12 founding documents
create table if not exists canon_documents (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  title         text not null,
  category      text not null,        -- core | governance | clinical | integrity
  reading_order int,
  current_version int default 1,
  updated_at    timestamptz default now()
);

-- Each principle / section = one addressable, searchable unit
create table if not exists canon_sections (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid references canon_documents(id) on delete cascade,
  document_title text,
  anchor        text,
  heading       text,
  content       text not null,
  embedding     vector(1536),
  order_index   int,
  updated_at    timestamptz default now()
);

create index if not exists canon_sections_embedding_idx
  on canon_sections using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- People building the framework
create table if not exists contributors (
  id            uuid primary key default gen_random_uuid(),
  display_name  text,
  email         text,
  public_optin  boolean default false,
  bio           text,
  tier          text default 'signatory',   -- signatory | contributor | architect
  joined_at     timestamptz default now()
);

-- Proposed contributions (nothing here edits the canon; it queues for review)
create table if not exists contributions (
  id               uuid primary key default gen_random_uuid(),
  contributor_name text,
  contributor_email text,
  type             text default 'new',        -- new | amendment
  target_doc       text,
  title            text,
  proposal_text    text,
  rationale        text,
  status           text default 'pending',    -- pending | refining | accepted | declined
  reviewer_notes   text,
  created_at       timestamptz default now(),
  reviewed_at      timestamptz
);

-- Attribution: which contributor shaped which section
create table if not exists section_attributions (
  id              uuid primary key default gen_random_uuid(),
  section_id      uuid references canon_sections(id) on delete cascade,
  contributor_id  uuid references contributors(id) on delete set null,
  contribution_id uuid references contributions(id) on delete set null,
  created_at      timestamptz default now()
);

-- Vector retrieval used by /api/shape
create or replace function match_canon_sections(
  query_embedding vector(1536),
  match_count int default 5,
  match_threshold float default 0.2
)
returns table (
  id uuid,
  document_title text,
  heading text,
  content text,
  similarity float
)
language sql stable
as $$
  select
    cs.id,
    cs.document_title,
    cs.heading,
    cs.content,
    1 - (cs.embedding <=> query_embedding) as similarity
  from canon_sections cs
  where cs.embedding is not null
    and 1 - (cs.embedding <=> query_embedding) > match_threshold
  order by cs.embedding <=> query_embedding
  limit match_count;
$$;
