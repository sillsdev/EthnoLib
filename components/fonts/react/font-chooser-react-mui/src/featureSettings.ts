import type { CharacterVariantChoices } from "@ethnolib/character-variants-react-mui";

/**
 * The user's shape choices as a CSS `font-feature-settings` value, for drawing
 * text the way they have set the font up to draw it.
 *
 * Only the features they have moved off the font's own form appear: a feature set
 * to 0 is the font left alone, which is what writing nothing already means.
 * Answers "normal" when there is nothing to say, that being the property's own
 * word for it.
 */
export function featureSettingsFor(choices: CharacterVariantChoices): string {
  const set = Object.entries(choices)
    .filter(([, value]) => value > 0)
    // Otherwise the string reshuffles as the user picks, which matters where it
    // is compared, cached or written into a stylesheet.
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tag, value]) => `"${tag}" ${value}`);
  return set.length > 0 ? set.join(", ") : "normal";
}
