-- ============================================================
-- NEW GROWN DIAMOND — production backend verification
-- ============================================================
-- READ-ONLY. This file only SELECTs from Postgres catalogs and
-- storage.buckets. It creates nothing, changes nothing, deletes
-- nothing, and never touches application data or auth users.
--
-- How to run: Supabase Dashboard → SQL Editor → paste → Run.
-- The whole report is ONE statement, so the editor shows every
-- check in a single result grid: | section | item | result | detail |
--
-- Reading the results:
--   PASS      — present and shaped as the repository expects
--   MISSING   — run the SQL file named in the detail column
--   FAIL      — present but misconfigured (e.g. RLS disabled)
--   CHECK     — needs a human decision; read the detail column
--   INFO      — informational only, nothing required
--
-- Sections 1–7 mirror docs/PRODUCTION_BACKEND_SETUP.md. The
-- repository-side secrets scan (section 8 of the checklist) is a
-- source-code grep, not SQL — see the setup doc's SECURITY notes.
-- The storage section reads storage.buckets, which the SQL
-- Editor's role can always see.
-- ============================================================

with
expected_tables(name) as (values
  ('profiles'), ('diamonds'), ('jewellery'), ('jewellery_images'),
  ('favourites'), ('quotes'), ('holds'), ('inspections'), ('enquiries'),
  ('admin_signup_attempts'), ('site_content'), ('seo_pages')),
-- admin_signup_attempts also has RLS enabled — by design with NO policies,
-- so only the Edge Function's service-role client can touch it.
app_policy_tables(name) as (values
  ('profiles'), ('diamonds'), ('jewellery'), ('jewellery_images'),
  ('favourites'), ('quotes'), ('holds'), ('inspections'), ('enquiries'),
  ('site_content'), ('seo_pages')),
expected_buckets(id, source) as (values
  ('diamond-images',   'supabase/diamond-images-storage.sql'),
  ('jewellery-images', 'supabase/jewellery-images.sql'),
  ('site-media',       'supabase/site-media.sql')),
expected_functions(name, purpose, source) as (values
  ('is_active_admin',            'security-definer admin check used by every admin RLS policy', 'supabase/admin-customers.sql'),
  ('admin_set_customer_status',  'the only way account_status changes from the app',            'supabase/admin-customers.sql'),
  ('customer_update_own_profile','safe-fields-only profile editing RPC',                        'supabase/profiles.sql'),
  ('set_quotes_updated_at',      'updated_at maintenance',                                      'supabase/quotes.sql'),
  ('set_holds_updated_at',       'updated_at maintenance',                                      'supabase/holds.sql'),
  ('set_inspections_updated_at', 'updated_at maintenance',                                      'supabase/inspections.sql'),
  ('set_enquiries_updated_at',   'updated_at maintenance',                                      'supabase/enquiries.sql')),
expected_triggers(tbl, tg, source) as (values
  ('quotes',      'quotes_set_updated_at',      'supabase/quotes.sql'),
  ('holds',       'holds_set_updated_at',       'supabase/holds.sql'),
  ('inspections', 'inspections_set_updated_at', 'supabase/inspections.sql'),
  ('enquiries',   'enquiries_set_updated_at',   'supabase/enquiries.sql')),
expected_indexes(name, purpose, source) as (values
  ('jewellery_sku_unique_ci',        'case-insensitive unique jewellery SKU',        'supabase/jewellery-add-list.sql'),
  ('jewellery_images_one_primary',   'exactly one primary image per piece',          'supabase/jewellery-images.sql'),
  ('favourites_user_diamond_unique', 'no duplicate diamond favourite per customer',  'supabase/favourites.sql'),
  ('favourites_user_jewellery_unique','no duplicate jewellery favourite per customer','supabase/favourites.sql')),
