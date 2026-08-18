# Populating the database from sources we already have

The order below is deliberate: each stage makes the next one's results easier
to judge. One property matters for everything here, including the
religious-content concern in stage 4: importers only *gather*. No importer sets
`rank`, and none can — the API refuses it — so no import decides that a claim is
the answer for a language. How claims ever *become* preferred is a decision we
have deliberately not made yet.

What a UI reads instead is a narrower rule that needs no such judgement: a claim
is usable when an approved source stands behind it, which today means SLDR or
Google Fonts language data (see
[`approved-sources.md`](approved-sources.md)). Stages 2, 3 and 5 therefore
produce claims a user can see, because SLDR and gflanguages are on that list.
Stage 4 does not, because a BloomLibrary book is not; neither does stage 6,
unless someone decides the Language Font Finder service belongs on the list.

All importers follow the same rules:

- They are ordinary anonymous writers: same PostgREST find-or-create the demo
  uses, no service key needed. `submitted_via: 'import'`, and every claim gets
  evidence citing its source — an import is never anonymous truth.
- Re-runnable without duplicating: before adding evidence to a claim, check
  whether that claim already has evidence rows citing the same source; skip if
  so. (Values dedupe themselves via the identity keys.)
- Report counts: languages touched, claims created, evidence added, skipped.
- Node `.mjs` scripts in `tools/`, following the `refresh*Snapshot.mjs` style
  in `components/fonts/common/font-core/tools/`.

## Stage 1 — langtags.json: pre-populate the languages

Create a `language` row for every writing system in SIL's langtags.json (each
entry names a script, which our tags require). No claims, no evidence — just
rows, so that "how many writing systems have an alphabet claim?" has a real
denominator and the future dashboard can show what's *missing*, not only what
exists. Populate `name` from langtags' name field as a convenience label.

Batch the inserts (PostgREST accepts an array per POST); on conflict with an
existing tag, skip.

## Stage 2 — bundled SLDR alphabets

