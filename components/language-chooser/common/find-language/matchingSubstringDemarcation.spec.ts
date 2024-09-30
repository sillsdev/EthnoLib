import { beforeEach, expect, it, describe } from "vitest";
import {
  demarcateExactMatches,
  demarcateResults,
  END_OF_MATCH_MARKER,
  START_OF_MATCH_MARKER,
  stripDemarcation,
} from "./matchingSubstringDemarcation";
import { FuseResult } from "fuse.js";
import { ILanguage } from "./findLanguageInterfaces";
import { cloneDeep } from "lodash";
import { createTestLanguageEntry } from "./testUtils";

describe("Adding match demarcation", () => {
  let fuseResults: FuseResult<ILanguage>[] = [];
  let demarcatedResults: FuseResult<ILanguage>[] = [];

  beforeEach(async () => {
    fuseResults = [
      {
        item: {
          autonym: "ўзбек тили",
          exonym: "Uzbek",
          iso639_3_code: "uzb",
          languageSubtag: "uzb",
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
            key: "languageSubtag",
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
          iso639_3_code: "uzb",
          languageSubtag: "[uzb]",
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
    const originalResults = cloneDeep(fuseResults);
    demarcateResults(fuseResults);
    expect(fuseResults).toEqual(originalResults);
  });

  it("should properly demarcate results", () => {
    const originalResults = cloneDeep(fuseResults);
    const newlyDemarcatedResults = demarcateResults(originalResults);
    expect(newlyDemarcatedResults[0].item).toEqual(demarcatedResults[0].item);
  });
});

describe("Stripping demarcation", () => {
  it("should remove all demarcation markers", () => {
    expect(
      stripDemarcation(`${START_OF_MATCH_MARKER}uzb${END_OF_MATCH_MARKER}`)
    ).toEqual("uzb");
    expect(stripDemarcation("We wish you a merry Christmas!")).toEqual(
      "We wish you a merry Christmas!"
    );
    expect(
      stripDemarcation(
        `${START_OF_MATCH_MARKER}We wish yo${START_OF_MATCH_MARKER}${START_OF_MATCH_MARKER}${END_OF_MATCH_MARKER}u a merry Ch${END_OF_MATCH_MARKER}ristma${END_OF_MATCH_MARKER}s!${END_OF_MATCH_MARKER}`
      )
    ).toEqual("We wish you a merry Christmas!");
  });
});

describe("find and demarcate exact matches", () => {
  // note this does not test all the fields, just a sampling
  it("should find and demarcate exact matches", () => {
    const originalResult = createTestLanguageEntry({
      languageSubtag: "aBc",
      exonym: "Xxxabcxxx",
      autonym: "no matches here",
      names: ["Foobar", "ABCFoobar"],
    });
    const expectedResult = createTestLanguageEntry({
      languageSubtag: "[aBc]",
      exonym: "Xxx[abc]xxx",
      autonym: "no matches here",
      names: ["Foobar", "[ABC]Foobar"],
    });

    expect(demarcateExactMatches("abc", originalResult)).toEqual(
      expectedResult
    );
  });
});
