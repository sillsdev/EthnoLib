/**
 * Fontsource as a source of fonts for an alphabet.
 *
 * Fontsource republishes the open-licensed font catalogs (Google Fonts and more)
 * with two things we need and Google's own API doesn't give us: a stable file URL
 * per subset and weight, and a published `unicode-range` per subset.
 *
 * It answers in three tiers, cheapest first, because the catalog is one request,
 * the metadata is one request per family, and the font files are several:
 *
 * 1. The catalog, filtered down to plausible candidates by licence and by the
 *    subsets the alphabet probably needs (`guessSubsetsForAlphabet`).
 * 2. Per-family metadata for the first `maxCandidates` of those, dropping any
 *    family whose declared ranges don't even claim the alphabet.
 * 3. The subset files themselves, read for the characters they really have.
 *
 * That third tier is not optional, however much it costs. A published
 * `unicode-range` is Google's *subset bucket definition*, not a statement about
 * the font: every latin-ext family declares the identical `U+0100-02BA, …`
 * whatever is inside it. So ɓ ɗ ɲ ƴ read as covered by every Latin family in the
 * catalog, and Fulfulde was offered a page of fonts that each rendered four of
 * its letters in a fallback face — the declared test, for a Latin alphabet, was
 * approving everyone. Reading the cmap of the very files this returns is the
 * only honest answer, and it is the same answer the chooser will reach itself
 * once it has downloaded them.
 *
 * A ranged read would have made it cheap, and the CDN rules it out: jsDelivr
 * answers `Range` with 206 and the bytes of the *brotli* representation, so byte
 * 0 of a font comes back `1b cf 6c 75` rather than `00 01 00 00`. Whole files,
 * then — about 15 KB on the wire each, one or two per family, and the answer is
 * cached as a few hundred bytes of packed ranges.
 *
 * The subset guess is only a guess, so a guess that leaves nothing is retried
 * without it: a wrong shortcut must not be able to answer "no fonts". Every tier
 * caches (see suggestionCache.ts), the catalog for a day and anything about a
 * font for a week, which is what keeps the second visit to the chooser instant.
 * Since the third tier is what makes a cold search slow, `onProgress` publishes
 * the fonts settled so far as they settle.
 */

import { coversCodePoint, readCoverageRanges } from "../fontCoverage";
import { parseAlphabet } from "../alphabet";
import type { FontInfo } from "../fontInfo";
import {
  guessSubsetsForAlphabet,
  isIgnorableAlphabetCodePoint,
} from "../googleFonts";
import { fetchWithTimeout, isAbortError, throwIfAborted } from "./abort";
import {
  readCachedSuggestion,
  writeCachedSuggestion,
  type SuggestionCacheStorage,
} from "./suggestionCache";
import type {
  AlphabetFontSuggester,
  AlphabetSuggestOptions,
  SuggestOptions,
} from "./types";
import { parseUnicodeRanges } from "./unicodeRanges";

const FONTSOURCE_API = "https://api.fontsource.org/v1";
const FONTSOURCE_CDN = "https://cdn.jsdelivr.net/fontsource/fonts";

/** Who to cache under. */
const SOURCE = "fontsource";
/** The catalog changes when a font is added, which is often but not urgent. */
const CATALOG_TTL_MS = 24 * 60 * 60 * 1000;
/** A family's ranges change only when the font is rebuilt. */
const FONT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** The weight the samples are drawn in, and so the file we would rather fetch. */
const PREFERRED_WEIGHT = 400;

export interface FontsourceSuggesterConfig {
  /** The API to ask. Defaults to Fontsource's; point it at a proxy to cache centrally. */
  baseUrl?: string;
  /** Where the font files live. Defaults to the jsDelivr mirror Fontsource publishes to. */
  cdnBaseUrl?: string;
  /**
   * How many catalog candidates are worth a metadata request each. The catalog
   * holds a couple of thousand families and a broad alphabet matches hundreds of
   * them; past the first few dozen the user is not reading the list anyway.
   */
  maxCandidates?: number;
  /** How many of those requests run at once. */
  concurrency?: number;
  /** Where answers are remembered. Defaults to `localStorage` where there is one. */
  storage?: SuggestionCacheStorage;
  /** Narrow the candidates further, for anything the catalog can't express. */
  familyFilter?: (family: string) => boolean;
  /**
   * How popular each family is, by lower-cased name, smaller meaning more
   * popular — `bundledFontPopularity`, usually. With this the
   * shortlist is the most-used families that might cover the alphabet; without
   * it, the first `maxCandidates` in catalog order, which for a broad script
   * like Latin means an alphabetical page. Asked only when there are more
   * candidates than the shortlist holds, and a provider that fails costs only
   * the ordering, never the answer.
   */
  getPopularity?: (
    options?: SuggestOptions
  ) => Promise<ReadonlyMap<string, number>>;
}

