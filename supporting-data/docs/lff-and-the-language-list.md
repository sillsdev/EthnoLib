# Font sources: SLDR's recommendations and the Language Font Finder's answers

How font-recommendation data reaches this database from two related SIL
sources, and why they are kept apart. A separate finding — four font families
missing from the offline bundle — is at the end.

## Three lists, easy to conflate

| list                | size                  | what it is                                              |
| ------------------- | --------------------- | ------------------------------------------------------- |
| SLDR's LDML files   | ~2,200 tags           | one XML file per language, `sldr/{letter}/{tag}.xml`    |
| langtags.json       | 8,500 writing systems | SIL's registry of language + script combinations        |
| our `language` table | ~9,000 rows           | one per langtags writing system, from stage 1           |

## Two statements, not one

Two different things can be true of a writing system, and the database keeps
them apart:

- **Somebody recorded a font recommendation for that language in SLDR.** The
  `<sil:font>` elements in a language's LDML file are per-language,
  human-maintained statements. Stage 5 of
  [`population-plan.md`](population-plan.md) files these as claims citing the
  SLDR page each came from. About 2,200 languages have one.
- **The Language Font Finder answers for the tag.** The service
  (`GET https://lff.api.languagetechnology.org/lang/{tag}`) accepts any
  language tag. Per its maintainers, where SLDR holds explicit font
  information for the language it returns that; where SLDR holds none, it
  works from the tag itself — script and region, resolved through langtags —
  and answers anyway. So the service always has an answer, and for most of
  langtags' 8,500 writing systems that answer is not a per-language
  attestation.

The second is genuinely valuable: it is the service's expertise applied to the
tag, and it is region-aware in ways a flat per-script default is not —
Arabic-script languages of Pakistan get Nastaliq faces where most others get
Naskh ones. But it is a different kind of statement from the first, the
response does not say which kind a given answer is, and recording both under
one source would let the stronger reading absorb the weaker one. A user shown
"SLDR recommends this for your language" when the truth is "the service
answered this for your tag" has been told more than anybody meant to say.

## What we do about it

- **Stage 5 keeps filing SLDR's statements**, citing SLDR pages, exactly as it
  does today.
- **Stage 6 caches the service's answers** (`tools/importLffAnswers.mjs`):
  every langtags writing system, one request, each family the service names
  filed verbatim as a claim whose evidence cites the Language Font Finder and
  the date asked. No filtering, and no reconstructing what the service would
  say from its published data files — the service is the authority on its own
  answers, and this database is a cache of them for offline use.
- **The two sources stay separate.** One claim may carry both kinds of
  evidence, and a UI that wants to present an SLDR-recorded recommendation
  more strongly than a service answer reads the difference off the sources.
  Neither import marks anything preferred. Both sources are on the
  approved-source list ([`approved-sources.md`](approved-sources.md)), which
  approves them separately and does not merge them.

A full stage 6 run is roughly 8,500 requests to collect what is, underneath,
far fewer distinct facts. That inefficiency is accepted on purpose: caching
answers verbatim is what keeps every recorded answer the service's own. The
importer is modest with the request rate — three tags in flight, a pause between
launches — because it is somebody's public service, and the maintainers deserve
a heads-up before a run like this. The first full run, on 2026-08-18, took ten
minutes of asking: 8,444 of the 8,500 tags answered, 56 answered `404`, none
failed.

## Four families the offline bundle is missing (2026-08-18)

Separate from everything above: the live service names families for some
scripts that font-core's bundled script fallbacks do not, and the difference
is upstream data, not a bug here. Comparing the bundle's `scriptDefaults`
against upstream `fallback.json` as it stood today:

| script | ours                         | upstream also names      |
| ------ | ---------------------------- | ------------------------ |
| Kana   | _(nothing at all)_           | notosansjp, notoserifjp  |
| Jpan   | _(nothing at all)_           | notosansjp, notoserifjp  |
| Thai   | notosansthai, notoserifthai  | sarabun                  |
| Laoo   | notosanslao, notoseriflao    | saysetthamx              |

Latn, Deva and Grek match upstream exactly, so this is not general staleness.

**It is not a bug in the snapshot refresh.** That script keeps only families
it could actually hand a user — nothing marked undistributable, nothing
without a fetchable TTF — and it is applying that rule correctly. The four
families fail it, for two different reasons, both in `silnrsi/fonts`'
`families.json`:

- **`saysetthamx`, `notosansjp`, `notoserifjp` have no files at all.** The
  catalogue lists the family, `distributable` is true, and `files` is an empty
  object with no nominated `defaults.ttf`. There is nothing to download.
- **`sarabun` has 16 files and none of them has a URL.** Its nominated
  `Sarabun-Regular.ttf` entry carries only `axes` and `packagepath` — no
  `flourl`, no `url`. Compare `saysettha`, whose entries carry both and which
  does survive into the snapshot.

One theory ruled out on the way: not an id mismatch between the two files.
Every id `fallback.json` names across all 170 scripts is a real key in
`families.json` — zero orphans.

**Kana and Jpan come out empty**, which is the loud one: a user picking a
Japanese writing system gets no font at all from the offline fallback path,
while the live service recommends Noto Sans JP quite happily — it does not
require a downloadable TTF from the catalogue the way the bundle does. Thai
and Lao are only thinner, not empty.

**None of it affects this database**, whose `font_support` claims come from
SLDR's per-language elements, and **the fix is not ours**: it belongs in
`silnrsi/fonts`, as download URLs for four families the catalogue already
lists. A reasonable second option, for whoever owns `components/fonts`, is to
let a script fallback name a family with no catalogue URL when the family can
be fetched some other way — but that changes the "never offer what we cannot
deliver" rule, which exists for a good reason, so it is a decision and not a
patch.

Reproducing the comparison:

1. Diff the bundle's `scriptDefaults` against
   `https://raw.githubusercontent.com/silnrsi/langfontfinder/main/data/fallback.json`.
2. For any family that differs, look it up in
   `https://raw.githubusercontent.com/silnrsi/fonts/main/families.json` and
   check `files`, `defaults.ttf`, and whether the nominated entry has a `url`
   or `flourl`.
