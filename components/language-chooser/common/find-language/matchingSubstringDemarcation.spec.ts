import { beforeEach, expect, it, describe } from "vitest";
import {
  deepStripDemarcation,
  demarcateResults,
  END_OF_MATCH_MARKER,
  START_OF_MATCH_MARKER,
  stripDemarcation,
} from "./matchingSubstringDemarcation";
import { FuseResult } from "fuse.js";
import { ILanguage } from "./findLanguageInterfaces";
import { cloneDeep } from "lodash";

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
              languageNameInScript: "oʻzbek tili",
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
            key: "iso639_3_code",
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
          iso639_3_code: "[uzb]",
          languageSubtag: "[uzb]",
          regionNames: "[Uzb]ekistan, Afghanistan, China",
          scripts: [
            {
              code: "Latn",
              name: "Latin",
              languageNameInScript: "oʻzbek tili",
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

describe("deep strip demarcation from different types of data", () => {
  it("should strip demarcation from strings", () => {
    expect(
      deepStripDemarcation(`${START_OF_MATCH_MARKER}uzb${END_OF_MATCH_MARKER}`)
    ).toEqual("uzb");
  });
  it("should leave undefineds alone", () => {
    expect(deepStripDemarcation(undefined)).toEqual(undefined);
  });
  it("should leave bools, numbers, etc. alone", () => {
    expect(deepStripDemarcation(true)).toEqual(true);
    expect(deepStripDemarcation(1)).toEqual(1);
    expect(deepStripDemarcation("foo")).toEqual("foo");
  });
  it("should strip demarcation from arrays", () => {
    expect(
      deepStripDemarcation([
        "a",
        "b",
        `${START_OF_MATCH_MARKER}c${END_OF_MATCH_MARKER}`,
      ])
    ).toEqual(["a", "b", "c"]);
  });
  it("should strip demarcation from objects", () => {
    expect(
      deepStripDemarcation({
        a: "b",
        c: `${START_OF_MATCH_MARKER}d${END_OF_MATCH_MARKER}`,
      })
    ).toEqual({ a: "b", c: "d" });
  });

  it("should strip demarcation from nested objects", () => {
    expect(
      deepStripDemarcation({
        a: "b",
        c: {
          d: ["h", `${START_OF_MATCH_MARKER}e${END_OF_MATCH_MARKER}`],
          f: "g",
        },
      })
    ).toEqual({ a: "b", c: { d: ["h", "e"], f: "g" } });
  });

  it("should strip demarcation from common language data structures", () => {
    const uzbekLanguage = {
      autonym: "ўзбек тили",
      exonym: "[Uzb]ek",
      iso639_3_code: "[uzb]",
      languageSubtag: "uz",
      regionNames: "[Uzb]ekistan, Afghanistan, China",
      scripts: [],
      names: ["O[uzb]ek", "O’zbek", "Usbeki", "[Uzb]ek, Northern", "oʻzbek"],
      alternativeTags: [],
    } as ILanguage;

    interface TestOrthographyInterface {
      language: ILanguage;
    }

    // To demonstrate the ability to reopen to a desired state
    const orthographyObject = {
      language: uzbekLanguage,
    } as TestOrthographyInterface;

    expect(deepStripDemarcation(orthographyObject)).toEqual({
      language: {
        autonym: "ўзбек тили",
        exonym: "Uzbek",
        iso639_3_code: "uzb",
        languageSubtag: "uz",
        regionNames: "Uzbekistan, Afghanistan, China",
        scripts: [],
        names: ["Ouzbek", "O’zbek", "Usbeki", "Uzbek, Northern", "oʻzbek"],
        alternativeTags: [],
      },
    });
  });
  it("should not modify the original results", () => {
    const uzbekLanguage = {
      autonym: "ўзбек тили",
      exonym: "[Uzb]ek",
      iso639_3_code: "[uzb]",
      languageSubtag: "uz",
      regionNames: "[Uzb]ekistan, Afghanistan, China",
      scripts: [],
      names: ["O[uzb]ek", "O’zbek", "Usbeki", "[Uzb]ek, Northern", "oʻzbek"],
      alternativeTags: [],
    } as ILanguage;
    const originalResults = cloneDeep(uzbekLanguage);
    deepStripDemarcation(originalResults);
    expect(originalResults).toEqual(uzbekLanguage);
  });
});
