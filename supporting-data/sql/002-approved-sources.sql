-- The usability predicate: a claim is usable if a source we approve stands
-- behind it. Paste into the SQL editor of the Ethnolib-Support project, after
-- create-tables.sql. Safe to re-run.
--
-- WHY THIS FILE EXISTS. create-tables.sql serves the public read path off
-- `rank`, and nothing sets `rank`, so every claim we have gathered is
-- invisible. The winner-picking question that `rank` was reserved for is still
-- open, and it should stay open — but we do not need it answered to be useful
-- today, because for the data we actually have the answer is much simpler:
--
--     usable = its evidence cites SLDR or Google Fonts language data.
--
-- That is provenance, not judgement, which is why it can be decided now. It is
-- also the rule docs/bundle-projection.md already committed to for the
-- exporter, so this file is that decision made executable rather than a new
-- one.
--
-- WHAT IT DOES NOT DO. It does not touch `rank`, and it does not compute
-- `rank`. The preferred_* views stay exactly as they are, waiting for whatever
-- ranking process gets built, so nothing here forecloses that decision. It
-- adds a second, narrower read path beside them.

-- The approved list, keyed by source TITLE rather than by source row. There are
-- 2,719 source rows and two distinct titles, one per dataset, because each row
-- names the individual upstream file. Trusting the title means a later import
-- from the same dataset is trusted the moment it lands, with no per-row
-- blessing — and it means adding CLDR later is one INSERT.
create table if not exists public.approved_source (
  title      text primary key,
  created_at timestamptz not null default now(),
  -- Why this source is trusted, in a sentence. Read by humans, not by code.
  note       text
);

insert into public.approved_source (title, note) values
  ('SIL Locale Data Repository (SLDR)',
   'SIL''s own locale repository. The reference our UIs already deferred to before this database existed.'),
  ('Google Fonts language data (gflanguages)',
   'Google Fonts'' language data, the source of the sample-text passages font-core already bundles.')
on conflict (title) do nothing;

alter table public.approved_source enable row level security;

-- Anyone may read the list — a reader should be able to see WHY a claim is
-- being served. Nobody may write it through the API. This is the whole security
-- story of the predicate: `source` is anon-insertable, so if approval lived in
-- a column on `source` then anyone could mint a trusted source by naming it.
-- Approval lives in a table anon cannot write, and is matched by title.
drop policy if exists anon_select on public.approved_source;
create policy anon_select on public.approved_source
  for select to anon using (true);
-- Deliberately no insert/update/delete policy: editing happens in the Supabase
-- dashboard, the same way rank and row cleanup do.

create index if not exists alphabet_evidence_source_idx
  on public.alphabet_evidence (source_id);
create index if not exists sample_text_evidence_source_idx
  on public.sample_text_evidence (source_id);
create index if not exists font_support_evidence_source_idx
  on public.font_support_evidence (source_id);

-- Does an approved source stand behind this claim? One function per claim kind
-- because the evidence tables are separate; each is a plain EXISTS.
create or replace function public.alphabet_is_approved(claim_id bigint)
  returns boolean language sql stable security invoker as $$
  select exists (
    select 1 from public.alphabet_evidence e
    join public.source s on s.id = e.source_id
    join public.approved_source a on a.title = s.title
    where e.alphabet_id = claim_id
  );
$$;

create or replace function public.sample_text_is_approved(claim_id bigint)
  returns boolean language sql stable security invoker as $$
  select exists (
    select 1 from public.sample_text_evidence e
    join public.source s on s.id = e.source_id
    join public.approved_source a on a.title = s.title
    where e.sample_text_id = claim_id
  );
$$;

create or replace function public.font_support_is_approved(claim_id bigint)
  returns boolean language sql stable security invoker as $$
  select exists (
    select 1 from public.font_support_evidence e
    join public.source s on s.id = e.source_id
    join public.approved_source a on a.title = s.title
    where e.font_support_id = claim_id
  );
$$;

