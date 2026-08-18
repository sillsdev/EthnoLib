// BloomLibrary reads for stage 4: the two public endpoints, the harvester URL
// derivation, and the per-language text extraction that the whole stage stands
// on. Kept apart from the importer because this is the part most likely to be
// wrong and the part worth reading on its own.
//
// Nothing here writes anything or forms an opinion. It returns what BloomLibrary
// said: which books exist, what text each carries under which lang attribute,
// and what font family the book's own stylesheet names for a language.

/**
 * The app id bloomlibrary.org ships to every browser; the Parse REST API needs
 * no other credential and no auth.
 */
export const PARSE_APP_ID = "R6qNTeumQXjJCMutAJYAwPtip1qBulkFyLefkCE5";
export const PARSE_BASE = "https://server.bloomlibrary.org/parse/classes";

/** A book's page for a person to read, and the URL its source row is keyed by. */
export const bookPageUrl = (objectId) => `https://bloomlibrary.org/book/${objectId}`;

const REQUEST_TIMEOUT_MS = 60_000;

/**
 * Keep "Bible" out of the corpus without `$not`, which this Parse server does
 * not implement — `{"$not": {"$regex": ...}}` comes back
 * `400 bad constraint: $not`. A negative lookahead does the same work inside a
 * single `$regex`, server-side, and `s` makes `.` cross the newlines a
 * multi-line copyright notice contains.
 *
 * `$or`'d with a missing field so a book that carries no copyright at all is
 * kept rather than dropped: a regex constraint matches no row where the field is
 * absent, which would have excluded such books silently. (No harvested book
 * lacks the field today; this costs one term and removes the trap.)
 */
export const NOT_BIBLE = [
  { copyright: { $regex: "^((?!Bible).)*$", $options: "is" } },
  { copyright: { $exists: false } },
];

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * One Parse query. Objects are JSON-encoded into the query string, which is what
 * the REST API expects for `where`, and one retry covers a 5xx or a dropped
 * connection.
 */
