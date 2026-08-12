/**
 * The Google Fonts catalog, as fonts this chooser can offer to download.
 *
 * Nothing here touches React or the DOM beyond `fetch`, so a host app can call it
 * from wherever it already does its network work. Nothing here caches either: the
 * catalog is a few hundred kilobytes of JSON and the API is quota-metered, so the
 * caller decides how long an answer is good for (local storage, a server-side
 * cache, a build-time snapshot) rather than having a policy imposed on it.
 */

import type { FontInfo } from "./types";

/** Where the Developer API lives, when the host isn't proxying it. */
const GOOGLE_FONTS_API = "https://www.googleapis.com/webfonts/v1/webfonts";

export interface GoogleFontsOptions {
  /**
   * A Google Fonts Developer API key. Required by Google's own endpoint; leave it
   * out when `baseUrl` points at a proxy that holds the key itself.
   */
  apiKey?: string;
  /**
   * The endpoint to ask. Defaults to Google's. A host that would rather not ship a
   * key to the browser points this at its own proxy, which answers in the same
   * shape.
   */
  baseUrl?: string;
  /** Which order the API should return families in. */
  sort?: "alpha" | "date" | "popularity" | "style" | "trending";
  /** Ask only for families covering one Google subset, e.g. "cyrillic". */
  subset?: string;
  /** Narrow the result further here, for anything the API can't express. */
  familyFilter?: (family: string) => boolean;
  /** For tests, and for hosts whose fetch needs credentials or a timeout. */
  fetchImpl?: typeof fetch;
}

/** One family as the Developer API describes it. */
interface GoogleFontItem {
  family: string;
  variants?: string[];
  subsets?: string[];
  files?: Record<string, string>;
  category?: string;
  version?: string;
  lastModified?: string;
  menu?: string;
}

/**
 * The Google Fonts families, as chooser entries offering a download.
 *
 * Every family in this catalog is under the OFL, Apache 2.0 or the Ubuntu Font
 * Licence, so they all come back as `license: "open"` without reading a byte of
 * the fonts themselves.
 */
export async function fetchGoogleFontsCatalog(
  options: GoogleFontsOptions = {}
): Promise<FontInfo[]> {
  const {
    apiKey,
    baseUrl = GOOGLE_FONTS_API,
    sort,
    subset,
    familyFilter,
    fetchImpl = fetch,
  } = options;

  const url = new URL(baseUrl);
  if (apiKey) url.searchParams.set("key", apiKey);
  if (sort) url.searchParams.set("sort", sort);
  if (subset) url.searchParams.set("subset", subset);

  const response = await fetchImpl(url.toString());
  if (!response.ok) {
    throw new Error(
      `Google Fonts API request failed: ${response.status} ${
        response.statusText ?? ""
      }`.trim()
    );
  }

  const body = (await response.json()) as { items?: GoogleFontItem[] };
  const items = body.items ?? [];
  return items
    .filter((item) => !!item?.family)
    .filter((item) => !familyFilter || familyFilter(item.family))
    .map(toFontInfo);
}

function toFontInfo(item: GoogleFontItem): FontInfo {
  const info: FontInfo = {
    family: item.family,
    installed: false,
    license: "open",
    licenseUrl: specimenUrl(item.family),
  };
  const fileUrl = regularOrFirstFile(item.files);
  if (fileUrl) info.fileUrl = fileUrl;
  if (item.menu) info.previewFontUrl = item.menu;
  return info;
}

/**
 * The file to read the font's own bytes from: the regular weight where there is
 * one, since that is what the samples are drawn in, and otherwise whatever the
 * family leads with.
 */
function regularOrFirstFile(
  files: Record<string, string> | undefined
): string | undefined {
  if (!files) return undefined;
  return files["regular"] ?? Object.values(files)[0];
}

/** The family's page on fonts.google.com, which carries its licence. */
function specimenUrl(family: string): string {
  return `https://fonts.google.com/specimen/${family.replace(/ /g, "+")}`;
}

/** A `familyFilter` for the Noto families, which between them cover most scripts. */
export function notoOnly(family: string): boolean {
  return /^Noto\b/.test(family);
}

/**
 * The Google subsets an alphabet probably needs, so the API can do the filtering
 * server-side.
 *
 * Best-effort and deliberately small: it knows the blocks a language's alphabet is
 * usually written in, and says nothing rather than guessing when it meets anything
 * else. An alphabet with a single character it doesn't recognize comes back empty,
 * which callers should read as "ask for everything and filter here".
 */
export function guessSubsetsForAlphabet(alphabet: string): string[] {
  const found = new Set<string>();

  for (const character of alphabet) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) continue;
    if (isIgnorable(codePoint)) continue;

    const subsets = subsetsForCodePoint(codePoint);
    if (!subsets) return [];
    for (const subset of subsets) found.add(subset);
  }

  return [...found];
}

/** Spacing, ASCII digits and ASCII punctuation say nothing about the script. */
function isIgnorable(codePoint: number): boolean {
  if (codePoint <= 0x40) return true; // space, digits, most punctuation
  if (codePoint >= 0x5b && codePoint <= 0x60) return true;
  if (codePoint >= 0x7b && codePoint <= 0xbf) return true; // braces, Latin-1 symbols
  return false;
}

function subsetsForCodePoint(codePoint: number): string[] | undefined {
  // Basic Latin letters.
  if (
    (codePoint >= 0x41 && codePoint <= 0x5a) ||
    (codePoint >= 0x61 && codePoint <= 0x7a)
  ) {
    return ["latin"];
  }
  // Latin-1 Supplement letters, Latin Extended-A and -B, and the IPA block that
  // African orthographies draw their extra letters from.
  if (codePoint >= 0xc0 && codePoint <= 0x2af) return ["latin", "latin-ext"];
  if (codePoint >= 0x370 && codePoint <= 0x3ff) return ["greek"];
  if (codePoint >= 0x1f00 && codePoint <= 0x1fff) return ["greek", "greek-ext"];
  if (codePoint >= 0x400 && codePoint <= 0x4ff) return ["cyrillic"];
  if (codePoint >= 0x500 && codePoint <= 0x52f) return ["cyrillic-ext"];
  if (codePoint >= 0x590 && codePoint <= 0x5ff) return ["hebrew"];
  if (codePoint >= 0x600 && codePoint <= 0x6ff) return ["arabic"];
  if (codePoint >= 0x900 && codePoint <= 0x97f) return ["devanagari"];
  if (codePoint >= 0x980 && codePoint <= 0x9ff) return ["bengali"];
  if (codePoint >= 0xb80 && codePoint <= 0xbff) return ["tamil"];
  if (codePoint >= 0xe00 && codePoint <= 0xe7f) return ["thai"];
  if (codePoint >= 0x1200 && codePoint <= 0x137f) return ["ethiopic"];
  // Everything else — the CJK ranges above all, where Google's subsetting doesn't
  // work this way — is left to the caller.
  return undefined;
}
