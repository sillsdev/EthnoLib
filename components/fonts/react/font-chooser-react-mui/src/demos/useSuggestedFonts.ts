/**
 * The demo's stand-in for what a host app does to fill the `fonts` prop.
 *
 * It starts from the language the host says it is working in. The Language Font
 * Finder has a curated answer for that language; the SLDR says what its alphabet
 * is, and Fontsource says mechanically which of its families cover those letters —
 * or the letters the user has since edited into the field. Nothing here needs an
 * API key, so the demo works out of the box.
 *
 * Deliberately not exported from the package: a host app owns this decision, and
 * this is one plausible shape for it rather than the one we ship.
 */

import { useEffect, useMemo, useState } from "react";
import {
  createFontsourceSuggester,
  createLanguageFontFinderSuggester,
  createSldrAlphabetProvider,
  createSldrFontFeaturesProvider,
  type FontFeatureDefault,
} from "@ethnolib/font-core";
import { getLanguageBySubtag } from "@ethnolib/find-language";
import type { FontInfo } from "../types";

export interface SuggestedFontsInput {
  /** What is in the alphabet field, whether typed or filled in from the SLDR. */
  alphabet: string;
  /** The chosen language. */
  languageTag: string;
}

export interface SuggestedFonts {
  /** Undefined while we have no answer yet; empty when the answer was "nothing". */
  fonts?: FontInfo[];
  /**
   * That there is a language whose fonts we have not worked out yet — the state a
   * change of language puts us in, and worth passing to the chooser so it can stop
   * showing the previous language's answer.
   *
   * Editing the alphabet doesn't count: the list we have is still an answer about
   * this language, so it stays up while a better one is fetched.
   */
  loading: boolean;
  /** The alphabet the SLDR has for the chosen language, if it has one. */
  sldrAlphabet?: string;
  /**
   * Whether the SLDR has answered about the current tag at all. Without this the
   * UI can't tell "still asking" from "asked, and there is no alphabet".
   */
  sldrChecked: boolean;
  /**
   * The SLDR's recommended feature settings for the language, keyed by font
   * name — the chooser's `fontFeatureDefaults` prop. Empty when the repository
   * has none; undefined while we haven't heard.
   */
  fontFeatureDefaults?: FontFeatureDefault[];
  /** One line about a source that failed, while the other source's fonts still show. */
  warning?: string;
}

/** What the SLDR said, and which language it said it about. */
interface SldrAnswer {
  tag: string;
  /** Absent when the repository has no alphabet for the language. */
  alphabet?: string;
}

/** Long enough that typing a whole alphabet is one request, not twenty. */
const TYPING_SETTLES_MS = 500;

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** `ffm-Latn-SN` → `ffm-Latn`, `ffm`: each shorter tag names something the longer one is a variety of. */
function shorterTags(tag: string): string[] {
  const subtags = tag.split("-").filter((subtag) => subtag.length > 0);
  const shorter: string[] = [];
  for (let length = subtags.length - 1; length >= 1; length--) {
    shorter.push(subtags.slice(0, length).join("-"));
  }
  return shorter;
}

/** The macrolanguage the tag's language belongs to, where it belongs to one. */
function macrolanguageTagFor(languageTag: string): string | undefined {
  const language = languageTag.split("-")[0];
  if (!language) return undefined;
  const macrolanguage = getLanguageBySubtag(language)?.parentMacrolanguage;
  return macrolanguage?.languageSubtag || macrolanguage?.iso639_3_code;
}

/**
 * Which other tags to ask the SLDR about when it has nothing for this one: the
 * shorter forms of the tag, and then the macrolanguage.
 *
 * Shortening a tag is all a font library can do on its own, and it never gets from
 * Maasina Fulfulde (`ffm`) to Fulah (`ff`) — nothing in the string says the two are
 * related, and the SLDR has an alphabet for one and not the other. Only language
 * data knows that, which is why this lives here in the demo rather than in
 * `@ethnolib/font-core`.
 */
function sldrFallbackTagsFor(languageTag: string): string[] {
  const macrolanguage = macrolanguageTagFor(languageTag);
  const shorter = shorterTags(languageTag);
  return macrolanguage ? [...shorter, macrolanguage] : shorter;
}

