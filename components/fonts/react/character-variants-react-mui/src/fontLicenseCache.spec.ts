import { beforeEach, describe, expect, it } from "vitest";
import {
  LicenseCacheStorage,
  licenseCacheKey,
  pruneLicenseCache,
  readCachedLicense,
  readCachedLicenses,
  writeCachedLicense,
} from "./fontLicenseCache";
import { LICENSE_CLASSIFICATION_VERSION } from "./fontLicense";
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

let storage: FakeStorage;
beforeEach(() => {
  storage = new FakeStorage();
});

describe("licenseCacheKey", () => {
  it("carries the rules version, so changing the rules loses the old answers", () => {
    expect(licenseCacheKey(andika)).toContain(
      `r${LICENSE_CLASSIFICATION_VERSION}`
    );
  });

  it("changes when the font does", () => {
    expect(licenseCacheKey({ ...andika, faceCount: 5 })).not.toEqual(
      licenseCacheKey(andika)
    );
    expect(
      licenseCacheKey({ ...andika, postscriptName: "Andika-Bold" })
    ).not.toEqual(licenseCacheKey(andika));
  });
});

describe("reading and writing", () => {
  it("gives back what was put in", () => {
    writeCachedLicense(
      andika,
      { license: "open", licenseUrl: "https://scripts.sil.org/OFL" },
      storage
    );

    expect(readCachedLicense(andika, storage)).toEqual({
      license: "open",
      licenseUrl: "https://scripts.sil.org/OFL",
    });
  });

  it("remembers a font it could not read, which is worth not repeating", () => {
    writeCachedLicense(andika, {}, storage);

    // Present, and empty: a hit, not a miss.
    expect(readCachedLicense(andika, storage)).toEqual({
      license: undefined,
      licenseUrl: undefined,
    });
  });

  it("misses on a font it has not seen", () => {
    expect(readCachedLicense(andika, storage)).toBeUndefined();
  });

  it("collects what it knows about a list of families", () => {
    writeCachedLicense(andika, { license: "open" }, storage);

    expect(readCachedLicenses([andika, other], storage)).toEqual({
      Andika: { license: "open", licenseUrl: undefined },
    });
  });

  it("treats a damaged entry as a miss", () => {
    storage.setItem(licenseCacheKey(andika), "{not json");

    expect(readCachedLicense(andika, storage)).toBeUndefined();
  });

  it("carries on when storage refuses to work", () => {
    storage.failWrites = true;
    expect(() =>
      writeCachedLicense(andika, { license: "open" }, storage)
    ).not.toThrow();

    storage.failWrites = false;
    storage.failReads = true;
    expect(readCachedLicense(andika, storage)).toBeUndefined();
  });

  it("does nothing at all without storage", () => {
    expect(() =>
      writeCachedLicense(andika, { license: "open" }, undefined)
    ).not.toThrow();
    expect(readCachedLicense(andika, undefined)).toBeUndefined();
    expect(readCachedLicenses([andika], undefined)).toEqual({});
  });
});

describe("pruneLicenseCache", () => {
  it("drops entries from older rules and leaves the rest alone", () => {
    storage.setItem("ethnolib.fontLicense.s1.r0.Andika|Andika-Regular|4", "{}");
    storage.setItem("something.else", "keep me");
    writeCachedLicense(andika, { license: "open" }, storage);

    expect(pruneLicenseCache(storage)).toEqual(1);
    expect(storage.keys()).toEqual(["something.else", licenseCacheKey(andika)]);
  });
});
