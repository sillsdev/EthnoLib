/**
 * What shape every row should take when a font is opened, and why.
 *
 * Three sources can answer a row's question, and they answer in a strict order:
 * a remembered fact (the user decided this before, on some font — an explicit
 * "the font's own form" counts), then an SLDR recommendation for the language,
 * then the font's own default. The combine runs once per font switch and hands
 * back both the raw tag choices to put in force and, per row, which source put
 * them there — provenance the UI can show and the host can report.
 *
 * SLDR entries are keyed by font name, and most languages with settings carry
 * them for one font only. The SIL LCG family (Charis, Doulos, Gentium, Andika)
 * shares cvNN numbering and labels — verified byte-identical across the shipped
 * fonts — so an entry for one of them is safe to apply to the others, and we
 * do, when the current font is itself in the family and has no entry of its
 * own. Any other font gets only its own entries: an unrelated font agreeing
 * with Andika's cv43=2 would be a coincidence, not a fact about the font in
 * front of the user.
 */

import { normalizeFontName, type FontFeatureDefault } from "@ethnolib/font-core";
import { matchShapeChoice, type ShapeMemory } from "./shapeMemory";
import {
  chosenForm,
  type CharacterVariantChoices,
  type VariantForm,
  type VariantGroup,
} from "./variantGroups";

/** Why a row's current form is in force. */
export type ChoiceSource =
  /** Picked directly, this session, on this font. */
  | { kind: "user" }
  /** A remembered fact matched this font, by tag on the same font or by label. */
  | { kind: "remembered"; via: "same-font" | "label"; fromFont?: string }
  /** A remembered fact says: the font's own form, on any font. */
  | { kind: "remembered-default" }
  /** An SLDR recommendation — `fromFont` set when borrowed from a sibling SIL font. */
  | { kind: "sldr"; fromFont?: string }
  /** Nothing had anything to say; the font draws it its own way. */
  | { kind: "font-default" };

/**
 * The choices to put in force when a font is opened, with each row's source.
 * `provenance` is keyed by `VariantGroup.key` and has an entry for every row,
 * font-default rows included.
 */
export function effectiveChoicesFor(
  groups: VariantGroup[],
  memory: ShapeMemory,
  fontFamily: string,
  sldrDefaults: FontFeatureDefault[] | undefined
): {
  choices: CharacterVariantChoices;
  provenance: Record<string, ChoiceSource>;
} {
  const sldrEntry = findSldrEntry(fontFamily, sldrDefaults ?? []);

  const choices: CharacterVariantChoices = {};
  const provenance: Record<string, ChoiceSource> = {};

  for (const group of groups) {
    const matched = matchShapeChoice(group, memory, fontFamily);
    if (matched) {
      applyForm(choices, group, matched.form);
      provenance[group.key] = matched.form
        ? {
            kind: "remembered",
            via: matched.via,
            fromFont:
              matched.via === "label"
                ? matched.remembered.lastApplied?.fontFamily
                : undefined,
          }
        : { kind: "remembered-default" };
      continue;
    }

    const sldrForm = sldrEntry && formFromSldr(group, sldrEntry.entry);
    if (sldrForm) {
      applyForm(choices, group, sldrForm);
      provenance[group.key] = {
        kind: "sldr",
        // Named only when the entry came from a sibling font: an entry of the
        // font's own needs no explaining.
        fromFont: sldrEntry.borrowed ? sldrEntry.entry.fontName : undefined,
      };
      continue;
    }

    provenance[group.key] = { kind: "font-default" };
  }

  return { choices, provenance };
}

/** The row's features with `form` in force — the same clearing chooseForm does. */
function applyForm(
  choices: CharacterVariantChoices,
  group: VariantGroup,
  form: VariantForm | undefined
): void {
  for (const tag of group.tags) choices[tag] = 0;
  if (form) choices[form.tag] = form.value;
}

/**
 * The form an SLDR entry asks for on this row, if the font actually offers it.
 * Requiring the exact tag and value to exist among the row's forms guards
 * against stale SLDR data naming an alternate this build of the font hasn't
 * got — a setting nothing would draw is not a default worth reporting.
 */
