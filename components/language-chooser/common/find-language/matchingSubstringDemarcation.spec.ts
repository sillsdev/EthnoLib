import { beforeEach, expect, it, describe } from "vitest";
import {
  deepStripDemarcation,
  demarcateResults,
  END_OF_MATCH_MARKER,
  START_OF_MATCH_MARKER,
  stripDemarcation,
  TEMPORARY_SEPARATOR,
} from "./matchingSubstringDemarcation";
import { ILanguage, LanguageType } from "./findLanguageInterfaces";
import { cloneDeep } from "lodash";

function expectOnlySpecifiedDemarcation(
  demarcatedFieldName: string,
  searchString: string,
  result: ILanguage
) {
  for (const fieldName of Object.keys(result)) {
    if (fieldName === demarcatedFieldName) {
      expectDemarcation(fieldName, searchString, result);
      expectNoUnwantedDemarcation(fieldName, searchString, result);
    } else {
      expectNoDemarcation(fieldName, result);
    }
  }
}

function expectDemarcation(
  fieldName: string,
  searchString: string,
  result: ILanguage
) {
  let fieldValue = result[fieldName];
  const expectedDemarcatedPortion =
    `${START_OF_MATCH_MARKER}${searchString}${END_OF_MATCH_MARKER}`.toLowerCase();
  const errorMessage = `${fieldName} of ${result.iso639_3_code} result should have been demarcated for ${searchString}`;
  if (fieldName === "names") {
    fieldValue = fieldValue.join(TEMPORARY_SEPARATOR);
  }
  expect(
    fieldValue.toLowerCase().includes(expectedDemarcatedPortion),
    errorMessage
  ).toBe(true);
}

function expectNoUnwantedDemarcation(
  fieldName: string,
  searchString: string,
  result: ILanguage
) {
  let fieldValue = result[fieldName];
  if (fieldName === "names") {
    fieldValue = fieldValue.join(TEMPORARY_SEPARATOR);
  }
  const errorMessage = `${fieldName} of ${result.iso639_3_code} result should not have been demarcated for ${searchString}: ${fieldValue}`;
  expectNoUnwantedDemarcationInString(fieldValue, searchString, errorMessage);
}

function expectNoDemarcation(fieldName: string, result: ILanguage) {
  let fieldValue = result[fieldName];
  const errorMessage = `${fieldName} of ${result.iso639_3_code} result should not be demarcated: ${fieldValue}`;

  if (Array.isArray(fieldValue)) {
    fieldValue = fieldValue.join(TEMPORARY_SEPARATOR);
  }
  if (typeof fieldValue !== "string") {
    return;
  }
  expectNoDemarcationInString(fieldValue, errorMessage);
}

function expectNoDemarcationInString(str: string, errorMessage: string) {
  expectNoUnwantedDemarcationInString(str, "", errorMessage);
}

function expectNoUnwantedDemarcationInString(
  str: string,
  okToDemarcateString: string,
  errorMessage: string
) {
  // if str is not a string, return
  if (typeof str !== "string") {
    return;
  }
  // find all demarcated portions
  const demarcatedPortions = str.match(
    new RegExp(`${START_OF_MATCH_MARKER}.*?${END_OF_MATCH_MARKER}`, "g")
  );
  const unexpectedDemarcatedPortions = demarcatedPortions?.filter(
    // check if the string within the brackets equals okToDemarcateString, case insensitive
    (portion) =>
      portion
        .replace(START_OF_MATCH_MARKER, "")
        .replace(END_OF_MATCH_MARKER, "")
        .toLowerCase() !== okToDemarcateString.toLowerCase()
  );
  expect(
    unexpectedDemarcatedPortions?.length,
    errorMessage +
      ` Unexpected demarcated portions: ${unexpectedDemarcatedPortions}`
  ).not.toBeTruthy();
}

describe("Adding match demarcation - basic test", () => {
  const searchString = "Uzb";
  let results: ILanguage[] = [];
  let demarcatedResults: ILanguage[] = [];

  beforeEach(async () => {
    results = [
      {
        autonym: "ўзбек тили",
        exonym: "Uzbek",
        iso639_3_code: "uzb",
        languageSubtag: "uzb",
        regionNamesForDisplay: "Uzbekistan, Afghanistan, China",
        regionNamesForSearch: ["Uzbekistan", "Afghanistan", "China"],
        scripts: [
          {
            code: "Latn",
            name: "Latin",
            languageNameInScript: "oʻzbek tili",
          },
        ],
        names: ["Ouzbek", "O’zbek", "Usbaki", "Usbeki", "Northern Uzbek"],
        alternativeTags: ["uz-Latn"],
        languageType: LanguageType.Living,
      },
    ];

    demarcatedResults = [
      {
        autonym: "ўзбек тили",
        exonym: "Uzbek",
        iso639_3_code: "uzb",
        languageSubtag: "[uzb]", // demarcate the best match (here a whole word match for uzb)
        regionNamesForDisplay: "Uzbekistan, Afghanistan, China",
        regionNamesForSearch: ["Uzbekistan", "Afghanistan", "China"],
        scripts: [
          {
            code: "Latn",
            name: "Latin",
            languageNameInScript: "oʻzbek tili",
          },
        ],
        names: ["Ouzbek", "O’zbek", "Usbaki", "Usbeki", "Northern Uzbek"],
        alternativeTags: ["uz-Latn"],
        languageType: LanguageType.Living,
      },
    ];
  });

  it("should not modify the original results", () => {
    const originalResults = cloneDeep(results);
    demarcateResults(results, searchString);
    expect(results).toEqual(originalResults);
  });

  it("should properly demarcate results", () => {
    const originalResults = cloneDeep(results);
    const newlyDemarcatedResults = demarcateResults(
      originalResults,
      searchString
    );
    expect(newlyDemarcatedResults[0]).toEqual(demarcatedResults[0]);
  });
});

