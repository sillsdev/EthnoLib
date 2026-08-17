-- Tables behind the deployed font chooser demo: which languages people try,
-- and what they tell us. Paste into the Supabase SQL editor once per project.
--
-- The demo is a static site with no server of ours in front of it, so the
-- browser posts straight to PostgREST with the project's anon key. That key is
-- public by design; these policies are what actually decide what a visitor can
-- do, which is: add a row to these two tables, and nothing else. In particular
-- there is no SELECT policy, so no visitor can read back what anyone else
-- (or they themselves) wrote. Read it in the Supabase dashboard, or with the
-- service role key, both of which bypass RLS.
--
-- Anyone who reads the page source can therefore post junk rows. That is the
-- price of collecting from a static site; if it becomes a problem the answer is
-- a small edge function holding a secret, not a stricter policy here.

create table if not exists public.font_demo_language_trials (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  -- The BCP-47 tag the user chose, e.g. 'frm-Latn'. The name and script are
  -- stored alongside so a report reads without joining anything: the chooser
  -- resolves them already, and its data isn't in this database.
  language_tag  text not null,
  language_name text,
  script_code   text,
  -- Random per browser tab; groups one visit's rows, identifies nobody.
  session_id    text
);

create table if not exists public.font_demo_feedback (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  message       text not null,
  -- Optional, and only ever used to reply to that person.
  email         text,
  -- What they had open when they wrote, so "this font is wrong" has a subject.
  language_tag  text,
  font_family   text,
  session_id    text
);

-- Reporting reads these by language and by date; both tables stay small, but
-- the index costs nothing and the language rollup is the whole point.
create index if not exists font_demo_language_trials_tag_idx
  on public.font_demo_language_trials (language_tag);
create index if not exists font_demo_language_trials_created_idx
  on public.font_demo_language_trials (created_at desc);
create index if not exists font_demo_feedback_created_idx
  on public.font_demo_feedback (created_at desc);

alter table public.font_demo_language_trials enable row level security;
alter table public.font_demo_feedback enable row level security;

-- Insert-only, for unauthenticated visitors. Dropping first makes the whole
-- file safe to re-run after an edit.
drop policy if exists anon_insert on public.font_demo_language_trials;
create policy anon_insert on public.font_demo_language_trials
  for insert to anon with check (true);

drop policy if exists anon_insert on public.font_demo_feedback;
create policy anon_insert on public.font_demo_feedback
  for insert to anon with check (true);

-- A rollup for reporting, read in the dashboard.
--
-- security_invoker is the load-bearing line. Without it a view runs as its
-- owner, and since Supabase grants anon SELECT on everything in `public` by
-- default, this view would hand any visitor the very rows the missing SELECT
-- policy above is there to withhold. With it, reading the view applies the
-- reader's own RLS, so anon gets nothing and the dashboard gets everything.
create or replace view public.font_demo_language_counts
  with (security_invoker = on) as
  select
    language_tag,
    max(language_name) as language_name,
    max(script_code)   as script_code,
    count(*)                     as tries,
    count(distinct session_id)   as sessions,
    max(created_at)              as last_tried
  from public.font_demo_language_trials
  group by language_tag
  order by sessions desc, tries desc;
