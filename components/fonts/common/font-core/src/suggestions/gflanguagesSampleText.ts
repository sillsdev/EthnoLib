/**
 * Google's gflanguages data as a source of sample text.
 *
 * The chooser draws every font over the same words, and where those words are a
 * canned Latin pangram the samples say nothing to somebody choosing a font for
 * Thai or Fulfulde. gflanguages carries, per language and script, a real passage —
 * the Universal Declaration of Human Rights, mostly — cut to several lengths, and
 * that is what this hands back.
 *
 * One file per `{lang}_{Script}` pair, so the script matters as much as the
 * language: `sr_Cyrl` and `sr_Latn` are both there and are not interchangeable. A
 * tag that names its own script settles it; otherwise the host can say
 * (`scriptFor`), and failing that we assume Latin, which is what the great majority
 * of the tags without a script subtag mean.
 *
 * The files are protobuf text format. We read the one block we want with a small
 * brace-aware scan rather than a parser: pulling in a protobuf runtime to fetch a
 * sentence would be out of all proportion, and the fields we want are quoted
 * strings one to a line. Anything else in the file is left alone.
 */

import { fetchWithTimeout } from "./abort";
import {
  readCachedSuggestion,
  writeCachedSuggestion,
  type SuggestionCacheStorage,
} from "./suggestionCache";
import type { SampleText, SampleTextProvider, SuggestOptions } from "./types";

const GFLANGUAGES_DATA =
  "https://raw.githubusercontent.com/googlefonts/lang/main/Lib/gflanguages/data/languages";

const SOURCE = "gflanguages";
/** What the chooser tells the user about where their sample paragraph came from. */
const SOURCE_NAME = "Google Fonts language data";
const SOURCE_URL = "https://github.com/googlefonts/lang";
/** The passages change when somebody corrects a translation, which is rare. */
const FOUND_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** A shorter life for "no such file": the data set gains languages. */
const MISSING_TTL_MS = 24 * 60 * 60 * 1000;

/** What we assume when neither the tag nor the host names a script. */
const DEFAULT_SCRIPT = "Latn";

/**
 * Which field to draw with, best first.
 *
 * A paragraph or two, rather than the longest thing in the file or the shortest:
 * `specimen_21` is sized for reading at 21px, which is about what the chooser shows,
 * and the fallbacks are the next-nearest lengths. One field's value, never two
 * joined — each is already a whole passage, and concatenating them would only make
 * a wall of text.
 */
const PREFERRED_FIELDS = [
  "specimen_21",
  "specimen_16",
  "tester",
  "styles",
] as const;

export interface GflanguagesSampleTextProviderConfig {
  /** Where the language files live. Defaults to the data set on GitHub. */
  baseUrl?: string;
  /** Where answers are remembered. Defaults to `localStorage` where there is one. */
  storage?: SuggestionCacheStorage;
  /**
   * The script a tag is written in, as an ISO 15924 code (`"Thai"`), for tags that
   * don't say. Consulted only when the tag carries no script subtag of its own.
   */
  scriptFor?: (languageTag: string) => string | undefined;
}

/** What we cache when the data set has no file for a language and script. */
interface MissingLanguage {
  missing: true;
}

/** A sample-text provider backed by gflanguages. */
export function createGflanguagesSampleTextProvider(
  config: GflanguagesSampleTextProviderConfig = {}
): SampleTextProvider {
  const { baseUrl = GFLANGUAGES_DATA, storage, scriptFor } = config;

  return {
    async getSampleText(
      languageTag: string,
      options: SuggestOptions = {}
    ): Promise<SampleText | undefined> {
      const id = sampleTextFileId(languageTag, scriptFor);
      if (!id) return undefined;
      const key = `sample.${id}`;
      // Two reads of the one entry, because the two answers are worth keeping for
      // different lengths of time: a passage stays good for a week, a "no such
      // file" only for a day.
      const cached = readCachedSuggestion<SampleText | MissingLanguage>(
        SOURCE,
        key,
        FOUND_TTL_MS,
        storage
      );
      // The whole SampleText goes into the cache, provenance included, so a
      // sample read back from storage can still say where it came from.
      if (isSampleText(cached)) return cached;
      if (
        cached &&
        readCachedSuggestion<SampleText | MissingLanguage>(
          SOURCE,
          key,
          MISSING_TTL_MS,
          storage
        )
      ) {
        return undefined;
      }

      const fetchImpl = options.fetchImpl ?? fetch;
      const url = `${baseUrl}/${id}.textproto`;
      const response = await fetchWithTimeout(fetchImpl, url, options.signal);
      if (response.status === 404) {
        writeCachedSuggestion<MissingLanguage>(
          SOURCE,
          key,
          { missing: true },
          storage
        );
        return undefined;
      }
      if (!response.ok) {
        const status = `${response.status} ${response.statusText ?? ""}`.trim();
        throw new Error(`gflanguages request failed: ${status}`);
      }

      const text = readSampleText(await response.text());
      // A file with no usable passage is the same to the caller as no file: there
      // is nothing to draw the samples with.
      if (!text) {
        writeCachedSuggestion<MissingLanguage>(
          SOURCE,
          key,
          { missing: true },
          storage
        );
        return undefined;
      }
      const sample: SampleText = {
        text,
        source: SOURCE_NAME,
        sourceUrl: SOURCE_URL,
      };
      writeCachedSuggestion<SampleText>(SOURCE, key, sample, storage);
      return sample;
    },
  };
}

