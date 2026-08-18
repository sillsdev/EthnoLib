// Stage 1 of supporting-data/docs/population-plan.md: a `language` row for
// every writing system SIL's langtags.json knows about.
//
//   node supporting-data/tools/importLangtagsLanguages.mjs --dry-run
//   node supporting-data/tools/importLangtagsLanguages.mjs --only aa-Latn,fuv-Latn
//   node supporting-data/tools/importLangtagsLanguages.mjs
//
// No claims and no evidence — rows only. The point is a denominator: with
// every writing system present, "how many have an alphabet claim?" has an
// honest answer and a dashboard can show what is missing rather than only what
// exists. A language row asserts nothing about a language beyond the fact that
// langtags lists it.
//
// `name` is langtags' name field, a convenience label for reading the
// dashboard. Names are contested territory (endonym vs Ethnologue name) and
// this is not an attempt to settle that.
//
// Re-runnable: existing tags are read first and only the missing ones are
// inserted, so a second run inserts nothing.

import {
  loadLangtags,
  writingSystems,
  NON_SCRIPTS,
} from "./lib/langtags.mjs";
import {
  createClient,
  parseArgs,
  report,
  runDescriptor,
} from "./lib/langdata.mjs";

const BATCH = 500;

const options = parseArgs();
const client = createClient(options);

const entries = loadLangtags(options.langtags);
const systems = [...writingSystems(entries).values()];

const run = runDescriptor({
  tool: "importLangtagsLanguages.mjs",
  source: "SIL langtags.json",
});
await client.recordRun("started", run);

const counts = {
  "writing systems in langtags": systems.length,
  "skipped (no real script)": 0,
  "skipped (not in --only)": 0,
  "already present": 0,
  "language rows created": 0,
  "lost races (row appeared)": 0,
};

const wanted = [];
for (const system of systems) {
  if (options.limit !== undefined && wanted.length >= options.limit) break;
  if (options.skipNonScripts && NON_SCRIPTS.has(system.script)) {
    counts["skipped (no real script)"]++;
    continue;
  }
  if (options.only && !options.only.has(system.tag.toLowerCase())) {
    counts["skipped (not in --only)"]++;
    continue;
  }
  wanted.push(system);
}

// One read of what is already there beats 9,000 find-or-creates: the tags are
// the whole of the identity, and the unique index matches case-insensitively.
const existing = new Set(
  (await client.getAllRows("language", "bcp47")).map((row) =>
    row.bcp47.trim().toLowerCase()
  )
);

const missing = wanted.filter((system) => {
  if (existing.has(system.tag.toLowerCase())) {
    counts["already present"]++;
    return false;
  }
  return true;
});

for (let at = 0; at < missing.length; at += BATCH) {
  const batch = missing.slice(at, at + BATCH);
  const { inserted, conflicted } = await client.insertRows(
    "language",
    batch.map((system) => ({ bcp47: system.tag, name: system.name ?? null }))
  );
  counts["language rows created"] += inserted;
  counts["lost races (row appeared)"] += conflicted;
  client.log(
    `${client.dryRun ? "would insert" : "inserted"} ${inserted}: ${batch
      .slice(0, 3)
      .map((system) => system.tag)
      .join(", ")}…`
  );
}

// Never counted as an error: langtags files unwritten and undetermined
// languages under Zxxx/Zyyy/Zzzz, which pass the database's script check but
// name the absence of a writing system. They are included unless asked
// otherwise, because "no alphabet claim yet" and "no script to have one in"
// are both worth being able to see.
const nonScripts = wanted.filter((system) => NON_SCRIPTS.has(system.script));
if (!options.skipNonScripts && nonScripts.length > 0) {
  counts["of those, Zxxx/Zyyy/Zzzz"] = nonScripts.length;
}

await client.recordRun("finished", { ...run, counts });

report("Stage 1 — langtags writing systems", counts, client);
console.log(`  (${client.stats.reads} reads, ${client.stats.writes} writes)`);
