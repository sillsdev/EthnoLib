// Stage 4 of supporting-data/docs/population-plan.md, planned in
// supporting-data/docs/bloom-walker-plan.md: alphabet and font_support claims
// from the text and stylesheets of published BloomLibrary books.
//
//   node supporting-data/tools/importBloomBooks.mjs --dry-run
//   node supporting-data/tools/importBloomBooks.mjs --dry-run --only acr --verbose
//   node supporting-data/tools/importBloomBooks.mjs --only acr-Latn
//
// Scope. TARGET_SYSTEMS below is the list of writing systems this walks, and it
// is nine of them, not the library. The plan's algorithm for choosing which
// languages to walk (merge the language table, resolve scripts, sort by what is
// missing) is not implemented; widening the run means replacing that list. Under
// approved-sources.md nothing filed here reaches a user either way: a book is
// not an approved source, so these claims gather and wait.
//
// What it files, and what it does not. Fonts and alphabets. Sample text is the
// third thing the plan describes and it is NOT built — much of the library is
// scripture-adjacent, and that harvest carries a content risk the other two do
// not.
//
// What an alphabet entry is. Lower case, and one apostrophe. The sources these
// claims sit beside list the lower case only, and write the orthographic
// apostrophe as U+02BC, so an inventory that carries A and a separately, or ' and
// U+2019 separately, cannot accumulate support alongside an SLDR claim for the
// same alphabet. Both foldings are written out in the evidence with the raw
// counts behind them. See lib/bloom.mjs for where the apostrophe stops being
// punctuation.
//
// The script problem, which is why the target list names writing systems.
// Bloom's language rows carry no script: `isoCode` is a bare `ace`, and langtags
// would supply Latin by default, which is simply wrong for a language Bloom also
// publishes in Arabic. So the script comes from the text — characters are
// partitioned by Unicode script property and each partition is filed under
// whichever target tag names that script. Text in a script no target names is
// counted and reported, and nothing is filed for it.
//
// The lang attribute is the whole game. The catalogue returns books where the
// target language is ANY of the book's languages, so `bloom-editable` divs whose
// lang exactly equals the code are the only text that counts, and front and back
// matter come out first because their credits and licence blocks carry the
// vernacular lang while holding English words.
//
// Nothing sets rank. Re-runnable: an alphabet claim dedupes by its inventory and
// a font claim by (writing system, font), and evidence is skipped when the claim
// already cites the same book. Books are read in objectId order under a fixed
// cap, so a second run over unchanged books derives the same inventory and
// writes nothing.
//
// It is somebody's public library. Three requests in flight at most, a pause
// between launches, one retry on a 5xx or a network failure.

