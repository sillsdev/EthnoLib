# Which languages we ask about fonts, and why it is SLDR's list

Written 2026-08-18, after a question worth asking: our font data covers 1,854
writing systems, langtags.json knows about 8,500, so are we missing fonts by
iterating the wrong list?

Short answer: no, and the list is right as it is. But the investigation turned up
four font families that genuinely are missing, for an unrelated reason, and the
cause is upstream rather than here. Both halves are below.

## Where the list comes from today

Three different lists are involved and it is easy to conflate them.

| list | size | what it is |
| --- | --- | --- |
| SLDR's LDML files | ~2,200 tags | one XML file per language, `sldr/{letter}/{tag}.xml` |
| langtags.json | 8,500 writing systems | SIL's registry of language + script combinations |
| our `language` table | ~9,000 rows | one per langtags writing system, from stage 1 |

The font snapshots iterate **the first one**. `refreshLanguageFontsSnapshot.mjs`
and `refreshFontFeatureDefaultsSnapshot.mjs` both get their tags from
`tools/lib/sldrScan.mjs`, which walks an SLDR tarball and yields each LDML file's
name as the tag. langtags is not involved: grep `langtags` in that `tools/`
directory and there are no hits.

langtags does two other jobs, downstream, and neither is choosing the list:

- **Resolver.** An SLDR key names no script (`aa`) or names more than we can
  store (`man-Latn-GN`), and our tags require exactly a language and a script. So
  `resolveWritingSystem` asks langtags what script the language is written in.
  `aa` becomes `aa-Latn`. This is why 2,187 SLDR keys collapse to 1,854 writing
  systems, and why `qaz` and `test` are skipped: langtags does not know them.
- **Denominator.** Stage 1 creates a `language` row per langtags writing system,
  so "how many writing systems have a font recommendation?" has an honest
  denominator. That list is deliberately much larger than SLDR's.

## Why iterating langtags instead would gain nothing

Because the Language Font Finder's per-language layer *is* SLDR, restated. From
`refreshLanguageFontsSnapshot.mjs`'s own header: the per-language recommendations
"live in the SLDR's `<sil:font>` elements — LFF generates its fontrules from
exactly these". A language with no SLDR file has no per-language recommendation
anywhere for us to find, because SLDR is where they are written down.

That is an argument from a comment, so it was tested. Of the 8,500 langtags
writing systems, 2,267 have an SLDR file and 6,233 do not. 120 of the uncovered
ones, spread across all 167 uncovered scripts, were put to the live service at
`https://lff.api.languagetechnology.org/lang/{tag}`. 116 answered:

- **99 returned exactly their script's fallback families and nothing more.**
- **17 returned something extra**, and those cluster by script rather than by
  language: every Greek-script tag returned the same three families, every Lao one
  the same one, every Thai one the same one, every Japanese one the same pair.
  Clustering by script is the signature of a script-level answer.
- 4 requests failed.

So asking LFF about a language SLDR has never heard of gets back a statement
about its **script**, which is the `scriptDefaults` half of the snapshot — data we
already hold and deliberately do not file as per-language claims, because doing so
would assert for a language something only ever said about a script (see the stage
5 notes in [`population-plan.md`](population-plan.md)).

**Conclusion: keep iterating SLDR.** Adding langtags to the loop would mean about
9,000 requests to collect roughly 2,200 real answers, and the other 6,800 would be
script fallbacks wearing a language's name.

This also constrains the "query LFF directly next time" note in
[`../tools/README.md`](../tools/README.md): the live API is per-tag (`/lang/{tag}`),
so a live importer still needs a list to iterate, and the honest list is still
SLDR's file inventory. Reading LFF live does not remove the need to read SLDR.

## The four families that really are missing

The 17 "something extra" answers above were worth chasing, because they mean the
live service names families our bundled script fallbacks do not. Comparing our
snapshot against upstream `fallback.json` as it stands today:

| script | ours | upstream also names |
| --- | --- | --- |
| Kana | *(nothing at all)* | notosansjp, notoserifjp |
| Jpan | *(nothing at all)* | notosansjp, notoserifjp |
| Thai | notosansthai, notoserifthai | sarabun |
| Laoo | notosanslao, notoseriflao | saysetthamx |

Latn, Deva and Grek match upstream exactly, so this is not general staleness.

**It is not a bug in `refreshLanguageFontsSnapshot.mjs`.** That script keeps only
families it could actually hand a user — nothing marked undistributable, nothing
without a fetchable TTF — and it is applying that rule correctly. The four
families fail it, for two different reasons, both in `silnrsi/fonts`'
`families.json`:

- **`saysetthamx`, `notosansjp`, `notoserifjp` have no files at all.** The
  catalogue lists the family, `distributable` is true, and `files` is an empty
  object with no nominated `defaults.ttf`. There is nothing to download.
- **`sarabun` has 16 files and none of them has a URL.** Its nominated
  `Sarabun-Regular.ttf` entry carries only `axes` and `packagepath` — no `flourl`,
  no `url`. Compare `saysettha`, whose entries carry both and which does survive
  into the snapshot.

One theory ruled out on the way: not an id mismatch between the two files. Every
id `fallback.json` names across all 170 scripts is a real key in `families.json` —
zero orphans.

### Why this matters, and to whom

**Kana and Jpan come out empty**, which is the loud one: a user picking a Japanese
writing system gets no font at all from the fallback path, while the live LFF
service recommends Noto Sans JP quite happily — it does not require a downloadable
TTF from the catalogue the way we do. Thai and Lao are only thinner, not empty, so
they matter less.

**None of it affects this database.** The 8,380 `font_support` claims come from
SLDR's per-language `<sil:font>` elements, not from script fallbacks, and script
fallbacks are not filed as claims. So there is nothing to re-import and no row to
correct. It is recorded here because the question that found it ("are we missing
fonts?") will be asked again, and because the answer is not obvious from either
repo on its own.

**The fix is not ours.** It belongs in `silnrsi/fonts`, as download URLs for four
families the catalogue already lists. A reasonable second option, for whoever owns
`components/fonts`, is to let a script fallback name a family with no catalogue
URL when the family can be fetched some other way — but that is a change to the
"never offer what we cannot deliver" rule, which exists for a good reason, so it
is a decision and not a patch.

## Reproducing any of this

The probes were throwaway scripts, deliberately not committed, but they are four
short things anyone can redo:

1. Compare langtags writing systems against the snapshot's `languages` keys to get
   the uncovered set.
2. `GET https://lff.api.languagetechnology.org/lang/{tag}` for a sample of them,
   spread across scripts, and check each answer against that script's entry in the
   snapshot's `scriptDefaults`.
3. Diff the snapshot's `scriptDefaults` against
   `https://raw.githubusercontent.com/silnrsi/langfontfinder/main/data/fallback.json`.
4. For any family that differs, look it up in
   `https://raw.githubusercontent.com/silnrsi/fonts/main/families.json` and check
   `files`, `defaults.ttf`, and whether the nominated entry has a `url` or
   `flourl`.

Be modest with the request rate on step 2. It is somebody's public service.
