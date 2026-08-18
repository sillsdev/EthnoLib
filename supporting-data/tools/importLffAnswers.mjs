// Stage 6 of supporting-data/docs/population-plan.md: a cache of what the SIL
// Language Font Finder service answers when asked about a tag.
//
//   node supporting-data/tools/importLffAnswers.mjs --dry-run --only dmk --verbose
//   node supporting-data/tools/importLffAnswers.mjs --dry-run --limit 25
//   node supporting-data/tools/importLffAnswers.mjs
//
// The service (`GET https://lff.api.languagetechnology.org/lang/{tag}`) accepts
// any language tag and always has an answer. Per its maintainers, where SLDR
// holds explicit font information for the language it returns that; where SLDR
// holds none, it works from the tag itself — script and region, resolved through
// langtags — and answers anyway. The response does not say which of the two a
// given answer is, so this importer does not either.
//
// What makes this stage different from stage 5, and the rule to keep:
//
//  - Verbatim. Every family the response's `families` map names becomes a claim,
//    under the name the response gives it. Nothing is filtered, trimmed or
//    judged, and nothing is reconstructed from the service's published data
//    files. The service is the authority on its own answers and this table is a
//    cache of them; an importer deciding some families do not count would make
//    it something else.
//  - The service is the source. Evidence cites the per-tag query URL and the
//    date asked, never an SLDR page. That keeps two different statements
//    distinguishable forever — see docs/lff-and-the-language-list.md. One claim
//    may carry both kinds of evidence, and a UI reads the difference off the
//    sources.
//
// Nothing sets rank. Re-runnable: evidence is skipped when the claim already
// cites the same query URL, so a second run over a tag writes nothing.
//
// It is somebody's public service. Three requests in flight at most, a pause
// between launches, one retry on a 5xx or a network failure, and a tag whose
// request fails is counted and listed rather than guessed at.

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

const SOURCE_TITLE = "SIL Language Font Finder";
const ENDPOINT = "https://lff.api.languagetechnology.org/lang";

/** One source row per tag, keyed by its URL, the way stage 5 keys SLDR pages. */
const queryUrl = (tag) => `${ENDPOINT}/${encodeURIComponent(tag)}`;

/** At most this many requests in flight, and this long between launches. */
const CONCURRENCY = 3;
const LAUNCH_GAP_MS = 100;
const REQUEST_TIMEOUT_MS = 30_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const options = parseArgs();
const client = createClient(options);

const askedAt = new Date();

// `--only` takes either spelling: the writing system's own tag (`dmk-Arab`) or
// the bare language subtag (`dmk`), which selects every script langtags gives it.
const asked = (system) =>
  !options.only ||
  options.only.has(system.tag.toLowerCase()) ||
  options.only.has(system.language.toLowerCase());

const systems = [...writingSystems(loadLangtags(options.langtags)).values()]
  .filter((system) => !NON_SCRIPTS.has(system.script))
  .filter(asked);

const tags = options.limit === undefined ? systems : systems.slice(0, options.limit);

// ---------------------------------------------------------------------------
// Read what exists once, up front — same reason as stage 5. A find-or-create per
// claim is two sequential round trips each on top of the 8,500 the service
// already costs us; five paged reads answer the same questions, and a re-run
// with nothing to do spends its requests on the service rather than on us.
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
  tool: "importLffAnswers.mjs",
  source: SOURCE_TITLE,
  // A live read, so the answers are as of now — which is the whole point of the
  // stage, and what a later run's timestamp is compared against.
  sourceGeneratedAt: askedAt.toISOString(),
  notes:
    `Asked the SIL Language Font Finder about ${tags.length} writing systems ` +
    `from langtags.json, one request per tag to ${ENDPOINT}/{tag}, and filed a ` +
    `font_support claim for every family each response's families map named. ` +
    `A live read of the service, not of any snapshot in this repo.`,
});
await client.recordRun("started", run);

const counts = {
  // After --only, before --limit, so a filtered run's report is about the run.
  "writing systems selected": systems.length,
  "tags asked": 0,
  "answers received": 0,
  "answers with no families": 0,
  "requests returning 404": 0,
  "request failures": 0,
  "writing systems touched": 0,
  "language rows created": 0,
  "font rows created": 0,
  "font_support claims created": 0,
  "font_support claims already there": 0,
  "evidence rows added": 0,
  "evidence already cited this answer": 0,
  "families named without a family name": 0,
};

