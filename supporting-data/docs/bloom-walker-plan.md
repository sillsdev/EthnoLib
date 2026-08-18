# Stage 4 — the BloomLibrary walker

Plan for the importer that reads BloomLibrary.org books and files claims from
what it finds. [`population-plan.md`](population-plan.md) sketched this stage;
this is the mechanics, the two selection algorithms, and the sanity check that
has to pass before it runs against anything real.

## Status

`tools/importBloomBooks.mjs` and `tools/lib/bloom.mjs` exist and have run, over
**nine writing systems chosen by hand** (`ace-Latn ace-Arab aca-Latn acn-Latn
guq-Latn acz-Latn acr-Latn ach-Latn act-Latn`) rather than over the library. Of
this document, what is built is the data path, the book filters, the lang-attribute
extraction, the alphabet harvest and the font harvest. What is **not** built:

- **The language-choosing algorithm.** `TARGET_SYSTEMS` in the script is a hand
  written list; nothing merges Bloom's language table, resolves scripts or sorts
  by what is missing. The 500-writing-system prize below is still a measurement,
  not a run.
- **`--compare` and the six-language sanity check.** It did not gate the first
  run, which was nine tags deliberately, and the bar proposed below has therefore
  not been tested. It remains the right thing to do before any wide run.
- **Sample-text harvest.**

Two mechanical corrections this document's own text needs, both found by running
it: `$not` is not implemented by Bloom's Parse server (see "Choosing books"), and
because the target list names writing systems, the script-mismatch response is
finer than "skip the language" — each script partition of a language's text is
filed under whichever target tag names that script, and a partition no target
names is counted and reported.

Counts from the run are in [`../tools/README.md`](../tools/README.md).

The prize, measured rather than guessed: **500 writing systems that BloomLibrary
has published books in and this database has no alphabet claim for at all**, 287
of them with five or more books. Bislama (374 books), Kreyòl (281), Oko (263),
Tumbuka (226), Temiar (220). None of those has an SLDR exemplar set. That is the
gap this stage exists to fill.

## Before anything else: the honest ceiling

A Bloom book is not on the approved-source list, and under
[`approved-sources.md`](approved-sources.md) that means **nothing the walker
files reaches a user**. It gathers into the database and waits.

That is deliberate and it is also the whole strategic question for this stage, so
it should be said before any of the mechanics rather than discovered afterwards.
Three honest positions, and they differ per claim kind:

- **Fonts — Bloom corroborates, it does not adjudicate.** A font named in a
  published book is somebody who actually set that language in that font and
  shipped it, which is real evidence of use. But there *is* an authority to defer
  to here: stage 5 imports the Language Font Finder's per-language
  recommendations, 8,380 claims, maintained by the same people at SIL who maintain
  the SLDR. On which fonts suit a writing system, they are better placed than any
  inference we can draw from a book file. So Bloom's contribution is agreement — a
  recommendation somebody actually used in print — and occasionally a disagreement
  worth a human look. Not a rival answer.
- **Alphabets — Bloom is genuinely weaker.** An inventory scraped from running
  text can miss rare letters, absorb loanword characters, and cannot recover
  multigraphs at all (SLDR spells Naami's `kw` as one entry; no character count
  will ever discover that). The sanity check below is designed to put a number on
  how much weaker.
- **Sample texts — Bloom is fine as text and risky as content.** Much of the
  library is scripture-adjacent, and a scripture passage as _the_ sample text for
  a language can offend the very people we are trying to serve.

So the walker's job is to gather and to report how good its own output is. What
gets approved is a separate decision, and the sanity check is what it should be
based on.

## The data path (verified, not assumed)

Two public endpoints, no auth, no zip handling, no HTML scraping of
bloomlibrary.org.

**Books and languages** come from the Parse REST API, which needs only an app id
that the web app already ships to every browser:

```
https://server.bloomlibrary.org/parse/classes/books
https://server.bloomlibrary.org/parse/classes/language
header: X-Parse-Application-Id: R6qNTeumQXjJCMutAJYAwPtip1qBulkFyLefkCE5
```

**Book content** comes from the harvester's normalised digital version — one GET
per book, already-unpacked HTML, the exact file bloom-player renders:

