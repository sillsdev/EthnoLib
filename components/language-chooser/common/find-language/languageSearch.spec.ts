import {
  getLanguageBySubtag,
  asyncSearchForLanguage,
  searchForLanguage,
} from "./searchForLanguage";
import { ILanguage } from "./findLanguageInterfaces";
import { describe, expect, it } from "vitest";
import { expectTypeOf } from "vitest";
import { codeMatches } from "./languageTagUtils";
import { stripDemarcation } from "./matchingSubstringDemarcation";
import {
  defaultSearchResultModifier,
  LanguageSearcher,
} from "@ethnolib/find-language";

// wait for all the results from asyncSearchForLanguage so we can check them
export async function asyncGetAllLanguageResults(
  queryString: string
): Promise<ILanguage[]> {
  const results: ILanguage[] = [];
  await asyncSearchForLanguage(queryString, (newResults) => {
    results.push(...newResults);
    return true;
  });
  return results;
}

async function asyncExpectToComeBefore(
  results: ILanguage[],
  expectedLanguageCode1: string,
  expectedLanguageCode2: string
) {
  const index1 = results.findIndex((result) =>
    codeMatches(result.iso639_3_code, expectedLanguageCode1)
  );
  const index2 = results.findIndex((result) =>
    codeMatches(result.iso639_3_code, expectedLanguageCode2)
  );
  expect(
    index1,
    `expected ${expectedLanguageCode1} (at index ${index1}) to come before ${expectedLanguageCode2} (at index ${index2})`
  ).toBeLessThan(index2);
}

describe("asyncGetAllLanguageResults", () => {
  it("should return a list of languages", async () => {
    const result = await asyncGetAllLanguageResults("en");
    expect(result).toBeInstanceOf(Array);
    expectTypeOf(result[0].iso639_3_code).toEqualTypeOf<string>();
    expectTypeOf(result[0].exonym).toEqualTypeOf<string>();
    expectTypeOf(result[0].regionNamesForDisplay).toEqualTypeOf<string>();
    expectTypeOf(result[0].names).toEqualTypeOf<string[]>();
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
    await asyncExpectToComeBefore(
      await asyncGetAllLanguageResults(eseQuery),
      "mcq",
      "mci"
    );

    // "chorasmian" comes before "ch'orti'"
    const choQuery = "cho";
    await asyncExpectToComeBefore(
      await asyncGetAllLanguageResults(choQuery),
      "xco",
      "caa"
    );
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

  it("prioritizes whole word matches, then start-of-word matches", async () => {
    // searching "cree", all "cree" results should come before the "creek" result
    const creeQuery = "cree";
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
      await asyncExpectToComeBefore(
        await asyncGetAllLanguageResults(creeQuery),
        creeLangCode,
        "mus" // creek
      );
    }

    //searching "oka", "Wejeñememaja oka" should come before "Okanisi Tongo" (djk)
    const okaQuery = "oka";
    await asyncExpectToComeBefore(
      await asyncGetAllLanguageResults(okaQuery),
      "tnc",
      "djk"
    );

    //searching "otl", "San Felipe Otlaltepec Popoloca" (pow) should come before "botlikh" (bph)
    const otlQuery = "otl";
    await asyncExpectToComeBefore(
      await asyncGetAllLanguageResults(otlQuery),
      "pow",
      "bph"
    );
  }, 10000);

  it("should prefer any autonym on the default script entry", async () => {
    const zsmResults = await asyncGetAllLanguageResults("zsm");
    expect(zsmResults[0].autonym).toBe("Bahasa Malaysia");
  });

  it("should use a non-default script autonym if no autonym on default script entry", async () => {
    const cjsResults = await asyncGetAllLanguageResults("cjs");
    expect(cjsResults[0].autonym).toBe("Тадар тили");
  });

  it("should prefer localnames[0] for autonym", async () => {
    const azerbaijaniResults = await asyncGetAllLanguageResults("azerbaijani");
    expect(azerbaijaniResults[0].autonym).toBe("Azərbaycan dili");
  });
  it("should fallback to localname for autonym if no localnames", async () => {
    const japaneseResults = await asyncGetAllLanguageResults("japanese");
    expect(japaneseResults[0].autonym).toBe("日本語");
  });
  it("should leave autonym as undefined if no localnames or localname", async () => {
    const results = await asyncGetAllLanguageResults("Aranadan");
    expect(results[0].autonym).toBeUndefined();
  });

  it("should not have any duplicate results", async () => {
    function checkForDuplicates(results: ILanguage[]): void {
      const seen = new Set<string>();
      for (const result of results) {
        const key = stripDemarcation(result.iso639_3_code) || "";
        expect(seen.has(key), `Duplicate result found: ${key}`).toBe(false);
        seen.add(key);
      }
    }
    checkForDuplicates(await asyncGetAllLanguageResults("english"));
    checkForDuplicates(await asyncGetAllLanguageResults("cree"));
    checkForDuplicates(await asyncGetAllLanguageResults("mese"));
  });
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
  // Langtags.json has had anomalies/unique situations for "bnc", "aka", "nor", "hbs", "san", "zap" preventing our usual code from mapping them to individual languages
  // How we handle these cases may change, but make sure some result is always available for these
  it("should include results for unusual language situations", async () => {
    async function asyncExpectToFindResultByExonym(
      exonym: string,
      region: string
    ) {
      const results = await asyncGetAllLanguageResults(exonym);
      const result = results.find(
        (result) =>
          stripDemarcation(result.exonym) === exonym &&
          result.regionNamesForDisplay.includes(region)
      );
      expect(result).toBeDefined();
    }
    await asyncExpectToFindResultByExonym("Akan", "Ghana"); // aka
    await asyncExpectToFindResultByExonym("Bontok", "Philippines"); // bnc
    await asyncExpectToFindResultByExonym("Norwegian", "Norway"); // nor
    await asyncExpectToFindResultByExonym("Sanskrit", "India"); // san
    await asyncExpectToFindResultByExonym("Serbo-Croatian", "Serbia"); // hbs
    await asyncExpectToFindResultByExonym("Zapotec", "Mexico"); // zap
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
          results.some((result) => codeMatches(result.iso639_3_code, langCode)),
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
      codeMatches(result.iso639_3_code, "ara")
    );
    expect(macroArabicResult).toBeDefined();
    expect(macroArabicResult?.regionNamesForDisplay).toBe("Egypt");
    expect(macroArabicResult?.scripts.length).toBe(1);
    expect(macroArabicResult?.scripts[0].code).toBe("Arab");

    const marwariResults = await asyncGetAllLanguageResults("Marwari");
    const macroMarwariResult = marwariResults.find((result) =>
      codeMatches(result.iso639_3_code, "mwr")
    );
    expect(macroMarwariResult).toBeDefined();
    expect(macroMarwariResult?.regionNamesForDisplay).toBe("India");
    expect(macroMarwariResult?.scripts.length).toBe(1);
    expect(macroMarwariResult?.scripts[0].code).toBe("Deva");
  });

  it("Does not have (macrolanguage) parentheticals in names", async () => {
    async function asyncExpectNoMacrolanguageParentheticals(
      searchString: string
    ) {
      const results = await asyncGetAllLanguageResults(searchString);
      expect(
        results.some(
          (result) =>
            result.names.join().includes("macrolanguage") ||
            result.autonym?.includes("(macrolanguage)") ||
            result.exonym.includes("macrolanguage)")
        ),
        `results for ${searchString} should not include "(macrolanguage)"`
      ).toBe(false);
    }
    await asyncExpectNoMacrolanguageParentheticals("Swahili");
    await asyncExpectNoMacrolanguageParentheticals("doi");
  });
}, 15000);

