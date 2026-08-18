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
//  - `scriptDefaults` — what the Font Finder falls back on when nobody has
//    written a rule for a language. Not filed here: what the Font Finder
//    answers for a tag is the service's statement rather than SLDR's, and the
//    live importer (population-plan.md stage 6) caches those answers
//    whole under the service's own source, so the two kinds of statement are
//    never mistaken for each other.
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
  NON_SCRIPTS,
} from "./lib/langtags.mjs";
import {
  createClient,
  parseArgs,
  report,
  runDescriptor,
} from "./lib/langdata.mjs";

const SOURCE_TITLE = "SIL Locale Data Repository (SLDR)";

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
  // Read from the languageFonts.json snapshot committed to this repo, which is
  // generated from SLDR's <sil:font> elements — the claims filed here are
  // SLDR's statements. The Font Finder service's own per-tag answers are a
  // different statement and a separate source, cached by the stage 6 importer
  // (population-plan.md).
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

counts["writing systems touched"] = touched.size;

await client.recordRun("finished", { ...run, counts });

report("Stage 5 - Language Font Finder recommendations", counts, client);
console.log(`  from ${bundledPath}`);
console.log(`  and  ${featuresPath}`);
console.log(`  (${client.stats.reads} reads, ${client.stats.writes} writes)`);
if (unresolved.length > 0) {
  console.log(`  skipped: ${unresolved.join(", ")}`);
}

/**
 * File a list of wanted claims: languages, sources and fonts first so the ids
 * exist, then the claims, then the evidence — one batch per table rather than
 * a request per row.
 */
async function fileWanted(items) {
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

  // Ids in hand, so a wanted claim is now a pair of numbers.
  const pairs = [];
  for (const item of items) {
    pairs.push({
      languageId: existing.languages.get(item.tag.trim().toLowerCase()),
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
async function ensureAll({ cache, table, select, keyOf, needed, onCreate, onHit }) {
  const missing = new Map();
  for (const item of needed) {
    if (cache.has(item.key)) {
      onHit?.();
      continue;
    }
    if (!missing.has(item.key)) missing.set(item.key, item);
  }
  if (missing.size === 0) return;

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