export function useSuggestedFonts({
  alphabet,
  languageTag,
}: SuggestedFontsInput): SuggestedFonts {
  // One set of providers for the life of the demo, so their in-memory work and
  // their local storage caches are shared across every question we ask.
  const providers = useMemo(
    () => ({
      fontsource: createFontsourceSuggester(),
      languageFontFinder: createLanguageFontFinderSuggester(),
      sldr: createSldrAlphabetProvider({
        fallbackTagsFor: sldrFallbackTagsFor,
      }),
      sldrFontFeatures: createSldrFontFeaturesProvider({
        fallbackTagsFor: sldrFallbackTagsFor,
      }),
    }),
    []
  );

  const [fonts, setFonts] = useState<FontInfo[] | undefined>();
  const [warning, setWarning] = useState<string | undefined>();
  // The answer carries the tag it is about. Two separate pieces of state — "have we
  // heard" and "what did it say" — would go briefly out of step the moment the user
  // picks a second language, and the caller would fill the field with the previous
  // language's alphabet.
  const [answer, setAnswer] = useState<SldrAnswer | undefined>();

  const tag = languageTag.trim();
  const typed = useDebounced(alphabet.trim(), TYPING_SETTLES_MS);

  // What the SLDR says the chosen language is written with. Asked before the
  // fonts, since its answer is what Fontsource gets asked about when the user
  // hasn't typed an alphabet of their own.
  useEffect(() => {
    if (!tag) return;

    const controller = new AbortController();
    providers.sldr
      .getAlphabet(tag, { signal: controller.signal })
      .then((found) => {
        if (controller.signal.aborted) return;
        setAnswer({ tag, alphabet: found });
      })
      .catch((error: unknown) => {
        if (isAbort(error) || controller.signal.aborted) return;
        // A failed lookup is not an answer about the alphabet, but the UI still has
        // to stop waiting, so it counts as having heard back.
        setWarning(`Could not reach the SLDR: ${message(error)}`);
        setAnswer({ tag });
      });
    return () => controller.abort();
  }, [tag, providers]);

  // Which shapes the language's writing wants from which fonts, per the SLDR.
  // Nothing is said when it fails: the shapes fall back to the fonts' own
  // defaults, which is where they would have started anyway.
  const [fontFeatureDefaults, setFontFeatureDefaults] = useState<
    FontFeatureDefault[] | undefined
  >();
  useEffect(() => {
    setFontFeatureDefaults(undefined);
    if (!tag) return;

    const controller = new AbortController();
    providers.sldrFontFeatures
      .getFontFeatureDefaults(tag, { signal: controller.signal })
      .then((found) => {
        if (!controller.signal.aborted) setFontFeatureDefaults(found);
      })
      .catch(() => {
        // A request that didn't land leaves the fonts to their own defaults.
      });
    return () => controller.abort();
  }, [tag, providers]);

  const sldrChecked = !!tag && answer?.tag === tag;
  const sldrAlphabet = sldrChecked ? answer?.alphabet : undefined;

  const effectiveAlphabet = typed || sldrAlphabet || "";

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function ask(): Promise<void> {
      if (!tag) {
        setFonts(undefined);
        setWarning(undefined);
        return;
      }
      // Waiting for the SLDR keeps this from running once without an alphabet and
      // again with one, which would show a short list and then replace it. The
      // previous language's fonts go now rather than when the answer lands: they
      // are not an answer about the language the user has just chosen.
      if (!sldrChecked) {
        setFonts(undefined);
        setWarning(undefined);
        return;
      }

      const [curated, covering] = await Promise.allSettled([
        providers.languageFontFinder.suggestFontsForLanguage(tag, { signal }),
        effectiveAlphabet
          ? providers.fontsource.suggestFontsForAlphabet(effectiveAlphabet, {
              signal,
            })
          : Promise.resolve([] as FontInfo[]),
      ]);
      if (signal.aborted) return;

      const failures = [curated, covering]
        .filter(
          (result): result is PromiseRejectedResult =>
            result.status === "rejected" && !isAbort(result.reason)
        )
        .map((result) => message(result.reason));

      // A source that covers the alphabet mechanically and one that was told what
      // suits the language will name some of the same families; the curated entry
      // is the better of the two, since it carries the reason it was chosen.
      //
      // Known limitation: Fontsource coverage is read from the one subset file we
      // download, so for an alphabet spanning several scripts a family that does
      // cover all of it can still look as though it doesn't.
      setFonts(
        mergeSuggestions(
          curated.status === "fulfilled" ? curated.value : [],
          covering.status === "fulfilled" ? covering.value : []
        )
      );
      setWarning(failures.length > 0 ? failures.join("; ") : undefined);
    }

    ask().catch((error: unknown) => {
      if (isAbort(error) || signal.aborted) return;
      setWarning(message(error));
    });

    return () => controller.abort();
  }, [tag, sldrChecked, effectiveAlphabet, providers]);

  return {
    fonts,
    loading: !!tag && fonts === undefined,
    sldrAlphabet,
    sldrChecked,
    fontFeatureDefaults,
    warning,
  };
}

/** Curated first, then whatever else covers the alphabet, one entry per family. */
function mergeSuggestions(
  preferred: FontInfo[],
  additional: FontInfo[]
): FontInfo[] {
  const byFamily = new Map<string, FontInfo>();
  for (const font of [...preferred, ...additional]) {
    const key = font.family.toLowerCase();
    if (!byFamily.has(key)) byFamily.set(key, font);
  }
  return [...byFamily.values()];
}

/** The value once it has stopped changing for `delay` milliseconds. */
function useDebounced<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}