async function asyncSearchDoesFindLanguage(
  query: string,
  expectedLanguageCode: string
) {
  const results = await asyncGetAllLanguageResults(query);
  expect(
    results.some((result) =>
      codeMatches(result.iso639_3_code, expectedLanguageCode)
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
      codeMatches(result.iso639_3_code, expectedLanguageCode)
    ),
    `Expected search for ${query} to not find ${expectedLanguageCode}`
  ).toBe(false);
}

describe("getLanguageBySubtag", () => {
  it("should find languages by valid languageSubtag field", () => {
    expect(getLanguageBySubtag("aaa")?.exonym).toEqual("Ghotuo");
    expect(getLanguageBySubtag("ab")?.exonym).toEqual("Abkhaz");
    expect(getLanguageBySubtag("uz")?.exonym).toEqual("Uzbek");
    expect(getLanguageBySubtag("mg")?.iso639_3_code).toEqual("plt");
    expect(getLanguageBySubtag("zh")?.exonym).toEqual("Chinese");
    expect(getLanguageBySubtag("za")?.exonym).toEqual("Zhuang");
    expect(getLanguageBySubtag("bnc")?.iso639_3_code).toEqual("lbk");
    expect(getLanguageBySubtag("no")?.exonym).toEqual("Norwegian");
    expect(getLanguageBySubtag("sh")?.iso639_3_code).toEqual("hbs");
    expect(getLanguageBySubtag("sa")?.exonym).toEqual("Sanskrit");
    expect(getLanguageBySubtag("zap")?.exonym).toEqual("Zapotec");
    expect(getLanguageBySubtag("ik")?.iso639_3_code).toEqual("esk");
    expect(getLanguageBySubtag("id")?.exonym).toEqual("Indonesian");
    expect(getLanguageBySubtag("ja")?.exonym).toEqual("Japanese");
    expect(getLanguageBySubtag("yi")?.autonym).toEqual("יידיש");
    expect(getLanguageBySubtag("luy")?.iso639_3_code).toEqual("bxk");
  });
  it("should find languages using the defaultSearchResultModifier", () => {
    expect(
      getLanguageBySubtag("aaa", defaultSearchResultModifier)?.exonym
    ).toEqual("Ghotuo");
    expect(
      getLanguageBySubtag("ab", defaultSearchResultModifier)?.exonym
    ).toEqual("Abkhaz");
    // The exonym for uz gets demarcated as [Uz]bek, so have to check different field
    expect(
      getLanguageBySubtag("uz", defaultSearchResultModifier)?.iso639_3_code
    ).toEqual("uzn");
    expect(
      getLanguageBySubtag("mg", defaultSearchResultModifier)?.iso639_3_code
    ).toEqual("plt");
    expect(
      getLanguageBySubtag("zh", defaultSearchResultModifier)?.exonym
    ).toEqual("Chinese");
    expect(
      getLanguageBySubtag("za", defaultSearchResultModifier)?.exonym
    ).toEqual("Zhuang");
    expect(
      getLanguageBySubtag("bnc", defaultSearchResultModifier)?.iso639_3_code
    ).toEqual("lbk");
    expect(
      getLanguageBySubtag("no", defaultSearchResultModifier)?.exonym
    ).toEqual("Norwegian");
    expect(
      getLanguageBySubtag("sh", defaultSearchResultModifier)?.iso639_3_code
    ).toEqual("hbs");
    expect(
      getLanguageBySubtag("sa", defaultSearchResultModifier)?.exonym
    ).toEqual("Sanskrit");
    expect(
      getLanguageBySubtag("zap", defaultSearchResultModifier)?.exonym
    ).toEqual("Zapotec");
    expect(
      getLanguageBySubtag("ik", defaultSearchResultModifier)?.iso639_3_code
    ).toEqual("esk");
    expect(
      getLanguageBySubtag("id", defaultSearchResultModifier)?.exonym
    ).toEqual("Indonesian");
    expect(
      getLanguageBySubtag("ja", defaultSearchResultModifier)?.exonym
    ).toEqual("Japanese");
    expect(
      getLanguageBySubtag("yi", defaultSearchResultModifier)?.autonym
    ).toEqual("יידיש");
    expect(
      getLanguageBySubtag("luy", defaultSearchResultModifier)?.iso639_3_code
    ).toEqual("bxk");
  });
  it("should use searchResultModifier if provided", () => {
    const foobar = "foobar";
    const modifier = (results: ILanguage[], _searchString: string) =>
      results.map((result) => {
        return { ...result, exonym: foobar };
      });
    expect(getLanguageBySubtag("en", modifier)?.exonym).toEqual(foobar);
  });
});

