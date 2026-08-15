/**
 * The same four questions, answered from snapshots shipped in the bundle.
 *
 * The live providers each ask a service over the network (sldrAlphabet.ts,
 * languageFontFinder.ts, sldrFontFeatures.ts, gflanguagesSampleText.ts). On a
 * machine that has no network — or one whose network is the reason the chooser
 * feels broken — the same data can come out of JSON generated from those same
 * sources at build time (tools/refresh*Snapshot.mjs). The answers are older than
 * the services' and are otherwise the answers a host would have got anyway.
 *
 * These providers never fetch. They still return promises and still honour an
 * abort, because they exist to stand behind (or in front of) the live ones
 * through fallback.ts, and a caller must not have to know which of the two it is
 * talking to.
 *
 * The snapshots are imported here and only here, which is what lets a host that
 * doesn't want the ~1.5MB of JSON simply not import `@ethnolib/font-core/bundled`
 * (see bundled.ts). Nothing in src/index.ts may reach this file.
 */

import type { FontLicenseCategory } from "../fontLicense";
import type { FontInfo } from "../fontInfo";
import { throwIfAborted } from "./abort";
import { sampleTextFileId } from "./gflanguagesSampleText";
import { candidateTags } from "./sldrTags";
import type {
  AlphabetProvider,
  FontFeatureDefault,
  FontFeatureDefaultsProvider,
  LanguageFontSuggester,
  SampleText,
  SampleTextProvider,
  SuggestOptions,
} from "./types";
import { parseUnicodeSetToAlphabet } from "./unicodeSet";

import alphabetsSnapshot from "./bundled/alphabets.json";
import fontFeatureDefaultsSnapshot from "./bundled/fontFeatureDefaults.json";
import languageFontsSnapshot from "./bundled/languageFonts.json";
import sampleTextsSnapshot from "./bundled/sampleTexts.json";

/** What the chooser tells the user about a recommendation that came from the bundle. */
const LANGUAGE_FONTS_SOURCE_NAME =
  "SIL language font data bundled with this app";
/**
 * And about a sample paragraph. The words are gflanguages' either way, so the
 * data set is still named; "bundled" is there because the copy may be months
 * old and the user is entitled to know that much.
 */
const SAMPLE_TEXT_SOURCE_NAME = "Google Fonts language data bundled with this app";
const SAMPLE_TEXT_SOURCE_URL = "https://github.com/googlefonts/lang";

/** What we assume when neither the tag nor the host names a script. */
const DEFAULT_SCRIPT = "Latn";

/** The role a language's plain "these are the fonts" answer is filed under. */
const DEFAULT_ROLE = "default";

/** Every language's main exemplar set, as LDML writes it: `alphabets.json`. */
export interface BundledAlphabets {
  generatedAt: string;
  source: string;
  /** Tag → the raw UnicodeSet string, parsed at read time. */
  alphabets: Record<string, string>;
}

/** One family the snapshot can hand over, already resolved to a file and a licence. */
export interface BundledFontFamily {
  family: string;
  ttfUrl: string;
  license?: FontLicenseCategory;
  licenseUrl?: string;
}

/**
 * One "fonts for anything in this script" rule. `regions` narrows it to the
 * places it applies to; the rule without any is the general one, and the
 * snapshot lists the narrow rules before it.
 */
export interface BundledScriptDefaultRule {
  regions?: string[];
  /** Role → family ids, best first. `default` is the one to offer. */
  roles?: Record<string, string[]>;
}

/** Fonts per language and per script: `languageFonts.json`. */
export interface BundledLanguageFonts {
  generatedAt: string;
  sources: string[];
  languages: Record<string, string[]>;
  scriptDefaults: Record<string, BundledScriptDefaultRule[]>;
  families: Record<string, BundledFontFamily>;
}

/** Fonts and feature settings per language: `fontFeatureDefaults.json`. */
export interface BundledFontFeatureDefaults {
  generatedAt: string;
  source: string;
  defaults: Record<string, FontFeatureDefault[]>;
}

/** A passage per `{lang}_{Script}`: `sampleTexts.json`. */
export interface BundledSampleTexts {
  generatedAt: string;
  source: string;
  samples: Record<string, string>;
}

/*
 * The snapshots are plain JSON, so TypeScript infers `string` where these types
 * say `FontLicenseCategory` and nothing at all about which keys exist. The casts
 * assert what the generators guarantee — and what the smoke test in
 * bundled.spec.ts checks against the real files.
 */
const ALPHABETS = alphabetsSnapshot as unknown as BundledAlphabets;
const LANGUAGE_FONTS = languageFontsSnapshot as unknown as BundledLanguageFonts;
const FONT_FEATURE_DEFAULTS =
  fontFeatureDefaultsSnapshot as unknown as BundledFontFeatureDefaults;
const SAMPLE_TEXTS = sampleTextsSnapshot as unknown as BundledSampleTexts;

