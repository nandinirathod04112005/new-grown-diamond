-- ============================================================================
--  NOT APPLIED.  This file has never been run against the database.
-- ============================================================================
--
--  This project is not permitted to create or alter Supabase tables, RLS
--  policies or Edge Functions, so this migration is written as a PROPOSAL for
--  a human to review and run in the Supabase SQL editor.
--
--  Until it is run, /blogs shows an honest "not published yet" state. Nothing
--  in the site fabricates articles to fill the gap.
--
--  Everything below is additive: it creates one new table and its policies and
--  touches nothing that already exists.
-- ============================================================================

create table if not exists public.blogs (
  id           uuid primary key default gen_random_uuid(),

  -- The public identifier used in the URL (/blogs/:slug). Unique because it
  -- addresses the row from outside; the uuid never appears in a link.
  slug         text not null unique,

  title        text not null,
  excerpt      text,
  body         text,

  -- A key into a storage bucket, not a URL. Storing the path rather than a
  -- signed link is what lets the bucket be re-pointed or made private later
  -- without rewriting every row — the same convention diamonds.image_path uses.
  cover_path   text,

  author_name  text,

  -- Draft by default. A post is invisible to the public until someone
  -- deliberately publishes it, rather than the moment it is inserted.
  published    boolean not null default false,
  published_at timestamptz,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Anonymous visitors read this list on every page view, filtered to published
-- and ordered by date. Without this index that is a sequential scan of the
-- whole table on every load.
create index if not exists blogs_published_idx
  on public.blogs (published, published_at desc);

alter table public.blogs enable row level security;

-- ---------------------------------------------------------------------------
--  Policies
--
--  RLS is the enforcement layer. The application also filters on `published`,
--  but that filter is a convenience for readability — if it were removed
--  tomorrow, these policies would still keep drafts private.
-- ---------------------------------------------------------------------------

-- Anyone, signed in or not, may read a PUBLISHED post. Drafts are invisible:
-- the row is filtered out rather than refused, so an unpublished slug is
-- indistinguishable from one that does not exist.
drop policy if exists "blogs: public reads published" on public.blogs;
create policy "blogs: public reads published"
  on public.blogs
  for select
  to anon, authenticated
  using (published = true);

-- Writes are restricted to active administrators, decided by the EXISTING
-- public.profiles row rather than by anything the client can send. A role
-- claim in a JWT or a form field would be attacker-controlled; this is not.
drop policy if exists "blogs: admins read all" on public.blogs;
create policy "blogs: admins read all"
  on public.blogs
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.account_status = 'active'
    )
  );

drop policy if exists "blogs: admins write" on public.blogs;
create policy "blogs: admins write"
  on public.blogs
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.account_status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.account_status = 'active'
    )
  );

-- ---------------------------------------------------------------------------
--  Optional: a public bucket for cover images, matching diamond-images.
--  Uncomment only if you want blog covers stored in Supabase storage.
-- ---------------------------------------------------------------------------
-- insert into storage.buckets (id, name, public)
-- values ('blog-images', 'blog-images', true)
-- on conflict (id) do nothing;
