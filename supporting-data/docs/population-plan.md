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
Stage 4 does not, because a BloomLibrary book is not.

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

The most valuable and the most careful stage. For each language BloomLibrary
knows, walk (a sample of) its books and extract three kinds of evidence:

- **Alphabet**: the character inventory of enough page text is evidence for an
  alphabet claim (corroborating an existing claim, or a new claim where Bloom
  is the only evidence). Inventory-from-text is weaker than a stated alphabet —
  say so in the evidence `details` ("derived from N books' text; may miss rare
  letters and include loanword characters").
- **Fonts used**: the font families named in a book's styles are font_support
  claims — someone chose that font for that language and published with it.
- **Sample text candidates**: short passages that read well. **Religious
  content is the risk here**: much Bloom content is scripture-adjacent, and a
  scripture passage as *the* sample text for a language can offend. The walker
  must carry the book's topic/tags into the evidence details, default-exclude
  books tagged religious/Bible/spiritual from sample-text harvesting (they
  remain fine as alphabet and font evidence). And in any case no harvested
  passage becomes a UI-visible sample by import alone — see the note above
  about rank.

Each claim's evidence cites the specific book (title + bloomlibrary.org URL) as
its source, so a disputed claim can be traced to the very book it came from.
Mechanics (which Bloom API, how much text per book, sampling) are for the
implementation plan; likely the harvester's artifacts rather than scraping HTML.

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
the time. The snapshot was a deliberate shortcut for that one run: it says when a
file was regenerated, not when anyone last asked the Language Font Finder
anything, so a repeat should read LFF directly and let
`import_run.source_generated_at` mean what it claims. Each run records which
route it took in `import_run.notes`. Which languages get asked about is a
separate question with its own answer:
[`lff-and-the-language-list.md`](lff-and-the-language-list.md) records why the loop
runs over SLDR's ~2,200 LDML files rather than langtags' 8,500 writing systems, and
what was measured to check that.

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
- **What it will not file.** The snapshot's other half, `scriptDefaults`, is what
  the Font Finder answers for a language nobody wrote a rule for. That is a
  statement about a script, and there is no script entity here to hang it on;
  spreading it across every language of a script would assert for 6,496 writing
  systems something only ever said about 157 scripts, and would add roughly
  33,500 claims — four times the per-language import. Off by default, available
  behind `--script-defaults`, and cited to `fallback.json` under its own source
  title so it can never be mistaken for a per-language recommendation. Rules
  conditioned on region are skipped either way, because a writing system has no
  region to match against.

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