/** A catalog entry, cut down to the fields we cache and decide on. */
interface CatalogEntry {
  id: string;
  family: string;
  subsets: string[];
  weights: number[];
  defSubset: string;
  license: string;
}

/** One family's metadata, likewise cut down. */
interface FontMetadata {
  unicodeRange: Record<string, string>;
  weights: number[];
  defSubset: string;
}

/**
 * A suggester backed by Fontsource.
 *
 * Everything it returns is `license: "open"`: only OFL, Apache 2.0 and Ubuntu
 * families get past the filter, so the chooser can offer them for download
 * without the user having to read a licence first.
 */
export function createFontsourceSuggester(
  config: FontsourceSuggesterConfig = {}
): AlphabetFontSuggester {
  const {
    baseUrl = FONTSOURCE_API,
    cdnBaseUrl = FONTSOURCE_CDN,
    maxCandidates = 50,
    concurrency = 6,
    storage,
    familyFilter,
    getPopularity,
  } = config;

  return {
    async suggestFontsForAlphabet(
      alphabet: string,
      options: AlphabetSuggestOptions = {}
    ): Promise<FontInfo[]> {
      const codePoints = charactersThatMatter(alphabet);
      // Nothing but spaces and punctuation: every font in the world qualifies, so
      // saying "all of them" would be no help and one request is one too many.
      if (codePoints.length === 0) return [];

      const catalog = await loadCatalog(baseUrl, storage, options);
      const open = catalog
        .filter((entry) => isOpenLicense(entry.license))
        .filter((entry) => !familyFilter || familyFilter(entry.family));

      const guessed = guessSubsetsForAlphabet(alphabet);
      let candidates = open.filter((entry) => hasSubsets(entry, guessed));
      // The guess knows a few dozen blocks and nothing else; a family that names
      // its subsets unusually, or an alphabet spanning two scripts, can empty the
      // list without any of it being true. Coverage is the real test, so fall
      // back to running it over everything.
      if (candidates.length === 0 && guessed.length > 0) candidates = open;

      // Only when the slice would actually cut something: a list that fits the
      // shortlist whole gets checked whole, and the ranking's megabytes stay
      // unfetched.
      if (getPopularity && candidates.length > maxCandidates) {
        try {
          const popularity = await getPopularity(options);
          candidates = rankByPopularity(candidates, popularity);
        } catch (error) {
          if (isAbortError(error)) throw error;
          // No ranking, no harm: catalog order is where we started.
        }
      }

      const shortlist = candidates.slice(0, maxCandidates);
      const { onProgress } = options;
      const suggestions = await mapWithConcurrency(
        shortlist,
        concurrency,
        options.signal,
        async (entry) => {
          let metadata: FontMetadata;
          try {
            metadata = await loadFontMetadata(baseUrl, entry.id, storage, options);
          } catch (error) {
            // One family's metadata missing costs us that family. Failing the
            // whole suggestion over it would mean a single 500 on a font nobody
            // asked about leaves the user with no fonts at all.
            if (isAbortError(error)) throw error;
            return undefined;
          }
          // The declared ranges can't confirm a family, but they can rule one
          // out for free — and that saves the font file that confirming costs.
          if (!declares(metadata, codePoints)) return undefined;

          const weight = nearestWeight(
            metadata.weights?.length ? metadata.weights : entry.weights
          );
          const files = fileNamer(cdnBaseUrl, entry.id, weight);
          const subsets = await coveringSubsets(
            entry,
            metadata,
            codePoints,
            files,
            storage,
            options
          );
          if (!subsets) return undefined;
          return toFontInfo(entry, metadata, subsets, files);
        },
        onProgress &&
          ((settled) =>
            onProgress(settled.filter((font): font is FontInfo => !!font)))
      );

      return suggestions.filter((font): font is FontInfo => font !== undefined);
    },
  };
}

/**
 * The code points a suggestion has to cover: every one the alphabet names, less
 * the spacing and punctuation that says nothing about which font can write it.
 */
