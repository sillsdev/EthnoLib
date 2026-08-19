// Stage 4 of supporting-data/docs/population-plan.md, planned in
// supporting-data/docs/bloom-walker-plan.md: alphabet and font_support claims
// from the text and stylesheets of published BloomLibrary books.
//
//   node supporting-data/tools/importBloomBooks.mjs --dry-run
//   node supporting-data/tools/importBloomBooks.mjs --dry-run --only acr --verbose
//   node supporting-data/tools/importBloomBooks.mjs --prefix a --dry-run --review
//   node supporting-data/tools/importBloomBooks.mjs --prefix a
//   node supporting-data/tools/importBloomBooks.mjs --prefix ne,th,km --dry-run --compare-sldr --font-core <path to font-core>
//
// Scope, and the two ways of choosing it. `--prefix a` walks every language code
// in BloomLibrary's own language table that starts with `a`, which is what the
// plan meant by choosing languages from the catalogue rather than by hand.
// Without it, TARGET_SYSTEMS below is the list, and it is nine writing systems
// picked by hand. Under approved-sources.md nothing filed here reaches a user
// either way: a book is not an approved source, so these claims gather and wait.
//
// What it files, and what it does not. Fonts and alphabets. Sample text is the
// third thing the plan describes and it is NOT built — much of the library is
// scripture-adjacent, and that harvest carries a content risk the other two do
// not.
//
// Letters with no script of their own. Akha writes tone with modifier letters
// that Unicode assigns to no script, and dropping them threw away 22.8% of
// Akha's letters and filed an alphabet missing the marks that tell its words
// apart. Those are now counted under the script of the letter before them, which
// is the rule the apostrophe already used. See lib/bloom.mjs.
//
// What an alphabet entry is. In Devanagari, Thai, Khmer, Arabic and the other
// scripts listed in lib/bloom.mjs, a combining mark is an entry of its own; in
// Latin and the rest it stays on the letter it was written on. That is not a
// choice about writing systems, it is what the SLDR's own exemplar sets do, and
// these claims exist to be comparable with them. Measured against the SLDR:
// splitting marks took Thai from 35 of its 73 exemplars to 59 and dropped 200-odd
// entries the SLDR has never listed to none; Nepali, Bengali and Khmer moved the
// same way, and no Latin-script language changed. `--compare-sldr` is how that
// was measured and how it stays honest; docs/sldr-comparison.md has the numbers.
//
// What it cannot find. An alphabet whose letters are digraphs is beyond reach
// from text alone: Hausa's `sh` and `ts`, K'iche's `ch` and `tzʼ` are two
// characters in the file and nothing in the text says they are one letter. Those
// claims are inventories of characters, and the SLDR entries they cannot match
// are reported by `--compare-sldr` rather than passed over.
//
// Lower case, and one apostrophe. The sources these
// claims sit beside list the lower case only, and write the orthographic
// apostrophe as U+02BC, so an inventory that carries A and a separately, or ' and
// U+2019 separately, cannot accumulate support alongside an SLDR claim for the
// same alphabet. Both foldings are written out in the evidence with the raw
// counts behind them. See lib/bloom.mjs for where the apostrophe stops being
// punctuation.
//
// The script problem, and why the text decides it. Bloom's language rows carry
// no script: `isoCode` is a bare `ace`, and langtags would supply Latin by
// default, which is simply wrong for a language Bloom also publishes in Arabic.
// So the script comes from the text — characters are partitioned by Unicode
// script property, and each partition is filed under the source's own tag
// rewritten to name that script (`retagWithScript`).
//
// Finding a script is not evidence the language uses it, which is the other half.
// Books carry dates, URLs and English notes inside their vernacular text, so a
// Latin bucket appears in Amharic and Arabic books holding nothing but the
// English alphabet. Two rules keep those out, both in `systemFor` and the loop
// that calls it: the rarity threshold is measured against everything the
// language's books carry rather than against one bucket, so four stray
// characters cannot clear a bar of their own making; and a script is filed only
// when langtags lists it for that language, or, when langtags has no entry for
// the language at all, only for its largest bucket. What was refused, and why,
// goes into the evidence of the claims that were filed.
//
// Codes that are not bare language codes. Bloom's table holds `ase-ML` and
// `ahk-Laoo-x-Ershee` as well as `ace`. Those extra subtags are distinctions
// somebody drew on purpose, so they survive into the tag a claim is filed under,
// with the observed script put in the script position. The database requires a
// script subtag on every language row, which is also why `ar-SA` cannot be
// stored as it stands and becomes `ar-Arab-SA`.
//
// The lang attribute is the whole game. The catalogue returns books where the
// target language is ANY of the book's languages, so `bloom-editable` divs whose
// lang exactly equals the code are the only text that counts, and front and back
// matter come out first because their credits and licence blocks carry the
// vernacular lang while holding English words.
//
// Checking the output. `--review` writes a per-book report — what each book
// contributed, and a short excerpt of its text — for a person or a model to read
// through; see reviewReportPath below for where it goes and why. The invariants
// in `invariantProblems` run on every claim whether or not `--review` is on,
// because they cost nothing.
//
// Nothing sets rank. Re-runnable: an alphabet claim dedupes by its inventory and
// a font claim by (writing system, font), and evidence is skipped when the claim
// already cites the same book. Books are read in objectId order under a fixed
// cap, so a second run over unchanged books derives the same inventory and
// writes nothing.
//
// It is somebody's public library. Three requests in flight at most, a pause
// between launches, one retry on a 5xx or a network failure.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  bookCounts,
  bookPageUrl,
  CANONICAL_APOSTROPHE,
  computedLevel,
  digitalHtmlUrl,
  editableLangs,
  fetchText,
  foldCluster,
  foldClusters,
  fontFamiliesByLang,
  frequencyFloor,
  harvesterBase,
  hasProblemTag,
  inventoryGrowth,
  isScriptNeutralLetter,
  langStylesUrl,
  languageCodesStartingWith,
  languageRows,
  letterClustersByScript,
  listBooks,
  sleep,
  textForLanguage,
} from "./lib/bloom.mjs";
import {
  loadLangtags,
  NON_SCRIPTS,
  resolveWritingSystem,
  retagWithScript,
  tagIndex,
  writingSystems,
} from "./lib/langtags.mjs";
import { readBundled } from "./lib/fontCore.mjs";
import { parseUnicodeSetToAlphabet } from "./lib/unicodeSet.mjs";
import {
  alphabetKey,
  createClient,
  parseArgs,
  report,
  runDescriptor,
} from "./lib/langdata.mjs";

const SOURCE_TYPE = "book";

/**
 * What the evidence rows say wrote them. `import` is what every other stage
 * writes, and it is true of this one too, but it tells a reader nothing: the
 * row came from somebody's published book, and that is the part worth seeing
 * next to the claim.
 */
