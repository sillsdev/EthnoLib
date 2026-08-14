import { beforeEach, describe, expect, it } from "vitest";
import {
  pruneLocalFontListCache,
  readCachedLocalFontList,
  writeCachedLocalFontList,
} from "./localFontListCache";
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

const families: LocalFontFamily[] = [
  { family: "Andika", postscriptName: "Andika-Regular", faceCount: 4 },
  { family: "Garuda", postscriptName: "Garuda", faceCount: 1 },
];

let storage: FakeStorage;
beforeEach(() => {
  storage = new FakeStorage();
});

describe("reading and writing", () => {
  it("gives back what was put in", () => {
    writeCachedLocalFontList(families, storage);
    expect(readCachedLocalFontList(storage)).toEqual(families);
  });

  it("misses before anything was written", () => {
    expect(readCachedLocalFontList(storage)).toBeUndefined();
  });

  it("does not remember an empty enumeration", () => {
    // The plausible ways to get one are all failures better re-asked.
    writeCachedLocalFontList([], storage);
    expect(storage.length).toEqual(0);
  });

  it("treats a damaged entry as a miss", () => {
    writeCachedLocalFontList(families, storage);
    const key = storage.keys()[0];

    storage.setItem(key, "{not json");
    expect(readCachedLocalFontList(storage)).toBeUndefined();

    storage.setItem(key, JSON.stringify([{ family: 42 }]));
    expect(readCachedLocalFontList(storage)).toBeUndefined();

    storage.setItem(key, JSON.stringify([]));
    expect(readCachedLocalFontList(storage)).toBeUndefined();
  });

  it("keeps only the fields it promised, whatever else was stored", () => {
    writeCachedLocalFontList(
      [{ ...families[0], extra: "field" } as LocalFontFamily],
      storage
    );
    expect(readCachedLocalFontList(storage)).toEqual([families[0]]);
  });

  it("carries on when storage refuses to work", () => {
    storage.failWrites = true;
    expect(() => writeCachedLocalFontList(families, storage)).not.toThrow();

    storage.failWrites = false;
    storage.failReads = true;
    expect(readCachedLocalFontList(storage)).toBeUndefined();
  });

  it("does nothing at all without storage", () => {
    expect(() => writeCachedLocalFontList(families, undefined)).not.toThrow();
    expect(readCachedLocalFontList(undefined)).toBeUndefined();
  });
});

describe("pruneLocalFontListCache", () => {
  it("drops entries from older schemas and leaves the rest alone", () => {
    storage.setItem("ethnolib.localFontList.s0", "[]");
    storage.setItem("something.else", "keep me");
    writeCachedLocalFontList(families, storage);

    expect(pruneLocalFontListCache(storage)).toEqual(1);
    expect(readCachedLocalFontList(storage)).toEqual(families);
    expect(storage.getItem("something.else")).toEqual("keep me");
  });
});
