# Importers

Scripts that file claims into the Ethnolib-Support database from sources we
already have. They implement stages 1–3 and 5 of
[`../docs/population-plan.md`](../docs/population-plan.md); stage 4 (the
BloomLibrary walker) is not built yet, and is planned in
[`../docs/bloom-walker-plan.md`](../docs/bloom-walker-plan.md).

**One snapshot per question.** font-core bundles three, and there is one importer
for each: alphabets, sample texts, and the fonts a language recommends. That last
one is stage 5, written after the first three had already run against the live
database with `font_support` still sitting at zero rows — the source was there all
along and nothing read it. If a fourth snapshot appears, check whether it wants a
stage before concluding the database has nothing to say about it.

What every importer does and does not do:

- **Gathers, never approves.** No script sets `rank`, and none can — the API
  won't let an anonymous writer set it. The public read path serves only
  `preferred` claims, so nothing an import writes reaches a user until some
  ranking process, which does not exist yet, says so.
- **Cites its source.** Every claim gets an evidence row naming the dataset and
  the URL of the exact file the data came from, with `submitted_via: 'import'`.
  An import is never anonymous truth.
- **Is re-runnable.** Values dedupe by their identity keys; evidence is skipped
  when the claim already cites the same source. A second run writes nothing.
- **Records, not assesses.** An evidence `details` string says what the source
  said, which file it came from, and when the snapshot was taken. No judgement of
  the source's answer goes in the row.
- **Says what it did.** Every run ends in a counts report, including what was
  skipped and why, and writes that report to the `import_run` table. That last
  part is what makes "we checked and found nothing new" visible: every other
  table records what changed, so without it a source that has gone quiet and a
  source nobody has checked look identical. `last_import_by_source` is the view
  that answers it. A dry run records nothing.

## Running them

```sh
node supporting-data/tools/importLangtagsLanguages.mjs --dry-run
node supporting-data/tools/importSldrAlphabets.mjs --dry-run
node supporting-data/tools/importGflanguagesSampleTexts.mjs --dry-run
node supporting-data/tools/importLanguageFonts.mjs --dry-run
```

Drop `--dry-run` to write. `--dry-run` does every read for real and no write at
all, so its report is what a real run would do.

| flag | |
| --- | --- |
| `--dry-run` | read everything, write nothing |
| `--only a,b` | just these tags — the source's key (`aa`, `aa_Latn`) or the tag it resolves to (`aa-Latn`) |
| `--limit N` | stop after N source entries |
| `--verbose` | a line per entry |
| `--langtags <path>` | langtags.json somewhere other than the language chooser's copy |
| `--font-core <dir>` | the `font-core` package holding the bundled snapshots (stages 2–3) |
| `--skip-nonscripts` | stage 1 only: leave out the `Zxxx`/`Zyyy`/`Zzzz` "no script" tags |
| `--script-defaults` | stage 5 only: also file the per-script font fallbacks (see below) |

The database is the Supabase project **Ethnolib-Support**; its URL and
publishable key are the script defaults, and `ETHNOLIB_SUPPORT_URL` /
`ETHNOLIB_SUPPORT_ANON_KEY` override them. The key is public by design — the
demo ships the same one to every browser — and RLS is what protects the data.

**Stages 2 and 3 need `components/fonts`**, which is not on every branch of this
repo: they read `font-core`'s bundled `alphabets.json` and `sampleTexts.json`
rather than downloading anything, so the claims they file say exactly what the
font chooser would show for that language. On a checkout without the fonts
component, pass `--font-core` (or set `FONT_CORE_DIR`) to point at one that has
it; the scripts refuse to run rather than reporting zero entries.

## The stages

**1 — `importLangtagsLanguages.mjs`.** A `language` row per writing system in
SIL's langtags.json (about 9,000), from the copy the language chooser already
ships. No claims and no evidence: this is the denominator, so that "how many
writing systems have an alphabet?" has an honest answer and a dashboard can show
what is missing. `name` is langtags' label, a convenience for reading the
dashboard rather than data.

**2 — `importSldrAlphabets.mjs`.** Alphabet claims from font-core's bundled
SLDR exemplars, parsed by the same `parseUnicodeSetToAlphabet` the chooser uses
at runtime (ported into `lib/unicodeSet.mjs`; keep the two in step). Evidence
cites the SLDR and the GitHub page of the XML file itself. SLDR keys that name
no script get one from langtags; keys carrying a region or an orthography
variant land on the writing system, with the variant kept as the claim's
`orthography_label` and the original key written into the evidence details.

**3 — `importGflanguagesSampleTexts.mjs`.** Sample-text claims from font-core's
bundled gflanguages passages. The keys name their own script, so nothing is
inferred; note that they write an orthography variant *before* the script
(`tw_akuapem_Latn`), which is not BCP 47's order, and some carry a region
(`yo_Latn_BJ`). Both land on the writing system, the variant kept as the
claim's `orthography_label`. Evidence cites Google Fonts' language data and the `.textproto` the
passage came from. Some passages are scripture or prayer excerpts; they are
recorded as they are, which is safe because an import cannot make anything
visible — what a user is shown stays a human decision.

**5 — `importLanguageFonts.mjs`.** `font_support` claims from font-core's bundled
`languageFonts.json`, the Language Font Finder's data: for each of 2,187 tags, the
families SLDR's `<sil:font>` elements name for that language, already trimmed to
what we may actually hand a user. About 1,854 writing systems and 8,380 claims.
Evidence cites the same per-language SLDR page stage 2 cites, because the
recommendations live in the same XML file as the exemplars — so one source row
supports both an alphabet claim and a font claim, which is exactly what happened.

Two details worth knowing before reading the output:

- **Five families are recommended almost everywhere**, and that is a fact about
  the fonts rather than a shortcut in the data. Charis, Noto Sans, Noto Serif,
  Gentium and Andika each appear for over 1,800 of the 2,187 languages; fifty
  families are named for exactly one. Each evidence row records which, because
  specificity is useful for ordering — Annapurna SIL is more particularly Nepali's
  font than Noto Sans is. It is **not** a confidence score. Charis and Gentium
  genuinely cover nearly every Latin orthography, and SLDR and the Font Finder are
  maintained by the people best placed to know; a broad recommendation from them
  is expertise expressed broadly. Do not build a ranking that penalises it.
- **Script fallbacks are not filed by default.** The snapshot's `scriptDefaults`
  half is what the Font Finder answers when nobody has written a rule for a
  language. That is a statement about a script, so filing it per language would
  assert something nobody said, and it would add roughly 33,500 claims across
  6,496 writing systems — four times the per-language import. `--script-defaults`
  files them anyway, against existing language rows only, citing `fallback.json`
  under its own source title. That title is deliberately not an approved source,
  so those claims stay gathered and unserved. Region-conditioned rules (Arabic has
  four) are skipped either way: a writing system has no region to match.

## Related

[`../docs/bundle-projection.md`](../docs/bundle-projection.md) — the decision
that this database becomes the source of the bundle font-core ships, and the
rule that keeps importers from re-importing their own output once it does.

## Shared bits

`lib/langdata.mjs` is the Node half of the demo's `src/demos/langdata.ts`: the
same plain-fetch, GET-then-POST find-or-create, and — importantly — the same
`alphabetKey` and `textKey`. Those keys are the identity of a claim, so if an
import spelled one differently from the browser, the same alphabet submitted
twice would land in two rows and support for it would fragment instead of
accumulating. Change one, change both.
