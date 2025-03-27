import {
  getLanguageBySubtag,
  asyncGetAllLanguageResults,
} from "./searchForLanguage";
import { ILanguage } from "./findLanguageInterfaces";
import { describe, expect, it } from "vitest";
import { expectTypeOf } from "vitest";
import { FuseResult } from "fuse.js";
import { codeMatches } from "./languageTagUtils";
import { stripDemarcation } from "./matchingSubstringDemarcation";

describe("asyncGetAllLanguageResults", () => {
  it("should return a list of languages", async () => {
    const result = await asyncGetAllLanguageResults("en");
    expectTypeOf(result).toEqualTypeOf<FuseResult<ILanguage>[]>();
    expect(result.length).toBeGreaterThan(0);
  });

  it("should find common languages by common queries", async () => {
    await asyncSearchDoesFindLanguage("English", "eng");
    await asyncSearchDoesFindLanguage("eng", "eng");
    await asyncSearchDoesFindLanguage("en", "eng");
    await asyncSearchDoesFindLanguage("fr", "fra");
    await asyncSearchDoesFindLanguage("fre", "fra");
    await asyncSearchDoesFindLanguage("fra", "fra");
    await asyncSearchDoesFindLanguage("french", "fra");
    await asyncSearchDoesFindLanguage("français", "fra");
    await asyncSearchDoesFindLanguage("francais", "fra");
    await asyncSearchDoesFindLanguage("spanish", "spa");
    await asyncSearchDoesFindLanguage("spa", "spa");
    await asyncSearchDoesFindLanguage("español", "spa");
    await asyncSearchDoesFindLanguage("espanol", "spa");
    await asyncSearchDoesFindLanguage("esp", "spa");
    await asyncSearchDoesFindLanguage("tok pisin", "tpi");
    await asyncSearchDoesFindLanguage("tokpisin", "tpi");
    await asyncSearchDoesFindLanguage("tok", "tpi");
  }, 20000);

  it("should find languages by autonym", async () => {
    await asyncSearchDoesFindLanguage("нохчийн", "che");
    await asyncSearchDoesFindLanguage("Kamarakotos", "aoc");
  });
  it("should find languages by exonym", async () => {
    await asyncSearchDoesFindLanguage("luba-katanga", "lub");
    await asyncSearchDoesFindLanguage("ndzwani", "wni");
  });
  it("should find languages by alternative names", async () => {
    await asyncSearchDoesFindLanguage("tiatinugua", "ese");
    await asyncSearchDoesFindLanguage("kler", "xrb");
  });
  it("should find languages by fuzzy match", async () => {
    await asyncSearchDoesFindLanguage("Portuguese", "por");
    await asyncSearchDoesFindLanguage("xPortuguese", "por");
    await asyncSearchDoesFindLanguage("Porxtuguese", "por");
    await asyncSearchDoesFindLanguage("ortuguese", "por");
    await asyncSearchDoesFindLanguage("Potuguese", "por");
    await asyncSearchDoesFindLanguage("Po tuguese", "por");
    await asyncSearchDoesFindLanguage("Porxuguese", "por");
  }, 10000);
  it("should find languages by iso639_3 code", async () => {
    await asyncSearchDoesFindLanguage("xrb", "xrb");
    await asyncSearchDoesFindLanguage("zhw", "zhw");
  });
  it("should find languages by region name", async () => {
    await asyncSearchDoesFindLanguage("Indonesia", "abl");
    await asyncSearchDoesFindLanguage("Canada", "alq");
  });
  it("should rank better matches before worse matches", async () => {
    // "Ese" comes before "Mese"
    const eseQuery = "ese";
    expect(
      await asyncIndexOfLanguageInSearchResults(eseQuery, "mcq")
    ).toBeLessThan(await asyncIndexOfLanguageInSearchResults(eseQuery, "mci"));

    // "chorasmian" comes before "ch'orti'"
    const choQuery = "cho";
    expect(
      await asyncIndexOfLanguageInSearchResults(choQuery, "xco")
    ).toBeLessThan(await asyncIndexOfLanguageInSearchResults(choQuery, "caa"));
  });
  it("should find matches regardless of case", async () => {
    await asyncSearchDoesFindLanguage("japanese", "jpn");
    await asyncSearchDoesFindLanguage("JAPANESE", "jpn");
    await asyncSearchDoesFindLanguage("JaPanEsE", "jpn");
  });
  it("should find matches that don't start with the query", async () => {
    await asyncSearchDoesFindLanguage("ohlone", "cst");
  });
  it("does not find languages that completely don't match the query", async () => {
    await asyncSearchDoesNotFindLanguage("zzzz", "jpn");
  });

  it("prioritizes whole word matches, then prefix matches", async () => {
    // searching "cree", all "cree" results should come before the "creek" result
    const creeQuery = "cree";
    const indexOfCreek = await asyncIndexOfLanguageInSearchResults(
      creeQuery,
      "mus"
    );
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
        await asyncIndexOfLanguageInSearchResults(creeQuery, creeLangCode)
      ).toBeLessThan(indexOfCreek);
    }

    // searching "aka", all "aka" languages should come before the "akan" language
    const akaQuery = "aka";
    const akaResults = await asyncGetAllLanguageResults(akaQuery);
    const indexOfAkan = akaResults.findIndex(
      // We are using the exonym because the iso code may change if we adjust macrolanguage handling behavior.
      // See macrolanguageNotes.md
      (result) => stripDemarcation(result.item.exonym) === "Akan"
    );
    const akaLangCodes = ["soh", "ahk", "axk", "hru", "wum"];
    for (const akaLangCode of akaLangCodes) {
      expect(
        await asyncIndexOfLanguageInSearchResults(akaQuery, akaLangCode)
      ).toBeLessThan(indexOfAkan);
    }
    // "aka koro" should also come before "akan" since "aka" stands as a whole word
    expect(
      await asyncIndexOfLanguageInSearchResults(akaQuery, "jkr")
    ).toBeLessThan(indexOfAkan);

    //searching "oka", "Wejeñememaja oka" should come before "Okanisi Tongo" (djk)
    const okaQuery = "oka";
    expect(
      await asyncIndexOfLanguageInSearchResults(okaQuery, "tnc")
    ).toBeLessThan(await asyncIndexOfLanguageInSearchResults(okaQuery, "djk"));

    //searching "otl", "San Felipe Otlaltepec Popoloca" (pow) should come before "botlikh" (bph)
    const otlQuery = "otl";
    expect(
      await asyncIndexOfLanguageInSearchResults(otlQuery, "pow")
    ).toBeLessThan(await asyncIndexOfLanguageInSearchResults(otlQuery, "bph"));
  }, 10000);

  it("should prefer localnames[0] for autonym", async () => {
    const azerbaijaniResults = await asyncGetAllLanguageResults("azerbaijani");
    expect(azerbaijaniResults[0].item.autonym).toBe("Azərbaycan dili");
  });
  it("should fallback to localname for autonym if no localnames", async () => {
    const japaneseResults = await asyncGetAllLanguageResults("japanese");
    expect(japaneseResults[0].item.autonym).toBe("日本語");
  });
  it("should leave autonym as undefined if no localnames or localname", async () => {
    const results = await asyncGetAllLanguageResults("Aranadan");
    expect(results[0].item.autonym).toBeUndefined();
  });
});