export async function parseQuery(className, params) {
  const url = new URL(`${PARSE_BASE}/${className}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(
      key,
      typeof value === "string" ? value : JSON.stringify(value)
    );
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await sleep(1000);
    try {
      const response = await fetch(url, {
        headers: { "X-Parse-Application-Id": PARSE_APP_ID },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.ok) return await response.json();
      if (response.status >= 500 && attempt === 0) continue;
      throw new Error(
        `Parse ${className} ${response.status}: ${(await response.text()).slice(0, 300)}`
      );
    } catch (error) {
      if (attempt === 0) continue;
      throw error;
    }
  }
  throw new Error(`Parse ${className}: unreachable`);
}

/** The `where` clause selecting a language's harvested, in-circulation books. */
export const booksInLanguage = (isoCode) => ({
  langPointers: {
    $inQuery: { where: { isoCode }, className: "language" },
  },
  // The bloomdigital version exists only for books the harvester finished.
  harvestState: "Done",
  inCirculation: { $ne: false },
  $or: NOT_BIBLE,
});

/**
 * Bloom's language rows for these codes, merged by isoCode with usageCount
 * summed. The table holds more than one row for the same code, so not merging
 * would split a language's books across two entries and understate both counts.
 */
export async function languageRows(isoCodes) {
  const answer = await parseQuery("language", {
    where: { isoCode: { $in: isoCodes } },
    keys: "isoCode,name,usageCount",
    limit: 1000,
  });
  const merged = new Map();
  for (const row of answer.results ?? []) {
    const code = String(row.isoCode ?? "").trim();
    if (!code) continue;
    const seen = merged.get(code);
    if (seen) {
      seen.usageCount += row.usageCount ?? 0;
      seen.rows++;
    } else {
      merged.set(code, {
        isoCode: code,
        name: typeof row.name === "string" ? row.name : undefined,
        usageCount: row.usageCount ?? 0,
        rows: 1,
      });
    }
  }
  return merged;
}

/** How many books the language has before and after the copyright filter. */
export async function bookCounts(isoCode) {
  const inLanguage = {
    langPointers: {
      $inQuery: { where: { isoCode }, className: "language" },
    },
    harvestState: "Done",
    inCirculation: { $ne: false },
  };
  const all = await parseQuery("books", {
    where: inLanguage,
    keys: "objectId",
    limit: 0,
    count: 1,
  });
  const kept = await parseQuery("books", {
    where: { ...inLanguage, $or: NOT_BIBLE },
    keys: "objectId",
    limit: 0,
    count: 1,
  });
  return { listed: all.count ?? 0, afterCopyrightFilter: kept.count ?? 0 };
}

/**
 * Up to `cap` of a language's books, ordered by objectId so a re-run reads the
 * same books in the same order and derives the same inventory.
 */
export async function listBooks(isoCode, cap) {
  const answer = await parseQuery("books", {
    where: booksInLanguage(isoCode),
    keys: "title,copyright,baseUrl,tags,features,originalTitle,updatedAt,objectId",
    order: "objectId",
    limit: cap,
  });
  return answer.results ?? [];
}

/** Bloom's own marker that something is wrong with the book. */
export const hasProblemTag = (tags) =>
  (tags ?? []).some((tag) => String(tag).startsWith("system:problem-"));

/** `computedLevel:3` → 3, when the book carries one. */
export function computedLevel(tags) {
  for (const tag of tags ?? []) {
    const match = /^computedLevel:(\d+)$/.exec(String(tag));
    if (match) return Number(match[1]);
  }
  return undefined;
}

/**
 * The harvester's normalised copy of a book, derived from its upload URL.
 *
 *   https://s3.amazonaws.com/BloomLibraryBooks/<uploader>%2f<guid>%2f<bookname>%2f
 *   → https://s3.amazonaws.com/bloomharvest/<uploader>%2f<guid>/
 *
 * Copied from blorg's getHarvesterBaseUrlFromBaseUrl
 * (d:/blorg/src/model/BookUrlUtils.ts) — keep them in step. Guessing
 * `<bookname>.htm` under the raw upload instead 404s for every book whose folder
 * name differs from its file name; the harvester path has no such dependence.
 */
export function harvesterBase(baseUrl) {
  if (typeof baseUrl !== "string" || !baseUrl) return undefined;
  let trimmed = baseUrl.endsWith("%2f") ? baseUrl.slice(0, -3) : baseUrl;
  const at = trimmed.lastIndexOf("%2f");
  if (at < 0) return undefined;
  return trimmed.slice(0, at).replace("BloomLibraryBooks", "bloomharvest") + "/";
}

export const digitalHtmlUrl = (base) => `${base}bloomdigital%2findex.htm`;
export const langStylesUrl = (base) => `${base}bloomdigital%2fdefaultLangStyles.css`;

/**
 * One GET, with a single retry, returning undefined for a 404 — a book the
 * harvester has not produced this file for is a fact to count, not a failure.
 */
export async function fetchText(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await sleep(1000);
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.ok) return { ok: true, text: await response.text() };
      if (response.status >= 500 && attempt === 0) continue;
      return { ok: false, status: response.status, reason: `HTTP ${response.status}` };
    } catch (error) {
      if (attempt === 0) continue;
      return {
        ok: false,
        reason: error.name === "TimeoutError" ? "timeout" : String(error.message ?? error),
      };
    }
  }
  return { ok: false, reason: "unreachable" };
}

// ---------------------------------------------------------------------------
// Reading the text. The lang attribute is the whole game: the catalogue returns
// books where the target language is ANY of the book's languages, so filtering
// books by language is not filtering text by language, and getting this wrong
// files one language's letters as another's alphabet.
// ---------------------------------------------------------------------------

/**
 * A depth-tracking walk over `<div>` tags, which is what this needs instead of a
 * regex: Bloom nests editable divs inside translation groups inside pages, and
 * no regex closes the right `</div>`.
 *
 * Calls `onElement({ attrs, start, end, contentStart, contentEnd })` for every
 * div as its close tag is reached, so innermost first. Callers that need to
 * exclude a region inside an outer div therefore collect ranges and filter at
 * the end rather than expecting to be told about the parent first.
 */
function walkDivs(html, onElement) {
  const tags = /<(\/?)div\b([^>]*?)(\/?)>/gi;
  const open = [];
  let match;
  while ((match = tags.exec(html)) !== null) {
    const [whole, slash, attrs, selfClosing] = match;
    if (slash) {
      const started = open.pop();
      if (!started) continue;
      onElement({
        attrs: started.attrs,
        start: started.start,
        end: tags.lastIndex,
        contentStart: started.contentStart,
        contentEnd: match.index,
        depth: open.length,
      });
      continue;
    }
    if (selfClosing) continue;
    open.push({
      attrs,
      start: match.index,
      contentStart: tags.lastIndex,
    });
  }
}

const classesOf = (attrs) => {
  const match = /\bclass\s*=\s*"([^"]*)"/i.exec(attrs) ?? /\bclass\s*=\s*'([^']*)'/i.exec(attrs);
  return match ? match[1].split(/\s+/) : [];
};

const langOf = (attrs) => {
  const match = /\blang\s*=\s*"([^"]*)"/i.exec(attrs) ?? /\blang\s*=\s*'([^']*)'/i.exec(attrs);
  return match ? match[1].trim() : undefined;
};

/**
 * Bloom's "no language" sentinels. They hold placeholder `&nbsp;` content and
 * appear in the hundreds; `lang="z"` alone was 619 of one book's attributes.
 */
const SENTINEL_LANGS = new Set(["z", "*", ""]);

/**
 * The text a book carries for exactly this language code.
 *
 * Front and back matter go first, and that is not tidiness: credits, licence
 * blocks and contributor names sit there tagged with the VERNACULAR lang, so
 * leaving them in seeds a language's inventory with English letters and English
 * proper names.
 *
 * Then `bloom-editable` divs whose lang EXACTLY equals the code. No prefix
 * matching — `ace` must not quietly collect `ace-x-something`, and a book using
 * a script-qualified tag is a different writing system that should be reported
 * rather than folded in.
 */
export function textForLanguage(html, isoCode) {
  const dropped = [];
  const editables = [];

  walkDivs(html, (element) => {
    const classes = classesOf(element.attrs);
    if (classes.includes("bloom-frontMatter") || classes.includes("bloom-backMatter")) {
      dropped.push([element.start, element.end]);
      return;
    }
    if (!classes.includes("bloom-editable")) return;
    const lang = langOf(element.attrs);
    if (lang === undefined || SENTINEL_LANGS.has(lang)) return;
    if (lang !== isoCode) return;
    editables.push([element.contentStart, element.contentEnd]);
  });

  const insideDropped = (start) =>
    dropped.some(([from, to]) => start >= from && start < to);

  const pieces = [];
  for (const [start, end] of editables) {
    if (insideDropped(start)) continue;
    pieces.push(plainText(html.slice(start, end)));
  }
  return {
    text: pieces.join("\n").normalize("NFC"),
    blocks: pieces.filter((piece) => piece.trim()).length,
  };
}

/** Every lang attribute in the book and how often it appears, matter included. */
export function langAttributeCounts(html) {
  const counts = new Map();
  for (const match of html.matchAll(/\blang\s*=\s*"([^"]*)"/gi)) {
    const lang = match[1].trim();
    counts.set(lang, (counts.get(lang) ?? 0) + 1);
  }
  return counts;
}

/** Which languages the book has non-sentinel editable text for, and how much. */
export function editableLangs(html) {
  const sizes = new Map();
  walkDivs(html, (element) => {
    const classes = classesOf(element.attrs);
    if (!classes.includes("bloom-editable")) return;
    const lang = langOf(element.attrs);
    if (lang === undefined || SENTINEL_LANGS.has(lang)) return;
    const text = plainText(html.slice(element.contentStart, element.contentEnd));
    if (!text.trim()) return;
    sizes.set(lang, (sizes.get(lang) ?? 0) + text.length);
  });
  return sizes;
}

const ENTITIES = new Map(
  Object.entries({
    nbsp: "\u00a0",
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    ndash: "\u2013",
    mdash: "\u2014",
    lsquo: "\u2018",
    rsquo: "\u2019",
    ldquo: "\u201c",
    rdquo: "\u201d",
    hellip: "\u2026",
    shy: "\u00ad",
  })
);

/** Tags out, entities decoded, whitespace collapsed. */
export function plainText(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (whole, name) => ENTITIES.get(name.toLowerCase()) ?? whole)
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

/**
 * The font family the book's own stylesheet names per language:
 * `[lang='acr'] { font-family: 'Andika New Basic' }`. This lives in
 * defaultLangStyles.css rather than the HTML's inline `<style>`, which usually
 * carries no such rule.
 */
export function fontFamiliesByLang(css) {
  const families = new Map();
  for (const rule of css.matchAll(/\[lang\s*=\s*['"]?([\w-]+)['"]?\s*\]([^{]*)\{([^}]*)\}/g)) {
    const [, lang, , body] = rule;
    const declaration = /font-family\s*:\s*([^;}]+)/i.exec(body);
    if (!declaration) continue;
    // A stack is legal here; the first family is the one the book asks for.
    const first = declaration[1].split(",")[0].trim().replace(/^['"]|['"]$/g, "");
    if (!first) continue;
    if (!families.has(lang)) families.set(lang, first);
  }
  return families;
}

// ---------------------------------------------------------------------------
// Characters. Bloom's language rows carry no script, so the script a claim is
// filed under cannot come from the catalogue — it comes from the text.
// ---------------------------------------------------------------------------

/**
 * ISO 15924 codes for the Unicode script properties Node's regex engine will
 * test. Not the whole register: a cluster whose base matches none of these is
 * counted as unidentified and reported, which is honest about the gap rather
 * than filing the characters under a guess.
 */
const SCRIPT_CODES = {
  Adlam: "Adlm", Arabic: "Arab", Armenian: "Armn", Balinese: "Bali",
  Bamum: "Bamu", Batak: "Batk", Bengali: "Beng", Bopomofo: "Bopo",
  Buginese: "Bugi", Buhid: "Buhd", Canadian_Aboriginal: "Cans",
  Chakma: "Cakm", Cham: "Cham", Cherokee: "Cher", Coptic: "Copt",
  Cyrillic: "Cyrl", Deseret: "Dsrt", Devanagari: "Deva", Ethiopic: "Ethi",
  Georgian: "Geor", Glagolitic: "Glag", Gothic: "Goth", Greek: "Grek",
  Gujarati: "Gujr", Gurmukhi: "Guru", Han: "Hani", Hangul: "Hang",
  Hanifi_Rohingya: "Rohg", Hanunoo: "Hano", Hebrew: "Hebr", Hiragana: "Hira",
  Javanese: "Java", Kannada: "Knda", Katakana: "Kana", Kayah_Li: "Kali",
  Khmer: "Khmr", Lao: "Laoo", Latin: "Latn", Lepcha: "Lepc", Limbu: "Limb",
  Lisu: "Lisu", Malayalam: "Mlym", Mandaic: "Mand", Meetei_Mayek: "Mtei",
  Mongolian: "Mong", Myanmar: "Mymr", "N'Ko": "Nkoo", Nko: "Nkoo",
  Ol_Chiki: "Olck", Oriya: "Orya", Osage: "Osge", Phags_Pa: "Phag",
  Rejang: "Rjng", Runic: "Runr", Samaritan: "Samr", Saurashtra: "Saur",
  Sinhala: "Sinh", Sundanese: "Sund", Syloti_Nagri: "Sylo", Syriac: "Syrc",
  Tagalog: "Tglg", Tagbanwa: "Tagb", Tai_Le: "Tale", Tai_Tham: "Lana",
  Tai_Viet: "Tavt", Tamil: "Taml", Telugu: "Telu", Thaana: "Thaa",
  Thai: "Thai", Tibetan: "Tibt", Tifinagh: "Tfng", Vai: "Vaii",
  Yi: "Yiii",
};

const SCRIPT_TESTS = Object.entries(SCRIPT_CODES).flatMap(([name, code]) => {
  try {
    return [[new RegExp(`\\p{Script=${name}}`, "u"), code]];
  } catch {
    // A property name this Node build does not know. Characters in it fall
    // through to unidentified rather than crashing the run.
    return [];
  }
});

/** The ISO 15924 code of a character's script, or undefined for none we test. */
export function scriptOf(character) {
  for (const [test, code] of SCRIPT_TESTS) {
    if (test.test(character)) return code;
  }
  return undefined;
}

const LETTER = /\p{L}/u;
const MARK = /\p{M}/u;
const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/**
 * Apostrophe-shaped characters, and the one this project files them under.
 *
 * In a great many orthographies the apostrophe is a letter: Achi writes b' ch'
 * k' q' t' tz', and a glottal stop spelled this way turns up across the
 * Americas, Africa and the Pacific. Bloom's authors type whichever key produced
 * one, and a word processor's autocorrect changes its mind halfway through a
 * book, so the same letter arrives as U+0027 in one paragraph and U+2019 in the
 * next.
 *
 * Unicode's own answer for the letter — as opposed to the quotation mark — is
 * U+02BC MODIFIER LETTER APOSTROPHE, and it is what the SLDR's exemplars for
 * these languages list, so an inventory folded to U+02BC can be compared with
 * an SLDR claim instead of sitting beside it looking different. Every variant
 * seen, and how often, goes into the evidence, so the folding is auditable and
 * the raw spelling is not lost.
 */
export const CANONICAL_APOSTROPHE = "ʼ";
const APOSTROPHES = new Set([
  "'", // APOSTROPHE
  "’", // RIGHT SINGLE QUOTATION MARK
  "‘", // LEFT SINGLE QUOTATION MARK
  "ʼ", // MODIFIER LETTER APOSTROPHE
  "ʻ", // MODIFIER LETTER TURNED COMMA
  "ꞌ", // LATIN SMALL LETTER SALTILLO
  "ʹ", // MODIFIER LETTER PRIME
  "′", // PRIME
  "´", // ACUTE ACCENT, standing in for an apostrophe
  "`", // GRAVE ACCENT, likewise
]);