const SUBMITTED_VIA = "book found on BloomLibrary.org";

/**
 * The writing systems a run walks when `--prefix` is not given, chosen by hand.
 * Nine tags across eight languages; `ace` appears twice because Acehnese is
 * written in both Latin and Arabic script and which of the two a book's text is
 * in is a question only the text can answer.
 */
const TARGET_SYSTEMS = [
  "ace-Latn",
  "ace-Arab",
  "aca-Latn",
  "acn-Latn",
  "guq-Latn",
  "acz-Latn",
  "acr-Latn",
  "ach-Latn",
  "act-Latn",
];

/**
 * Books read per language. A ceiling, not a target; the plan's number, and a
 * guess — nothing yet says whether forty books find letters that ten would have
 * missed. `inventoryGrowth` is the measurement that will answer it: every
 * alphabet claim records which book last added a letter to it, so a later run
 * can set this number from the evidence instead of from the plan.
 */
const DEFAULT_BOOK_CAP = 40;

/** At most this many book fetches in flight, and this long between launches. */
const CONCURRENCY = 3;
const LAUNCH_GAP_MS = 150;

/**
 * A book whose text is more than this share of a writing system's letter
 * occurrences is reported by the invariants. Not an error: a corpus of two books
 * is half one book by definition. It is worth seeing when a claim about a
 * language rests mostly on one upload.
 */
const DOMINANT_BOOK_SHARE = 0.4;

/** More codepoints than this in one alphabet entry means the segmentation ran away. */
const MAX_CLUSTER_LENGTH = 4;

/**
 * At most this much of a book's text goes into the review report. Long enough
 * that a sentence or two is readable, which is what tells a reader whether the
 * extraction picked up the vernacular or an English credits block; short enough
 * that the report is not a copy of somebody's book.
 */
const REVIEW_EXCERPT_CHARS = 300;

const options = parseArgs();
const client = createClient(options);
const bookCap = options.limit ?? DEFAULT_BOOK_CAP;
const readAt = new Date();

const langtagEntries = loadLangtags(options.langtags);
const index = tagIndex(langtagEntries);
/** Map of `language-Script` → langtags' record for it, the known-pairing test. */
const knownSystems = writingSystems(langtagEntries);
/** Every script langtags lists for a bare language code. */
const scriptsByLanguage = new Map();
for (const system of knownSystems.values()) {
  if (!scriptsByLanguage.has(system.language)) {
    scriptsByLanguage.set(system.language, new Set());
  }
  scriptsByLanguage.get(system.language).add(system.script);
}

/**
 * The SLDR's own exemplars, keyed by the writing system they resolve to, for
 * `--compare-sldr`. Read from the same font-core snapshot and through the same
 * parser importSldrAlphabets.mjs uses, so a difference reported here is a real
 * difference between the two answers and not two spellings of one answer.
 *
 * A writing system can have several SLDR entries: `cak-Latn` has five, one plain
 * and four named for a town or a dialect. All of them are kept, because which one
 * a set of books matches is the thing worth learning.
 */
const sldrAlphabets = new Map();
if (options.compareSldr) {
  const { data: bundled } = readBundled("alphabets.json", options.fontCore);
  for (const [sldrTag, exemplars] of Object.entries(bundled.alphabets ?? {})) {
    const resolved = resolveWritingSystem(sldrTag, index);
    if (!resolved) continue;
    const characters = parseUnicodeSetToAlphabet(exemplars);
    if (!characters.trim()) continue;
    const list = sldrAlphabets.get(resolved.tag) ?? [];
    list.push({
      sldrTag,
      // Folded exactly as our own entries are, or the saltillo the SLDR writes
      // for Mam and the U+02BC a book's author typed read as two letters.
      entries: new Set(
        alphabetKey(characters).split(" ").filter(Boolean).map(foldCluster)
      ),
    });
    sldrAlphabets.set(resolved.tag, list);
  }
}

const targets = await chooseTargets();

const run = runDescriptor({
  tool: "importBloomBooks.mjs",
  source: "BloomLibrary.org",
  // A live read of the catalogue and of the harvester's book files, so the
  // moment we read is the only date the input has.
  sourceGeneratedAt: readAt.toISOString(),
  notes: options.prefix
    ? `Walked every BloomLibrary language code starting with "${options.prefix.join('", "')}" ` +
      `(${targets.size} of them), at most ${bookCap} books each, and filed ` +
      `alphabet and font_support claims from the text and defaultLangStyles.css ` +
      `of the harvester's bloomdigital version of each book. The script each ` +
      `claim is filed under comes from the text. No sample text is harvested by ` +
      `this tool.`
    : `Walked ${targets.size} BloomLibrary language code(s) covering ` +
      `${[...targets.values()].reduce((n, t) => n + (t.wanted?.size ?? 0), 0)} writing ` +
      `system(s), at most ${bookCap} books each, and filed alphabet and ` +
      `font_support claims from the text and defaultLangStyles.css of the ` +
      `harvester's bloomdigital version of each book. Nine writing systems by ` +
      `hand, not the library; no sample text is harvested by this tool.`,
});
await client.recordRun("started", run);

const counts = {
  "language codes walked": targets.size,
  "codes skipped as unwritten or signed": 0,
  "codes with no BloomLibrary language row": 0,
  "codes with no books after filtering": 0,
  "books listed": 0,
  "books excluded by the copyright filter": 0,
  "books skipped for a system:problem tag": 0,
  "books read": 0,
  "books whose files could not be read": 0,
  "books with no text under the target lang": 0,
  "books carrying text already read from another entry": 0,
  "letter occurrences harvested": 0,
  "script buckets refused": 0,
  "letter occurrences in a refused script": 0,
  "letter occurrences in no script we test": 0,
  "writing systems filed under": 0,
  "writing systems langtags does not list": 0,
  "language rows created": 0,
  "font rows created": 0,
  "alphabet claims created": 0,
  "alphabet claims already there": 0,
  "alphabet evidence rows added": 0,
  "alphabet evidence already cited this book": 0,
  "font_support claims created": 0,
  "font_support claims already there": 0,
  "font_support evidence rows added": 0,
  "font_support evidence already cited this book": 0,
  "invariant problems found": 0,
};

/** Per language code, what the run saw. Printed, and recorded with the run. */
const perCode = {};
/** Books whose harvester files did not come back: id plus what went wrong. */
const unreadable = [];
/** Scripts found in the text that this run refused to file, and why. */
const unclaimedScripts = [];
/** Catalogue entries dropped for carrying text a book already read carried. */
const duplicateEntries = [];
/** What the invariants flagged, across every claim this run filed. */
const invariantFindings = [];
/** One `--compare-sldr` line per alphabet filed that the SLDR also answers. */
const sldrComparisons = [];
/** One entry per book read, for `--review` to write out. */
const reviewBooks = [];

