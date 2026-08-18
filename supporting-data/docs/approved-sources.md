# What makes a claim usable

The short version: **a claim is usable if an approved source stands behind it**,
and today the approved list is exactly two entries — SIL's SLDR and Google
Fonts' language data. That is provenance, not judgement, which is why it can be
settled now while the harder question stays open.

Implemented by [`../sql/002-approved-sources.sql`](../sql/002-approved-sources.sql).

## Why this isn't the rank decision

`rank` was reserved for the winner-picking question: how a claim ever becomes
_the_ answer when people disagree. That question is still open and should stay
open — it is about weighing contributors, endorsements and judgement, and we
have none of those yet (zero endorsements, zero people, zero crowd-sourced
claims).

What we do have is 1,943 alphabet claims and 752 sample texts, every one of them
imported from a dataset we already shipped to users before this database
existed. For that data the question "can we use it?" does not need judgement at
all. We trusted SLDR yesterday; we trust it today.

So the two decisions get separated:

- **Approved source** — a provenance rule, decided, queryable, and what the UI
  reads through the `usable_*` views.
- **`rank`** — still nobody's answer. The `preferred_*` views are untouched and
  still serve nothing, because nothing sets `rank`. When a ranking process
  exists, provenance becomes one input to it instead of the whole of it.

The one place they meet is `rank = 'deprecated'`, which the `usable_*` views
honour. That is the kill switch: an approved source can still be wrong about a
particular language, and a human striking a row down in the dashboard has to
outrank the automatic rule. It works in that direction only — striking down, not
promoting.

[`../README.md`](../README.md)'s "deliberately unmade decision" section stays
true. This adds a narrower path beside it, and the framing does not change: even
a usable claim is something a source told us, labelled with who, not something
this project asserts.

## The consequence worth staring at

Under this rule, **crowd-sourced claims are invisible**. The font chooser demo's
alphabet gate collects alphabets from real people; those land with a `person` and
no source, so they will never appear in `usable_alphabets`. That is the intended
answer for now — crowd-sourcing is a later phase — but it means the demo is
currently a write-only mouth. Anyone touching that UI should know the collected
alphabet does not come back.

The same applies to anything the BloomLibrary walker files (see
[`bloom-walker-plan.md`](bloom-walker-plan.md)): a book is not on the approved
list, so the walker's 500 new-language alphabet claims are gathered and nothing
more until somebody decides otherwise. That decision is a real one, deferred on
purpose, and the walker plan spells out what it would take.

## Adding a source

One INSERT into `approved_source`, keyed by the source _title_:

```sql
insert into public.approved_source (title, note)
values ('Unicode CLDR', 'CLDR exemplar characters; the other reference our UIs already followed.');
```

Title, not source row, because there are 2,719 `source` rows and two titles —
each row names the individual upstream file it came from, and they all share a
dataset title. So approving a dataset approves every file in it, past and
future, and a re-import needs no blessing.

Approval is deliberately **not** a column on `source`. `source` is
anon-insertable; a `trusted` boolean there would let anyone mint a trusted
source by naming it. `approved_source` has no write policy at all — editing
happens in the dashboard, the same as `rank`.

## What the views give you

| view | |
| --- | --- |
| `usable_alphabets` | one alphabet per writing system, approved, not struck down |
| `usable_sample_texts` | one passage per writing system, same rule |
| `usable_fonts` | every approved font for a writing system (not one — several fonts working is not a conflict) |

| `alphabet_conflicts` | writing systems where the tie-break had to choose |
| `claim_visibility` | gathered vs approved vs struck down, per claim kind |

Font claims arrive already approved, and did so without any change to this rule.
Stage 5 files them citing the same per-language SLDR pages stage 2 cites, because
the font recommendations live in the same XML files as the exemplars. So the
approved list did not need a third entry for fonts to become visible — which is
worth noticing, because it means `font_support` sat at zero rows for a reason that
had nothing to do with trust and everything to do with a snapshot nobody read.

### The tie-break, and why it is a confession

About 2% of writing systems have more than one approved alphabet claim, up to
five — all from SLDR, where regional and orthography-variant keys (`de`,
`de_CH`, `acr-x-cubulco`) collapse onto one writing system. `distinct on` has to
pick one, so the order is: hand-set `preferred` first, then an unlabelled claim
over a labelled variant, then more distinct approved sources agreeing, then
lowest id.

That last step is not a quality signal. It is there so the answer is stable
across runs, and reaching it means two SLDR keys disagree and we have no
principled reason to prefer either. The real fix is the bundle carrying both
answers ([`bundle-projection.md`](bundle-projection.md) argues for exactly
that); until it does, `alphabet_conflicts` is how you find out a choice was made
on your behalf.

This replaces `preferred_alphabets`' `created_at desc`, which sorted by import
order — that is, by a filename's alphabetical position in the SLDR repo, which
is arbitrariness wearing recency's clothes.

## The exporter, which is now unblocked

[`bundle-projection.md`](bundle-projection.md) had already decided the exporter's
gate would be provenance rather than rank. It now has something to query:
`usable_alphabets` and `usable_sample_texts` _are_ the export set.

That doc's round-trip property is the reason to build it next and the reason it
tests itself: stages 2 and 3 imported **from** font-core's bundle, so exporting
approved claims should hand back what is already in that bundle. Any difference
is a bug in the importer or the exporter, and finding it costs one diff.

Two things to settle before writing it, both already named in that doc:

- **The loop rule.** Once the exporter writes `bundled/alphabets.json`, the
  importers must stop reading it, or a run re-imports our own output and files
  fresh SLDR evidence for values that came out of here. Point stages 2 and 3 at
  `refresh*Snapshot.mjs`'s raw output instead. This is not optional; it is the
  difference between a projection and a feedback loop.
- **Raw UnicodeSet or parsed characters.** The bundle stores raw LDML
  UnicodeSets today and parses at read time, so a parser fix repairs every
  bundled alphabet with no regeneration. The database stores the parsed form, so
  a naive export loses that. **Recommendation: keep writing raw UnicodeSets for
  SLDR-sourced claims** — the evidence `details` still carries the original
  exemplar string, so it is recoverable — and accept parsed output only for
  sources that never had a UnicodeSet to begin with. Losing a
  fix-once-repair-everywhere property to save a string lookup is a bad trade.

## Verifying it applied

```sql
select * from public.claim_visibility;
select count(*) from public.usable_alphabets;    -- expect ~1,891
select count(*) from public.usable_sample_texts;  -- expect ~751
select count(*) from public.usable_fonts;         -- expect ~8,380 after stage 5
select * from public.alphabet_conflicts limit 20;
```

`usable_alphabets` should be a little under the 1,943 `alphabet` rows: the gap is
the conflict rows that lost the tie-break, not data going missing.
