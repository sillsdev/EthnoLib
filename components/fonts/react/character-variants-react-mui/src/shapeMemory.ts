/**
 * Shape choices as durable, font-independent facts.
 *
 * A pick in the UI is a feature set to a value — "cv43 = 2" — and that means
 * nothing outside the font that defined it: there is no standard for what a cvXX
 * tag does, and even fonts that agree (SIL's do) are agreeing by convention. What
 * *is* stable is what the user actually decided: which character, drawn which way,
 * by the name the font gave that way. So a remembered fact is the row's characters
 * plus the picked form's label — "Ŋ: capital form" — and matching it to another
 * font goes by those, not by the tag.
 *
 * Labels are the strongest cross-font signal we have: the SIL fonts (Charis,
 * Doulos, Gentium, Andika) ship identical labels for the same shapes, so a pick
 * made in one carries to the others. Tags are only trusted within the font they
 * came from, where they are exact — which also sidesteps stylistic sets, whose
 * names mean opposite things in different fonts (Charis's ss01 is "Single-story
 * a and g"; Andika's is "Double-story a and g", because each toggles away from
 * its own default).
 */

import type { VariantForm, VariantGroup } from "./variantGroups";

/** One durable fact: "the row about these characters was set to this form." */
export interface ShapeChoice {
  /**
   * Case-folded characters the row is about, e.g. ["ŋ"]. Folded, deduplicated
   * and sorted once, at write time, so every later comparison is a plain
   * array comparison.
   */
  characters: string[];
  /**
   * Case-folded label of the picked form, e.g. "capital form" — or null,
   * meaning the user explicitly chose the font's own default for this row.
   * Null is not "no fact recorded": an explicit "I want the plain form" has to
   * outrank an SLDR default, and only a recorded fact can do that.
   */
  formLabel: string | null;
  /**
   * The row's own label at the moment of choice, case-folded — for showing a
   * remembered fact to someone ("capital eng") even when no current font
   * matches it.
   */
  groupLabel?: string;
  /**
   * Where this choice was last put in force, for the same-font fast path and
   * for saying where a remembered shape came from. Absent when the choice was
   * "back to the font default", which no font realizes with a feature.
   */
  lastApplied?: { fontFamily: string; tag: string; value: number };
}

/** Everything remembered about a language's shapes, one fact per row. */
export type ShapeMemory = ShapeChoice[];

/** The durable fact behind a pick, ready to be remembered. */
export function shapeChoiceFor(
  fontFamily: string,
  group: VariantGroup,
  form: VariantForm | undefined
): ShapeChoice {
  return {
    characters: foldCharacters(group.characters),
    formLabel: form ? foldLabel(form.label) : null,
    groupLabel: foldLabel(group.label),
    lastApplied: form
      ? { fontFamily, tag: form.tag, value: form.value }
      : undefined,
  };
}

/** Case-folded, deduplicated and sorted, so two sets compare as plain arrays. */
function foldCharacters(characters: string[]): string[] {
  return [...new Set(characters.map((c) => c.toLowerCase()))].sort();
}

function foldLabel(label: string): string {
  return label.trim().toLowerCase();
}

/**
 * Whether two rows are the same question: about exactly the same characters,
 * case-folded. Exact set equality, not overlap, and on purpose — the same
 * strictness groupVariants applies when it merges features into rows, and for
 * the same reason: a feature that reaches further is answering a different
 * question, and a fact about one letter must not steer a shape it was never
 * about.
 */
function sameCharacterSet(a: string[], b: string[]): boolean {
  const foldedA = foldCharacters(a);
  const foldedB = foldCharacters(b);
  return (
    foldedA.length === foldedB.length && foldedA.every((c, i) => c === foldedB[i])
  );
}

/** How a remembered fact was matched to a row of the current font. */
export interface MatchedChoice {
  /** The form to put in force, or undefined for the font's own default. */
  form?: VariantForm;
  /** How the match was made, for saying why a shape is what it is. */
  via: "same-font" | "label";
  /** The fact that produced the match, so callers can say where it came from. */
  remembered: ShapeChoice;
}

/**
 * What the memory says about one row of the current font, if it says anything.
 *
 * Undefined means "no fact about this row" — different from a match whose `form`
 * is undefined, which is a fact saying "use the font's default". Only the true
 * nothing lets a caller fall through to other sources of defaults.
 */
export function matchShapeChoice(
  group: VariantGroup,
  memory: ShapeMemory,
  fontFamily: string
): MatchedChoice | undefined {
  const remembered = memory.find((choice) =>
    sameCharacterSet(choice.characters, group.characters)
  );
  if (!remembered) return undefined;

  // Same font as last time: the remembered tag and value are exact, so use
  // them without looking at labels at all — which is also what makes unnamed
  // stylistic sets remembered reliably on the font they were picked in.
  if (
    remembered.lastApplied &&
    sameFamily(remembered.lastApplied.fontFamily, fontFamily)
  ) {
    const { tag, value } = remembered.lastApplied;
    const form = group.forms.find((f) => f.tag === tag && f.value === value);
    if (form) return { form, via: "same-font", remembered };
    // Fall through: a rebuilt font can renumber its features, and the label
    // may still find the same shape.
  }

  // An explicit "the font's own form" applies on any font: the user rejected
  // the alternates as such, not one font's encoding of them.
  if (remembered.formLabel === null) {
    return { form: undefined, via: "label", remembered };
  }

  const form = group.forms.find(
    (f) => foldLabel(f.label) === remembered.formLabel
  );
  return form ? { form, via: "label", remembered } : undefined;
}

function sameFamily(a: string, b: string): boolean {
  return foldLabel(a) === foldLabel(b);
}

/**
 * The memory with `choice` in it, replacing whatever fact was held about the
 * same row. One fact per question: remembering both "capital form" and an
 * older "no descender" about the same letter would leave the next font to
 * pick between them arbitrarily.
 */
export function rememberShapeChoice(
  memory: ShapeMemory,
  choice: ShapeChoice
): ShapeMemory {
  const rest = memory.filter(
    (existing) => !sameCharacterSet(existing.characters, choice.characters)
  );
  return [...rest, choice];
}
