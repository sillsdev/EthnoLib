# Dashboard

A small React app (Vite, TypeScript, TanStack Table) with three tabs:

- **Dashboard** — how much of the writing-system world this database has an
  answer for: the coverage headline, per-kind tiles, and a by-script table.
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
