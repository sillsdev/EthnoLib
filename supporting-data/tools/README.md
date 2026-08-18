# Importers

Scripts that file claims into the Ethnolib-Support database: four from data this
repo already ships, and two from live reads — the Language Font Finder service,
and BloomLibrary. They implement stages 1–6 of
[`../docs/population-plan.md`](../docs/population-plan.md).

**One snapshot per question.** font-core bundles four, and stages 1-3 and 5 read
all four: alphabets, sample texts, the families a language recommends, and the
OpenType feature settings SLDR gives for each of those families. Two of them were
missed in turn. `languageFonts.json` had no importer at all, which is why
`font_support` sat at zero rows after the first three stages ran; then
`fontFeatureDefaults.json` was missed the same way, and the warning printed here
about "if a fourth snapshot appears" was already out of date when it was written.
The habit worth keeping: list the directory, then check each file against the
importers, rather than trusting a count written down earlier.

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
- **Batches its writes.** Reads happen once up front, and rows go out 500 to a
  POST. Stage 5 files 8,380 claims and 9,870 evidence rows in 41 requests; the
  same work one row at a time was 17,000 requests and over twenty minutes.
  `insertRowsReturning` in `lib/langdata.mjs` is the helper, and it hands ids
  back so the next batch can reference them.
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
node supporting-data/tools/importBloomBooks.mjs --dry-run
node supporting-data/tools/importLanguageFonts.mjs --dry-run
node supporting-data/tools/importLffAnswers.mjs --dry-run
```

Drop `--dry-run` to write. `--dry-run` does every read for real and no write at
all, so its report is what a real run would do.

| flag | |
| --- | --- |
| `--dry-run` | read everything, write nothing |
| `--only a,b` | just these tags — the source's key (`aa`, `aa_Latn`) or the tag it resolves to (`aa-Latn`); stage 6, whose source is a list of writing systems, also takes a bare language subtag (`dmk`) and asks about every script langtags gives it; stage 4 takes either a target tag (`ace-Arab`) or the bare code (`ace`) and filters within its target list |
| `--limit N` | stop after N source entries — except stage 4, where it is the cap on books read per language (default 40) |
| `--verbose` | a line per entry |
| `--langtags <path>` | langtags.json somewhere other than the language chooser's copy |
| `--font-core <dir>` | the `font-core` package holding the bundled snapshots (stages 2, 3 and 5; stage 6 reads no snapshot) |
| `--skip-nonscripts` | stage 1 only: leave out the `Zxxx`/`Zyyy`/`Zzzz` "no script" tags |

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

**4 — `importBloomBooks.mjs`.** Alphabet and `font_support` claims from the text
and stylesheets of published BloomLibrary books, read live: the Parse catalogue
(`server.bloomlibrary.org/parse/classes`) for which books exist, and the
harvester's `bloomdigital` copy of each book for its HTML and its
`defaultLangStyles.css`. The mechanics and the argument behind them are in
[`../docs/bloom-walker-plan.md`](../docs/bloom-walker-plan.md).

**It has run over nine writing systems, not the library.** `TARGET_SYSTEMS` at
the top of the script is that list, and widening the run means replacing it: the
plan's algorithm for choosing which of BloomLibrary's ~1,077 resolvable
languages to walk is not implemented. **Sample-text harvest is not built
either** — it is the third output the plan describes, and the one carrying the
content risk that much of the library is scripture-adjacent.

Four things are particular to this stage:

- **The script comes from the text, not the catalogue.** Bloom's language rows
  carry no script; `isoCode` is a bare `ace`, and langtags' default for it is a
  guess that is wrong for any language Bloom publishes in a second script. So
  the harvested characters are partitioned by Unicode script property and each
  partition is filed under whichever target tag names that script (`ace` text in
  Arabic script → `ace-Arab`). Characters in a script no target names are
  counted and reported, and nothing is filed for them. That is why the target
  list names writing systems while the catalogue query takes bare codes.
- **The `lang` attribute is the only thing separating the languages.** The
  catalogue returns books where the target language is *any* of the book's
  languages, so filtering books by language is not filtering text by language.
  Front and back matter come out first — their credits and licence blocks carry
  the *vernacular* `lang` while holding English words — then `bloom-editable`
  divs whose `lang` exactly equals the code, with Bloom's `z`/`*`/`""`
  sentinels dropped.
- **A frequency floor, recorded rather than baked in.** One occurrence in
  10,000, never below 2. The floor, every kept character's count, and every
  character left below it all go into the evidence `details`, so the number is
  auditable and tunable. The `details` also names what the method cannot do:
  derived from the books' text, may miss rare letters and include loanword
  characters, and multigraphs are unrecoverable this way.
- **`$not` is not available.** The plan's server-side copyright filter,
  `{"copyright": {"$not": {"$regex": "Bible"}}}`, comes back
  `400 bad constraint: $not` from this Parse server. A negative-lookahead regex
  does the same work in one `$regex`, `$or`'d with `$exists: false` so a book
  carrying no copyright field is kept rather than silently dropped.

Ran 2026-08-18 over `ace-Latn ace-Arab aca-Latn acn-Latn guq-Latn acz-Latn
acr-Latn ach-Latn act-Latn` — 9 writing systems, 8 language codes. 14 books
listed, 12 excluded by the copyright filter, 2 read. **One writing system got
claims: `acr-Latn`** (Achi) — one alphabet claim of 39 grapheme clusters from
212,162 Latin letter occurrences at a floor of 22, and two `font_support`
claims, `Andika New Basic` (new) and `Andika` (already claimed by stages 5 and
6, so that row now carries an SLDR page, a Font Finder answer and a book). 4
evidence rows in all.

The other eight are all zero, and for two distinct reasons worth keeping
separate:

- **`ace` and `ach` have 6 harvested books each and every one is excluded by the
  copyright filter** — the whole corpus for both is Bible for Children. This is
  the case the plan predicted: a language whose entire corpus is filtered is
  visible as an excluded language rather than as a language with no data.
- **`aca`, `acn`, `guq`, `acz` and `act` have no BloomLibrary language row at
  all.** Nothing has been published in them.

Two facts about the `acr` corpus that the counts alone would hide, both recorded
in the evidence: the two books are one Achi dictionary uploaded twice (same book
guid, byte-identical text, so **1 distinct original title**), and both are
`computedLevel:4`, so the decodable-reader level bias the plan worries about does
not apply to this particular inventory.

**5 — `importLanguageFonts.mjs`.** `font_support` claims from two snapshots. From
`languageFonts.json`, the Language Font Finder's data: for each of 2,187 tags, the
families SLDR's `<sil:font>` elements name for that language, already trimmed to
what we may actually hand a user. About 1,854 writing systems and 8,380 claims.
From `fontFeatureDefaults.json`, the rest of the same XML attribute: the OpenType
feature settings for that font in that language, written to
`font_support.opentype_features` as tag -> value. 519 of the 2,187 tags carry any,
covering 509 writing systems and 1,404 (writing system, font) pairs.

Three things about those settings:

- **They belong to the pair, not to the language.** `cv43` is Charis's
  forty-third feature; Noto Sans's forty-third is something else or nothing. So
  the settings sit on the claim that already names both a language and a font.
  What the language actually needs — a particular capital Y, say, whatever font
  renders it — is a different claim we have not modelled yet.
- **Named after the standard, on purpose.** The attribute carries stylistic sets
  (`ssXX`) as well as character variants (`cvXX`), and the sets matter: Annapurna
  SIL takes `ss01 ss08 ss09 ss10` for Nepali. `character_variants` would have been
  a name that excluded data already in the column.
- **Stored exactly as given.** An integer per tag, 1-based into the font's own
  named forms, 0 meaning the font's default. Nothing is translated, because the
  names live in the font binary and the same tag means different things in
  different fonts. Making these legible is a real problem and a separate one.
Evidence cites the same per-language SLDR page stage 2 cites, because the
recommendations live in the same XML file as the exemplars — so one source row
supports both an alphabet claim and a font claim, which is exactly what happened.
Ran 2026-08-18: 8,380 claims across 1,854 writing systems, 9,870 evidence rows
(more evidence than claims because several SLDR entries, `aa` and `aa_ET` say,
resolve to one writing system and each cites its own page).

**SLDR's statements, whatever route the bytes take.** That run used
`languageFonts.json` as committed, refreshed on 2026-08-15; every run says
which route it took in `import_run.notes`. Either way the claims this stage
files are SLDR's per-language statements and cite SLDR pages. What the
Language Font Finder service itself answers when asked about a tag is a
different statement and a separate source, cached by stage 6 —
[`../docs/lff-and-the-language-list.md`](../docs/lff-and-the-language-list.md)
records how the two sources relate and why they are kept apart.

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
- **Script fallbacks are not filed.** The snapshot's `scriptDefaults` half is
  what the Font Finder answers when nobody has written a rule for a language.
  That is the service's statement rather than SLDR's, and stage 6 is where the
  service's answers get cached — whole, verbatim, and under their own source.
  This stage spreading pieces of the service's published data across languages
  would blur exactly the line the two sources exist to keep.

**6 — `importLffAnswers.mjs`.** A cache of what the Language Font Finder service
answers when asked about a tag. It walks every writing system langtags knows,
asks `https://lff.api.languagetechnology.org/lang/{tag}`, and files a
`font_support` claim for each family the response's `families` map names, under
the display name the response gives it. Evidence cites the service, the exact
query URL, and the moment we asked — never an SLDR page, because the two are
different statements and one claim can carry both kinds of evidence
([`../docs/lff-and-the-language-list.md`](../docs/lff-and-the-language-list.md)).
Needs nothing but langtags.json and a network connection.