function charactersThatMatter(alphabet: string): number[] {
  const codePoints = new Set<number>();
  for (const entry of parseAlphabet(alphabet)) {
    for (const character of entry) {
      const codePoint = character.codePointAt(0);
      if (codePoint === undefined) continue;
      if (isIgnorableAlphabetCodePoint(codePoint)) continue;
      codePoints.add(codePoint);
    }
  }
  return [...codePoints];
}

/**
 * Whether we can offer the font for download without asking anybody: the OFL in
 * any of its versions, Apache 2.0, and the Ubuntu font licence.
 */
function isOpenLicense(license: string | undefined): boolean {
  const name = (license ?? "").trim().toUpperCase();
  return (
    name.startsWith("OFL") || name === "APACHE-2.0" || name === "UFL-1.0"
  );
}

/**
 * The candidates most-popular first, ties and unranked families keeping their
 * catalog order (the sort is stable). A family the ranking has never heard of
 * goes after every family it has: being absent from Google Fonts' list says
 * "niche" more often than it says "new".
 */
function rankByPopularity(
  candidates: CatalogEntry[],
  popularity: ReadonlyMap<string, number>
): CatalogEntry[] {
  const rank = (entry: CatalogEntry) =>
    popularity.get(entry.family.toLowerCase()) ?? Number.POSITIVE_INFINITY;
  return [...candidates].sort((a, b) => rank(a) - rank(b));
}

/** Whether an entry claims every subset the alphabet was guessed to need. */
function hasSubsets(entry: CatalogEntry, guessed: string[]): boolean {
  if (guessed.length === 0) return true;
  return guessed.every((subset) => entry.subsets.includes(subset));
}

/**
 * Whether a family's declared ranges even claim the alphabet — a filter, never a
 * confirmation.
 *
 * The claim is worth almost nothing: `unicode-range` names the *bucket* a subset
 * file was cut from, identically for every family cut the same way, so a Latin
 * alphabet passes this everywhere. What it does do is rule out the families that
 * ship no bucket the letters could even be in, for free, before
 * `coveringSubsets` spends a font file finding out. See the file's header.
 */
function declares(metadata: FontMetadata, codePoints: number[]): boolean {
  // The whole family, not one subset: the alphabet may well need letters from
  // two of them.
  const ranges = parseUnicodeRanges(
    Object.values(metadata.unicodeRange ?? {}).join(",")
  );
  return codePoints.every((codePoint) => coversCodePoint(ranges, codePoint));
}

/** Where a family's subset files live, for the one weight we would fetch. */
type FileNamer = (subset: string) => string;

/**
 * Fontsource's file names are laid out {subset}-{weight}-{style}, and we want
 * the TTF rather than the woff2 the web would use: both this file and the
 * chooser read the font's own tables, and woff2 is compressed past reading that
 * way.
 */
function fileNamer(
  cdnBaseUrl: string,
  id: string,
  weight: number
): FileNamer {
  const cdn = cdnBaseUrl.replace(/\/+$/, "");
  return (subset) => `${cdn}/${id}@latest/${subset}-${weight}-normal.ttf`;
}

/**
 * The subset files it really takes to write this alphabet, the one carrying most
 * of it first — or undefined when the family can't write it after all, which for
 * an alphabet with African Latin letters in it is most of them.
 *
 * Greedy, and greedy over the files rather than over the promises: the declared
 * ranges only say which file is worth opening next, and what it turns out to
 * hold is what counts against the alphabet. So a subset that declared ɓ and
 * hasn't got it costs one request and then stands aside for the next subset that
 * declares it — and when no subset is left declaring a missing letter, the
 * family is out.
 *
 * A file that can't be fetched contributes nothing, which is the same shape of
 * answer as a file without the letters in it: unverified is not covered.
 */
async function coveringSubsets(
  entry: CatalogEntry,
  metadata: FontMetadata,
  codePoints: number[],
  files: FileNamer,
  storage: SuggestionCacheStorage | undefined,
  options: SuggestOptions
): Promise<string[] | undefined> {
  const declared = metadata.unicodeRange ?? {};
  const preferred = metadata.defSubset || entry.defSubset;
  const chosen: string[] = [];
  const opened = new Set<string>();
  let missing = codePoints;

  while (missing.length > 0) {
    const next = mostPromising(declared, opened, preferred, missing);
    if (!next) return undefined;
    opened.add(next);
    const real = await realCoverage(entry.id, next, files, storage, options);
    const left = missing.filter((codePoint) => !coversCodePoint(real, codePoint));
    // A file that helped with nothing is a file the caller has no reason to
    // download.
    if (left.length < missing.length) chosen.push(next);
    missing = left;
  }
  return chosen;
}

