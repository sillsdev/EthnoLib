// Stage 5 of supporting-data/docs/population-plan.md: font_support claims from
// the Language Font Finder data the repo already ships.
//
//   node supporting-data/tools/importLanguageFonts.mjs --dry-run --only aa,az-Cyrl
//   node supporting-data/tools/importLanguageFonts.mjs --dry-run
//   node supporting-data/tools/importLanguageFonts.mjs
//
// This is the stage that was missing, and its absence is the whole reason
// `font_support` was empty: stages 2 and 3 read font-core's bundled
// `alphabets.json` and `sampleTexts.json`, and nothing read `languageFonts.json`
// beside them — the fonts a language's own community recommends, which is
// exactly the third question the chooser asks and this database could not
// answer.
//
// The snapshot has two halves and they are not the same kind of statement:
//
//  - `languages` — 2,187 tags, each with the families SLDR's `<sil:font>`
//    elements name for that language. Somebody wrote that down about that
//    language, so it is a claim, and it is what this importer files.
//  - `scriptDefaults` — 157 scripts, each with what the Font Finder falls back
//    on when nobody has written a rule for a language. That is a statement about
//    a script, and this database has no script entity to hang it on; filing it
//    against every language of that script would assert something nobody
//    asserted. Skipped and counted by default; `--script-defaults` files it
//    anyway, against existing language rows only and with its own source, so it
//    can never be mistaken for a per-language recommendation.
//
// Evidence cites the SLDR page for the language, the same source rows stage 2
// creates — the recommendations live in the same XML file as the exemplars, so
// one SLDR page ends up supporting both an alphabet claim and a font claim,
// which is true and useful. The Language Font Finder's own contribution is the
// trimming (nothing undistributable, nothing without a downloadable TTF), and
// that goes in the evidence details along with the family id and licence.
//
// Nothing sets rank. Re-runnable: evidence is skipped when the claim already
// cites the same page.

import { readBundled } from "./lib/fontCore.mjs";
import {
  loadLangtags,
  tagIndex,
  resolveWritingSystem,
  writingSystems,
  NON_SCRIPTS,
} from "./lib/langtags.mjs";
import {
  createClient,
  parseArgs,
  report,
  runDescriptor,
} from "./lib/langdata.mjs";

const SOURCE_TITLE = "SIL Locale Data Repository (SLDR)";
const FALLBACK_TITLE = "SIL Language Font Finder (script fallbacks)";
const FALLBACK_URL =
  "https://github.com/silnrsi/langfontfinder/blob/main/data/fallback.json";

/** Same page URL as stage 2, so the two stages share one source row per file. */
function sldrPageUrl(sldrTag) {
  const file = sldrTag.replace(/-/g, "_");
  return `https://github.com/silnrsi/sldr/blob/master/sldr/${file[0].toLowerCase()}/${encodeURIComponent(file)}.xml`;
}

const options = parseArgs();
const client = createClient(options);

const { path: bundledPath, data: bundled } = readBundled(
  "languageFonts.json",
  options.fontCore
);
const entries = Object.entries(bundled.languages ?? {});
const families = bundled.families ?? {};
const index = tagIndex(loadLangtags(options.langtags));

// ---------------------------------------------------------------------------
// The fourth snapshot: what SLDR sets, not just which font it names.
//
// `<sil:font name="Charis" features="cv44=0 cv46=1">` says two things, and until
// now this importer read only the first. The second is the OpenType feature
// settings for that font in that language - which capital Eng, which open O -
// and font-core keeps it in a snapshot of its own, `fontFeatureDefaults.json`.
// It goes on the same font_support row, because a setting is only meaningful for
// the font it names: cv43 is Charis's forty-third feature, and Noto Sans's forty-
// third is a different thing or nothing at all.
//
// Named after the standard on purpose. The attribute carries stylistic sets
// (ssXX) as well as character variants (cvXX), and ssXX matters - Mixtec
// languages are among those that need one - so `character_variants` would have
// excluded data we are already storing.
// ---------------------------------------------------------------------------
const { path: featuresPath, data: featureSnapshot } = readBundled(
  "fontFeatureDefaults.json",
  options.fontCore
);