for (const target of targets.values()) {
  const summary = {
    "BloomLibrary language row": target.hasRow
      ? `${target.name ?? "(unnamed)"}, usageCount ${target.usageCount}` +
        (target.rows > 1 ? ` across ${target.rows} merged rows` : "")
      : undefined,
    "books listed": 0,
    "books excluded by the copyright filter": 0,
    "books skipped for a system:problem tag": 0,
    "books carrying text already read from another entry": 0,
    "books read": 0,
    "books with text under the target lang": 0,
    "letter occurrences by script": {},
    "filed under": {},
    "not filed": [],
  };
  if (target.wanted) {
    summary["target writing systems"] = [...target.wanted.values()].map((s) => s.tag);
  }
  perCode[target.code] = summary;

  if (!target.hasRow) {
    // No row in Bloom's language table at all, which is a different fact from
    // "a language with no usable books" and is reported as itself.
    counts["codes with no BloomLibrary language row"]++;
    summary["BloomLibrary language row"] = "none";
    summary["not filed"].push("BloomLibrary has no language row for this code");
    client.log(`${target.code}: no BloomLibrary language row`);
    continue;
  }

  // A language with no written form has no alphabet to find, and a sign
  // language's books carry their text in some other language: the running text
  // under `ase` is an English or French gloss, so an inventory derived from it
  // would describe that language while wearing the sign language's name. The
  // test is langtags' own — every script it lists for the code is SignWriting or
  // one of the "no script" codes — rather than a list of codes to avoid.
  const onlyUnwritten = unwrittenOrSigned(target.code);
  if (onlyUnwritten) {
    counts["codes skipped as unwritten or signed"]++;
    // The catalogue is not even asked, so the report must not print book counts
    // for this code: a "0 listed" would read as "no books" when what happened is
    // that we never looked.
    summary.skipped = true;
    summary["not filed"].push(
      `langtags lists only ${onlyUnwritten} for this code, so any running text ` +
        `its books carry is a gloss in another language`
    );
    client.log(`${target.code}: skipped, ${onlyUnwritten} only`);
    continue;
  }

  const catalogue = await bookCounts(target.code);
  const excluded = catalogue.listed - catalogue.afterCopyrightFilter;
  summary["books listed"] = catalogue.listed;
  summary["books excluded by the copyright filter"] = excluded;
  counts["books listed"] += catalogue.listed;
  counts["books excluded by the copyright filter"] += excluded;
  target.catalogue = catalogue;

  const listed = await listBooks(target.code, bookCap);
  const usable = [];
  for (const book of listed) {
    if (hasProblemTag(book.tags)) {
      counts["books skipped for a system:problem tag"]++;
      summary["books skipped for a system:problem tag"]++;
      continue;
    }
    usable.push(book);
  }

  if (usable.length === 0) {
    counts["codes with no books after filtering"]++;
    summary["not filed"].push(
      excluded > 0 && catalogue.afterCopyrightFilter === 0
        ? `all ${catalogue.listed} of this language's harvested books are excluded by the copyright filter`
        : "no book survived the filters"
    );
    client.log(`${target.code}: no usable books`);
    continue;
  }

  const read = await readBooks(usable, target.code);
  summary["books read"] = read.length;
  counts["books read"] += read.length;

  // Aggregate the language's text across books before deciding anything: a
  // letter is only hidden by a restricted-vocabulary book if EVERY book in the
  // sample avoided it, so the inventory is derived from the whole corpus and
  // never from one book.
  // One book can hold more than one catalogue entry — the same upload made by
  // two accounts, most often — and each entry is a separate objectId with its
  // own book page, so nothing before this point can tell them apart. Reading
  // them all counts the same text twice: the inventory does not change, but
  // every frequency in the evidence doubles and the corpus claims two witnesses
  // where there is one. The text itself is the identity, which also means two
  // entries that have since diverged are still two books. First in objectId
  // order wins, so a re-run keeps the same one.
  const corpus = [];
  const seenText = new Map(); // text → the objectId that contributed it
  const repeats = [];
  for (const book of read) {
    if (!book.text.trim()) {
      counts["books with no text under the target lang"]++;
      continue;
    }
    const first = seenText.get(book.text);
    if (first !== undefined) {
      counts["books carrying text already read from another entry"]++;
      summary["books carrying text already read from another entry"]++;
      repeats.push(`${book.objectId} repeats ${first}`);
      duplicateEntries.push(`${target.code}: ${book.objectId} repeats ${first}`);
      continue;
    }
    seenText.set(book.text, book.objectId);
    corpus.push(book);
  }
  summary["books with text under the target lang"] = corpus.length;

  if (corpus.length === 0) {
    summary["not filed"].push(
      read.length === 1
        ? `1 book read, carrying no text under lang="${target.code}"`
        : `${read.length} books read, none carrying text under lang="${target.code}"`
    );
    continue;
  }

  // Per book once, because the growth curve, the dominance check, the font
  // filing and the review report all need it and it is the expensive part.
  for (const book of corpus) book.byScript = letterClustersByScript(book.text);
  if (options.review) {
    for (const book of corpus) reviewBooks.push(reviewEntry(target, book));
  }

  const byScript = letterClustersByScript(corpus.map((book) => book.text).join("\n"));

  // Every script's total before any of them is judged, because both decisions
  // that follow need the whole picture.
  //
  // The rarity threshold is one of them. It used to be computed from each
  // script's own total, which meant a bucket of four stray characters set its
  // threshold at two and a character appearing twice became an alphabet: that is
  // how Amharic acquired a Malayalam alphabet from one character in one book.
  // Computed across everything the language's books carry, the same four
  // characters are measured against Amharic's 379,593 letters and disappear.
  const occurrencesByScript = new Map();
  for (const [script, clusters] of byScript) {
    occurrencesByScript.set(
      script,
      [...clusters.values()].reduce((a, b) => a + b, 0)
    );
  }
  const totalOccurrences = [...occurrencesByScript.values()].reduce((a, b) => a + b, 0);
  const floor = frequencyFloor(totalOccurrences);
  counts["letter occurrences harvested"] += totalOccurrences;
  for (const [script, occurrences] of occurrencesByScript) {
    summary["letter occurrences by script"][script] = occurrences;
  }
  // The fallback for a language langtags has never heard of: its biggest script
  // is the one its books are written in, and the rest is something else.
  let biggest;
  for (const [script, occurrences] of occurrencesByScript) {
    if (script === "unidentified") continue;
    if (biggest === undefined || occurrences > occurrencesByScript.get(biggest)) {
      biggest = script;
    }
  }

  // Decide every script before filing any of them, so each claim's evidence can
  // name what else was found and refused.
  const admitted = [];
  const refusals = [];
  for (const [script, occurrences] of occurrencesByScript) {
    if (script === "unidentified") {
      // Letters belonging to a real script lib/bloom.mjs does not test. There is
      // no tag to file them under and inventing one would be a guess.
      counts["letter occurrences in no script we test"] += occurrences;
      summary["not filed"].push(
        `${occurrences} letter occurrences in no script this tool tests`
      );
      continue;
    }
    const system = systemFor(target, script, biggest);
    if (system.refusedBecause) {
      counts["script buckets refused"]++;
      counts["letter occurrences in a refused script"] += occurrences;
      refusals.push(`${occurrences} in ${script}, ${system.refusedBecause}`);
      unclaimedScripts.push(`${target.code}: ${occurrences} in ${script}`);
      summary["not filed"].push(
        `${occurrences} letter occurrences in ${script}: ${system.refusedBecause}`
      );
      continue;
    }
    admitted.push({ script, system, clusters: byScript.get(script), occurrences });
  }

  for (const { system, clusters, occurrences } of admitted) {
    if (!system.langtagsKnows) counts["writing systems langtags does not list"]++;
    counts["writing systems filed under"]++;
    await fileAlphabet({
      target,
      system,
      clusters,
      corpus,
      occurrences,
      totalOccurrences,
      floor,
      refusals,
      summary,
      repeats,
    });
    await fileFonts(target, system, corpus, summary);
  }

  for (const system of target.wanted?.values() ?? []) {
    if (!byScript.has(system.script)) {
      summary["not filed"].push(
        `${system.tag}: no ${system.script}-script text in the books read`
      );
    }
  }
}