/**
 * Which subset file to open next: whichever untried one claims the most of what
 * is still missing, the family's own default subset winning a tie. Undefined
 * when nothing left even claims a missing character.
 */
function mostPromising(
  declared: Record<string, string>,
  opened: Set<string>,
  preferred: string,
  missing: number[]
): string | undefined {
  let best: string | undefined;
  let bestClaimed = 0;
  for (const [subset, range] of Object.entries(declared)) {
    if (opened.has(subset)) continue;
    const claimed = countCovered(range, missing);
    if (claimed === 0) continue;
    // Strictly more, so the first subset to claim a count keeps it — except that
    // the default subset takes a tie, as it is the family's own answer to "which
    // file is the font".
    if (claimed > bestClaimed || (claimed === bestClaimed && subset === preferred)) {
      best = subset;
      bestClaimed = claimed;
    }
  }
  return best;
}

/**
 * What a subset file really has, as packed coverage ranges — from the cache
 * where it is fresh, and otherwise by fetching the file and reading its cmap.
 *
 * A font's coverage packs down to a few hundred bytes, so this is cheap to keep
 * and it is what makes the second visit to the chooser instant. A request that
 * failed is not cached: it told us nothing about the font. A 404 did tell us
 * something — there is no such file — and caches as the empty coverage it is.
 */
async function realCoverage(
  id: string,
  subset: string,
  files: FileNamer,
  storage: SuggestionCacheStorage | undefined,
  options: SuggestOptions
): Promise<Uint32Array> {
  const key = `coverage.${id}.${subset}`;
  const cached = readCachedSuggestion<number[]>(
    SOURCE,
    key,
    FONT_TTL_MS,
    storage
  );
  if (cached) return new Uint32Array(cached);

  const fetchImpl = options.fetchImpl ?? fetch;
  let ranges: Uint32Array;
  try {
    const response = await fetchWithTimeout(
      fetchImpl,
      files(subset),
      options.signal
    );
    if (!response.ok && response.status !== 404) {
      // Not an answer about the font, so nothing is remembered and nothing is
      // covered; another subset may still carry the letters.
      return new Uint32Array();
    }
    ranges = response.ok
      ? await readCoverageRanges(await response.blob())
      : new Uint32Array();
  } catch (error) {
    if (isAbortError(error)) throw error;
    return new Uint32Array();
  }
  writeCachedSuggestion(SOURCE, key, Array.from(ranges), storage);
  return ranges;
}

function toFontInfo(
  entry: CatalogEntry,
  metadata: FontMetadata,
  subsets: string[],
  files: FileNamer
): FontInfo {
  const ranges = metadata.unicodeRange ?? {};
  const [primary, ...extras] = subsets;
  const info: FontInfo = {
    family: entry.family,
    installed: false,
    license: "open",
    licenseUrl: `https://fontsource.org/fonts/${entry.id}`,
    fileUrl: files(primary),
  };
  // One subset out of several is a piece of the family, even when it happens to
  // hold this whole alphabet: the complete font has letters these files don't,
  // and a host installing "the font" deserves to know this isn't all of it.
  const familySubsets = new Set([...entry.subsets, ...Object.keys(ranges)]);
  if (familySubsets.size > 1) {
    info.fileIsSubset = true;
    if (ranges[primary]) info.fileUnicodeRange = ranges[primary];
  }
  if (extras.length > 0) {
    info.additionalFiles = extras.map((subset) => ({
      url: files(subset),
      unicodeRange: ranges[subset] || undefined,
    }));
  }
  return info;
}

/** How many of the alphabet's code points one subset's declared ranges hold. */
function countCovered(
  range: string | undefined,
  codePoints: number[]
): number {
  if (!range) return 0;
  const ranges = parseUnicodeRanges(range);
  return codePoints.filter((codePoint) => coversCodePoint(ranges, codePoint))
    .length;
}

/** Regular where the family has one, and otherwise the weight closest to it. */
function nearestWeight(weights: number[] | undefined): number {
  if (!weights || weights.length === 0) return PREFERRED_WEIGHT;
  if (weights.includes(PREFERRED_WEIGHT)) return PREFERRED_WEIGHT;
  return weights.reduce((best, weight) =>
    Math.abs(weight - PREFERRED_WEIGHT) < Math.abs(best - PREFERRED_WEIGHT)
      ? weight
      : best
  );
}

