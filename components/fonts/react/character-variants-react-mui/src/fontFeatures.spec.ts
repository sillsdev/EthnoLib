import { describe, expect, it } from "vitest";
import {
  hasOldStyleNumerals,
  readCharacterVariants,
  readGsubFeatureTags,
} from "./readCharacterVariants";
import { buildGsubTable, buildSfnt } from "./testFontBuilder";

function fontWithFeatures(tags: string[]): ArrayBuffer {
  return buildSfnt([{ tag: "GSUB", data: buildGsubTable(tags) }]);
}

describe("readGsubFeatureTags", () => {
  it("lists every feature tag the font declares", () => {
    expect(
      readGsubFeatureTags(fontWithFeatures(["cv01", "liga", "onum"]))
    ).toEqual(new Set(["cv01", "liga", "onum"]));
  });

  it("lists a feature once however many times it is recorded", () => {
    // A font records the same feature per script and language system.
    const tags = readGsubFeatureTags(
      fontWithFeatures(["onum", "onum", "cv01"])
    );
    expect([...tags]).toEqual(["onum", "cv01"]);
  });

  it("is empty for a font with no GSUB", () => {
    expect(readGsubFeatureTags(buildSfnt([]))).toEqual(new Set());
  });
});

describe("hasOldStyleNumerals", () => {
  it("is true when the font declares onum", () => {
    expect(hasOldStyleNumerals(fontWithFeatures(["cv01", "onum"]))).toBe(true);
  });

  it("is false when it declares other number features but not onum", () => {
    expect(hasOldStyleNumerals(fontWithFeatures(["pnum", "tnum"]))).toBe(false);
  });

  it("is false for a font with no GSUB", () => {
    expect(hasOldStyleNumerals(buildSfnt([]))).toBe(false);
  });
});

describe("readCharacterVariants alongside the feature reader", () => {
  it("picks out the cvXX features and leaves the rest alone", () => {
    const variants = readCharacterVariants(
      fontWithFeatures(["onum", "cv03", "liga", "cv01"])
    );
    expect(variants.map((v) => v.tag)).toEqual(["cv01", "cv03"]);
    expect(variants[0]).toEqual({
      tag: "cv01",
      number: 1,
      parameterLabels: [],
      characters: [],
      codePoints: [],
    });
  });
});
