// Stage 2 of supporting-data/docs/population-plan.md: alphabet claims from the
// SLDR exemplar data the repo already ships.
//
//   node supporting-data/tools/importSldrAlphabets.mjs --dry-run --only aa,fuv
//   node supporting-data/tools/importSldrAlphabets.mjs --dry-run
//   node supporting-data/tools/importSldrAlphabets.mjs
//
// Each entry of font-core's bundled/alphabets.json is a raw LDML UnicodeSet
// (`[a b c {ch} æ]`) keyed by an SLDR-spelled tag. It becomes one alphabet
// claim, with evidence citing the SLDR and the URL of the very XML file the
// exemplars were read out of — so a disputed claim can be traced to its source
// page. Nothing sets rank; an import gathers, it does not approve.
//
// Two tag problems, both handled the same way — resolve or skip and count:
//
//  - SLDR keys are often bare (`ffm`), and a claim is about a writing system,
//    so langtags supplies the script. A key langtags has never heard of is
//    skipped rather than guessed at.
//  - SLDR keys carry regions and orthography variants (`de-CH`,
//    `acr-x-cubulco`). The claim lands on the writing system (`de-Latn`,
//    `acr-Latn`), because that is what an alphabet belongs to; the variant
//    becomes the claim's orthography_label, and the original key is written
//    into the evidence details either way.
//
// Re-runnable: evidence is skipped when the claim already cites the same SLDR
// page.

import { readBundled } from "./lib/fontCore.mjs";
import {
  loadLangtags,
  tagIndex,
  resolveWritingSystem,
  orthographyLabelFrom,
} from "./lib/langtags.mjs";
import { parseUnicodeSetToAlphabet } from "./lib/unicodeSet.mjs";
import {
  alphabetKey,
  createClient,
  parseArgs,
  report,
  runDescriptor,
} from "./lib/langdata.mjs";

const SOURCE_TITLE = "SIL Locale Data Repository (SLDR)";

/**
 * The SLDR entry as a page a person can read. The data service itself answers
 * with `content-disposition: attachment`, so a link there saves a file instead
 * of showing anything; GitHub's view of the same XML is a page. SLDR filenames
 * write the tag's hyphens as underscores and shelve it under its first letter.
 * Same shape as the demo's sldrPageUrl.
 */
function sldrPageUrl(sldrTag) {
  const file = sldrTag.replace(/-/g, "_");
  return `https://github.com/silnrsi/sldr/blob/master/sldr/${file[0].toLowerCase()}/${encodeURIComponent(file)}.xml`;
}

const options = parseArgs();
const client = createClient(options);

const { path: bundledPath, data: bundled } = readBundled(
  "alphabets.json",
  options.fontCore
);
const index = tagIndex(loadLangtags(options.langtags));

const run = runDescriptor({
  tool: "importSldrAlphabets.mjs",
  source: SOURCE_TITLE,
  sourceGeneratedAt: bundled.generatedAt,
});
await client.recordRun("started", run);

const counts = {
  "SLDR entries in snapshot": Object.keys(bundled.alphabets ?? {}).length,
  "skipped (not in --only)": 0,
  "skipped (no script known)": 0,
  "skipped (nothing parsed out)": 0,
  "skipped (refused as too long)": 0,
  "writing systems touched": 0,
  "language rows created": 0,
  "alphabet claims created": 0,
  "alphabet claims already there": 0,
  "evidence rows added": 0,
  "evidence already cited SLDR": 0,
};

const unresolved = [];
const touched = new Set();
let done = 0;

for (const [sldrTag, exemplars] of Object.entries(bundled.alphabets ?? {})) {
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
    counts["skipped (no script known)"]++;
    unresolved.push(sldrTag);
    continue;
  }

  const characters = parseUnicodeSetToAlphabet(exemplars);
  if (!characters.trim()) {
    // An exemplar set of nothing but ranges too big to write out, or syntax we
    // don't read. Nothing to claim.
    counts["skipped (nothing parsed out)"]++;
    unresolved.push(`${sldrTag} (unparsed)`);
    continue;
  }

  const key = alphabetKey(characters);

  const language = await client.ensureLanguage(resolved.tag, resolved.name);
  if (language.created) counts["language rows created"]++;
  touched.add(resolved.tag);

  const claim = await client.ensureClaim("alphabet", "characters_key", key, {
    language_id: language.id,
    characters,
    characters_key: key,
    orthography_label: orthographyLabelFrom(sldrTag) ?? null,
  });
  if (claim.refusedAsTooLong) {
    // The SLDR writes a Han or Hangul inventory into the same field a Latin
    // alphabet uses — `ko` is 11,172 syllables — and the database has an
    // editorial ceiling on how long a claim's content may be. Until
    // supabase/migrations/20260819104500_hash_identity_indexes.sql has been
    // run the ceiling is much lower
    // and the unique index refuses these too, which is what the message will
    // say.
    counts["skipped (refused as too long)"]++;
    unresolved.push(
      `${sldrTag} (${key.split(" ").length} entries, refused as too long)`
    );
    continue;
  }
  if (claim.created) counts["alphabet claims created"]++;
  else counts["alphabet claims already there"]++;

  const url = sldrPageUrl(sldrTag);
  const source = await client.ensureSource(SOURCE_TITLE, url, "dataset");

  if (
    await client.hasEvidenceFrom(
      "alphabet_evidence",
      "alphabet_id",
      claim.id,
      source.id
    )
  ) {
    counts["evidence already cited SLDR"]++;
    client.log(`${sldrTag} → ${resolved.tag}: already cited`);
    continue;
  }

  await client.insertRow("alphabet_evidence", {
    alphabet_id: claim.id,
    source_id: source.id,
    contributor_id: null,
    details: details(sldrTag, resolved, exemplars, bundled),
    submitted_via: "import",
    session_id: null,
  });
  counts["evidence rows added"]++;
  client.log(
    `${sldrTag} → ${resolved.tag} (${resolved.via}): ${characters.slice(0, 60)}`
  );
}

counts["writing systems touched"] = touched.size;

await client.recordRun("finished", { ...run, counts });

report("Stage 2 — SLDR alphabets", counts, client);
console.log(`  from ${bundledPath}`);
console.log(`  (${client.stats.reads} reads, ${client.stats.writes} writes)`);
if (unresolved.length > 0) {
  console.log(`  skipped tags: ${unresolved.join(", ")}`);
}

/**
 * What a reader needs to judge this evidence later: which SLDR entry it came
 * from (the key is not always the tag the claim landed on), when the snapshot
 * was taken, and the exemplar string itself, so a parser change can be told
 * from a data change.
 */
function details(sldrTag, resolved, exemplars, snapshot) {
  const parts = [`SLDR entry ${sldrTag}`];
  if (sldrTag.toLowerCase() !== resolved.tag.toLowerCase()) {
    parts.push(`script from ${resolved.via}`);
  }
  if (snapshot.generatedAt) parts.push(`snapshot ${snapshot.generatedAt}`);
  parts.push(`exemplars ${exemplars}`);
  return parts.join("; ");
}
