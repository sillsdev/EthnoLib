/**
 * Every shape row a font offers for an alphabet, in one pass — the list shape
 * memory and SLDR defaults are matched against when a font is opened. The
 * letters/digits split the details pane draws is a display concern and stays
 * there; matching wants all the rows at once.
 */

import {
  filterVariantsForAlphabet,
  parseAlphabet,
  readCharacterVariants,
} from "@ethnolib/font-core";
import { groupVariants, type VariantGroup } from "./variantGroups";

/**
 * The rows of `fontData` narrowed to `alphabet` (all of them, when the alphabet
 * is empty), or undefined while there are no bytes yet or when they cannot be
 * read as a font — the same "nothing to show, not an error" the pane itself
 * answers with.
 */
export function allVariantGroups(
  fontData: ArrayBuffer | undefined,
  postscriptName: string | undefined,
  alphabet: string
): VariantGroup[] | undefined {
  if (!fontData) return undefined;
  try {
    const variants = readCharacterVariants(fontData, postscriptName);
    return groupVariants(
      filterVariantsForAlphabet(variants, parseAlphabet(alphabet))
    );
  } catch {
    return undefined;
  }
}
