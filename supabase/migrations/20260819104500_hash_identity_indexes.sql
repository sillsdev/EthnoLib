-- Index a hash of a claim's identity key instead of the key itself, so how long
-- an inventory is stops deciding whether it can be stored at all.
--
-- WHY. `alphabet_identity_idx` and `sample_text_identity_idx` were btree indexes
-- over (language_id, key). A btree index row cannot exceed 2704 bytes, so
-- `alphabet_key_indexable_check` and `sample_text_key_indexable_check` refused
-- any key over 2600 bytes — readably, rather than letting the index fail with
-- "index row size exceeds maximum", but refused all the same. That limit counted
-- bytes, because that is what the index counts, so it fell hardest on the
-- scripts that spend three bytes a character. create-tables.sql already named
-- the fix worth making: index a hash of the key rather than the key. This is it.
-- A hash is fixed-width, so nothing is ever too long for the index again and
-- both remaining limits are editorial choices rather than mechanical ones.
--
-- WHAT IT WAS COSTING. tools/importSldrAlphabets.mjs was dropping seven entries:
-- ko (11,172 entries), yue (2,470), ja (2,311), zh (2,210), zh-Hant (2,179),
-- yue-Hans (2,124) and ii (1,165). Six are the Han and Hangul inventories the
-- SLDR writes into the same field a Latin alphabet uses; `ii` is the Yi
-- syllabary, which is an alphabet by any reading and was lost purely to the byte
-- count. The dashboard's Overlap tab reported all seven as writing systems the
-- SLDR has no alphabet for, which is not what the SLDR says.
--
-- WHY A WRAPPER FUNCTION. sha256() takes bytea, and convert_to() is how you get
-- there from text — but convert_to is marked STABLE, because its answer depends
-- on the server encoding, and an index expression has to be IMMUTABLE. Wrapping
-- it and declaring the wrapper immutable is sound exactly as long as this
-- database's encoding never changes. It is UTF8 and Supabase offers no other.
--
-- WHY THE CHARACTER LIMIT MOVES TOO. `alphabet_not_a_novel_check` capped
-- `characters` at 3000 characters, on the stated grounds that "the largest
-- genuine inventory here is a syllabary of about 1,200 entries". SLDR's Korean is
-- 22,343 characters, so that was not true. The limit's job is to turn away a
-- pasted novel, not to have an opinion about a real inventory, so it moves to
-- 25,000 — past the largest set any source we read publishes, and still a closed
-- door. `sample_text` keeps its 3000, where the reasoning still holds.
--
-- CONSEQUENCE WORTH KNOWING. `usable_alphabets` serves claims an approved source
-- stands behind, and the SLDR is approved, so Korean's 11,172 syllables will
-- reach anything reading that view. That is what the SLDR says about `ko`.
-- Whether an alphabet that size is worth showing to a person is a judgement for
-- the UI doing the showing, not for this table.
--
-- Re-runnable: every step is guarded, and the new indexes are equivalent to the
-- ones they replace, so no row that fits today can start conflicting.

begin;

-- The identity of a key, as something an index can hold at a fixed width.
create or replace function public.identity_hash(key text)
  returns bytea
  language sql
  immutable
  strict
  parallel safe
as $$ select sha256(convert_to(key, 'UTF8')) $$;

comment on function public.identity_hash(text) is
  'sha256 of a claim identity key, for the unique indexes on alphabet and '
  'sample_text. Immutable on the standing assumption that the database '
  'encoding stays UTF8.';

drop index if exists public.alphabet_identity_idx;
drop index if exists public.sample_text_identity_idx;

create unique index if not exists alphabet_identity_idx
  on public.alphabet (language_id, public.identity_hash(characters_key));
create unique index if not exists sample_text_identity_idx
  on public.sample_text (language_id, public.identity_hash(text_key));

alter table public.alphabet drop constraint if exists alphabet_key_indexable_check;
alter table public.sample_text drop constraint if exists sample_text_key_indexable_check;

alter table public.alphabet drop constraint if exists alphabet_not_a_novel_check;
alter table public.alphabet add constraint alphabet_not_a_novel_check
  check (char_length(characters) <= 25000);

commit;
