-- Columns the supplier stock list carries that public.diamonds had nowhere to
-- put. Every one is additive and nullable: no existing row changes, no default
-- rewrites the table, nothing is dropped or renamed, and RLS is untouched.
--
-- Exposure is still decided by the frozen column lists in
-- src/lib/supabase/columns.js, not by the presence of a column here.

-- The 360 viewer. 20,130 of the 32,742 stones in the list have one, and it is
-- the single most useful thing a trade buyer opens before asking a price.
alter table public.diamonds add column if not exists video_url text;

-- Finish grades that sit beside polish and symmetry on any grading report.
alter table public.diamonds add column if not exists girdle text;
alter table public.diamonds add column if not exists culet text;

-- The three the lab-grown trade actually screens on, and which no grading
-- report states as a grade: BGM (brown/green/grey shade), visible milkiness,
-- and whether the stone is clean to the naked eye. A buyer filters on these
-- before clarity, so they are stored as their own columns rather than buried
-- in a notes field.
alter table public.diamonds add column if not exists shade text;
alter table public.diamonds add column if not exists milky text;
alter table public.diamonds add column if not exists eye_clean text;

-- Proportions (CA/CH/PA/PH in the supplier's sheet). Numeric because they are
-- compared and sorted, never displayed as typed.
alter table public.diamonds add column if not exists crown_angle numeric;
alter table public.diamonds add column if not exists crown_height numeric;
alter table public.diamonds add column if not exists pavilion_angle numeric;
alter table public.diamonds add column if not exists pavilion_height numeric;

comment on column public.diamonds.video_url is 'Supplier 360 viewer for this stone, as given in the stock list.';
comment on column public.diamonds.shade is 'Trade shade note, e.g. NO BGM. Not a laboratory grade.';
comment on column public.diamonds.milky is 'Trade milkiness note, e.g. NO MILKY. Not a laboratory grade.';
comment on column public.diamonds.eye_clean is 'Whether the supplier calls the stone eye clean. Not a laboratory grade.';
