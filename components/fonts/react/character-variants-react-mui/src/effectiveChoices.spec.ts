import { describe, expect, it } from "vitest";
import { CharacterVariant, FontFeatureDefault } from "@ethnolib/font-core";
import { groupVariants, VariantGroup } from "./variantGroups";
import { shapeChoiceFor, ShapeMemory } from "./shapeMemory";
import {
  effectiveChoicesFor,
  effectiveShapeChoiceFor,
  findSldrEntry,
} from "./effectiveChoices";

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

/** The SIL shape of the Eng row: one cvXX with named parameters. */
function engRow(): VariantGroup {
  const [group] = groupVariants([
    variant("cv43", "Ŋ", {
      label: "Capital Eng",
      parameterLabels: ["Lowercase no descender", "Capital form"],
    }),
  ]);
  return group;
}

/** Another row about another letter, to prove facts don't bleed across rows. */
function openORow(): VariantGroup {
  const [group] = groupVariants([
    variant("cv62", "Ɔ", { label: "Open O", parameterLabels: ["Bowl", "Loop"] }),
  ]);
  return group;
}

const andikaMaq: FontFeatureDefault = {
  fontName: "Andika",
  features: { cv43: 2, ss04: 1 },
};

describe("effectiveChoicesFor", () => {
  it("leaves every row to the font when nothing has anything to say", () => {
    const { choices, provenance } = effectiveChoicesFor(
      [engRow(), openORow()],
      [],
      "Andika",
      undefined
    );
    expect(choices).toEqual({});
    expect(provenance[engRow().key]).toEqual({ kind: "font-default" });
    expect(provenance[openORow().key]).toEqual({ kind: "font-default" });
  });

  it("applies the font's own SLDR entry, unattributed", () => {
    const { choices, provenance } = effectiveChoicesFor(
      [engRow(), openORow()],
      [],
      "Andika",
      [andikaMaq]
    );
    expect(choices).toEqual({ cv43: 2 });
    expect(provenance[engRow().key]).toEqual({
      kind: "sldr",
      fromFont: undefined,
    });
    // The entry says nothing about Open O, so that row stays the font's.
    expect(provenance[openORow().key]).toEqual({ kind: "font-default" });
  });

  it("lets a remembered fact outrank the SLDR", () => {
    const eng = engRow();
    // The user picked "Lowercase no descender" (value 1) on Charis; the SLDR
    // wants value 2.
    const memory = [shapeChoiceFor("Charis", eng, eng.forms[0])];
    const { choices, provenance } = effectiveChoicesFor(
      [eng],
      memory,
      "Andika",
      [andikaMaq]
    );
    expect(choices).toEqual({ cv43: 1 });
    expect(provenance[eng.key]).toEqual({
      kind: "remembered",
      via: "label",
      fromFont: "Charis",
    });
  });

  it("lets an explicit remembered default outrank the SLDR", () => {
    const eng = engRow();
    const memory = [shapeChoiceFor("Charis", eng, undefined)];
    const { choices, provenance } = effectiveChoicesFor(
      [eng],
      memory,
      "Andika",
      [andikaMaq]
    );
    expect(choices).toEqual({ cv43: 0 });
    expect(provenance[eng.key]).toEqual({ kind: "remembered-default" });
  });

  it("does not name a source font for a same-font match", () => {
    const eng = engRow();
    const memory = [shapeChoiceFor("Andika", eng, eng.forms[1])];
    const { provenance } = effectiveChoicesFor([eng], memory, "Andika", []);
    expect(provenance[eng.key]).toEqual({
      kind: "remembered",
      via: "same-font",
      fromFont: undefined,
    });
  });

  it("keeps a fact about one row off the others", () => {
    const eng = engRow();
    const openO = openORow();
    const memory = [shapeChoiceFor("Andika", eng, eng.forms[1])];
    const { choices, provenance } = effectiveChoicesFor(
      [eng, openO],
      memory,
      "Andika",
      []
    );
    expect(choices).toEqual({ cv43: 2 });
    expect(provenance[openO.key]).toEqual({ kind: "font-default" });
  });

  it("skips an SLDR setting the font does not actually offer", () => {
    const eng = engRow(); // offers cv43 = 1 and 2, nothing higher
    const stale: FontFeatureDefault = {
      fontName: "Andika",
      features: { cv43: 7 },
    };
    const { choices, provenance } = effectiveChoicesFor(
      [eng],
      [],
      "Andika",
      [stale]
    );
    expect(choices).toEqual({});
    expect(provenance[eng.key]).toEqual({ kind: "font-default" });
  });

  it("leaves the caller's memory untouched", () => {
    const eng = engRow();
    const memory: ShapeMemory = [shapeChoiceFor("Andika", eng, eng.forms[0])];
    const before = JSON.parse(JSON.stringify(memory));
    effectiveChoicesFor([eng], memory, "Charis", [andikaMaq]);
    expect(memory).toEqual(before);
  });
});

