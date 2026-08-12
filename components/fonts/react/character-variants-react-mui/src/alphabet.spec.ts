import { describe, expect, it } from "vitest";
import {
  charactersWithVariants,
  filterVariantsForAlphabet,
  parseAlphabet,
  representativeSample,
} from "./alphabet";
import { CharacterVariant } from "./readCharacterVariants";

const ENG_LOWER = String.fromCodePoint(0x14b);
const ENG_UPPER = String.fromCodePoint(0x14a);

function variant(
  tag: string,
  characters: string[],
  sampleText?: string
): CharacterVariant {
  return {
    tag,
    number: parseInt(tag.slice(2), 10),
    characters,
    codePoints: characters.map((c) => c.codePointAt(0) ?? 0),
    parameterLabels: [],
    sampleText,
  };
}

// Andika's Capital Eng feature, the one the user reported missing.
const capitalEng = variant("cv43", [ENG_UPPER]);
const lowerEng = variant("cv44", [ENG_LOWER]);
const unrelated = variant("cv10", ["z"]);

describe("filterVariantsForAlphabet", () => {
  it("shows a capital's variants to an alphabet written in lower case", () => {
    const kept = filterVariantsForAlphabet(
      [capitalEng, unrelated],
      parseAlphabet(ENG_LOWER)
    );

    expect(kept.map((v) => v.tag)).toEqual(["cv43"]);
    // The tile still shows the character the feature actually changes.
    expect(kept[0].characters).toEqual([ENG_UPPER]);
  });

  it("shows a lower case letter's variants to an alphabet written in capitals", () => {
    const kept = filterVariantsForAlphabet(
      [lowerEng, unrelated],
      parseAlphabet(ENG_UPPER)
    );

    expect(kept.map((v) => v.tag)).toEqual(["cv44"]);
  });

  it("still drops a variant that touches nothing in the alphabet", () => {
    const kept = filterVariantsForAlphabet(
      [unrelated],
      parseAlphabet(ENG_LOWER)
    );

    expect(kept).toEqual([]);
  });

  it("narrows a variant's characters to the ones the alphabet asked about", () => {
    const both = variant("cv43", [ENG_UPPER, "z"]);

    const kept = filterVariantsForAlphabet([both], parseAlphabet(ENG_LOWER));

    expect(kept[0].characters).toEqual([ENG_UPPER]);
    expect(kept[0].codePoints).toEqual([0x14a]);
  });

  it("folds case in the sample text a font falls back on", () => {
    const noCharacters = variant("cv50", [], ENG_UPPER);

    const kept = filterVariantsForAlphabet(
      [noCharacters],
      parseAlphabet(ENG_LOWER)
    );

    expect(kept.map((v) => v.tag)).toEqual(["cv50"]);
  });

  it("leaves a character whose case change lengthens it matching only itself", () => {
    // "ß" upper-cases to "SS", which is not one letter to look at any more.
    const sharpS = variant("cv60", ["ß"]);

    expect(filterVariantsForAlphabet([sharpS], parseAlphabet("SS"))).toEqual(
      []
    );
    expect(
      filterVariantsForAlphabet([sharpS], parseAlphabet("ß")).map((v) => v.tag)
    ).toEqual(["cv60"]);
  });
});

describe("representativeSample", () => {
  it("shows the first character the feature affects", () => {
    expect(representativeSample(variant("cv43", [ENG_UPPER, "z"]))).toEqual(
      ENG_UPPER
    );
  });

  it("prefers the affected characters over the font's sample text", () => {
    expect(
      representativeSample(variant("cv43", [ENG_UPPER], "a phrase to read"))
    ).toEqual(ENG_UPPER);
  });

  it("keeps a short sample whole when the font names no characters", () => {
    expect(representativeSample(variant("cv50", [], "0123"))).toEqual("0123");
  });

  it("shows one character of a sample too long to be a sample", () => {
    expect(
      representativeSample(variant("cv50", [], "Hamburgefonstiv"))
    ).toEqual("H");
  });

  it("has nothing to show for a variant that offers nothing", () => {
    expect(representativeSample(variant("cv50", []))).toEqual("");
  });

  it("ignores the placeholder some fonts ship instead of a sample", () => {
    expect(representativeSample(variant("cv50", [], "Sample Text"))).toEqual(
      ""
    );
    expect(representativeSample(variant("cv50", [], "sample_text"))).toEqual(
      ""
    );
  });
});

describe("charactersWithVariants", () => {
  it("marks the letter the user typed, not the capital they didn't", () => {
    expect(charactersWithVariants([capitalEng], ENG_LOWER)).toEqual(
      new Set([ENG_LOWER])
    );
  });

  it("marks a capital in the alphabet when the variant affects the lower case", () => {
    expect(charactersWithVariants([lowerEng], ENG_UPPER)).toEqual(
      new Set([ENG_UPPER])
    );
  });

  it("marks nothing for an alphabet no variant touches", () => {
    expect(charactersWithVariants([unrelated], ENG_LOWER)).toEqual(new Set());
  });
});