const { lookup: featuresByPair, ignored: ignoredFeatureEntries } =
  buildFeatureLookup(featureSnapshot);

// How many of the snapshot's languages name each family.
//
// This is a measure of how SPECIFIC a recommendation is, and nothing else. It is
// tempting to read a family recommended for 1,873 of 2,187 languages as a lazy
// default and one recommended for a single language as the considered answer, and
// that reading is wrong: Charis and Gentium genuinely do cover nearly every Latin
// orthography, including the extended letters minority orthographies need, and
// Andika was built for literacy materials. A broad recommendation from SLDR is
// expertise expressed broadly, not expertise withheld.
//
// The number is still worth recording, because specificity is useful for ordering
// — Annapurna SIL is more particularly Nepali's font than Noto Sans is, and a
// chooser may well want to offer it first. It says nothing about which to trust.
const reach = new Map();
for (const [, ids] of entries) {
  for (const id of ids) reach.set(id, (reach.get(id) ?? 0) + 1);
}

// ---------------------------------------------------------------------------
// Read what exists once, up front, instead of asking per claim.
//
// This stage files an order of magnitude more rows than the others — 8,380
// claims against stage 2's 1,943 — and a find-or-create per claim means two
// sequential round trips each. A full run spent about twenty minutes on roughly
// 21,000 requests, almost all of them answering "no" a second time. Five paged
// reads answer the same questions, so a re-run that has nothing to do now says
// so in seconds, which is what makes "re-runnable" mean anything in practice.
//
// The cost of caching is a lost race: another writer inserting between the read
// and our insert. That already had an answer — a 409, which insertRow reports as
// undefined — so each cache miss falls back to the same look-again the client
// does, and the cache is updated as rows are created.
// ---------------------------------------------------------------------------
const existing = {
  languages: new Map(), // lower(bcp47) → id
  fonts: new Map(), // lower(family_name) → id
  claims: new Map(), // `${language_id}:${font_id}` → id
  evidence: new Set(), // `${font_support_id}:${source_id}`
  sources: new Map(), // url → id
};

for (const row of await client.getAllRows("language", "id,bcp47")) {
  existing.languages.set(row.bcp47.trim().toLowerCase(), row.id);
}
for (const row of await client.getAllRows("font", "id,family_name")) {
  existing.fonts.set(row.family_name.trim().toLowerCase(), row.id);
}
for (const row of await client.getAllRows("font_support", "id,language_id,font_id")) {
  existing.claims.set(`${row.language_id}:${row.font_id}`, row.id);
}
for (const row of await client.getAllRows(
  "font_support_evidence",
  "font_support_id,source_id"
)) {
  existing.evidence.add(`${row.font_support_id}:${row.source_id}`);
}
for (const row of await client.getAllRows("source", "id,url")) {
  if (row.url) existing.sources.set(row.url, row.id);
}

const run = runDescriptor({
  tool: "importLanguageFonts.mjs",
  source: SOURCE_TITLE,
  sourceGeneratedAt: bundled.generatedAt,
  // Read from the languageFonts.json snapshot committed to this repo, not from
  // the Language Font Finder itself. The snapshot is a few days old, which is
  // why this run was allowed to use it; a later run should query LFF directly so
  // that source_generated_at means "when we last asked" rather than "when
  // somebody last refreshed the file".
  notes:
    `Filled font_support from two snapshots committed to this repo: ` +
    `${bundledPath} (which families a language recommends) and ${featuresPath} ` +
    `(the OpenType settings SLDR gives for each), generated ` +
    `${bundled.generatedAt ?? "at an unrecorded time"}. Not a live read of the ` +
    `Language Font Finder.`,
});
await client.recordRun("started", run);

const counts = {
  "language entries in snapshot": entries.length,
  "families in snapshot": Object.keys(families).length,
  "skipped (not in --only)": 0,
  "skipped (no script known)": 0,
  "skipped (no real script)": 0,
  "skipped (family not in snapshot)": 0,
  "writing systems touched": 0,
  "language rows created": 0,
  "font rows created": 0,
  "font_support claims created": 0,
  "font_support claims already there": 0,
  "evidence rows added": 0,
  "evidence already cited this page": 0,
  "claims carrying OpenType settings": 0,
  "OpenType settings ignored (entries disagreed)": ignoredFeatureEntries,
};