counts["books whose files could not be read"] = unreadable.length;
counts["invariant problems found"] = invariantFindings.length;

const recorded = { ...counts, "per language code": perCode };
await client.recordRun("finished", { ...run, counts: recorded });

report("Stage 4 — BloomLibrary books", counts, client);
console.log(
  `  read BloomLibrary at ${readAt.toISOString()}, at most ${bookCap} book(s) per language` +
    (options.prefix
      ? `, every language code starting with "${options.prefix.join('", "')}"`
      : "")
);
console.log(`  (${client.stats.reads} reads, ${client.stats.writes} writes)`);
console.log("\nPer language code:");
for (const [code, summary] of Object.entries(perCode)) {
  console.log(
    `  ${code}` +
      (summary["target writing systems"]
        ? `  ${summary["target writing systems"].join(" ")}`
        : "")
  );
  console.log(`    BloomLibrary language row: ${summary["BloomLibrary language row"]}`);
  if (summary.skipped) {
    for (const line of summary["not filed"]) console.log(`    not filed: ${line}`);
    continue;
  }
  console.log(
    `    books: ${summary["books listed"]} listed, ` +
      `${summary["books excluded by the copyright filter"]} excluded by copyright, ` +
      `${summary["books skipped for a system:problem tag"]} problem-tagged, ` +
      `${summary["books read"]} read, ` +
      `${summary["books with text under the target lang"]} with target-lang text`
  );
  const scripts = Object.entries(summary["letter occurrences by script"]);
  console.log(
    `    letter occurrences: ${
      scripts.length === 0
        ? "none"
        : scripts.map(([script, n]) => `${script} ${n}`).join(", ")
    }`
  );
  for (const [tag, what] of Object.entries(summary["filed under"])) {
    console.log(`    ${tag}: ${what}`);
  }
  for (const line of summary["not filed"]) {
    console.log(`    not filed: ${line}`);
  }
}
if (unreadable.length > 0) {
  console.log(`\n  books whose files could not be read: ${unreadable.join(", ")}`);
}
if (duplicateEntries.length > 0) {
  console.log(`  catalogue entries carrying text already read: ${duplicateEntries.join("; ")}`);
}
if (unclaimedScripts.length > 0) {
  console.log(`  letters found and not filed: ${unclaimedScripts.join("; ")}`);
}
if (invariantFindings.length > 0) {
  console.log(`\nInvariants flagged ${invariantFindings.length}:`);
  for (const finding of invariantFindings) console.log(`  ${finding}`);
} else {
  console.log("\nInvariants: nothing flagged.");
}
if (options.compareSldr) {
  if (sldrComparisons.length > 0) {
    console.log(`\nAgainst the SLDR, ${plural(sldrComparisons.length, "comparison")}:`);
    for (const line of sldrComparisons) console.log(`  ${line}`);
  } else {
    console.log("\nAgainst the SLDR: none of the filed writing systems has an SLDR entry.");
  }
}
if (options.review) writeReviewReport();

/**
 * Which language codes this run walks, and which scripts it will accept for
 * each. `wanted` undefined means "whatever the text is in", which is the only
 * possible answer when the codes came from the catalogue rather than a list.
 */
async function chooseTargets() {
  const chosen = new Map();
  const wantedByOnly = (code, tag) =>
    !options.only ||
    options.only.has(String(code).toLowerCase()) ||
    (tag !== undefined && options.only.has(tag.toLowerCase()));

  if (options.prefix) {
    const rows = new Map();
    for (const prefix of options.prefix) {
      for (const [code, row] of await languageCodesStartingWith(prefix)) rows.set(code, row);
    }
    for (const row of rows.values()) {
      if (!wantedByOnly(row.isoCode)) continue;
      chosen.set(row.isoCode, {
        code: row.isoCode,
        // These codes came out of the language table, so the row exists by
        // construction; `name` can still be missing, which is a different fact.
        hasRow: true,
        name: row.name,
        usageCount: row.usageCount,
        rows: row.rows,
        wanted: undefined,
      });
    }
    return chosen;
  }

  for (const tag of TARGET_SYSTEMS) {
    const resolved = resolveWritingSystem(tag, index);
    const [code] = tag.split("-");
    const script = tag.split("-")[1];
    if (!wantedByOnly(code, tag)) continue;
    if (!chosen.has(code)) chosen.set(code, { code, wanted: new Map() });
    chosen.get(code).wanted.set(script, {
      tag,
      script,
      name: resolved?.name,
      langtagsKnows: knownSystems.has(`${code}-${script}`),
    });
  }
  // The hand-picked path takes its language names from Bloom's table too, so
  // the "no language row" report means the same thing in both modes.
  const rows = await languageRows([...chosen.keys()]);
  for (const target of chosen.values()) {
    const row = rows.get(target.code);
    target.hasRow = row !== undefined;
    target.name = row?.name;
    target.usageCount = row?.usageCount;
    target.rows = row?.rows;
  }
  return chosen;
}