import {
  bookCounts,
  bookPageUrl,
  CANONICAL_APOSTROPHE,
  computedLevel,
  digitalHtmlUrl,
  editableLangs,
  fetchText,
  foldClusters,
  fontFamiliesByLang,
  frequencyFloor,
  harvesterBase,
  hasProblemTag,
  langStylesUrl,
  languageRows,
  letterClustersByScript,
  listBooks,
  sleep,
  textForLanguage,
} from "./lib/bloom.mjs";
import {
  loadLangtags,
  resolveWritingSystem,
  tagIndex,
} from "./lib/langtags.mjs";
import {
  alphabetKey,
  createClient,
  keyTooBigForIndex,
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
 * The writing systems this run covers, chosen by hand. Nine tags across eight
 * languages; `ace` appears twice because Acehnese is written in both Latin and
 * Arabic script and which of the two a book's text is in is a question only the
 * text can answer.
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

/** Books read per language. A ceiling, not a target; the plan's number. */
const DEFAULT_BOOK_CAP = 40;

/** At most this many book fetches in flight, and this long between launches. */
const CONCURRENCY = 3;
const LAUNCH_GAP_MS = 150;

const options = parseArgs();
const client = createClient(options);
const bookCap = options.limit ?? DEFAULT_BOOK_CAP;
const readAt = new Date();

const index = tagIndex(loadLangtags(options.langtags));

// One entry per bare language code, holding the target tags asked for it. The
// book catalogue is keyed by bare code; the claims are not.
const targets = new Map();
for (const tag of TARGET_SYSTEMS) {
  const resolved = resolveWritingSystem(tag, index);
  const [code] = tag.split("-");
  const script = tag.split("-")[1];
  if (
    options.only &&
    !options.only.has(tag.toLowerCase()) &&
    !options.only.has(code.toLowerCase())
  ) {
    continue;
  }
  if (!targets.has(code)) targets.set(code, { code, byScript: new Map() });
  targets.get(code).byScript.set(script, {
    tag,
    script,
    name: resolved?.name,
  });
}

const run = runDescriptor({
  tool: "importBloomBooks.mjs",
  source: "BloomLibrary.org",
  // A live read of the catalogue and of the harvester's book files, so the
  // moment we read is the only date the input has.
  sourceGeneratedAt: readAt.toISOString(),
  notes:
    `Walked ${targets.size} BloomLibrary language code(s) covering ` +
    `${[...targets.values()].reduce((n, t) => n + t.byScript.size, 0)} writing ` +
    `system(s), at most ${bookCap} books each, and filed alphabet and ` +
    `font_support claims from the text and defaultLangStyles.css of the ` +
    `harvester's bloomdigital version of each book. Nine writing systems by ` +
    `hand, not the library; no sample text is harvested by this tool.`,
});
await client.recordRun("started", run);

const counts = {
  "writing systems targeted": [...targets.values()].reduce(
    (total, target) => total + target.byScript.size,
    0
  ),
  "language codes walked": targets.size,
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
  "letter occurrences in a script no target names": 0,
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
};

/** Per language code, what the run saw. Printed, and recorded with the run. */
const perCode = {};
/** Books whose harvester files did not come back: id plus what went wrong. */
const unreadable = [];
/** Scripts found in the text that no target tag names. */
const unclaimedScripts = [];
/** Catalogue entries dropped for carrying text a book already read carried. */
const duplicateEntries = [];

const bloomLanguages = await languageRows([...targets.keys()]);

for (const target of targets.values()) {
  const summary = {
    "target writing systems": [...target.byScript.values()].map((s) => s.tag),
    "BloomLibrary language row": undefined,
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
  perCode[target.code] = summary;

  const bloomLanguage = bloomLanguages.get(target.code);
  if (!bloomLanguage) {
    // No row in Bloom's language table at all, which is a different fact from
    // "a language with no usable books" and is reported as itself.
    counts["codes with no BloomLibrary language row"]++;
    summary["BloomLibrary language row"] = "none";
    summary["not filed"].push("BloomLibrary has no language row for this code");
    client.log(`${target.code}: no BloomLibrary language row`);
    continue;
  }
  summary["BloomLibrary language row"] =
    `${bloomLanguage.name ?? "(unnamed)"}, usageCount ${bloomLanguage.usageCount}` +
    (bloomLanguage.rows > 1 ? ` across ${bloomLanguage.rows} merged rows` : "");

  const catalogue = await bookCounts(target.code);
  const excluded = catalogue.listed - catalogue.afterCopyrightFilter;
  summary["books listed"] = catalogue.listed;
  summary["books excluded by the copyright filter"] = excluded;
  counts["books listed"] += catalogue.listed;
  counts["books excluded by the copyright filter"] += excluded;

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
      `${read.length} book(s) read, none carrying text under lang="${target.code}"`
    );
    continue;
  }

  const byScript = letterClustersByScript(corpus.map((book) => book.text).join("\n"));
  for (const [script, clusters] of byScript) {
    const occurrences = [...clusters.values()].reduce((a, b) => a + b, 0);
    summary["letter occurrences by script"][script] = occurrences;
    counts["letter occurrences harvested"] += occurrences;
    if (!target.byScript.has(script)) {
      // Interesting news rather than an error: this language's books carry text
      // in a script no target tag names, so there is no writing system to file
      // it against. Counted and listed, never folded into another tag.
      counts["letter occurrences in a script no target names"] += occurrences;
      unclaimedScripts.push(`${target.code}: ${occurrences} in ${script}`);
      summary["not filed"].push(
        `${occurrences} letter occurrences in ${script}, which no target tag names`
      );
      continue;
    }
    const system = target.byScript.get(script);
    await fileAlphabet(target, system, clusters, corpus, occurrences, summary, repeats);
    await fileFonts(target, system, corpus, summary);
  }

  for (const system of target.byScript.values()) {
    if (!byScript.has(system.script)) {
      summary["not filed"].push(
        `${system.tag}: no ${system.script}-script text in the books read`
      );
    }
  }
}

counts["books whose files could not be read"] = unreadable.length;

const recorded = { ...counts, "per language code": perCode };
await client.recordRun("finished", { ...run, counts: recorded });