/** Which of the two things we cache under a key this one is. */
function isSampleText(
  cached: SampleText | MissingLanguage | undefined
): cached is SampleText {
  return !!cached && typeof (cached as SampleText).text === "string";
}

/**
 * The `{lang}_{Script}` the data set files itself under, or undefined for a tag
 * with no language in it at all.
 *
 * Exported because the bundled snapshot is keyed by exactly this id
 * (bundledProviders.ts): if the two worked out `sr` differently, the offline
 * answer would be a different language's passage from the online one.
 */
export function sampleTextFileId(
  languageTag: string,
  scriptFor: ((languageTag: string) => string | undefined) | undefined
): string | undefined {
  const tag = languageTag.trim();
  const subtags = tag.split("-").filter((subtag) => subtag.length > 0);
  const language = subtags[0]?.toLowerCase();
  if (!language) return undefined;

  const script =
    scriptSubtag(subtags) ?? scriptFor?.(tag)?.trim() ?? DEFAULT_SCRIPT;
  return `${language}_${titleCase(script)}`;
}

/**
 * The tag's own script, if it has one: four letters, all of them letters, after the
 * language. Regions are two letters or three digits and variants that are four
 * characters long start with a digit, so nothing else in a tag looks like this.
 */
function scriptSubtag(subtags: string[]): string | undefined {
  return subtags.slice(1).find((subtag) => /^[A-Za-z]{4}$/.test(subtag));
}

/** `thai` → `Thai`, which is how ISO 15924 and the file names spell it. */
function titleCase(script: string): string {
  return script.charAt(0).toUpperCase() + script.slice(1).toLowerCase();
}

/** The passage to draw with out of one file, if it holds one. */
function readSampleText(textproto: string): string | undefined {
  const block = sampleTextBlock(textproto);
  if (block === undefined) return undefined;
  const fields = stringFields(block);
  for (const field of PREFERRED_FIELDS) {
    const value = fields.get(field);
    if (value) return value;
  }
  return undefined;
}

/**
 * The body of the file's `sample_text { ... }`, brace-counted so a nested block or
 * a brace inside a quoted string can't end it early — the `punctuation` field of
 * some languages really does contain one.
 */
function sampleTextBlock(textproto: string): string | undefined {
  const opening = /(^|\n)\s*sample_text\s*\{/.exec(textproto);
  if (!opening) return undefined;

  const start = opening.index + opening[0].length;
  let depth = 1;
  let inString = false;
  for (let at = start; at < textproto.length; at++) {
    const character = textproto[at];
    if (inString) {
      // A backslash escapes whatever follows it, the closing quote included.
      if (character === "\\") at++;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "{") depth++;
    else if (character === "}" && --depth === 0) {
      return textproto.slice(start, at);
    }
  }
  // An unterminated block is somebody's truncated download; take what is there.
  return textproto.slice(start);
}

/**
 * Every `name: "value"` in a block, unescaped, first occurrence winning. Fields
 * that aren't strings are not ours and are skipped by the shape of the match.
 */
function stringFields(block: string): Map<string, string> {
  const fields = new Map<string, string>();
  const pattern = /([A-Za-z_][A-Za-z0-9_]*)\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  for (
    let match = pattern.exec(block);
    match !== null;
    match = pattern.exec(block)
  ) {
    if (!fields.has(match[1])) fields.set(match[1], unescapeString(match[2]));
  }
  return fields;
}

/**
 * What the quoted string means: the escapes protobuf text format needs for a value
 * to survive being written on one line. One pass, so a `\\n` is a backslash
 * followed by an `n` and not a newline.
 */
function unescapeString(value: string): string {
  return value.replace(/\\(.)/g, (_, escaped: string) => {
    switch (escaped) {
      case "n":
        return "\n";
      case "t":
        return "\t";
      case "r":
        return "\r";
      default:
        // A quote, a backslash, or something we don't know: the character itself.
        return escaped;
    }
  });
}
