# Dashboard

A single static page showing how much of the writing-system world this database
actually has an answer for. Built by a script, not served by an app:

```sh
node supporting-data/dashboard/build.mjs            # writes dashboard/dist/index.html
node supporting-data/dashboard/build.mjs --out some/dir
```

Open the file directly, or serve the directory; it has no scripts and makes no
requests, so either works.

| file           |                                              |
| -------------- | -------------------------------------------- |
| `coverage.mjs` | the queries and the arithmetic               |
| `page.mjs`     | the HTML                                     |
| `build.mjs`    | the entry point: read, render, write, report |

## Baked, not live

The numbers are read at build time and written into the file. A viewer's browser
talks to nothing, which means the page cannot go stale-but-look-live, cannot leak
a slow query into someone's first paint, and needs no key in the markup — but it
also means **the page is only as fresh as the last build**, and it says so in its
own footer alongside the branch and commit it came from.

The importers, not the code, are what change the numbers, so
[the workflow](../../.github/workflows/supporting-data-dashboard.yml) offers
`workflow_dispatch` for a rebuild without a commit. Once this lands on the default
branch a nightly `schedule:` would do the same automatically; a `schedule:` on a
side branch never fires, so there isn't one yet.

## Publishing

`.github/workflows/supporting-data-dashboard.yml` builds the page and deploys it
to GitHub Pages. **While this is experimental, any branch that pushes a change
under `supporting-data/dashboard/` publishes**, and Pages serves one site per
repository, so the newest push wins. The footer is the only way to tell whose
push you are looking at. Narrow the trigger when this reaches the default branch.

The build needs no secrets and no `npm install`: the database's publishable key
is the script default in `../tools/lib/langdata.mjs` (the same key the font
chooser demo ships to every browser), and the generator uses nothing but node's
own library. It is also strictly read-only — `coverage.mjs` has its own small GET
helper rather than borrowing the importers' client, so a page build cannot write
to the database even by accident.

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
