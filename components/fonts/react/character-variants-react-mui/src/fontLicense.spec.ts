/**
 * These cases are Bloom's, not ours: each is a rule out of
 * `FontMetadata.DetermineSuitability()` in BloomDesktop
 * (src/BloomExe/FontProcessing/FontMetadata.cs), so that a font both programs read
 * the same bytes for gets the same answer from both. fontLicense.ts has the
 * mapping between Bloom's four verdicts and our four categories.
 */

import { describe, expect, it } from "vitest";
import {
  classifyLicense,
  describeLicense,
  readLicenseHints,
} from "./fontLicense";
import { buildNameTable, buildOs2Table, buildSfnt } from "./testFontBuilder";

describe("classifyLicense, from the licence text", () => {
  it("reads the Open Font License as open", () => {
    expect(
      classifyLicense({
        description:
          "This Font Software is licensed under the SIL Open Font License, Version 1.1.",
      })
    ).toEqual("open");
    expect(classifyLicense({ description: "Licensed under the OFL" })).toEqual(
      "open"
    );
  });

  it("reads the Apache License and the GNU licences as open", () => {
    expect(
      classifyLicense({
        description: "Licensed under the Apache License, Version 2.0",
      })
    ).toEqual("open");
    expect(
      classifyLicense({ description: "Released under the GNU GPL version 2" })
    ).toEqual("open");
    expect(
      classifyLicense({
        description: "Released under the GNU Lesser General Public License",
      })
    ).toEqual("open");
  });

  it("calls a licence that keeps the font to itself limits-apply", () => {
    expect(
      classifyLicense({
        description: "You may not copy or distribute this font",
      })
    ).toEqual("limits-apply");
    expect(
      classifyLicense({
        description: "To use this font, please contact the vendor.",
      })
    ).toEqual("limits-apply");
    expect(
      classifyLicense({ description: "This is a Microsoft supplied font." })
    ).toEqual("limits-apply");
  });

  it("reads the MIT licence as open, which Bloom does not", () => {
    // Our one deliberate divergence from Bloom's list; see fontLicense.ts.
    expect(
      classifyLicense({ description: "Licensed under the MIT License" })
    ).toEqual("open");
    expect(classifyLicense({ description: "the mit licence" })).toEqual("open");
    expect(
      classifyLicense({ copyright: "Copyright 2019 Somebody. MIT License." })
    ).toEqual("open");
    expect(
      describeLicense({ description: "Released under the MIT licence" }).notes
    ).toEqual("MIT License");
  });

  it("does not read a bare MIT as the licence", () => {
    // In a copyright line that is as likely to be the university as a grant of
    // rights, so the word "licence" has to be there.
    expect(
      classifyLicense({ copyright: "Copyright 2019 MIT Media Lab" })
    ).toEqual("unknown");
  });

  it("matches Apache only at the start of the text, as Bloom does", () => {
    // Bloom uses StartsWith for this one, so the same words further in don't count.
    // Following it exactly is the point: the two programs agree even where the rule
    // is arguably thin.
    expect(
      classifyLicense({ description: "This font is under the Apache License" })
    ).toEqual("unknown");
  });

  it("reads the Bitstream free license as open", () => {
    expect(
      classifyLicense({
        description:
          "Permission is hereby granted, free of charge, to any person obtaining a copy of the fonts accompanying this license (the Bitstream Vera Fonts).",
      })
    ).toEqual("open");
  });

  it("names Microsoft as the reason when the copyright agrees", () => {
    expect(
      describeLicense({
        description: "You must contact the vendor for licensing.",
        copyright: "(c) Microsoft Corporation. All rights reserved.",
      }).notes
    ).toEqual("Microsoft font");
    expect(
      describeLicense({ description: "Please contact the vendor." }).notes
    ).toEqual("Contact the vendor");
  });
});

describe("classifyLicense, from the copyright", () => {
  it("reads the rest of the copyright licences Bloom knows as open", () => {
    for (const copyright of [
      "Released under the Artistic License",
      "Copyright 2009, licensed under the GNU General Public License",
      "Copyright 2009, under the GNU Lesser General Public License",
      "No Rights Reserved.",
      "This font is freeware.",
    ]) {
      expect(classifyLicense({ copyright })).toEqual("open");
    }
  });

  it("warns about the copyrights that say no", () => {
    expect(
      classifyLicense({ copyright: "(c) 2018 Microsoft Corporation" })
    ).toEqual("limits-apply");
    expect(
      classifyLicense({
        copyright: "Copyright Some Foundry. Do not distribute.",
      })
    ).toEqual("limits-apply");
  });

  it("reads the licences fonts name only in their copyright as open", () => {
    expect(
      classifyLicense({ copyright: "Licensed under the SIL Open Font License" })
    ).toEqual("open");
    // British spelling, which is how Ubuntu writes it.
    expect(
      classifyLicense({ copyright: "Ubuntu Font Licence, Version 1.0" })
    ).toEqual("open");
    expect(classifyLicense({ copyright: "Creative Commons BY 4.0" })).toEqual(
      "open"
    );
  });

  it("believes a bare all-rights-reserved when there is nothing else", () => {
    expect(
      classifyLicense({ copyright: "Some Foundry. All rights reserved." })
    ).toEqual("limits-apply");
  });

  it("does not use the copyright when the licence text says something", () => {
    // The all-rights-reserved rule asks for no licence text, since boilerplate in
    // the copyright says little next to a licence the font actually names.
    expect(
      classifyLicense({
        copyright: "Some Foundry. All rights reserved.",
        description:
          "This Font Software is licensed under the SIL Open Font License",
      })
    ).toEqual("open");
  });
});

