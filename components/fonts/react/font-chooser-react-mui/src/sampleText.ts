/**
 * Which words the sample paragraph shows, and where they came from.
 *
 * Three sources, in order of how much they are worth: what the user typed
 * themselves, real writing in their language that the host supplied, and — failing
 * both — nonsense built out of their alphabet. The pane says which of the three it
 * is showing, because a font judged on lorem ipsum has not been judged at all.
 *
 * Kept free of React so the precedence and the emptied-box rule can be tested on
 * their own.
 */

export type SampleTextSource = "custom" | "language" | "invented";

export interface SampleTextChoice {
  text: string;
  source: SampleTextSource;
}

export interface SampleTextInput {
  /** What the user has typed over the sample, if they have typed anything. */
  custom?: string;
  /** Real writing in the language, as the host supplied it. May be several lines. */
  languageText?: string;
  /** Nonsense made out of the alphabet, for when there is nothing real to show. */
  inventedText?: string;
}

/** What to show, and what to call it. Nothing at all when there are no words to show. */
export function chooseSampleText({
  custom,
  languageText,
  inventedText,
}: SampleTextInput): SampleTextChoice | undefined {
  // The user's own text goes through as they typed it, whitespace and all; only
  // whether it is empty is decided for them.
  if (custom && custom.trim().length > 0) {
    return { text: custom, source: "custom" };
  }
  // One paragraph. The passages these come from run to several, and the pane has
  // room for a taste rather than a page.
  const paragraph = languageText
    ?.split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (paragraph) return { text: paragraph, source: "language" };
  if (inventedText && inventedText.trim().length > 0) {
    return { text: inventedText, source: "invented" };
  }
  return undefined;
}

/**
 * What the host should remember after an edit.
 *
 * A box the user has emptied is not an empty sample — it is the user taking their
 * own version back, so the answer is nothing, and the next time the sample is
 * built it comes from the language or the alphabet again.
 */
export function editedSampleText(typed: string): string | undefined {
  return typed.trim().length > 0 ? typed : undefined;
}

/** What the heading says after "Sample Text". */
export function sampleTextSourceLabel(source: SampleTextSource): string {
  switch (source) {
    case "custom":
      return "(Custom)";
    case "language":
      // Generic on purpose: the component only knows the host supplied real
      // writing in the language, not which service it came from (the demo's
      // comes from Google's gflanguages data, not the SLDR).
      return "(in your language)";
    case "invented":
      return "(Lorem Ipsum style)";
  }
}
