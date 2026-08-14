/**
 * Which words the sample paragraph shows, and where they came from.
 *
 * Three sources, in order of how much they are worth: what the user typed
 * themselves, real writing in their language fetched from a language data set, and
 * — failing both — nonsense built out of their alphabet. The pane says which of the
 * three it is showing, and for the middle one it names the data set by name,
 * because a font judged on lorem ipsum has not been judged at all and a passage
 * whose origin is unstated cannot be checked.
 *
 * Kept free of React so the precedence and the emptied-box rule can be tested on
 * their own.
 */

export type SampleTextSource = "custom" | "language" | "invented";

export interface SampleTextChoice {
  text: string;
  source: SampleTextSource;
  /**
   * Who supplied the words, for the "language" case only — the name the heading
   * shows, e.g. "Google Fonts language data".
   */
  sourceName?: string;
  /** A page a person could visit to see that source, where there is one. */
  sourceUrl?: string;
}

export interface SampleTextInput {
  /** What the user has typed over the sample, if they have typed anything. */
  custom?: string;
  /**
   * Real writing in the language and the name of whoever supplied it. May be
   * several lines.
   */
  languageSample?: { text: string; source: string; sourceUrl?: string };
  /** Nonsense made out of the alphabet, for when there is nothing real to show. */
  inventedText?: string;
}

/** What to show, and what to call it. Nothing at all when there are no words to show. */
export function chooseSampleText({
  custom,
  languageSample,
  inventedText,
}: SampleTextInput): SampleTextChoice | undefined {
  // The user's own text goes through as they typed it, whitespace and all; only
  // whether it is empty is decided for them.
  if (custom && custom.trim().length > 0) {
    return { text: custom, source: "custom" };
  }
  // One paragraph. The passages these come from run to several, and the pane has
  // room for a taste rather than a page.
  const paragraph = languageSample?.text
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (paragraph && languageSample) {
    return {
      text: paragraph,
      source: "language",
      sourceName: languageSample.source,
      sourceUrl: languageSample.sourceUrl,
    };
  }
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

/**
 * Whether a sample the user rewrote should still be shown now that the language
 * has changed from `before` to `after`.
 *
 * It should not. Their text takes precedence over everything, so left in place it
 * becomes the only sample they can ever see again: words in the old language's
 * letters, sitting under the new language's name, with the passage fetched for
 * the new one hidden behind them. A rewritten sample belongs to the language it
 * was typed for.
 *
 * Two changes that look like a switch and are not:
 *  - the same tag written differently, or with space around it, is one language;
 *  - a host that works its language out asynchronously goes from nothing to a
 *    tag on a later render, and does that while restoring the text the user typed
 *    for that very language. Nothing-to-a-tag is the language arriving, so only a
 *    move between two named languages counts.
 */
export function customSampleSurvivesLanguageChange(
  before: string | undefined,
  after: string | undefined
): boolean {
  const was = before?.trim().toLowerCase();
  const now = after?.trim().toLowerCase();
  if (!was || !now) return true;
  return was === now;
}

/**
 * What the heading says after "Sample Text".
 *
 * Real writing is named by its data set rather than described as "in your
 * language": somebody looking at an unfamiliar paragraph needs to know where it
 * came from before they can say whether it is right.
 */
export function sampleTextSourceLabel(choice: SampleTextChoice): string {
  switch (choice.source) {
    case "custom":
      return "(Custom)";
    case "language":
      return `(${choice.sourceName})`;
    case "invented":
      return "(Lorem Ipsum style)";
  }
}