/**
 * Grapheme clusters that are letters, counted per script.
 *
 * A cluster keeps the combining marks attached to its base (`\p{M}` after a
 * `\p{L}`), because in an abugida the mark is part of the letter as written and
 * splitting it produces entries no reader would recognise. Digits, punctuation
 * and whitespace are discarded.
 *
 * The apostrophe exception. An apostrophe-shaped character is counted when a
 * letter comes immediately before it, and discarded otherwise. That is the line
 * between the letter and the punctuation mark that this can draw from text
 * alone: an opening quote has a space before it, an orthographic apostrophe
 * never does. It does keep the closing half of a quoted phrase — `chaqe'` and
 * `'chaqe'` end identically — so a book that quotes speech with single quotes
 * contributes a few false counts, which is why the count of every variant is
 * written into the evidence rather than only the verdict. The apostrophe is
 * filed under the script of the letter before it, since it has none of its own.
 *
 * Case is kept here and folded later, by `foldClusters`: this function reports
 * what the text contains, and what an alphabet claim should list is a separate
 * question with a separate answer.
 *
 * The cluster's script is its base character's, which is also why marks do not
 * need a script of their own — `Inherited` is exactly the property saying "ask
 * my base".
 */
export function letterClustersByScript(text) {
  const byScript = new Map(); // script code (or 'unidentified') → Map(cluster → count)
  const count = (script, cluster) => {
    if (!byScript.has(script)) byScript.set(script, new Map());
    const counts = byScript.get(script);
    counts.set(cluster, (counts.get(cluster) ?? 0) + 1);
  };

  let afterLetter; // the script of the letter just counted, or undefined
  for (const { segment } of segmenter.segment(text.normalize("NFC"))) {
    const base = [...segment][0];
    if (!base) continue;
    if (APOSTROPHES.has(base)) {
      // Two in a row are a quotation mark's doing, not a letter's, so only the
      // first one after a letter is counted.
      if (afterLetter) count(afterLetter, base);
      afterLetter = undefined;
      continue;
    }
    if (!LETTER.test(base)) {
      afterLetter = undefined;
      continue;
    }
    // Anything past the base that is neither a letter nor a mark (a ZWJ-joined
    // oddity, say) is not part of a letter as written.
    const cluster = [...segment]
      .filter((character, at) => at === 0 || MARK.test(character))
      .join("");
    const script = scriptOf(base) ?? "unidentified";
    count(script, cluster);
    afterLetter = script;
  }
  return byScript;
}

