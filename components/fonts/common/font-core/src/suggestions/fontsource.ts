/**
 * Fontsource as a source of fonts for an alphabet.
 *
 * Fontsource republishes the open-licensed font catalogs (Google Fonts and more)
 * with two things we need and Google's own API doesn't give us: a stable file URL
 * per subset and weight, and a published `unicode-range` per subset. That second
 * one is what makes this a *suggester* rather than a list — we can decide whether
 * a family can write somebody's alphabet without downloading a single font.
 *
 * It answers in two tiers, because the catalog is one request and the coverage
 * data is one request per family:
 *
 * 1. The catalog, filtered down to plausible candidates by licence and by the
 *    subsets the alphabet probably needs (`guessSubsetsForAlphabet`).
 * 2. Per-family metadata for the first `maxCandidates` of those, a few at a time,
 *    keeping only the families whose ranges actually contain every character.
 *
 * The subset guess is only a guess, so a guess that leaves nothing is retried
 * without it: a wrong shortcut must not be able to answer "no fonts". Both tiers
 * cache (see suggestionCache.ts), the catalog for a day and a family for a week,
 * which is what keeps the second visit to the chooser instant.
 */

import { coversCodePoint } from "../fontCoverage";
import { parseAlphabet } from "../alphabet";
import type { FontInfo } from "../fontInfo";
import {
  guessSubsetsForAlphabet,
  isIgnorableAlphabetCodePoint,
} from "../googleFonts";
import { isAbortError, throwIfAborted } from "./abort";
import {
  readCachedSuggestion,
  writeCachedSuggestion,
  type SuggestionCacheStorage,
} from "./suggestionCache";
import type { AlphabetFontSuggester, SuggestOptions } from "./types";
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
  } = config;

  return {
    async suggestFontsForAlphabet(
      alphabet: string,
      options: SuggestOptions = {}
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

      const shortlist = candidates.slice(0, maxCandidates);
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
          if (!covers(metadata, codePoints)) return undefined;
          return toFontInfo(entry, metadata, codePoints, cdnBaseUrl);
        }
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

/** Whether an entry claims every subset the alphabet was guessed to need. */
function hasSubsets(entry: CatalogEntry, guessed: string[]): boolean {
  if (guessed.length === 0) return true;
  return guessed.every((subset) => entry.subsets.includes(subset));
}

/** Whether a family's declared ranges hold every character of the alphabet. */
function covers(metadata: FontMetadata, codePoints: number[]): boolean {
  // The whole family, not one subset: the alphabet may well need letters from two
  // of them, and the chooser downloads the subset that has the most of it.
  const ranges = parseUnicodeRanges(
    Object.values(metadata.unicodeRange ?? {}).join(",")
  );
  return codePoints.every((codePoint) => coversCodePoint(ranges, codePoint));
}

function toFontInfo(
  entry: CatalogEntry,
  metadata: FontMetadata,
  codePoints: number[],
  cdnBaseUrl: string
): FontInfo {
  const weights = metadata.weights?.length ? metadata.weights : entry.weights;
  const subset = bestSubset(entry, metadata, codePoints);
  const cdn = cdnBaseUrl.replace(/\/+$/, "");
  return {
    family: entry.family,
    installed: false,
    license: "open",
    licenseUrl: `https://fontsource.org/fonts/${entry.id}`,
    // Fontsource's file names are laid out {subset}-{weight}-{style}, and we want
    // the TTF rather than the woff2 the web would use: the chooser reads the
    // font's own tables, and woff2 is compressed past reading that way.
    fileUrl: `${cdn}/${entry.id}@latest/${subset}-${nearestWeight(
      weights
    )}-normal.ttf`,
  };
}

/**
 * Which of the family's subset files to fetch: the one holding the most of this
 * alphabet.
 *
 * Fontsource ships a family as one file per subset, and the family's own
 * `defSubset` is almost always `latin` — for a Thai family too. So taking
 * `defSubset` hands the chooser a file that cannot write the language it just
 * suggested a font for, and the chooser reads the file's own cmap, so it would
 * then contradict itself in front of the user. Verified against the real CDN:
 * `anuphan@latest/latin-400-normal.ttf` does not cover ก ข ค ง, and
 * `thai-400-normal.ttf` does.
 *
 * `defSubset` is where we start, so it wins where nothing beats it and where the
 * family published no ranges at all.
 */
function bestSubset(
  entry: CatalogEntry,
  metadata: FontMetadata,
  codePoints: number[]
): string {
  const ranges = metadata.unicodeRange ?? {};
  let best = metadata.defSubset || entry.defSubset;
  let bestCovered = countCovered(ranges[best], codePoints);
  for (const [subset, range] of Object.entries(ranges)) {
    const covered = countCovered(range, codePoints);
    // Strictly more, so a tie leaves the default subset in place.
    if (covered > bestCovered) {
      best = subset;
      bestCovered = covered;
    }
  }
  return best;
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
  const response = await fetchImpl(url, { signal: options.signal });
  if (!response.ok) {
    const status = `${response.status} ${response.statusText ?? ""}`.trim();
    throw new Error(`Fontsource request failed: ${status} for ${url}`);
  }
  return response.json();
}

/**
 * `items.map(run)`, but with only `limit` of them in flight — and stopping at the
 * next item once the caller cancels, rather than working through a shortlist
 * nobody is waiting for. Results keep the order of `items`, which is the
 * catalog's order and so the order the chooser shows.
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  signal: AbortSignal | undefined,
  run: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Math.max(1, Math.min(limit, items.length));
  await Promise.all(
    Array.from({ length: workers }, async () => {
      for (let at = next++; at < items.length; at = next++) {
        throwIfAborted(signal);
        results[at] = await run(items[at]);
      }
    })
  );
  return results;
}