const unresolved = [];
const touched = new Set();
let done = 0;

// ---------------------------------------------------------------------------
// Plan first, then write in batches.
//
// Nothing below writes while it walks the snapshot. It works out everything the
// snapshot asks for, then files it a chunk at a time: one POST per 500 rows
// rather than one POST per row. That is the difference between about forty
// requests and about seventeen thousand, for the same 8,400 claims and 8,400
// evidence rows.
//
// The order of the batches is forced by foreign keys. A claim needs its language
// and font ids, and an evidence row needs its claim id, so each batch has to come
// back before the next can be built. Four dependent round trips, not four
// thousand.
// ---------------------------------------------------------------------------

/** Everything the snapshot asks for, resolved but not yet written. */
const wanted = [];

for (const [sldrTag, familyIds] of entries) {
  if (options.limit !== undefined && done >= options.limit) break;

  const resolved = resolveWritingSystem(sldrTag, index);
  if (
    options.only &&
    !options.only.has(sldrTag.toLowerCase()) &&
    !(resolved && options.only.has(resolved.tag.toLowerCase()))
  ) {
    counts["skipped (not in --only)"]++;
    continue;
  }
  done++;

  if (!resolved) {
    // `qaz` and `test` are the two the snapshot carries: a private-use range and
    // an SLDR test fixture. Neither is a writing system.
    counts["skipped (no script known)"]++;
    unresolved.push(sldrTag);
    continue;
  }
  if (NON_SCRIPTS.has(resolved.script)) {
    counts["skipped (no real script)"]++;
    unresolved.push(`${sldrTag} (${resolved.script})`);
    continue;
  }

  touched.add(resolved.tag);

  for (const familyId of familyIds) {
    const family = families[familyId];
    if (!family?.family) {
      // The snapshot drops families it may not offer, and a language rule can
      // still name one. Nothing to claim; the chooser would not show it either.
      counts["skipped (family not in snapshot)"]++;
      unresolved.push(`${sldrTag} -> ${familyId} (not in snapshot)`);
      continue;
    }
    const otFeatures =
      featuresByPair.get(`${resolved.tag}\u0000${family.family.trim()}`) ?? null;
    if (otFeatures) counts["claims carrying OpenType settings"]++;
    wanted.push({
      tag: resolved.tag,
      name: resolved.name?.trim() || null,
      sourceUrl: sldrPageUrl(sldrTag),
      sourceTitle: SOURCE_TITLE,
      familyName: family.family.trim(),
      opentypeFeatures: otFeatures,
      details: details(sldrTag, resolved, familyId, family, bundled),
      log:
        `${sldrTag} -> ${resolved.tag}: ${family.family}` +
        (otFeatures ? ` [${featureText(otFeatures)}]` : ""),
    });
  }
}

await fileWanted(wanted);
for (const item of wanted) client.log(item.log);

// The script fallbacks, either filed or merely counted.
const fallbackReport = await handleScriptDefaults();

counts["writing systems touched"] = touched.size;

await client.recordRun("finished", { ...run, counts });

report("Stage 5 - Language Font Finder recommendations", counts, client);
console.log(`  from ${bundledPath}`);
console.log(`  and  ${featuresPath}`);
console.log(`  (${client.stats.reads} reads, ${client.stats.writes} writes)`);
for (const line of fallbackReport) console.log(`  ${line}`);
if (unresolved.length > 0) {
  console.log(`  skipped: ${unresolved.join(", ")}`);
}

/**
 * File a list of wanted claims: languages, sources and fonts first so the ids
 * exist, then the claims, then the evidence. Both the per-language path and the
 * `--script-defaults` path go through here, so neither can quietly go back to
 * writing a row at a time.
 *
 * `createLanguages: false` for the fallbacks, which must never bring a writing
 * system into existence.
 */