/**
 * The writing system a script gets filed under, or the reason this run will not
 * file it.
 *
 * Finding a script in the text is not evidence that the language is written in
 * it. Books carry dates, URLs and English warnings inside their vernacular text,
 * so a Latin bucket turns up in Amharic and Arabic books holding nothing but the
 * English alphabet. langtags is the authority already trusted everywhere else
 * here, and it answers exactly this: Amharic is `Arab Brai Ethi`, so a Latin
 * bucket is refused; Akha is `Laoo Latn Mymr Thai`, so its Latin is filed.
 *
 * When langtags has no entry for the language at all — `arb` is one — there is
 * nothing to ask, and only the biggest script is filed. That keeps the alphabet
 * the books are actually written in and drops the incidental rest.
 */
function systemFor(target, script, biggest) {
  if (target.wanted) {
    const wanted = target.wanted.get(script);
    return (
      wanted ?? { refusedBecause: `no target writing system of this run names ${script}` }
    );
  }
  const bare = target.code.split("-")[0];
  const listed = scriptsByLanguage.get(bare);
  if (listed && !listed.has(script)) {
    return {
      refusedBecause:
        `langtags lists ${[...listed].sort().join(" ")} for ${bare}, not ${script}`,
    };
  }
  if (!listed && script !== biggest) {
    return {
      refusedBecause:
        `langtags has no entry for ${bare}, so only its largest script ` +
        `(${biggest}) is filed`,
    };
  }
  const known = knownSystems.get(`${bare}-${script}`);
  return {
    tag: retagWithScript(target.code, script),
    script,
    name: known?.name,
    langtagsKnows: Boolean(known),
  };
}

/**
 * The scripts langtags lists for a code, when every one of them says the
 * language has no written form of its own: SignWriting, or one of the "no
 * script" codes. Returns them for the report, or undefined.
 */
function unwrittenOrSigned(code) {
  const scripts = scriptsByLanguage.get(code.split("-")[0]);
  if (!scripts || scripts.size === 0) return undefined;
  const all = [...scripts].sort();
  const unwritten = all.every((script) => script === "Sgnw" || NON_SCRIPTS.has(script));
  return unwritten ? all.join(" and ") : undefined;
}

/**
 * Fetch each book's bloomdigital HTML and defaultLangStyles.css, at most
 * CONCURRENCY at a time with a pause between launches, and reduce each to what
 * this stage needs before letting the response go — a book's HTML is 5MB and
 * holding forty of them to walk afterwards would be gigabytes for a few hundred
 * bytes each contributes.
 */
async function readBooks(books, code) {
  const out = [];
  let next = 0;

  async function worker(slot) {
    await sleep(LAUNCH_GAP_MS * slot);
    for (;;) {
      const at = next++;
      if (at >= books.length) return;
      const book = books[at];
      const base = harvesterBase(book.baseUrl);
      if (!base) {
        unreadable.push(`${book.objectId} (no harvester URL from baseUrl)`);
        continue;
      }
      const htmlUrl = digitalHtmlUrl(base);
      const html = await fetchText(htmlUrl);
      if (!html.ok) {
        unreadable.push(`${book.objectId} (index.htm ${html.reason})`);
        await sleep(LAUNCH_GAP_MS);
        continue;
      }
      const cssUrl = langStylesUrl(base);
      const css = await fetchText(cssUrl);

      const extracted = textForLanguage(html.text, code);
      out.push({
        objectId: book.objectId,
        title: String(book.title ?? "").trim() || book.objectId,
        originalTitle: String(book.originalTitle ?? "").trim() || undefined,
        copyright: String(book.copyright ?? "").trim() || undefined,
        level: computedLevel(book.tags),
        tags: book.tags ?? [],
        updatedAt: book.updatedAt,
        htmlUrl,
        cssUrl,
        text: extracted.text,
        blocks: extracted.blocks,
        otherLangs: [...editableLangs(html.text).keys()].filter((lang) => lang !== code),
        fontFamilies: css.ok ? fontFamiliesByLang(css.text) : new Map(),
        cssRead: css.ok,
      });
      await sleep(LAUNCH_GAP_MS);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, books.length) }, (_, slot) => worker(slot))
  );
  // The workers finish out of order; objectId order is what makes a re-run
  // derive the same inventory and report the same numbers.
  out.sort((a, b) => (a.objectId < b.objectId ? -1 : 1));
  return out;
}

/**
 * One alphabet claim per writing system, from the whole corpus, with an evidence
 * row per book that contributed text in this script.
 */
async function fileAlphabet({
  target,
  system,
  clusters,
  corpus,
  occurrences,
  totalOccurrences,
  floor,
  refusals,
  summary,
  repeats,
}) {
  // Fold before the floor, not after: `a` and `A` are one letter, and each has
  // to reach the floor as that letter rather than separately.
  const { counts: entries, variants } = foldClusters(clusters);
  const kept = [...entries.entries()]
    .filter(([, count]) => count >= floor)
    .map(([cluster]) => cluster)
    .sort();
  const below = [...entries.entries()]
    .filter(([, count]) => count < floor)
    .sort((a, b) => b[1] - a[1]);

  if (kept.length === 0) {
    summary["not filed"].push(
      `${system.tag}: no grapheme cluster reached the frequency floor of ${floor}`
    );
    return;
  }

  const characters = kept.join(" ");
  const key = alphabetKey(characters);

  // Which books carried this script, in read order, and what each contributed:
  // the growth curve and the dominance check both need it.
  const witnesses = corpus.filter((book) => book.byScript.has(system.script));
  const growth = inventoryGrowth(
    witnesses.map((book) =>
      new Set(foldClusters(book.byScript.get(system.script)).counts.keys())
    ),
    kept
  );

  const problems = invariantProblems(target, system, kept, witnesses, occurrences);
  for (const problem of problems) invariantFindings.push(`${system.tag}: ${problem}`);

  const language = await client.ensureLanguage(system.tag, system.name);
  if (language.created) counts["language rows created"]++;

  const claim = await client.ensureClaim("alphabet", "characters_key", key, {
    language_id: language.id,
    characters,
    characters_key: key,
    orthography_label: null,
  });
  if (claim.refusedAsTooLong) {
    summary["not filed"].push(
      `${system.tag}: ${kept.length} entries, refused as too long`
    );
    return;
  }
  if (claim.created) counts["alphabet claims created"]++;
  else counts["alphabet claims already there"]++;

  summary["filed under"][system.tag] =
    `alphabet of ${kept.length} entries from ${plural(witnesses.length, "book")}, ` +
    `floor ${floor}: ${characters}`;

  if (options.compareSldr) compareWithSldr(system, kept, entries);

  // --verbose prints the sentence every one of this claim's evidence rows will
  // carry, which is where the folding and the frequencies can be read before a
  // real run writes them.
  const shared = corpusFacts({
    target,
    system,
    corpus: witnesses,
    occurrences,
    totalOccurrences,
    entries,
    variants,
    floor,
    kept,
    below,
    repeats,
    growth,
    refusals,
  });
  client.log(`${system.tag} evidence: ${shared}`);
  const rows = [];
  for (const book of witnesses) {
    const source = await client.ensureSource(book.title, bookPageUrl(book.objectId), SOURCE_TYPE);
    if (
      await client.hasEvidenceFrom("alphabet_evidence", "alphabet_id", claim.id, source.id)
    ) {
      counts["alphabet evidence already cited this book"]++;
      continue;
    }
    rows.push({
      alphabet_id: claim.id,
      source_id: source.id,
      contributor_id: null,
      details: `${bookFacts(book, system)} ${shared}`,
      submitted_via: SUBMITTED_VIA,
      session_id: null,
    });
  }
  for (let at = 0; at < rows.length; at += 500) {
    const result = await client.insertRows("alphabet_evidence", rows.slice(at, at + 500));
    counts["alphabet evidence rows added"] += result.inserted;
  }
}

