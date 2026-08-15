/**
 * What a font-suggestion source looks like from the outside.
 *
 * Three different questions get asked of the network when somebody picks a
 * language: which fonts are recommended *for that language* (someone has curated
 * an answer), which fonts can *write a given alphabet* (a catalog plus coverage
 * data answers it mechanically), and what the language's alphabet even is. Each
 * gets its own interface so a host can supply, replace or leave out any one of
 * them, and so the UI can ask whichever it has without knowing who answers.
 *
 * Every implementation in this package holds to the same three rules:
 *
 * - A network failure **throws**. Silence would be indistinguishable from "there
 *   is nothing for this language", and that is the difference between "try again"
 *   and "stop asking".
 * - An empty array (or `undefined`) means the service answered, definitely, that
 *   it has nothing. That answer is worth caching; a failure is not.
 * - An abort propagates untouched. A caller that cancelled gets its own
 *   `AbortError` back rather than an empty result, so a superseded request can't
 *   be mistaken for an answer about the language the user has now chosen.
 */

import type { FontInfo } from "../fontInfo";

/** What every suggestion call takes: how to cancel it, and who does the fetching. */
export interface SuggestOptions {
  /** Cancels the call. Passed to every fetch the provider makes. */
  signal?: AbortSignal;
  /** For tests, and for hosts whose fetch needs credentials, a proxy or a timeout. */
  fetchImpl?: typeof fetch;
}

/** What an alphabet suggester takes on top of the usual: a way to answer early. */
export interface AlphabetSuggestOptions extends SuggestOptions {
  /**
   * The answer so far, called each time it grows. Checking a family's coverage
   * costs a font file, so a shortlist of fifty takes seconds; this is what lets
   * the caller show the first fonts while the rest are still being checked.
   *
   * The list only ever grows at its end — a family is published once every
   * family ahead of it has been decided — so a font on screen never moves. The
   * final list is the resolved value, and is what the last call passes too.
   */
  onProgress?: (fontsSoFar: FontInfo[]) => void;
}

/** A source that can say which fonts can write a given alphabet. */
export interface AlphabetFontSuggester {
  /**
   * Fonts that cover every character of `alphabet` (space-separated entries, as
   * `parseAlphabet` reads). Empty when nothing in the source covers it.
   *
   * @throws on network failure, and rethrows an abort untouched.
   */
  suggestFontsForAlphabet(
    alphabet: string,
    options?: AlphabetSuggestOptions
  ): Promise<FontInfo[]>;
}

/** A source that has been told which fonts suit a language. */
export interface LanguageFontSuggester {
  /**
   * Fonts recommended for a language, best first. Empty when the source has no
   * entry for the tag — which it may well not, and which is not an error.
   *
   * @throws on network failure, and rethrows an abort untouched.
   */
  suggestFontsForLanguage(
    languageTag: string,
    options?: SuggestOptions
  ): Promise<FontInfo[]>;
}

/** A source that knows the characters a language is written with. */
export interface AlphabetProvider {
  /**
   * The language's alphabet as space-separated entries, ready to put in the
   * alphabet field, or undefined when the source has nothing for the tag.
   *
   * @throws on network failure, and rethrows an abort untouched.
   */
  getAlphabet(
    languageTag: string,
    options?: SuggestOptions
  ): Promise<string | undefined>;
}

/** One font recommended for a language, with any feature settings it should get. */
export interface FontFeatureDefault {
  /** The family the recommendation is about, as the source names it, e.g. "Andika". */
  fontName: string;
  /**
   * Feature tag → value, e.g. { cv43: 2, ss04: 1 }. OpenType tags only. Empty
   * for a font the source names without settings — still a recommendation.
   */
  features: Record<string, number>;
}

/**
 * A source that knows which fonts a language's community uses and which font
 * features its writing wants — that Mazatec, say, wants its Eng drawn as the
 * capital form. Implemented here over the SLDR (sldrFontFeatures.ts).
 */
export interface FontFeatureDefaultsProvider {
  /**
   * Every font the source names for this tag, feature settings included where
   * it has them. Empty when the source answered, definitely, that it names
   * none.
   *
   * @throws on network failure, and rethrows an abort untouched.
   */
  getFontFeatureDefaults(
    languageTag: string,
    options?: SuggestOptions
  ): Promise<FontFeatureDefault[]>;
}

/** Words plus where they came from — the provenance survives caching. */
export interface SampleText {
  text: string;
  /** Human-readable name of the data source, e.g. "Google Fonts language data". */
  source: string;
  /** A page a person could visit to see the source. */
  sourceUrl?: string;
}

/**
 * A source of words to draw the samples with, so the chooser can show a font
 * writing the user's own language rather than a canned pangram. Implemented here
 * over Google's gflanguages data (gflanguagesSampleText.ts), which carries a real
 * passage per language and script.
 */
export interface SampleTextProvider {
  /**
   * A sentence in the language, for drawing samples with, and the name of
   * whoever supplied it — the UI says so, since a sample nobody can trace is a
   * sample nobody can check. Undefined when the source has nothing for the tag.
   *
   * @throws on network failure, and rethrows an abort untouched.
   */
  getSampleText(
    languageTag: string,
    options?: SuggestOptions
  ): Promise<SampleText | undefined>;
}
