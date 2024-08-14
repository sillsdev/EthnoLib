import { searchForLanguage } from "./searchForLanguage";
import { ILanguage } from "./findLanguageInterfaces";
import { describe, expect, it } from "vitest";
import { expectTypeOf } from "vitest";
import { FuseResult } from "fuse.js";

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
    // searchFindsLanguage("tok pisin", "tpi"); TODO fix queries with spaces
    searchDoesFindLanguage("tokpisin", "tpi");
    searchDoesFindLanguage("tok", "tpi");
  });

  it("should find languages by autonym", () => {
    searchDoesFindLanguage("ўзбека", "uzb");
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
    // searchFindsLanguage("Po tuguese", "por"); // TODO fix queries with spaces
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
    // TODO fine-tune the fuzzy matching so "ohlone" brings up "northern ohlone"
    // searchFindsLanguage("ohlone", "cst");
  });
  it("does not find languages that completely don't match the query", () => {
    searchDoesNotFindLanguage("zzzz", "jpn");
  });
});

function searchDoesFindLanguage(query: string, expectedLanguageCode: string) {
  const result = searchForLanguage(query);
  expect(result.length).toBeGreaterThan(0);
  expect(
    result.some((result) => result.item.iso639_3_code === expectedLanguageCode)
  ).toBe(true);
}

function searchDoesNotFindLanguage(
  query: string,
  expectedLanguageCode: string
) {
  const result = searchForLanguage(query);
  expect(
    result.some((result) => result.item.iso639_3_code === expectedLanguageCode)
  ).toBe(false);
}

function indexOfLanguageInSearchResults(
  query: string,
  expectedLanguageCode: string
) {
  const result = searchForLanguage(query);
  const index = result.findIndex(
    (result) => result.item.iso639_3_code === expectedLanguageCode
  );
  return index;
}
