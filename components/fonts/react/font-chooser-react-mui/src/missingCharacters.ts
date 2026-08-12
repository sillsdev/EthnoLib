/**
 * Which of an alphabet's characters a font can't write.
 *
 * Kept out of the details pane, and free of React, because the rule it encodes is
 * easy to get subtly wrong: an alphabet entry is not always one code point.
 */

import { coversCodePoint } from "@ethnolib/character-variants-react-mui";

/**
 * The entries of `alphabet` the font's `coverage` doesn't account for, in the
 * order the alphabet gave them.
 *
 * An entry can be a letter plus the combining marks written on it, and the font
 * needs a glyph for every part of it. Checking only the first code point would
 * pass a font that has the base letter and nothing to put above it, which is
 * exactly the case a user needs warning about.
 */
export function missingFromAlphabet(
  coverage: Uint32Array,
  alphabet: Iterable<string>
): string[] {
  return [...alphabet].filter((character) =>
    [...character].some((part) => {
      const codePoint = part.codePointAt(0);
      return codePoint !== undefined && !coversCodePoint(coverage, codePoint);
    })
  );
}
