// The three sets the "Overlap" tab draws, and the one place their definitions
// are written down.
//
// The question is where an alphabet for each writing system in SIL's langtags
// could come from:
//
//   - langtags   — the denominator, every writing system that names a real
//                  script. Same denominator the coverage page uses, computed
//                  the same way, so the two tabs cannot drift.
//   - SLDR       — we already have an alphabet claim whose evidence cites the
//                  SIL Locale Data Repository. The only one of the three that
//                  is an answer rather than a place to look for one.
//   - Bloom      — BloomLibrary.org has published books in this writing system,
//                  so tools/importBloomBooks.mjs could be pointed at it.
//   - eBible     — eBible.org lists a translation in it, which is another
//                  published corpus in the language.
//
// The last two say a corpus exists, not that a good alphabet would come out of
// one, and neither is an approved source (docs/approved-sources.md), so nothing
// harvested from either reaches a user as things stand.
//
// Neither catalogue is asked for anything but its index. Bloom's language table
// and eBible's translations.csv are both metadata; no book file and no scripture
// text is fetched here or counted here.
//
// Placing a code under a script. Bloom's language table carries none — `isoCode`
// is a bare `ace` — so a code is placed by langtags' default script for that
// language, the same resolveWritingSystem step docs/bloom-walker-plan.md uses to
// choose languages. eBible names a script per translation and usually names a
// real one, so it is believed where it can be mapped and falls back to the same
// langtags default where it cannot. Either way this is "there is a corpus to
// read", not "these exact tags will be filed": the Bloom walker settles the
// script from the text of the books and can file under a tag this page did not
// predict.
//
// Reads only: the database through coverage.mjs's GET-only helper, the two
// catalogues over public HTTP, langtags off disk.

import { getAllRows } from "./coverage.mjs";
import { ebibleWritingSystems } from "./ebible.mjs";
import { parseQuery } from "../tools/lib/bloom.mjs";
import {
  loadLangtags,
  NON_SCRIPTS,
  resolveWritingSystem,
  tagIndex,
} from "../tools/lib/langtags.mjs";

/**
 * The title tools/importSldrAlphabets.mjs files its sources under (one source
 * row per SLDR file, all sharing this title). Keep the two in step; a rename
 * there with no rename here shows up as the SLDR set collapsing to zero, which
 * is why gatherVenn throws rather than reporting it.
 */
const SLDR_SOURCE_TITLE = "SIL Locale Data Repository (SLDR)";

/** Parse's page size, and so ours. */
const PARSE_PAGE = 1000;

/** The script subtag of a `language` row's tag, title-cased. */
function scriptOf(bcp47) {
  const subtag = bcp47.split("-")[1] ?? "";
  return subtag.length === 4
    ? subtag[0].toUpperCase() + subtag.slice(1).toLowerCase()
    : "";
}

/**
 * Every row of Bloom's language table, merged by isoCode with usageCount
 * summed. The table holds more than one row for the same code — `ru` appears
 * with 571 books and with 437 — so not merging would understate a language's
 * corpus and split it across two entries.
 */
async function bloomLanguageCodes() {
  const rows = [];
  for (let skip = 0; ; skip += PARSE_PAGE) {
    const answer = await parseQuery("language", {
      keys: "isoCode,name,usageCount",
      limit: PARSE_PAGE,
      skip,
      order: "isoCode",
    });
    const page = answer.results ?? [];
    rows.push(...page);
    if (page.length < PARSE_PAGE) break;
  }

  const merged = new Map();
  for (const row of rows) {
    const code = String(row.isoCode ?? "").trim();
    if (!code) continue;
    const seen = merged.get(code);
    if (seen) seen.books += row.usageCount ?? 0;
    else merged.set(code, { isoCode: code, books: row.usageCount ?? 0 });
  }
  return { rows: rows.length, codes: merged };
}