it("should not have any duplicate results", async () => {
  function checkForDuplicates(results: FuseResult<ILanguage>[]): void {
    const seen = new Set<string>();
    for (const result of results) {
      const key = stripDemarcation(result.item.iso639_3_code) || "";
      expect(seen.has(key), `Duplicate result found: ${key}`).toBe(false);
      seen.add(key);
    }
  }
  checkForDuplicates(await asyncGetAllLanguageResults("english"));
  checkForDuplicates(await asyncGetAllLanguageResults("cree"));
  checkForDuplicates(await asyncGetAllLanguageResults("mese"));
});

describe("Macrolanguage handling", () => {
  it("searching for macrolanguage name should find the macrolanguage", async () => {
    await asyncSearchDoesFindLanguage("Delaware", "del");
    await asyncSearchDoesFindLanguage("Chinese", "zho");
    await asyncSearchDoesFindLanguage("Arabic", "ara");
  });

  it("searching for macrolanguage code (2 or 3 letter) should find the macrolanguage", async () => {
    await asyncSearchDoesFindLanguage("del", "del");
    await asyncSearchDoesFindLanguage("zho", "zho");
    await asyncSearchDoesFindLanguage("zh", "zho");
    await asyncSearchDoesFindLanguage("ara", "ara");
    await asyncSearchDoesFindLanguage("ar", "ara");
    await asyncSearchDoesFindLanguage("aym", "aym");
    await asyncSearchDoesFindLanguage("ay", "aym");
  });

  it("Should find both macro and indiv language with shared name when searching for that name", async () => {
    await asyncSearchDoesFindLanguage("Chinese", "zho");
    await asyncSearchDoesFindLanguage("Chinese", "cmn");
    await asyncSearchDoesFindLanguage("Uzbek", "uzb");
    await asyncSearchDoesFindLanguage("Uzbek", "uzn");
    await asyncSearchDoesFindLanguage("Haida", "hai");
    await asyncSearchDoesFindLanguage("Haida", "hdn");
  });

  it("should not include macrolanguages in searches by region, unique individual language name, individual language code, or alternative names", async () => {
    await asyncSearchDoesFindLanguage("Canada", "ojg"); // Eastern Ojibwa, individual language
    await asyncSearchDoesNotFindLanguage("Canada", "oji"); // Ojibwa macrolanguage

    await asyncSearchDoesFindLanguage("ўзбек тили", "uzn"); // Uzbek, individual language
    await asyncSearchDoesNotFindLanguage("ўзбек тили", "uzb"); // Uzbek macrolanguage
    await asyncSearchDoesFindLanguage("اوزبیک", "uzn"); // Uzbek, individual language
    await asyncSearchDoesNotFindLanguage("اوزبیک", "uzb"); // Uzbek macrolanguage
    await asyncSearchDoesFindLanguage("Uzbekistan", "uzn"); // Uzbek, individual language
    await asyncSearchDoesNotFindLanguage("Uzbekistan", "uzb"); // Uzbek macrolanguage
  });

  // Make sure that the unusual language entries that don't behave as expected are still preserved in some form
  it("should include results for unusual language situations", async () => {
    async function asyncExpectToFindResultByExonym(
      exonym: string,
      region: string
    ) {
      const results = await asyncGetAllLanguageResults(exonym);
      const result = results.find(
        (result) =>
          stripDemarcation(result.item.exonym) === exonym &&
          result.item.regionNamesForDisplay.includes(region)
      );
      expect(result).toBeDefined();
    }
    await asyncExpectToFindResultByExonym("Akan", "Ghana");
    await asyncExpectToFindResultByExonym("Bontok", "Philippines");
    await asyncExpectToFindResultByExonym("Norwegian", "Norway");
    await asyncExpectToFindResultByExonym("Sanskrit", "India");
    await asyncExpectToFindResultByExonym("Serbo-Croatian", "Serbia");
    await asyncExpectToFindResultByExonym("Zapotec", "Mexico");
  });

  // Searching for a macrolanguage name or code should find all its individual languages
  it("should find all individual languages when searching for macrolanguage name or code", async () => {
    async function searchFindsAllLanguages(
      query: string,
      expectedLanguageCodes: string[]
    ) {
      const results = await asyncGetAllLanguageResults(query);
      for (const langCode of expectedLanguageCodes) {
        expect(
          results.some((result) =>
            codeMatches(result.item.iso639_3_code, langCode)
          ),
          `search for ${query} should find ${langCode}`
        ).toBe(true);
      }
    }
    const luyiaLanguages = [
      "bxk",
      "ida",
      "lkb",
      "lks",
      "lri",
      "lrm",
      "lsm",
      "lto",
      "lts",
      "lwg",
      "nle",
      "nyd",
      "rag",
    ];
    await searchFindsAllLanguages("Luyia", luyiaLanguages);
    await searchFindsAllLanguages("luy", luyiaLanguages);

    const malayLanguages = ["bjn", "bvu", "dup", "hji", "jak", "liw", "urk"]; // just an arbitrary sampling
    await searchFindsAllLanguages("Malay", malayLanguages);
    await searchFindsAllLanguages("msa", malayLanguages);
  });

  it("macrolanguage results should list default region only and default script only", async () => {
    const arabicResults = await asyncGetAllLanguageResults("Arabic");
    const macroArabicResult = arabicResults.find((result) =>
      codeMatches(result.item.iso639_3_code, "ara")
    );
    expect(macroArabicResult).toBeDefined();
    expect(macroArabicResult?.item.regionNamesForDisplay).toBe("Egypt");
    expect(macroArabicResult?.item.scripts.length).toBe(1);
    expect(macroArabicResult?.item.scripts[0].code).toBe("Arab");

    const marwariResults = await asyncGetAllLanguageResults("Marwari");
    const macroMarwariResult = marwariResults.find((result) =>
      codeMatches(result.item.iso639_3_code, "mwr")
    );
    expect(macroMarwariResult).toBeDefined();
    expect(macroMarwariResult?.item.regionNamesForDisplay).toBe("India");
    expect(macroMarwariResult?.item.scripts.length).toBe(1);
    expect(macroMarwariResult?.item.scripts[0].code).toBe("Deva");
  });
});

async function asyncSearchDoesFindLanguage(
  query: string,
  expectedLanguageCode: string
) {
  const results = await asyncGetAllLanguageResults(query);
  expect(
    results.some((result) =>
      codeMatches(result.item.iso639_3_code, expectedLanguageCode)
    ),
    `Expected search for ${query} to find ${expectedLanguageCode}`
  ).toBe(true);
}

async function asyncSearchDoesNotFindLanguage(
  query: string,
  expectedLanguageCode: string
) {
  const results = await asyncGetAllLanguageResults(query);
  expect(
    results.some((result) =>
      codeMatches(result.item.iso639_3_code, expectedLanguageCode)
    ),
    `Expected search for ${query} to not find ${expectedLanguageCode}`
  ).toBe(false);
}

async function asyncIndexOfLanguageInSearchResults(
  query: string,
  expectedLanguageCode: string
) {
  const results = await asyncGetAllLanguageResults(query);
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
