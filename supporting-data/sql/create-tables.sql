-- Community claims about writing systems: the alphabet, sample texts, and fonts
-- that work, for languages our shipped data doesn't cover. Paste into the SQL
-- editor of the Ethnolib-Support Supabase project (NOT the demo-telemetry
-- project; that one's file is the font chooser demo's
-- src/demos/tools/supabase-tables.sql). Safe to re-run. The README one level
-- up explains the model and the intent.
--
-- The shape, borrowed from Wikidata's statement model: a VALUE row is one
-- distinct claim ("the aa-Latn alphabet is these letters"), and everything
-- about whether to believe it hangs off that row. EVIDENCE rows say who
-- submitted it and what, if anything, they were citing — three people
-- submitting the same alphabet converge on one value row with three evidence
-- rows, which is what makes "how supported is this claim" a count instead of a
-- cleanup job. ENDORSEMENT rows are people agreeing or disputing ("misspelled",
-- "offensive", "that's the old orthography"). Conflicting values for the same
-- language simply coexist as sibling rows.
--
-- How a winner gets picked is deliberately undecided — by a person, by an
-- algorithm over endorsements, by something else; we have not chosen. The
-- `rank` column (preferred | normal | deprecated, after Wikidata) is where
-- that decision will land when it exists, with the why in rank_note. Nothing
-- computes it, and nothing writing through the API can set it. The
-- preferred_* views at the bottom are the public read path, and they serve
-- only preferred rows — so until some ranking process exists, gathered data
-- is gathered and nothing more.
--
-- Tags include the script: a language doesn't have an alphabet, a writing
-- system does (Serbian has one in Cyrillic and one in Latin, and they are not
-- in conflict). So `bcp47` must carry a script subtag — 'sr-Cyrl', not 'sr' —
-- and rival orthographies in the SAME script coexist as parallel alphabet rows
-- telling each other apart by orthography_label.
--
-- Unlike the demo-telemetry tables, this data is meant to be read by anyone:
-- anon gets SELECT nearly everywhere, and the browser writes with plain
-- PostgREST inserts (GET first to find an existing row, then POST — low
-- volume, nothing sensitive, and an occasional timing duplicate is a cleanup,
-- not a crisis). The one thing withheld is person.email, by a column-level
-- grant: it exists only so a human can follow up with a contributor.

create table if not exists public.language (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  -- Must include a script subtag; see the header. Stored as submitted, matched
  -- case-insensitively (the unique index below).
  bcp47      text not null,
  -- A convenience label for reading the dashboard. Names are themselves
  -- contested territory (endonym vs Ethnologue name); this is not data.
  name       text
);

create table if not exists public.alphabet (
  id                bigint generated always as identity primary key,
  created_at        timestamptz not null default now(),
  language_id       bigint not null references public.language (id),
  -- Space-separated entries in the order submitted, the shape the font
  -- chooser's parseAlphabet reads. Multigraphs like 'ch' are one entry.
  characters        text not null,
  -- The identity of the claim: NFC, entries sorted, single-spaced. Computed by
  -- the client (we trust it exactly as far as we trust the insert itself).
  -- Sorted, so the same inventory in a different order is the same claim —
  -- but NOT case-folded, since whether uppercase forms exist is information.
  characters_key    text not null,
  -- Which orthography, when several share a script: "1979 reform", "Catholic".
  -- Not part of the identity; a conflicting label on an identical inventory is
  -- editor cleanup, not a new row.
  orthography_label text,
  rank              text not null default 'normal',
  rank_note         text
);

create table if not exists public.sample_text (
  id                bigint generated always as identity primary key,
  created_at        timestamptz not null default now(),
  language_id       bigint not null references public.language (id),
  text              text not null,
  -- NFC, whitespace collapsed, trimmed. Same trust story as characters_key.
  text_key          text not null,
  -- A text is written in one orthography.
  orthography_label text,
  rank              text not null default 'normal',
  rank_note         text
);

