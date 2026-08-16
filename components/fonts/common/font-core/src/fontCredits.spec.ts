import { describe, expect, it } from "vitest";
import { creditsFromNames, readFontCredits } from "./fontCredits";
import { buildNameTable, buildSfnt } from "./testFontBuilder";

/** A font whose `name` table holds exactly these records. */
function fontNaming(records: { nameId: number; text: string }[]): ArrayBuffer {
  return buildSfnt([{ tag: "name", data: buildNameTable(records) }]);
}

describe("readFontCredits", () => {
  it("reads the credit fields out of a font", () => {
    const font = fontNaming([
      { nameId: 0, text: "© 2005-2023 SIL International." },
      { nameId: 5, text: "Version 6.101" },
      { nameId: 8, text: "SIL International" },
      { nameId: 9, text: "Victor Gaultney" },
      { nameId: 11, text: "https://software.sil.org/" },
      { nameId: 12, text: "https://software.sil.org/doulos/" },
    ]);

    expect(readFontCredits(font)).toEqual({
      copyright: "© 2005-2023 SIL International.",
      version: "6.101",
      manufacturer: "SIL International",
      designer: "Victor Gaultney",
      manufacturerUrl: "https://software.sil.org/",
      designerUrl: "https://software.sil.org/doulos/",
    });
  });

  it("says nothing for a font that names nobody", () => {
    expect(readFontCredits(fontNaming([{ nameId: 1, text: "Nameless" }]))).toBe(
      undefined
    );
    // Not even a `name` table: a synthetic font, or one we only half understand.
    expect(readFontCredits(buildSfnt([]))).toBe(undefined);
  });

  it("keeps a field the font gives and leaves out the rest", () => {
    expect(
      readFontCredits(fontNaming([{ nameId: 0, text: "Copyright Monotype." }]))
    ).toEqual({
      copyright: "Copyright Monotype.",
      version: undefined,
      designer: undefined,
      designerUrl: undefined,
      manufacturer: undefined,
      manufacturerUrl: undefined,
    });
  });
});

describe("the version number", () => {
  it("drops the build stamp foundries hang off it", () => {
    expect(
      creditsFromNames(
        new Map([
          [5, "Version 2.100;GOOG;noto-source:20170915:90ef993387c0"],
        ])
      )?.version
    ).toEqual("2.100");
  });

  it("drops the word 'Version', whatever case it is in", () => {
    expect(creditsFromNames(new Map([[5, "version 1.000"]]))?.version).toEqual(
      "1.000"
    );
  });

  it("leaves a version that is only a number alone", () => {
    expect(creditsFromNames(new Map([[5, "1.2"]]))?.version).toEqual("1.2");
  });
});

describe("the URLs a font gives", () => {
  it("supplies the scheme foundries leave off", () => {
    expect(creditsFromNames(new Map([[11, "www.sil.org"]]))?.manufacturerUrl)
      .toEqual("https://www.sil.org/");
  });

  it("refuses anything that isn't a web page", () => {
    // The `name` table is arbitrary text out of a file on the user's machine, so
    // a link built from it must not be able to run anything.
    expect(
      creditsFromNames(new Map([[12, "javascript:alert(1)"]]))?.designerUrl
    ).toBe(undefined);
    expect(
      creditsFromNames(new Map([[12, "mailto:type@example.com"]]))?.designerUrl
    ).toBe(undefined);
  });

  it("ignores a blank field rather than linking to nowhere", () => {
    expect(creditsFromNames(new Map([[11, "   "]]))).toBe(undefined);
  });
});