```js
// baseUrl:  https://s3.amazonaws.com/BloomLibraryBooks/<uploader>%2f<guid>%2f<bookname>%2f
// becomes:  https://s3.amazonaws.com/bloomharvest/<uploader>%2f<guid>/
//           + "bloomdigital%2findex.htm"
function harvesterBase(baseUrl) {
  let s = baseUrl.endsWith("%2f") ? baseUrl.slice(0, -3) : baseUrl;
  const i = s.lastIndexOf("%2f");
  if (i < 0) return undefined;
  return s.slice(0, i).replace("BloomLibraryBooks", "bloomharvest") + "/";
}
```

Copied from blorg's `getHarvesterBaseUrlFromBaseUrl` / `getUrlOfHtmlOfDigitalVersion`
(`d:/blorg/src/model/BookUrlUtils.ts`) — keep them in step.

Do **not** try to guess the raw upload's `<bookname>.htm` under `baseUrl`. It
works for books whose folder name matches their file name and 404s for the rest;
a probe of eight Haitian books returned eight 404s that way and six of six 200s
through `bloomdigital`. The harvester path also requires `harvestState: "Done"`,
which is a filter the walker wants anyway.

Fonts come from a sibling file, not the HTML: `bloomdigital%2fdefaultLangStyles.css`,
which carries per-language rules like `[lang='ht']{ font-family: 'Andika New Basic' }`.
The book's inline `<style>` usually does not.

## Choosing languages

```
1.  GET /classes/language  →  1,746 rows
2.  Merge by isoCode, summing usageCount.
      1,228 distinct isoCodes; 296 of them had duplicate rows.
      Bloom's language table has more than one row for the same code
      (ru appears with 571 and 437 books). Not merging would split a
      language's books across two runs and understate every count.
3.  Drop isoCode-less and zero-book rows.
4.  resolveWritingSystem(isoCode, langtagsIndex)   → lib/langtags.mjs
      1,077 resolve. 13 do not, and they are all one thing: `qaa`
      private-use codes (`qaa-x-lohorung`, `qaa-GH-x-Asante T`) plus a
      stray `kmr`. 27 of the 40-odd unresolvable books are plain `qaa`.
      Skip and count them; there is no writing system to file against.
5.  Drop Zxxx / Zyyy / Zzzz (lib/langtags.mjs NON_SCRIPTS).
      This is not bookkeeping: Papua New Guinean Sign Language has 281
      books and resolves to pgz-Zxxx. A sign language has no character
      inventory and an "alphabet" for it would be nonsense.
6.  Sort: lacks-an-alphabet-claim first, then book count descending.
7.  --limit N, so a run is bounded and re-runnable.
```

Step 4 hides a real problem. **Bloom's language rows carry no script.** `isoCode`
is a bare code for all but 110 rows, and of those only a handful name a script
(`cmo-Khmr`, `gwc-Arab`, `fia-Copt`); the rest are private-use or region tags
(`ceb-x-boholano`, `es-GT`). So the script is langtags' default for that
language, which is a guess, and it is wrong for any language Bloom publishes in a
second script.

The fix is to check the guess against the text rather than trust it: classify the
harvested characters by Unicode script property, and if the dominant script is
not the one langtags predicted, **skip the language and report it** rather than
filing an alphabet under a tag it does not belong to. A mismatch is interesting
news, not an error to paper over.

## Choosing books

```
GET /classes/books
  where: { langPointers: { $inQuery: { where: { isoCode: <iso> },
                                       className: "language" } },
           harvestState: "Done",          // bloomdigital exists
           inCirculation: { $ne: false },
           // $not is NOT implemented by this Parse server — it answers
           // `400 bad constraint: $not`. A negative lookahead does the same
           // work inside one $regex, and the $or keeps a book that carries no
           // copyright field at all, which a bare regex would drop silently.
           $or: [ { copyright: { $regex: "^((?!Bible).)*$", $options: "is" } },
                  { copyright: { $exists: false } } ] }
  keys:  title,copyright,baseUrl,tags,features,langPointers,updatedAt,objectId
  order: objectId                          // deterministic, so re-runs agree
  limit: <cap>                             // never the whole result set
```

