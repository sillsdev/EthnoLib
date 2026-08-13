/**
 * The Language Font Finder as a source of fonts for a language.
 *
 * Unlike the coverage-driven route (fontsource.ts), this is somebody's judgement:
 * the service holds, per language tag, the fonts people who work on that language
 * actually recommend, in the order they recommend them, with a default marked. So
 * where it has an answer it is a better answer than any amount of range-checking
 * can produce, and the ordering here is deliberately the service's own rather than
 * anything we re-sort.
 *
 * We keep only families we could actually hand the user — one with no downloadable
 * TTF, or one marked as not distributable, is dropped rather than shown as
 * something the chooser then can't fetch. Licences we don't recognise come through
 * as `"unknown"` instead of being guessed at.
 */

import type { FontInfo } from "../fontInfo";
import {
  readCachedSuggestion,
  writeCachedSuggestion,
  type SuggestionCacheStorage,
} from "./suggestionCache";
import type { LanguageFontSuggester, SuggestOptions } from "./types";

const LFF_API = "https://lff.api.languagetechnology.org";

const SOURCE = "lff";
/** Recommendations change when a font is released, which is neither often nor urgent. */
const TTL_MS = 24 * 60 * 60 * 1000;

/** The weight and style we would rather download; see `ttfUrl`. */
const PREFERRED_WEIGHT = 400;

/**
 * A `github.com/{owner}/{repo}/raw/{ref}/{path}` download, which is most of what
 * the service points at for the Noto families. See `corsFriendlyUrl`.
 */
const GITHUB_RAW = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/raw\/(.+)$/;

export interface LanguageFontFinderConfig {
  /** The service to ask. Defaults to the public one. */
  baseUrl?: string;
  /** Where answers are remembered. Defaults to `localStorage` where there is one. */
  storage?: SuggestionCacheStorage;
  /**
   * Offer only the fonts the service marks as defaults for the language, rather
   * than everything it knows. Two or three curated families rather than a list.
   */
  defaultsOnly?: boolean;
}

/** One font file as the service describes it. */
interface LffFile {
  axes?: { wght?: number; ital?: number };
  url?: string;
}

/** One family as the service describes it. */
interface LffFamily {
  family?: string;
  familyid?: string;
  license?: string;
  distributable?: boolean;
  defaults?: { ttf?: string };
  files?: Record<string, LffFile>;
  packageurl?: string;
  siteurl?: string;
  source?: string;
  version?: string;
}

interface LffResponse {
  roles?: { default?: string[] };
  defaultfamily?: string[];
  families?: Record<string, LffFamily>;
}

/** What we cache when the service says it has never heard of the language. */
interface MissingLanguage {
  missing: true;
}

/** A suggester backed by the Language Font Finder. */
export function createLanguageFontFinderSuggester(
  config: LanguageFontFinderConfig = {}
): LanguageFontSuggester {
  const { baseUrl = LFF_API, storage, defaultsOnly = false } = config;

  return {
    async suggestFontsForLanguage(
      languageTag: string,
      options: SuggestOptions = {}
    ): Promise<FontInfo[]> {
      const tag = languageTag.trim();
      const key = `lang.${tag.toLowerCase()}`;
      const cached = readCachedSuggestion<FontInfo[] | MissingLanguage>(
        SOURCE,
        key,
        TTL_MS,
        storage
      );
      if (Array.isArray(cached)) return cached;
      // A language the service has no entry for is an answer, and worth keeping:
      // otherwise every visit to the chooser asks again about a tag that will
      // never have fonts.
      if (cached) return [];

      const fetchImpl = options.fetchImpl ?? fetch;
      const url = `${baseUrl}/lang/${encodeURIComponent(tag)}`;
      const response = await fetchImpl(url, { signal: options.signal });
      if (response.status === 404) {
        writeCachedSuggestion<MissingLanguage>(
          SOURCE,
          key,
          { missing: true },
          storage
        );
        return [];
      }
      if (!response.ok) {
        const status = `${response.status} ${response.statusText ?? ""}`.trim();
        throw new Error(`Language Font Finder request failed: ${status}`);
      }

      const body = (await response.json()) as LffResponse;
      const fonts = toFontInfos(body, defaultsOnly);
      writeCachedSuggestion(SOURCE, key, fonts, storage);
      return fonts;
    },
  };
}

