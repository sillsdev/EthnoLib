# Task: build the population importers (stages 1–3)

You are working in the `supporting-data` worktree of the EthnoLib repo. This project is a
crowd-sourced database of writing-system claims (alphabets, sample texts, font support) on a
dedicated Supabase project. Read these first — they are the contract:

1. `supporting-data/README.md` — the model (values / evidence / endorsements / rank) and the
   project's deliberately humble framing. Keep that framing in everything you write.
2. `supporting-data/docs/population-plan.md` — the plan you are implementing. Build stages 1–3
   only (langtags pre-population, bundled SLDR alphabets, bundled Google sample texts).
   Stage 4 (BloomLibrary) is NOT in scope.
3. `supporting-data/sql/create-tables.sql` — the live schema. Already applied; do not change it.

## Database access

- Supabase project `Ethnolib-Support`, ref `xtmvthimgiempavukycw`, in the Bloom Org.
- REST base: `https://xtmvthimgiempavukycw.supabase.co/rest/v1`
- Anon (publishable) key — public by design, fine to read from env in scripts:
  `sb_publishable_IOgNimgADyR8ZUpGlwQdpw_ERvvoWa-`
- Importers write as ordinary anonymous clients: find-or-create via GET then POST with
  `Prefer: return=representation` and `?select=id` (the `person` table's email column is not
  readable, so asking for the whole row back fails). A 409 means you lost a find-or-create
  race: GET again. Claims can only be inserted at rank='normal'; do not try otherwise.
- The Supabase CLI is linked for editor-side checks:
  `npx supabase --workdir supporting-data db query --linked "<sql>"` (read-only checks and
  cleanup of your own test rows only; never schema changes).
- The database is currently EMPTY. If you insert test rows while developing, delete them
  (children first: endorsements/evidence → values → font/person/language).

## Hard rules

- Scripts live in `supporting-data/tools/*.mjs`, Node, plain fetch, following the style of
  `components/fonts/common/font-core/tools/refresh*Snapshot.mjs`. Invoke Node scripts with
  care on this machine: Python is `py`, not `python`; Node is normal `node`.
- Every claim gets an evidence row citing its source (see the plan for exact source
  names/URLs per stage). `submitted_via: 'import'`.
- Re-runnable without duplicating: skip evidence when the claim already has evidence citing
  the same source. Report counts (languages touched, claims created, evidence added, skipped).
- Tags must carry a script subtag. langtags.json (stage 1) is the lookup for adding scripts
  to bare tags in stages 2–3; skip-and-count what cannot be script-qualified.
- Do NOT run the full imports against the live database until the end: develop against a
  handful of tags first (e.g. `--only aa-Latn,fuv-Latn` style flag), show John the sample
  results, then run the full import only after your dry-run report looks right. A `--dry-run`
  flag that prints what would be written is required on all three importers.
- Git: do not commit or push anything unless John asks you to in this session.
- The winner-picking / visibility question is deliberately undecided. Importers only gather;
  never set rank, never write anything that implies a claim is approved.

## Acceptance criteria

- Stage 1: `language` row count ≈ langtags.json writing-system count; spot-check 5 tags; a
  re-run inserts 0 new rows.
- Stage 2: alphabet claims exist with SLDR-cited evidence; the `characters` values parse with
  font-core's `parseAlphabet` shape (space-separated entries); re-run adds 0 evidence.
- Stage 3: sample_text claims with gflanguages-cited evidence; keys derived from
  `{lang}_{Script}` snapshot keys; re-run adds 0 evidence.
- Each script prints a counts report; `--dry-run` writes nothing.

When done, summarize per stage: counts, skips (with reasons), and anything in the data that
surprised you.
