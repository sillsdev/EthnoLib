/**
 * Which of an alphabet's characters a font can't write.
 *
 * Kept out of the details pane, and free of React, because the rule it encodes is
 * easy to get subtly wrong: an alphabet entry is not always one code point.
 */

import { coversCodePoint } from "@ethnolib/font-core";

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

/**
 * Whether to tell the user this font supports their language, rather than only
 * that its characters cover their alphabet.
 *
 * Only the host can say the first: it comes from language data — someone's
 * judgement that this font is for this language — and it is a stronger claim than
 * any character-by-character check can make. But it does not survive our seeing
 * letters go missing. The recommendation is about a family; what we fetched is one
 * file out of it, and a sample with holes in it is something the user needs told
 * about whoever recommended what.
 *
 * `missing` being undefined means we haven't read the font's coverage yet, which
 * is no reason to hold back what the host already told us.
 */
export function saysSupportsLanguage(
  supportsLanguage: boolean | undefined,
  missing: string[] | undefined
): boolean {
  return !!supportsLanguage && (missing === undefined || missing.length === 0);
}
