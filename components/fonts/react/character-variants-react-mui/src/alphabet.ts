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

// Longer than this and the font is offering a phrase to read rather than a shape
// to look at, so we show one character of it instead.
const LONGEST_WHOLE_SAMPLE = 4;

/**
 * The one sample every tile of a variant shows. Tiles in a row differ only by the
 * form applied, so they have to show the same thing, and a single character shows a
 * shape better than a string of them. Fonts that name no characters get their own
 * sample text, whole when it is short enough to be a sample ("0123") and a single
 * character of it when it is a phrase.
 */
export function representativeSample(variant: CharacterVariant): string {
  if (variant.characters.length > 0) return variant.characters[0];
  const sample = usableSampleText(variant) ?? "";
  const characters = [...sample];
  if (characters.length <= LONGEST_WHOLE_SAMPLE) return sample;
  return characters[0];
}

/** The characters a digit-shape list is about. */
export const DIGITS = "0123456789";

/** The characters a variant is about: the ones it names, or its sample text. */
function affectedCharacters(variant: CharacterVariant): string[] {
  return variant.characters.length > 0
    ? variant.characters
    : [...(usableSampleText(variant) ?? "")];
}

/**
 * Drop the variants that affect none of the given characters. Used to show the
 * digits on their own: a variant that only redraws figures belongs in the digit
 * list, and one that redraws letters belongs in the letter list.
 */
export function variantsFor(
  variants: CharacterVariant[],
  characters: Set<string>
): CharacterVariant[] {
  return variants.filter((variant) =>
    affectedCharacters(variant).some((character) => characters.has(character))
  );
}

/**
 * Everything `variantsFor` leaves behind, so that the two lists together hold each
 * variant exactly once. A variant that touches a digit at all belongs to the digit
 * list: fonts describe their figure features with sample text like "7₇⁷", whose
 * subscript and superscript figures are not themselves digits, and showing such a
 * feature under the letters as well would offer the same choice twice.
 */
export function variantsBeyond(
  variants: CharacterVariant[],
  characters: Set<string>
): CharacterVariant[] {
  return variants.filter(
    (variant) =>
      !affectedCharacters(variant).some((character) =>
        characters.has(character)
      )
  );
}

/**
 * The alphabet entry a character answers to, if any: itself, or the entry it
 * matches once case is set aside.
 *
 * An alphabet is usually written in lower case, but the books made with it have
 * capital letters in them, so a variant that changes the shape of Ŋ is worth
 * offering to someone who typed ŋ, and the other way about. Only simple one-to-one
 * mappings count — ß upper-cases to SS, two characters, which is no longer the same
 * letter to look at, so such a character matches only itself.
 */
function matchingAlphabetEntry(
  alphabet: Set<string>,
  character: string
): string | undefined {
  if (alphabet.has(character)) return character;
  for (const folded of [character.toLowerCase(), character.toUpperCase()]) {
    if (folded === character) continue;
    if ([...folded].length !== [...character].length) continue;
    if (alphabet.has(folded)) return folded;
  }
  return undefined;
}

/**
 * Narrow a font's character variants to the ones that touch a given alphabet, and
 * narrow each variant's character list to the alphabet as well. An empty alphabet
 * means "no filtering". A character counts as being in the alphabet when its
 * upper- or lower-case counterpart is; see matchingAlphabetEntry.
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
        .map((character, i) =>
          matchingAlphabetEntry(alphabet, character) ? i : -1
        )
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
    if (
      [...sample].some((character) =>
        matchingAlphabetEntry(alphabet, character)
      )
    ) {
      kept.push(variant);
    }
  }
  return kept;
}

/**
 * Which of the alphabet's characters have a variant to choose among, so that the
 * alphabet field can point them out. An empty alphabet has nothing to mark.
 *
 * What gets marked is the character the user typed, so a variant that affects Ŋ
 * marks the ŋ in their alphabet rather than adding a capital they never wrote.
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
      const entry = matchingAlphabetEntry(alphabet, character);
      if (entry) marked.add(entry);
    }
  }
  return marked;
}
