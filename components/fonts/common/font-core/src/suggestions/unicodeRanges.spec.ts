import { describe, expect, it } from "vitest";
import { parseUnicodeRanges } from "./unicodeRanges";
import { coversAlphabet, coversCodePoint } from "../fontCoverage";
import { parseAlphabet } from "../alphabet";

/** The parsed ranges as plain pairs, which reads better in a failure message. */
function pairs(text: string): number[][] {
  const packed = parseUnicodeRanges(text);
  const out: number[][] = [];
  for (let i = 0; i < packed.length; i += 2)
    out.push([packed[i], packed[i + 1]]);
  return out;
}

describe("parseUnicodeRanges", () => {
  it("reads a single code point", () => {
    expect(pairs("U+0041")).toEqual([[0x41, 0x41]]);
  });

  it("reads a range", () => {
    expect(pairs("U+0041-005A")).toEqual([[0x41, 0x5a]]);
  });

  it("expands a wildcard to the range it stands for", () => {
    expect(pairs("U+2??")).toEqual([[0x200, 0x2ff]]);
    expect(pairs("U+1F6??")).toEqual([[0x1f600, 0x1f6ff]]);
  });

  it("takes lower case and stray whitespace", () => {
    expect(pairs("  u+0e01 ,\tu+0e30-0e3a ")).toEqual([
      [0x0e01, 0x0e01],
      [0x0e30, 0x0e3a],
    ]);
  });

  it("puts the ranges in order whatever order they were given in", () => {
    expect(pairs("U+0100,U+0041-005A,U+00C0")).toEqual([
      [0x41, 0x5a],
      [0xc0, 0xc0],
      [0x100, 0x100],
    ]);
  });

  it("merges ranges that overlap or touch", () => {
    expect(pairs("U+0041-0050,U+0045-005A,U+005B-0060")).toEqual([
      [0x41, 0x60],
    ]);
  });

  it("swallows a range inside another", () => {
    expect(pairs("U+0041-005A,U+0045-0046")).toEqual([[0x41, 0x5a]]);
  });

  it("skips what it doesn't understand and keeps the rest", () => {
    // A backwards range, a missing prefix, hex that isn't, a wildcard used as a
    // range end, and one good token.
    expect(pairs("U+005A-0041, 0041, U+ZZZZ, U+2??-3FF, U+0041")).toEqual([
      [0x41, 0x41],
    ]);
  });

  it("gives nothing back for nothing usable", () => {
    expect(parseUnicodeRanges("")).toEqual(new Uint32Array());
    expect(parseUnicodeRanges("not a range at all")).toEqual(new Uint32Array());
  });

  it("drops code points past the end of Unicode", () => {
    expect(pairs("U+110000")).toEqual([]);
    expect(pairs("U+10FFF0-110020")).toEqual([[0x10fff0, 0x10ffff]]);
  });
});

describe("what comes out is what fontCoverage reads", () => {
  it("answers coversCodePoint from a parsed range", () => {
    const ranges = parseUnicodeRanges("U+0041-005A");

    expect(coversCodePoint(ranges, 0x41)).toBe(true);
    expect(coversCodePoint(ranges, 0x5a)).toBe(true);
    expect(coversCodePoint(ranges, 0x61)).toBe(false);
    expect(coversCodePoint(ranges, 0x40)).toBe(false);
  });

  it("finds a code point in a later range, so the binary search sees sorted pairs", () => {
    const ranges = parseUnicodeRanges("U+0041-005A,U+0100-0101,U+1E00-1E01");

    expect(coversCodePoint(ranges, 0x1e01)).toBe(true);
    expect(coversCodePoint(ranges, 0x0100)).toBe(true);
    expect(coversCodePoint(ranges, 0x0102)).toBe(false);
  });

  it("answers coversAlphabet, which is what a subset gets asked", () => {
    // Roughly Fontsource's Latin subset against a Thai alphabet and an English one.
    const latin = parseUnicodeRanges(
      "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+2000-206F"
    );

    expect(coversAlphabet(latin, parseAlphabet("a b c d e"))).toBe(true);
    expect(coversAlphabet(latin, parseAlphabet("ก ข ค"))).toBe(false);
  });
});