async function fileWanted(items, { createLanguages = true } = {}) {
  if (items.length === 0) return;

  await ensureAll({
    cache: existing.languages,
    table: "language",
    select: "id,bcp47",
    keyOf: (row) => row.bcp47.trim().toLowerCase(),
    needed: items.map((item) => ({
      key: item.tag.trim().toLowerCase(),
      row: { bcp47: item.tag, name: item.name },
      find: `bcp47=ilike.${client.q(item.tag)}`,
    })),
    onCreate: () => counts["language rows created"]++,
    create: createLanguages,
  });

  await ensureAll({
    cache: existing.sources,
    table: "source",
    select: "id,url",
    keyOf: (row) => row.url,
    needed: items.map((item) => ({
      key: item.sourceUrl,
      row: { title: item.sourceTitle, url: item.sourceUrl, type: "dataset" },
      find: `url=eq.${client.q(item.sourceUrl)}`,
    })),
  });

  await ensureAll({
    cache: existing.fonts,
    table: "font",
    select: "id,family_name",
    keyOf: (row) => row.family_name.trim().toLowerCase(),
    needed: items.map((item) => ({
      key: item.familyName.toLowerCase(),
      row: { family_name: item.familyName },
      find: `family_name=ilike.${client.q(item.familyName)}`,
    })),
    onCreate: () => counts["font rows created"]++,
  });

  // Ids in hand, so a wanted claim is now a pair of numbers. An item whose
  // language row does not exist is dropped here rather than earlier, because only
  // the fallback path can produce one and only it cares.
  const pairs = [];
  for (const item of items) {
    const languageId = existing.languages.get(item.tag.trim().toLowerCase());
    if (languageId === undefined) continue;
    pairs.push({
      languageId,
      fontId: existing.fonts.get(item.familyName.toLowerCase()),
      sourceId: existing.sources.get(item.sourceUrl),
      opentypeFeatures: item.opentypeFeatures ?? null,
      details: item.details,
    });
  }

  await ensureAll({
    cache: existing.claims,
    table: "font_support",
    select: "id,language_id,font_id",
    keyOf: (row) => `${row.language_id}:${row.font_id}`,
    needed: pairs.map((pair) => ({
      key: `${pair.languageId}:${pair.fontId}`,
      row: {
        language_id: pair.languageId,
        font_id: pair.fontId,
        opentype_features: pair.opentypeFeatures,
      },
      find: `language_id=eq.${pair.languageId}&font_id=eq.${pair.fontId}`,
    })),
    onCreate: () => counts["font_support claims created"]++,
    onHit: () => counts["font_support claims already there"]++,
  });

  const evidence = [];
  for (const pair of pairs) {
    const claimId = existing.claims.get(`${pair.languageId}:${pair.fontId}`);
    const key = `${claimId}:${pair.sourceId}`;
    if (existing.evidence.has(key)) {
      counts["evidence already cited this page"]++;
      continue;
    }
    existing.evidence.add(key);
    evidence.push({
      font_support_id: claimId,
      source_id: pair.sourceId,
      contributor_id: null,
      details: pair.details,
      submitted_via: "import",
      session_id: null,
    });
  }

  // Evidence rows have no identity to dedupe on and nothing reads them back, so
  // these go out with `return=minimal` - the cheapest write in the file.
  for (let i = 0; i < evidence.length; i += 500) {
    const result = await client.insertRows(
      "font_support_evidence",
      evidence.slice(i, i + 500)
    );
    counts["evidence rows added"] += result.inserted;
  }
}

/**
 * Find-or-create for a whole set at once: cache hits cost nothing, the misses go
 * out in one batch per 500 rows, and only a row lost to a race falls back to a
 * request of its own.
 *
 * The batch is deduped by key first. The snapshot names Charis for 1,873
 * languages, so without that the font batch would send 1,873 identical rows and
 * collide with itself.
 */
async function ensureAll({
  cache,
  table,
  select,
  keyOf,
  needed,
  onCreate,
  onHit,
  create = true,
}) {
  const missing = new Map();
  for (const item of needed) {
    if (cache.has(item.key)) {
      onHit?.();
      continue;
    }
    if (!missing.has(item.key)) missing.set(item.key, item);
  }
  if (missing.size === 0 || !create) return;

  const created = await client.insertRowsReturning(
    table,
    [...missing.values()].map((item) => item.row),
    select
  );
  for (const row of created) {
    cache.set(keyOf(row), row.id);
    onCreate?.();
  }

  // A row missing from the response lost a race: somebody else inserted the same
  // identity between our read and our write. Ask for it by name.
  for (const item of missing.values()) {
    if (cache.has(item.key)) continue;
    const found = await client.ensureRow(table, item.find, item.row);
    cache.set(item.key, found.id);
    if (found.created) onCreate?.();
  }
}

