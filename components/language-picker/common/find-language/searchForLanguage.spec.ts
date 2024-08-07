import { searchForLanguage } from "./searchForLanguage";
import { ILanguage } from "./dataHolderTypes";
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
    searchFindsLanguage("English", "eng");
    searchFindsLanguage("eng", "eng");
    searchFindsLanguage("en", "eng");
    searchFindsLanguage("fr", "fra");
    searchFindsLanguage("fre", "fra");
    searchFindsLanguage("fra", "fra");
    searchFindsLanguage("french", "fra");
    searchFindsLanguage("français", "fra");
    searchFindsLanguage("francais", "fra");
    searchFindsLanguage("spanish", "spa");
    searchFindsLanguage("spa", "spa");
    searchFindsLanguage("español", "spa");
    searchFindsLanguage("espanol", "spa");
    searchFindsLanguage("esp", "spa");
    // searchFindsLanguage("tok pisin", "tpi"); TODO fix queries with spaces
    searchFindsLanguage("tokpisin", "tpi");
    searchFindsLanguage("tok", "tpi");
  });

  it("should find languages by autonym", () => {
    searchFindsLanguage("ўзбека", "uzb");
    searchFindsLanguage("Kamarakotos", "aoc");
  });
  it("should find languages by exonym", () => {
    searchFindsLanguage("luba-katanga", "lub");
    searchFindsLanguage("ndzwani", "wni");
  });
  it("should find languages by alternative names", () => {
    searchFindsLanguage("tiatinugua", "ese");
    searchFindsLanguage("kler", "xrb");
  });
  it("should find languages by fuzzy match", () => {
    searchFindsLanguage("Portuguese", "por");
    searchFindsLanguage("xPortuguese", "por");
    searchFindsLanguage("Porxtuguese", "por");
    searchFindsLanguage("ortuguese", "por");
    searchFindsLanguage("Potuguese", "por");
    // searchFindsLanguage("Po tuguese", "por"); // TODO fix queries with spaces
    searchFindsLanguage("Porxuguese", "por");
  });
  it("should find languages by iso639_3 code", () => {
    searchFindsLanguage("xrb", "xrb");
    searchFindsLanguage("zhw", "zhw");
  });
  it("should find languages by region name", () => {
    searchFindsLanguage("Indonesia", "abl");
    searchFindsLanguage("Canada", "alq");
  });
  it("should rank better matches before worse matches", () => {
    // "Ese" comes before "Mese"
    const eseQuery = "ese";
    expect(
      indexOfLanguageInSearchResults(eseQuery, "mcq") >
        indexOfLanguageInSearchResults(eseQuery, "mci")
    );

    // "chorasmian" comes before "ch'orti'"
    const choQuery = "cho";
    expect(
      indexOfLanguageInSearchResults(choQuery, "xco") >
        indexOfLanguageInSearchResults(choQuery, "caa")
    );
  });
  it("should find matches regardless of case", () => {
    searchFindsLanguage("japanese", "jpn");
    searchFindsLanguage("JAPANESE", "jpn");
    searchFindsLanguage("JaPanEsE", "jpn");
  });
  it("should find matches that don't start with the query", () => {
    // TODO fine-tune the fuzzy matching so "ohlone" brings up "northern ohlone"
    // searchFindsLanguage("ohlone", "cst");
  });
  it("does not find languages that completely don't match the query", () => {
    searchDoesNotFindLanguage("zzzz", "jpn");
  });
});

function searchFindsLanguage(query: string, expectedLanguageCode: string) {
  const result = searchForLanguage(query);
  expect(result.length).toBeGreaterThan(0);
  expect(
    result.some((result) => result.item.code === expectedLanguageCode)
  ).toBe(true);
}

function searchDoesNotFindLanguage(
  query: string,
  expectedLanguageCode: string
) {
  const result = searchForLanguage(query);
  expect(
    result.some((result) => result.item.code === expectedLanguageCode)
  ).toBe(false);
}

function indexOfLanguageInSearchResults(
  query: string,
  expectedLanguageCode: string
) {
  const result = searchForLanguage(query);
  const index = result.findIndex(
    (result) => result.item.code === expectedLanguageCode
  );
  return index;
}
