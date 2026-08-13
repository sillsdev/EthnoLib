/**
 * Turning a font's shape features into the rows of forms the user picks from.
 *
 * A row is one question — "how should this letter be drawn?" — and its tiles are
 * the answers, of which exactly one can be in force. Most fonts ask each question
 * with a single feature, and then a row is a feature: Andika's cv43 is "Capital
 * Eng" with three named parameters, so its row is the font's default and three
 * alternates.
 *
 * Other fonts spend a feature per answer. Carlito draws Ŋ three ways through
 * ss01, ss02 and ss03, each an unnamed stylistic set that redraws Eng to a
 * different glyph. Read feature by feature that is three separate on/off
 * questions, which is both three times the screen space and a lie: the three
 * cannot be on at once, and nothing in the UI says so.
 *
 * So a row is not a feature but a letter. Variants about exactly the same letters
 * go in one row, and picking any of its tiles turns the rest of the row's features
 * off.
 *
 * "Exactly the same" is strict on purpose, and it is judged after the user's
 * alphabet has narrowed each variant to the letters they actually write — which is
 * what makes Carlito's three sets equal, two of them reaching into Greek that no
 * Latin alphabet asked for. A feature that still reaches further than another once
 * narrowed is a different offer and keeps its own row: Andika's "Slanted italic
 * specials" redraws i, l, v and z, so it is not an answer to "how should i be
 * drawn?" and must not be made to compete with the cvXX that is.
 */

import {
  affectedCharacters,
  representativeSample,
  type CharacterVariant,
} from "@ethnolib/font-core";

/** Which form of each feature is chosen, keyed by tag ("cv07"). */
export type CharacterVariantChoices = Record<string, number>;

/** One form the user can pick: a feature set to one of its alternates. */
export interface VariantForm {
  /** e.g. "cv07" */
  tag: string;
  /** The 1-based alternate. The font's own form is the absence of a form. */
  value: number;
  /** What to call it, e.g. "Large bowl". */
  label: string;
}

/** One row of forms of a single character, of which the user picks one. */
export interface VariantGroup {
  /** Stable identity for the row, built from the features it covers. */
  key: string;
  /** The character every tile of the row shows. */
  sample: string;
  /** What the row is about, e.g. "Capital Eng". */
  label: string;
  /** Every feature the row covers, so that picking one form clears the others. */
  tags: string[];
  /**
   * The characters the row is about, as the font and alphabet gave them — the
   * set the variants were grouped on. This is the row's font-independent
   * identity, which is what shape memory matches on (see shapeMemory.ts).
   */
  characters: string[];
  /** The alternates, in the order the tiles go in after the default. */
  forms: VariantForm[];
}

/** Fonts name their forms inconsistently; the tiles read better all in one style. */
function capitalized(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * The rows to show for a list of variants, in the order the variants were given
 * in — which the caller has usually just put in the user's alphabet order.
 *
 * A variant with nothing to show — no characters and no usable sample text — has
 * no tile to draw and is left out.
 */
export function groupVariants(variants: CharacterVariant[]): VariantGroup[] {
  const byCharacters = new Map<string, CharacterVariant[]>();
  for (const variant of variants) {
    if (!representativeSample(variant)) continue;
    const about = affectedCharacters(variant).join("");
    const together = byCharacters.get(about);
    if (together) together.push(variant);
    else byCharacters.set(about, [variant]);
  }

  return [...byCharacters.values()].map((together) => {
    const sample = representativeSample(together[0]);
    return {
      key: together.map(({ tag }) => tag).join("+"),
      sample,
      label: labelOf(sample, together),
      tags: together.map(({ tag }) => tag),
      // Every variant here shares this set by construction: it is the map key
      // they were grouped on.
      characters: affectedCharacters(together[0]),
      forms: together.flatMap((variant) =>
        formsOf(variant, together.length === 1)
      ),
    };
  });
}

/**
 * What the row as a whole is called. One feature to itself lends the row its own
 * name, which is the font's and is the best there is. Several features have no
 * shared name — nothing in the font says they belong together; we worked that out
 * — so the row is named after the character it is about.
 */
function labelOf(sample: string, variants: CharacterVariant[]): string {
  if (variants.length > 1) return `Shapes for ${sample}`;
  const [variant] = variants;
  return variant.label ?? `Character variant ${variant.number}`;
}

/**
 * The tiles one feature contributes. `alone` says whether it is the row's only
 * feature, which decides how much a tile has to say about itself: on its own the
 * row is already named after the feature, so the tile names only the form, while
 * beside another feature's tiles it has to say which feature it belongs to.
 */
function formsOf(variant: CharacterVariant, alone: boolean): VariantForm[] {
  const { tag, label, parameterLabels } = variant;

  // A feature with no named parameters is on or off, so it offers the one form.
  if (parameterLabels.length === 0) {
    return [{ tag, value: 1, label: (alone ? undefined : label) ?? "Alternate" }];
  }

  return parameterLabels.map((name, i) => ({
    tag,
    value: i + 1,
    label:
      alone || !label
        ? capitalized(name)
        : `${label}: ${capitalized(name)}`,
  }));
}

/** The form of a row that the given choices have in force, if any. */
export function chosenForm(
  group: VariantGroup,
  choices: CharacterVariantChoices
): VariantForm | undefined {
  return group.forms.find(({ tag, value }) => choices[tag] === value);
}

/**
 * The choices with `form` in force and the rest of its row turned off. Passing no
 * form goes back to the font's own shapes for that row.
 *
 * The row's other features have to be cleared rather than left alone: they are
 * different answers to the same question, and a font asked for two of them at
 * once draws whichever its lookups reach first, which is not a choice the user
 * made.
 */
export function chooseForm(
  choices: CharacterVariantChoices,
  group: VariantGroup,
  form?: VariantForm
): CharacterVariantChoices {
  const next = { ...choices };
  for (const tag of group.tags) next[tag] = 0;
  if (form) next[form.tag] = form.value;
  return next;
}
