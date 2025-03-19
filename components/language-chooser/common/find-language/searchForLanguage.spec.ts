import { getLanguageBySubtag, searchForLanguage } from "./searchForLanguage";
import { ILanguage } from "./findLanguageInterfaces";
import { describe, expect, it } from "vitest";
import { expectTypeOf } from "vitest";
import { FuseResult } from "fuse.js";
import { codeMatches } from "./languageTagUtils";
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
    expect(searchForLanguage("azerbaijani")[0].item.autonym).toBe(
      "Azərbaycan dili"
    );
  });
  it("should fallback to localname for autonym if no localnames", () => {
    expect(searchForLanguage("japanese")[0].item.autonym).toBe("日本語");
  });
  it("should leave autonym as undefined if no localnames or localname", () => {
    expect(searchForLanguage("Aranadan")[0].item.autonym).toBeUndefined();
  });
});

describe("Macrolanguage handling", () => {
  it("searching for macrolanguage name should find the macrolanguage", () => {
    searchDoesFindLanguage("Delaware", "del");
    searchDoesFindLanguage("Chinese", "zho");
    searchDoesFindLanguage("Arabic", "ara");
  });

  it("searching for macrolanguage code (2 or 3 letter) should find the macrolanguage", () => {
    searchDoesFindLanguage("del", "del");
    searchDoesFindLanguage("zho", "zho");
    searchDoesFindLanguage("zh", "zho");
    searchDoesFindLanguage("ara", "ara");
    searchDoesFindLanguage("ar", "ara");
    searchDoesFindLanguage("aym", "aym");
    searchDoesFindLanguage("ay", "aym");
  });

  it("Should find both macro and indiv language with shared name when searching for that name", () => {
    searchDoesFindLanguage("Chinese", "zho");
    searchDoesFindLanguage("Chinese", "cmn");
    searchDoesFindLanguage("Uzbek", "uzb");
    searchDoesFindLanguage("Uzbek", "uzn");
    searchDoesFindLanguage("Haida", "hai");
    searchDoesFindLanguage("Haida", "hdn");
  });

  it("should not include macrolanguages in searches by region, unique individual language name, individual language code, or alternative names", () => {
    searchDoesFindLanguage("Canada", "ojg"); // Eastern Ojibwa, individual language
    searchDoesNotFindLanguage("Canada", "oji"); // Ojibwa macrolanguage

    searchDoesFindLanguage("ўзбек тили", "uzn"); // Uzbek, individual language
    searchDoesNotFindLanguage("ўзбек тили", "uzb"); // Uzbek macrolanguage
    searchDoesFindLanguage("اوزبیک", "uzn"); // Uzbek, individual language
    searchDoesNotFindLanguage("اوزبیک", "uzb"); // Uzbek macrolanguage
    searchDoesFindLanguage("Uzbekistan", "uzn"); // Uzbek, individual language
    searchDoesNotFindLanguage("Uzbekistan", "uzb"); // Uzbek macrolanguage
  });

  // Make sure that the unusual language entries that don't behave as expected are still preserved in some form
  it("should include results for unusual language situations", () => {
    function expectToFindResultByExonym(exonym: string, region: string) {
      const result = searchForLanguage(exonym).find(
        (result) =>
          stripDemarcation(result.item.exonym) === exonym &&
          result.item.regionNamesForDisplay.includes(region)
      );
      expect(result).toBeDefined();
    }
    expectToFindResultByExonym("Akan", "Ghana");
    expectToFindResultByExonym("Bontok", "Philippines");
    expectToFindResultByExonym("Norwegian", "Norway");
    expectToFindResultByExonym("Sanskrit", "India");
    expectToFindResultByExonym("Serbo-Croatian", "Serbia");
    expectToFindResultByExonym("Zapotec", "Mexico");
  });

  // Searching for a macrolanguage name or code should find all its individual languages
  it("should find all individual languages when searching for macrolanguage name or code", () => {
    function searchFindsAllLanguages(
      query: string,
      expectedLanguageCodes: string[]
    ) {
      const results = searchForLanguage(query);
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
    searchFindsAllLanguages("Luyia", luyiaLanguages);
    searchFindsAllLanguages("luy", luyiaLanguages);

    const malayLanguages = ["bjn", "bvu", "dup", "hji", "jak", "liw", "urk"]; // just an arbitrary sampling
    searchFindsAllLanguages("Malay", malayLanguages);
    searchFindsAllLanguages("msa", malayLanguages);
  });

  it("macrolanguage results should list default region only and default script only", () => {
    const arabicResults = searchForLanguage("Arabic");
    const macroArabicResult = arabicResults.find((result) =>
      codeMatches(result.item.iso639_3_code, "ara")
    );
    expect(macroArabicResult).toBeDefined();
    expect(macroArabicResult?.item.regionNamesForDisplay).toBe("Egypt");
    expect(macroArabicResult?.item.scripts.length).toBe(1);
    expect(macroArabicResult?.item.scripts[0].code).toBe("Arab");

    const marwariResults = searchForLanguage("Marwari");
    const macroMarwariResult = marwariResults.find((result) =>
      codeMatches(result.item.iso639_3_code, "mwr")
    );
    expect(macroMarwariResult).toBeDefined();
    expect(macroMarwariResult?.item.regionNamesForDisplay).toBe("India");
    expect(macroMarwariResult?.item.scripts.length).toBe(1);
    expect(macroMarwariResult?.item.scripts[0].code).toBe("Deva");
  });
});

it("Does not have (macrolanguage) parentheticals in names", () => {
  function expectNoMacrolanguageParentheticals(searchString: string) {
    const results = searchForLanguage(searchString);
    expect(
      results.some(
        (result) =>
          result.item.names.join().includes("macrolanguage") ||
          result.item.autonym?.includes("(macrolanguage)") ||
          result.item.exonym.includes("macrolanguage)")
      ),
      `results for ${searchString} should not include "(macrolanguage)"`
    ).toBe(false);
  }
  expectNoMacrolanguageParentheticals("Swahili");
  expectNoMacrolanguageParentheticals("doi");
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
