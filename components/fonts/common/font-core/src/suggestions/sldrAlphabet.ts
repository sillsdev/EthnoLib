/**
 * The SLDR as a source of a language's alphabet.
 *
 * The SIL Locale Data Repository holds LDML for thousands of languages, including
 * the exemplar characters — the set of characters the language is actually written
 * with. That is exactly what the chooser's alphabet field wants, so a user who has
 * chosen their language need not type their alphabet out to find fonts that can
 * write it.
 *
 * We ask for the `characters` section only and take the main exemplar set: the
 * `auxiliary`, `index`, `numbers` and `punctuation` sets sit right beside it in the
 * same element name, and they are a different question. Auxiliary characters
 * appear in loanwords and names, and demanding a font cover them would rule out
 * fonts that write the language perfectly well.
 *
 * A tag that has no entry, or an entry with nothing usable in it, is retried with
 * shorter tags: the repository is keyed by tag, and a user working in
 * `ffm-Latn-SN` is written with the same letters as `ffm`. The host can replace
 * that chain with one of its own (`fallbackTagsFor`), which is where knowledge this
 * package hasn't got — that a tag belongs to a macrolanguage, say — belongs.
 */

import {
  readCachedSuggestion,
  writeCachedSuggestion,
  type SuggestionCacheStorage,
} from "./suggestionCache";
import { candidateTags } from "./sldrTags";
import type { AlphabetProvider, SuggestOptions } from "./types";
import { parseUnicodeSetToAlphabet } from "./unicodeSet";

const SLDR_API = "https://ldml.api.sil.org";

const SOURCE = "sldr";
/** Exemplar data is corrected occasionally and revised rarely. */
const FOUND_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/**
 * A shorter life for "no such language": the repository gains languages, and a
 * user whose language was added last week shouldn't wait a week to benefit.
 */
const MISSING_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Every `<exemplarCharacters>` element, with its attributes captured so the typed
 * siblings can be told from the main set — LDML spells the main set as the one
 * carrying no `type`, and the others differ from it in nothing else.
 *
 * A regex rather than a parser on purpose. `DOMParser` doesn't exist in Node, so
 * tests would need a parser dependency for nothing: the element we want has no
 * children and no namespace. Anything more elaborate in the file is somebody
 * else's data and we don't touch it.
 *
 * The attributes have to be read rather than forbidden, because the main set in a
 * minority-language file usually carries `draft="unconfirmed"` or
 * `draft="generated"` — verified against the repository's live `ffm`, whose whole
 * alphabet sits in a `draft="unconfirmed"` element. Refusing those would throw away
 * the alphabets of exactly the languages this is for.
 */
const EXEMPLARS = /<exemplarCharacters([^>]*)>([\s\S]*?)<\/exemplarCharacters\s*>/g;

export interface SldrAlphabetProviderConfig {
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

/** An alphabet provider backed by the SLDR. */
export function createSldrAlphabetProvider(
  config: SldrAlphabetProviderConfig = {}
): AlphabetProvider {
  const { baseUrl = SLDR_API, storage, fallbackTagsFor } = config;

  return {
    async getAlphabet(
      languageTag: string,
      options: SuggestOptions = {}
    ): Promise<string | undefined> {
      for (const candidate of candidateTags(languageTag, fallbackTagsFor)) {
        const alphabet = await alphabetForTag(
          candidate,
          baseUrl,
          storage,
          options
        );
        // The first tag with an alphabet wins, and nothing further is asked: the
        // shorter tags are a fallback, not a merge.
        if (alphabet !== undefined) return alphabet;
      }
      return undefined;
    },
  };
}

/** What the repository has for one tag, cached either way. */
async function alphabetForTag(
  tag: string,
  baseUrl: string,
  storage: SuggestionCacheStorage | undefined,
  options: SuggestOptions
): Promise<string | undefined> {
  const key = `lang.${tag.toLowerCase()}`;
  // Two reads of the one entry, because the two answers are worth keeping for
  // different lengths of time: an alphabet we found stays good for a week, a
  // "no such language" only for a day.
  const cached = readCachedSuggestion<string | MissingLanguage>(
    SOURCE,
    key,
    FOUND_TTL_MS,
    storage
  );
  if (typeof cached === "string") return cached;
  if (
    cached &&
    readCachedSuggestion<string | MissingLanguage>(
      SOURCE,
      key,
      MISSING_TTL_MS,
      storage
    )
  ) {
    return undefined;
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const url = `${baseUrl}/${encodeURIComponent(tag)}?inc[]=characters`;
  const response = await fetchImpl(url, { signal: options.signal });
  if (response.status === 404) {
    writeCachedSuggestion<MissingLanguage>(SOURCE, key, { missing: true }, storage);
    return undefined;
  }
  if (!response.ok) {
    const status = `${response.status} ${response.statusText ?? ""}`.trim();
    throw new Error(`SLDR request failed: ${status}`);
  }

  const alphabet = readMainExemplars(await response.text());
  // An entry with no main exemplar set, or one we could make nothing of, is the
  // same to the caller as no entry: there is no alphabet to fill in, and the next
  // candidate tag gets its turn.
  if (!alphabet) {
    writeCachedSuggestion<MissingLanguage>(SOURCE, key, { missing: true }, storage);
    return undefined;
  }
  writeCachedSuggestion(SOURCE, key, alphabet, storage);
  return alphabet;
}

/** The main exemplar set of an LDML document as an alphabet, if it has one. */
function readMainExemplars(xml: string): string | undefined {
  // A fresh regex each time: EXEMPLARS is global, and a shared one would carry its
  // lastIndex from the previous document into this one.
  const exemplars = new RegExp(EXEMPLARS.source, EXEMPLARS.flags);
  for (
    let match = exemplars.exec(xml);
    match !== null;
    match = exemplars.exec(xml)
  ) {
    if (/\btype\s*=/.test(match[1])) continue;
    const alphabet = parseUnicodeSetToAlphabet(decodeEntities(match[2]));
    if (alphabet.length > 0) return alphabet;
  }
  return undefined;
}

/**
 * The five XML entities and numeric references, since we are reading the text of
 * the element rather than letting a parser hand it to us decoded. `&amp;` goes
 * last so that `&amp;lt;` comes out as the text `&lt;` and not as `<`.
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => fromCodePoint(hex, 16))
    .replace(/&#(\d+);/g, (_, digits: string) => fromCodePoint(digits, 10))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** The character a numeric reference names, or the reference itself if it names none. */
function fromCodePoint(digits: string, radix: number): string {
  const codePoint = parseInt(digits, radix);
  if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
    return radix === 16 ? `&#x${digits};` : `&#${digits};`;
  }
  return String.fromCodePoint(codePoint);
}
