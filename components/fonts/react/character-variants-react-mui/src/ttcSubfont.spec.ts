/**
 * A .ttc holds several families in one file, and the platform hands back the whole
 * file whichever face was asked for. These tests build a collection whose two fonts
 * disagree about everything we read — coverage, features, licence — so that reading
 * the wrong one is impossible to miss.
 */

import { describe, expect, it } from "vitest";
import { readCoverageRanges } from "./fontCoverage";
import { readCharacterVariants } from "./readCharacterVariants";
import { readLicenseHints } from "./fontLicense";
import { fontBlobHasCharacterVariants } from "./scanForCharacterVariants";
import {
  SyntheticTable,
  buildCmapTable,
  buildGsubTable,
  buildNameTable,
  buildOs2Table,
  buildTtc,
} from "./testFontBuilder";

const ALPHA = 0x61; // "a", in the first font of the collection only
const ALPHA_LICENSE = "Licensed under the SIL Open Font License";
const BETA_LICENSE = "Property of Some Foundry. All rights reserved.";
const BETA = 0x391; // Greek capital alpha, in the second font only

function subfont(options: {
  postscriptName: string;
  family: string;
  cmap: [number, number][];
  featureTags: string[];
  license: string;
}): SyntheticTable[] {
  return [
    { tag: "cmap", data: buildCmapTable(options.cmap) },
    { tag: "GSUB", data: buildGsubTable(options.featureTags) },
    { tag: "OS/2", data: buildOs2Table(0) },
    {
      tag: "name",
      data: buildNameTable([
        { nameId: 1, text: options.family },
        { nameId: 4, text: `${options.family} Regular` },
        { nameId: 6, text: options.postscriptName },
        { nameId: 13, text: options.license },
      ]),
    },
  ];
}

const collection = buildTtc([
  subfont({
    postscriptName: "AlphaFont-Regular",
    family: "Alpha Font",
    cmap: [[ALPHA, ALPHA]],
    featureTags: ["cv01"],
    license: ALPHA_LICENSE,
  }),
  subfont({
    postscriptName: "BetaFont-Regular",
    family: "Beta Font",
    cmap: [[BETA, BETA]],
    featureTags: ["cv02", "onum"],
    license: BETA_LICENSE,
  }),
]);

const collectionBlob = () => new Blob([collection]);

describe("coverage from a font collection", () => {
  it("reads the coverage of the face that was asked for", async () => {
    const coverage = await readCoverageRanges(
      collectionBlob(),
      "BetaFont-Regular"
    );

    expect([...coverage]).toEqual([BETA, BETA]);
  });

  it("reads the first font when no face is named", async () => {
    const coverage = await readCoverageRanges(collectionBlob());

    expect([...coverage]).toEqual([ALPHA, ALPHA]);
  });

  it("falls back to the first font when no face answers to the name", async () => {
    const coverage = await readCoverageRanges(
      collectionBlob(),
      "SomeOtherFont-Regular"
    );

    expect([...coverage]).toEqual([ALPHA, ALPHA]);
  });

  it("matches on the family name when the PostScript name doesn't match", async () => {
    const coverage = await readCoverageRanges(collectionBlob(), "Beta Font");

    expect([...coverage]).toEqual([BETA, BETA]);
  });
});

describe("character variants from a font collection", () => {
  it("reads the features of the face that was asked for", () => {
    const variants = readCharacterVariants(collection, "BetaFont-Regular");

    expect(variants.map((v) => v.tag)).toEqual(["cv02"]);
  });

  it("reads the first font's features when no face is named", () => {
    const variants = readCharacterVariants(collection);

    expect(variants.map((v) => v.tag)).toEqual(["cv01"]);
  });

  it("checks the named face for any cvXX at all", async () => {
    expect(
      await fontBlobHasCharacterVariants(collectionBlob(), "BetaFont-Regular")
    ).toBe(true);
  });
});

describe("license hints from a font collection", () => {
  // Which licence text we read is this file's business; what it then means is
  // fontLicense.spec.ts's, so these look at the text rather than the verdict.
  it("reads the licence of the face that was asked for", () => {
    expect(
      readLicenseHints(collection, "BetaFont-Regular").description
    ).toEqual(BETA_LICENSE);
  });

  it("reads the first font's licence when no face is named", () => {
    expect(readLicenseHints(collection).description).toEqual(ALPHA_LICENSE);
  });
});