/**
 * The inventory an alphabet claim lists, from the clusters the text contains:
 * lower case, and one apostrophe rather than however many the typing produced.
 *
 * Both foldings answer the same question — what does this orthography's
 * alphabet consist of, as a list a person would recognise. The convention every
 * source we compare against follows (SLDR exemplars, and the alphabets people
 * write out by hand) is to list the lower case and let the reader supply the
 * capitals, so a claim carrying `A` and `a` as separate entries does not match
 * an SLDR claim for the same alphabet and cannot accumulate support with it.
 *
 * Returns the folded counts and, per folded entry, every raw cluster that fed
 * it with its own count — the evidence writes that out, so nothing here is a
 * fact the row cannot show its working for.
 */
export function foldClusters(clusters) {
  const counts = new Map();
  const variants = new Map(); // folded entry → Map(raw cluster → count)
  for (const [cluster, count] of clusters) {
    const folded = foldCluster(cluster);
    counts.set(folded, (counts.get(folded) ?? 0) + count);
    if (!variants.has(folded)) variants.set(folded, new Map());
    const seen = variants.get(folded);
    seen.set(cluster, (seen.get(cluster) ?? 0) + count);
  }
  return { counts, variants };
}

/**
 * One cluster's folded form. Lowercasing is skipped where it would change the
 * length — Turkish İ lowercases to two codepoints, ẞ to `ss` — because a
 * one-letter entry that becomes two is no longer a letter.
 */
function foldCluster(cluster) {
  const canonical = [...cluster]
    .map((character) => (APOSTROPHES.has(character) ? CANONICAL_APOSTROPHE : character))
    .join("");
  const lower = canonical.toLowerCase();
  return [...lower].length === [...canonical].length ? lower : canonical;
}

/**
 * The frequency floor: one occurrence in ten thousand, never below 2.
 *
 * A single typo or one loanword hapax should not become a letter, and the floor
 * has to scale, because "seen twice" means something different in 2,000
 * characters than in 200,000. Both the floor and every character's count go into
 * the evidence details, so this number is auditable and tunable rather than
 * baked in.
 */
export function frequencyFloor(totalOccurrences) {
  return Math.max(2, Math.ceil(totalOccurrences / 10_000));
}
