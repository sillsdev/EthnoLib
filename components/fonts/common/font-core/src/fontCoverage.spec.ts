import { describe, expect, it } from "vitest";
import {
  coversAlphabet,
  coversCodePoint,
  readCoverageRanges,
} from "./fontCoverage";
import { parseAlphabet } from "./alphabet";
import { buildCmapTable, buildSfnt } from "./testFontBuilder";

/** Packed [start, end] pairs, the shape readCoverageRanges returns. */
function ranges(...pairs: [number, number][]): Uint32Array {
  return new Uint32Array(pairs.flat());
}

const E = 0x65;
const COMBINING_ACUTE = 0x301;
// Written out rather than typed, so that nothing along the way can normalize it
// into the single precomposed character and quietly defeat the test.
const E_WITH_ACUTE = String.fromCodePoint(E, COMBINING_ACUTE);

describe("readCoverageRanges", () => {
  it("reads a format 12 cmap", async () => {
    const font = buildSfnt([
      {
        tag: "cmap",
        data: buildCmapTable([
          [0x61, 0x63],
          [0x1f600, 0x1f600],
        ]),
      },
    ]);

    const coverage = await readCoverageRanges(new Blob([font]));

    expect([...coverage]).toEqual([0x61, 0x63, 0x1f600, 0x1f600]);
  });

  it("says a font with no cmap covers nothing", async () => {
    const coverage = await readCoverageRanges(new Blob([buildSfnt([])]));

    expect([...coverage]).toEqual([]);
  });
});

describe("coversCodePoint", () => {
  it("finds a code point inside a range and misses one outside", () => {
    const coverage = ranges([0x61, 0x63], [0x391, 0x393]);

    expect(coversCodePoint(coverage, 0x62)).toBe(true);
    expect(coversCodePoint(coverage, 0x392)).toBe(true);
    expect(coversCodePoint(coverage, 0x64)).toBe(false);
  });
});

describe("coversAlphabet", () => {
  it("needs every code point of a character, not just the first", () => {
    // A font with the letter but not the mark renders the mark from somewhere
    // else, which is the mismatch the user was seeing.
    const alphabet = new Set([E_WITH_ACUTE]);

    expect(coversAlphabet(ranges([E, E]), alphabet)).toBe(false);
    expect(
      coversAlphabet(
        ranges([E, E], [COMBINING_ACUTE, COMBINING_ACUTE]),
        alphabet
      )
    ).toBe(true);
  });

  it("handles a multi-character entry a host app might pass whole", () => {
    const alphabet = new Set(["ch"]);

    expect(coversAlphabet(ranges([0x63, 0x63]), alphabet)).toBe(false);
    expect(coversAlphabet(ranges([0x63, 0x68]), alphabet)).toBe(true);
  });

  it("still asks about both parts when parseAlphabet splits them itself", () => {
    // parseAlphabet spreads the text into single code points, so the mark arrives
    // as its own entry; either way the answer has to be the same.
    const alphabet = parseAlphabet(E_WITH_ACUTE);

    expect(coversAlphabet(ranges([E, E]), alphabet)).toBe(false);
    expect(
      coversAlphabet(
        ranges([E, E], [COMBINING_ACUTE, COMBINING_ACUTE]),
        alphabet
      )
    ).toBe(true);
  });

  it("covers an alphabet the font has in full", () => {
    expect(coversAlphabet(ranges([0x61, 0x7a]), parseAlphabet("a b c"))).toBe(
      true
    );
  });

  it("treats an empty alphabet as covered by anything", () => {
    expect(coversAlphabet(new Uint32Array(), new Set())).toBe(true);
  });
});
