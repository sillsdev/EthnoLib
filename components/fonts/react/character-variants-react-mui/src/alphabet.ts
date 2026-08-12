import { CharacterVariant } from "./readCharacterVariants";

/**
 * The characters of an alphabet as the user typed it. Whitespace and the
 * separators people habitually put between letters ("a, b, ɓ" or "a b ɓ") are
 * dropped; everything else is taken literally, so case matters and so do
 * diacritics.
 */
export function parseAlphabet(text: string): Set<string> {
  // Spread rather than split("") so that characters outside the BMP survive.
  return new Set([...text].filter((c) => !/[\s,;|/]/.test(c)));
}

// Andika and others ship a literal "sample_text" for features whose sample string
// was never filled in. There is nothing to look at in such a tile.
const PLACEHOLDER_SAMPLE = /^sample[\s_-]*text$/i;

/** The font's sample text for a variant, unless it is an unfilled placeholder. */
export function usableSampleText(
  variant: CharacterVariant
): string | undefined {
  return variant.sampleText && !PLACEHOLDER_SAMPLE.test(variant.sampleText)
    ? variant.sampleText
    : undefined;
}

/**
 * Narrow a font's character variants to the ones that touch a given alphabet, and
 * narrow each variant's character list to the alphabet as well. An empty alphabet
 * means "no filtering".
 *
 * Fonts often leave the cvXX character list empty (Andika, for one, declares none
 * at all), so when a font doesn't say which characters a feature affects we fall
 * back to the sample text it supplies. A variant with neither is dropped: there is
 * nothing we could put in a tile.
 */
export function filterVariantsForAlphabet(
  variants: CharacterVariant[],
  alphabet: Set<string>
): CharacterVariant[] {
  const showable = variants.filter(
    (variant) => variant.characters.length > 0 || usableSampleText(variant)
  );
  if (alphabet.size === 0) return showable;

  const kept: CharacterVariant[] = [];
  for (const variant of showable) {
    if (variant.characters.length > 0) {
      const indexes = variant.characters
        .map((character, i) => (alphabet.has(character) ? i : -1))
        .filter((i) => i >= 0);
      if (indexes.length > 0) {
        kept.push({
          ...variant,
          characters: indexes.map((i) => variant.characters[i]),
          codePoints: indexes.map((i) => variant.codePoints[i]),
        });
      }
      continue;
    }

    const sample = usableSampleText(variant) ?? "";
    if ([...sample].some((character) => alphabet.has(character))) {
      kept.push(variant);
    }
  }
  return kept;
}

/**
 * Which of the alphabet's characters have a variant to choose among, so that the
 * alphabet field can point them out. An empty alphabet has nothing to mark.
 */
export function charactersWithVariants(
  variants: CharacterVariant[],
  alphabetText: string
): Set<string> {
  const alphabet = parseAlphabet(alphabetText);
  if (alphabet.size === 0) return new Set();

  const marked = new Set<string>();
  for (const variant of filterVariantsForAlphabet(variants, alphabet)) {
    const affected =
      variant.characters.length > 0
        ? variant.characters
        : [...(usableSampleText(variant) ?? "")];
    for (const character of affected) {
      if (alphabet.has(character)) marked.add(character);
    }
  }
  return marked;
}
