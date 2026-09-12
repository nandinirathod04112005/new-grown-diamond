-- Browser callers must not be able to invoke infrastructure event triggers.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated, service_role;

-- These SECURITY DEFINER RPCs validate auth internally, but anonymous callers
-- do not need API-level access. Keep only the role that legitimately uses each.
revoke execute on function public.admin_set_customer_status(uuid, text) from public, anon;
grant execute on function public.admin_set_customer_status(uuid, text) to authenticated, service_role;

revoke execute on function public.customer_update_own_profile(text, text, text, text) from public, anon;
grant execute on function public.customer_update_own_profile(text, text, text, text) to authenticated, service_role;

-- Fix the database-advisor warning and prevent caller-controlled object lookup.
alter function public.touch_updated_at() set search_path = pg_catalog;