/**
 * `${writing system}\0${font family}` -> the settings SLDR gives for that pair.
 *
 * Two SLDR entries can land on one writing system, `man` and `man-Latn-GN` both
 * being Mandingo in Latin script here, and they do not always agree. Where they
 * disagree, take the least-qualified entry: a regioned entry is a statement about
 * one country, and a row here has no region to carry that, so promoting it would
 * widen a scoped claim into a general one. Same instinct as the tie-break in
 * 002-approved-sources.sql, which prefers a claim with no orthography label.
 * Still tied after that and the pair is left with no settings rather than picked
 * from arbitrarily.
 *
 * Kept in step with the backfill in sql/003-opentype-features.sql, which had to
 * make the same choice for the rows that already existed.
 */
function buildFeatureLookup(snapshot) {
  const candidates = new Map();
  for (const [sldrTag, fonts] of Object.entries(snapshot.defaults ?? {})) {
    const resolved = resolveWritingSystem(sldrTag, index);
    if (!resolved || NON_SCRIPTS.has(resolved.script)) continue;
    for (const font of fonts) {
      const features = font.features ?? {};
      if (Object.keys(features).length === 0) continue;
      const key = `${resolved.tag}\u0000${font.fontName}`;
      if (!candidates.has(key)) candidates.set(key, []);
      candidates.get(key).push({ sldrTag, features });
    }
  }

  const lookup = new Map();
  let ignored = 0;
  for (const [key, found] of candidates) {
    if (found.length === 1) {
      lookup.set(key, found[0].features);
      continue;
    }
    const spelled = new Set(found.map((f) => JSON.stringify(f.features)));
    if (spelled.size === 1) {
      lookup.set(key, found[0].features);
      continue;
    }
    const subtags = (f) => f.sldrTag.split(/[-_]/).length;
    const fewest = Math.min(...found.map(subtags));
    const best = found.filter((f) => subtags(f) === fewest);
    if (new Set(best.map((f) => JSON.stringify(f.features))).size === 1) {
      lookup.set(key, best[0].features);
      ignored += found.length - best.length;
    } else {
      ignored += found.length;
    }
  }
  return { lookup, ignored };
}

/** SLDR's own spelling of a settings object, for the --verbose line. */
function featureText(features) {
  return Object.entries(features)
    .map(([tag, value]) => `${tag}=${value}`)
    .join(" ");
}

/**
 * What a reader needs to judge one font claim: which SLDR entry named the
 * family, the Font Finder's id for it (the name alone is what the database keys
 * on, and ids are what the upstream rules refer to), its licence, and how
 * specific the recommendation is — see the note on `reach` above for why that
 * last one is not a quality score.
 */
function details(sldrTag, resolved, familyId, family, snapshot) {
  const parts = [`SLDR entry ${sldrTag} recommends ${familyId}`];
  if (sldrTag.toLowerCase() !== resolved.tag.toLowerCase()) {
    parts.push(`script from ${resolved.via}`);
  }
  const n = reach.get(familyId) ?? 0;
  parts.push(
    n === 1
      ? "the only language recommended this family in this snapshot"
      : `also recommended for ${n - 1} of the other ${entries.length - 1} languages in this snapshot`
  );
  if (family.license) parts.push(`licence ${family.license}`);
  parts.push("assembled by the SIL Language Font Finder");
  if (snapshot.generatedAt) parts.push(`snapshot ${snapshot.generatedAt}`);
  return parts.join("; ");
}