The repo already ships SLDR exemplar data:
`components/fonts/common/font-core/src/suggestions/bundled/alphabets.json`
(raw LDML UnicodeSet strings, keyed by SLDR-spelled tags). For each entry:
parse with the existing `parseUnicodeSetToAlphabet`, join to the
space-separated `characters` shape, file an alphabet claim with evidence
`source = SIL Locale Data Repository (SLDR)` and the per-tag SLDR page URL
(the demo's `sldrPageUrl` shows the URL shape). Tags lacking a script subtag
get one from langtags (stage 1's lookup); entries that still can't be
script-qualified are skipped and counted.

## Stage 3 — bundled Google sample texts

`bundled/sampleTexts.json` (from gflanguages via Google Fonts, keyed
`{lang}_{Script}`) becomes sample_text claims with evidence
`source = Google Fonts language data (gflanguages)` and the gflanguages repo
URL. The key's script goes into the tag directly. Note: some gflanguages
passages are scripture or prayer excerpts; the importer records the passage
as-is (it is evidence of the writing system either way) but a human decides
rank — see the religious-content note below.

## Stage 4 — BloomLibrary.org walker

`importBloomBooks.mjs`, with the BloomLibrary reads in `tools/lib/bloom.mjs`.
The most valuable and the most careful stage, and the one whose reach is
currently smallest: it has run over **nine writing systems chosen by hand, not
the library**, and it files **alphabets and fonts only**. `TARGET_SYSTEMS` at the
top of the script is the list, the algorithm for choosing which languages to walk
is not implemented, and sample-text harvest is not built. The mechanics, and the
argument about how good this stage's own output is, are in
[`bloom-walker-plan.md`](bloom-walker-plan.md); the run's counts are in
[`../tools/README.md`](../tools/README.md).

The three kinds of evidence a book carries:

- **Alphabet**: the character inventory of enough page text is evidence for an
  alphabet claim (corroborating an existing claim, or a new claim where Bloom
  is the only evidence). Inventory-from-text is weaker than a stated alphabet —
  say so in the evidence `details` ("derived from N books' text; may miss rare
  letters and include loanword characters").
- **Fonts used**: the font families named in a book's styles are font_support
  claims — someone chose that font for that language and published with it.
- **Sample text candidates**: short passages that read well. **Not built.**
  Religious content is the risk that keeps it last: much Bloom content is
  scripture-adjacent, and a scripture passage as *the* sample text for a language
  can offend the people the data is for. Whoever builds it should carry the book's
  topic tags into the evidence details and exclude `topic:Bible`,
  `topic:Spiritual` and `topic:Primer` from this harvest alone — and note that no
  harvested passage becomes a UI-visible sample by import anyway, per the rank
  note above.

Religious content shapes the other two outputs as well, more bluntly than a topic
filter would: **a book whose `copyright` mentions "Bible" is excluded for every
purpose**, alphabets and fonts included. 3,879 of the library's 29,264 harvested
books match, and 2,925 of those carry neither `topic:Bible` nor
`topic:Spiritual`, so the tags alone would not have found them. It costs real
evidence — for some languages it is the entire corpus — so the importer reports
per language how many books it removed, and a language filtered down to nothing
is visible as an excluded language rather than as a language with no data. Two of
the nine in the first run are exactly that.

Each claim's evidence cites the specific book (title + bloomlibrary.org URL) as
its source, so a disputed claim can be traced to the very book it came from. The
text comes from the harvester's already-unpacked `bloomdigital` copy of the book,
one GET per book, not from scraping bloomlibrary.org.

## Stage 5 — bundled Language Font Finder recommendations

Written after stages 1–3 had run, because `font_support` was still empty and the
reason turned out to be an omission rather than a missing source. font-core
bundles three snapshots and the importers only read two: `bundled/alphabets.json`
and `bundled/sampleTexts.json` had stages, and `bundled/languageFonts.json` —
which fonts a language's community recommends, the third question the chooser
asks — had none. Numbered 5 rather than inserted as 3.5 so the existing stage
numbers keep meaning what they meant.

The snapshot's `languages` map holds 2,187 tags, each naming the families SLDR's
`<sil:font>` elements record for that language, trimmed the way the Language Font
Finder trims them (nothing undistributable, nothing without a downloadable TTF).
That collapses to about 1,854 writing systems and 8,380 `font_support` claims.
Evidence cites the SLDR page for the language — the same source rows stage 2
creates, since the recommendations sit in the same XML file as the exemplars, so
one page ends up supporting both an alphabet claim and a font claim.

A second omission surfaced the same way: `fontFeatureDefaults.json`, the fourth
bundled snapshot, holds the other half of the same `<sil:font>` attribute — the
OpenType feature settings SLDR records for that font in that language — and
nothing read it either. It now lands in `font_support.opentype_features`, the
column previously called `details` (see
[`../sql/003-opentype-features.sql`](../sql/003-opentype-features.sql) for the
rename and why the name follows the standard rather than saying "character
variants"). 519 tags carry settings, 1,404 (writing system, font) pairs in all.

Ran on 2026-08-18 against the committed snapshot, which was three days old at
the time; each run records which route it took in `import_run.notes`. Whatever
route the bytes take, the claims this stage files are SLDR's statements and
cite SLDR pages. What the Language Font Finder service itself answers when
asked about a tag is a different statement, and stage 6 is where it is cached;
[`lff-and-the-language-list.md`](lff-and-the-language-list.md) records how the
two sources relate and why they are kept apart.

Two things the importer records rather than decides:

- **How specific a recommendation is.** Five families — Charis, Noto Sans, Noto
  Serif, Gentium, Andika — appear for over 1,800 of the 2,187 languages; fifty
  families are recommended for exactly one. The evidence records which, and it is
  worth being explicit that this is *not* a quality ranking. A wide
  recommendation from SLDR is not a default someone reached for instead of
  thinking: Charis and Gentium do cover nearly every Latin orthography, extended
  letters included, and Andika was designed for literacy materials. SIL's own
  people maintain both SLDR and the Font Finder, and on this question there is no
  better-informed source to appeal to. The number is recorded because specificity
  helps with ordering — Annapurna SIL is more particularly Nepali's font than Noto
  Sans is — not because breadth is a demerit.
- **What it will not file.** The snapshot's other half, `scriptDefaults`, is
  what the Font Finder answers for a language nobody wrote a rule for. That is
  the service's statement rather than SLDR's, so it belongs to stage 6, which
  caches the service's answers whole and under their own source. This stage
  spreading pieces of the service's published data across languages would blur
  exactly the line the two sources exist to keep.

## Stage 6 — Language Font Finder live answers

The Language Font Finder is a service, and its API answers for any tag:
`GET https://lff.api.languagetechnology.org/lang/{tag}` returns the font
families it recommends for that tag. Per its maintainers, where SLDR has
explicit font information for the language it returns that; where SLDR has
none, it works from the tag itself — script and region, resolved through
langtags — and answers anyway. So the service always has an answer, and for
most of langtags' 8,500 writing systems that answer is not a per-language
attestation.

`tools/importLffAnswers.mjs` caches those answers for offline use: it iterates
every writing system langtags knows (stage 1's list), asks the service, and
files a `font_support` claim per family the response's `families` map names —
verbatim, with no filtering and no reconstructing what the service would say
from its published data files. The service is the authority on its own answers;
this database is a cache of them.

Evidence cites the service — source title `SIL Language Font Finder`, the
per-tag query URL, the family id, whether the response listed it in
`defaultfamily` and under which roles, the API version that answered, and the
date asked — and never an SLDR page. That keeps two
different statements distinguishable forever: a recommendation somebody
recorded for that language in SLDR (stage 5's claims), and what the service
answers when asked about a tag. One claim may carry both kinds of evidence,
and a UI that wants to present the first more strongly than the second reads
the difference off the sources. The Font Finder service is not on the
approved-source list; whether it should be is a decision not yet made.

Practicalities: a full run is ~8,500 requests against somebody's public
service, so it deserves a gentle rate and a heads-up to the maintainers before
the first one. The importer asks three tags at a time with a pause between
launches, retries once on a 5xx or a network failure, and counts and lists a tag
whose request still fails rather than aborting the run or guessing at an answer.

Ran on 2026-08-18: 8,500 writing systems asked, 8,444 answered, 56 answered
`404`, no request failures and no retry that failed twice. 28,142 new
`font_support` claims, 36,517 evidence rows and 123 new `font` rows; 8,375 of the
answers landed on claims stage 5 had already filed, which is the two kinds of
evidence meeting on one claim exactly as intended. The 404s are writing systems
langtags carries and the service does not answer for — historic and undeciphered
scripts (`xiv-Inds`, `elx-Pelm`, `ka-Geok`), Fraktur and Gaelic Latin variants
(`de-Latf`, `ga-Latg`), constructed languages (`tlh-Piqd`, `qya-Teng`), and the
`zxx-Zmth`/`zxx-Zsym` notation tags. They are counted apart from failures,
because a 404 is an answer and a timeout is not.

## Coverage over time

Every row — language, value, evidence, endorsement — carries `created_at`, so
"writing systems with at least one alphabet claim, by month" is a straight
query, and a future dashboard can graph coverage improving. Two honest caveats:

- Bulk imports appear as spikes on the day they ran. That is the true history
  of *our* coverage, so it is fine; the interesting curve starts after them.
- `rank` changes are not timestamped, so "how many writing systems had a
  *preferred* alphabet over time" cannot be reconstructed retroactively. If we
  ever want that graph, add a `rank_set_at` column (or a small history table)
  *before* whatever ranking process we choose starts running — cheap now,
  impossible later.