### How many books get read

**At most 40 per language.** The catalogue reports 982 books for Tok Pisin and
1,098 for Kyrgyz; those are counts of what exists, not instructions to read it
all. Reading everything would be tens of thousands of requests for an inventory
that stops changing long before that.

40 is a ceiling, not a target. Read books in catalogue order until the target
language's character count reaches the threshold, then stop; most languages will
stop well short of 40. The measurement below reports recall at 5, 10, 20 and 40
books precisely so this ceiling can be replaced by a measured one — if recall is
flat from 20 books onward, the cap should come down.

Two consequences worth stating plainly. The whole six-language validation reads
about 240 books, not the 3,647 the table's counts add up to. And for the
500-language production run the ceiling binds on fewer languages than it appears
to: only 79 of the 500 have as many as 20 books, so for more than four in five the
corpus runs out before the cap does.

Then, per book, in order, accumulating until the target language's character
count crosses the threshold or the books run out:

- **Skip `system:problem-*` tags.** Bloom's own marker that something is wrong
  with the book.
- **Skip any book whose `copyright` contains "Bible", for every purpose.** Not
  only for sample text: these books are excluded from alphabet and font
  harvesting too. The catalogue supports this server-side, so it costs nothing to
  apply:

  ```
  $or: [ { copyright: { $regex: "^((?!Bible).)*$", $options: "is" } },
         { copyright: { $exists: false } } ]
  ```

  This is not the topic tags by another route. 3,879 of the library's 29,264
  harvested books match, and **2,925 of them carry neither `topic:Bible` nor
  `topic:Spiritual`** — an entire publisher's output ("Copyright © 1992, Bible
  Translation Association of Papua New Guinea") tagged only `topic:Spiritual` on
  some books and nothing on the rest. Filtering on tags alone would have read all
  2,925.

  It does cost real evidence, and that is accepted rather than overlooked: those
  books were valid alphabet and font evidence under the earlier rule, and for a
  few languages they may be most of what BloomLibrary has. The importer should
  report per language how many books the copyright filter removed, so a language
  whose entire corpus is excluded is visible as an excluded language rather than
  as a language with no data.
- **For sample text only, skip `topic:Bible`, `topic:Spiritual`, and
  `topic:Primer`.** The first two are the offence risk
  [`population-plan.md`](population-plan.md) flagged; the third is a teaching
  primer, which is fine text and a poor advertisement for a language. In a
  500-book Tok Pisin sample, 14 books were `topic:Bible` and 14
  `topic:Spiritual`, so this costs little coverage.
- **Note near-duplicates.** Much of the library is one shell book translated
  many times, so N books can be far less than N independent witnesses. Group by
  `originalTitle` where present and record the distinct-original count in the
  evidence, so "found in 30 books" cannot quietly mean "found in one book
  thirty times".

### The level bias, which is the sharpest objection to this whole stage

Early-literacy books **deliberately** restrict their alphabet. That is the point
of a decodable reader: introduce five letters, write a book using only those
five. Harvesting inventories from level-1 books therefore does not merely
under-sample the alphabet, it systematically under-reports it, and the shortfall
is by design rather than by chance — which means more level-1 books do not fix
it. Bloom carries the signal to see this: `computedLevel:1` through
`computedLevel:4`, present on most books (of 500 Tok Pisin books, 134 were
level 1, 180 level 3, 106 level 4), plus `topic:Primer`.

Three responses, in order of how much they cost:

1. **Aggregate across levels and never from level 1 alone.** Restriction only
   hides a letter if _every_ book in the sample avoided it, so a mixed sample
   mostly self-corrects.
2. **Weight toward higher levels.** Prefer `computedLevel:3`/`4` when there is
   enough text there, and fall back to lower levels only to reach the threshold.
3. **Record the level mix in the evidence `details`** — "derived from 24 books
   (levels 1:3 2:6 3:9 4:6), 18 distinct originals, 41,000 characters" — so a
   reader can see whether an inventory came from a corpus that could have shown
   more letters than it did.

And then measure it, because it is measurable: the sanity check below computes
recall against SLDR per level band. If level-1-only recall is 0.6 and mixed-level
recall is 0.97, we know the size of the effect instead of arguing about it.

