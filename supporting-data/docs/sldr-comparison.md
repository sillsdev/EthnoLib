# Checking the book scan against alphabets we already have

The BloomLibrary scan derives an alphabet from the text of published books. On
its own there is no way to tell a good answer from a plausible one: `a b c … z`
looks like an alphabet whatever language it was filed under.

For 586 of the language codes BloomLibrary publishes in, we already hold an
alphabet from the SIL Locale Data Repository, 338 of them with five books or
more. Those are the codes where the scan's answer can be checked against
somebody else's, and they are the only place a fault in the reading of the books
shows up as something other than a believable alphabet.

`importBloomBooks.mjs --compare-sldr` does the checking. For every alphabet a run
files, it prints how that inventory differs from each SLDR exemplar set for the
same writing system: how many of the SLDR's entries the books also produced,
which of them the books never used, and which entries the books produced that the
SLDR does not list, each with the number of times it occurred. It writes nothing
and decides nothing.

Both sides are folded the same way before anything is compared: `alphabetKey`
lower-cases and normalises to NFC, and `foldCluster` maps every apostrophe-shaped
character to U+02BC. Skipping either step invents differences that read exactly
like differences in the data — the SLDR writes U+A78C SALTILLO for Mam, Ixil and
Kaqchikel where their books carry U+02BC, and unfolded that looks like four
languages missing a letter and using a foreign one.

## A difference is not a fault

Both sides are describing real things and they are not the same thing. An SLDR
exemplar set is a description of an orthography. A shelf of BloomLibrary books is
what people published. Where the two disagree, any of these may be why, and only
the first is ours to fix:

- **The scan read the books wrongly.**
- **The scan cannot see what the SLDR is describing.** An alphabet whose letters
  are written with two characters is beyond reach from text alone.
- **Publishers do not use a letter the orthography lists.** Guatemalan
  government-published books in Mayan languages leave off the accents the SLDR
  lists. An orthography a linguist established and a practice that dropped part
  of it are both real, and the books are evidence about the second.
- **Publishers use a letter the orthography does not list.** Loan words and
  names bring `v`, `c`, `x` and `z` into languages whose exemplar sets have
  never listed them.

So the comparison is read, not enforced. Nothing here rejects a claim for
differing from the SLDR.

## What the comparison says about the books as a source

Eighteen writing systems have been compared: fifteen chosen to spread across
scripts and to include the four Guatemalan Mayan languages whose SLDR sets carry
named orthography variants, plus three that fell out of the sample of the `a`
codes. Per-language diagrams and alphabets are in the review report; the shape of
the result is this.

The median writing system reproduces 88% of the SLDR's entries, which is high
enough to say the books are being read correctly. Whether reading books tells us
an alphabet we did not already have is a different question, and there the answer
is mostly no:

- Three of the eighteen produce every entry the SLDR lists — Tok Pisin, Cebuano
  and Chichewa, the three smallest alphabets, each with twelve books.
- Seven produce a strict subset and add nothing at all.
- Eight overlap partially, and in almost all of those the entries the books hold
  alone are loan letters, a different way of writing the same sound, or the same
  character composed differently.
- Two hold something the SLDR lacks that a person should care about: Chichewa's
  apostrophe, 119 occurrences and absent from its exemplar set, and five
  Kaqchikel vowels the plain `cak` set omits while its town-named variants list
  them.

Completeness falls as the alphabet grows, so the languages with the least data
elsewhere are the ones books serve worst. Amharic reaches 180 of 282 Ethiopic
entries from four books; Bengali 54 of 72; Khmer 61 of 74; Thai 59 of 73. The
19-to-24-entry Latin alphabets reach all of theirs.

Published books answer "is this letter in use, and how often" well, and "what is
the complete alphabet" badly.

## What an alphabet entry is, and why

Whether a combining mark is an entry of its own is the orthography's business
rather than Unicode's, and the SLDR's own sets answer it per script. Counting
bare-mark entries against letter-plus-mark entries across all 1,891 SLDR sets:
Devanagari 741 to 362, Arabic 450 to 27, Thai 56 to 0, so those scripts list the
mark separately. Latin goes the other way, 616 to 1,136, and so do Myanmar,
Hebrew, Tifinagh and Osage. `MARKS_ARE_SEPARATE_ENTRIES` in `lib/bloom.mjs` is
that list, every script where bare marks outnumber the combinations at least two
to one.

Doing it per script rather than everywhere is what protects Latin. Jarai writes
`ơ̆`, U+01A1 with a combining breve, which Unicode has no single character for and
the SLDR lists as one entry; splitting Latin would file a bare breve beside the
`ơ` and lose the letter. Its books produced 38 entries including `ơ̆` and `ư̆`
intact, matching 35 of the SLDR's 40.

