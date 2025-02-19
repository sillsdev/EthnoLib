import { getLanguageBySubtag, searchForLanguage } from "./searchForLanguage";
import { ILanguage } from "./findLanguageInterfaces";
import { describe, expect, it } from "vitest";
import { expectTypeOf } from "vitest";
import { FuseResult } from "fuse.js";
import { codeMatches } from "./searchResultModifiers";
import { stripDemarcation } from "./matchingSubstringDemarcation";

describe("searchForLanguage", () => {
  it("should return a list of languages", () => {
    const result = searchForLanguage("en");
    expectTypeOf(result).toEqualTypeOf<FuseResult<ILanguage>[]>();
    expect(result.length).toBeGreaterThan(0);
  });
  it("should find common languages by common queries", () => {
    searchDoesFindLanguage("English", "eng");
    searchDoesFindLanguage("eng", "eng");
    searchDoesFindLanguage("en", "eng");
    searchDoesFindLanguage("fr", "fra");
    searchDoesFindLanguage("fre", "fra");
    searchDoesFindLanguage("fra", "fra");
    searchDoesFindLanguage("french", "fra");
    searchDoesFindLanguage("français", "fra");
    searchDoesFindLanguage("francais", "fra");
    searchDoesFindLanguage("spanish", "spa");
    searchDoesFindLanguage("spa", "spa");
    searchDoesFindLanguage("español", "spa");
    searchDoesFindLanguage("espanol", "spa");
    searchDoesFindLanguage("esp", "spa");
    searchDoesFindLanguage("tok pisin", "tpi");
    searchDoesFindLanguage("tokpisin", "tpi");
    searchDoesFindLanguage("tok", "tpi");
  });

  it("should find languages by autonym", () => {
    searchDoesFindLanguage("нохчийн", "che");
    searchDoesFindLanguage("Kamarakotos", "aoc");
  });
  it("should find languages by exonym", () => {
    searchDoesFindLanguage("luba-katanga", "lub");
    searchDoesFindLanguage("ndzwani", "wni");
  });
  it("should find languages by alternative names", () => {
    searchDoesFindLanguage("tiatinugua", "ese");
    searchDoesFindLanguage("kler", "xrb");
  });
  it("should find languages by fuzzy match", () => {
    searchDoesFindLanguage("Portuguese", "por");
    searchDoesFindLanguage("xPortuguese", "por");
    searchDoesFindLanguage("Porxtuguese", "por");
    searchDoesFindLanguage("ortuguese", "por");
    searchDoesFindLanguage("Potuguese", "por");
    searchDoesFindLanguage("Po tuguese", "por");
    searchDoesFindLanguage("Porxuguese", "por");
  });
  it("should find languages by iso639_3 code", () => {
    searchDoesFindLanguage("xrb", "xrb");
    searchDoesFindLanguage("zhw", "zhw");
  });
  it("should find languages by region name", () => {
    searchDoesFindLanguage("Indonesia", "abl");
    searchDoesFindLanguage("Canada", "alq");
  });
  it("should rank better matches before worse matches", () => {
    // "Ese" comes before "Mese"
    const eseQuery = "ese";
    expect(indexOfLanguageInSearchResults(eseQuery, "mcq")).toBeLessThan(
      indexOfLanguageInSearchResults(eseQuery, "mci")
    );

    // "chorasmian" comes before "ch'orti'"
    const choQuery = "cho";
    expect(indexOfLanguageInSearchResults(choQuery, "xco")).toBeLessThan(
      indexOfLanguageInSearchResults(choQuery, "caa")
    );
  });
  it("should find matches regardless of case", () => {
    searchDoesFindLanguage("japanese", "jpn");
    searchDoesFindLanguage("JAPANESE", "jpn");
    searchDoesFindLanguage("JaPanEsE", "jpn");
  });
  it("should find matches that don't start with the query", () => {
    searchDoesFindLanguage("ohlone", "cst");
  });
  it("does not find languages that completely don't match the query", () => {
    searchDoesNotFindLanguage("zzzz", "jpn");
  });

  it("prioritizes whole word matches, then prefix matches", () => {
    // searching "cree", all "cree" results should come before the "creek" result
    const creeQuery = "cree";
    const indexOfCreek = indexOfLanguageInSearchResults(creeQuery, "mus");
    const creeLangCodes = [
      "cre",
      "crg",
      "crj",
      "crk",
      "crl",
      "crm",
      "csw",
      "ojs",
    ];
    for (const creeLangCode of creeLangCodes) {
      expect(
        indexOfLanguageInSearchResults(creeQuery, creeLangCode)
      ).toBeLessThan(indexOfCreek);
    }

    // searching "aka", all "aka" languages should come before the "akan" language
    const akaQuery = "aka";
    const akaResults = searchForLanguage(akaQuery);
    const indexOfAkan = akaResults.findIndex(
      // We are using the exonym because the iso code may change if we adjust macrolanguage handling behavior.
      // See macrolanguageNotes.md
      (result) => stripDemarcation(result.item.exonym) === "Akan"
    );
    const akaLangCodes = ["soh", "ahk", "axk", "hru", "wum"];
    for (const akaLangCode of akaLangCodes) {
      expect(
        indexOfLanguageInSearchResults(akaQuery, akaLangCode)
      ).toBeLessThan(indexOfAkan);
    }
    // "aka koro" should also come before "akan" since "aka" stands as a whole word
    expect(indexOfLanguageInSearchResults(akaQuery, "jkr")).toBeLessThan(
      indexOfAkan
    );

    //searching "oka", "Wejeñememaja oka" should come before "Okanisi Tongo" (djk)
    const okaQuery = "oka";
    expect(indexOfLanguageInSearchResults(okaQuery, "tnc")).toBeLessThan(
      indexOfLanguageInSearchResults(okaQuery, "djk")
    );

    //searching "otl", "San Felipe Otlaltepec Popoloca" (pow) should come before "botlikh" (bph)
    const otlQuery = "otl";
    expect(indexOfLanguageInSearchResults(otlQuery, "pow")).toBeLessThan(
      indexOfLanguageInSearchResults(otlQuery, "bph")
    );
  });

  it("should prefer localnames[0] for autonym", () => {
    expect(searchForLanguage("azerbaijani")[0].item.autonym).toMatch(
      "Azərbaycan dili"
    );
  });
  it("should fallback to localname for autonym if no localnames", () => {
    expect(searchForLanguage("japanese")[0].item.autonym).toMatch("日本語");
  });
  it("should leave autonym as undefined if no localnames or localname", () => {
    expect(searchForLanguage("Aranadan")[0].item.autonym).toBeUndefined();
  });
});

function searchDoesFindLanguage(query: string, expectedLanguageCode: string) {
  const results = searchForLanguage(query);
  expect(results.length).toBeGreaterThan(0);
  expect(
    results.some((result) =>
      codeMatches(result.item.iso639_3_code, expectedLanguageCode)
    )
  ).toBe(true);
}

function searchDoesNotFindLanguage(
  query: string,
  expectedLanguageCode: string
) {
  const results = searchForLanguage(query);
  expect(
    results.some((result) =>
      codeMatches(result.item.iso639_3_code, expectedLanguageCode)
    )
  ).toBe(false);
}

function indexOfLanguageInSearchResults(
  query: string,
  expectedLanguageCode: string
) {
  const results = searchForLanguage(query);
  const index = results.findIndex((result) =>
    codeMatches(result.item.iso639_3_code, expectedLanguageCode)
  );
  return index;
}

describe("getLanguageBySubtag", () => {
  it("should find languages by valid languageSubtag field", () => {
    expect(getLanguageBySubtag("aaa")?.exonym).toEqual("Ghotuo");
    expect(getLanguageBySubtag("ab")?.exonym).toEqual("Abkhaz");
  });
});
