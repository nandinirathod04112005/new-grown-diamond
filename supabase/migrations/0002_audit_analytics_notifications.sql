-- =============================================================================
-- Audit trail, first-party analytics, and admin notifications.
--
-- STATUS: NOT APPLIED. Written for review.
--
-- Requires 0001_admin_content_and_media.sql first, for public.is_active_admin().
--
-- The analytics section below is the one with genuine privacy and abuse
-- consequences, because it is the only table in this project that any
-- anonymous visitor may write to. Read that section's notes before applying it;
-- it is deliberately separable from the rest of the file.
-- =============================================================================

begin;

-- =============================================================================
-- audit_log — who changed what
--
-- APPEND ONLY. There is no update policy and no delete policy for anyone,
-- including admins: a log an administrator can edit is not a log. Retention is
-- handled by the scheduled delete at the bottom, which runs as a job rather
-- than as a grant to a user.
-- =============================================================================
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  -- Nullable and ON DELETE SET NULL: removing a staff account must not erase
  -- the record of what they did, and must not fail because of it either.
  actor_id    uuid references public.profiles (id) on delete set null,
  actor_email text,
  action      text not null check (action in (
                'create', 'update', 'publish', 'unpublish', 'archive',
                'restore', 'delete', 'status_change', 'media_upload',
                'media_delete', 'content_update')),
  entity_type text not null,
  entity_id   text,
  entity_label text,
  -- A SUMMARY, never the payload. The console writes {column: [before, after]}
  -- for the columns that actually changed, and only for columns on an
  -- allow-list — so a message body, a phone number or anything else personal
  -- never lands in a table that is kept for a year.
  changes     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

alter table public.audit_log enable row level security;

create policy audit_admin_read on public.audit_log
  for select to authenticated using (public.is_active_admin());

-- Insert is allowed only for a row that names the caller as the actor. Without
-- the actor_id check an admin could write entries attributed to a colleague.
create policy audit_admin_insert on public.audit_log
  for insert to authenticated
  with check (public.is_active_admin() and actor_id = auth.uid());

-- No update policy and no delete policy. RLS denies by default, so their
-- absence is the enforcement — this is deliberate, not an oversight.

create index if not exists audit_log_created_idx on public.audit_log (created_at desc);
create index if not exists audit_log_entity_idx on public.audit_log (entity_type, entity_id);

-- =============================================================================
-- notifications — durable admin alerts
-- =============================================================================
create table if not exists public.notifications (
  id          bigint generated always as identity primary key,
  kind        text not null,
  title       text not null,
  body        text,
  entity_type text,
  entity_id   text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy notifications_admin_read on public.notifications
  for select to authenticated using (public.is_active_admin());
create policy notifications_admin_insert on public.notifications
  for insert to authenticated with check (public.is_active_admin());
-- Marking one read is an update, so both halves are required.
create policy notifications_admin_update on public.notifications
  for update to authenticated
  using (public.is_active_admin()) with check (public.is_active_admin());
create policy notifications_admin_delete on public.notifications
  for delete to authenticated using (public.is_active_admin());

create index if not exists notifications_unread_idx
  on public.notifications (created_at desc) where read_at is null;

commit;

-- =============================================================================
-- ANALYTICS — apply this section only after a deliberate decision.
--
-- This is the only table in the project writable by anonymous visitors, which
-- makes it the only one with a spam and a privacy surface. What is collected
-- is constrained by the SCHEMA rather than by the client's good behaviour,
-- because the client is a browser and cannot be trusted:
--
--   * No IP address column. No user agent column. No user_id column. There is
--     nowhere to put them, so no future careless insert can add them.
--   * `path` is length-capped and must start with '/', so a full URL carrying
--     a query string of form values cannot be stored.
--   * `referrer_host` is a HOST, not a URL — the origin is useful, the path
--     someone arrived from is tracking.
--   * `session` is a random client-side id with no account behind it, kept
--     only to distinguish two visits from one; it is not a fingerprint.
--   * Retention is 90 days, enforced by a job, not by a promise.
--
-- Under GDPR this is the shape that is normally considered non-identifying,
-- but that is a decision for whoever operates the site, not for this file.
-- =============================================================================

begin;

create table if not exists public.analytics_events (
  id            bigint generated always as identity primary key,
  event         text not null check (event in ('page_view', 'enquiry_started', 'enquiry_sent')),
  path          text not null check (path ~ '^/' and length(path) <= 200),
  referrer_host text check (length(referrer_host) <= 120),
  -- Coarse on purpose: a viewport bucket is enough to know whether the site is
  -- read on phones, and is not a fingerprinting signal the way exact pixels are.
  viewport      text check (viewport in ('phone', 'tablet', 'desktop')),
  session       text not null check (length(session) between 8 and 64),
  created_at    timestamptz not null default now()
);

alter table public.analytics_events enable row level security;

-- Anonymous INSERT, and nothing else. There is deliberately no select policy
-- for anon: a visitor may contribute an event and may never read the table.
create policy analytics_public_insert on public.analytics_events
  for insert to anon, authenticated
  with check (
    -- Restated in the policy rather than left to the column constraints alone,
    -- so the rule is visible at the point access is granted.
    event in ('page_view', 'enquiry_started', 'enquiry_sent')
    and path ~ '^/'
    and length(path) <= 200
    and created_at > now() - interval '5 minutes'
    and created_at <= now() + interval '1 minute'
  );

create policy analytics_admin_read on public.analytics_events
  for select to authenticated using (public.is_active_admin());

-- No update or delete for anyone. Corrections are not a thing an event log has.

create index if not exists analytics_created_idx on public.analytics_events (created_at desc);
create index if not exists analytics_path_idx on public.analytics_events (path, created_at desc);

-- -----------------------------------------------------------------------------
-- Rate limiting.
--
-- RLS alone cannot count rows per session, so this is a trigger. It is a floor,
-- not a shield: it stops a runaway loop and casual spam, and it does not stop a
-- determined attacker with many sessions. Doing that properly needs the edge —
-- a rate limit in front of PostgREST — and this comment exists so nobody
-- mistakes the trigger for that.
-- -----------------------------------------------------------------------------
create or replace function public.analytics_rate_limit()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  recent integer;
begin
  select count(*) into recent
  from public.analytics_events
  where session = new.session
    and created_at > now() - interval '1 minute';

  if recent >= 60 then
    raise exception 'analytics rate limit exceeded for this session'
      using errcode = '53400';
  end if;

  return new;
end;
$$;

create trigger analytics_rate_limit_check
  before insert on public.analytics_events
  for each row execute function public.analytics_rate_limit();

commit;

-- =============================================================================
-- RETENTION — schedule these, do not rely on remembering.
--
-- Needs pg_cron (Supabase: Database > Extensions). Run as a job, not granted
-- to any user, so no client-side role can delete history.
--
--   select cron.schedule('analytics-retention', '0 3 * * *', $job$
--     delete from public.analytics_events where created_at < now() - interval '90 days';
--   $job$);
--
--   select cron.schedule('audit-retention', '0 4 * * 0', $job$
--     delete from public.audit_log where created_at < now() - interval '365 days';
--   $job$);
--
-- ROLLBACK
--   drop trigger if exists analytics_rate_limit_check on public.analytics_events;
--   drop function if exists public.analytics_rate_limit();
--   drop table if exists public.analytics_events, public.notifications, public.audit_log;
-- =============================================================================
