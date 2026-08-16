/**
 * The sweep, and what it does with facts a host declared rather than left us to
 * read. The thing worth pinning down is the *absence* of work: a declared family
 * must not touch its bytes, and "did it get the right answer" cannot tell the
 * difference — reading the file would give the same answer, slowly. So every
 * test here watches `loadLocalFontBlob`.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LocalFontFamily } from "./localFonts";
import {
  buildCmapTable,
  buildGsubTable,
  buildNameTable,
  buildSfnt,
} from "./testFontBuilder";

/** The bytes each PostScript name has, if any; a name with none throws. */
const files = new Map<string, ArrayBuffer>();
const loadBlob = vi.fn(async (postscriptName: string) => {
  const bytes = files.get(postscriptName);
  if (!bytes) throw new Error(`${postscriptName} has no bytes here`);
  return new Blob([bytes]);
});

vi.mock("./localFonts", () => ({
  loadLocalFontBlob: (postscriptName: string) => loadBlob(postscriptName),
}));

import {
  declaredScanOf,
  hasDeclaredDetails,
  hasDeclaredLicense,
  scanFamiliesForCharacterVariants,
  scanFamiliesForLicense,
} from "./scanForCharacterVariants";

/** A font with a cmap, one cvXX feature, and an OFL notice in its `name`. */
function syntheticFont(): ArrayBuffer {
  return buildSfnt([
    { tag: "cmap", data: buildCmapTable([[0x41, 0x5a]]) },
    { tag: "GSUB", data: buildGsubTable(["cv01"]) },
    {
      tag: "name",
      data: buildNameTable([
        {
          nameId: 13,
          text: "This Font Software is licensed under the SIL Open Font License, Version 1.1.",
        },
        { nameId: 14, text: "https://openfontlicense.org" },
      ]),
    },
  ]);
}

beforeEach(() => {
  files.clear();
  loadBlob.mockClear();
});

/** Collects what a sweep reports, by family name. */
function collector<T>() {
  const found: Record<string, T> = {};
  return {
    found,
    report: (family: string, result: T) => {
      found[family] = result;
    },
  };
}

describe("scanFamiliesForLicense", () => {
  it("reports a declared licence without reading the font", async () => {
    // No entry in `files`, so any read at all would throw and be swallowed —
    // the declared verdict coming back out is only meaningful alongside the
    // assertion that nothing was read.
    const family: LocalFontFamily = {
      family: "Charis",
      postscriptName: "Charis-Regular",
      faceCount: 4,
      location: "disk",
      declared: {
        license: "open",
        licenseUrl: "https://openfontlicense.org",
        licenseReason: "Open Font License",
      },
    };
    const sink = collector();

    await scanFamiliesForLicense([family], sink.report);

    expect(loadBlob).not.toHaveBeenCalled();
    expect(sink.found["Charis"]).toEqual({
      license: "open",
      licenseUrl: "https://openfontlicense.org",
      licenseReason: "Open Font License",
    });
  });

  it("still reads a family that declares only its coverage", async () => {
    files.set("Charis-Regular", syntheticFont());
    const family: LocalFontFamily = {
      family: "Charis",
      postscriptName: "Charis-Regular",
      faceCount: 4,
      declared: { coverage: new Uint32Array([0x41, 0x5a]) },
    };
    const sink = collector();

    await scanFamiliesForLicense([family], sink.report);

    expect(loadBlob).toHaveBeenCalledTimes(1);
    expect(sink.found["Charis"]).toMatchObject({ license: "open" });
  });

  it("reads an undeclared family as it always did", async () => {
    files.set("Calibri", syntheticFont());
    const sink = collector();

    await scanFamiliesForLicense(
      [{ family: "Calibri", postscriptName: "Calibri", faceCount: 2 }],
      sink.report
    );

    expect(loadBlob).toHaveBeenCalledWith("Calibri");
    expect(sink.found["Calibri"]).toEqual({
      license: "open",
      licenseUrl: "https://openfontlicense.org",
      licenseReason: "Open Font License",
    });
  });
});