function formFromSldr(
  group: VariantGroup,
  entry: FontFeatureDefault
): VariantForm | undefined {
  for (const tag of group.tags) {
    const value = entry.features[tag];
    if (value === undefined || value === 0) continue;
    const form = group.forms.find((f) => f.tag === tag && f.value === value);
    if (form) return form;
  }
  return undefined;
}

/**
 * The families whose cvNN numbering and FeatureParams labels are verified
 * identical, each name folded with normalizeFontName and mapped to a family
 * stem. The stem is what makes name generations one font: the current releases
 * dropped the "SIL"/"Plus" suffixes ("Charis" was "Charis SIL"), and an SLDR
 * entry written against either spelling belongs to both.
 */
const SIL_LCG_FAMILY_STEMS: Record<string, string> = Object.fromEntries(
  (
    [
      ["Andika", "andika"],
      ["Charis", "charis"],
      ["Charis SIL", "charis"],
      ["Doulos", "doulos"],
      ["Doulos SIL", "doulos"],
      ["Gentium", "gentium"],
      ["Gentium Plus", "gentium"],
      ["Gentium Book Plus", "gentium"],
    ] as const
  ).map(([name, stem]) => [normalizeFontName(name), stem])
);

/**
 * The SLDR entry to use for this font: its own — same name, or another name
 * generation of the same family — if there is one, else, only within the SIL
 * LCG family, whose feature numbering is verified shared, a sibling's.
 * `borrowed` says which, so a caller can show "from Andika" rather than
 * implying the font has curated defaults of its own.
 */
export function findSldrEntry(
  fontFamily: string,
  sldrDefaults: FontFeatureDefault[]
): { entry: FontFeatureDefault; borrowed: boolean } | undefined {
  // An entry can name a font without settings — a recommendation, not a
  // configuration — and those have nothing for this question to use.
  const withSettings = sldrDefaults.filter(
    (d) => Object.keys(d.features).length > 0
  );
  const folded = normalizeFontName(fontFamily);
  const stem = SIL_LCG_FAMILY_STEMS[folded];
  const own = withSettings.find((d) => {
    const entryFolded = normalizeFontName(d.fontName);
    return (
      entryFolded === folded ||
      (stem !== undefined && SIL_LCG_FAMILY_STEMS[entryFolded] === stem)
    );
  });
  if (own) return { entry: own, borrowed: false };

  if (stem === undefined) return undefined;
  const sibling = withSettings.find(
    (d) => SIL_LCG_FAMILY_STEMS[normalizeFontName(d.fontName)] !== undefined
  );
  return sibling ? { entry: sibling, borrowed: true } : undefined;
}

/**
 * One row of the effective set a host is told about: every row currently in
 * force, whichever source put it there, in terms that outlive the font —
 * characters and labels first, the raw feature setting alongside for whoever
 * wants the CSS facts.
 */
export interface EffectiveShapeChoice {
  /** The row's characters, as the font gives them (not case-folded — for display). */
  characters: string[];
  /** The row's own label, e.g. "Capital Eng". */
  groupLabel: string;
  /** The chosen form's label, or null for the font's own form. */
  formLabel: string | null;
  /** Why this form is in force right now. */
  source: ChoiceSource;
  /** The feature setting in force; `value` is 0 for the font's own form. */
  tag: string;
  value: number;
}

/** The effective-set row for one group, out of the live choices and provenance. */
export function effectiveShapeChoiceFor(
  group: VariantGroup,
  choices: CharacterVariantChoices,
  provenance: Record<string, ChoiceSource>
): EffectiveShapeChoice {
  const form = chosenForm(group, choices);
  return {
    characters: group.characters,
    groupLabel: group.label,
    formLabel: form?.label ?? null,
    source: provenance[group.key] ?? { kind: "font-default" },
    tag: form?.tag ?? group.tags[0],
    value: form?.value ?? 0,
  };
}