expected_constraints(name, source) as (values
  ('favourites_product_matches_type', 'supabase/favourites.sql'),
  ('quotes_one_product',              'supabase/quotes.sql'),
  ('quotes_public_id_format',         'supabase/quotes.sql'),
  ('holds_one_product',               'supabase/holds.sql'),
  ('holds_public_id_format',          'supabase/holds.sql'),
  ('inspections_one_product',         'supabase/inspections.sql'),
  ('inspections_public_id_format',    'supabase/inspections.sql'),
  ('enquiries_public_id_format',      'supabase/enquiries.sql'),
  ('enquiries_product_reference',     'supabase/enquiries.sql'),
  ('enquiries_full_name_present',     'supabase/enquiries.sql'),
  ('enquiries_email_format',          'supabase/enquiries.sql'),
  ('enquiries_subject_present',       'supabase/enquiries.sql'),
  ('enquiries_message_length',        'supabase/enquiries.sql')),
status_tables(name) as (values
  ('quotes'), ('holds'), ('inspections'), ('enquiries')),
pub_tables as (
  select tablename, rowsecurity
    from pg_tables
   where schemaname = 'public'),
pols as (
  select tablename, policyname, cmd, array_to_string(roles, ', ') as roles
    from pg_policies
   where schemaname = 'public'),
public_checks as (
  select con.conname, rel.relname, pg_get_constraintdef(con.oid) as def
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
   where con.contype = 'c' and ns.nspname = 'public'),
public_functions as (
  select distinct pp.proname
    from pg_proc pp
    join pg_namespace pn on pn.oid = pp.pronamespace
   where pn.nspname = 'public'),
signup_triggers as (
  select t.tgname, p.proname, p.prosrc
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_proc p on p.oid = t.tgfoid
   where n.nspname = 'auth' and c.relname = 'users' and not t.tgisinternal)

-- 1 · REQUIRED TABLES ---------------------------------------------------
select '1 · required tables' as section,
       e.name as item,
       case when pt.tablename is not null then 'PASS' else 'MISSING' end as result,
       case when pt.tablename is not null
            then 'exists in schema public'
            else 'not found — run the matching supabase/*.sql (see docs/PRODUCTION_BACKEND_SETUP.md §1)'
       end as detail
  from expected_tables e
  left join pub_tables pt on pt.tablename = e.name

union all
-- 2 · ROW LEVEL SECURITY ------------------------------------------------
select '2 · row level security',
       e.name,
       case when pt.tablename is null then 'MISSING'
            when pt.rowsecurity then 'PASS'
            else 'FAIL' end,
       case when pt.tablename is null then 'table not found'
            when pt.rowsecurity then 'rowsecurity = true'
            else 'RLS IS DISABLED — run: alter table public.' || e.name || ' enable row level security;'
       end
  from expected_tables e
  left join pub_tables pt on pt.tablename = e.name

union all
-- 3 · POLICIES (one row per policy) ------------------------------------
select '3 · policies',
       p.tablename || ' · ' || p.policyname,
       upper(p.cmd),
       'roles: ' || p.roles
  from pols p
 where p.tablename in (select name from expected_tables)

union all
-- 3 · POLICIES — application tables with none are broken ----------------
select '3 · policies',
       t.name || ' · (no policies)',
       'FAIL',
       'RLS is on but no policy exists — the table is unreachable from the app; run the matching supabase/*.sql'
  from app_policy_tables t
 where t.name in (select tablename from pub_tables)
   and not exists (select 1 from pols where pols.tablename = t.name)

union all
-- 3 · POLICIES — the rate-limit table must have none ---------------------
select '3 · policies',
       'admin_signup_attempts · ' ||
       case when exists (select 1 from pols where tablename = 'admin_signup_attempts')
            then '(policies present)' else '(no policies)' end,
       case when exists (select 1 from pols where tablename = 'admin_signup_attempts')
            then 'CHECK' else 'PASS' end,
       case when exists (select 1 from pols where tablename = 'admin_signup_attempts')
            then 'expected NO policies — only the Edge Function''s service-role client should reach this table'
            else 'intentionally no policies: service-role only (rate limiting)' end
 where exists (select 1 from pub_tables where tablename = 'admin_signup_attempts')

union all
-- 4 · STORAGE BUCKETS ---------------------------------------------------
select '4 · storage buckets',
       e.id,
       case when b.id is not null then 'PASS' else 'MISSING' end,
       case when b.id is not null
            then 'public=' || b.public::text || ' · file_size_limit=' || coalesce(b.file_size_limit::text, '(none)')
            else 'not found — run ' || e.source end
  from expected_buckets e
  left join storage.buckets b on b.id = e.id

