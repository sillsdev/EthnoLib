import { describe, expect, it } from "vitest";
import {
  DIGITS,
  charactersWithVariants,
  filterVariantsForAlphabet,
  parseAlphabet,
  representativeSample,
  sortVariantsByCharacter,
  variantsFor,
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

describe("sortVariantsByCharacter", () => {
  function labelled(tag: string, characters: string[], label: string) {
    return { ...variant(tag, characters), label };
  }

  it("follows the order the alphabet was written in, not the code points", () => {
    // Alphabets are ordered lists; plenty of them are not in code point order.
    const sorted = sortVariantsByCharacter(
      [variant("cv01", ["a"]), variant("cv02", ["y"]), variant("cv03", ["z"])],
      parseAlphabet("z a y")
    );

    expect(sorted.map((v) => v.tag)).toEqual(["cv03", "cv01", "cv02"]);
  });

  it("interleaves the stylistic sets with the character variants", () => {
    const sorted = sortVariantsByCharacter(
      [variant("cv09", ["b"]), variant("ss01", ["a"]), variant("cv02", ["c"])],
      parseAlphabet("abc")
    );

    expect(sorted.map((v) => v.tag)).toEqual(["ss01", "cv09", "cv02"]);
  });

  it("sorts a variant by the earliest alphabet character it affects", () => {
    const sorted = sortVariantsByCharacter(
      [variant("cv01", ["c", "a"]), variant("cv02", ["b"])],
      parseAlphabet("abc")
    );

    expect(sorted.map((v) => v.tag)).toEqual(["cv01", "cv02"]);
  });

  it("gives a capital the place of the lower case letter in the alphabet", () => {
    const sorted = sortVariantsByCharacter(
      [variant("cv02", ["z"]), variant("cv43", [ENG_UPPER])],
      parseAlphabet("a " + ENG_LOWER + " z")
    );

    expect(sorted.map((v) => v.tag)).toEqual(["cv43", "cv02"]);
  });

  it("puts the variants the alphabet says nothing about last, by code point", () => {
    const sorted = sortVariantsByCharacter(
      [variant("cv01", ["7"]), variant("cv02", ["0"]), variant("cv03", ["b"])],
      parseAlphabet("b")
    );

    expect(sorted.map((v) => v.tag)).toEqual(["cv03", "cv02", "cv01"]);
  });

  it("breaks a tie with the label, so the order doesn't wobble", () => {
    const sorted = sortVariantsByCharacter(
      [labelled("ss04", ["a"], "Curly a"), labelled("cv01", ["a"], "Barred a")],
      parseAlphabet("a")
    );

    expect(sorted.map((v) => v.tag)).toEqual(["cv01", "ss04"]);
  });

  it("sorts the digit list into counting order", () => {
    const sorted = variantsFor(
      [variant("cv01", ["7"]), variant("cv02", ["0"]), variant("ss01", ["3"])],
      new Set([...DIGITS])
    );

    expect(sorted.map((v) => v.tag)).toEqual(["cv02", "ss01", "cv01"]);
  });

  it("falls back to the sample text of a variant that names no characters", () => {
    const sorted = sortVariantsByCharacter(
      [variant("cv01", ["c"]), variant("cv02", [], "a")],
      parseAlphabet("abc")
    );

    expect(sorted.map((v) => v.tag)).toEqual(["cv02", "cv01"]);
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
