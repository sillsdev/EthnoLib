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
export function affectedCharacters(variant: CharacterVariant): string[] {
  return variant.characters.length > 0
    ? variant.characters
    : [...(usableSampleText(variant) ?? "")];
}

/**
 * Whether a variant belongs to the list about `characters` (in practice, the
 * digits) rather than to the list of everything else.
 *
 * It has to touch them at all, and it has to be at least as much about them as it
 * is about letters. That second half matters now that a feature's characters are
 * read from the substitutions themselves rather than from a sample string: a
 * stylistic set can legitimately redraw a dozen letters and one digit, and such a
 * set belongs with the letters. A tie goes to the digits, which keeps a feature
 * described as "7₇⁷" — one digit, and sub- and superscripts that are no letters —
 * where it has always been.
 */
function belongsWith(
  variant: CharacterVariant,
  characters: Set<string>
): boolean {
  const affected = affectedCharacters(variant);
  const mine = affected.filter((character) => characters.has(character)).length;
  if (mine === 0) return false;
  const letters = affected.filter(
    (character) => !characters.has(character) && /\p{L}/u.test(character)
  ).length;
  return mine >= letters;
}

/**
 * Put the variants in the order the characters they affect are in.
 *
 * `order` is the user's alphabet, and an alphabet is a list somebody wrote down in
 * a particular order — for many languages not the order the code points happen to
 * be in — so it decides. A variant sorts by the first of its characters that
 * appears in the alphabet; one whose characters are all outside it (the digits,
 * against a letter alphabet) sorts after those, by code point. Labels break the
 * remaining ties so that the order doesn't wobble between reads.
 *
 * The point is that the user sees one list ordered by what it is about. Which
 * feature family an entry came from — a cvXX or a stylistic set — is an encoding
 * detail they have no reason to know, so the two are interleaved.
 */
export function sortVariantsByCharacter(
  variants: CharacterVariant[],
  order: Set<string>
): CharacterVariant[] {
  const positions = new Map([...order].map((entry, i) => [entry, i]));

  const keyOf = (variant: CharacterVariant) => {
    let place = Number.MAX_SAFE_INTEGER;
    let codePoint = Number.MAX_SAFE_INTEGER;
    for (const character of affectedCharacters(variant)) {
      const entry = matchingAlphabetEntry(order, character);
      const at = entry === undefined ? undefined : positions.get(entry);
      if (at !== undefined) place = Math.min(place, at);
      codePoint = Math.min(codePoint, character.codePointAt(0) ?? codePoint);
    }
    return { place, codePoint, label: variant.label ?? variant.tag };
  };

  return [...variants]
    .map((variant) => ({ variant, key: keyOf(variant) }))
    .sort(
      (a, b) =>
        a.key.place - b.key.place ||
        a.key.codePoint - b.key.codePoint ||
        a.key.label.localeCompare(b.key.label)
    )
    .map(({ variant }) => variant);
}

/**
 * Drop the variants that affect none of the given characters, in the order those
 * characters are in. Used to show the digits on their own: a variant that only
 * redraws figures belongs in the digit list, and one that redraws letters belongs
 * in the letter list.
 */
export function variantsFor(
  variants: CharacterVariant[],
  characters: Set<string>
): CharacterVariant[] {
  return sortVariantsByCharacter(
    variants.filter((variant) => belongsWith(variant, characters)),
    characters
  );
}

/**
 * Everything `variantsFor` leaves behind, so that the two lists together hold each
 * variant exactly once. Showing one feature in both lists would offer the same
 * choice twice, and the two copies would have to agree about which form is
 * chosen, so a feature that spans both goes to whichever list it is more about;
 * see `belongsWith`.
 *
 * The order it was given in is kept, since the caller has usually just had
 * `filterVariantsForAlphabet` put these in the alphabet's own order and the
 * characters being excluded here are no basis for reordering what's left.
 */
export function variantsBeyond(
  variants: CharacterVariant[],
  characters: Set<string>
): CharacterVariant[] {
  return variants.filter((variant) => !belongsWith(variant, characters));
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
 * What comes back is in the alphabet's own order rather than the font's; see
 * sortVariantsByCharacter.
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
  if (alphabet.size === 0) return sortVariantsByCharacter(showable, alphabet);

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
  return sortVariantsByCharacter(kept, alphabet);
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
