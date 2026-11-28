-- NAP: the HARM-REPORT path (gap 4 of knowledge/_CHECKPOINTS/2026-11-27_nap-system-gaps/GAPS.md).
--
-- Until now no one could tell NAP it hurt them: no form, no address, and Ask answers are not kept.
-- /report is a plain form (what was taken, what happened, when, a way to reach you if you want one;
-- no diagnosis asked) and /api/report stores it here, rate-capped like every other route that writes.
-- No email is sent: the contact address is still Michael's open decision (lib/contact.ts).
--
-- ADDITIVE: one new table, nothing else touched. NOT APPLIED TO PRODUCTION. To apply (Michael only, after "go"):
--   node knowledge\NAP_SITE\db-runner\runsql.js knowledge\NAP_SITE\nap-hub-repo\db\2026-11-27_harm_reports.sql

create table if not exists harm_reports (
  id             uuid primary key default gen_random_uuid(),
  what_taken     text not null,                        -- the person's own words, up to 1,000 characters
  what_happened  text not null,                        -- up to 5,000 characters
  when_happened  text,                                 -- free text ("March 2026", "about two weeks ago"); optional
  contact        text,                                 -- email or phone the person chose to leave; optional; never published
  urgent         boolean not null default false,       -- code saw crisis or emergency words in the text; a flag for the reader, not a triage
  visitor_hash   text not null,                        -- sha256(salt + IP), 32 hex characters, same scheme as api_usage; the address itself is never stored
  status         text not null default 'new' check (status in ('new', 'read', 'followed_up', 'closed')),
  reviewer_notes text,
  created_at     timestamptz not null default now(),
  read_at        timestamptz
);
create index if not exists harm_reports_status_idx on harm_reports (status, created_at);

-- Row level security on, no policies: only the service role reads or writes (same as api_usage).
alter table harm_reports enable row level security;
