/**
 * Asking a second source when the first one couldn't answer.
 *
 * A host that ships the bundled snapshots (see `@ethnolib/font-core/bundled`)
 * wants the live service first — it is newer — and the snapshot when the network
 * is gone. That is the whole of what these do: primary, then fallback, on
 * failure only.
 *
 * "On failure only" is the point, and it is why this can't be a `catch` that
 * treats anything unhelpful as a miss. The interfaces in types.ts distinguish
 * three outcomes, and two of them are answers:
 *
 * - A throw is "we don't know" — try the other source.
 * - An empty array or `undefined` is "there is nothing for this language", said
 *   definitely. It is passed straight through: falling back here would replace a
 *   correct "no fonts for this" with a stale snapshot's older opinion, and would
 *   do it on every language the services have deliberately nothing for.
 * - An abort is the caller's own doing. It is rethrown untouched and the
 *   fallback is never called: a caller that moved on to another language must
 *   not receive an answer about the one it abandoned.
 *
 * These take providers rather than being providers, so a host can wrap whichever
 * of the four it has, in either order, and hand the result to the chooser, which
 * cannot tell the difference.
 */

import { isAbortError, throwIfAborted } from "./abort";
import type {
  AlphabetFontSuggester,
  AlphabetProvider,
  AlphabetSuggestOptions,
  FontFeatureDefaultsProvider,
  LanguageFontSuggester,
  SampleTextProvider,
  SuggestOptions,
} from "./types";

export interface FallbackOptions {
  /**
   * Called with the primary's failure just before the fallback is asked, so a
   * host can say "answered from bundled data" — or log the failure, which is
   * otherwise swallowed by the fallback succeeding.
   */
  onFellBack?: (error: unknown) => void;
}

/** An alphabet provider that asks `fallback` when `primary` fails. */
export function withAlphabetProviderFallback(
  primary: AlphabetProvider,
  fallback: AlphabetProvider,
  options: FallbackOptions = {}
): AlphabetProvider {
  return {
    getAlphabet: (languageTag, callOptions) =>
      attempt(
        () => primary.getAlphabet(languageTag, callOptions),
        () => fallback.getAlphabet(languageTag, callOptions),
        callOptions,
        options
      ),
  };
}

/** A language-font suggester that asks `fallback` when `primary` fails. */
export function withLanguageFontSuggesterFallback(
  primary: LanguageFontSuggester,
  fallback: LanguageFontSuggester,
  options: FallbackOptions = {}
): LanguageFontSuggester {
  return {
    suggestFontsForLanguage: (languageTag, callOptions) =>
      attempt(
        () => primary.suggestFontsForLanguage(languageTag, callOptions),
        () => fallback.suggestFontsForLanguage(languageTag, callOptions),
        callOptions,
        options
      ),
  };
}

/** A font-feature-defaults provider that asks `fallback` when `primary` fails. */
export function withFontFeatureDefaultsFallback(
  primary: FontFeatureDefaultsProvider,
  fallback: FontFeatureDefaultsProvider,
  options: FallbackOptions = {}
): FontFeatureDefaultsProvider {
  return {
    getFontFeatureDefaults: (languageTag, callOptions) =>
      attempt(
        () => primary.getFontFeatureDefaults(languageTag, callOptions),
        () => fallback.getFontFeatureDefaults(languageTag, callOptions),
        callOptions,
        options
      ),
  };
}

/** A sample-text provider that asks `fallback` when `primary` fails. */
export function withSampleTextFallback(
  primary: SampleTextProvider,
  fallback: SampleTextProvider,
  options: FallbackOptions = {}
): SampleTextProvider {
  return {
    getSampleText: (languageTag, callOptions) =>
      attempt(
        () => primary.getSampleText(languageTag, callOptions),
        () => fallback.getSampleText(languageTag, callOptions),
        callOptions,
        options
      ),
  };
}

/**
 * An alphabet-font suggester that asks `fallback` when `primary` fails.
 *
 * `onProgress` goes to whichever source is running, so a fallback that publishes
 * as it goes still does. A primary that published some fonts and then failed
 * leaves the caller with the fallback's list instead — the resolved value is the
 * answer, and progress is only ever a preview of it.
 */
export function withAlphabetFontSuggesterFallback(
  primary: AlphabetFontSuggester,
  fallback: AlphabetFontSuggester,
  options: FallbackOptions = {}
): AlphabetFontSuggester {
  return {
    suggestFontsForAlphabet: (alphabet, callOptions) =>
      attempt(
        () => primary.suggestFontsForAlphabet(alphabet, callOptions),
        () => fallback.suggestFontsForAlphabet(alphabet, callOptions),
        callOptions,
        options
      ),
  };
}

/** The one rule all five share. */
async function attempt<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  callOptions: SuggestOptions | AlphabetSuggestOptions | undefined,
  { onFellBack }: FallbackOptions
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    if (isAbortError(error)) throw error;
    // A caller that cancelled while the primary was failing gets its abort,
    // not a second request's worth of work it has no use for.
    throwIfAborted(callOptions?.signal);
    onFellBack?.(error);
    return await fallback();
  }
}
