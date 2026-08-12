import { describe, expect, it } from "vitest";
import { missingFromAlphabet } from "./missingCharacters";

/** Packed [start, end] coverage pairs, from the characters a font is to have. */
function coverageOf(characters: string): Uint32Array {
  const points = [...characters]
    .map((c) => c.codePointAt(0) as number)
    .sort((a, b) => a - b);
  return new Uint32Array(points.flatMap((p) => [p, p]));
}

/** An "e" with a combining acute after it: one letter written as two code points. */
const E_ACUTE = "é";

describe("missingFromAlphabet", () => {
  it("finds nothing missing when the font has every letter", () => {
    expect(missingFromAlphabet(coverageOf("abc"), ["a", "b", "c"])).toEqual([]);
  });

  it("names the letters the font hasn't got, in the alphabet's order", () => {
    expect(missingFromAlphabet(coverageOf("ab"), ["a", "ŋ", "b", "ɔ"])).toEqual(
      ["ŋ", "ɔ"]
    );
  });

  it("counts a letter as missing when only its combining mark is", () => {
    expect(missingFromAlphabet(coverageOf("e"), [E_ACUTE])).toEqual([E_ACUTE]);
  });

  it("accepts a letter whose base and mark are both there", () => {
    expect(missingFromAlphabet(coverageOf(E_ACUTE), [E_ACUTE])).toEqual([]);
  });

  it("treats a font that covers nothing as missing everything", () => {
    expect(missingFromAlphabet(new Uint32Array(), ["a", "b"])).toEqual([
      "a",
      "b",
    ]);
  });
});
