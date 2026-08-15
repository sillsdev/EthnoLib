/**
 * The demo's stand-in for what a host app does to fill the `fonts` prop.
 *
 * It starts from the language the host says it is working in. The bundled SIL
 * language font data has a curated answer for that language; the bundled SLDR
 * snapshot says what its alphabet is, and Fontsource says mechanically which of
 * its families cover those letters — or the letters the user has since edited
 * into the field. Nothing here needs an API key, so the demo works out of the box.
 *
 * Deliberately not exported from the package: a host app owns this decision, and
 * this is one plausible shape for it rather than the one we ship.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  bundledFontPopularity,
  createFontsourceSuggester,
  type FontFeatureDefault,
} from "@ethnolib/font-core";
import {
  createBundledAlphabetProvider,
  createBundledFontFeaturesProvider,
  createBundledLanguageFontSuggester,
} from "@ethnolib/font-core/bundled";
import { getLanguageBySubtag } from "@ethnolib/find-language";
import type { FontInfo } from "../types";

export interface SuggestedFontsInput {
  /** What is in the alphabet field, whether typed or filled in from the SLDR. */
  alphabet: string;
  /** The chosen language. */
  languageTag: string;
  /**
   * The ISO 15924 script the language is written in, where the tag itself does
   * not say. The bundled font data files its script-wide answers by script —
   * "any Thai is served by these families" — and a bare `th` reaches them only
   * if somebody says what script it is.
   */
  languageScript?: string;
  /**
   * Whether to offer fonts beyond the curated list and the machine's own —
   * that is, whether the chooser gets an invitation to ask Fontsource for the
   * most popular families whose published coverage includes the alphabet. The
   * search itself waits for `searchBroadly` to be called; off, the offering is
   * the curated answer plus whatever is installed, and no invitation is made.
   * Defaults to on.
   */
  broadSearch?: boolean;
  /**
   * That there is no connection. The alphabet, the curated fonts and the
   * letter-shape defaults all come out of the bundle, so an offline visit is
   * answered in full; the one thing that cannot happen is the broad search,
   * which sweeps a live catalog. This only changes how that failure is worded,
   * since "Failed to fetch" says nothing the user doesn't already know.
   */
  offline?: boolean;
}

/**
 * How long each stage of a load took, in milliseconds from the language being
 * set (which is also a page load, for a remembered language). Each field is
 * undefined until its stage has happened; only the first arrival is kept, so an
 * alphabet edit re-running the broad search doesn't overwrite the story of the
 * load.
 */
export interface SuggestionTimings {
  /** The language the times are about. */
  tag: string;
  /** The first fonts on offer — however few, the moment the list can show something. */
  firstFontsMs?: number;
  /** The curated answer (the bundled SIL language font data). */
  curatedMs?: number;
  /** The alphabet settled (the bundled SLDR data had one, or had none). */
  sldrMs?: number;
  /**
   * The broad search's answer (Fontsource, popularity-ranked), measured from
   * the click that asked for it rather than from the load: it doesn't run until
   * somebody does, and the user's thinking time isn't ours.
   */
  coveringMs?: number;
  /** Every source asked has said its piece: the offering is final. */
  settledMs?: number;
}

