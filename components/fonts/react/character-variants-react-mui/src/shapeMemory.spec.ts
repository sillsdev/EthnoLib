import { describe, expect, it } from "vitest";
import { CharacterVariant } from "@ethnolib/font-core";
import { groupVariants, VariantGroup } from "./variantGroups";
import {
  matchShapeChoice,
  rememberShapeChoice,
  shapeChoiceFor,
  ShapeMemory,
} from "./shapeMemory";

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

/** Andika's shape: one cvXX with named parameters. */
function andikaEng(): VariantGroup {
  const [group] = groupVariants([
    variant("cv43", "Ŋ", {
      label: "Capital Eng",
      parameterLabels: ["Lowercase no descender", "Capital form"],
    }),
  ]);
  return group;
}

/** Another font's shape: the same forms under different tags and one label shared. */
function otherFontEng(): VariantGroup {
  const [group] = groupVariants([
    variant("ss07", "Ŋ", { label: "Capital form" }),
    variant("ss08", "Ŋ", { label: "Short stem" }),
  ]);
  return group;
}

describe("shapeChoiceFor", () => {
  it("records a pick as folded characters, folded label, and where it was applied", () => {
    const group = andikaEng();
    const choice = shapeChoiceFor("Andika", group, group.forms[1]);
    expect(choice).toEqual({
      characters: ["ŋ"],
      formLabel: "capital form",
      groupLabel: "capital eng",
      lastApplied: { fontFamily: "Andika", tag: "cv43", value: 2 },
    });
  });

  it("records an explicit return to the font default with no label and no tag", () => {
    const choice = shapeChoiceFor("Andika", andikaEng(), undefined);
    expect(choice.formLabel).toBeNull();
    expect(choice.lastApplied).toBeUndefined();
  });
});

describe("matchShapeChoice", () => {
  it("matches a pick made in another font by the form's label", () => {
    const memory = [shapeChoiceFor("Andika", andikaEng(), andikaEng().forms[1])];
    const match = matchShapeChoice(otherFontEng(), memory, "Carlito");
    expect(match?.form?.tag).toBe("ss07");
    expect(match?.via).toBe("label");
    expect(match?.remembered.lastApplied?.fontFamily).toBe("Andika");
  });

  it("matches the same font by tag and value without needing the label", () => {
    // The remembered label is deliberately wrong, to prove the fast path
    // never looks at it.
    const memory: ShapeMemory = [
      {
        characters: ["ŋ"],
        formLabel: "some other wording",
        lastApplied: { fontFamily: "Andika", tag: "cv43", value: 2 },
      },
    ];
    const match = matchShapeChoice(andikaEng(), memory, "andika");
    expect(match?.form?.value).toBe(2);
    expect(match?.via).toBe("same-font");
  });

  it("honors an explicit font-default choice on any font", () => {
    const memory = [shapeChoiceFor("Andika", andikaEng(), undefined)];
    const match = matchShapeChoice(otherFontEng(), memory, "Carlito");
    expect(match).toBeDefined();
    expect(match?.form).toBeUndefined();
  });

  it("says nothing about a row it holds no fact about", () => {
    const memory = [shapeChoiceFor("Andika", andikaEng(), andikaEng().forms[0])];
    const [aRow] = groupVariants([variant("cv01", "a", { label: "Alternate a" })]);
    expect(matchShapeChoice(aRow, memory, "Andika")).toBeUndefined();
  });

  it("says nothing when no form of the row answers to the remembered label", () => {
    const memory: ShapeMemory = [
      { characters: ["ŋ"], formLabel: "left hook" },
    ];
    expect(matchShapeChoice(otherFontEng(), memory, "Carlito")).toBeUndefined();
  });

  it("matches character sets case-folded and in any order", () => {
    const [group] = groupVariants([
      variant("cv62", "Ɔɔ", { label: "Open O", parameterLabels: ["Bowl"] }),
    ]);
    const memory: ShapeMemory = [
      { characters: ["ɔ"], formLabel: "bowl" },
    ];
    expect(matchShapeChoice(group, memory, "X")?.form?.tag).toBe("cv62");
  });

  it("does not let a fact about one letter steer a feature that reaches further", () => {
    // The remembered fact is about i alone; the row redraws i and l. Different
    // question, no match.
    const [wide] = groupVariants([
      variant("ss05", "il", { label: "Slanted italic specials" }),
    ]);
    const memory: ShapeMemory = [
      { characters: ["i"], formLabel: "slanted italic specials" },
    ];
    expect(matchShapeChoice(wide, memory, "Andika")).toBeUndefined();
  });

  it("falls back to the label when the same font no longer offers the tag", () => {
    // A rebuilt font renumbered the feature: cv43 became something else, but a
    // form still answers to the label.
    const memory: ShapeMemory = [
      {
        characters: ["ŋ"],
        formLabel: "capital form",
        lastApplied: { fontFamily: "Carlito", tag: "cv99", value: 1 },
      },
    ];
    const match = matchShapeChoice(otherFontEng(), memory, "Carlito");
    expect(match?.form?.tag).toBe("ss07");
    expect(match?.via).toBe("label");
  });
});

describe("rememberShapeChoice", () => {
  it("replaces the fact about the same row and keeps the others", () => {
    const eng = andikaEng();
    const first = shapeChoiceFor("Andika", eng, eng.forms[0]);
    const other: ShapeMemory[number] = { characters: ["a"], formLabel: "single storey" };
    const second = shapeChoiceFor("Charis", eng, undefined);

    const memory = rememberShapeChoice(
      rememberShapeChoice([other], first),
      second
    );
    expect(memory).toHaveLength(2);
    expect(memory).toContain(other);
    expect(memory.find((c) => c.characters[0] === "ŋ")?.formLabel).toBeNull();
  });

  it("leaves the given memory untouched", () => {
    const memory: ShapeMemory = [{ characters: ["a"], formLabel: "x" }];
    rememberShapeChoice(memory, { characters: ["a"], formLabel: "y" });
    expect(memory).toEqual([{ characters: ["a"], formLabel: "x" }]);
  });
});