## Reading the text: the lang attribute is the whole game

Bloom books are routinely multilingual, and much more so than the catalogue
suggests. One Haitian Creole book carried four languages in a single file:

```
{"en":651, "fr":416, "ht":327, "tpi":141}     characters of text, per lang
```

Another Haitian book turned out to be mostly French, because the Parse query
returns books where the target language is _any_ of the languages. **Filtering
books by language is not filtering text by language.** Only the `lang` attribute
separates them, and getting this wrong files French letters as Haitian Creole's
alphabet.

So, per book:

1. Cut the front and back matter first — `bloom-frontMatter` and
   `bloom-backMatter` pages. This is not tidiness: credits, licence blocks and
   "Writer: Clare Verbeek, Thembani Dladla and Zanele Buthelezi" appear there
   tagged with the _vernacular_ lang, so the boilerplate poisons the inventory
   with English letters and English names. One book's 688 "Haitian" characters
   were mostly this.
2. Take `bloom-editable` divs whose `lang` **exactly equals** the target code.
   No prefix matching: `ht` must not collect `ht-x-something` silently, and a
   book using `cmo-Khmr` should be reported, not folded in.
3. Drop Bloom's sentinels: `lang="z"`, `lang="*"`, `lang=""`. They mark "no
   language" and hold placeholder `&nbsp;` content. In one 6-language book they
   accounted for 10 of the 111 lang attributes.
4. Strip tags, decode entities, NFC-normalise.

## What gets filed

**Alphabet.** Aggregate all the language's text, take grapheme clusters that are
letters (Unicode `L*`, keeping attached `M*` combining marks on their base),
discard digits, punctuation and whitespace, with one exception: an
apostrophe-shaped character with a letter immediately before it is a letter, not
punctuation. Achi's `b' ch' k' q' t' tz'` and glottal stops in a great many
orthographies are spelled that way, and a scan that throws them out files an
alphabet its own readers would not recognise.

Then **fold** the inventory before applying the floor, because folding decides
what an entry is: lower case, and one apostrophe. Both are the convention every
source these claims sit beside follows — an SLDR exemplar set lists `a`, not `A`
and `a`, and writes the apostrophe as U+02BC — so an unfolded claim cannot
accumulate support alongside an SLDR one for the same alphabet, it can only sit
next to it looking different. Books spell the apostrophe with whatever key was
pressed, U+0027 and U+2019 inside one book, so folding is also what stops one
letter arriving as two.

Neither folding may lose what the text held: the evidence writes out every
uppercase form found with its count, and every apostrophe codepoint with its
count, so the raw observation is recoverable from the row.

Apply a **frequency floor** so a single typo or a loanword hapax does not become
a letter, and record the floor and the per-character frequencies in the evidence
`details` so the floor is auditable and tunable rather than baked in.

**One book, two catalogue entries.** The same upload reaches the library twice
when two accounts publish it, each with its own `objectId` and book page and both
pointing at one harvested folder. Nothing before reading the text tells them
apart, and reading both counts every letter twice. Books whose extracted text is
identical to a book already read are dropped, first in `objectId` order kept, and
the dropped ids named in the evidence.

State the limitation in `details`, in the words
[`population-plan.md`](population-plan.md) already chose: derived from N books'
text; may miss rare letters and include loanword characters. Add the one that
doc did not name: **multigraphs are unrecoverable this way**, so a derived
inventory is structurally different from an SLDR one, not merely less complete.

**Fonts.** Parse `defaultLangStyles.css` for `[lang=<iso>]{ font-family: X }`.
One `font_support` claim per (writing system, family), evidence citing each book.
Record one further observable fact: whether the book gave this language a
different family from its other languages (`ht: Andika New Basic` while
`en`/`oks` got `Andika`) or the same family as all of them (`fr`/`en`/`ht` all
`ABeeZee`). Write it as the observation and stop there — "the book's other
languages (en, oks) use Andika" — not as a reading of the author's intent. The
inference that differing means chosen and matching means unconsidered may well be
right, but it belongs to whoever queries this data, not to the row.

