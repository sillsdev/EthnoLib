import { describe, expect, it } from "vitest";
import { CharacterVariant } from "@ethnolib/font-core";
import {
  chooseForm,
  chosenForm,
  groupVariants,
  VariantGroup,
} from "./variantGroups";

/** A variant as the reader would hand it over, with the fields tests care about. */
function variant(
  tag: string,
  characters: string,
  rest: Partial<CharacterVariant> = {}
): CharacterVariant {
  return {
    tag,
    number: parseInt(tag.slice(2), 10),
    parameterLabels: [],
    characters: [...characters],
    codePoints: [...characters].map((c) => c.codePointAt(0)!),
    ...rest,
  };
}

/** The tiles of a row after its default one, as "tag value: label". */
function forms(group: VariantGroup): string[] {
  return group.forms.map((f) => `${f.tag} ${f.value}: ${f.label}`);
}

describe("grouping variants into rows", () => {
  it("gives a feature of its own a row of its own", () => {
    const groups = groupVariants([
      variant("cv01", "a", { label: "Single-storey a" }),
      variant("cv02", "g", { label: "Single-storey g" }),
    ]);
    expect(groups.map((g) => g.sample)).toEqual(["a", "g"]);
    expect(groups.map((g) => g.label)).toEqual([
      "Single-storey a",
      "Single-storey g",
    ]);
    // The row already carries the font's name for the feature, so the tile only
    // has to say that it is the other form.
    expect(forms(groups[0])).toEqual(["cv01 1: Alternate"]);
  });

  it("puts a feature's named parameters in its row, in order", () => {
    const [group] = groupVariants([
      variant("cv43", "Ŋ", {
        label: "Capital Eng",
        parameterLabels: ["lowercase no descender", "capital form"],
      }),
    ]);
    expect(group.label).toBe("Capital Eng");
    expect(group.characters).toEqual(["Ŋ"]);
    expect(forms(group)).toEqual([
      "cv43 1: Lowercase no descender",
      "cv43 2: Capital form",
    ]);
  });

  it("puts several features about one character in one row", () => {
    // Carlito's shape: three unnamed stylistic sets, each redrawing Eng a
    // different way, which are three answers to one question and not three
    // questions. (Two of them reach into Greek as well, but the user's alphabet
    // has already narrowed them to the letters they write.)
    const groups = groupVariants([
      variant("ss01", "Ŋ", { label: "Alternate style 1" }),
      variant("ss02", "Ŋ", { label: "Alternate style 2" }),
      variant("ss03", "Ŋ", { label: "Alternate style 3" }),
      variant("ss04", "g", { label: "Alternate style 4" }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].sample).toBe("Ŋ");
    expect(groups[0].tags).toEqual(["ss01", "ss02", "ss03"]);
    expect(forms(groups[0])).toEqual([
      "ss01 1: Alternate style 1",
      "ss02 1: Alternate style 2",
      "ss03 1: Alternate style 3",
    ]);
    expect(groups[1].tags).toEqual(["ss04"]);
  });

  it("names a row of several features after the character it is about", () => {
    const [group] = groupVariants([
      variant("ss01", "Ŋ", { label: "Alternate style 1" }),
      variant("ss02", "Ŋ", { label: "Alternate style 2" }),
    ]);
    expect(group.label).toBe("Shapes for Ŋ");
  });

  it("says which feature a parameter belongs to when a row holds several", () => {
    const [group] = groupVariants([
      variant("cv43", "Ŋ", {
        label: "Capital Eng",
        parameterLabels: ["capital form"],
      }),
      variant("ss01", "Ŋ", { label: "Alternate style 1" }),
    ]);
    expect(forms(group)).toEqual([
      "cv43 1: Capital Eng: Capital form",
      "ss01 1: Alternate style 1",
    ]);
  });

  it("leaves a feature that reaches further in a row of its own", () => {
    // Andika's "Slanted italic specials" redraws i, l, v and z; the cvXX beside
    // it is about i alone. They both draw an i, but the wider one is not an
    // answer to "how should i be drawn?" and turning it on should not turn the
    // other off.
    const groups = groupVariants([
      variant("cv31", "i", { label: "Lowercase i" }),
      variant("ss05", "il", { label: "Slanted italic specials" }),
    ]);
    expect(groups.map((g) => g.tags)).toEqual([["cv31"], ["ss05"]]);
  });

  it("keeps apart the features about different characters", () => {
    // Case folding matches ƴ to Ƴ for the purpose of showing the row at all, but
    // the tiles draw the character the feature actually redraws, so a feature
    // about the capital and one about the small letter are separate rows.
    const groups = groupVariants([
      variant("cv67", "ƴ", { label: "Lowercase y hook" }),
      variant("cv68", "Ƴ", { label: "Capital Y hook" }),
    ]);
    expect(groups.map((g) => g.sample)).toEqual(["ƴ", "Ƴ"]);
  });

  it("groups by the sample text of a feature that names no characters", () => {
    const groups = groupVariants([
      variant("cv01", "", { label: "Ogonek", sampleText: "Ą" }),
      variant("ss01", "", { label: "Alternate style 1", sampleText: "Ą" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].sample).toBe("Ą");
  });

  it("leaves out a feature with nothing to draw in a tile", () => {
    expect(groupVariants([variant("ss01", "")])).toEqual([]);
  });

  it("calls an unnamed lone alternate what it is", () => {
    const [group] = groupVariants([variant("cv01", "a")]);
    expect(group.label).toBe("Character variant 1");
    expect(forms(group)).toEqual(["cv01 1: Alternate"]);
  });
});

describe("choosing a form in a row", () => {
  const [engs] = groupVariants([
    variant("ss01", "Ŋ", { label: "Alternate style 1" }),
    variant("ss02", "Ŋ", { label: "Alternate style 2" }),
  ]);

  it("finds the form the choices have in force", () => {
    expect(chosenForm(engs, { ss02: 1 })).toBe(engs.forms[1]);
    expect(chosenForm(engs, {})).toBeUndefined();
    expect(chosenForm(engs, { ss01: 0, ss02: 0 })).toBeUndefined();
  });

  it("turns off the rest of the row when a form is picked", () => {
    expect(chooseForm({ ss01: 1, cv05: 2 }, engs, engs.forms[1])).toEqual({
      ss01: 0,
      ss02: 1,
      cv05: 2,
    });
  });

  it("turns the whole row off to go back to the font's own shape", () => {
    expect(chooseForm({ ss02: 1, cv05: 2 }, engs)).toEqual({
      ss01: 0,
      ss02: 0,
      cv05: 2,
    });
  });
});