The cost falls on the abugidas. Nothing filed for Devanagari reads as a syllable a
person would look for, and a conjunct the SLDR lists whole, Bengali `ক্ষ`, appears
only as the three characters it is written with.

Two consequences elsewhere in the code. A combining mark's Script property is
`Inherited`, which is Unicode saying "ask the letter I am written on", so the
check that a filed inventory holds only its own script's characters exempts marks
the way it already exempts the apostrophe — otherwise it flags every vowel sign
in Thai, Nepali, Bengali, Khmer and Arabic. And `languageRows` asks the Parse
server in batches of forty codes: Parse takes its query in the URL, and a `$in`
list past about sixty comes back 404 from in front of the server rather than as a
Parse error, so a list that is too long looks like a missing class.

## What the scan cannot find, and will keep reporting

**Letters written with two characters.** Hausa's SLDR set lists `sh`, `ts` and
`ƴ`; the books use all three and the scan reports `s`, `h`, `t`, `s` and never
sees a letter. K'iche' is the extreme case: its SLDR set lists `aʼ bʼ ch chʼ eʼ
iʼ kʼ qʼ tz tzʼ tʼ uʼ`, twelve of its 32 entries, and the scan matches 18 of 32
while reporting `ʼ`, `c`, `h` and `b` separately. Nothing in the text says two
characters are one letter, so these claims are inventories of characters. The
SLDR entries they cannot match are printed rather than passed over.

**Accents the publishers left off.** Mam, K'iche', Ixil and Kaqchikel books do
not use `á é í ó ú ñ`, which their SLDR sets list. Kaqchikel and K'iche' also
skip the Spanish-only `é ñ`. This is the case that makes the whole comparison a
reading exercise: the SLDR is right about the orthography and the books are right
about the practice.

**Letters the orthography does not list.** Tok Pisin books carry `v` (79) and `c`
(74), Cebuano `c` (15) and `x` (14), Chichewa `v` (56). Loan words and names.

**One character where the SLDR writes two.** Soninke books use `ɲ` (104) where the
SLDR set lists `ny`. A genuine difference between two ways of writing the same
sound, not an error on either side.

**A precomposed letter where the SLDR writes a letter and a mark.** Zaiwa's SLDR
set lists the bare grave, acute and circumflex; its books, and our entries, carry
`â é á ù î ô ú û` precomposed, which is what NFC produces and what a font has to
render. 310 of the 1,654 Latin-script SLDR sets are written that way, so about a
fifth of Latin-script languages will show this difference. The per-script rule
follows Latin's majority convention and cannot follow both. Neither side is wrong
about the text.

**Arabic is the closest agreement of any language checked**, and it is the case
the per-script rule enables: `ar-Arab` matched 44 of the SLDR's 45 entries from
five books, missing only the superscript alef.

## Something else the comparison turned out to do

Kaqchikel's SLDR data is nine sets: one plain and eight named for a town or a
dialect area. The books match `cak-x-xenacoj` best, 31 of its 33 entries, and the
plain `cak` set worst, 29 of 31, because the books do not use `w`, which three of
the variants also omit. So the comparison says which described orthography a
shelf of books is closest to. Nothing uses that yet.

## Open: an English alphabet filed under Nepali and Bengali, in Latin script

`ne-Latn` is filed with 19 entries from one book and `bn-Latn` with a single
entry, `a`. This is the hole the langtags check cannot close: langtags does list
Latin for Nepali and for Bengali, both of which are really written in Latin
sometimes, so English inside a vernacular-tagged div is Latin text in a script
the language is allowed to use. Nothing yet distinguishes it from romanised
Nepali.

A one-entry alphabet is plainly not an alphabet, but where the line sits, and
whether the test should be a minimum entry count, a minimum share of the
language's letters, or more than one book, is a judgement call that has not been
made.

## Where this leaves the confidence question

The scan reproduces most of an independently-derived alphabet in every language
checked, and where it does not, the reason is written down and is either a limit
of reading text or a real difference between an orthography and its practice.

For the wide run over the `a` codes, the sample gives: Awadhi 41 Devanagari
entries, Athpariya 42 matching 41 of the SLDR's 47, 35 entries for the Lao
inventory of Akha's Ershee orthography, harakat in `ar-Arab-SA` and `arb-Arab`,
and Amharic at 180 of the SLDR's 282 from four books. The invariants flag four
books across the sample, all of them one book dominating a small corpus, and none
of them a wrong-script claim.

Still open: the comparison has run on eighteen writing systems out of the 338
codes that have both an SLDR alphabet and five or more books, and the
Latin-script English problem above has no answer yet.
