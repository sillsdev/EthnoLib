import { expect, it, describe, test, beforeEach } from "vitest";
import {
  filterScripts,
  codeMatches,
  prioritizeLangByKeywords,
} from "./searchResultModifiers";
import {
  ILanguage,
  filterLanguageCodes,
  substituteInSpecialEntry,
} from "@ethnolib/find-language";
import { createTestLanguageEntry } from "./testUtils";

describe("filter scripts", () => {
  it("should filter out scripts", () => {
    const results = [
      createTestLanguageEntry({
        exonym: "foo",
        iso639_3_code: "bar",
        scripts: [
          { code: "Latn", name: "Latin" },
          { code: "Brai", name: "Braille" },
        ],
      }),
      createTestLanguageEntry({
        exonym: "baz",
        iso639_3_code: "boo",
        scripts: [{ code: "Brai", name: "Braille" }],
      }),
    ];
    const expectedFilteredResults = [
      createTestLanguageEntry({
        exonym: "foo",
        iso639_3_code: "bar",
        scripts: [{ code: "Latn", name: "Latin" }],
      }),
      createTestLanguageEntry({
        exonym: "baz",
        iso639_3_code: "boo",
        scripts: [],
      }),
    ];
    expect(filterScripts((script) => script.code !== "Brai", results)).toEqual(
      expectedFilteredResults
    );
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
        scripts: [
          { code: "Latn", name: "Latin" },
          { code: "Brai", name: "Braille" },
        ],
      }),
      createTestLanguageEntry({
        exonym: "baz",
        iso639_3_code: "boo",
        scripts: [{ code: "Brai", name: "Braille" }],
      }),
    ];

    const specialEntry = createTestLanguageEntry({
      exonym: "special entry exonym",
      iso639_3_code: "boo",
      scripts: [{ code: "specialCode", name: "specialScript" }],
      variants: "yay",
    });

    const expectedResults = [
      createTestLanguageEntry({
        exonym: "foo",
        iso639_3_code: "bar",
        scripts: [
          { code: "Latn", name: "Latin" },
          { code: "Brai", name: "Braille" },
        ],
      }),
      createTestLanguageEntry({
        exonym: "special entry exonym",
        iso639_3_code: "boo",
        scripts: [{ code: "specialCode", name: "specialScript" }],
        variants: "yay",
      }),
    ];
    expect(
      substituteInSpecialEntry("boo", () => specialEntry, results)
    ).toEqual(expectedResults);
  });
});

describe("filter out language codes", () => {
  it("should filter out language codes", () => {
    const results = [
      createTestLanguageEntry({
        exonym: "foo",
        iso639_3_code: "bar",
        scripts: [
          { code: "Latn", name: "Latin" },
          { code: "Brai", name: "Braille" },
        ],
      }),
      createTestLanguageEntry({
        exonym: "baz",
        iso639_3_code: "boo",
        scripts: [{ code: "Brai", name: "Braille" }],
      }),
    ];
    const expectedResults = [
      createTestLanguageEntry({
        exonym: "foo",
        iso639_3_code: "bar",
        scripts: [
          { code: "Latn", name: "Latin" },
          { code: "Brai", name: "Braille" },
        ],
      }),
    ];
    expect(filterLanguageCodes((code) => code !== "boo", results)).toEqual(
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
    expect(reorderedResults[0].iso639_3_code).toEqual("tpi");
  });
});