create table if not exists public.font (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  -- Identified by family name alone. Versions and forks (Charis vs Charis SIL)
  -- are real, but modelling them starts with rows we don't have yet.
  family_name text not null
);

-- "This font works for this writing system." One row per (language, font),
-- so an endorsement is about one font, not a list.
create table if not exists public.font_support (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  language_id bigint not null references public.language (id),
  font_id     bigint not null references public.font (id),
  -- The OpenType feature settings SLDR records on <sil:font features="...">,
  -- as tag -> value: {"cv43": 0, "cv46": 1}. Stylistic sets (ssXX) live here too,
  -- which is why the column is named after the standard rather than after
  -- character variants. The value picks one of the font's own named forms,
  -- 1-based, and 0 means the font's default; the names themselves are in the
  -- font binary, not here. null means the source named none. See
  -- sql/003-opentype-features.sql for the rename this column went through.
  opentype_features jsonb,
  rank        text not null default 'normal',
  rank_note   text
);

create table if not exists public.source (
  id               bigint generated always as identity primary key,
  created_at       timestamptz not null default now(),
  type             text,
  title            text,
  url              text,
  author           text,
  publication_date date
);

create table if not exists public.person (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name       text,
  -- Unverified, and only ever used to follow up with the contributor. Never
  -- readable through the API (see the grant below). Duplicate rows for the
  -- same email are tolerated and merged when someone reads the data.
  email      text
);

-- Evidence: who put a value forward, citing what. Contributor with no source =
-- their own knowledge; source with no contributor = a bulk import.
create table if not exists public.alphabet_evidence (
  id             bigint generated always as identity primary key,
  created_at     timestamptz not null default now(),
  alphabet_id    bigint not null references public.alphabet (id),
  source_id      bigint references public.source (id),
  contributor_id bigint references public.person (id),
  details        text,
  -- Which app or script wrote the row, and the writer's per-tab session id,
  -- same as the telemetry tables: 'demo' | 'usertest' | 'import' | ...
  submitted_via  text,
  session_id     text
);

create table if not exists public.sample_text_evidence (
  id             bigint generated always as identity primary key,
  created_at     timestamptz not null default now(),
  sample_text_id bigint not null references public.sample_text (id),
  source_id      bigint references public.source (id),
  contributor_id bigint references public.person (id),
  details        text,
  submitted_via  text,
  session_id     text
);

create table if not exists public.font_support_evidence (
  id              bigint generated always as identity primary key,
  created_at      timestamptz not null default now(),
  font_support_id bigint not null references public.font_support (id),
  source_id       bigint references public.source (id),
  contributor_id  bigint references public.person (id),
  details         text,
  submitted_via   text,
  session_id      text
);

-- Endorsements: a person's judgement of a value that already exists. Duplicate
-- votes from one person are allowed on purpose — enforcing uniqueness would
-- need an upsert the anon write path can't do — and readers take each person's
-- latest row, so changing your mind works and repeating yourself doesn't count
-- twice (see endorsement_tallies).
create table if not exists public.alphabet_endorsement (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  alphabet_id   bigint not null references public.alphabet (id),
  person_id     bigint not null references public.person (id),
  stance        text not null,  -- 'endorse' | 'dispute'
  comment       text,           -- e.g. "misspelled", "offensive", "old orthography"
  submitted_via text,
  session_id    text
);

create table if not exists public.sample_text_endorsement (
  id             bigint generated always as identity primary key,
  created_at     timestamptz not null default now(),
  sample_text_id bigint not null references public.sample_text (id),
  person_id      bigint not null references public.person (id),
  stance         text not null,
  comment        text,
  submitted_via  text,
  session_id     text
);

create table if not exists public.font_support_endorsement (
  id              bigint generated always as identity primary key,
  created_at      timestamptz not null default now(),
  font_support_id bigint not null references public.font_support (id),
  person_id       bigint not null references public.person (id),
  stance          text not null,
  comment         text,
  submitted_via   text,
  session_id      text
);