describe("findSldrEntry (sibling SIL fallback)", () => {
  it("borrows a sibling SIL font's entry, and says so", () => {
    const found = findSldrEntry("Charis", [andikaMaq]);
    expect(found).toEqual({ entry: andikaMaq, borrowed: true });
  });

  it("recognizes the older generation of family names", () => {
    expect(findSldrEntry("Charis SIL", [andikaMaq])?.borrowed).toBe(true);
    expect(findSldrEntry("Gentium Plus", [andikaMaq])?.borrowed).toBe(true);
  });

  it("prefers the font's own entry over a sibling's", () => {
    const charisOwn: FontFeatureDefault = {
      fontName: "Charis",
      features: { cv43: 1 },
    };
    // Andika's entry comes first in the array; the font's own still wins.
    const found = findSldrEntry("Charis SIL", [andikaMaq, charisOwn]);
    expect(found).toEqual({ entry: charisOwn, borrowed: false });
  });

  it("matches the font's own entry across name spellings", () => {
    const found = findSldrEntry("Doulos-SIL", [
      { fontName: "doulos sil", features: { cv43: 1 } },
    ]);
    expect(found?.borrowed).toBe(false);
  });

  it("lends nothing to a font outside the family", () => {
    expect(findSldrEntry("Noto Sans", [andikaMaq])).toBeUndefined();
  });

  it("ignores an entry that names a font without settings", () => {
    // The SLDR recommends fonts with no features to set — a recommendation,
    // not a configuration — and those must not shadow or stand in for one
    // that carries settings.
    expect(
      findSldrEntry("Noto Sans", [{ fontName: "Noto Sans", features: {} }])
    ).toBeUndefined();
    expect(
      findSldrEntry("Charis", [
        { fontName: "Charis", features: {} },
        andikaMaq,
      ])
    ).toEqual({ entry: andikaMaq, borrowed: true });
  });

  it("has nothing when the family has no entries at all", () => {
    expect(
      findSldrEntry("Charis", [{ fontName: "Noto Sans", features: { cv43: 2 } }])
    ).toBeUndefined();
  });
});

describe("effectiveShapeChoiceFor", () => {
  it("reports a row with a form in force", () => {
    const eng = engRow();
    const row = effectiveShapeChoiceFor(
      eng,
      { cv43: 2 },
      { [eng.key]: { kind: "sldr", fromFont: "Andika" } }
    );
    expect(row).toEqual({
      characters: ["Ŋ"],
      groupLabel: "Capital Eng",
      formLabel: "Capital form",
      source: { kind: "sldr", fromFont: "Andika" },
      tag: "cv43",
      value: 2,
    });
  });

  it("reports an untouched row as the font's own, value 0", () => {
    const eng = engRow();
    const row = effectiveShapeChoiceFor(eng, {}, {});
    expect(row.formLabel).toBeNull();
    expect(row.source).toEqual({ kind: "font-default" });
    expect(row.tag).toBe("cv43");
    expect(row.value).toBe(0);
  });
});