/**
 * One font_support claim per (writing system, family) the books' own stylesheets
 * name for this language, with an evidence row per book that named it.
 */
async function fileFonts(target, system, corpus, summary) {
  const named = new Map(); // family → books that set it for this language
  for (const book of corpus) {
    const family = book.fontFamilies.get(target.code);
    if (!family) continue;
    // A stylesheet rule is per language code, and a code can be written in more
    // than one script, so the claim goes under the writing system THIS book's
    // own text is in rather than under every target tag for the code.
    if (!book.byScript.has(system.script)) continue;
    if (!named.has(family)) named.set(family, []);
    named.get(family).push(book);
  }
  if (named.size === 0) {
    summary["not filed"].push(
      `${system.tag}: no [lang='${target.code}'] font-family in any book's defaultLangStyles.css`
    );
    return;
  }

  // The denominator the evidence quotes: books whose text is in this script, so
  // "1 of 12" cannot be read as one book out of the whole library.
  const inScript = corpus.filter((book) => book.byScript.has(system.script)).length;

  const language = await client.ensureLanguage(system.tag, system.name);
  if (language.created) counts["language rows created"]++;

  const filed = [];
  for (const [family, books] of named) {
    const font = await client.ensureRow("font", `family_name=ilike.${client.q(family)}`, {
      family_name: family,
    });
    if (font.created) counts["font rows created"]++;

    const claim = await client.ensureRow(
      "font_support",
      `language_id=eq.${language.id}&font_id=eq.${font.id}`,
      {
        language_id: language.id,
        font_id: font.id,
        // Left alone: a stylesheet's font-family names no OpenType feature
        // settings, and writing null here would overwrite stage 5's values,
        // which do come with a source.
      }
    );
    if (claim.created) counts["font_support claims created"]++;
    else counts["font_support claims already there"]++;
    filed.push(`${family} (${plural(books.length, "book")} of ${inScript})`);

    const rows = [];
    for (const book of books) {
      const source = await client.ensureSource(
        book.title,
        bookPageUrl(book.objectId),
        SOURCE_TYPE
      );
      if (
        await client.hasEvidenceFrom(
          "font_support_evidence",
          "font_support_id",
          claim.id,
          source.id
        )
      ) {
        counts["font_support evidence already cited this book"]++;
        continue;
      }
      rows.push({
        font_support_id: claim.id,
        source_id: source.id,
        contributor_id: null,
        details: fontFacts(book, target, system, family, books.length, inScript),
        submitted_via: SUBMITTED_VIA,
        session_id: null,
      });
    }
    for (let at = 0; at < rows.length; at += 500) {
      const result = await client.insertRows(
        "font_support_evidence",
        rows.slice(at, at + 500)
      );
      counts["font_support evidence rows added"] += result.inserted;
    }
  }
  summary["filed under"][`${system.tag} fonts`] = filed.join(", ");
}

/**
 * What the corpus was and how the inventory was derived from it — the same
 * sentence on every book's evidence row for this claim, because the claim came
 * from all of them together.
 *
 * It opens with how many books there were, and how many the library holds,
 * because that is the first thing anybody reading a claim needs and the thing
 * they cannot recover later: a claim from one book and a claim from forty are
 * different claims, and a row that leaves the reader to work out which is which
 * will be read as the stronger one.
 *
 * The level mix and the distinct-original count are here for the same reason:
 * early-literacy books deliberately restrict their alphabet, and much of the
 * library is one shell book translated many times, so "found in 30 books" must
 * not be readable as thirty independent witnesses when it is one book thirty
 * times. Facts only, per supporting-data/CLAUDE.md — the limitations named at
 * the end are properties of the method, not a verdict on the books.
 */
function corpusFacts({
  target,
  system,
  corpus,
  occurrences,
  totalOccurrences,
  entries,
  variants,
  floor,
  kept,
  below,
  repeats,
  growth,
  refusals,
}) {
  const levels = new Map();
  for (const book of corpus) {
    const level = book.level === undefined ? "unstated" : String(book.level);
    levels.set(level, (levels.get(level) ?? 0) + 1);
  }
  const originals = new Set(corpus.map((book) => book.originalTitle ?? book.title));
  const frequencies = kept
    .map((cluster) => `${cluster}=${entries.get(cluster)}`)
    .join(" ");
  const parts = [
    `From ${plural(corpus.length, "book")}`,
    corpus.length === 1
      ? `inventory derived from the text tagged lang="${target.code}" in that book, ` +
        `filed as ${system.tag} because those characters are in ${system.script} script`
      : `inventory derived from the text tagged lang="${target.code}" in those books, ` +
        `filed as ${system.tag} because those characters are in ${system.script} script`,
    catalogueFact(target),
  ];
  if (!system.langtagsKnows) {
    // Said plainly, because a reader comparing this claim with langtags will
    // otherwise assume the pairing is one langtags endorses.
    parts.push(
      `langtags lists no ${system.tag} writing system; the script is the one this ` +
        `text is written in`
    );
  }
  parts.push(
    `computedLevel mix ${[...levels.entries()].map(([level, n]) => `${level}:${n}`).join(" ")}`,
    `${plural(originals.size, "distinct original title")}`,
    `${occurrences} letter occurrences in ${system.script}, ${entries.size} distinct entries after folding`,
    // Says what the number was computed from, because the same claim filed under
    // the old per-script rule would carry a different one.
    `frequency floor ${floor} occurrences, one in 10,000 of the ${totalOccurrences} ` +
      `letter occurrences these books carry under lang="${target.code}" in any ` +
      `script, minimum 2`,
    `${kept.length} at or above the floor, with counts ${frequencies}`,
    growthFact(growth)
  );
  if (refusals.length > 0) {
    // What else was in the text and did not become a claim. On the row, because
    // a reader looking at one script's alphabet cannot otherwise tell whether
    // the books held only that script or whether something was set aside.
    parts.push(
      `other letters in these books, found and not filed: ${refusals.join("; ")}`
    );
  }
  if (repeats.length > 0) {
    parts.push(
      `catalogue entries left out for carrying text identical to a book already ` +
        `read: ${repeats.join(", ")}`
    );
  }
  if (below.length > 0) {
    parts.push(
      `below the floor and left out: ${below
        .map(([cluster, count]) => `${cluster}=${count}`)
        .join(" ")}`
    );
  }
  const foldings = foldingFacts(variants);
  if (foldings.length > 0) parts.push(...foldings);
  parts.push(
    "derived from the books' text; may miss rare letters and include loanword " +
      "characters; multigraphs are unrecoverable this way"
  );
  parts.push(`read at ${readAt.toISOString()}`);
  return parts.join("; ") + ".";
}

