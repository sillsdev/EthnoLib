import { describe, expect, it } from "vitest";
import {
  coversAlphabet,
  coversCodePoint,
  mergeCoverageRanges,
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

describe("mergeCoverageRanges", () => {
  it("unions two subset files' coverage into one sorted set", () => {
    // The Tongan shape: a latin file and a latin-ext file, each with letters
    // the other hasn't, answering as one family.
    const latin = ranges([0x20, 0x7e], [0xe0, 0xff]);
    const latinExt = ranges([0x100, 0x17f]);

    const merged = mergeCoverageRanges([latinExt, latin]);
    expect(coversCodePoint(merged, 0x61)).toBe(true); // a
    expect(coversCodePoint(merged, 0xe1)).toBe(true); // á
    expect(coversCodePoint(merged, 0x101)).toBe(true); // ā
    expect(coversCodePoint(merged, 0x1e00)).toBe(false);
  });

  it("fuses overlapping and adjacent ranges", () => {
    expect([
      ...mergeCoverageRanges([ranges([10, 20], [40, 50]), ranges([15, 21], [22, 30])]),
    ]).toEqual([10, 30, 40, 50]);
  });

  it("keeps a lone coverage as it is, and nothing from nothing", () => {
    expect([...mergeCoverageRanges([ranges([1, 2])])]).toEqual([1, 2]);
    expect([...mergeCoverageRanges([])]).toEqual([]);
    expect([...mergeCoverageRanges([new Uint32Array()])]).toEqual([]);
  });
});
