import { describe, expect, it } from "vitest";
import { readCharacterVariants } from "./readCharacterVariants";
import { DIGITS, variantsBeyond, variantsFor } from "./alphabet";
import {
  SyntheticFeature,
  SyntheticLookup,
  buildAlternateSubstitution,
  buildCharacterVariantParams,
  buildCmapFormat4Table,
  buildCmapTable,
  buildExtensionSubstitution,
  buildGsubTable,
  buildNameTable,
  buildSfnt,
  buildSingleSubstitution,
  buildSingleSubstitutionFormat2,
  buildStylisticSetParams,
} from "./testFontBuilder";

// The synthetic font's glyph order: a–g are glyphs 1–7 and the digits 0–9 are
// glyphs 11–20. Glyph 100 and up are alternate shapes, which no character maps to,
// so they stand for the substitutes a feature puts in place.
const GLYPHS = new Map<string, number>([
  ...[..."abcdefg"].map((c, i): [string, number] => [c, 1 + i]),
  ...[..."0123456789"].map((c, i): [string, number] => [c, 11 + i]),
]);

function glyphsOf(characters: string): number[] {
  return [...characters].map((character) => {
    const glyph = GLYPHS.get(character);
    if (glyph === undefined) throw new Error(`no glyph for ${character}`);
    return glyph;
  });
}

/** A cmap placing every character above at the glyph GLYPHS gives it. */
function cmap(): Uint8Array {
  return buildCmapFormat4Table(
    [...GLYPHS].map(([character, glyph]) => ({
      codePoint: character.codePointAt(0)!,
      glyph,
    }))
  );
}

function font(
  features: (string | SyntheticFeature)[],
  {
    lookups = [],
    names = [],
    withCmap = true,
  }: {
    lookups?: SyntheticLookup[];
    names?: { nameId: number; text: string }[];
    withCmap?: boolean;
  } = {}
): ArrayBuffer {
  return buildSfnt([
    { tag: "GSUB", data: buildGsubTable(features, lookups) },
    { tag: "name", data: buildNameTable(names) },
    ...(withCmap ? [{ tag: "cmap", data: cmap() }] : []),
  ]);
}

/** A lookup redrawing these characters, as the plainest kind of substitution. */
function redraws(
  characters: string,
  coverageFormat: 1 | 2 = 1
): SyntheticLookup {
  return {
    type: 1,
    subtables: [
      buildSingleSubstitution(glyphsOf(characters), 99, coverageFormat),
    ],
  };
}

describe("stylistic set parameters", () => {
  it("names a set from the name table entry its parameters point at", () => {
    const variants = readCharacterVariants(
      font([{ tag: "ss01", params: buildStylisticSetParams(0x100) }], {
        names: [{ nameId: 0x100, text: "Single-storey a" }],
      })
    );
    expect(variants[0].label).toBe("Single-storey a");
  });

  it("falls back to a generic name when the set declares no parameters", () => {
    const variants = readCharacterVariants(font(["ss07"]));
    expect(variants[0].label).toBe("Alternate style 7");
  });

  it("falls back when the name id its parameters point at is missing", () => {
    const variants = readCharacterVariants(
      font([{ tag: "ss03", params: buildStylisticSetParams(0x200) }], {
        names: [{ nameId: 0x100, text: "Some other string" }],
      })
    );
    expect(variants[0].label).toBe("Alternate style 3");
  });

  it("reads the sets that exist and ignores tags outside ss01–ss20", () => {
    const variants = readCharacterVariants(
      font(["ss00", "ss01", "ss20", "ss21", "ss99"])
    );
    expect(variants.map((v) => v.tag)).toEqual(["ss01", "ss20"]);
  });

  it("lists the character variants before the stylistic sets", () => {
    const variants = readCharacterVariants(
      font(["ss02", "cv10", "ss01", "cv02"])
    );
    expect(variants.map((v) => v.tag)).toEqual([
      "cv02",
      "cv10",
      "ss01",
      "ss02",
    ]);
  });
});

