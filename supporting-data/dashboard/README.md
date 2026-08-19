# Dashboard

A small React app (Vite, TypeScript, TanStack Table). Its tabs:

- **Dashboard** — how much of the writing-system world this database has an
  answer for: the coverage headline, per-kind tiles, and a by-script table.
- **Sources** — every source this project reads, one card each: what it can
  answer, how it is read, whether it is an **approved source** (the only rule
  that decides what a user is ever shown), and what it has actually filed. The
  counts under each card are baked by `sources.mjs` from the claim rows
  themselves, so a card cannot go on describing a contribution that has stopped
  being true. Sources that file no claims at all are here too, in their own
  group: BloomLibrary's language table, eBible's catalogue, and github.com, which
  hosts the files SLDR and gflanguages claims cite.

  Its last section is the overlap picture: where an alphabet for a writing system
  could come from, as three circles — the writing systems the SLDR has already
  given us an alphabet for, the ones BloomLibrary publishes books in, and the ones
  eBible.org lists a translation in — drawn inside a fourth that is the whole
  langtags denominator. Everything outside the SLDR circle and inside another is
  the point of the picture. Circle areas and pairwise overlaps are to scale; the
  middle where all three meet cannot be, and the caption says so.

  The page shows the same data two ways and keeps them apart, because conflating
  them is how "eBible" comes to mean 1,128 in one place and 146 in another: the
  cards above the diagram are whole **sets**, overlaps included, plus their union;
  the diagram and its legend are **regions**, which exclude each other and carry
  "only" in their names. Both are clickable and both drive the list underneath.

  A caution box above the diagram says the one thing the picture cannot: the
  three sources do not always file a language under the same code. SLDR writes an
  alphabet for a macrolanguage where BloomLibrary and eBible publish under one of
  its members — `ps-Arab` against `pbt-Arab` — so some of what reads as an SLDR
  gap is a tag gap. `venn.mjs` counts those from langtags' own `macrolang` field
  and never merges them; whether one alphabet covers both codes is a question
  about the languages.
- **Data** — a grid, one row per writing system, showing every claim (alphabets,
  computed character ranges, sample texts, OpenType features, suggested fonts).
  Expanding a row lists each claim with its evidence: which source said it,
  linked to the exact file it came from.
- **Runs** — the `import_run` log: each importer run with its counts, the delta
  against that tool's previous run, and any run that never wrote a `finished`
  row.

```sh
cd supporting-data/dashboard/app
npm ci
npm run bake    # export-data.mjs: database -> app/public/data/*.json
npm run dev     # serve locally
npm run build   # tsc + vite build -> app/dist
```

| file              |                                                          |
| ----------------- | -------------------------------------------------------- |
| `export-data.mjs` | bakes the database into the JSON files the app loads     |
| `coverage.mjs`    | the queries and the coverage arithmetic                  |
| `venn.mjs`        | the three sets the overlap diagram draws, and their definitions |
| `sources.mjs`     | what each source has filed, tallied from the rows already read |
| `ebible.mjs`      | eBible.org's translation catalogue, read for its index only |
| `stamp.mjs`       | branch/commit/timestamp for the footer                   |
| `app/`            | the React app (self-contained; not an npm workspace)     |

## Baked, not live

The data is read at bake time and shipped as static JSON. A viewer's browser
talks only to the static site, which means the page cannot go stale-but-look-live,
cannot leak a slow query into someone's first paint, and needs no key in the
markup — but it also means **the site is only as fresh as the last bake**, and
the footer says so, alongside the branch and commit it came from.

The importers, not the code, are what change the numbers, so
[the workflow](../../.github/workflows/supporting-data-dashboard.yml) offers
`workflow_dispatch` for a rebuild without a commit. Once this lands on the default
branch a nightly `schedule:` would do the same automatically; a `schedule:` on a
side branch never fires, so there isn't one yet.

## Publishing

`.github/workflows/supporting-data-dashboard.yml` bakes the data, builds the app,
and deploys `app/dist` to GitHub Pages. **While this is experimental, any branch
that pushes a change under `supporting-data/dashboard/` publishes**, and Pages
serves one site per repository, so the newest push wins. The footer is the only
way to tell whose push you are looking at. Narrow the trigger when this reaches
the default branch.

The bake reads two things that are not the database, both for the overlap diagram
and both catalogues rather than content: BloomLibrary's public language table (the
same endpoint and app id the importer uses, no auth, one small paged GET) and
eBible.org's `translations.csv`. No book file and no scripture text is fetched.

The bake needs no secrets: the database's publishable key is the script default
in `../tools/lib/langdata.mjs` (the same key the font chooser demo ships to every
browser). It is also strictly read-only — `coverage.mjs` has its own small GET
helper rather than borrowing the importers' client, and `export-data.mjs` reads
through it, so a bake cannot write to the database even by accident.

## What it counts, and why the denominator matters

Coverage is a fraction, and stage 1 of the import exists to supply the bottom
half of it: a `language` row per writing system in SIL's langtags, with no claims
attached. Without it "1,943 alphabets" is a number with nothing to be a number
_of_.

Two decisions worth knowing when reading the page:

- **Tags naming no script are left out of every denominator** (`Zxxx`, `Zyyy`,
  `Zzzz` — about 550 rows). An unwritten language having no alphabet is not a gap
  anyone could fill, and counting it would bake in a permanent shortfall. The
  footer says how many were excluded.
- **"Anything at all" is a union, not a sum.** A writing system with both an
  alphabet and a sample text is one covered writing system.

The page also states, prominently, how many claims are marked `preferred` — which
is zero, and is the honest headline of the whole project: only preferred claims
are served to users, nothing computes that rank, and how a claim should ever earn
it is a decision this project has not made.
