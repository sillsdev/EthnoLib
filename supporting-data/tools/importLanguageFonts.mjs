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
};

const unresolved = [];
const touched = new Set();
let done = 0;

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

  const languageId = await ensureLanguage(resolved);
  touched.add(resolved.tag);

  const sourceId = await ensureSource(SOURCE_TITLE, sldrPageUrl(sldrTag));

  for (const familyId of familyIds) {
    const family = families[familyId];
    if (!family?.family) {
      // The snapshot drops families it may not offer, and a language rule can
      // still name one. Nothing to claim; the chooser would not show it either.
      counts["skipped (family not in snapshot)"]++;
      unresolved.push(`${sldrTag} → ${familyId} (not in snapshot)`);
      continue;
    }

    const fontId = await ensureFont(family.family);
    const claimId = await ensureClaim(languageId, fontId);
    await addEvidence(
      claimId,
      sourceId,
      details(sldrTag, resolved, familyId, family, bundled)
    );
    client.log(`${sldrTag} → ${resolved.tag}: ${family.family}`);
  }
}

// The script fallbacks, either filed or merely counted.
const fallbackReport = await handleScriptDefaults();

counts["writing systems touched"] = touched.size;

await client.recordRun("finished", { ...run, counts });

report("Stage 5 — Language Font Finder recommendations", counts, client);
console.log(`  from ${bundledPath}`);
console.log(`  (${client.stats.reads} reads, ${client.stats.writes} writes)`);
for (const line of fallbackReport) console.log(`  ${line}`);
if (unresolved.length > 0) {
  console.log(`  skipped: ${unresolved.join(", ")}`);
}

/**
 * find-or-create against the cache, falling back to the client's own
 * look-again when an insert loses a race.
 */
async function cachedEnsure(cache, key, table, findQuery, row, onCreate) {
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const id = await client.insertRow(table, row);
  if (id !== undefined) {
    cache.set(key, id);
    onCreate?.();
    return id;
  }
  const again = await client.ensureRow(table, findQuery, row);
  cache.set(key, again.id);
  if (again.created) onCreate?.();
  return again.id;
}

async function ensureLanguage(resolved) {
  return cachedEnsure(
    existing.languages,
    resolved.tag.trim().toLowerCase(),
    "language",
    `bcp47=ilike.${client.q(resolved.tag)}`,
    { bcp47: resolved.tag, name: resolved.name?.trim() || null },
    () => counts["language rows created"]++
  );
}

async function ensureFont(familyName) {
  const name = familyName.trim();
  return cachedEnsure(
    existing.fonts,
    name.toLowerCase(),
    "font",
    `family_name=ilike.${client.q(name)}`,
    { family_name: name },
    () => counts["font rows created"]++
  );
}

async function ensureClaim(languageId, fontId) {
  const key = `${languageId}:${fontId}`;
  if (existing.claims.has(key)) {
    counts["font_support claims already there"]++;
    return existing.claims.get(key);
  }
  return cachedEnsure(
    existing.claims,
    key,
    "font_support",
    `language_id=eq.${languageId}&font_id=eq.${fontId}`,
    { language_id: languageId, font_id: fontId, details: null },
    () => counts["font_support claims created"]++
  );
}

async function ensureSource(title, url) {
  return cachedEnsure(existing.sources, url, "source", `url=eq.${client.q(url)}`, {
    title,
    url,
    type: "dataset",
  });
}

async function addEvidence(claimId, sourceId, detailsText) {
  const key = `${claimId}:${sourceId}`;
  if (existing.evidence.has(key)) {
    counts["evidence already cited this page"]++;
    return;
  }
  await client.insertRow("font_support_evidence", {
    font_support_id: claimId,
    source_id: sourceId,
    contributor_id: null,
    details: detailsText,
    submitted_via: "import",
    session_id: null,
  });
  existing.evidence.add(key);
  counts["evidence rows added"]++;
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

  const fallbackSourceId = await ensureSource(FALLBACK_TITLE, FALLBACK_URL);
  let claims = 0;
  let already = 0;
  let evidence = 0;
  const before = {
    created: counts["font_support claims created"],
    there: counts["font_support claims already there"],
    evidence: counts["evidence rows added"],
  };
  for (const { script, ids, targets } of plan) {
    for (const system of targets) {
      // Never create a language row for a fallback: a script's default is not a
      // reason to believe a writing system exists in this database.
      const languageId = existing.languages.get(system.tag.trim().toLowerCase());
      if (languageId === undefined) continue;
      for (const id of ids) {
        const family = families[id];
        if (!family?.family) continue;
        const fontId = await ensureFont(family.family);
        const claimId = await ensureClaim(languageId, fontId);
        await addEvidence(
          claimId,
          fallbackSourceId,
          `Language Font Finder fallback for the ${script} script, not a recommendation for ` +
            `${system.tag}: nobody has written a font rule for this language, and this is what ` +
            `the Font Finder answers for its script. Family ${id}` +
            (family.license ? `; licence ${family.license}` : "") +
            (bundled.generatedAt ? `; snapshot ${bundled.generatedAt}` : "")
        );
      }
    }
  }
  claims = counts["font_support claims created"] - before.created;
  already = counts["font_support claims already there"] - before.there;
  evidence = counts["evidence rows added"] - before.evidence;
  return [
    `script fallbacks: filed for ${plan.length} scripts` +
      ` (${claims} claims created, ${already} already there, ${evidence} evidence rows,` +
      ` ${regionSkipped} region-conditioned rules skipped).`,
    `  cited as "${FALLBACK_TITLE}", which is not an approved source, so these stay unserved.`,
  ];
}
