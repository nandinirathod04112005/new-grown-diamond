-- =============================================================================
-- Rate-limit table for the register-admin Edge Function.
--
-- STATUS: NOT VERIFIED on the live project. A 403 from the function proves
-- its secrets are present, not that this table exists. Check in Dashboard >
-- SQL Editor:  select count(*) from public.admin_signup_attempts;
-- and run this file if that errors. Re-runnable. Without the table the
-- function refuses every request (503) rather than skipping the limit.
--
-- No anon/authenticated policies on purpose: only the function's service-role
-- client reads or writes it.
-- =============================================================================

create table if not exists public.admin_signup_attempts (
  attempt_key text primary key,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.admin_signup_attempts enable row level security;

-- Deliberately no anon/authenticated policies. Only the Edge Function's
-- service-role client can read or write rate-limit records.
revoke all on table public.admin_signup_attempts from anon, authenticated;