describe("characters derived from the substitutions", () => {
  it("reads them from a single substitution's coverage", () => {
    const variants = readCharacterVariants(
      font([{ tag: "ss01", lookupIndices: [0] }], { lookups: [redraws("adg")] })
    );
    expect(variants[0].characters).toEqual(["a", "d", "g"]);
  });

  it("reads a coverage table given as ranges", () => {
    const variants = readCharacterVariants(
      font([{ tag: "ss01", lookupIndices: [0] }], {
        lookups: [redraws("abcd", 2)],
      })
    );
    expect(variants[0].characters).toEqual(["a", "b", "c", "d"]);
  });

  it("reads them from an alternate substitution", () => {
    const variants = readCharacterVariants(
      font([{ tag: "ss01", lookupIndices: [0] }], {
        lookups: [
          {
            type: 3,
            subtables: [
              buildAlternateSubstitution([
                { glyph: GLYPHS.get("b")!, choices: [100, 101] },
                { glyph: GLYPHS.get("e")!, choices: [102] },
              ]),
            ],
          },
        ],
      })
    );
    expect(variants[0].characters).toEqual(["b", "e"]);
  });

  it("looks through an extension subtable to the real one", () => {
    const variants = readCharacterVariants(
      font([{ tag: "ss01", lookupIndices: [0] }], {
        lookups: [
          {
            type: 7,
            subtables: [
              buildExtensionSubstitution(
                1,
                buildSingleSubstitution(glyphsOf("cf"), 99)
              ),
            ],
          },
        ],
      })
    );
    expect(variants[0].characters).toEqual(["c", "f"]);
  });

  it("says nothing about a feature built from lookups we don't read", () => {
    // Type 4 is ligature substitution: it replaces runs of glyphs, so "which
    // characters does this redraw" isn't a question with a tidy answer.
    const variants = readCharacterVariants(
      font([{ tag: "ss01", lookupIndices: [0] }], {
        lookups: [{ type: 4, subtables: [new Uint8Array(8)] }],
      })
    );
    expect(variants[0].characters).toEqual([]);
  });

  it("gathers the characters of every lookup a feature applies", () => {
    const variants = readCharacterVariants(
      font([{ tag: "ss01", lookupIndices: [0, 1] }], {
        lookups: [redraws("ab"), redraws("g")],
      })
    );
    expect(variants[0].characters).toEqual(["a", "b", "g"]);
  });

  it("gives two features the same characters when they share a lookup", () => {
    // The set does something of its own as well, so that it isn't dropped as a
    // repackaging of the cvXX; see the redundancy tests below.
    const variants = readCharacterVariants(
      font(
        [
          { tag: "ss01", lookupIndices: [0, 1] },
          { tag: "cv01", lookupIndices: [0] },
        ],
        { lookups: [redraws("ae"), redraws("g")] }
      )
    );
    expect(variants.map((v) => [v.tag, v.characters.join("")])).toEqual([
      ["cv01", "ae"],
      ["ss01", "aeg"],
    ]);
  });

  it("keeps the characters a cvXX names rather than deriving its own", () => {
    const variants = readCharacterVariants(
      font(
        [
          {
            tag: "cv01",
            lookupIndices: [0],
            params: buildCharacterVariantParams({
              codePoints: [0x61], // "a"
            }),
          },
        ],
        { lookups: [redraws("abc")] }
      )
    );
    expect(variants[0].characters).toEqual(["a"]);
  });

  it("derives them for a cvXX whose parameters name no characters", () => {
    const variants = readCharacterVariants(
      font(
        [
          {
            tag: "cv01",
            lookupIndices: [0],
            params: buildCharacterVariantParams({ labelNameId: 0x100 }),
          },
        ],
        {
          lookups: [redraws("bc")],
          names: [{ nameId: 0x100, text: "Curly b" }],
        }
      )
    );
    expect(variants[0]).toMatchObject({
      label: "Curly b",
      characters: ["b", "c"],
      codePoints: [0x62, 0x63],
    });
  });

  it("drops glyphs no character maps to", () => {
    const variants = readCharacterVariants(
      font([{ tag: "ss01", lookupIndices: [0] }], {
        lookups: [
          {
            type: 1,
            subtables: [buildSingleSubstitution([GLYPHS.get("a")!, 500], 9)],
          },
        ],
      })
    );
    expect(variants[0].characters).toEqual(["a"]);
  });

  it("drops the private-use characters a font parks its own shapes at", () => {
    const withPrivateUse = buildSfnt([
      {
        tag: "GSUB",
        data: buildGsubTable(
          [{ tag: "ss01", lookupIndices: [0] }],
          [{ type: 1, subtables: [buildSingleSubstitution([1, 2], 9)] }]
        ),
      },
      { tag: "name", data: buildNameTable([]) },
      {
        tag: "cmap",
        data: buildCmapFormat4Table([
          { codePoint: 0x61, glyph: 1 },
          { codePoint: 0xe072, glyph: 2 }, // an alternate shape of its own
        ]),
      },
    ]);
    expect(readCharacterVariants(withPrivateUse)[0].characters).toEqual(["a"]);
  });

  it("reads a font whose cmap is the newer format", () => {
    // buildCmapTable lays out one range per group, numbering glyphs from 1 + the
    // group's index, so this font's "a" is glyph 1 and its "b" is glyph 2.
    const withFormat12 = buildSfnt([
      {
        tag: "GSUB",
        data: buildGsubTable(
          [{ tag: "ss01", lookupIndices: [0] }],
          [{ type: 1, subtables: [buildSingleSubstitution([2], 9)] }]
        ),
      },
      { tag: "name", data: buildNameTable([]) },
      {
        tag: "cmap",
        data: buildCmapTable([
          [0x61, 0x61],
          [0x62, 0x62],
        ]),
      },
    ]);
    expect(readCharacterVariants(withFormat12)[0].characters).toEqual(["b"]);
  });

  it("says nothing about a font with no cmap to run backwards", () => {
    const variants = readCharacterVariants(
      font([{ tag: "ss01", lookupIndices: [0] }], {
        lookups: [redraws("ab")],
        withCmap: false,
      })
    );
    expect(variants[0].characters).toEqual([]);
  });
});