export interface SuggestedFonts {
  /** Undefined while we have no answer yet; empty when the answer was "nothing". */
  fonts?: FontInfo[];
  /**
   * What the broad search found, in its popularity order — the chooser's
   * `moreFonts` section. Undefined until it has something to say (it runs only
   * when asked; see `searchBroadly`), and then grows as more families are
   * confirmed, never reordering what is already there. May repeat a curated
   * family, which the chooser's own deduplication keeps above the divider.
   */
  moreFonts?: FontInfo[];
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
  /** One line about a lookup that failed, while the fonts we do have still show. */
  warning?: string;
  /** How long each stage of this language's load took; see `SuggestionTimings`. */
  timings: SuggestionTimings;
  /**
   * Run the broad search now — the chooser's "look up popular fonts"
   * invitation calls this. Idempotent for a language: a second call while one
   * is running or answered changes nothing.
   */
  searchBroadly: () => void;
  /**
   * Where the broad search stands for this language: switched off entirely,
   * waiting to be asked, running, or answered. "available" is when the
   * invitation should show.
   */
  broadSearchState: "off" | "available" | "searching" | "done";
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

/**
 * The four things the demo asks, and who answers them.
 *
 * Three of the four — the alphabet, the curated fonts, the letter-shape
 * defaults — come out of the snapshots shipped inside `@ethnolib/font-core`,
 * and out of nothing else. The services behind those snapshots move by a
 * language or two a month, the app regenerates them at each release, and asking
 * them live bought a few weeks' freshness for seconds of waiting, requests that
 * time out, and a line of UI to explain which answer had come from where.
 *
 * Fontsource is the exception: the broad search is a sweep of a live catalog,
 * with nothing to snapshot, and it runs only when the user asks for it.
 *
 * `scriptFor` is read at the moment of the question rather than baked in — the
 * providers are made once and the language changes under them — and it is what
 * lets the bundled font data answer a bare `th` from its script-wide rules.
 */
function createSuggestionProviders(scriptFor: () => string | undefined) {
  return {
    alphabet: createBundledAlphabetProvider({
      fallbackTagsFor: sldrFallbackTagsFor,
    }),
    curatedFonts: createBundledLanguageFontSuggester({
      fallbackTagsFor: sldrFallbackTagsFor,
      scriptFor: () => scriptFor() || undefined,
    }),
    fontFeatures: createBundledFontFeaturesProvider({
      fallbackTagsFor: sldrFallbackTagsFor,
    }),
    // Ranked, so the shortlist is the fifty most-used covering families rather
    // than an alphabetical page.
    fontsource: createFontsourceSuggester({
      getPopularity: bundledFontPopularity,
    }),
  };
}

export function useSuggestedFonts({
  alphabet,
  languageTag,
  languageScript,
  broadSearch = true,
  offline = false,
}: SuggestedFontsInput): SuggestedFonts {
  const tag = languageTag.trim();

  // The providers are made once and live as long as the demo, so what they need
  // to know about the current language reaches them through a ref rather than
  // through their configuration.
  const scriptRef = useRef(languageScript);
  scriptRef.current = languageScript;

  // One set of providers for the life of the demo, so their in-memory work and
  // their local storage caches are shared across every question we ask.
  const providers = useMemo(
    () => createSuggestionProviders(() => scriptRef.current),
    []
  );

  // The two sources answer at very different speeds. The curated answer is a
  // lookup in bundled data; Fontsource, cold, is a catalog request and then one
  // request per candidate family — seconds, the first time. Held together until both had
  // settled, the list sat empty for the slower one, so each source is its own
  // piece of state and publishes the moment it lands. Every answer carries the
  // tag it is about, which is what keeps a slow answer for the previous language
  // from turning up under the new one.
  const [curated, setCurated] = useState<
    { tag: string; fonts: FontInfo[]; warning?: string } | undefined
  >();
  // The broad search's answer arrives in pieces — confirming a family means
  // reading its font file, so fifty of them take seconds — and `final` is what
  // keeps a piece from being mistaken for the whole answer. The pieces are
  // prefixes of one another, so the list only ever grows at its end.
  const [covering, setCovering] = useState<
    { tag: string; fonts: FontInfo[]; final: boolean; warning?: string } | undefined
  >();
  const [sldrWarning, setSldrWarning] = useState<string | undefined>();
  // The answer carries the tag it is about. Two separate pieces of state — "have we
  // heard" and "what did it say" — would go briefly out of step the moment the user
  // picks a second language, and the caller would fill the field with the previous
  // language's alphabet.
  const [answer, setAnswer] = useState<SldrAnswer | undefined>();

  const typed = useDebounced(alphabet.trim(), TYPING_SETTLES_MS);

  // When this language's load began. Set during render, so the first request's
  // time is measured from before the effects that send it rather than after.
  const loadStart = useRef<{ tag: string; at: number }>();
  if (loadStart.current?.tag !== tag) {
    loadStart.current = { tag, at: performance.now() };
  }
  const [timings, setTimings] = useState<SuggestionTimings>({ tag });
  useEffect(() => {
    setTimings({ tag });
  }, [tag]);
  // First arrival only: a stage that already has a time keeps it, so the story
  // of the load isn't rewritten by later re-runs (an alphabet edit, say).
  const stamp = (stage: keyof Omit<SuggestionTimings, "tag">) => {
    const began = loadStart.current;
    if (!began || began.tag !== tag) return;
    const at = Math.round(performance.now() - began.at);
    setTimings((previous) =>
      previous.tag !== tag || previous[stage] !== undefined
        ? previous
        : { ...previous, [stage]: at }
    );
  };

  // What the bundled SLDR data says the chosen language is written with. Asked
  // before the fonts, since its answer is what Fontsource gets asked about when
  // the user hasn't typed an alphabet of their own.
  useEffect(() => {
    setSldrWarning(undefined);
    if (!tag) return;

    const controller = new AbortController();
    providers.alphabet
      .getAlphabet(tag, { signal: controller.signal })
      .then((found) => {
        if (controller.signal.aborted) return;
        setAnswer({ tag, alphabet: found });
      })
      .catch((error: unknown) => {
        if (isAbort(error) || controller.signal.aborted) return;
        // A failed lookup is not an answer about the alphabet, but the UI still has
        // to stop waiting, so it counts as having heard back.
        setSldrWarning(
          `Could not read the bundled alphabet data: ${message(error)}`
        );
        setAnswer({ tag });
      });
    return () => controller.abort();
  }, [tag, providers]);

  // Which shapes the language's writing wants from which fonts, per the bundled
  // SLDR data. Nothing is said when it fails: the shapes fall back to the fonts'
  // own defaults, which is where they would have started anyway.
  const [fontFeatureDefaults, setFontFeatureDefaults] = useState<
    FontFeatureDefault[] | undefined
  >();
  useEffect(() => {
    setFontFeatureDefaults(undefined);
    if (!tag) return;

    const controller = new AbortController();
    providers.fontFeatures
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

  // The curated list needs nothing but the tag, so it is asked the moment there
  // is one — it is a lookup in bundled data, and its answer is what puts the
  // first fonts on screen while Fontsource is still working through its
  // candidates.
  useEffect(() => {
    if (!tag) return;
    const controller = new AbortController();
    providers.curatedFonts
      .suggestFontsForLanguage(tag, { signal: controller.signal })
      .then((found) => {
        if (!controller.signal.aborted) setCurated({ tag, fonts: found });
      })
      .catch((error: unknown) => {
        if (isAbort(error) || controller.signal.aborted) return;
        // An empty answer with a warning, so the other source still shows alone.
        setCurated({ tag, fonts: [], warning: message(error) });
      });
    return () => controller.abort();
  }, [tag, providers]);

  // The broad search runs when the user asks for it, not when the language
  // loads: for a Latin alphabet it costs megabytes of ranking data plus a
  // request per candidate, and the curated-plus-local offering is usually
  // enough. The request remembers which language it was made for, which is what
  // stops a click on one language from running the search on the next.
  const [broadRequested, setBroadRequested] = useState<string | undefined>();
  const broadStart = useRef<number>();
  const searchBroadly = () => {
    if (broadRequested === tag) return;
    broadStart.current = performance.now();
    setBroadRequested(tag);
  };

  // Whether the connection was gone at any point, which the broad search's
  // answer has to be read against. A sweep with no network doesn't fail — it
  // asks fifty questions, gets nothing back from any of them, and returns an
  // empty list, which is exactly what "none of these fonts covers your
  // alphabet" looks like. Believed, that answer is final, and the invitation to
  // search never comes back however good the connection gets.
  const offlineNow = useRef(offline);
  offlineNow.current = offline;
  const offlineSpells = useRef(0);
  useEffect(() => {
    if (offline) offlineSpells.current++;
  }, [offline]);

  // Fontsource is asked about the alphabet, so it waits for the SLDR to have
  // said its piece — otherwise it would run once without an alphabet and again
  // with one, showing a short list and then replacing it.
  useEffect(() => {
    if (!broadSearch || !tag || !sldrChecked || broadRequested !== tag) return;
    if (!effectiveAlphabet) {
      setCovering({ tag, fonts: [], final: true });
      return;
    }
    const controller = new AbortController();
    const spellsAtStart = offlineSpells.current;
    providers.fontsource
      .suggestFontsForAlphabet(effectiveAlphabet, {
        signal: controller.signal,
        onProgress: (soFar) => {
          if (controller.signal.aborted) return;
          setCovering({ tag, fonts: soFar, final: false });
        },
      })
      .then((found) => {
        if (controller.signal.aborted) return;
        if (offlineNow.current || offlineSpells.current !== spellsAtStart) {
          // Searched with no connection for part or all of it, so this is not
          // an answer about the fonts — it is an answer about the network.
          setCovering({
            tag,
            fonts: [],
            final: true,
            warning: "the wider search ran with no connection",
          });
          setBroadRequested(undefined);
          return;
        }
        setCovering({ tag, fonts: found, final: true });
      })
      .catch((error: unknown) => {
        if (isAbort(error) || controller.signal.aborted) return;
        setCovering({ tag, fonts: [], final: true, warning: message(error) });
        // A search that failed is not a search that has been done. Left
        // "requested", it would take the invitation off the foot of the list
        // for good — so a connection that came back a moment later left the
        // user with no way to ask again but a page reload.
        setBroadRequested(undefined);
      });
    return () => controller.abort();
  }, [broadSearch, tag, sldrChecked, broadRequested, effectiveAlphabet, providers]);

  // A failure is only ever an answer about the moment it happened. When the
  // connection comes back, one that failed for want of it stops being anything
  // at all: it goes, and its warning with it, leaving the search un-run — which
  // it is — rather than answered with nothing and explained by a line about a
  // connection the page now has.
  useEffect(() => {
    if (offline) return;
    setCovering((previous) => (previous?.warning ? undefined : previous));
  }, [offline]);

  // Answers about some other language are no answers at all — a change of tag
  // drops them here rather than waiting for the new answers to land, so the
  // previous language's fonts leave the screen at once. An alphabet edit is the
  // opposite case: the covering answer for the same tag stays up, still true
  // enough, while a better one is fetched. Turning the broad search off drops
  // its contribution at once too, even where an answer is already in hand.
  const curatedNow = curated?.tag === tag ? curated : undefined;
  const coveringNow =
    broadSearch && covering?.tag === tag ? covering : undefined;
  // A partial answer is fonts to show, not an answer: "the search is done" and
  // the times below wait for the last one.
  const coveringDone = coveringNow?.final ? coveringNow : undefined;

  // The curated answer is the offering; the broad search's is its own section
  // below the list's divider, so the two stay apart here rather than being
  // merged. A family both name shows above the divider with the curated
  // entry's word for why — the chooser deduplicates.
  const fonts = tag && curatedNow ? curatedNow.fonts : undefined;

  const warnings = [
    sldrWarning,
    curatedNow?.warning,
    coveringNow?.warning,
  ].filter((line): line is string => !!line);
  // Only the broad search can fail for want of a connection, the rest being
  // lookups in bundled data, so offline there is one thing to say and
  // "Failed to fetch" is not it.
  const warning =
    warnings.length === 0
      ? undefined
      : offline
        ? "No internet connection, so the search beyond the suggested fonts could not run."
        : warnings.join("; ");

  // The clock stamps each stage as its answer lands. "Settled" is every source
  // we actually asked: the broad search only counts once somebody asked for it.
  // `stamp` keeps first arrivals only, so none of these re-fire meaningfully;
  // the narrow dependency lists are what keep them from running on every render.
  const broadAsked = broadSearch && broadRequested === tag;
  const settled =
    !!tag && !!curatedNow && sldrChecked && (!broadAsked || !!coveringDone);
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (fonts !== undefined) stamp("firstFontsMs");
  }, [fonts]);
  useEffect(() => {
    if (curatedNow) stamp("curatedMs");
  }, [curatedNow]);
  useEffect(() => {
    if (sldrChecked) stamp("sldrMs");
  }, [sldrChecked]);
  useEffect(() => {
    // From the click, not the load: see `SuggestionTimings.coveringMs`.
    if (!coveringDone || broadStart.current === undefined) return;
    const at = Math.round(performance.now() - broadStart.current);
    setTimings((previous) =>
      previous.tag !== tag || previous.coveringMs !== undefined
        ? previous
        : { ...previous, coveringMs: at }
    );
  }, [coveringDone]);
  useEffect(() => {
    if (settled) stamp("settledMs");
  }, [settled]);
  /* eslint-enable react-hooks/exhaustive-deps */

  return {
    fonts,
    moreFonts: coveringNow?.fonts,
    loading: !!tag && fonts === undefined,
    sldrAlphabet,
    sldrChecked,
    fontFeatureDefaults,
    warning,
    timings,
    searchBroadly,
    broadSearchState: !broadSearch
      ? "off"
      : !broadAsked
        ? "available"
        : coveringDone
          ? "done"
          : "searching",
  };
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
