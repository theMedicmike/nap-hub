-- NAP: usage caps for the paid API routes (/api/ask, /api/shape, /api/speak, /api/contribute).
-- One row per (bucket, window). Buckets are either "<route>:ip:<sha256 of IP + salt>" (per-visitor, hourly)
-- or "<route>:all" (whole site, daily). The raw IP is never stored. Rows older than 2 days are deleted
-- on every call, so nothing here outlives 48 hours.
create table if not exists api_usage (
  bucket       text        not null,
  window_start timestamptz not null,
  hits         integer     not null default 0,
  primary key (bucket, window_start)
);
alter table api_usage enable row level security;  -- no policies: only the service role can touch it

-- Atomically count one hit and report whether it is within the limit.
create or replace function bump_usage(p_bucket text, p_window timestamptz, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  insert into api_usage (bucket, window_start, hits) values (p_bucket, p_window, 1)
  on conflict (bucket, window_start) do update set hits = api_usage.hits + 1
  returning hits into n;
  if random() < 0.02 then
    delete from api_usage where window_start < now() - interval '2 days';
  end if;
  return n <= p_limit;
end;
$$;
revoke all on function bump_usage(text, timestamptz, integer) from public, anon, authenticated;