/**
 * Which macrolanguage a language code belongs to, straight off langtags'
 * `macrolang` field. Southern Pashto (`pbt`) belongs to Pashto (`ps`), Dari
 * (`prs`) to Persian (`fa`).
 */
function macrolanguageByCode(entries) {
  const macro = new Map();
  for (const entry of entries) {
    if (typeof entry.macrolang !== "string" || !entry.macrolang) continue;
    const code = typeof entry.tag === "string" ? entry.tag.split("-")[0] : "";
    if (code && code !== entry.macrolang) macro.set(code, entry.macrolang);
  }
  return macro;
}

export async function gatherVenn() {
  const entries = loadLangtags();
  const index = tagIndex(entries);
  const macrolangOf = macrolanguageByCode(entries);
  const defaultScriptFor = (code) => resolveWritingSystem(code, index)?.script;

  const [languages, alphabets, bloom, ebible] = await Promise.all([
    getAllRows("language", "id,bcp47,name"),
    getAllRows("alphabet", "language_id,alphabet_evidence(source(title))"),
    bloomLanguageCodes(),
    ebibleWritingSystems(defaultScriptFor),
  ]);

  // The denominator, and the tag -> row lookup everything else joins through.
  const eligible = new Map();
  let nonScript = 0;
  const idByTag = new Map();
  for (const language of languages) {
    if (NON_SCRIPTS.has(scriptOf(language.bcp47))) {
      nonScript++;
      continue;
    }
    eligible.set(language.id, language);
    idByTag.set(language.bcp47, language.id);
  }

  const sldrIds = new Set();
  for (const claim of alphabets) {
    if (!eligible.has(claim.language_id)) continue;
    const fromSldr = (claim.alphabet_evidence ?? []).some(
      (evidence) => evidence.source?.title === SLDR_SOURCE_TITLE
    );
    if (fromSldr) sldrIds.add(claim.language_id);
  }
  if (!sldrIds.size)
    throw new Error(
      `no alphabet evidence cites "${SLDR_SOURCE_TITLE}" — has the importer's ` +
        `source title changed?`
    );

  // Bloom codes -> writing systems, by langtags' default script for the code.
  const booksByTag = new Map();
  const bloomCatalogue = {
    rows: bloom.rows,
    codes: bloom.codes.size,
    codesWithBooks: 0,
    /** qaa private-use codes, mostly: no writing system to file against. */
    unresolved: 0,
    /** Sign languages and the like: pgz-Zxxx has 281 books and no alphabet. */
    nonScript: 0,
    /** Resolved to a tag our language table has no row for. */
    notInLanguageTable: 0,
  };
  for (const row of bloom.codes.values()) {
    if (!(row.books > 0)) continue;
    bloomCatalogue.codesWithBooks++;
    const system = resolveWritingSystem(row.isoCode, index);
    if (!system) {
      bloomCatalogue.unresolved++;
      continue;
    }
    if (NON_SCRIPTS.has(system.script)) {
      bloomCatalogue.nonScript++;
      continue;
    }
    booksByTag.set(system.tag, (booksByTag.get(system.tag) ?? 0) + row.books);
  }

  const booksById = new Map();
  for (const [tag, books] of booksByTag) {
    const id = idByTag.get(tag);
    if (id === undefined) bloomCatalogue.notInLanguageTable++;
    else booksById.set(id, books);
  }

  const ebibleCatalogue = { ...ebible.counts, notInLanguageTable: 0 };
  const ebibleById = new Map();
  for (const [tag, entry] of ebible.systems) {
    const id = idByTag.get(tag);
    if (id === undefined) ebibleCatalogue.notInLanguageTable++;
    else ebibleById.set(id, entry);
  }

  // One entry per writing system in the denominator, carrying which sets it is
  // in. The tab needs the whole list because every region is browsable,
  // including the large one no source reaches.
  const systems = [];
  const regions = {
    sldrOnly: 0,
    bloomOnly: 0,
    ebibleOnly: 0,
    sldrBloom: 0,
    sldrEbible: 0,
    bloomEbible: 0,
    all: 0,
    none: 0,
  };
  let bloomBooks = 0;
  let ebibleTranslations = 0;
  let ebibleRedistributable = 0;
  /** No SLDR alphabet, but at least one published corpus to read. */
  let corpusOnly = 0;
  for (const language of eligible.values()) {
    const sldr = sldrIds.has(language.id);
    const books = booksById.get(language.id) ?? 0;
    const ebibleEntry = ebibleById.get(language.id);
    const translations = ebibleEntry?.translations ?? 0;
    bloomBooks += books;
    ebibleTranslations += translations;
    ebibleRedistributable += ebibleEntry?.redistributable ?? 0;

    if (sldr && books && translations) regions.all++;
    else if (sldr && books) regions.sldrBloom++;
    else if (sldr && translations) regions.sldrEbible++;
    else if (books && translations) regions.bloomEbible++;
    else if (sldr) regions.sldrOnly++;
    else if (books) regions.bloomOnly++;
    else if (translations) regions.ebibleOnly++;
    else regions.none++;
    if (!sldr && (books || translations)) corpusOnly++;

    systems.push({
      tag: language.bcp47,
      name: language.name,
      script: scriptOf(language.bcp47),
      sldr,
      books,
      translations,
    });
  }
  systems.sort(
    (a, b) =>
      b.books - a.books ||
      b.translations - a.translations ||
      a.tag.localeCompare(b.tag)
  );

  // The three sources do not always file a language under the same code, and
  // the commonest way they disagree is checkable: SLDR writes an alphabet for a
  // macrolanguage where Bloom and eBible publish under one of its members. So
  // count how often "no SLDR alphabet" means "no SLDR alphabet under THIS code",
  // and how much of a corpus sits behind that difference. Counted, not merged:
  // whether one alphabet covers both codes is a question about the languages,
  // not about the tags, and nothing here is placed to answer it.
  const viaMacrolanguage = {
    writingSystems: 0,
    withCorpus: 0,
    /** The biggest few by corpus, so the page can name real cases. */
    examples: [],
  };
  for (const system of systems) {
    if (system.sldr) continue;
    const macrolang = macrolangOf.get(system.tag.split("-")[0]);
    if (!macrolang) continue;
    const macroId = idByTag.get(`${macrolang}-${system.script}`);
    if (macroId === undefined || !sldrIds.has(macroId)) continue;
    viaMacrolanguage.writingSystems++;
    if (!system.books && !system.translations) continue;
    viaMacrolanguage.withCorpus++;
    viaMacrolanguage.examples.push({
      tag: system.tag,
      name: system.name,
      books: system.books,
      translations: system.translations,
      macrolanguageTag: `${macrolang}-${system.script}`,
    });
  }
  // systems is already sorted by corpus size, so the first few are the biggest.
  viaMacrolanguage.examples = viaMacrolanguage.examples.slice(0, 4);

  // Each pair's whole intersection, the three-way part included: what the
  // diagram's pairwise geometry is drawn from.
  const pairs = {
    sldrBloom: regions.sldrBloom + regions.all,
    sldrEbible: regions.sldrEbible + regions.all,
    bloomEbible: regions.bloomEbible + regions.all,
  };

  return {
    denominator: {
      writingSystems: eligible.size,
      nonScript,
      total: languages.length,
    },
    sets: {
      sldr: { covered: sldrIds.size },
      bloom: {
        covered: booksById.size,
        books: bloomBooks,
        catalogue: bloomCatalogue,
      },
      ebible: {
        covered: ebibleById.size,
        translations: ebibleTranslations,
        redistributable: ebibleRedistributable,
        catalogue: ebibleCatalogue,
      },
    },
    regions,
    pairs,
    corpusOnly,
    viaMacrolanguage,
    systems,
  };
}