**Sample text.** A single `bloom-editable` block, 40–500 characters, from a
non-excluded book with substantial vernacular text. Carry the book's topic tags
into the evidence `details` regardless, so a later reader can judge the content
without re-fetching the book.

**Evidence, for all three.** `source.type = 'book'`, `title` = the book's title,
`url` = `https://bloomlibrary.org/book/<objectId>`, `submitted_via: 'import'`.
One source row per book, so a disputed claim traces to the exact book.

Note what this means for [`approved-sources.md`](approved-sources.md): every book
is its own source title, so approving Bloom output can never be one INSERT the
way approving CLDR is. If Bloom claims should ever be usable, the predicate needs
a rule about `source.type = 'book'`, not a list of titles. Worth knowing before
someone tries.

## The sanity check, which a wide run should wait on

Run the walker against languages where SLDR already gave us an answer, and
compare. There are **134 languages with 20+ Bloom books and an existing SLDR
alphabet claim** to choose from. Six, picked so that each stresses a different
failure mode:

| tag | books | what it tests |
| --- | --- | --- |
| `tpi-Latn` | 982 | the easy baseline — plain ASCII Latin, plenty of text |
| `ha-Latn` | 487 | extended Latin (`ɓ ɗ ƙ`) — does recall survive rare hooked letters? |
| `ky-Cyrl` | 1,098 | a non-Latin alphabetic script |
| `ne-Deva` | 498 | an abugida — combining marks and conjuncts, the hardest clustering |
| `th-Thai` | 347 | no word spaces, so tokenisation assumptions break loudly |
| `wsg-Telu` | 235 | a second abugida, minority script, thinner corpus |

For each, report against the SLDR set S and the derived set D:

- **recall** `|D∩S| / |S|` — did we find the real letters? The number that says
  whether this technique works at all.
- **precision** `|D∩S| / |D|` — did we invent letters? Extras are expected
  (loanword characters), so **list them** rather than only counting them: `q x`
  in a language without them is a loanword, `Ã` is a bug.
- **the misses, spelled out.** A miss that is a multigraph is a known structural
  limit; a miss that is a plain letter is a corpus or a threshold problem.
- **recall by level band** — level 1 only, levels 3–4 only, mixed. This is the
  measurement of the decodable-reader bias, and the reason to gather it here
  rather than argue about it later.
- **recall as a function of corpus size** — at 5, 10, 20, 40 books. This is what
  sets the minimum book count for the other 494 languages, and it is the only
  principled way to pick that number.

Then run it against **`ht-Latn`** (281 books, no SLDR alphabet) as the real
target: the case the stage exists for, where there is nothing to check against
and the output has to be read by eye.

**Proposed bar before any write to the live database:** recall ≥ 0.95 on
single-character SLDR entries across the mixed-level sample, precision ≥ 0.85
with every extra character explainable. If Devanagari or Thai fall far short, the
right move is to restrict the alphabet harvest to the scripts where it works and
say so, not to lower the bar.

`--dry-run` everywhere, as with stages 1–3. The sanity check is a `--compare`
mode that writes nothing and prints the table above.

## Order of work

1. `lib/bloom.mjs` — Parse queries, harvester URL, per-language text extraction.
   Testable on its own, and the part most likely to be wrong. **Built.**
2. Font harvest, which is the least controversial output. **Built.**
3. Alphabet harvest. **Built**, and it went in without step 4 having run, which is
   the deviation to be aware of: the nine-tag run was small and deliberate, so the
   inventories it produced are readable by eye, and no bar was cleared.
4. `--compare` mode and the six-language table. **Not built**, and still what a
   wide run should wait on.
5. Sample-text harvest, last, because it carries the content risk and the least
   urgency. **Not built.**

## Open questions

- **Should Bloom-derived claims ever be usable?** Deferred, and the reason the
  sanity check produces numbers rather than a verdict. Fonts and alphabets
  plausibly deserve different answers.
- **How much of the library to walk.** 1,077 languages × up to 40 books is
  ~40,000 GETs of ~50KB. Fine as a slow background run, rude as a tight loop.
  Rate-limit, cache by book `updatedAt`, and make a re-run cheap.
- **Whether a language written in two scripts in Bloom can be handled at all**,
  or only detected and skipped. Detection is in the plan; handling is not.