Ran 2026-08-18: 8,500 tags asked, 8,444 answered, 56 answered `404`, no request
failures. 28,142 claims created and 36,517 evidence rows, across 8,444 writing
systems; 8,375 of the answers named a (writing system, font) pair stage 5 had
already claimed, so those claims now carry both kinds of evidence. 123 families
the service names had no `font` row yet.

Three things worth knowing:

- **Verbatim, and that word is load-bearing.** Every family named gets a claim.
  Nothing is filtered, trimmed or ranked, and nothing is rebuilt out of the
  service's published data files. The service is the authority on its own
  answers, so an importer deciding which of them count would turn a cache into
  an opinion.
- **The response does not say what kind of answer it is.** Where SLDR holds font
  information for the language the service returns that; where it does not, the
  service works from the tag's script and region. Nothing in the JSON
  distinguishes the two, so the evidence records the facts the response does
  give — the family id, whether it appeared in `defaultfamily` and under which
  roles, the API version — and no more.
- **It is somebody's public service.** Three requests in flight, a pause between
  launches, one retry on a 5xx or a network failure. A tag that still fails is
  counted and listed at the end; the run does not abort and does not guess.

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

`lib/bloom.mjs` is stage 4's half: the two BloomLibrary endpoints, the harvester
URL derivation, the div walk that pulls a book's text apart by `lang`, the
stylesheet parse, and the script partition. It is a separate file because it is
the part most likely to be wrong and the part worth reading on its own — and
because `harvesterBase` is a copy of blorg's `getHarvesterBaseUrlFromBaseUrl`
(`src/model/BookUrlUtils.ts`), which is another pair to keep in step.