/** What every bundled provider takes: which snapshot to read. */
interface BundledProviderConfig<TData> {
  /** The snapshot. Defaults to the one shipped in this package. */
  data?: TData;
}

/**
 * The tags to try after the one asked for. Same option, same meaning and same
 * default as the live providers': the walk is what turns `sr-Cyrl` into `sr`,
 * and a flat lookup would answer "nothing" for a tag the snapshot covers.
 */
interface TagFallbackConfig {
  fallbackTagsFor?: (languageTag: string) => string[];
}

/** The script a tag is written in, for tags that don't say so themselves. */
interface ScriptConfig {
  scriptFor?: (languageTag: string) => string | undefined;
}

export type BundledAlphabetProviderConfig =
  BundledProviderConfig<BundledAlphabets> & TagFallbackConfig;

export type BundledLanguageFontSuggesterConfig =
  BundledProviderConfig<BundledLanguageFonts> & TagFallbackConfig & ScriptConfig;

export type BundledFontFeaturesProviderConfig =
  BundledProviderConfig<BundledFontFeatureDefaults> & TagFallbackConfig;

export type BundledSampleTextProviderConfig =
  BundledProviderConfig<BundledSampleTexts> & ScriptConfig;

/** An alphabet provider backed by the bundled SLDR snapshot. */
export function createBundledAlphabetProvider(
  config: BundledAlphabetProviderConfig = {}
): AlphabetProvider {
  const { data = ALPHABETS, fallbackTagsFor } = config;
  const byFoldedTag = lazily(() => foldedIndex(data.alphabets));

  return {
    async getAlphabet(
      languageTag: string,
      options: SuggestOptions = {}
    ): Promise<string | undefined> {
      throwIfAborted(options.signal);
      for (const candidate of candidateTags(languageTag, fallbackTagsFor)) {
        const exemplars = lookUp(data.alphabets, byFoldedTag, candidate);
        if (exemplars === undefined) continue;
        // Parsed here rather than in the generator, so a fix to the parser
        // reaches the bundled alphabets without regenerating anything.
        const alphabet = parseUnicodeSetToAlphabet(exemplars);
        // An entry we could make nothing of is, to the caller, no entry: the
        // next candidate tag gets its turn, exactly as in sldrAlphabet.ts.
        if (alphabet.length > 0) return alphabet;
      }
      return undefined;
    },
  };
}

/** A language-font suggester backed by the bundled font data. */
export function createBundledLanguageFontSuggester(
  config: BundledLanguageFontSuggesterConfig = {}
): LanguageFontSuggester {
  const { data = LANGUAGE_FONTS, fallbackTagsFor, scriptFor } = config;
  const byFoldedTag = lazily(() => foldedIndex(data.languages));
  const byFoldedScript = lazily(() => foldedIndex(data.scriptDefaults));

  return {
    async suggestFontsForLanguage(
      languageTag: string,
      options: SuggestOptions = {}
    ): Promise<FontInfo[]> {
      throwIfAborted(options.signal);
      for (const candidate of candidateTags(languageTag, fallbackTagsFor)) {
        const ids = lookUp(data.languages, byFoldedTag, candidate);
        if (ids?.length) return toFontInfos(ids, data.families);
      }
      // Nothing names this language, but something may name its script: Thai is
      // Thai whoever writes it, and a font that sets the script is a better
      // answer than none.
      const ids = scriptDefaultIds(data, byFoldedScript, languageTag, scriptFor);
      return toFontInfos(ids, data.families);
    },
  };
}

/** A font-feature-defaults provider backed by the bundled SLDR snapshot. */
export function createBundledFontFeaturesProvider(
  config: BundledFontFeaturesProviderConfig = {}
): FontFeatureDefaultsProvider {
  const { data = FONT_FEATURE_DEFAULTS, fallbackTagsFor } = config;
  const byFoldedTag = lazily(() => foldedIndex(data.defaults));

  return {
    async getFontFeatureDefaults(
      languageTag: string,
      options: SuggestOptions = {}
    ): Promise<FontFeatureDefault[]> {
      throwIfAborted(options.signal);
      for (const candidate of candidateTags(languageTag, fallbackTagsFor)) {
        const defaults = lookUp(data.defaults, byFoldedTag, candidate);
        if (defaults?.length) return defaults;
      }
      return [];
    },
  };
}

/** A sample-text provider backed by the bundled gflanguages passages. */
export function createBundledSampleTextProvider(
  config: BundledSampleTextProviderConfig = {}
): SampleTextProvider {
  const { data = SAMPLE_TEXTS, scriptFor } = config;
  const byFoldedId = lazily(() => foldedIndex(data.samples));

  return {
    async getSampleText(
      languageTag: string,
      options: SuggestOptions = {}
    ): Promise<SampleText | undefined> {
      throwIfAborted(options.signal);
      // The same `{lang}_{Script}` the live provider would have fetched, worked
      // out by the same function, so the two agree about what `sr` means.
      const id = sampleTextFileId(languageTag, scriptFor);
      if (!id) return undefined;
      const text = lookUp(data.samples, byFoldedId, id);
      if (!text) return undefined;
      return {
        text,
        source: SAMPLE_TEXT_SOURCE_NAME,
        sourceUrl: SAMPLE_TEXT_SOURCE_URL,
      };
    },
  };
}