describe("classifyLicense, from the embedding bits", () => {
  it("calls a font that refuses embedding system-restricted", () => {
    expect(classifyLicense({ fsType: 0x0002 })).toEqual("system-restricted");
    expect(classifyLicense({ fsType: 0x0200 })).toEqual("system-restricted");
  });

  it("calls preview-and-print-only embedding limits-apply", () => {
    expect(classifyLicense({ fsType: 0x0004 })).toEqual("limits-apply");
  });

  it("does not warn about a font that allows editable embedding", () => {
    // The older spec let a font set several bits and meant the loosest of them.
    expect(classifyLicense({ fsType: 0x000c })).toEqual("unknown");
    expect(classifyLicense({ fsType: 0x0000 })).toEqual("unknown");
  });

  it("takes the least restrictive bit when a font sets more than one", () => {
    expect(classifyLicense({ fsType: 0x0002 | 0x0008 })).toEqual("unknown");
    expect(classifyLicense({ fsType: 0x0002 | 0x0004 })).toEqual(
      "limits-apply"
    );
  });

  it("lets an open licence outweigh restrictive embedding bits", () => {
    // fsType is about embedding, not about who may pass the font on.
    expect(
      classifyLicense({ description: "SIL Open Font License", fsType: 0x0002 })
    ).toEqual("open");
  });
});

describe("classifyLicense, when it can't tell", () => {
  it("says unknown for a licence it does not recognize", () => {
    expect(
      classifyLicense({ description: "Property of Some Foundry, all of it." })
    ).toEqual("unknown");
    expect(classifyLicense({ url: "https://example.com/our-eula" })).toEqual(
      "unknown"
    );
    // Bloom looks at the URL for exactly one licence, so neither do we: the OFL in
    // name ID 14 with nothing in ID 13 goes unrecognized in both programs.
    expect(classifyLicense({ url: "https://scripts.sil.org/OFL" })).toEqual(
      "unknown"
    );
  });

  it("knows the one licence URL Bloom knows", () => {
    expect(
      classifyLicense({ url: "http://dejavu-fonts.org/wiki/License" })
    ).toEqual("open");
  });

  it("says unknown when the font declares nothing", () => {
    expect(classifyLicense({})).toEqual("unknown");
  });
});

describe("describeLicense", () => {
  it("gives the reason along with the verdict", () => {
    expect(describeLicense({ description: "Licensed under the OFL" })).toEqual({
      category: "open",
      notes: "Open Font License",
    });
    expect(describeLicense({})).toEqual({
      category: "unknown",
      notes: "no reliable information",
    });
  });
});

describe("readLicenseHints", () => {
  it("finds name IDs 0, 13 and 14 and the OS/2 fsType", () => {
    const font = buildSfnt([
      { tag: "OS/2", data: buildOs2Table(0x0004) },
      {
        tag: "name",
        data: buildNameTable([
          { nameId: 0, text: "Copyright 2020 Some Foundry" },
          { nameId: 1, text: "Test Family" },
          { nameId: 13, text: "Licensed under the SIL Open Font License" },
          { nameId: 14, text: "https://scripts.sil.org/OFL" },
        ]),
      },
    ]);

    expect(readLicenseHints(font)).toEqual({
      copyright: "Copyright 2020 Some Foundry",
      description: "Licensed under the SIL Open Font License",
      url: "https://scripts.sil.org/OFL",
      fsType: 0x0004,
    });
  });

  it("leaves the fields undefined for a font that declares none of them", () => {
    const font = buildSfnt([
      { tag: "name", data: buildNameTable([{ nameId: 1, text: "Bare" }]) },
    ]);

    expect(readLicenseHints(font)).toEqual({
      copyright: undefined,
      description: undefined,
      url: undefined,
      fsType: undefined,
    });
  });

  it("throws on bytes that are not a font", () => {
    expect(() => readLicenseHints(new ArrayBuffer(64))).toThrow(/font/i);
  });
});