/**
 * The per-script fallbacks: what the Font Finder answers for a language nobody
 * has written a rule for.
 *
 * Off by default, because a fallback is a statement about a script and every
 * row here has to name a language, so filing them means asserting for each
 * language of a script something that was only ever said about the script. With
 * `--script-defaults` they are filed anyway — against writing systems that
 * already exist as language rows and have no per-language rule of their own,
 * never creating a language row, and citing fallback.json rather than an SLDR
 * page so the two can always be told apart. That source is deliberately not on
 * the approved list, so these claims stay gathered and unserved until somebody
 * decides they should not be.
 *
 * Region-conditioned rules are skipped either way. A writing system has no
 * region, so choosing among Arabic's per-region answers (Harmattan for Cameroon
 * and Nigeria, Awami Nastaliq for Pakistan) would be this importer inventing a
 * preference nobody expressed.
 */
async function handleScriptDefaults() {
  const scriptDefaults = bundled.scriptDefaults ?? {};
  const withRule = new Set();
  for (const [sldrTag] of entries) {
    const resolved = resolveWritingSystem(sldrTag, index);
    if (resolved) withRule.add(resolved.tag.toLowerCase());
  }

  // Every writing system langtags knows, so a fallback reaches the languages
  // that need it rather than only the ones some other stage happened to touch.
  const systems = [...writingSystems(loadLangtags(options.langtags)).values()];
  const byScript = new Map();
  for (const system of systems) {
    if (NON_SCRIPTS.has(system.script)) continue;
    if (withRule.has(system.tag.toLowerCase())) continue;
    if (!byScript.has(system.script)) byScript.set(system.script, []);
    byScript.get(system.script).push(system);
  }

  let candidatePairs = 0;
  let candidateSystems = 0;
  let regionSkipped = 0;
  const plan = [];
  for (const [script, rules] of Object.entries(scriptDefaults)) {
    const ids = new Set();
    for (const rule of rules) {
      if (rule.regions?.length) {
        regionSkipped++;
        continue;
      }
      for (const roleIds of Object.values(rule.roles ?? {})) {
        for (const id of roleIds) ids.add(id);
      }
    }
    const targets = byScript.get(script) ?? [];
    if (ids.size === 0 || targets.length === 0) continue;
    candidateSystems += targets.length;
    candidatePairs += targets.length * ids.size;
    plan.push({ script, ids: [...ids], targets });
  }

  if (!options.scriptDefaults) {
    return [
      `script fallbacks: not filed (${Object.keys(scriptDefaults).length} scripts).`,
      `  would add about ${candidatePairs} claims across ${candidateSystems} writing systems` +
        ` that have no per-language rule; ${regionSkipped} region-conditioned rules would be skipped.`,
      "  pass --script-defaults to file them, with their own source and unserved by default.",
    ];
  }

  const before = {
    created: counts["font_support claims created"],
    there: counts["font_support claims already there"],
    evidence: counts["evidence rows added"],
  };

  const items = [];
  for (const { script, ids, targets } of plan) {
    for (const system of targets) {
      for (const id of ids) {
        const family = families[id];
        if (!family?.family) continue;
        items.push({
          tag: system.tag,
          name: system.name?.trim() || null,
          sourceUrl: FALLBACK_URL,
          sourceTitle: FALLBACK_TITLE,
          familyName: family.family.trim(),
          opentypeFeatures: null,
          details:
            `Language Font Finder fallback for the ${script} script, not a recommendation for ` +
            `${system.tag}: nobody has written a font rule for this language, and this is what ` +
            `the Font Finder answers for its script. Family ${id}` +
            (family.license ? `; licence ${family.license}` : "") +
            (bundled.generatedAt ? `; snapshot ${bundled.generatedAt}` : ""),
          log: `${system.tag}: ${family.family} (${script} fallback)`,
        });
      }
    }
  }

  // createLanguages: false is the load-bearing part. A script's default is not a
  // reason to believe a writing system exists, so a fallback whose language row
  // is absent is dropped rather than inventing one.
  await fileWanted(items, { createLanguages: false });
  for (const item of items) client.log(item.log);

  const claims = counts["font_support claims created"] - before.created;
  const already = counts["font_support claims already there"] - before.there;
  const evidence = counts["evidence rows added"] - before.evidence;
  return [
    `script fallbacks: filed for ${plan.length} scripts` +
      ` (${claims} claims created, ${already} already there, ${evidence} evidence rows,` +
      ` ${regionSkipped} region-conditioned rules skipped).`,
    `  cited as "${FALLBACK_TITLE}", which is not an approved source, so these stay unserved.`,
  ];
}