function toFontInfos(body: LffResponse, defaultsOnly: boolean): FontInfo[] {
  const families = body.families ?? {};
  const fonts: FontInfo[] = [];
  for (const id of orderedIds(body, defaultsOnly)) {
    const font = toFontInfo(families[id]);
    if (font) fonts.push(font);
  }
  return fonts;
}

/**
 * Which families to offer and in what order: the ones filling the language's
 * default role first, in the order the service put them in, then anything else it
 * calls a default family, then the rest alphabetically so a long list is at least
 * predictable.
 */
function orderedIds(body: LffResponse, defaultsOnly: boolean): string[] {
  const families = body.families ?? {};
  const ordered: string[] = [];
  const add = (id: string) => {
    if (families[id] && !ordered.includes(id)) ordered.push(id);
  };

  for (const id of body.roles?.default ?? []) add(id);
  for (const id of body.defaultfamily ?? []) add(id);
  if (defaultsOnly) return ordered;

  for (const id of Object.keys(families).sort()) add(id);
  return ordered;
}

function toFontInfo(family: LffFamily | undefined): FontInfo | undefined {
  if (!family) return undefined;
  // Not everything the service knows about may be passed on; a font we are told
  // not to redistribute is one the chooser must not offer to download.
  if (family.distributable === false) return undefined;

  const fileUrl = corsFriendlyUrl(ttfUrl(family));
  if (!fileUrl) return undefined;

  const name = family.family ?? family.familyid;
  if (!name) return undefined;

  const info: FontInfo = {
    family: name,
    installed: false,
    license: classify(family.license),
    fileUrl,
    // Everything this service returns for a language is a recommendation for that
    // language — that is the whole of what it holds.
    supportsLanguage: true,
  };
  if (family.siteurl) info.licenseUrl = family.siteurl;
  return info;
}

/**
 * "open" only for the licences we know let us hand the font over — the OFL and
 * Apache, which is nearly everything here. Anything else is "unknown" rather than
 * a guess: the chooser can say it doesn't know, and saying "open" wrongly is the
 * one mistake that matters.
 */
function classify(license: string | undefined): FontInfo["license"] {
  const name = (license ?? "").trim().toUpperCase();
  if (name.startsWith("OFL") || name.startsWith("APACHE")) return "open";
  return "unknown";
}

/**
 * The same file, on a host a browser is allowed to read.
 *
 * The service hands out download links on `github.com`, which serves no
 * `Access-Control-Allow-Origin` at all: fetching one from a page fails with
 * `net::ERR_FAILED` before the redirect it would have followed, so the chooser
 * cannot read the font's tables and cannot offer it. `raw.githubusercontent.com` —
 * where that link redirects to anyway — serves `access-control-allow-origin: *`,
 * verified against `NotoSansThai-Regular.ttf`. The path after `/raw/` carries
 * through untouched, including the `refs/heads/{branch}` form the service sometimes
 * uses. Anything not shaped like a GitHub download is left exactly as it came.
 */
function corsFriendlyUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  const match = GITHUB_RAW.exec(url);
  if (!match) return url;
  const [, owner, repo, refAndPath] = match;
  return `https://raw.githubusercontent.com/${owner}/${repo}/${refAndPath}`;
}

/**
 * The file to fetch the font's bytes from: the family's own nominated regular TTF
 * where it has one, otherwise an upright regular weight, otherwise any TTF at all.
 * Nothing at all where the service lists no downloadable file — which happens, for
 * families it can only point at a zip or a web page for.
 */
function ttfUrl(family: LffFamily): string | undefined {
  const files = family.files ?? {};
  const nominated = family.defaults?.ttf;
  if (nominated && files[nominated]?.url) return files[nominated].url;

  const entries = Object.entries(files).filter(([name]) =>
    name.toLowerCase().endsWith(".ttf")
  );
  const regular = entries.find(
    ([, file]) =>
      file.url &&
      file.axes?.wght === PREFERRED_WEIGHT &&
      (file.axes?.ital ?? 0) === 0
  );
  if (regular) return regular[1].url;
  return entries.find(([, file]) => file.url)?.[1].url;
}
