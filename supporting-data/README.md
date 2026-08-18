# Supporting Data

A small, deliberately humble database of gathered information about writing
systems: what characters a language's alphabet has, a few sentences of sample
text, and which fonts people say work. EthnoLib's UIs (the font chooser, the
language chooser) need these answers to be helpful, and for thousands of
languages no shipped dataset has them.

**This is not an attempt to say what is true about any language.** Nobody here
is an authority, and the database is not trying to become one. It is a place to
write down what people and published sources tell us — including things that
contradict each other — so that our user interfaces can offer _something_
useful, clearly labeled with where it came from, instead of nothing. Where
established sources exist (SLDR, CLDR, Ethnologue, ScriptSource), they remain
the references; this collection just fills gaps and records what we heard while
filling them.

## The model

The shape is borrowed from Wikidata's statement model, because the problem is
the same: multiple people making possibly-conflicting claims, each needing
provenance, with judgement layered on top rather than baked in.

- **Writing system, not language.** Everything is keyed on a BCP 47 tag that
  must include a script subtag (`sr-Cyrl`, not `sr`). A language doesn't have
  an alphabet; a writing system does — Serbian has one in Cyrillic and one in
  Latin, and they are not in conflict. Rival orthographies in the _same_ script
  coexist as parallel rows, telling each other apart by an optional
  `orthography_label` ("1979 reform", "Catholic").

- **Values.** One row per distinct claim: an `alphabet` (space-separated
  entries, multigraphs like `ch` being one entry), a `sample_text`, or a
  `font_support` ("this font works for this writing system"). Two people
  submitting the same alphabet converge on **one** row — identity is a
  normalized key (NFC, entries sorted, not case-folded) — so support for a
  claim accumulates instead of fragmenting. Conflicting values simply coexist
  as siblings.

- **Evidence.** Each value row has evidence rows: who submitted it
  (`person`, identified by an unverified email) and/or what they cited
  (`source`). Contributor with no source = their own knowledge; source with no
  contributor = a bulk import.

- **Endorsements.** People agree (`endorse`) or object (`dispute`, with a
  comment: "misspelled", "offensive", "that's the old orthography"). Duplicate
  votes are tolerated; tallies count each person's latest stance once, so a
  changed mind works and repetition doesn't.

- **Rank — the deliberately unmade decision.** Every value row has a `rank`:
  `preferred` | `normal` | `deprecated`, after Wikidata. Nothing computes it,
  and _how_ a claim should ever become preferred — a person, an algorithm over
  endorsements, something else — is a decision we have not made. The column is
  just where that decision will land when it exists (`rank_note` holds the
  reasoning). The public read path (`preferred_alphabets`,
  `preferred_sample_texts`, `preferred_fonts` views) serves only preferred
  claims, so until some ranking process exists, gathered data is gathered and
  nothing more; `endorsement_tallies` summarizes how each claim is doing for
  whoever or whatever ends up deciding.

- **Approved sources — the decision we could make.** What the UIs read in the
  meantime needs no judgement at all: a claim is usable if an **approved
  source** stands behind it, which today means SLDR or Google Fonts' language
  data. That is provenance, not a verdict, so it could be settled without
  settling `rank`. The `usable_*` views are that read path
  ([`docs/approved-sources.md`](docs/approved-sources.md)); `rank` still decides
  nothing except that `deprecated` strikes a claim out. Crowd-sourced claims are
  gathered and not yet served.

## Where it runs

A dedicated Supabase project, **Ethnolib-Support** — separate from the font
chooser demo's telemetry project, because this data is meant to outlive any
one demo.

Setup: create the project in the Supabase dashboard, then paste
[`sql/create-tables.sql`](sql/create-tables.sql) into its SQL editor. The file
is idempotent; re-run it after edits.

Security posture, in one breath: the anon key is public by design; row-level
security lets anonymous visitors insert anywhere and read everything except
`person.email` (withheld by a column grant — it exists only so a human can
follow up with a contributor). Junk rows are possible and accepted; editing and
deleting happen only through the dashboard. Writes from browsers are plain
PostgREST GET-then-POST find-or-create; a lost race is a 409 answered by
looking the row up again.

## What writes to it today

The font chooser demo (`components/fonts/react/font-chooser-react-mui`). When
its alphabet gate — "Our database doesn't have the {language} alphabet yet" —
collects an alphabet from a user, the demo files it as a claim with evidence
(`src/demos/langdata.ts`). The demo needs two env vars,
`VITE_ETHNOLIB_SUPPORT_URL` and `VITE_ETHNOLIB_SUPPORT_ANON_KEY`; without them
collection silently turns itself off. Helpers for sample-text, font, and
endorsement submissions exist in the same module, awaiting UI.

## Roadmap

- **Importers** (`tools/`, see its README): scripts that file claims from
  sources we already have — each import being evidence rows citing its source,
  never anonymous truth. Four exist: langtags writing systems (rows only, so
  coverage has a denominator), SLDR alphabets, gflanguages sample texts, and the
  Language Font Finder's per-language font recommendations, including the
  OpenType feature settings SLDR gives for each. More to come from CLDR exemplars
  and similar. The importers iterate SLDR's ~2,200 LDML files rather than langtags'
  8,500 writing systems, which looks like leaving coverage on the table and is not:
  [`docs/lff-and-the-language-list.md`](docs/lff-and-the-language-list.md) has the
  measurements.
- **BloomLibrary scouring**: a script that reads BloomLibrary.org books to find
  corroborating evidence for existing claims, and new claims where a Bloom book
  is the only evidence we have. Planned in
  [`docs/bloom-walker-plan.md`](docs/bloom-walker-plan.md) — 500 writing systems
  have Bloom books and no alphabet claim here, and a Bloom book is not an
  approved source, so what it gathers waits on a decision.
- **Snapshot exporter**: merge usable claims into the bundled JSON that
  `@ethnolib/font-core` ships, so offline hosts benefit. Unblocked now that
  `usable_alphabets` exists to query; see
  [`docs/bundle-projection.md`](docs/bundle-projection.md) for the loop rule it
  must obey.
- **Dashboard** (`dashboard/`, see its README): a single static page, generated at
  build time and published to GitHub Pages, showing how many writing systems have
  each kind of claim out of the langtags denominator, broken down by script. What
  it does _not_ show yet: where the evidence came from, and what is waiting for a
  rank.

## Deliberately out of scope (for now)

- Any winner-picking algorithm (rank is set by hand).
- Verified identity or accounts (emails are taken at their word).
- An orthography entity (labels on values carry that weight so far).
- Font versioning, and font-feature defaults as a fourth claim kind.
- A license field on sources — worth adding when sample texts start arriving
  from published works.
