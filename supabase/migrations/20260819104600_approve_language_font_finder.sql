-- Approve the SIL Language Font Finder.
--
-- It was missing rather than excluded: `approved_source` was written when the
-- only claims in the database came from the two bundled datasets, and the Font
-- Finder importer landed afterwards without anyone adding its title. The Sources
-- tab showed it as "gathered, not approved", which is what the table said and
-- not what anybody intended.
--
-- WHAT THIS CHANGES. 36,517 font_support claims over 8,444 writing systems —
-- the largest single contribution in the database — become visible through
-- `usable_fonts`. Nothing else moves: the Font Finder files no alphabets and no
-- sample texts, so `usable_alphabets` and `usable_sample_texts` are untouched.
--
-- Its claims stay separate from the font recommendations SLDR records, as they
-- always have. Both are approved now, and they are still different statements —
-- one is what a language's community recorded in its SLDR entry, the other is
-- what the service answered when asked. Approving both does not merge them.
--
-- Keyed by title, like every row in this table: approving a source approves
-- every source row that shares its title, past and future, so a re-import needs
-- no second blessing. The title must match what tools/importLffAnswers.mjs
-- writes, exactly.
--
-- Re-runnable.

insert into public.approved_source (title, note)
values (
  'SIL Language Font Finder',
  'SIL''s own font recommendation service, asked per language tag and recorded verbatim. The same standing as SLDR, whose per-language font elements it complements rather than duplicates.'
)
on conflict (title) do nothing;
