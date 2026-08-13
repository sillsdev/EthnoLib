import { describe, expect, it } from "vitest";
import { DIGITS, parseAlphabet, variantsBeyond, variantsFor } from "./alphabet";
import { CharacterVariant } from "./readCharacterVariants";

const digits = parseAlphabet(DIGITS);

function variant(
  tag: string,
  fields: Partial<CharacterVariant> = {}
): CharacterVariant {
  return {
    tag,
    number: Number(tag.slice(2)),
    parameterLabels: [],
    characters: [],
    codePoints: [],
    ...fields,
  };
}

const zero = variant("cv01", { characters: ["0"] });
const eng = variant("cv02", { characters: ["Ŋ", "ŋ"] });
const both = variant("cv03", { characters: ["7", "ŋ"] });
const figuresBySample = variant("cv04", { sampleText: "0123" });
const wordBySample = variant("cv05", { sampleText: "ŋaŋa" });
const silent = variant("cv06");

describe("variantsFor", () => {
  it("keeps the variants that redraw a digit", () => {
    expect(variantsFor([zero, eng], digits)).toEqual([zero]);
  });

  it("counts a variant that redraws digits and letters alike", () => {
    expect(variantsFor([both], digits)).toEqual([both]);
  });

  it("reads the font's sample text when it names no characters", () => {
    expect(variantsFor([figuresBySample, wordBySample], digits)).toEqual([
      figuresBySample,
    ]);
  });

  it("leaves out a variant that says nothing about what it affects", () => {
    expect(variantsFor([silent], digits)).toEqual([]);
  });
});

describe("variantsBeyond", () => {
  it("drops the variants that only redraw digits", () => {
    expect(variantsBeyond([zero, eng], digits)).toEqual([eng]);
  });

  it("leaves a variant that touches both to the digit list, rather than showing it twice", () => {
    expect(variantsBeyond([both], digits)).toEqual([]);
    expect(variantsFor([both], digits)).toEqual([both]);
  });

  it("treats a figure feature described with sub- and superscripts as a digit one", () => {
    // Andika describes its Seven feature with the sample text "7₇⁷"; the subscript
    // and superscript sevens are not digits, so a naive rule would show it twice.
    const seven = variant("cv07", { sampleText: "7₇⁷" });
    expect(variantsBeyond([seven], digits)).toEqual([]);
    expect(variantsFor([seven], digits)).toEqual([seven]);
  });

  it("drops a digit-only variant known only by its sample text", () => {
    expect(variantsBeyond([figuresBySample, wordBySample], digits)).toEqual([
      wordBySample,
    ]);
  });

  it("keeps a variant that says nothing rather than hiding it from both lists", () => {
    expect(variantsBeyond([silent], digits)).toEqual([silent]);
  });

  it("splits a font's variants into two lists holding each of them exactly once", () => {
    const all = [zero, eng, both, figuresBySample, wordBySample, silent];
    const letters = variantsBeyond(all, digits);
    const figures = variantsFor(all, digits);
    for (const v of all) {
      expect([letters.includes(v), figures.includes(v)]).toEqual(
        expect.arrayContaining([true])
      );
      expect(letters.includes(v) && figures.includes(v)).toBe(false);
    }
    expect(letters.length + figures.length).toBe(all.length);
  });
});
