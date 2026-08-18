// Stage 3 of supporting-data/docs/population-plan.md: sample_text claims from
// the gflanguages passages the repo already ships.
//
//   node supporting-data/tools/importGflanguagesSampleTexts.mjs --dry-run --only aa_Latn
//   node supporting-data/tools/importGflanguagesSampleTexts.mjs --dry-run
//   node supporting-data/tools/importGflanguagesSampleTexts.mjs
//
// font-core's bundled/sampleTexts.json is keyed `{lang}_{Script}` — the names
// of gflanguages' own files — so the script comes straight off the key and
// nothing has to be inferred. Each passage becomes one sample_text claim with
// evidence citing Google Fonts' language data and the URL of the very
// .textproto the passage was read out of.
//
// A few keys carry more than that: a region (`yo_Latn_BJ`, `mam_Latn_MX`) or an
// orthography (`tw_akuapem_Latn`). Like stage 2, the claim lands on the writing
// system, because that is what a sample text is written in; an orthography
// becomes the claim's orthography_label, a region is dropped from the tag and
// kept in the evidence details. So `yo_Latn` and `yo_Latn_BJ` become two
// sibling claims on one writing system, which is exactly what the model is
// for.
//
// Some of these passages are scripture or prayer excerpts. The importer
// records them as they are — a passage is evidence of how the language is
// written whatever it says — and that is safe precisely because an import
// cannot make anything visible: the read path serves only `preferred` claims
// and no importer sets rank. Choosing what a user is shown stays a human
// decision.
//
// Re-runnable: evidence is skipped when the claim already cites the same
// gflanguages file.

import { readBundled } from "./lib/fontCore.mjs";
import {
  loadLangtags,
  tagIndex,
  isScriptSubtag,
  titleCaseScript,
} from "./lib/langtags.mjs";
import {
  createClient,
  keyTooBigForIndex,
  parseArgs,
  report,
  runDescriptor,
  textKey,
} from "./lib/langdata.mjs";

const SOURCE_TITLE = "Google Fonts language data (gflanguages)";

/** The file the passage came from, as a page a person can read. */
function gflanguagesFileUrl(key) {
  return `https://github.com/googlefonts/lang/blob/main/Lib/gflanguages/data/languages/${encodeURIComponent(key)}.textproto`;
}

const options = parseArgs();
const client = createClient(options);

const { path: bundledPath, data: bundled } = readBundled(
  "sampleTexts.json",
  options.fontCore
);
const index = tagIndex(loadLangtags(options.langtags));

const run = runDescriptor({
  tool: "importGflanguagesSampleTexts.mjs",
  source: SOURCE_TITLE,
  sourceGeneratedAt: bundled.generatedAt,
});
await client.recordRun("started", run);

const counts = {
  "gflanguages entries in snapshot": Object.keys(bundled.samples ?? {}).length,
  "skipped (not in --only)": 0,
  "skipped (key names no script)": 0,
  "skipped (empty passage)": 0,
  "skipped (passage too long to index)": 0,
  "writing systems touched": 0,
  "language rows created": 0,
  "sample text claims created": 0,
  "sample text claims already there": 0,
  "evidence rows added": 0,
  "evidence already cited gflanguages": 0,
};

const skipped = [];
const touched = new Set();
let done = 0;

