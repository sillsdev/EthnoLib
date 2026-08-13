import { describe, expect, it } from "vitest";
import type { FamilyScan, LocalFontFamily } from "@ethnolib/font-core";
import { mergeFonts } from "./mergeFonts";
import type { FontInfo } from "./types";

function localFamily(family: string): LocalFontFamily {
  return { family, postscriptName: family.replace(/\s/g, ""), faceCount: 1 };
}

function scan(scan: Partial<FamilyScan>): FamilyScan {
  return {
    variants: [],
    coverage: new Uint32Array(),
    detailsRead: false,
    ...scan,
  };
}

/** Packed coverage ranges for exactly these characters. */
function covers(characters: string): Uint32Array {
  const points = [...characters]
    .map((c) => c.codePointAt(0) as number)
    .sort((a, b) => a - b);
  return new Uint32Array(points.flatMap((point) => [point, point]));
}

describe("mergeFonts", () => {
  it("marks fonts found on the machine as installed", () => {
    const { main } = mergeFonts({ local: [localFamily("Andika")] });
    expect(main).toEqual([{ family: "Andika", installed: true }]);
  });

  it("keeps catalog-only fonts, not installed by default", () => {
    const catalog: FontInfo[] = [{ family: "Gentium Plus", license: "open" }];
    const { main } = mergeFonts({ catalog });
    expect(main).toEqual([
      { family: "Gentium Plus", license: "open", installed: false },
    ]);
  });

  it("takes the catalog's word on a font it says is not here yet", () => {
    const { main } = mergeFonts({
      catalog: [
        { family: "Marula Text", installed: false, downloadSizeBytes: 1000 },
      ],
    });
    expect(main[0].installed).toBe(false);
    expect(main[0].downloadSizeBytes).toBe(1000);
  });

  it("carries a downloadable font's file and preview urls through", () => {
    const { main } = mergeFonts({
      catalog: [
        {
          family: "Noto Sans",
          installed: false,
          license: "open",
          fileUrl: "https://fonts.gstatic.com/noto-sans-regular.ttf",
          previewFontUrl: "https://fonts.gstatic.com/noto-sans-menu.ttf",
        },
      ],
    });
    expect(main[0]).toMatchObject({
      installed: false,
      fileUrl: "https://fonts.gstatic.com/noto-sans-regular.ttf",
      previewFontUrl: "https://fonts.gstatic.com/noto-sans-menu.ttf",
    });
  });

  it("keeps the catalog's file url for a font that turns out to be installed", () => {
    const { main } = mergeFonts({
      local: [localFamily("Noto Sans")],
      catalog: [
        {
          family: "Noto Sans",
          installed: false,
          fileUrl: "https://fonts.gstatic.com/noto-sans-regular.ttf",
        },
      ],
    });
    expect(main[0]).toMatchObject({
      installed: true,
      fileUrl: "https://fonts.gstatic.com/noto-sans-regular.ttf",
    });
  });

  it("lets the host's metadata beat what the font's own bytes say", () => {
    const { main } = mergeFonts({
      local: [localFamily("Charis SIL")],
      catalog: [
        {
          family: "Charis SIL",
          license: "open",
          licenseUrl: "https://example.org/ofl",
          licenseNotes: "Shipped with the app.",
        },
      ],
      scanned: {
        "Charis SIL": scan({
          license: "limits-apply",
          licenseUrl: "https://font.example/legal",
        }),
      },
    });
    expect(main[0]).toMatchObject({
      family: "Charis SIL",
      installed: true,
      license: "open",
      licenseUrl: "https://example.org/ofl",
      licenseNotes: "Shipped with the app.",
    });
  });

  it("falls back to the scanned hints where the host says nothing", () => {
    const { main } = mergeFonts({
      local: [localFamily("Andika")],
      catalog: [{ family: "Andika", licenseNotes: "A note." }],
      scanned: {
        Andika: scan({ license: "open", licenseUrl: "https://ofl.example" }),
      },
    });
    expect(main[0]).toMatchObject({
      license: "open",
      licenseUrl: "https://ofl.example",
      licenseNotes: "A note.",
    });
  });

  it("counts an installed font as installed even when the catalog assumed otherwise", () => {
    const { main } = mergeFonts({
      local: [localFamily("Gentium Plus")],
      catalog: [{ family: "Gentium Plus", installed: false }],
    });
    expect(main[0].installed).toBe(true);
  });

  it("matches families whatever their capitalization, keeping the machine's spelling", () => {
    const { main } = mergeFonts({
      local: [localFamily("Charis SIL")],
      catalog: [{ family: "charis sil", license: "open" }],
    });
    expect(main).toHaveLength(1);
    expect(main[0].family).toBe("Charis SIL");
    expect(main[0].license).toBe("open");
  });

  it("puts limited, unreadable and restricted licences behind the disclosure", () => {
    const { main, closed } = mergeFonts({
      local: [
        localFamily("Andika"),
        localFamily("Mystery Sans"),
        localFamily("Corporate Serif"),
        localFamily("Marula Text"),
      ],
      scanned: {
        Andika: scan({ license: "open" }),
        "Mystery Sans": scan({ license: "unknown" }),
        "Corporate Serif": scan({ license: "system-restricted" }),
        "Marula Text": scan({ license: "limits-apply" }),
      },
    });
    expect(main.map((f) => f.family)).toEqual(["Andika"]);
    expect(closed.map((f) => f.family)).toEqual([
      "Corporate Serif",
      "Marula Text",
      "Mystery Sans",
    ]);
  });

  it("keeps a font the sweep has not reached in the main list", () => {
    const { main, closed } = mergeFonts({ local: [localFamily("Andika")] });
    expect(main.map((f) => f.family)).toEqual(["Andika"]);
    expect(closed).toEqual([]);
  });

  it("leaves out a font we know cannot write the alphabet", () => {
    const { main, closed } = mergeFonts({
      local: [localFamily("Andika"), localFamily("Latin Only")],
      scanned: {
        Andika: scan({ license: "open" }),
        "Latin Only": scan({ license: "open" }),
      },
      alphabet: new Set(["a", "ñ"]),
      coverage: {
        Andika: covers("añ"),
        "Latin Only": covers("a"),
      },
    });
    expect(main.map((f) => f.family)).toEqual(["Andika"]);
    expect(closed).toEqual([]);
  });

  it("leaves one out of the closed group too", () => {
    const { main, closed } = mergeFonts({
      local: [localFamily("Corporate Serif"), localFamily("Mystery Sans")],
      scanned: {
        "Corporate Serif": scan({ license: "system-restricted" }),
        "Mystery Sans": scan({ license: "unknown" }),
      },
      alphabet: new Set(["ñ"]),
      coverage: {
        "Corporate Serif": covers("a"),
        "Mystery Sans": covers("ñ"),
      },
    });
    expect(main).toEqual([]);
    expect(closed.map((f) => f.family)).toEqual(["Mystery Sans"]);
  });

  it("keeps a font whose coverage we have not read", () => {
    // Unknown is not the same as missing: a font the sweep hasn't reached, or a
    // downloadable one whose bytes we never fetched, stays on offer.
    const { main } = mergeFonts({
      local: [localFamily("Andika")],
      catalog: [{ family: "Noto Sans", installed: false, license: "open" }],
      alphabet: new Set(["ñ"]),
      coverage: {},
    });
    expect(main.map((f) => f.family)).toEqual(["Andika", "Noto Sans"]);
  });

  it("filters nothing when there is no alphabet to check against", () => {
    const { main } = mergeFonts({
      local: [localFamily("Latin Only")],
      alphabet: new Set(),
      coverage: { "Latin Only": covers("a") },
    });
    expect(main.map((f) => f.family)).toEqual(["Latin Only"]);
  });

  it("takes a font back once the alphabet no longer needs what it lacks", () => {
    const input = {
      local: [localFamily("Latin Only")],
      coverage: { "Latin Only": covers("a") },
    };
    expect(
      mergeFonts({ ...input, alphabet: new Set(["a", "ñ"]) }).main
    ).toEqual([]);
    expect(
      mergeFonts({ ...input, alphabet: new Set(["a"]) }).main.map(
        (f) => f.family
      )
    ).toEqual(["Latin Only"]);
  });

  it("never drops the font the user is looking at", () => {
    // Its coverage often lands after the selection does, and taking it off the
    // screen at that moment would leave the user's choice nowhere to be seen. The
    // details pane says which letters are missing instead.
    const { main } = mergeFonts({
      local: [localFamily("Andika"), localFamily("Latin Only")],
      alphabet: new Set(["ñ"]),
      coverage: { Andika: covers("ñ"), "Latin Only": covers("a") },
      alwaysInclude: "latin only",
    });
    expect(main.map((f) => f.family)).toEqual(["Andika", "Latin Only"]);
  });

  it("sorts each group alphabetically", () => {
    const { main, closed } = mergeFonts({
      local: [localFamily("Zapfino"), localFamily("Andika")],
      catalog: [
        { family: "Marula Text", license: "limits-apply" },
        { family: "Corporate Serif", license: "unknown" },
      ],
    });
    expect(main.map((f) => f.family)).toEqual(["Andika", "Zapfino"]);
    expect(closed.map((f) => f.family)).toEqual([
      "Corporate Serif",
      "Marula Text",
    ]);
  });

  it("puts installed fonts above ones that need downloading", () => {
    const { main } = mergeFonts({
      local: [localFamily("Zapfino")],
      catalog: [
        { family: "Andika", installed: false },
        { family: "Yrsa", installed: false },
      ],
    });
    expect(main.map((f) => f.family)).toEqual(["Zapfino", "Andika", "Yrsa"]);
  });
});
