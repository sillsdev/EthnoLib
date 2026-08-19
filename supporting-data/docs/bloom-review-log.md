# What reviewing the book scan's output has caught

`importBloomBooks.mjs --review` writes a per-book report — what each book
contributed to a claim, plus a short excerpt of its text — for a person or a
model to read through before the claims are trusted. The report itself is not in
this repository (it holds other people's book text; see `.gitignore`). This file
is the part that is: how many books were looked at, and what the reading found.

It exists to answer one question. Reviewing every book costs something, and the
only honest way to decide whether to keep doing it is to watch the rate at which
it finds real problems. If a few hundred more books turn up nothing, the review
stops being worth running on every book and becomes something to run on a sample
after a change. Rows below, not opinions, are what should settle that.

Findings are described here in our own words. Excerpts stay out.

| Date | Scope | Books reviewed | Problems found | Rate |
| --- | --- | --- | --- | --- |
| 2026-08-19 | dry run, sample of 6 `a` codes chosen for their awkwardness, cap 4 | 13 | 3 | 3 in 13 |
| 2026-08-19 | dry run, 6 more `a` codes added to widen the evidence, cap 10 | 36 | 2 more | 5 in 36 |
| 2026-08-19 | dry run, same sample after the fixes, cap 4 | 29 | 0 new | 5 in 65 |
| 2026-08-19 | dry run, 15 codes that also have an SLDR alphabet, cap 12 | 155 | 5 | 10 in 220 |

## The comparison against alphabets we already have

Reading excerpts is one way to check the scan. Comparing its answer against
somebody else's answer for the same language is the other, and it is the stronger
one where it is available: 586 of BloomLibrary's language codes also have an
alphabet from the SLDR. `--compare-sldr` prints the difference, and what that
found is written up in `sldr-comparison.md`, including the composition question
this file used to list as still to do. Short version: combining marks were being
joined to their letters in scripts whose orthographies list them separately, which
cost Thai 24 of its 73 exemplar entries and invented 200 entries no alphabet
contains. Fixed, per script, from the SLDR's own convention.

## 2026-08-19 — first review, 13 books

The sample was picked to hit the hard cases rather than to be representative:
one multi-script code (`atb`), one single-book code (`abl`), one code with a
private-use subtag (`ahk-Laoo-x-Ershee`), one region-only code (`ar-SA`), one
code langtags does not list (`arb`), and one sign language (`ase`).

**1. An English alphabet filed under Arabic writing systems.** The run filed
`ar-Latn-SA` with `a b c … z` and `arb-Latn` with the same, alongside the Arabic
inventories those books are actually written in. The Latin characters are real
text inside `bloom-editable` divs whose lang is the Arabic code — a date line
("April 26, 2026"), a bloomlibrary.org URL, an all-caps English warning not to
use that version of the book, the words "power point". Between 1,000 and 2,500
Latin letter occurrences per book, easily past the frequency floor. Front and
back matter were already excluded; this is body text with English in it. Caught
by reading the excerpts, and it is exactly the failure derived facts alone hide:
`a b c … z` looks like a perfectly ordinary Latin alphabet.

**2. The tatweel is counted as a letter in no script.** U+0640 ARABIC TATWEEL is
`\p{L}` but its Script property is Common, not Arabic (Script_Extensions is
Arabic), so it falls through `scriptOf` into the "unidentified" bucket and is
reported as letter occurrences in a script we do not test. Small — 3 to 13
occurrences per book — and nothing is filed from it, but the report line is
misleading and a justification stretch is not a letter.

**3. A Lao inventory of 100 entries from 1,267 occurrences.** For
`ahk-Laoo-x-Ershee`, every base-plus-mark combination is its own entry: ກ, ກີ້,
ກຼິ, ກຼ່, ກຼ້, ກ່, ກ້, ກໍ່ are eight entries from one consonant. That follows
from the documented decision to keep combining marks attached to their base, and
for an abugida it is defensible as "letters as written" — but it does mean the
claim is closer to a syllable inventory than to the consonant-and-vowel list an
SLDR exemplar would give, and these claims are meant to be comparable with SLDR.
Devanagari will do the same at 200 books. Not a bug; a question the wide run
makes urgent.

Invariants flagged 2 of the 13 books, both the same check: one book supplying
more than 40% of a script's letter occurrences (`atb-Latn` 52%, `ar-Latn-SA`
42%). Both true and both worth seeing. Neither is counted as a problem above,
since a small corpus is lopsided by arithmetic rather than by error.

## 2026-08-19 — second review, 23 more books, then the fixes

Six more codes were added to test the first review's conclusion against more
data: `am` (Amharic), `ahk` (Akha), `awa` (Awadhi), `aph` (Athpariya), and the
two already-read Arabic codes at a higher cap.

**4. Amharic acquired a Malayalam alphabet, and a Telugu one.** `am-Mlym` was
filed from 4 Malayalam letter occurrences in one book of nine, one character of
which appeared twice; `am-Telu` from 5 Telugu occurrences. Same cause as finding
1 and clearer: the rarity threshold was computed inside each script's own bucket,
so a bucket holding 4 letters set its own bar at 2 and anything in it passed.
Amharic's Ethiopic bucket, holding 367,383 letters, required 37.

**5. Akha was losing 22.8% of its letters.** Akha writes tone with modifier
letters, `Iˬsuˆ dawˬ oeˇ`. Unicode gives those `Script=Common`, since many
languages share them, so they matched no script test and were dropped as
unidentified: 7,439 of Akha's 32,634 letters. The alphabet filed for Akha was
`a b c d e g h i j k l m n o p q r s t u w y z`, missing the marks that tell its
words apart, across 108 books.

### What was changed, and what it did

- The rarity threshold is now one in ten thousand of everything the language's
  books carry in any script, not of one bucket. Four stray characters no longer
  clear a bar of their own making.
- A script is filed only when langtags lists it for that language. When langtags
  has no entry for the language at all (`arb`), only its largest script is filed.
  What was refused, and why, is written into the evidence of the claims that were
  filed, so a reader of one alphabet can see what else was in the books.
- A letter Unicode gives no script of its own is now counted under the script of
  the letter before it, which is the rule the apostrophe already followed.

Re-running the same sample: `am-Latn`, `am-Telu`, `am-Mlym`, `ar-Latn-SA` and
`arb-Latn` are gone, each with a line saying why. All nine claims that were right
survive. `ahk-Latn` now reads `a b c d e g h i j k l m n o p q s t u w y z ˆ ˇ ˬ ꞈ`.

One consequence to be aware of: the Arabic tatweel (U+0640) follows a letter, so
it is now filed rather than dropped, and appears in `arb-Arab`'s inventory as
`ـ`. It is a justification stretch rather than a letter. Its count is in the
evidence where a reader can judge it; excluding it would be a one-line addition.

The invariants flagged the tone marks as foreign to Latin script, which was the
checking code being wrong rather than the data. Letters with no script of their
own are now exempt from that check, as the apostrophe already was.