describe("stylistic sets that only repackage the character variants", () => {
  it("drops a set whose every substitution some cvXX also offers", () => {
    // The literacy-bundle shape: one set turning on what two cvXX features offer
    // separately.
    const variants = readCharacterVariants(
      font(
        [
          { tag: "cv01", lookupIndices: [0] },
          { tag: "cv02", lookupIndices: [1] },
          { tag: "ss01", lookupIndices: [0, 1] },
        ],
        { lookups: [redraws("a"), redraws("g")] }
      )
    );
    expect(variants.map((v) => v.tag)).toEqual(["cv01", "cv02"]);
  });

  it("drops the bundle when two smaller sets do the same work", () => {
    // Andika's shape: "Double-story a", "Double-story g", and a third set that is
    // exactly the two of them at once.
    const variants = readCharacterVariants(
      font(
        [
          { tag: "ss01", lookupIndices: [0, 1] },
          { tag: "ss13", lookupIndices: [0] },
          { tag: "ss14", lookupIndices: [1] },
        ],
        { lookups: [redraws("a"), redraws("g")] }
      )
    );
    expect(variants.map((v) => v.tag)).toEqual(["ss13", "ss14"]);
  });

  it("keeps both of two sets that do exactly the same thing", () => {
    // Neither is the finer offer, so there is no principled way to pick.
    const variants = readCharacterVariants(
      font(
        [
          { tag: "ss01", lookupIndices: [0] },
          { tag: "ss02", lookupIndices: [0] },
        ],
        { lookups: [redraws("a")] }
      )
    );
    expect(variants.map((v) => v.tag)).toEqual(["ss01", "ss02"]);
  });

  it("keeps a set that substitutes something no cvXX does", () => {
    const variants = readCharacterVariants(
      font(
        [
          { tag: "cv01", lookupIndices: [0] },
          { tag: "ss01", lookupIndices: [0, 1] },
        ],
        { lookups: [redraws("a"), redraws("e")] }
      )
    );
    expect(variants.map((v) => v.tag)).toEqual(["cv01", "ss01"]);
  });

  it("keeps a set that redraws the same character a different way", () => {
    // Same input glyph, a different glyph drawn instead: a real second choice,
    // however much the two features look alike from the character list.
    const a = GLYPHS.get("a")!;
    const variants = readCharacterVariants(
      font(
        [
          { tag: "cv01", lookupIndices: [0] },
          { tag: "ss01", lookupIndices: [1] },
        ],
        {
          lookups: [
            {
              type: 1,
              subtables: [
                buildSingleSubstitutionFormat2([{ glyph: a, substitute: 100 }]),
              ],
            },
            {
              type: 1,
              subtables: [
                buildSingleSubstitutionFormat2([{ glyph: a, substitute: 101 }]),
              ],
            },
          ],
        }
      )
    );
    expect(variants.map((v) => v.tag)).toEqual(["cv01", "ss01"]);
  });

  it("counts each choice of an alternate substitution as offered", () => {
    const a = GLYPHS.get("a")!;
    const alternates = {
      type: 3,
      subtables: [
        buildAlternateSubstitution([{ glyph: a, choices: [100, 101] }]),
      ],
    };
    const variants = readCharacterVariants(
      font(
        [
          { tag: "cv01", lookupIndices: [0] },
          { tag: "ss01", lookupIndices: [1] },
        ],
        {
          lookups: [
            alternates,
            {
              type: 1,
              subtables: [
                buildSingleSubstitutionFormat2([{ glyph: a, substitute: 101 }]),
              ],
            },
          ],
        }
      )
    );
    expect(variants.map((v) => v.tag)).toEqual(["cv01"]);
  });

  it("keeps a set whose substitutions we cannot read", () => {
    // Contextual lookups tell us nothing, and dropping a feature on the strength
    // of what we failed to read would hide a real choice.
    const variants = readCharacterVariants(
      font(
        [
          { tag: "cv01", lookupIndices: [0] },
          { tag: "ss01", lookupIndices: [1] },
        ],
        { lookups: [redraws("a"), { type: 6, subtables: [new Uint8Array(8)] }] }
      )
    );
    expect(variants.map((v) => v.tag)).toEqual(["cv01", "ss01"]);
  });

  it("keeps every set in a font that has no cvXX features at all", () => {
    const variants = readCharacterVariants(
      font(
        [
          { tag: "ss01", lookupIndices: [0] },
          { tag: "ss02", lookupIndices: [0] },
        ],
        { lookups: [redraws("a")] }
      )
    );
    expect(variants.map((v) => v.tag)).toEqual(["ss01", "ss02"]);
  });
});

describe("where a derived set is shown", () => {
  const digits = new Set([...DIGITS]);

  it("puts a set that only redraws figures with the digits", () => {
    const variants = readCharacterVariants(
      font([{ tag: "ss01", lookupIndices: [0] }], {
        lookups: [redraws("0123")],
      })
    );
    expect(variantsFor(variants, digits).map((v) => v.tag)).toEqual(["ss01"]);
    expect(variantsBeyond(variants, digits)).toEqual([]);
  });

  it("puts a set that redraws mostly letters with the letters", () => {
    const variants = readCharacterVariants(
      font([{ tag: "ss01", lookupIndices: [0] }], {
        lookups: [redraws("abcdefg0")],
      })
    );
    expect(variantsFor(variants, digits)).toEqual([]);
    expect(variantsBeyond(variants, digits).map((v) => v.tag)).toEqual([
      "ss01",
    ]);
  });
});