describe("scanFamiliesForCharacterVariants", () => {
  it("reads nothing when coverage and variants are both declared", async () => {
    const family: LocalFontFamily = {
      family: "Andika",
      postscriptName: "Andika-Regular",
      faceCount: 4,
      location: "disk",
      declared: {
        license: "open",
        licenseReason: "Open Font License",
        coverage: new Uint32Array([0x41, 0x5a]),
        variants: [
          { tag: "cv01", number: 1, parameterLabels: [], characters: [] },
        ],
      },
    };
    const sink = collector<{ coverage: Uint32Array; detailsRead: boolean }>();

    await scanFamiliesForCharacterVariants([family], sink.report);

    expect(loadBlob).not.toHaveBeenCalled();
    expect(sink.found["Andika"]).toMatchObject({
      detailsRead: true,
      license: "open",
      variants: [{ tag: "cv01" }],
    });
    expect([...sink.found["Andika"].coverage]).toEqual([0x41, 0x5a]);
  });

  it("takes a declared empty variants list as an answer, not a gap", async () => {
    // The font really does declare a cv01; the host says the family offers no
    // letter shapes, and the host wins without the file being opened to argue.
    files.set("NotoSansLao-Regular", syntheticFont());
    const family: LocalFontFamily = {
      family: "Noto Sans Lao",
      postscriptName: "NotoSansLao-Regular",
      faceCount: 2,
      declared: {
        license: "open",
        coverage: new Uint32Array([0xe80, 0xeff]),
        variants: [],
      },
    };
    const sink = collector<{ variants: unknown[] }>();

    await scanFamiliesForCharacterVariants([family], sink.report);

    expect(loadBlob).not.toHaveBeenCalled();
    expect(sink.found["Noto Sans Lao"].variants).toEqual([]);
  });

  it("reads only what a partial declaration leaves out", async () => {
    files.set("Charis-Regular", syntheticFont());
    const family: LocalFontFamily = {
      family: "Charis",
      postscriptName: "Charis-Regular",
      faceCount: 4,
      declared: { variants: [] },
    };
    const sink = collector<{ coverage: Uint32Array; variants: unknown[] }>();

    await scanFamiliesForCharacterVariants([family], sink.report);

    expect(loadBlob).toHaveBeenCalledTimes(1);
    // Coverage came off the cmap; the variants are the host's empty list rather
    // than the cv01 the GSUB declares.
    expect([...sink.found["Charis"].coverage]).toEqual([0x41, 0x5a]);
    expect(sink.found["Charis"].variants).toEqual([]);
  });

  it("reads everything for an undeclared family", async () => {
    files.set("Calibri", syntheticFont());
    const sink = collector<{
      coverage: Uint32Array;
      variants: { tag: string }[];
      detailsRead: boolean;
    }>();

    await scanFamiliesForCharacterVariants(
      [{ family: "Calibri", postscriptName: "Calibri", faceCount: 2 }],
      sink.report
    );

    expect(loadBlob).toHaveBeenCalledTimes(1);
    expect([...sink.found["Calibri"].coverage]).toEqual([0x41, 0x5a]);
    expect(sink.found["Calibri"].variants.map((v) => v.tag)).toEqual(["cv01"]);
    expect(sink.found["Calibri"].detailsRead).toBe(true);
  });

  it("leaves the licence alone when the caller already has it", async () => {
    files.set("Calibri", syntheticFont());
    const sink = collector<{ license?: string }>();

    await scanFamiliesForCharacterVariants(
      [{ family: "Calibri", postscriptName: "Calibri", faceCount: 2 }],
      sink.report,
      { readLicense: false }
    );

    expect(sink.found["Calibri"].license).toBeUndefined();
  });
});

describe("what a host declared, read back", () => {
  const declaring: LocalFontFamily = {
    family: "Charis",
    postscriptName: "Charis-Regular",
    faceCount: 4,
    declared: {
      license: "open",
      licenseReason: "Open Font License",
      coverage: new Uint32Array([0x41, 0x5a]),
      variants: [],
    },
  };
  const machine: LocalFontFamily = {
    family: "Calibri",
    postscriptName: "Calibri",
    faceCount: 2,
  };

  it("says which questions are already answered", () => {
    expect(hasDeclaredLicense(declaring)).toBe(true);
    expect(hasDeclaredDetails(declaring)).toBe(true);
    expect(hasDeclaredLicense(machine)).toBe(false);
    expect(hasDeclaredDetails(machine)).toBe(false);
  });

  it("hands back a scan a caller can show at once", () => {
    expect(declaredScanOf(declaring)).toMatchObject({
      license: "open",
      licenseReason: "Open Font License",
      variants: [],
      detailsRead: true,
    });
    expect(declaredScanOf(machine)).toBeUndefined();
  });

  it("does not claim the details of a half-declared family are read", () => {
    const half: LocalFontFamily = {
      ...machine,
      declared: { license: "open" },
    };
    expect(hasDeclaredDetails(half)).toBe(false);
    expect(declaredScanOf(half)).toEqual({
      license: "open",
      licenseUrl: undefined,
      licenseReason: undefined,
    });
  });
});
