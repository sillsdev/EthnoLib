/**
 * The complete font file for a Google Fonts family, without an API key.
 *
 * The sources that need no key ship pieces: Fontsource serves one file per
 * subset, so what the chooser previews with is a slice of the family
 * (`FontInfo.fileIsSubset`). The user who clicks "Use this font" should get the
 * whole font — the file with every subset's letters in it — and the one keyless
 * place that has it is the google/fonts GitHub repository, read here through
 * jsDelivr's mirror, which serves CORS `*` and compresses on the wire. (Google's
 * own Developer API has the same files but demands an API key; its CSS API
 * serves woff2, which the chooser can't read tables out of.)
 *
 * Finding the file takes two small requests, done only when somebody selects the
 * font: the repository shelves each family under its licence
 * (`ofl/arimo/…`, probed in order of how common the licence is), and the family's
 * `METADATA.pb` names its font files, from which we take the regular style.
 * Answers are cached like every other suggestion source.
 *
 * A family that isn't in the repository is an answer, not an error: the caller
 * falls back to handing over the subset files it already has.
 */

import { fetchWithTimeout } from "./abort";
import {
  readCachedSuggestion,
  writeCachedSuggestion,
  type SuggestionCacheStorage,
} from "./suggestionCache";
import type { SuggestOptions } from "./types";

/** jsDelivr's mirror of https://github.com/google/fonts. */
const GOOGLE_FONTS_REPO_CDN = "https://cdn.jsdelivr.net/gh/google/fonts@main";

/**
 * The licence shelves families live under, most common first. Nearly everything
 * is under the OFL — including families that started under Apache, which the
 * repository moves when they relicense — so the order is about saving a request,
 * not correctness.
 */
const LICENSE_DIRECTORIES = ["ofl", "apache", "ufl"];

const SOURCE = "googleFontsRepo";
/** A family's files change when the font is rebuilt, which is rare. */
const FOUND_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** A shorter life for "not in the repository": the repository gains families. */
const MISSING_TTL_MS = 24 * 60 * 60 * 1000;

/** What we cache when the repository has no such family. */
interface MissingFamily {
  missing: true;
}

export interface GoogleFontsFullFontResolverConfig {
  /** Where the repository is mirrored. Defaults to jsDelivr's gh mirror. */
  baseUrl?: string;
  /** Where answers are remembered. Defaults to `localStorage` where there is one. */
  storage?: SuggestionCacheStorage;
}

/**
 * Where to fetch a family's complete font file from, or undefined for a family
 * the source hasn't got. This is the shape the chooser's `getFullFontUrl` prop
 * wants.
 */
export type FullFontUrlResolver = (
  family: string,
  options?: SuggestOptions
) => Promise<string | undefined>;

/** A resolver backed by the google/fonts repository. */
export function createGoogleFontsFullFontUrlResolver(
  config: GoogleFontsFullFontResolverConfig = {}
): FullFontUrlResolver {
  const { baseUrl = GOOGLE_FONTS_REPO_CDN, storage } = config;
  const cdn = baseUrl.replace(/\/+$/, "");

  return async (family, options = {}) => {
    const directory = repoDirectoryFor(family);
    if (!directory) return undefined;
    const key = `family.${directory}`;

    // Two reads of the one entry, because the two answers are worth keeping for
    // different lengths of time; see sldrAlphabet.ts, which set the pattern.
    const cached = readCachedSuggestion<string | MissingFamily>(
      SOURCE,
      key,
      FOUND_TTL_MS,
      storage
    );
    if (typeof cached === "string") return cached;
    if (
      cached &&
      readCachedSuggestion<string | MissingFamily>(
        SOURCE,
        key,
        MISSING_TTL_MS,
        storage
      )
    ) {
      return undefined;
    }

    const fetchImpl = options.fetchImpl ?? fetch;
    for (const shelf of LICENSE_DIRECTORIES) {
      const url = `${cdn}/${shelf}/${directory}/METADATA.pb`;
      const response = await fetchWithTimeout(fetchImpl, url, options.signal);
      if (response.status === 404) continue;
      if (!response.ok) {
        // A repository that answered strangely has told us nothing about the
        // family, so nothing is cached: see the suggestion cache's contract.
        const status = `${response.status} ${response.statusText ?? ""}`.trim();
        throw new Error(`google/fonts request failed: ${status}`);
      }
      const filename = regularFilename(await response.text());
      // Metadata we can't read a filename out of is as missing as no metadata:
      // there is no file to point at either way.
      if (!filename) break;
      const fileUrl = `${cdn}/${shelf}/${directory}/${encodeURIComponent(filename)}`;
      writeCachedSuggestion(SOURCE, key, fileUrl, storage);
      return fileUrl;
    }

    writeCachedSuggestion<MissingFamily>(SOURCE, key, { missing: true }, storage);
    return undefined;
  };
}

/**
 * The repository directory a family lives in: lower-cased with everything but
 * letters and digits dropped — "Noto Sans JP" is shelved as `notosansjp`.
 */
function repoDirectoryFor(family: string): string {
  return family.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * The regular style's filename out of a METADATA.pb: the upright 400 where the
 * family has one, else any upright, else whatever file is named first. The
 * `fonts { … }` blocks hold only scalar fields, so a brace-free scan reads them
 * without a protobuf runtime — the same bargain gflanguagesSampleText.ts makes.
 */
export function regularFilename(metadata: string): string | undefined {
  const fonts: { style?: string; weight?: number; filename?: string }[] = [];
  for (const match of metadata.matchAll(/fonts\s*\{([^}]*)\}/g)) {
    const block = match[1];
    fonts.push({
      style: /\bstyle:\s*"([^"]*)"/.exec(block)?.[1],
      weight: Number(/\bweight:\s*(\d+)/.exec(block)?.[1]),
      filename: /\bfilename:\s*"([^"]*)"/.exec(block)?.[1],
    });
  }
  const named = fonts.filter((font) => font.filename);
  const upright = named.filter((font) => font.style === "normal");
  return (
    upright.find((font) => font.weight === 400)?.filename ??
    upright[0]?.filename ??
    named[0]?.filename
  );
}