/** How much of the language the library holds, next to how much was read. */
function catalogueFact(target) {
  const catalogue = target.catalogue;
  if (!catalogue) return "BloomLibrary book counts for this code were not read";
  const usable = catalogue.afterCopyrightFilter;
  const excluded = catalogue.listed - usable;
  return (
    `BloomLibrary holds ${plural(usable, "harvested, in-circulation book")} for ` +
    `lang="${target.code}" after the copyright filter` +
    (excluded > 0 ? `, with ${plural(excluded, "more")} excluded by it` : "") +
    `, and this run read at most ${bookCap}`
  );
}

/**
 * Where the inventory stopped growing, which is the fact that says whether the
 * book cap is doing anything. Written as a count and a position, not as a
 * judgement about whether more books were needed.
 */
function growthFact(growth) {
  if (growth.coverage.length <= 1) {
    return `the single book carried all ${growth.total} entries`;
  }
  return (
    `of the ${growth.total} entries listed, the first book carried ` +
    `${growth.firstBook} and the last new one appeared in book ` +
    `${growth.lastNewAt} of ${growth.coverage.length} in read order`
  );
}

/** What this particular book contributed, on the evidence row that cites it. */
function bookFacts(book, system) {
  const parts = [
    `This row cites "${book.title}" (${book.objectId})`,
    `${plural(book.blocks, "bloom-editable block")} outside the front and back matter`,
    `${book.text.length} characters of text`,
  ];
  if (book.level !== undefined) parts.push(`computedLevel ${book.level}`);
  if (book.originalTitle) parts.push(`originalTitle "${book.originalTitle}"`);
  if (book.copyright) parts.push(`copyright "${book.copyright}"`);
  if (book.tags.length > 0) parts.push(`tags ${book.tags.join(", ")}`);
  if (book.otherLangs.length > 0) {
    parts.push(`other languages with text in the book: ${book.otherLangs.join(", ")}`);
  }
  parts.push(`read ${book.htmlUrl}`);
  return parts.join("; ") + ".";
}

/**
 * What the book's stylesheet says, and the one further observable fact: whether
 * this language got a different family from the book's other languages. The
 * observation and no more — that differing means chosen and matching means
 * unconsidered is a reading of the author's intent, and it belongs to whoever
 * queries this data rather than to the row.
 */
function fontFacts(book, target, system, namedBy, inScript) {
  const others = [];
  for (const [lang, otherFamily] of book.fontFamilies) {
    if (lang === target.code) continue;
    others.push(`${lang}: ${otherFamily}`);
  }
  const family = book.fontFamilies.get(target.code);
  const parts = [
    `From ${namedBy} of the ${plural(inScript, "book")} read whose text is in ` +
      `${system.script} script`,
    `defaultLangStyles.css in this book's bloomdigital version sets ` +
      `[lang='${target.code}'] font-family: ${family}`,
    `the book's text under that lang is in ${system.script} script, so the claim is filed as ${system.tag}`,
    others.length > 0
      ? `the same file's other languages: ${others.join(", ")}`
      : "the file names no other language",
    `book "${book.title}" (${book.objectId})`,
  ];
  if (book.copyright) parts.push(`copyright "${book.copyright}"`);
  parts.push(`read ${book.cssUrl} at ${readAt.toISOString()}`);
  return parts.join("; ") + ".";
}

/**
 * The two foldings, written out with the raw counts behind them.
 *
 * Whoever reads this row has to be able to see what the text actually held —
 * that the capitals were there and were folded away, and that the apostrophe
 * arrived as two different characters. Both are facts about the books; which
 * of the two apostrophes an author meant is not, and is not stated.
 */
function foldingFacts(variants) {
  const parts = [];
  const cased = [];
  const apostrophes = new Map();
  for (const [folded, raw] of variants) {
    for (const [cluster, count] of raw) {
      if (cluster === folded) continue;
      if (folded === CANONICAL_APOSTROPHE) apostrophes.set(cluster, count);
      else cased.push(`${cluster}→${folded}=${count}`);
    }
  }
  if (cased.length > 0) {
    parts.push(`uppercase forms found and folded into their lowercase entry: ${cased.sort().join(" ")}`);
  }
  if (apostrophes.size > 0 || variants.has(CANONICAL_APOSTROPHE)) {
    const all = variants.get(CANONICAL_APOSTROPHE) ?? new Map();
    const spelt = [...all.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([character, count]) => `${character} (U+${character.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")})=${count}`)
      .join(" ");
    parts.push(
      `apostrophe-shaped characters, counted where a letter came immediately ` +
        `before them and filed as ${CANONICAL_APOSTROPHE} (U+02BC): ${spelt}`
    );
  }
  return parts;
}

/**
 * The cheap checks, run on every claim whether or not `--review` is on.
 *
 * These are the mistakes worth catching automatically because they are
 * mechanical: a digit in an alphabet, a Latin letter inside an Arabic
 * inventory, an entry too long to be one letter. Nothing here goes into the
 * database — a flagged claim is still filed, because the flag is our doubt
 * about our own extraction and not a fact about the source.
 */
/**
 * How the alphabet just filed differs from the SLDR's exemplars for the same
 * writing system, one line per SLDR entry, closest first.
 *
 * This writes nothing and decides nothing. A difference is not a fault on either
 * side: an SLDR entry is one linguist's description of an orthography at one
 * time, and a shelf of books is what people published, so a letter the SLDR
 * lists and the books never use, or a letter the books use and the SLDR never
 * listed, are both ordinary. The reason to measure it is that the books whose
 * answer we can check are the only place a fault in the reading of the books
 * shows up as something other than a plausible-looking alphabet.
 *
 * Our side is compared after folding and after the frequency floor — the entries
 * that would actually be filed. Both sides go through alphabetKey, so the
 * comparison is of letters and not of spacing or order. Occurrence counts ride
 * along on the entries only we have, because that is what separates a letter the
 * books really use from a stray character that cleared the floor.
 */