-- Guarded because `add constraint` has no `if not exists`, and re-running the
-- file must not fail.
do $$
begin
  -- A 4-letter subtag after the language subtag can only be a script, and a
  -- tag without one is the mistake this whole file exists to avoid.
  if not exists (select 1 from pg_constraint where conname = 'language_bcp47_has_script_check') then
    alter table public.language add constraint language_bcp47_has_script_check
      check (bcp47 ~ '-[A-Za-z]{4}(-|$)');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'alphabet_rank_check') then
    alter table public.alphabet add constraint alphabet_rank_check
      check (rank in ('preferred', 'normal', 'deprecated'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sample_text_rank_check') then
    alter table public.sample_text add constraint sample_text_rank_check
      check (rank in ('preferred', 'normal', 'deprecated'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'font_support_rank_check') then
    alter table public.font_support add constraint font_support_rank_check
      check (rank in ('preferred', 'normal', 'deprecated'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'alphabet_characters_nonempty_check') then
    alter table public.alphabet add constraint alphabet_characters_nonempty_check
      check (btrim(characters) <> '' and btrim(characters_key) <> '');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sample_text_nonempty_check') then
    alter table public.sample_text add constraint sample_text_nonempty_check
      check (btrim(text) <> '' and btrim(text_key) <> '');
  end if;
  -- A sample text is a few sentences, and a submission form is a box anyone can
  -- paste a novel into. 3000 characters is far past anything real — the longest
  -- of gflanguages' 755 passages is 1664 — so this turns away abuse and
  -- accidents without having an opinion about any genuine text. Counted in
  -- characters rather than bytes on purpose: the same passage in Myanmar or
  -- Ethiopic is three times the bytes of its Latin equivalent, and a limit that
  -- fell harder on those scripts would be the wrong limit.
  if not exists (select 1 from pg_constraint where conname = 'sample_text_not_a_novel_check') then
    alter table public.sample_text add constraint sample_text_not_a_novel_check
      check (char_length(text) <= 3000);
  end if;
  -- The same door stands open on the alphabet field, so a limit closes it here
  -- too, but a much looser one. An alphabet field is not always an alphabet: the
  -- SLDR writes Han and Hangul inventories into it, and its Korean entry is
  -- 11,172 syllables and 22,343 characters. 25,000 is past the largest set any
  -- source we read publishes and still turns away a pasted novel.
  if not exists (select 1 from pg_constraint where conname = 'alphabet_not_a_novel_check') then
    alter table public.alphabet add constraint alphabet_not_a_novel_check
      check (char_length(characters) <= 25000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'font_family_name_nonempty_check') then
    alter table public.font add constraint font_family_name_nonempty_check
      check (btrim(family_name) <> '');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'alphabet_endorsement_stance_check') then
    alter table public.alphabet_endorsement add constraint alphabet_endorsement_stance_check
      check (stance in ('endorse', 'dispute'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sample_text_endorsement_stance_check') then
    alter table public.sample_text_endorsement add constraint sample_text_endorsement_stance_check
      check (stance in ('endorse', 'dispute'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'font_support_endorsement_stance_check') then
    alter table public.font_support_endorsement add constraint font_support_endorsement_stance_check
      check (stance in ('endorse', 'dispute'));
  end if;
end $$;

-- Identity of each kind of row: one language per tag, one claim per distinct
-- value per language, one support row per (language, font). The client GETs
-- before POSTing; these indexes make a lost race a 409 instead of a duplicate.
--
-- The two claim indexes hold a hash of the key rather than the key. A btree
-- index row cannot exceed 2704 bytes, and indexing the key itself meant an
-- inventory over that size could not be stored at all — which cost us seven SLDR
-- entries, the Yi syllabary among them, and fell hardest on the scripts that
-- spend three bytes a character. A hash is fixed-width, so length no longer
-- decides anything. See
-- supabase/migrations/20260819104500_hash_identity_indexes.sql.
--
-- sha256() takes bytea and convert_to() is how text gets there, but convert_to
-- is STABLE — its answer depends on the server encoding — and an index
-- expression must be IMMUTABLE. The wrapper is declared immutable, which holds
-- exactly as long as this database stays UTF8. Supabase offers no other.
create or replace function public.identity_hash(key text)
  returns bytea
  language sql
  immutable
  strict
  parallel safe
as $$ select sha256(convert_to(key, 'UTF8')) $$;

create unique index if not exists language_bcp47_idx
  on public.language (lower(btrim(bcp47)));
create unique index if not exists alphabet_identity_idx
  on public.alphabet (language_id, public.identity_hash(characters_key));
create unique index if not exists sample_text_identity_idx
  on public.sample_text (language_id, public.identity_hash(text_key));
create unique index if not exists font_family_name_idx
  on public.font (lower(btrim(family_name)));
create unique index if not exists font_support_identity_idx
  on public.font_support (language_id, font_id);

-- Everything about a claim is looked up from the claim's row.
create index if not exists alphabet_language_idx on public.alphabet (language_id, rank);
create index if not exists sample_text_language_idx on public.sample_text (language_id, rank);
create index if not exists font_support_language_idx on public.font_support (language_id, rank);
create index if not exists alphabet_evidence_claim_idx on public.alphabet_evidence (alphabet_id);
create index if not exists sample_text_evidence_claim_idx on public.sample_text_evidence (sample_text_id);
create index if not exists font_support_evidence_claim_idx on public.font_support_evidence (font_support_id);
create index if not exists alphabet_endorsement_claim_idx on public.alphabet_endorsement (alphabet_id);
create index if not exists sample_text_endorsement_claim_idx on public.sample_text_endorsement (sample_text_id);
create index if not exists font_support_endorsement_claim_idx on public.font_support_endorsement (font_support_id);

alter table public.language enable row level security;
alter table public.alphabet enable row level security;
alter table public.sample_text enable row level security;
alter table public.font enable row level security;
alter table public.font_support enable row level security;
alter table public.source enable row level security;
alter table public.person enable row level security;
alter table public.alphabet_evidence enable row level security;
alter table public.sample_text_evidence enable row level security;
alter table public.font_support_evidence enable row level security;
alter table public.alphabet_endorsement enable row level security;
alter table public.sample_text_endorsement enable row level security;
alter table public.font_support_endorsement enable row level security;

-- Anyone may contribute, and anyone may read what was contributed; gathering
-- claims is the point. Dropping first keeps the file re-runnable after edits.
-- No UPDATE or DELETE policies anywhere: rows are only ever added from
-- outside, and only the dashboard (service role, which bypasses RLS) amends.
drop policy if exists anon_insert on public.language;
create policy anon_insert on public.language
  for insert to anon with check (true);
drop policy if exists anon_select on public.language;
create policy anon_select on public.language
  for select to anon using (true);

drop policy if exists anon_insert on public.alphabet;
create policy anon_insert on public.alphabet
  -- Only ever at normal rank: rank is the undecided winner-picking decision,
  -- and the public API must not be a way to make it.
  for insert to anon with check (rank = 'normal');
drop policy if exists anon_select on public.alphabet;
create policy anon_select on public.alphabet
  for select to anon using (true);

drop policy if exists anon_insert on public.sample_text;
create policy anon_insert on public.sample_text
  -- Only ever at normal rank: rank is the undecided winner-picking decision,
  -- and the public API must not be a way to make it.
  for insert to anon with check (rank = 'normal');
drop policy if exists anon_select on public.sample_text;
create policy anon_select on public.sample_text
  for select to anon using (true);

drop policy if exists anon_insert on public.font;
create policy anon_insert on public.font
  for insert to anon with check (true);
drop policy if exists anon_select on public.font;
create policy anon_select on public.font
  for select to anon using (true);

drop policy if exists anon_insert on public.font_support;
create policy anon_insert on public.font_support
  -- Only ever at normal rank: rank is the undecided winner-picking decision,
  -- and the public API must not be a way to make it.
  for insert to anon with check (rank = 'normal');
drop policy if exists anon_select on public.font_support;
create policy anon_select on public.font_support
  for select to anon using (true);

drop policy if exists anon_insert on public.source;
create policy anon_insert on public.source
  for insert to anon with check (true);
drop policy if exists anon_select on public.source;
create policy anon_select on public.source
  for select to anon using (true);

drop policy if exists anon_insert on public.person;
create policy anon_insert on public.person
  for insert to anon with check (true);
drop policy if exists anon_select on public.person;
create policy anon_select on public.person
  for select to anon using (true);

drop policy if exists anon_insert on public.alphabet_evidence;
create policy anon_insert on public.alphabet_evidence
  for insert to anon with check (true);
drop policy if exists anon_select on public.alphabet_evidence;
create policy anon_select on public.alphabet_evidence
  for select to anon using (true);

drop policy if exists anon_insert on public.sample_text_evidence;
create policy anon_insert on public.sample_text_evidence
  for insert to anon with check (true);
drop policy if exists anon_select on public.sample_text_evidence;
create policy anon_select on public.sample_text_evidence
  for select to anon using (true);

drop policy if exists anon_insert on public.font_support_evidence;
create policy anon_insert on public.font_support_evidence
  for insert to anon with check (true);
drop policy if exists anon_select on public.font_support_evidence;
create policy anon_select on public.font_support_evidence
  for select to anon using (true);

drop policy if exists anon_insert on public.alphabet_endorsement;
create policy anon_insert on public.alphabet_endorsement
  for insert to anon with check (true);
drop policy if exists anon_select on public.alphabet_endorsement;
create policy anon_select on public.alphabet_endorsement
  for select to anon using (true);

drop policy if exists anon_insert on public.sample_text_endorsement;
create policy anon_insert on public.sample_text_endorsement
  for insert to anon with check (true);
drop policy if exists anon_select on public.sample_text_endorsement;
create policy anon_select on public.sample_text_endorsement
  for select to anon using (true);

drop policy if exists anon_insert on public.font_support_endorsement;
create policy anon_insert on public.font_support_endorsement
  for insert to anon with check (true);
drop policy if exists anon_select on public.font_support_endorsement;
create policy anon_select on public.font_support_endorsement
  for select to anon using (true);

-- The one privacy line in the file. RLS decides which rows anon may read;
-- it cannot hide a column, so the email column is withheld by grant instead.
-- Supabase's defaults hand anon SELECT on every column; take it back and
-- re-grant everything but email.
--
-- Side effect a client must know: an INSERT asking for the new row back
-- (Prefer: return=representation) is refused on this table unless it names
-- readable columns — POST to person?select=id, not person.
revoke select on public.person from anon;
grant select (id, created_at, name) on public.person to anon;

-- When each importer last ran, and what it found.
--
-- Every other table records what CHANGED. None of them records what we LOOKED
-- AT, and the difference matters as soon as an import finds nothing new: a
-- source that has gone quiet and a source nobody has checked in six months are
-- indistinguishable from `created_at` alone, and they call for opposite
-- actions. So each run writes down that it happened, whether or not it wrote
-- anything else.
--
-- Two rows per run, because anon may insert and may not update: one when it
-- starts and one when it finishes, sharing a `run_key`. A start with no finish
-- is a run that died, which is worth being able to see. `counts` is the
-- importer's own report, verbatim, so the table needs no opinion about what an
-- importer counts.
--
-- What this does NOT record is when we last asked the upstream service
-- anything. These importers read snapshots that refresh*Snapshot.mjs generated,
-- so `source_generated_at` — the snapshot's own date — is the nearest thing to
-- "when we last checked Google", and it is the snapshot's answer rather than
-- this table's.
create table if not exists public.import_run (
  id                  bigint generated always as identity primary key,
  created_at          timestamptz not null default now(),
  -- Ties a run's start row to its finish row.
  run_key             text not null,
  phase               text not null,  -- 'started' | 'finished'
  -- The script, e.g. 'importSldrAlphabets.mjs'.
  tool                text not null,
  -- The data set it read, spelled as the evidence rows spell it.
  source              text,
  -- The snapshot's own generatedAt, where the input carries one.
  source_generated_at timestamptz,
  -- The flags it ran with, so a --only run is never mistaken for a full one.
  invoked_as          text,
  -- The counts report, as the importer printed it.
  counts              jsonb,
  notes               text
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'import_run_phase_check') then
    alter table public.import_run add constraint import_run_phase_check
      check (phase in ('started', 'finished'));
  end if;
end $$;

create index if not exists import_run_tool_idx
  on public.import_run (tool, created_at desc);

alter table public.import_run enable row level security;

drop policy if exists anon_insert on public.import_run;
create policy anon_insert on public.import_run
  for insert to anon with check (true);
drop policy if exists anon_select on public.import_run;
create policy anon_select on public.import_run
  for select to anon using (true);

-- The public read path: only what an editor has marked preferred. Alphabet and
-- sample text are single-valued per writing system, so if two rows are ever
-- both marked preferred the newest wins here, rather than the view returning a
-- contradiction. Fonts are legitimately many per language.
--
-- security_invoker, so these run with the reader's own permissions — which,
-- since the tables themselves are anon-readable, changes nothing today; it is
-- here so a future decision to close a table down doesn't silently reopen it
-- through its views.
create or replace view public.preferred_alphabets
  with (security_invoker = on) as
  select distinct on (a.language_id)
    l.bcp47, a.characters, a.orthography_label, a.id as alphabet_id, a.created_at
  from public.alphabet a
  join public.language l on l.id = a.language_id
  where a.rank = 'preferred'
  order by a.language_id, a.created_at desc;

create or replace view public.preferred_sample_texts
  with (security_invoker = on) as
  select distinct on (s.language_id)
    l.bcp47, s.text, s.orthography_label, s.id as sample_text_id, s.created_at
  from public.sample_text s
  join public.language l on l.id = s.language_id
  where s.rank = 'preferred'
  order by s.language_id, s.created_at desc;

create or replace view public.preferred_fonts
  with (security_invoker = on) as
  select
    l.bcp47, f.family_name, fs.opentype_features,
    fs.id as font_support_id, fs.created_at
  from public.font_support fs
  join public.language l on l.id = fs.language_id
  join public.font f on f.id = fs.font_id
  where fs.rank = 'preferred'
  order by l.bcp47, fs.created_at;

-- For whoever is deciding ranks: how each claim is doing. One voice per
-- person — the latest row a person wrote about a claim — so a changed mind
-- counts once and repetition counts once. (One PERSON row per voice, strictly;
-- the same email behind two person rows is two voices until someone merges
-- them, which is the accepted cost of tolerating duplicates on the way in.)
create or replace view public.endorsement_tallies
  with (security_invoker = on) as
  with every_endorsement as (
    select 'alphabet' as claim_kind, alphabet_id as claim_id,
           person_id, stance, comment, created_at
    from public.alphabet_endorsement
    union all
    select 'sample_text', sample_text_id, person_id, stance, comment, created_at
    from public.sample_text_endorsement
    union all
    select 'font_support', font_support_id, person_id, stance, comment, created_at
    from public.font_support_endorsement
  ),
  latest as (
    select distinct on (claim_kind, claim_id, person_id) *
    from every_endorsement
    order by claim_kind, claim_id, person_id, created_at desc
  )
  select
    claim_kind,
    claim_id,
    count(*) filter (where stance = 'endorse') as endorsements,
    count(*) filter (where stance = 'dispute') as disputes,
    count(*) filter (where comment is not null and comment <> '') as with_comment,
    max(created_at) as last_endorsement
  from latest
  group by claim_kind, claim_id;

-- "When did we last import this, and did it find anything?" in one query. Only
-- finished runs, because a run that died proves nothing about the source.
create or replace view public.last_import_by_source
  with (security_invoker = on) as
  select distinct on (tool, source)
    tool, source, created_at as last_finished_at, source_generated_at,
    invoked_as, counts
  from public.import_run
  where phase = 'finished'
  order by tool, source, created_at desc;