describe("demarcating only the best result for different situations", () => {
  // a result where all fields are foobar
  const allFoobarResult: ILanguage = {
    autonym: "foobar",
    exonym: "foobar",
    iso639_3_code: "foobar",
    languageSubtag: "foobar",
    regionNamesForDisplay: "foobar",
    regionNamesForSearch: ["foobar"],
    scripts: [],
    names: ["foobar"],
    alternativeTags: [],
    languageType: LanguageType.Living,
  };

  it("should be case insensitive", () => {
    const searchString = "pineApple";
    const result = cloneDeep(allFoobarResult);
    result.autonym = "pInEaPpLe";
    expectOnlySpecifiedDemarcation(
      "autonym",
      searchString,
      demarcateResults([result], searchString)[0]
    );
  });

  it("should handle matches in names", () => {
    const searchString = "guava";
    const result = cloneDeep(allFoobarResult);
    result.names = ["pitaya", "guava", "banana"];
    const demarcatedResult = demarcateResults([result], searchString)[0];
    expect(demarcatedResult.names).toEqual(["pitaya", "[guava]", "banana"]);
    expectOnlySpecifiedDemarcation(
      "names",
      searchString,
      demarcateResults([result], searchString)[0]
    );
  });

  it("all else being equal, prioritizes demarcating autonym, then exonym, then languageSubtag, then names, then region", () => {
    const searchString = "foobar";
    const result = cloneDeep(allFoobarResult);
    // once we make one field into a worse match, the next field should get selected for demarcation
    for (const field of [
      "autonym",
      "exonym",
      "languageSubtag",
      "names",
      "regionNamesForDisplay",
    ]) {
      expectOnlySpecifiedDemarcation(
        field,
        searchString,
        demarcateResults([result], searchString)[0]
      );
      if (field === "names") {
        result[field] = ["xfoobar"];
      } else {
        result[field] = "xfoobar";
      }
    }
  });

  it("prioritizes demarcating whole word matches, then prefix matches, then substring matches", () => {
    const searchString = "papaya";
    const prefixMatch = "papayafruit";
    const substringMatch = "fruitpapaya";
    const result = cloneDeep(allFoobarResult);
    result.autonym = substringMatch;
    expectOnlySpecifiedDemarcation(
      "autonym",
      searchString,
      demarcateResults([result], searchString)[0]
    );
    result.exonym = prefixMatch;
    expectOnlySpecifiedDemarcation(
      "exonym",
      searchString,
      demarcateResults([result], searchString)[0]
    );
    result.regionNamesForDisplay = searchString; // create a whole word match
    expectOnlySpecifiedDemarcation(
      "regionNamesForDisplay",
      searchString,
      demarcateResults([result], searchString)[0]
    );
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
      regionNamesForDisplay: "Uzbekistan, Afghanistan, China",
      regionNamesForSearch: ["[Uzb]ekistan", "Afghanistan", "China"],
      scripts: [],
      names: ["O[uzb]ek", "O’zbek", "Usbeki", "[Uzb]ek, Northern", "oʻzbek"],
      alternativeTags: [],
      languageType: LanguageType.Living,
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
        regionNamesForDisplay: "Uzbekistan, Afghanistan, China",
        regionNamesForSearch: ["Uzbekistan", "Afghanistan", "China"],
        scripts: [],
        names: ["Ouzbek", "O’zbek", "Usbeki", "Uzbek, Northern", "oʻzbek"],
        alternativeTags: [],
        languageType: LanguageType.Living,
      } as ILanguage,
    });
  });

  it("should not modify the original results", () => {
    const uzbekLanguage = {
      autonym: "ўзбек тили",
      exonym: "[Uzb]ek",
      iso639_3_code: "[uzb]",
      languageSubtag: "uz",
      regionNamesForDisplay: "Uzbekistan, Afghanistan, China",
      regionNamesForSearch: ["[Uzb]ekistan", "Afghanistan", "China"],
      scripts: [],
      names: ["O[uzb]ek", "O’zbek", "Usbeki", "[Uzb]ek, Northern", "oʻzbek"],
      alternativeTags: [],
      languageType: LanguageType.Living,
    } as ILanguage;
    const originalResults = cloneDeep(uzbekLanguage);
    deepStripDemarcation(originalResults);
    expect(originalResults).toEqual(uzbekLanguage);
  });
});