/** Tags whose request never came back with an answer: tag plus what went wrong. */
const failures = [];
const notFound = [];
/** Families a response named without a display name — see where this is pushed. */
const unnamed = [];

// ---------------------------------------------------------------------------
// Ask everything, then file it in batches: the writes cost about forty requests
// rather than one per row, and the run's own slowness is the service's rate and
// nothing else.
//
// Each response is reduced to its claims and dropped as it arrives, never held.
// A Latin-script answer is 76KB of JSON — mostly the download URLs of every file
// of every family, which this stage does not record — so keeping 8,500 parsed
// responses to walk afterwards would be gigabytes for the few hundred bytes each
// contributes.
// ---------------------------------------------------------------------------
const wanted = [];
await askAll(tags);

/** Turn one response into wanted claims, then let the response go. */
function collect(system, answer) {
  const families = answer.families ?? {};
  const ids = Object.keys(families);
  if (ids.length === 0) {
    counts["answers with no families"]++;
    return;
  }
  const roles = answer.roles ?? {};
  const defaultFamily = new Set(answer.defaultfamily ?? []);
  for (const familyId of ids) {
    const familyName = String(families[familyId]?.family ?? "").trim();
    if (!familyName) {
      // A family the response named without giving it a display name. There is
      // no claim to make — family_name is the identity of a font row — so it is
      // listed rather than silently dropped.
      unnamed.push(`${system.tag} -> ${familyId}`);
      continue;
    }
    wanted.push({
      tag: system.tag,
      name: system.name?.trim() || null,
      sourceUrl: queryUrl(system.tag),
      familyName,
      details: details(system, familyId, roles, defaultFamily, answer),
      log: `${system.tag}: ${familyName} (${familyId})`,
    });
  }
}

await fileWanted(wanted);
for (const item of wanted) client.log(item.log);

counts["writing systems touched"] = new Set(wanted.map((item) => item.tag)).size;
counts["request failures"] = failures.length;
counts["families named without a family name"] = unnamed.length;

await client.recordRun("finished", { ...run, counts });

report("Stage 6 - Language Font Finder answers", counts, client);
console.log(`  asked ${ENDPOINT}/{tag} at ${askedAt.toISOString()}`);
console.log(`  (${client.stats.reads} reads, ${client.stats.writes} writes)`);
if (notFound.length > 0) {
  console.log(`  404: ${notFound.join(", ")}`);
}
if (failures.length > 0) {
  console.log(`  failed: ${failures.join(", ")}`);
}
if (unnamed.length > 0) {
  console.log(`  no family name: ${unnamed.join(", ")}`);
}

/**
 * Ask the service about every tag, at most CONCURRENCY at a time with a pause
 * between launches. A tag that fails twice is counted and listed; the run
 * carries on, because 8,500 requests over an hour will meet a bad minute and
 * losing the other 8,499 to it would be absurd.
 */
async function askAll(systemList) {
  let next = 0;

  async function worker(slot) {
    // Stagger the workers' first request so three do not arrive at the same
    // instant, then keep a gap before each one after that.
    await sleep(LAUNCH_GAP_MS * slot);
    for (;;) {
      const at = next++;
      if (at >= systemList.length) return;
      const system = systemList[at];
      const answer = await ask(system.tag);
      counts["tags asked"]++;
      if (answer.ok) {
        counts["answers received"]++;
        collect(system, answer.body);
      } else if (answer.status === 404) {
        counts["requests returning 404"]++;
        notFound.push(system.tag);
      } else {
        failures.push(`${system.tag} (${answer.reason})`);
      }
      // Progress on stderr, so a run of this length can be watched without its
      // report having to compete with it on stdout.
      if (counts["tags asked"] % 500 === 0) {
        process.stderr.write(
          `asked ${counts["tags asked"]}/${systemList.length}, ` +
            `${wanted.length} claims wanted, ${failures.length} failed\n`
        );
      }
      await sleep(LAUNCH_GAP_MS);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, systemList.length) }, (_, slot) =>
      worker(slot)
    )
  );
}