union all
-- 5 · FUNCTIONS / RPC ---------------------------------------------------
select '5 · functions & rpc',
       e.name || '()',
       case when f.proname is not null then 'PASS' else 'MISSING' end,
       e.purpose || case when f.proname is null then ' — run ' || e.source else '' end
  from expected_functions e
  left join public_functions f on f.proname = e.name

union all
-- 5 · updated_at TRIGGERS ----------------------------------------------
select '5 · functions & rpc',
       t.tbl || ' · ' || t.tg,
       case when exists (
              select 1
                from pg_trigger tr
                join pg_class c on c.oid = tr.tgrelid
                join pg_namespace n on n.oid = c.relnamespace
               where n.nspname = 'public' and c.relname = t.tbl and tr.tgname = t.tg)
            then 'PASS' else 'MISSING' end,
       'updated_at maintenance trigger' ||
       case when not exists (
              select 1
                from pg_trigger tr
                join pg_class c on c.oid = tr.tgrelid
                join pg_namespace n on n.oid = c.relnamespace
               where n.nspname = 'public' and c.relname = t.tbl and tr.tgname = t.tg)
            then ' — run ' || t.source else '' end
  from expected_triggers t

union all
-- 6 · SIGNUP → PROFILES TRIGGER ------------------------------------------
select '6 · signup trigger',
       s.tgname || ' → ' || s.proname || '()',
       case when s.prosrc ilike '%profiles%' then 'PASS' else 'CHECK' end,
       case when s.prosrc ilike '%profiles%'
            then 'creates the public.profiles row on signup'
            else 'trigger on auth.users does not reference public.profiles — review it' end
       || case when s.prosrc ilike '%customer%'
               then ' · assigns role ''customer'''
               else ' · CHECK: source does not visibly assign role ''customer''' end
       || case when s.prosrc ilike '%''admin''%'
               then ' · WARNING: source mentions ''admin'' — make sure signup can never create an admin'
               else '' end
  from signup_triggers s

union all
select '6 · signup trigger',
       '(none found on auth.users)',
       'MISSING',
       'no trigger creates profiles rows — signups will have no profile; restore the signup trigger from the auth setup'
 where not exists (select 1 from signup_triggers)

union all
-- 7 · UNIQUE INDEXES ----------------------------------------------------
select '7 · constraints & indexes',
       e.name,
       case when i.indexname is not null then 'PASS' else 'MISSING' end,
       e.purpose || case when i.indexname is null then ' — run ' || e.source else '' end
  from expected_indexes e
  left join pg_indexes i
         on i.schemaname = 'public' and i.indexname = e.name

union all
-- 7 · NAMED CHECK CONSTRAINTS -------------------------------------------
select '7 · constraints & indexes',
       e.name,
       case when c.conname is not null then 'PASS' else 'MISSING' end,
       case when c.conname is not null
            then 'on public.' || c.relname
            else 'not found — run ' || e.source end
  from expected_constraints e
  left join public_checks c on c.conname = e.name

union all
-- 7 · STATUS VALUE CHECKS (defined inline, so matched by definition) -----
select '7 · constraints & indexes',
       s.name || ' · status value check',
       case when exists (select 1 from public_checks pc
                          where pc.relname = s.name
                            and pc.def ilike '%status%in%')
            then 'PASS' else 'MISSING' end,
       case when exists (select 1 from public_checks pc
                          where pc.relname = s.name
                            and pc.def ilike '%status%in%')
            then 'status is limited to the allowed values'
            else 'no CHECK limits status — any text would be accepted; run the table''s supabase/*.sql' end
  from status_tables s

union all
-- 7 · DIAMONDS UNIQUENESS (informational) --------------------------------
select '7 · constraints & indexes',
       'diamonds · unique stock/report index',
       'INFO',
       coalesce('found: ' || (select string_agg(i.indexname, ', ')
                                from pg_indexes i
                               where i.schemaname = 'public'
                                 and i.tablename = 'diamonds'
                                 and i.indexdef ilike '%unique%'),
                'none defined by the repository SQL — duplicate stock numbers are guarded in the admin app before insert')

 order by 1, 2;
