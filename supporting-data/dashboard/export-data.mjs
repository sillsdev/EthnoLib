// Bake the database into JSON the dashboard SPA loads as static files. Run by
// the Pages workflow before `vite build`, and by hand with:
//
//   node supporting-data/dashboard/export-data.mjs
//   node supporting-data/dashboard/export-data.mjs --out some/other/dir
//
// Reads only, through coverage.mjs's GET-only fetch helper, so running it is
// always safe. Viewers of the built site never touch the database: freshness is
// "as of the last deploy", the same deal the baked HTML page offers today.

import { mkdir, writeFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { gatherCoverage, getAllRows } from "./coverage.mjs";
import { buildStamp } from "./stamp.mjs";
import { tallySources } from "./sources.mjs";
import { gatherVenn } from "./venn.mjs";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * How much of a sample text the grid carries. The full passage is not one of the
 * requested columns and 752 of them at up to 3000 characters is payload spent on
 * something nothing renders; `textLength` keeps the real size visible.
 */
const PREVIEW = 200;

function parseArgs(argv) {
  const options = { out: resolve(here, "app/public/data") };
  for (let at = 0; at < argv.length; at++) {
    if (argv[at] === "--out") {
      const value = argv[++at];
      if (value === undefined) throw new Error("--out needs a value");
      options.out = resolve(process.cwd(), value);
    } else throw new Error(`unknown option: ${argv[at]}`);
  }
  return options;
}

/** The evidence embed every claim table shares, spelled once. */
const EVIDENCE_SELECT = "details,submitted_via,source(title,url,type)";

function evidenceOf(rows) {
  return (rows ?? []).map((row) => ({
    details: row.details,
    submittedVia: row.submitted_via,
    // Evidence with a contributor and no source is someone's own knowledge, so
    // an absent source is data, not a hole to fill in.
    source: row.source
      ? { title: row.source.title, url: row.source.url, type: row.source.type }
      : null,
  }));
}

/** Group claims by the language they are about, so the join below is a lookup. */
function byLanguage(claims) {
  const grouped = new Map();
  for (const claim of claims) {
    const list = grouped.get(claim.language_id);
    if (list) list.push(claim);
    else grouped.set(claim.language_id, [claim]);
  }
  return grouped;
}

async function gatherLanguages() {
  // Four independent reads; the join happens here rather than in one giant
  // embedded query so a claim table growing does not slow the others down.
  const [approved, languages, alphabets, sampleTexts, fontSupport] = await Promise.all([
    getAllRows("approved_source", "title", "title"),
    getAllRows("language", "id,bcp47,name"),
    getAllRows(
      "alphabet",
      "id,language_id,characters,characters_key,orthography_label,rank,rank_note," +
        `alphabet_evidence(${EVIDENCE_SELECT})`
    ),
    getAllRows(
      "sample_text",
      "id,language_id,text,orthography_label,rank,rank_note," +
        `sample_text_evidence(${EVIDENCE_SELECT})`
    ),
    getAllRows(
      "font_support",
      "id,language_id,opentype_features,rank,rank_note,font(family_name)," +
        `font_support_evidence(${EVIDENCE_SELECT})`
    ),
  ]);

  const alphabetsBy = byLanguage(alphabets);
  const sampleTextsBy = byLanguage(sampleTexts);
  const fontsBy = byLanguage(fontSupport);

  const entries = [];
  for (const language of languages) {
    const languageAlphabets = alphabetsBy.get(language.id) ?? [];
    const languageSamples = sampleTextsBy.get(language.id) ?? [];
    const languageFonts = fontsBy.get(language.id) ?? [];
    // Stage 1 of the import files a `language` row per writing system in
    // langtags, claims or no claims, because coverage needs a denominator. The
    // grid is the other question — "what do we actually have" — and 6,800
    // all-empty rows would drown the answer, so claimless rows stay out.
    if (
      !languageAlphabets.length &&
      !languageSamples.length &&
      !languageFonts.length
    )
      continue;

    entries.push({
      id: language.id,
      bcp47: language.bcp47,
      name: language.name,
      alphabets: languageAlphabets.map((claim) => ({
        id: claim.id,
        characters: claim.characters,
        charactersKey: claim.characters_key,
        orthographyLabel: claim.orthography_label,
        rank: claim.rank,
        rankNote: claim.rank_note,
        evidence: evidenceOf(claim.alphabet_evidence),
      })),
      sampleTexts: languageSamples.map((claim) => ({
        id: claim.id,
        textPreview: claim.text.slice(0, PREVIEW),
        textLength: [...claim.text].length,
        orthographyLabel: claim.orthography_label,
        rank: claim.rank,
        rankNote: claim.rank_note,
        evidence: evidenceOf(claim.sample_text_evidence),
      })),
      fonts: languageFonts.map((claim) => ({
        id: claim.id,
        familyName: claim.font?.family_name ?? null,
        // The settings SLDR records on <sil:font features="...">, as
        // tag -> value. null where the source named none, which is most rows.
        opentypeFeatures: claim.opentype_features,
        rank: claim.rank,
        rankNote: claim.rank_note,
        evidence: evidenceOf(claim.font_support_evidence),
      })),
    });
  }

  return {
    entries,
    // What each source has put in, from the rows just read rather than from a
    // second pass over the same tables.
    sources: tallySources(
      { alphabets, sampleTexts, fontSupport },
      approved.map((row) => row.title)
    ),
    totals: {
      languages: languages.length,
      withClaims: entries.length,
      alphabets: alphabets.length,
      sampleTexts: sampleTexts.length,
      fontSupport: fontSupport.length,
      evidence:
        alphabets.reduce((n, c) => n + (c.alphabet_evidence?.length ?? 0), 0) +
        sampleTexts.reduce(
          (n, c) => n + (c.sample_text_evidence?.length ?? 0),
          0
        ) +
        fontSupport.reduce(
          (n, c) => n + (c.font_support_evidence?.length ?? 0),
          0
        ),
    },
  };
}

const { out } = parseArgs(process.argv.slice(2));

const [languages, coverage, runs, venn] = await Promise.all([
  gatherLanguages(),
  gatherCoverage(),
  getAllRows("import_run", "*"),
  gatherVenn(),
]);
const stamp = buildStamp();

await mkdir(out, { recursive: true });

const files = [
  ["languages.json", languages.entries],
  ["runs.json", runs],
  ["coverage.json", coverage],
  ["venn.json", venn],
  ["sources.json", languages.sources],
  [
    "meta.json",
    { generatedAt: stamp.generatedAt, branch: stamp.ref, commit: stamp.commit },
  ],
];

let totalBytes = 0;
const sizes = [];
for (const [name, data] of files) {
  const target = resolve(out, name);
  await writeFile(target, JSON.stringify(data), "utf8");
  const { size } = await stat(target);
  totalBytes += size;
  sizes.push(`    ${name.padEnd(16)} ${(size / 1024).toFixed(0).padStart(7)} KiB`);
}

// The same report an importer prints, for the same reason: an export that
// quietly produced a page of zeroes should be obvious from the log.
const { totals } = languages;
console.log(`\nBaked dashboard data — ${stamp.ref} @ ${stamp.commit}`);
console.log(`  language rows        ${totals.languages}`);
console.log(`  with any claim       ${totals.withClaims}`);
console.log(`  alphabet claims      ${totals.alphabets}`);
console.log(`  sample text claims   ${totals.sampleTexts}`);
console.log(`  font support claims  ${totals.fontSupport}`);
console.log(`  evidence rows        ${totals.evidence}`);
console.log(`  import runs          ${runs.length}`);
console.log(
  `  coverage headline    ${coverage.anyCovered} of ${coverage.denominator.writingSystems} writing systems`
);
console.log(
  `  evidence by source   ` +
    Object.entries(languages.sources)
      .map(
        ([key, entry]) =>
          `${key} ${
            entry.evidence.alphabets +
            entry.evidence.sampleTexts +
            entry.evidence.fonts
          }`
      )
      .join(", ")
);
console.log(
  `  alphabet sources     SLDR ${venn.sets.sldr.covered}, BloomLibrary ` +
    `${venn.sets.bloom.covered}, eBible ${venn.sets.ebible.covered}; ` +
    `${venn.corpusOnly} writing systems have a corpus and no SLDR alphabet`
);
console.log(
  `\n  wrote ${files.length} files to ${out} (${(totalBytes / 1024 / 1024).toFixed(2)} MiB)`
);
for (const line of sizes) console.log(line);
