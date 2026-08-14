/**
 * The SLDR as a source of a language's preferred font features.
 *
 * Beyond alphabets, many SLDR files record which fonts a language's community
 * uses and how those fonts should be set up: `<sil:font name="Andika"
 * features="ss04=1 cv43=2 ...">`. Those feature settings are exactly the shape
 * defaults the character-variant UI wants — that Mazatec text wants its Eng
 * drawn as the capital form — so a user who has chosen their language sees the
 * right letterforms before touching anything.
 *
 * The `features` attribute mixes two kinds of key: OpenType tags (`cv43`,
 * `ss04`) and bare numbers, which are Graphite feature IDs. Only the OpenType
 * ones are kept; a Graphite ID means nothing to the fonts this UI drives. An
 * entry with no usable settings still names a font somebody chose for the
 * language, so it is kept with empty `features` — the name is an answer even
 * when the settings aren't.
 *
 * Same tag-fallback walk, cache and network contract as sldrAlphabet.ts.
 */

import { fetchWithTimeout } from "./abort";
import {
  readCachedSuggestion,
  writeCachedSuggestion,
  type SuggestionCacheStorage,
} from "./suggestionCache";
import { candidateTags } from "./sldrTags";
import type {
  FontFeatureDefault,
  FontFeatureDefaultsProvider,
  SuggestOptions,
} from "./types";

const SLDR_API = "https://ldml.api.sil.org";

const SOURCE = "sldrFontFeatures";
/** Feature recommendations are corrected occasionally and revised rarely. */
const FOUND_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/**
 * A shorter life for "nothing for this language": the repository gains entries,
 * and a language whose settings were added last week shouldn't wait a week.
 */
const MISSING_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Every `<sil:font>` element's attributes. A regex rather than a parser for the
 * same reason as sldrAlphabet.ts: `DOMParser` doesn't exist in Node, and the
 * element we want is childless — everything of interest is in two attributes.
 */
const SIL_FONTS = /<sil:font\b([^>]*?)\/?>/g;

/** An OpenType character-variant or stylistic-set tag; a bare number is Graphite's. */
const OPENTYPE_FEATURE_KEY = /^(cv|ss)\d{2}$/i;

export interface SldrFontFeaturesProviderConfig {
  /** The service to ask. Defaults to the public SLDR API. */
  baseUrl?: string;
  /** Where answers are remembered. Defaults to `localStorage` where there is one. */
  storage?: SuggestionCacheStorage;
  /**
   * The tags to try after the one asked for, best first. Defaults to progressively
   * shorter forms of the tag (`ffm-Latn-SN` → `ffm-Latn`, `ffm`); a host that knows
   * more — a macrolanguage's tag, a neighbouring dialect — can say so here.
   */
  fallbackTagsFor?: (languageTag: string) => string[];
}

/** What we cache when the repository has nothing for a language. */
interface MissingLanguage {
  missing: true;
}

/** A font-feature-defaults provider backed by the SLDR. */
export function createSldrFontFeaturesProvider(
  config: SldrFontFeaturesProviderConfig = {}
): FontFeatureDefaultsProvider {
  const { baseUrl = SLDR_API, storage, fallbackTagsFor } = config;

  return {
    async getFontFeatureDefaults(
      languageTag: string,
      options: SuggestOptions = {}
    ): Promise<FontFeatureDefault[]> {
      for (const candidate of candidateTags(languageTag, fallbackTagsFor)) {
        const defaults = await defaultsForTag(candidate, baseUrl, storage, options);
        // The first tag with an answer wins, and nothing further is asked: the
        // shorter tags are a fallback, not a merge.
        if (defaults !== undefined) return defaults;
      }
      return [];
    },
  };
}

/** What the repository has for one tag, cached either way. */
async function defaultsForTag(
  tag: string,
  baseUrl: string,
  storage: SuggestionCacheStorage | undefined,
  options: SuggestOptions
): Promise<FontFeatureDefault[] | undefined> {
  const key = `lang.${tag.toLowerCase()}`;
  // Two reads of the one entry, because the two answers are worth keeping for
  // different lengths of time: settings we found stay good for a week, a
  // "nothing here" only for a day.
  const cached = readCachedSuggestion<FontFeatureDefault[] | MissingLanguage>(
    SOURCE,
    key,
    FOUND_TTL_MS,
    storage
  );
  if (Array.isArray(cached)) return cached;
  if (
    cached &&
    readCachedSuggestion<FontFeatureDefault[] | MissingLanguage>(
      SOURCE,
      key,
      MISSING_TTL_MS,
      storage
    )
  ) {
    return undefined;
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const url = `${baseUrl}/${encodeURIComponent(tag)}?inc[]=special`;
  const response = await fetchWithTimeout(fetchImpl, url, options.signal);
  if (response.status === 404) {
    writeCachedSuggestion<MissingLanguage>(SOURCE, key, { missing: true }, storage);
    return undefined;
  }
  if (!response.ok) {
    const status = `${response.status} ${response.statusText ?? ""}`.trim();
    throw new Error(`SLDR request failed: ${status}`);
  }

  const defaults = readFontFeatures(await response.text());
  // A file that names no fonts at all is the same to the caller as no file:
  // there is nothing to say, and the next candidate tag gets its turn.
  if (defaults.length === 0) {
    writeCachedSuggestion<MissingLanguage>(SOURCE, key, { missing: true }, storage);
    return undefined;
  }
  writeCachedSuggestion(SOURCE, key, defaults, storage);
  return defaults;
}

/** Every font entry of an LDML document that carries usable feature settings. */
function readFontFeatures(xml: string): FontFeatureDefault[] {
  const defaults: FontFeatureDefault[] = [];
  // A fresh regex each time: SIL_FONTS is global, and a shared one would carry
  // its lastIndex from the previous document into this one.
  const silFonts = new RegExp(SIL_FONTS.source, SIL_FONTS.flags);
  for (let match = silFonts.exec(xml); match !== null; match = silFonts.exec(xml)) {
    const fontName = attribute(match[1], "name");
    if (!fontName) continue;
    const featureList = attribute(match[1], "features");
    defaults.push({
      fontName,
      features: featureList ? readFeatureList(featureList) : {},
    });
  }
  return defaults;
}

/**
 * The OpenType settings of a `features` attribute: space-separated `key=value`
 * pairs, keeping only cv/ss tags with a sensible value. A malformed pair is
 * skipped rather than failing the entry — the well-formed neighbours are still
 * good answers.
 */
function readFeatureList(featureList: string): Record<string, number> {
  const features: Record<string, number> = {};
  for (const pair of featureList.split(/\s+/)) {
    const [key, rawValue, ...extra] = pair.split("=");
    if (!key || rawValue === undefined || extra.length > 0) continue;
    if (!OPENTYPE_FEATURE_KEY.test(key)) continue;
    const value = Number(rawValue);
    if (!Number.isInteger(value) || value < 0) continue;
    features[key.toLowerCase()] = value;
  }
  return features;
}

/** One attribute's decoded value out of an element's attribute text, if present. */
function attribute(attributes: string, name: string): string | undefined {
  const match = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`).exec(attributes);
  return match ? decodeEntities(match[1]) : undefined;
}

/**
 * The five XML entities, since we are reading attribute text ourselves rather
 * than letting a parser hand it to us decoded. Font names are the only place
 * these plausibly appear. `&amp;` goes last so `&amp;lt;` stays the text `&lt;`.
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
