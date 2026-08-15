import { describe, expect, it } from "vitest";
import type { FamilyScan, LocalFontFamily } from "@ethnolib/font-core";
import { downloadPolicy } from "./constrainedNetwork";
import { mergeFonts, sectionForMoreFonts } from "./mergeFonts";
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
    expect(main).toEqual([
      { family: "Andika", installed: true, location: "installed" },
    ]);
  });

  it("keeps catalog-only fonts, not installed by default", () => {
    const catalog: FontInfo[] = [{ family: "Gentium Plus", license: "open" }];
    const { main } = mergeFonts({ catalog });
    expect(main).toEqual([
      {
        family: "Gentium Plus",
        license: "open",
        installed: false,
        location: "network",
      },
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

  it("leaves a suggested font the machine also has usable with no network", () => {
    // The offline case worth checking end to end, because it needs the two
    // rules to agree: the merge has to notice that the suggestion is already on
    // the machine, and the download rules then have nothing to do — no offer,
    // no fetch, and the font read off disk like any other installed one. Get
    // the first half wrong and a font the user has sits in the list marked
    // unavailable.
    const { main } = mergeFonts({
      local: [localFamily("Andika")],
      catalog: [
        {
          family: "andika",
          installed: false,
          supportsLanguage: true,
          fileUrl: "https://cdn.example/andika.ttf",
        },
      ],
      alphabet: new Set(["ŋ"]),
      coverage: { Andika: covers("ŋ") },
    });

    // The machine's spelling, since that is what CSS has to resolve.
    expect(main.map((font) => font.family)).toEqual(["Andika"]);
    expect(main[0].installed).toBe(true);
    expect(downloadPolicy("offline", main[0])).toBe("none");
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

  it("keeps a suggested font whose coverage we have not read", () => {
    // Unknown is not the same as missing: a catalog font whose bytes we never
    // fetched was suggested for this language, and stays on that word.
    const { main } = mergeFonts({
      catalog: [{ family: "Noto Sans", installed: false, license: "open" }],
      alphabet: new Set(["ñ"]),
      coverage: {},
    });
    expect(main.map((f) => f.family)).toEqual(["Noto Sans"]);
  });

  it("holds a machine-only font back until its coverage is read", () => {
    // Nobody suggested it for this alphabet, so it doesn't show until its own
    // bytes say it belongs — showing it and then taking it away when the sweep
    // caught up was the list visibly changing its mind.
    const unread = mergeFonts({
      local: [localFamily("Andika")],
      alphabet: new Set(["ñ"]),
      coverage: {},
    });
    expect(unread.main).toEqual([]);

    const read = mergeFonts({
      local: [localFamily("Andika")],
      alphabet: new Set(["ñ"]),
      coverage: { Andika: covers("ñ") },
    });
    expect(read.main.map((f) => f.family)).toEqual(["Andika"]);
  });

  it("holds every machine-only font back while the alphabet is being looked up", () => {
    const { main } = mergeFonts({
      local: [localFamily("Andika")],
      catalog: [{ family: "Noto Sans", installed: false, license: "open" }],
      alphabetPending: true,
      coverage: { Andika: covers("a") },
    });
    expect(main.map((f) => f.family)).toEqual(["Noto Sans"]);
  });

  it("keeps a machine-only closed font on offer while unread", () => {
    // Closed fonts aren't read until the user opens the disclosure, so waiting
    // on their coverage would keep the group empty forever.
    const { closed } = mergeFonts({
      local: [localFamily("Mystery Sans")],
      scanned: { "Mystery Sans": scan({ license: "unknown" }) },
      alphabet: new Set(["ñ"]),
      coverage: {},
    });
    expect(closed.map((f) => f.family)).toEqual(["Mystery Sans"]);
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

  it("puts recommended fonts first among the ones needing downloading", () => {
    const { main } = mergeFonts({
      local: [localFamily("Zapfino")],
      catalog: [
        { family: "Andika", installed: false },
        { family: "Yrsa", installed: false, supportsLanguage: true },
        { family: "Noto Sans Thai", installed: false, supportsLanguage: true },
      ],
    });
    expect(main.map((f) => f.family)).toEqual([
      "Zapfino",
      "Noto Sans Thai",
      "Yrsa",
      "Andika",
    ]);
  });

  it("counts a font fetched this session as installed", () => {
    const { main } = mergeFonts({
      catalog: [
        {
          family: "Noto Sans",
          installed: false,
          fileUrl: "https://fonts.gstatic.com/noto-sans-regular.ttf",
        },
      ],
      sessionDownloaded: new Set(["noto sans"]),
    });
    expect(main[0]).toMatchObject({ family: "Noto Sans", installed: true });
  });

  it("matches a fetched family however the catalog capitalized it", () => {
    const { main } = mergeFonts({
      catalog: [{ family: "Gentium Plus", installed: false }],
      sessionDownloaded: new Set(["gentium plus"]),
    });
    expect(main[0].installed).toBe(true);
  });

  it("leaves alone a font nobody fetched", () => {
    const { main } = mergeFonts({
      catalog: [
        { family: "Andika", installed: false },
        { family: "Yrsa", installed: false },
      ],
      sessionDownloaded: new Set(["andika"]),
    });
    expect(main.map((f) => [f.family, f.installed])).toEqual([
      ["Andika", true],
      ["Yrsa", false],
    ]);
  });

  it("sorts a fetched font up among the ready ones", () => {
    // The list's first group is "fonts you can use right now", and once the
    // browser has the face that is what this is.
    const { main } = mergeFonts({
      local: [localFamily("Zapfino")],
      catalog: [
        { family: "Andika", installed: false },
        { family: "Yrsa", installed: false },
      ],
      sessionDownloaded: new Set(["yrsa"]),
    });
    expect(main.map((f) => f.family)).toEqual(["Yrsa", "Zapfino", "Andika"]);
  });

  it("leaves installed fonts alphabetical whatever is recommended", () => {
    const { main } = mergeFonts({
      local: [localFamily("Zapfino"), localFamily("Andika")],
      catalog: [{ family: "Zapfino", supportsLanguage: true }],
    });
    expect(main.map((f) => f.family)).toEqual(["Andika", "Zapfino"]);
  });
});

describe("sectionForMoreFonts", () => {
  const found = (family: string): FontInfo => ({
    family,
    installed: false,
    license: "open",
    fileUrl: `https://cdn.example/${family.toLowerCase()}.ttf`,
  });

  it("keeps the search's own order rather than re-sorting", () => {
    const section = sectionForMoreFonts(
      [found("Roboto"), found("Open Sans"), found("Inter"), found("Arimo")],
      {}
    );
    expect(section.map((font) => font.family)).toEqual([
      "Roboto",
      "Open Sans",
      "Inter",
      "Arimo",
    ]);
  });

  it("leaves out families already offered above the divider", () => {
    const section = sectionForMoreFonts(
      [found("Roboto"), found("Andika"), found("Noto Sans")],
      {
        local: [localFamily("Andika")],
        catalog: [{ family: "Noto Sans", license: "open" }],
      }
    );
    expect(section.map((font) => font.family)).toEqual(["Roboto"]);
  });

  it("matches those families however they are capitalized", () => {
    const section = sectionForMoreFonts([found("ANDIKA")], {
      local: [localFamily("Andika")],
    });
    expect(section).toEqual([]);
  });

  it("says each family once however often the search names it", () => {
    const section = sectionForMoreFonts([found("Roboto"), found("roboto")], {});
    expect(section.map((font) => font.family)).toEqual(["Roboto"]);
  });

  it("counts a session download as installed", () => {
    const section = sectionForMoreFonts([found("Roboto")], {
      sessionDownloaded: new Set(["roboto"]),
    });
    expect(section[0].installed).toBe(true);
  });

  it("drops a font whose read coverage misses the alphabet, keeps the unread", () => {
    const section = sectionForMoreFonts([found("Roboto"), found("Inter")], {
      alphabet: new Set(["ŋ"]),
      coverage: { Roboto: covers("abc") },
    });
    expect(section.map((font) => font.family)).toEqual(["Inter"]);
  });

  it("never holds its fonts back for a pending alphabet — the search vouched for them", () => {
    const section = sectionForMoreFonts([found("Roboto")], {
      alphabetPending: true,
      alphabet: new Set(),
    });
    expect(section.map((font) => font.family)).toEqual(["Roboto"]);
  });

  it("keeps the selected font whatever its coverage turned out to be", () => {
    const section = sectionForMoreFonts([found("Roboto")], {
      alphabet: new Set(["ŋ"]),
      coverage: { Roboto: covers("abc") },
      alwaysInclude: "Roboto",
    });
    expect(section.map((font) => font.family)).toEqual(["Roboto"]);
  });
});

/**
 * Where each font ended up, which the list's hover mark reads. Kept apart from
 * `installed` on purpose: the two answer different questions, and a font can be
 * usable right now without being anywhere on the machine.
 */
describe("mergeFonts location", () => {
  it("calls a font from the machine's list installed", () => {
    const { main } = mergeFonts({ local: [localFamily("Andika")] });
    expect(main[0].location).toBe("installed");
  });

  it("keeps a host's word that its local font is a file it ships", () => {
    const { main } = mergeFonts({
      local: [{ ...localFamily("Andika"), location: "disk" }],
    });
    expect(main[0]).toMatchObject({ installed: true, location: "disk" });
  });

  it("puts a catalog font nobody has placed on the network", () => {
    const { main } = mergeFonts({ catalog: [{ family: "Roboto" }] });
    expect(main[0].location).toBe("network");
  });

  it("lets the catalog say a font of its own is on disk", () => {
    const { main } = mergeFonts({
      catalog: [{ family: "Andika", installed: true, location: "disk" }],
    });
    expect(main[0].location).toBe("disk");
  });

  it("believes the machine over a catalog that assumed a download", () => {
    const { main } = mergeFonts({
      local: [localFamily("Andika")],
      catalog: [{ family: "andika", installed: false }],
    });
    expect(main[0]).toMatchObject({ installed: true, location: "installed" });
  });

  it("still says network for a font fetched this session, since nothing was saved", () => {
    const { main } = mergeFonts({
      catalog: [{ family: "Roboto", installed: false }],
      sessionDownloaded: new Set(["roboto"]),
    });
    expect(main[0]).toMatchObject({ installed: true, location: "network" });
  });

  it("marks the wider search's finds as network", () => {
    const section = sectionForMoreFonts(
      [{ family: "Roboto", installed: false, license: "open" }],
      { sessionDownloaded: new Set(["roboto"]) }
    );
    expect(section[0].location).toBe("network");
  });
});
