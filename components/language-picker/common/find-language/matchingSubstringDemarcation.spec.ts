import { beforeEach, expect, it, describe } from "vitest";
import {
  demarcateResults,
  END_OF_MATCH_MARKER,
  START_OF_MATCH_MARKER,
  stripDemarcation,
} from "./matchingSubstringDemarcation";
import { FuseResult } from "fuse.js";
import { ILanguage } from "@ethnolib/find-language";
import { cloneDeep } from "lodash";

describe("Adding match demarcation", () => {
  let rawResults: FuseResult<ILanguage>[] = [];
  let demarcatedResults: FuseResult<ILanguage>[] = [];

  beforeEach(async () => {
    rawResults = [
      {
        item: {
          autonym: "ўзбек тили",
          exonym: "Uzbek",
          code: "uzb",
          regionNames: "Uzbekistan, Afghanistan, China",
          scripts: [
            {
              code: "Latn",
              name: "Latin",
            },
          ],
          names: ["Ouzbek", "O’zbek", "Usbaki", "Usbeki", "Northern Uzbek"],
          alternativeTags: ["uz-Latn"],
        },
        refIndex: 6844,
        matches: [
          {
            indices: [[0, 2]],
            value: "Uzbek",
            key: "exonym",
          },
          {
            indices: [[0, 2]],
            value: "uzb",
            key: "code",
          },
          {
            indices: [[9, 11]],
            value: "Northern Uzbek",
            key: "names",
            refIndex: 4,
          },
          {
            indices: [[1, 3]],
            value: "Ouzbek",
            key: "names",
            refIndex: 0,
          },
          {
            indices: [[0, 2]],
            value: "Uzbekistan, Afghanistan, China",
            key: "regionNames",
          },
        ],
      },
    ];

    demarcatedResults = [
      {
        item: {
          autonym: "ўзбек тили",
          exonym: "[Uzb]ek",
          code: "[uzb]",
          regionNames: "[Uzb]ekistan, Afghanistan, China",
          scripts: [
            {
              code: "Latn",
              name: "Latin",
            },
          ],
          names: ["O[uzb]ek", "O’zbek", "Usbaki", "Usbeki", "Northern [Uzb]ek"],
          alternativeTags: ["uz-Latn"],
        },
        refIndex: 6844,
      },
    ];
  });

  it("should not modify the original results", () => {
    const originalResults = cloneDeep(rawResults);
    demarcateResults(rawResults);
    expect(rawResults).toEqual(originalResults);
  });
  it("should properly demarcate results", () => {
    const originalResults = cloneDeep(rawResults);
    const newlyDemarcatedResults = demarcateResults(originalResults);
    expect(newlyDemarcatedResults[0].item).toEqual(demarcatedResults[0].item);
  });
});

describe("Stripping demarcation", () => {
  // TODO ask reviewer about whether to use [ or START_OF_MATCH_MARKER for testing
  it("should remove all demarcation markers", () => {
    expect(stripDemarcation("[uzb]")).toEqual("uzb");
    expect(
      stripDemarcation(`${START_OF_MATCH_MARKER}uzb${END_OF_MATCH_MARKER}`)
    ).toEqual("uzb");
    expect(stripDemarcation("We wish you a merry Christmas!")).toEqual(
      "We wish you a merry Christmas!"
    );
    expect(
      stripDemarcation("[W]e[[]] wi]s]h]]] you a[ merry Chris]tmas!]")
    ).toEqual("We wish you a merry Christmas!");
    expect(
      stripDemarcation(
        `${START_OF_MATCH_MARKER}We wish yo${START_OF_MATCH_MARKER}${START_OF_MATCH_MARKER}${END_OF_MATCH_MARKER}u a merry Ch${END_OF_MATCH_MARKER}ristma${END_OF_MATCH_MARKER}s!${END_OF_MATCH_MARKER}`
      )
    ).toEqual("We wish you a merry Christmas!");
  });
});