/** One tag, with a single retry on a 5xx, a timeout or a network error. */
async function ask(tag) {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await sleep(1000);
    try {
      const response = await fetch(queryUrl(tag), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.ok) {
        return { ok: true, body: await response.json() };
      }
      if (response.status >= 500 && attempt === 0) continue;
      return { ok: false, status: response.status, reason: `HTTP ${response.status}` };
    } catch (error) {
      if (attempt === 0) continue;
      return { ok: false, reason: error.name === "TimeoutError" ? "timeout" : String(error.message ?? error) };
    }
  }
  return { ok: false, reason: "unreachable" };
}

/**
 * File a list of wanted claims: languages, sources and fonts first so the ids
 * exist, then the claims, then the evidence — one batch per table rather than a
 * request per row. Same shape as stage 5's, for the same reasons.
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
      row: { title: SOURCE_TITLE, url: item.sourceUrl, type: "service" },
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

  const pairs = [];
  for (const item of items) {
    pairs.push({
      languageId: existing.languages.get(item.tag.trim().toLowerCase()),
      fontId: existing.fonts.get(item.familyName.toLowerCase()),
      sourceId: existing.sources.get(item.sourceUrl),
      details: item.details,
    });
  }

  await ensureAll({
    cache: existing.claims,
    table: "font_support",
    select: "id,language_id,font_id",
    needed: pairs.map((pair) => ({
      key: `${pair.languageId}:${pair.fontId}`,
      // Nothing written here: the service's response carries no OpenType
      // feature settings, and leaving the column alone keeps stage 5's values
      // (which do come with a source) untouched.
      row: { language_id: pair.languageId, font_id: pair.fontId },
      find: `language_id=eq.${pair.languageId}&font_id=eq.${pair.fontId}`,
    })),
    keyOf: (row) => `${row.language_id}:${row.font_id}`,
    onCreate: () => counts["font_support claims created"]++,
    onHit: () => counts["font_support claims already there"]++,
  });

  const evidence = [];
  for (const pair of pairs) {
    const claimId = existing.claims.get(`${pair.languageId}:${pair.fontId}`);
    const key = `${claimId}:${pair.sourceId}`;
    if (existing.evidence.has(key)) {
      counts["evidence already cited this answer"]++;
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

  for (let i = 0; i < evidence.length; i += 500) {
    const result = await client.insertRows(
      "font_support_evidence",
      evidence.slice(i, i + 500)
    );
    counts["evidence rows added"] += result.inserted;
  }
}

/**
 * Find-or-create for a whole set at once — a copy of stage 5's helper, deduped
 * by key first because one family is named for thousands of tags and the batch
 * would otherwise collide with itself.
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

  for (const item of missing.values()) {
    if (cache.has(item.key)) continue;
    const found = await client.ensureRow(table, item.find, item.row);
    cache.set(item.key, found.id);
    if (found.created) onCreate?.();
  }
}

/**
 * What the response said about this family, and nothing else: the service's own
 * id for it, whether the response listed it in `defaultfamily`, which roles
 * named it, the API version that answered, and when we asked. Whether an answer
 * came from a per-language SLDR entry or from the tag's script and region is not
 * in the response, so it is not in here either.
 */
function details(system, familyId, roles, defaultFamily, answer) {
  const parts = [
    `The SIL Language Font Finder answered ${system.tag} with family id ${familyId}`,
  ];
  const named = Object.entries(roles)
    .filter(([, list]) => Array.isArray(list) && list.includes(familyId))
    .map(([role]) => role);
  parts.push(
    named.length > 0
      ? `listed under role${named.length > 1 ? "s" : ""} ${named.join(", ")}`
      : "not listed under any role in the response"
  );
  parts.push(
    defaultFamily.has(familyId)
      ? "listed in defaultfamily"
      : "not listed in defaultfamily"
  );
  if (answer.apiversion !== undefined) {
    parts.push(`apiversion ${answer.apiversion}`);
  }
  parts.push(`asked ${askedAt.toISOString()}`);
  return parts.join("; ");
}
