# The bundle as a projection of this database

A decision note, so it doesn't get re-argued. Nothing here is built yet.

## The decision

**This database becomes the source of the bundle `@ethnolib/font-core` ships.
It does not become the source of the facts.**

Those are different things, and keeping them apart is what stops this project
turning into something it has no business being. SLDR, CLDR, gflanguages and
Ethnologue remain the authorities on their own data; nobody here is one. What
the database becomes is the place every claim *converges* — the imported ones
and the ones people tell us — and the bundle stops being a file that generator
scripts write and becomes a projection of what has converged.

Today it runs the other way: `refresh*Snapshot.mjs` fetches from SLDR and
gflanguages and writes `bundled/*.json` directly, and this database's stage 2
and stage 3 importers read those same files. After the flip, the refresh scripts
feed the database and an exporter writes the bundle.

Why the database has to be the source eventually: crowd-sourced claims arrive
here and nowhere else. A bundle generated from upstream alone can never carry
them, and a bundle maintained by hand alongside them would drift. There is no
third option that keeps both.

## What decides what goes in the bundle

`rank` is the general answer and it does not exist yet. So for the first
exporter the criteria is **provenance, not rank**: a claim goes in the bundle if
its evidence cites an approved source — SLDR, gflanguages, and whatever else we
add to that list. **No crowd-sourced claim reaches the bundle yet.**

That is a deliberately conservative rule with two good properties. It is
queryable today, so the exporter does not have to wait for the ranking decision.
And it round-trips: since stages 2 and 3 imported *from* the bundle, exporting
"claims sourced from SLDR" should hand back what is already there, so any
difference between the exporter's output and today's bundle is a bug in one of
them. That makes the first exporter its own test.

When a ranking process does exist, it becomes the gate crowd data has to pass,
and this provenance rule becomes one input to it rather than the whole of it.

## The rule that stops the loop

**Once the exporter exists, importers read upstream — never the shipped
bundle.**

Stages 2 and 3 currently read `bundled/alphabets.json` and
`bundled/sampleTexts.json`. The moment an exporter writes those same files, an
importer run would re-import our own output and file fresh evidence rows citing
the SLDR for values that came out of this database. The claims would look
better-supported every time anyone ran anything.

So the exporter's output and the importers' input must never be the same file.
Point the importers at `refresh*Snapshot.mjs`'s raw output, or at the services
directly.

## The bundle's shape has to grow

Today each entry is one answer: a tag maps to one exemplar string, one passage.
The database holds siblings, and some of them are siblings for good reasons —
two reputable sources disagreeing, or a real distinction between orthographies
and regions. The bundle should carry them rather than pick one, and let the
chooser decide what to do with more than one.

Which means each entry becomes a list, and each item needs enough to tell it
from its siblings:

- the **qualifier** — the region or orthography the claim came in under
- the **source**, so the chooser can say where a passage came from
- the **orthography label**, where the claim carries one

### Qualifiers are recoverable, and not from prose

The database is keyed by writing system, so `de-CH` and `de` both become
`de-Latn` and the region appears to be lost. It isn't. Every evidence row's
`source.url` is the exact upstream file:

    https://github.com/silnrsi/sldr/blob/master/sldr/d/de_CH.xml
    https://github.com/googlefonts/lang/blob/main/Lib/gflanguages/data/languages/yo_Latn_BJ.textproto

So the exporter reads the original key off a URL — structured, stable, and
nothing like parsing the evidence `details` string. **No schema change is needed
to carry the distinction.**

### One thing the flip costs

`parseUnicodeSetToAlphabet` runs at *read* time today, deliberately: the bundle
stores the raw LDML UnicodeSet, so fixing a parser bug fixes every bundled
alphabet without regenerating anything. A database-sourced bundle would ship
`characters` already parsed and lose that property, because the database stores
the parsed form.

Either accept it, or have the exporter keep writing raw UnicodeSets for
SLDR-sourced claims (the evidence `details` records the original exemplar string
for exactly this kind of reason). Worth deciding before the exporter is written,
not after.

## What is still open

- What the chooser *does* with two answers. That is a UI question and this note
  does not settle it.
- Whether the bundle stays keyed by upstream tag or moves to writing-system
  keys. Note the two data kinds already disagree: alphabets are looked up
  through a tag-shortening walk, so qualified keys are reachable; sample texts
  are looked up by `{lang}_{Script}` plus a qualified-sibling fallback.
- The size budget. The bundle is about 1.5MB now and a multi-answer bundle is
  bigger; a host that can't afford it already opts out by not importing
  `@ethnolib/font-core/bundled`.