describe("comparing sync and async search results", () => {
  it("should return the same results for the same query", async () => {
    async function checkResultsMatch(query: string) {
      const syncResults = searchForLanguage(query);
      const asyncResults = await asyncGetAllLanguageResults(query);
      expect(syncResults).toEqual(asyncResults);
    }
    await checkResultsMatch("japanese");
    await checkResultsMatch("japanes");
    await checkResultsMatch("ese");
    await checkResultsMatch("uzbxk");
  }, 10000);
});

describe("other language object types", async () => {
  it("should handle non-ILanguage objects", async () => {
    const langs = [
      {
        isoCode: "fra",
        name: "French",
        not: "not eng not spa",
        foo: "baz",
        1: 3,
      },
      "junk in here",
      undefined,
      {
        isoCode: "eng",
        name: "English",
        not: "not fra not spa",
        foo: "bar",
        id: "first_eng_result",
      },
      {
        isoCode: "spa",
        name: "Spanish",
        not: "not eng not fra",
      },
      {
        isoCode: "eng2",
        name: "English2",
        not: "not fra not spa",
        foo: "bar2",
        id: "second_eng_result",
      },
    ];
    const languageSearcher = new LanguageSearcher(
      langs,
      (language) => language.isoCode,
      ["isoCode", "foo"],
      ["isoCode", "foo"]
    );

    const syncResults = languageSearcher.searchForLanguage("eng");
    expect(syncResults.length).toBe(2);
    expect(syncResults[0].id).toEqual("first_eng_result");
    expect(syncResults[1].id).toEqual("second_eng_result");
    const allAsyncResults: any[] = [];
    await languageSearcher.asyncSearchForLanguage("eng", (results) => {
      allAsyncResults.push(...results);
      return true;
    });
    expect(allAsyncResults.length).toBe(2);
    expect(allAsyncResults[0].id).toEqual("first_eng_result");
    expect(allAsyncResults[1].id).toEqual("second_eng_result");
  });
});