/** The catalog, from cache where it is fresh, trimmed to what we keep. */
async function loadCatalog(
  baseUrl: string,
  storage: SuggestionCacheStorage | undefined,
  options: SuggestOptions
): Promise<CatalogEntry[]> {
  const cached = readCachedSuggestion<CatalogEntry[]>(
    SOURCE,
    "catalog",
    CATALOG_TTL_MS,
    storage
  );
  if (cached) return cached;

  const body = await getJson(`${baseUrl}/fonts`, options);
  // Half a megabyte arrives and six fields of it are ours; the rest would fill
  // the user's storage quota with categories and modification dates.
  const entries = (Array.isArray(body) ? body : [])
    .map(toCatalogEntry)
    .filter((entry): entry is CatalogEntry => entry !== undefined);
  writeCachedSuggestion(SOURCE, "catalog", entries, storage);
  return entries;
}

function toCatalogEntry(item: unknown): CatalogEntry | undefined {
  const raw = item as Partial<CatalogEntry> | null;
  if (!raw || typeof raw.id !== "string" || typeof raw.family !== "string") {
    return undefined;
  }
  return {
    id: raw.id,
    family: raw.family,
    subsets: Array.isArray(raw.subsets) ? raw.subsets : [],
    weights: Array.isArray(raw.weights) ? raw.weights : [],
    defSubset: typeof raw.defSubset === "string" ? raw.defSubset : "latin",
    license: typeof raw.license === "string" ? raw.license : "",
  };
}

/** One family's metadata, from cache where it is fresh. */
async function loadFontMetadata(
  baseUrl: string,
  id: string,
  storage: SuggestionCacheStorage | undefined,
  options: SuggestOptions
): Promise<FontMetadata> {
  const key = `font.${id}`;
  const cached = readCachedSuggestion<FontMetadata>(
    SOURCE,
    key,
    FONT_TTL_MS,
    storage
  );
  if (cached) return cached;

  const body = (await getJson(`${baseUrl}/fonts/${id}`, options)) as Partial<
    FontMetadata & { variants: unknown }
  >;
  const metadata: FontMetadata = {
    // The response also carries every file URL for every subset, weight and
    // style — tens of kilobytes we can rebuild from the id when we need it.
    unicodeRange:
      typeof body?.unicodeRange === "object" && body.unicodeRange !== null
        ? body.unicodeRange
        : {},
    weights: Array.isArray(body?.weights) ? body.weights : [],
    defSubset: typeof body?.defSubset === "string" ? body.defSubset : "latin",
  };
  writeCachedSuggestion(SOURCE, key, metadata, storage);
  return metadata;
}

/** A GET that insists on a usable answer, through the caller's own fetch. */
async function getJson(url: string, options: SuggestOptions): Promise<unknown> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchWithTimeout(fetchImpl, url, options.signal);
  if (!response.ok) {
    const status = `${response.status} ${response.statusText ?? ""}`.trim();
    throw new Error(`Fontsource request failed: ${status} for ${url}`);
  }
  return response.json();
}

/**
 * `items.map(run)`, but with only `limit` of them in flight — and stopping at the
 * next item once the caller cancels, rather than working through a shortlist
 * nobody is waiting for. Results keep the order of `items`, which is the ranked
 * order and so the order the chooser shows.
 *
 * `onSettled` hears the results so far each time that prefix grows, and it is a
 * *prefix* on purpose: with six items in flight the fourth often finishes first,
 * and publishing it then would put it above three fonts that are about to land
 * ahead of it. Held back until its predecessors are decided, a font that appears
 * never moves again.
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  signal: AbortSignal | undefined,
  run: (item: T) => Promise<R>,
  onSettled?: (settled: R[]) => void
): Promise<R[]> {
  const results = new Array<R>(items.length);
  const done = new Array<boolean>(items.length).fill(false);
  let published = 0;
  let next = 0;
  const workers = Math.max(1, Math.min(limit, items.length));
  await Promise.all(
    Array.from({ length: workers }, async () => {
      for (let at = next++; at < items.length; at = next++) {
        throwIfAborted(signal);
        results[at] = await run(items[at]);
        done[at] = true;
        if (!onSettled) continue;
        let grown = published;
        while (grown < items.length && done[grown]) grown++;
        if (grown === published) continue;
        published = grown;
        onSettled(results.slice(0, published));
      }
    })
  );
  return results;
}