report("Stage 4 — BloomLibrary books", counts, client);
console.log(`  read BloomLibrary at ${readAt.toISOString()}, at most ${bookCap} books per language`);
console.log(`  (${client.stats.reads} reads, ${client.stats.writes} writes)`);
console.log("\nPer language code:");
for (const [code, summary] of Object.entries(perCode)) {
  console.log(`  ${code}  ${summary["target writing systems"].join(" ")}`);
  console.log(`    BloomLibrary language row: ${summary["BloomLibrary language row"]}`);
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
  console.log(`  text in a script no target names: ${unclaimedScripts.join("; ")}`);
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
async function fileAlphabet(target, system, clusters, corpus, occurrences, summary, repeats) {
  // Fold before the floor, not after: `a` and `A` are one letter, and each has
  // to reach the floor as that letter rather than separately.
  const { counts: entries, variants } = foldClusters(clusters);
  const floor = frequencyFloor(occurrences);
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
  if (keyTooBigForIndex(key)) {
    summary["not filed"].push(
      `${system.tag}: ${kept.length} entries, too big for the identity index`
    );
    return;
  }

  const language = await client.ensureLanguage(system.tag, system.name);
  if (language.created) counts["language rows created"]++;

  const claim = await client.ensureClaim("alphabet", "characters_key", key, {
    language_id: language.id,
    characters,
    characters_key: key,
    orthography_label: null,
  });
  if (claim.tooBigToIndex) {
    summary["not filed"].push(`${system.tag}: refused by the identity index`);
    return;
  }
  if (claim.created) counts["alphabet claims created"]++;
  else counts["alphabet claims already there"]++;

  summary["filed under"][system.tag] =
    `alphabet of ${kept.length} entries from ${corpus.length} book(s), ` +
    `floor ${floor}: ${characters}`;

  // --verbose prints the sentence every one of this claim's evidence rows will
  // carry, which is where the folding and the frequencies can be read before a
  // real run writes them.
  const shared = corpusFacts(
    target,
    system,
    corpus,
    occurrences,
    entries,
    variants,
    floor,
    kept,
    below,
    repeats
  );
  client.log(`${system.tag} evidence: ${shared}`);
  const rows = [];
  for (const book of corpus) {
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
    if (!letterClustersByScript(book.text).has(system.script)) continue;
    if (!named.has(family)) named.set(family, []);
    named.get(family).push(book);
  }
  if (named.size === 0) {
    summary["not filed"].push(
      `${system.tag}: no [lang='${target.code}'] font-family in any book's defaultLangStyles.css`
    );
    return;
  }

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
    filed.push(`${family} (${books.length} book(s))`);

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
        details: fontFacts(book, target, system, family),
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
 * The level mix and the distinct-original count are here because neither is
 * recoverable later: early-literacy books deliberately restrict their alphabet,
 * and much of the library is one shell book translated many times, so "found in
 * 30 books" must not be readable as thirty independent witnesses when it is one
 * book thirty times. Facts only, per supporting-data/CLAUDE.md — the limitations
 * named at the end are properties of the method, not a verdict on the books.
 */
function corpusFacts(
  target,
  system,
  corpus,
  occurrences,
  entries,
  variants,
  floor,
  kept,
  below,
  repeats
) {
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
    `Inventory derived from the text ${corpus.length} book(s) carry under ` +
      `lang="${target.code}", filed as ${system.tag} because those characters are ` +
      `in ${system.script} script`,
    `computedLevel mix ${[...levels.entries()].map(([level, n]) => `${level}:${n}`).join(" ")}`,
    `${originals.size} distinct original title(s)`,
    `${occurrences} letter occurrences in ${system.script}, ${entries.size} distinct entries after folding`,
    `frequency floor ${floor} occurrences (one in 10,000, minimum 2)`,
    `${kept.length} at or above the floor, with counts ${frequencies}`,
  ];
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

/** What this particular book contributed, on the evidence row that cites it. */
function bookFacts(book, system) {
  const parts = [
    `This row cites "${book.title}" (${book.objectId})`,
    `${book.blocks} bloom-editable block(s) outside the front and back matter`,
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
function fontFacts(book, target, system, family) {
  const others = [];
  for (const [lang, otherFamily] of book.fontFamilies) {
    if (lang === target.code) continue;
    others.push(`${lang}: ${otherFamily}`);
  }
  const parts = [
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