-- The read path a UI uses today: one answer per writing system, from an
-- approved source, not struck down by hand.
--
-- THE TIE-BREAK. About 2% of writing systems carry more than one alphabet
-- claim (up to five), all of them from SLDR — regional and orthography-variant
-- keys landing on the same writing system. Something has to choose, and
-- create-tables.sql's `created_at desc` chooses by import order, which means it
-- chooses by the alphabetical position of a filename in the SLDR repo. That is
-- arbitrary dressed up as recency, so this order replaces it:
--
--   1. rank = 'preferred' first. Nothing sets it today, but when a human does,
--      that hand-set answer must win over any of this arithmetic.
--   2. No orthography_label before a labelled one. An unlabelled claim came in
--      under the plain tag ('de'); a labelled one is a named special case
--      ('1979 reform', or a region key like 'de_CH'). The general answer is the
--      better default for a UI that asked only for 'de-Latn'.
--   3. More distinct approved sources first — two datasets agreeing beats one.
--   4. Lowest id last, purely so the result is stable across runs. Not a
--      quality signal, and it should never be the step that decides anything.
--
-- A tie reaching step 4 means two SLDR keys give the same writing system two
-- different alphabets and we have no principled reason to prefer either. The
-- honest response is not a better sort; it is for the bundle to carry both, as
-- docs/bundle-projection.md argues. Until it does, step 4 picks one and
-- `alphabet_conflicts` below is how you find out it happened.
create or replace view public.usable_alphabets
  with (security_invoker = on) as
  select distinct on (a.language_id)
    l.bcp47, a.characters, a.orthography_label, a.rank,
    a.id as alphabet_id, a.created_at
  from public.alphabet a
  join public.language l on l.id = a.language_id
  where a.rank <> 'deprecated'
    and public.alphabet_is_approved(a.id)
  order by
    a.language_id,
    (a.rank = 'preferred') desc,
    (a.orthography_label is null) desc,
    (select count(distinct s.title)
       from public.alphabet_evidence e
       join public.source s on s.id = e.source_id
       join public.approved_source ap on ap.title = s.title
      where e.alphabet_id = a.id) desc,
    a.id;

create or replace view public.usable_sample_texts
  with (security_invoker = on) as
  select distinct on (t.language_id)
    l.bcp47, t.text, t.orthography_label, t.rank,
    t.id as sample_text_id, t.created_at
  from public.sample_text t
  join public.language l on l.id = t.language_id
  where t.rank <> 'deprecated'
    and public.sample_text_is_approved(t.id)
  order by
    t.language_id,
    (t.rank = 'preferred') desc,
    (t.orthography_label is null) desc,
    t.id;

-- Fonts are not one-per-language: several fonts can each work for a writing
-- system and that is not a conflict, so no distinct on here.
create or replace view public.usable_fonts
  with (security_invoker = on) as
  select l.bcp47, f.family_name, fs.details, fs.rank,
         fs.id as font_support_id, fs.created_at
  from public.font_support fs
  join public.language l on l.id = fs.language_id
  join public.font f on f.id = fs.font_id
  where fs.rank <> 'deprecated'
    and public.font_support_is_approved(fs.id)
  order by l.bcp47, f.family_name;

-- Where the tie-break above had to make a call nobody authorised. Read this
-- before trusting usable_alphabets for a language that appears in it.
create or replace view public.alphabet_conflicts
  with (security_invoker = on) as
  select l.bcp47, count(*) as approved_claims,
         count(*) filter (where a.orthography_label is not null) as labelled,
         string_agg(coalesce(a.orthography_label, '(unlabelled)'), ' | ' order by a.id) as labels
  from public.alphabet a
  join public.language l on l.id = a.language_id
  where a.rank <> 'deprecated'
    and public.alphabet_is_approved(a.id)
  group by l.bcp47
  having count(*) > 1
  order by count(*) desc, l.bcp47;

-- What is gathered but not usable, and why — the number that says how much of
-- this database is waiting on a decision rather than on more data. Kept
-- alongside the usable_* views on purpose: a coverage figure that counts only
-- what it is willing to show is a coverage figure that hides its own backlog.
create or replace view public.claim_visibility
  with (security_invoker = on) as
  select 'alphabet' as claim_kind,
         count(*) as claims,
         count(*) filter (where public.alphabet_is_approved(id)) as approved,
         count(*) filter (where rank = 'deprecated') as struck_down
  from public.alphabet
  union all
  select 'sample_text', count(*),
         count(*) filter (where public.sample_text_is_approved(id)),
         count(*) filter (where rank = 'deprecated')
  from public.sample_text
  union all
  select 'font_support', count(*),
         count(*) filter (where public.font_support_is_approved(id)),
         count(*) filter (where rank = 'deprecated')
  from public.font_support;