for (const [key, passage] of Object.entries(bundled.samples ?? {})) {
  if (options.limit !== undefined && done >= options.limit) break;

  const parsed = readKey(key);
  const tag = parsed?.tag;
  if (
    options.only &&
    !options.only.has(key.toLowerCase()) &&
    !(tag && options.only.has(tag.toLowerCase()))
  ) {
    counts["skipped (not in --only)"]++;
    continue;
  }
  done++;

  if (!tag) {
    // A key that isn't `{lang}_{Script}` — the snapshot's shape has changed
    // under us, so say which one rather than inventing a script.
    counts["skipped (key names no script)"]++;
    skipped.push(key);
    continue;
  }

  const text = typeof passage === "string" ? passage.trim() : "";
  if (!text) {
    counts["skipped (empty passage)"]++;
    skipped.push(`${key} (empty)`);
    continue;
  }

  const identity = textKey(text);
  if (keyTooBigForIndex(identity)) {
    // A sample text's identity IS the passage, and the unique index over it
    // tops out around 2.7KB. Two of gflanguages' passages run past that; they
    // are lost until the schema indexes a hash of the key instead.
    counts["skipped (passage too long to index)"]++;
    skipped.push(`${key} (${Buffer.byteLength(identity, "utf8")} bytes, too long to index)`);
    continue;
  }

  const language = await client.ensureLanguage(tag, nameFor(tag));
  if (language.created) counts["language rows created"]++;
  touched.add(tag);

  const claim = await client.ensureClaim("sample_text", "text_key", identity, {
    language_id: language.id,
    text,
    text_key: identity,
    // Only what the key itself says. gflanguages does not otherwise name an
    // orthography, and guessing would be worse than leaving it open.
    orthography_label: parsed.orthographyLabel ?? null,
  });
  if (claim.tooBigToIndex) {
    counts["skipped (passage too long to index)"]++;
    skipped.push(`${key} (refused by the identity index)`);
    continue;
  }
  if (claim.created) counts["sample text claims created"]++;
  else counts["sample text claims already there"]++;

  const url = gflanguagesFileUrl(key);
  const source = await client.ensureSource(SOURCE_TITLE, url, "dataset");

  if (
    await client.hasEvidenceFrom(
      "sample_text_evidence",
      "sample_text_id",
      claim.id,
      source.id
    )
  ) {
    counts["evidence already cited gflanguages"]++;
    client.log(`${key}: already cited`);
    continue;
  }

  await client.insertRow("sample_text_evidence", {
    sample_text_id: claim.id,
    source_id: source.id,
    contributor_id: null,
    details: details(key, tag, bundled),
    submitted_via: "import",
    session_id: null,
  });
  counts["evidence rows added"]++;
  client.log(`${key} → ${tag}: ${text.slice(0, 60).replace(/\s+/g, " ")}…`);
}

counts["writing systems touched"] = touched.size;

await client.recordRun("finished", { ...run, counts });

report("Stage 3 — gflanguages sample texts", counts, client);
console.log(`  from ${bundledPath}`);
console.log(`  (${client.stats.reads} reads, ${client.stats.writes} writes)`);
if (skipped.length > 0) {
  console.log(`  skipped keys: ${skipped.join(", ")}`);
}

/**
 * The writing system a gflanguages key names, and the orthography label it
 * carries if any: `aa_Latn` → `aa-Latn`, `tw_akuapem_Latn` → `tw-Latn` labelled
 * "akuapem", `yo_Latn_BJ` → `yo-Latn`. Nothing at all for a key naming no
 * script, which the caller counts as a skip rather than guessing.
 */
function readKey(key) {
  const parts = key.split("_").filter(Boolean);
  const scriptAt = parts.findIndex((part, at) => at > 0 && isScriptSubtag(part));
  if (scriptAt < 0) return undefined;
  const extras = [
    ...parts.slice(1, scriptAt),
    ...parts.slice(scriptAt + 1),
  ].filter((part) => !/^([A-Za-z]{2}|\d{3})$/.test(part));
  return {
    tag: `${parts[0]}-${titleCaseScript(parts[scriptAt])}`,
    orthographyLabel: extras.length > 0 ? extras.join(" ") : undefined,
  };
}

/** langtags' name, when it has one for this writing system. */
function nameFor(tag) {
  return index.get(tag.toLowerCase())?.name;
}

/**
 * Enough for a reader to judge the evidence: which gflanguages file, and when
 * the snapshot was taken. The passage itself is the claim, so it is not
 * repeated here.
 */
function details(key, tag, snapshot) {
  const parts = [`gflanguages entry ${key}`];
  if (key.replace(/_/g, "-").toLowerCase() !== tag.toLowerCase()) {
    parts.push(`claim filed against ${tag}`);
  }
  if (snapshot.generatedAt) parts.push(`snapshot ${snapshot.generatedAt}`);
  return parts.join("; ");
}
