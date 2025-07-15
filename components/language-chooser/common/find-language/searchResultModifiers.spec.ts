import { expect, it, describe, test, beforeEach, beforeAll } from "vitest";
import {
  filterScripts,
  rawIsoCode,
  prioritizeLangByKeywords,
  filterOnLanguageCode,
  substituteInModifiedEntry,
  defaultSearchResultModifier,
} from "./searchResultModifiers";
import { codeMatches } from "./languageTagUtils";
import { ILanguage, IScript } from "./findLanguageInterfaces";
import { createTestLanguageEntry } from "./testUtils";
import { asyncGetAllLanguageResults } from "./languageSearch.spec.ts";
import { stripDemarcation } from "./matchingSubstringDemarcation";

const latinScript = { code: "Latn", name: "Latin" } as IScript;
const brailleScript = { code: "Brai", name: "Braille" } as IScript;
const specialScript = {
  code: "specialCode",
  name: "specialScript",
} as IScript;

describe("filter scripts", () => {
  it("should filter out scripts", () => {
    const results = [
      createTestLanguageEntry({
        exonym: "foo",
        iso639_3_code: "bar",
        scripts: [latinScript, brailleScript],
      }),
      createTestLanguageEntry({
        exonym: "baz",
        iso639_3_code: "boo",
        scripts: [brailleScript],
      }),
    ];
    const expectedFilteredResults = [
      createTestLanguageEntry({
        exonym: "foo",
        iso639_3_code: "bar",
        scripts: [latinScript],
      }),
      createTestLanguageEntry({
        exonym: "baz",
        iso639_3_code: "boo",
        scripts: [],
      }),
    ];
    expect(
      filterScripts((script) => script.code !== brailleScript.code, results)
    ).toEqual(expectedFilteredResults);
  });
});

describe("code match checking", () => {
  test("identical codes should match", () => {
    expect(codeMatches("eng", "eng")).toBe(true);
  });
  test("different casing should match", () => {
    expect(codeMatches("eng", "ENG")).toBe(true);
    expect(codeMatches("eng", "eNg")).toBe(true);
  });
  test("codes should match regardless of demarcation", () => {
    expect(codeMatches("eng", "e[n]g")).toBe(true);
    expect(codeMatches("[][e][ng]", "e[n]g")).toBe(true);
  });
  test("codes with different letters should not match", () => {
    expect(codeMatches("eng", "fra")).toBe(false);
    expect(codeMatches("xxx", "xxy")).toBe(false);
  });
});

describe("substitute special entry into results", () => {
  it("should substitute special entry into results", () => {
    const results = [
      createTestLanguageEntry({
        exonym: "foo",
        iso639_3_code: "bar",
        scripts: [latinScript, brailleScript],
      }),
      createTestLanguageEntry({
        exonym: "baz",
        iso639_3_code: "boo",
        scripts: [brailleScript],
      }),
    ];

    const specialEntry = createTestLanguageEntry({
      exonym: "special entry exonym",
      iso639_3_code: "boo",
      scripts: [specialScript],
      variants: "yay",
    });

    const expectedResults = [
      createTestLanguageEntry({
        exonym: "foo",
        iso639_3_code: "bar",
        scripts: [latinScript, brailleScript],
      }),
      createTestLanguageEntry({
        exonym: "special entry exonym",
        iso639_3_code: "boo",
        scripts: [specialScript],
        variants: "yay",
      }),
    ];
    expect(
      substituteInModifiedEntry("boo", () => specialEntry, results)
    ).toEqual(expectedResults);
  });
});

describe("filter out language codes", () => {
  it("should filter out language codes", () => {
    const results = [
      createTestLanguageEntry({
        exonym: "foo",
        iso639_3_code: "bar",
        scripts: [latinScript, brailleScript],
      }),
      createTestLanguageEntry({
        exonym: "baz",
        iso639_3_code: "boo",
        scripts: [brailleScript],
      }),
    ];
    const expectedResults = [
      createTestLanguageEntry({
        exonym: "foo",
        iso639_3_code: "bar",
        scripts: [latinScript, brailleScript],
      }),
    ];
    expect(filterOnLanguageCode((code) => code !== "boo", results)).toEqual(
      expectedResults
    );
  });
});

describe("reordering entries to prioritize desired language when keywords are searched", () => {
  let originalResults: ILanguage[];
  beforeEach(() => {
    originalResults = [
      createTestLanguageEntry({
        iso639_3_code: "eng",
      }),
      createTestLanguageEntry({
        iso639_3_code: "tpi",
      }),
      createTestLanguageEntry({
        iso639_3_code: "jpn",
      }),
    ];
  });
  it("should make no changes if search string doesn't match keywords", () => {
    const reorderedResults = prioritizeLangByKeywords(
      ["blahblah", "abcdefg"],
      "nonmatchingSearchString",
      "tpi",
      originalResults
    );
    expect(reorderedResults).toEqual(originalResults);
  });
  it("should move target language to the top if search string matches keywords", () => {
    const reorderedResults = prioritizeLangByKeywords(
      ["blahblah", "abcdefg"],
      "abc",
      "tpi",
      originalResults
    );
    expect(rawIsoCode(reorderedResults[0])).toEqual("tpi");
  });

  describe("Chinese should be handled reasonably", () => {
    let chineseResults: ILanguage[];
    beforeAll(async () => {
      const chineseSearchString = "chinese";
      chineseResults = defaultSearchResultModifier(
        (await asyncGetAllLanguageResults(chineseSearchString)) as ILanguage[],
        chineseSearchString
      );
    });
    it("top chinese result should have language subtag zh", () => {
      expect(chineseResults[0].languageSubtag).toEqual("zh");
    });
    it("should only have one zh result", () => {
      expect(
        chineseResults.filter((r) => r.languageSubtag === "zh").length
      ).toEqual(1);
    });
    it("zh result should have many alternative names listed", () => {
      expect(
        chineseResults.find((r) => r.languageSubtag === "zh")?.names.length
      ).toBeGreaterThan(10);
    });
  });

  describe("Spanish name listings should be handled as desired", () => {
    it("finds spanish", async () => {
      const spanishSearchString = "spanish";
      const spanishResult = defaultSearchResultModifier(
        (await asyncGetAllLanguageResults(spanishSearchString)) as ILanguage[],
        spanishSearchString
      )[0];
      expect(rawIsoCode(spanishResult)).toEqual("spa");

      // Español should be the autonym and not in the names list
      expect(spanishResult?.autonym).toEqual("español");
      // Castellano should be in the names list
      expect(
        spanishResult?.names.filter((n) => stripDemarcation(n) === "castellano")
          .length
      ).toEqual(1);
      // make sure we didn't accidentally prepend an empty name instead of castellano
      expect(spanishResult?.names[0]).toBeTruthy();
    });
  });
});
