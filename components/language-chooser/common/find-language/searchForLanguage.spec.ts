import {
  getLanguageBySubtag,
  getAllLanguageResults,
} from "./searchForLanguage";
import { ILanguage } from "./findLanguageInterfaces";
import { describe, expect, it } from "vitest";
import { expectTypeOf } from "vitest";
import { FuseResult } from "fuse.js";
import { codeMatches } from "./searchResultModifiers";
import { stripDemarcation } from "./matchingSubstringDemarcation";

describe("getAllLanguageResults", () => {
  it("should return a list of languages", async () => {
    const result = await getAllLanguageResults("en");
    expectTypeOf(result).toEqualTypeOf<FuseResult<ILanguage>[]>();
    expect(result.length).toBeGreaterThan(0);
  });

  it("should find common languages by common queries", async () => {
    await searchDoesFindLanguage("English", "eng");
    await searchDoesFindLanguage("eng", "eng");
    await searchDoesFindLanguage("en", "eng");
    await searchDoesFindLanguage("fr", "fra");
    await searchDoesFindLanguage("fre", "fra");
    await searchDoesFindLanguage("fra", "fra");
    await searchDoesFindLanguage("french", "fra");
    await searchDoesFindLanguage("français", "fra");
    await searchDoesFindLanguage("francais", "fra");
    await searchDoesFindLanguage("spanish", "spa");
    await searchDoesFindLanguage("spa", "spa");
    await searchDoesFindLanguage("español", "spa");
    await searchDoesFindLanguage("espanol", "spa");
    await searchDoesFindLanguage("esp", "spa");
    await searchDoesFindLanguage("tok pisin", "tpi");
    await searchDoesFindLanguage("tokpisin", "tpi");
    await searchDoesFindLanguage("tok", "tpi");
  }, 10000);

  it("should find languages by autonym", async () => {
    await searchDoesFindLanguage("нохчийн", "che");
    await searchDoesFindLanguage("Kamarakotos", "aoc");
  });
  it("should find languages by exonym", async () => {
    await searchDoesFindLanguage("luba-katanga", "lub");
    await searchDoesFindLanguage("ndzwani", "wni");
  });
  it("should find languages by alternative names", async () => {
    await searchDoesFindLanguage("tiatinugua", "ese");
    await searchDoesFindLanguage("kler", "xrb");
  });
  it("should find languages by fuzzy match", async () => {
    await searchDoesFindLanguage("Portuguese", "por");
    await searchDoesFindLanguage("xPortuguese", "por");
    await searchDoesFindLanguage("Porxtuguese", "por");
    await searchDoesFindLanguage("ortuguese", "por");
    await searchDoesFindLanguage("Potuguese", "por");
    await searchDoesFindLanguage("Po tuguese", "por");
    await searchDoesFindLanguage("Porxuguese", "por");
  });
  it("should find languages by iso639_3 code", async () => {
    await searchDoesFindLanguage("xrb", "xrb");
    await searchDoesFindLanguage("zhw", "zhw");
  });
  it("should find languages by region name", async () => {
    await searchDoesFindLanguage("Indonesia", "abl");
    await searchDoesFindLanguage("Canada", "alq");
  });
  it("should rank better matches before worse matches", async () => {
    // "Ese" comes before "Mese"
    const eseQuery = "ese";
    expect(await indexOfLanguageInSearchResults(eseQuery, "mcq")).toBeLessThan(
      await indexOfLanguageInSearchResults(eseQuery, "mci")
    );

    // "chorasmian" comes before "ch'orti'"
    const choQuery = "cho";
    expect(await indexOfLanguageInSearchResults(choQuery, "xco")).toBeLessThan(
      await indexOfLanguageInSearchResults(choQuery, "caa")
    );
  });
  it("should find matches regardless of case", async () => {
    await searchDoesFindLanguage("japanese", "jpn");
    await searchDoesFindLanguage("JAPANESE", "jpn");
    await searchDoesFindLanguage("JaPanEsE", "jpn");
  });
  it("should find matches that don't start with the query", async () => {
    await searchDoesFindLanguage("ohlone", "cst");
  });
  it("does not find languages that completely don't match the query", async () => {
    await searchDoesNotFindLanguage("zzzz", "jpn");
  });

  it("prioritizes whole word matches, then prefix matches", async () => {
    // searching "cree", all "cree" results should come before the "creek" result
    const creeQuery = "cree";
    const indexOfCreek = await indexOfLanguageInSearchResults(creeQuery, "mus");
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
        await indexOfLanguageInSearchResults(creeQuery, creeLangCode)
      ).toBeLessThan(indexOfCreek);
    }

    // searching "aka", all "aka" languages should come before the "akan" language
    const akaQuery = "aka";
    const akaResults = await getAllLanguageResults(akaQuery);
    const indexOfAkan = akaResults.findIndex(
      // We are using the exonym because the iso code may change if we adjust macrolanguage handling behavior.
      // See macrolanguageNotes.md
      (result) => stripDemarcation(result.item.exonym) === "Akan"
    );
    const akaLangCodes = ["soh", "ahk", "axk", "hru", "wum"];
    for (const akaLangCode of akaLangCodes) {
      expect(
        await indexOfLanguageInSearchResults(akaQuery, akaLangCode)
      ).toBeLessThan(indexOfAkan);
    }
    // "aka koro" should also come before "akan" since "aka" stands as a whole word
    expect(await indexOfLanguageInSearchResults(akaQuery, "jkr")).toBeLessThan(
      indexOfAkan
    );

    //searching "oka", "Wejeñememaja oka" should come before "Okanisi Tongo" (djk)
    const okaQuery = "oka";
    expect(await indexOfLanguageInSearchResults(okaQuery, "tnc")).toBeLessThan(
      await indexOfLanguageInSearchResults(okaQuery, "djk")
    );

    //searching "otl", "San Felipe Otlaltepec Popoloca" (pow) should come before "botlikh" (bph)
    const otlQuery = "otl";
    expect(await indexOfLanguageInSearchResults(otlQuery, "pow")).toBeLessThan(
      await indexOfLanguageInSearchResults(otlQuery, "bph")
    );
  }, 10000);

  it("should prefer localnames[0] for autonym", async () => {
    const azerbaijaniResults = await getAllLanguageResults("azerbaijani");
    expect(azerbaijaniResults[0].item.autonym).toBe("Azərbaycan dili");
  });
  it("should fallback to localname for autonym if no localnames", async () => {
    const japaneseResults = await getAllLanguageResults("japanese");
    expect(japaneseResults[0].item.autonym).toBe("日本語");
  });
  it("should leave autonym as undefined if no localnames or localname", async () => {
    const results = await getAllLanguageResults("Aranadan");
    expect(results[0].item.autonym).toBeUndefined();
  });
});

async function searchDoesFindLanguage(
  query: string,
  expectedLanguageCode: string
) {
  const results = await getAllLanguageResults(query);
  expect(results.length).toBeGreaterThan(0);
  expect(
    results.some((result) =>
      codeMatches(result.item.iso639_3_code, expectedLanguageCode)
    )
  ).toBe(true);
}

async function searchDoesNotFindLanguage(
  query: string,
  expectedLanguageCode: string
) {
  const results = await getAllLanguageResults(query);
  expect(
    results.some((result) =>
      codeMatches(result.item.iso639_3_code, expectedLanguageCode)
    )
  ).toBe(false);
}

async function indexOfLanguageInSearchResults(
  query: string,
  expectedLanguageCode: string
) {
  const results = await getAllLanguageResults(query);
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
  it("should use searchResultModifier if provided", () => {
    const foobar = "foobar";
    const modifier = (
      results: FuseResult<ILanguage>[],
      _searchString: string
    ) =>
      results.map((result) => {
        return { ...result.item, exonym: foobar };
      });
    expect(getLanguageBySubtag("en", modifier)?.exonym).toEqual(foobar);
  });
});