function compareWithSldr(system, kept, entries) {
  const candidates = sldrAlphabets.get(system.tag);
  if (!candidates) return;

  const ours = new Set(alphabetKey(kept.join(" ")).split(" ").filter(Boolean));
  const lines = [];
  for (const candidate of candidates) {
    const shared = [...ours].filter((entry) => candidate.entries.has(entry));
    const sldrOnly = [...candidate.entries].filter((entry) => !ours.has(entry)).sort();
    const oursOnly = [...ours]
      .filter((entry) => !candidate.entries.has(entry))
      .sort((a, b) => (entries.get(b) ?? 0) - (entries.get(a) ?? 0));
    lines.push({
      distance: sldrOnly.length + oursOnly.length,
      text:
        `${system.tag} vs SLDR ${candidate.sldrTag}: ` +
        `${shared.length} of the SLDR's ${candidate.entries.size} entries also came out of the books` +
        (sldrOnly.length > 0
          ? `; in the SLDR, absent from the books: ${sldrOnly.join(" ")}`
          : "; nothing the SLDR lists is missing from the books") +
        (oursOnly.length > 0
          ? `; in the books, absent from the SLDR: ${oursOnly
              .map((entry) => `${entry} (${entries.get(entry) ?? 0})`)
              .join(" ")}`
          : "; the books added nothing the SLDR does not list"),
    });
  }
  lines.sort((a, b) => a.distance - b.distance);
  for (const line of lines) sldrComparisons.push(line.text);
}

function invariantProblems(target, system, kept, witnesses, occurrences) {
  const problems = [];

  const digits = kept.filter((entry) => /\p{Nd}/u.test(entry));
  if (digits.length > 0) {
    problems.push(`inventory contains digits: ${digits.join(" ")}`);
  }

  const runaway = kept.filter((entry) => [...entry].length > MAX_CLUSTER_LENGTH);
  if (runaway.length > 0) {
    problems.push(
      `${runaway.length} entries longer than ${MAX_CLUSTER_LENGTH} codepoints: ${runaway.join(" ")}`
    );
  }

  // A partition is supposed to hold one script's characters only; anything else
  // means the partitioning or the apostrophe rule let something through.
  const foreign = kept.filter((entry) => {
    const base = [...entry][0];
    // Three kinds of entry are filed under a neighbouring letter's script on
    // purpose: the apostrophe, the letters Unicode gives no script of their own,
    // and a combining mark, whose Script property is `Inherited` precisely
    // because the answer is "ask the letter I am written on".
    if (base === CANONICAL_APOSTROPHE) return false;
    if (isScriptNeutralLetter(base)) return false;
    if (/\p{M}/u.test(base)) return false;
    return scriptOfEntry(base) !== system.script;
  });
  if (foreign.length > 0) {
    problems.push(
      `${foreign.length} entries are not ${system.script}: ${foreign.join(" ")}`
    );
  }

  if (witnesses.length > 2) {
    for (const book of witnesses) {
      const own = [...(book.byScript.get(system.script)?.values() ?? [])].reduce(
        (a, b) => a + b,
        0
      );
      const share = occurrences === 0 ? 0 : own / occurrences;
      if (share > DOMINANT_BOOK_SHARE) {
        problems.push(
          `"${book.title}" (${book.objectId}) is ${(share * 100).toFixed(0)}% of the ` +
            `${system.script} letter occurrences across ${witnesses.length} books`
        );
      }
    }
  }

  return problems;
}

/**
 * The script of one character, asked of the same partitioner the run used, so
 * the invariant cannot disagree with the filing for a reason of its own.
 */
function scriptOfEntry(character) {
  const [script] = [...letterClustersByScript(character).keys()];
  return script;
}

/**
 * One book's contribution, for a person or a model to read through: what we
 * derived, and a short excerpt of what we derived it from.
 *
 * The excerpt is the point and also the only thing here that is somebody else's
 * writing. It is capped, it is never written to the database, and the report it
 * lands in is kept out of git — see reviewReportPath. It earns its place by
 * being the only way to see the failure the derived facts hide: front matter or
 * an English gloss extracted under a vernacular lang looks like a perfectly
 * ordinary Latin inventory.
 */
function reviewEntry(target, book) {
  const scripts = {};
  for (const [script, clusters] of book.byScript) {
    const folded = [...foldClusters(clusters).counts.entries()].sort(
      (a, b) => b[1] - a[1]
    );
    scripts[script] = {
      occurrences: folded.reduce((n, [, count]) => n + count, 0),
      entries: folded.map(([entry, count]) => `${entry}=${count}`).join(" "),
    };
  }
  return {
    code: target.code,
    objectId: book.objectId,
    title: book.title,
    originalTitle: book.originalTitle,
    bookPage: bookPageUrl(book.objectId),
    copyright: book.copyright,
    computedLevel: book.level,
    tags: book.tags,
    blocks: book.blocks,
    characters: book.text.length,
    otherLangs: book.otherLangs,
    fontFamilyForThisLang: book.fontFamilies.get(target.code),
    fontFamiliesByLang: Object.fromEntries(book.fontFamilies),
    stylesheetRead: book.cssRead,
    scripts,
    excerpt: book.text.replace(/\s+/g, " ").trim().slice(0, REVIEW_EXCERPT_CHARS),
  };
}

/**
 * Where the review report goes: inside the project, so it is next to the tool
 * that wrote it while somebody is debugging, and gitignored, because it is the
 * one file here that holds other people's book text.
 */
function reviewReportPath() {
  if (options.reviewOut) return options.reviewOut;
  const stamp = readAt.toISOString().replace(/[:.]/g, "-");
  return join(
    dirname(dirname(fileURLToPath(import.meta.url))),
    "review",
    `bloom-books-${stamp}.json`
  );
}

function writeReviewReport() {
  const path = reviewReportPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    JSON.stringify(
      {
        tool: "importBloomBooks.mjs",
        readAt: readAt.toISOString(),
        dryRun: Boolean(options.dryRun),
        prefix: options.prefix,
        bookCap,
        excerptChars: REVIEW_EXCERPT_CHARS,
        counts,
        invariantFindings,
        books: reviewBooks,
      },
      null,
      2
    ),
    "utf8"
  );
  console.log(
    `\n  review report: ${reviewBooks.length} book(s) → ${path}` +
      `\n  (holds up to ${REVIEW_EXCERPT_CHARS} characters of each book's text; not for git)`
  );
}

/** "1 book", "3 books" — the evidence rows are read by people. */
function plural(n, noun, many = `${noun}s`) {
  return `${n} ${n === 1 ? noun : many}`;
}