/**
 * The families a script's rules name for a tag: the rule for the tag's own
 * region where there is one, otherwise the general rule. The snapshot orders
 * the narrow rules first, and we take the first that matches rather than
 * merging — a language written in Pakistan wants Nastaliq, not Nastaliq
 * followed by everything else in Arabic script.
 */
function scriptDefaultIds(
  data: BundledLanguageFonts,
  byFoldedScript: () => Map<string, BundledScriptDefaultRule[]>,
  languageTag: string,
  scriptFor: ((languageTag: string) => string | undefined) | undefined
): string[] {
  const subtags = languageTag
    .trim()
    .split("-")
    .filter((subtag) => subtag.length > 0);
  if (subtags.length === 0) return [];

  const script = titleCase(
    scriptSubtag(subtags) ?? scriptFor?.(languageTag.trim())?.trim() ?? DEFAULT_SCRIPT
  );
  const rules = lookUp(data.scriptDefaults, byFoldedScript, script);
  if (!rules) return [];

  const region = regionSubtag(subtags);
  const rule =
    (region && rules.find((candidate) => candidate.regions?.includes(region))) ||
    rules.find((candidate) => !candidate.regions);
  if (!rule?.roles) return [];

  // The default role first — it is the answer to "which font for this?" — then
  // whatever else the rule names, so a literacy face is offered rather than
  // dropped.
  const ids: string[] = [];
  for (const role of [DEFAULT_ROLE, ...Object.keys(rule.roles)]) {
    for (const id of rule.roles[role] ?? []) {
      if (!ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

/**
 * Family ids as the chooser's fonts, in the order given. An id the snapshot has
 * no family for is skipped: there would be nothing to download and nothing to
 * name.
 */
function toFontInfos(
  ids: string[],
  families: Record<string, BundledFontFamily>
): FontInfo[] {
  const fonts: FontInfo[] = [];
  for (const id of ids) {
    const family = Object.prototype.hasOwnProperty.call(families, id)
      ? families[id]
      : undefined;
    if (!family?.family || !family.ttfUrl) continue;
    const info: FontInfo = {
      family: family.family,
      installed: false,
      fileUrl: family.ttfUrl,
      // A whole font, not one of Fontsource's per-subset files, so a host may
      // install what it downloads.
      fileIsSubset: false,
      // Everything in this snapshot was put there because somebody recommends
      // it for the language — that is what the data is.
      supportsLanguage: true,
      supportsLanguageSource: { name: LANGUAGE_FONTS_SOURCE_NAME },
    };
    if (family.license) info.license = family.license;
    if (family.licenseUrl) info.licenseUrl = family.licenseUrl;
    fonts.push(info);
  }
  return fonts;
}

/**
 * One key's value: the spelling asked for, then the same key case-folded. The
 * snapshots are keyed the way the SLDR spells tags (`aa-DJ`), and a host that
 * asks in lower case is asking about the same language.
 */
function lookUp<T>(
  record: Record<string, T>,
  byFoldedKey: () => Map<string, T>,
  key: string
): T | undefined {
  if (Object.prototype.hasOwnProperty.call(record, key)) return record[key];
  return byFoldedKey().get(key.toLowerCase());
}

/** Every key folded to lower case, the first spelling of a key winning. */
function foldedIndex<T>(record: Record<string, T>): Map<string, T> {
  const index = new Map<string, T>();
  for (const [key, value] of Object.entries(record)) {
    const folded = key.toLowerCase();
    if (!index.has(folded)) index.set(folded, value);
  }
  return index;
}

/**
 * Built on first use and kept. Folding two thousand keys costs little, but a
 * host that creates a provider and never asks it anything should pay nothing,
 * and one that asks it fifty times should pay once.
 */
function lazily<T>(build: () => T): () => T {
  let built: T | undefined;
  return () => (built ??= build());
}

/** The tag's own script, if it has one; see gflanguagesSampleText.ts. */
function scriptSubtag(subtags: string[]): string | undefined {
  return subtags.slice(1).find((subtag) => /^[A-Za-z]{4}$/.test(subtag));
}

/**
 * The tag's region, if it has one: two letters, or the three digits of a UN
 * area code. Scripts are four letters and variants that short start with a
 * digit, so nothing else in a tag looks like this.
 */
function regionSubtag(subtags: string[]): string | undefined {
  const region = subtags
    .slice(1)
    .find((subtag) => /^[A-Za-z]{2}$/.test(subtag) || /^\d{3}$/.test(subtag));
  return region?.toUpperCase();
}

/** `thai` → `Thai`, which is how ISO 15924 and the snapshot spell it. */
function titleCase(script: string): string {
  return script.charAt(0).toUpperCase() + script.slice(1).toLowerCase();
}
