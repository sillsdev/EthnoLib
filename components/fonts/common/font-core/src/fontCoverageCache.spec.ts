import { beforeEach, describe, expect, it } from "vitest";
import {
  coverageCacheKey,
  pruneCoverageCache,
  readCachedCoverage,
  readCachedCoverages,
  writeCachedCoverage,
} from "./fontCoverageCache";
import type { LicenseCacheStorage } from "./fontLicenseCache";
import type { LocalFontFamily } from "./localFonts";

/** A `localStorage` that lives in a Map, and can be told to misbehave. */
class FakeStorage implements LicenseCacheStorage {
  private items = new Map<string, string>();
  public failWrites = false;
  public failReads = false;

  get length(): number {
    return this.items.size;
  }
  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null;
  }
  getItem(key: string): string | null {
    if (this.failReads) throw new Error("nope");
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error("quota exceeded");
    this.items.set(key, value);
  }
  removeItem(key: string): void {
    this.items.delete(key);
  }
  keys(): string[] {
    return [...this.items.keys()];
  }
}

const andika: LocalFontFamily = {
  family: "Andika",
  postscriptName: "Andika-Regular",
  faceCount: 4,
};
const other: LocalFontFamily = {
  family: "Some Other",
  postscriptName: "SomeOther",
  faceCount: 1,
};

/** Packed ranges covering ASCII letters and one astral pair. */
const ranges = new Uint32Array([0x41, 0x5a, 0x61, 0x7a, 0x1f600, 0x1f600]);

let storage: FakeStorage;
beforeEach(() => {
  storage = new FakeStorage();
});

describe("coverageCacheKey", () => {
  it("changes when the font does", () => {
    expect(coverageCacheKey({ ...andika, faceCount: 5 })).not.toEqual(
      coverageCacheKey(andika)
    );
    expect(
      coverageCacheKey({ ...andika, postscriptName: "Andika-Bold" })
    ).not.toEqual(coverageCacheKey(andika));
  });
});

describe("reading and writing", () => {
  it("gives back what was put in", () => {
    writeCachedCoverage(andika, ranges, storage);
    expect(readCachedCoverage(andika, storage)).toEqual(ranges);
  });

  it("does not remember empty coverage", () => {
    // The scan reports empty both for an empty cmap and for a font it failed to
    // read, and remembering the failure would hide the font for good.
    writeCachedCoverage(andika, new Uint32Array(), storage);
    expect(readCachedCoverage(andika, storage)).toBeUndefined();
    expect(storage.length).toEqual(0);
  });

  it("misses on a font it has not seen", () => {
    expect(readCachedCoverage(andika, storage)).toBeUndefined();
  });

  it("collects what it knows about a list of families", () => {
    writeCachedCoverage(andika, ranges, storage);
    expect(readCachedCoverages([andika, other], storage)).toEqual({
      Andika: ranges,
    });
  });

  it("treats a damaged entry as a miss", () => {
    storage.setItem(coverageCacheKey(andika), "{not json");
    expect(readCachedCoverage(andika, storage)).toBeUndefined();

    // Ranges come in pairs; an odd count is a torn write.
    storage.setItem(coverageCacheKey(andika), "[1, 2, 3]");
    expect(readCachedCoverage(andika, storage)).toBeUndefined();

    storage.setItem(coverageCacheKey(andika), '[1, "2"]');
    expect(readCachedCoverage(andika, storage)).toBeUndefined();
  });

  it("carries on when storage refuses to work", () => {
    storage.failWrites = true;
    expect(() => writeCachedCoverage(andika, ranges, storage)).not.toThrow();

    storage.failWrites = false;
    storage.failReads = true;
    expect(readCachedCoverage(andika, storage)).toBeUndefined();
  });

  it("does nothing at all without storage", () => {
    expect(() => writeCachedCoverage(andika, ranges, undefined)).not.toThrow();
    expect(readCachedCoverage(andika, undefined)).toBeUndefined();
    expect(readCachedCoverages([andika], undefined)).toEqual({});
  });
});

describe("pruneCoverageCache", () => {
  it("drops entries from older schemas and leaves the rest alone", () => {
    storage.setItem("ethnolib.fontCoverage.s0.Andika|Andika-Regular|4", "[]");
    storage.setItem("something.else", "keep me");
    writeCachedCoverage(andika, ranges, storage);

    expect(pruneCoverageCache(storage)).toEqual(1);
    expect(storage.keys()).toEqual([
      "something.else",
      coverageCacheKey(andika),
    ]);
  });
});
