import { expect, it, describe } from "vitest";
import {
  createTag,
  createTagFromOrthography,
  defaultRegionForLangTag,
  formatDialectCode,
  getMaximalLangtag,
  getShortestSufficientLangtag,
  isManuallyEnteredTagLanguage,
  isUnlistedLanguage,
  isValidBcp47Tag,
  languageForManuallyEnteredTag,
  UNLISTED_LANGUAGE,
} from "./languageTagUtils";
import { parseLangtagFromLangChooser } from "./searchForLanguage";
import {
  ILanguage,
  LanguageType,
  IScript,
  ICustomizableLanguageDetails,
} from "./findLanguageInterfaces";
import { getRegionBySubtag } from "./regionsAndScripts";

describe("Tag creation", () => {
  it("should create the correct language tag for a language", () => {
    expect(createTag({ languageCode: "eng" })).toEqual("eng");
    expect(
      createTag({
        regionCode: "US",
        dialectCode: "foobar",
        languageCode: "eng",
        scriptCode: "Latn",
      })
    ).toEqual("eng-Latn-US-x-foobar");
  });
  it("should create tags with optional dialect and region", () => {
    expect(createTag({ languageCode: "eng", dialectCode: "foobar" })).toEqual(
      "eng-x-foobar"
    );
    expect(createTag({ languageCode: "eng", regionCode: "IN" })).toEqual(
      "eng-IN"
    );
  });

  it("should normalize dialect codes when building tags", () => {
    expect(createTag({ languageCode: "eng", dialectCode: "foo bar" })).toEqual(
      "eng-x-foobar"
    );
    expect(createTag({ dialectCode: " foo  bar " })).toEqual("qaa-x-foobar");
  });

  it("should create qaa-x-dialect tag if no language tag is provided", () => {
    expect(createTag({ dialectCode: "foobar" })).toEqual("qaa-x-foobar");
    // we are currently allowing script/region in qaa tags, though I'm not sure if we will always want this behavior
    expect(
      createTag({
        dialectCode: "foobar",
        scriptCode: "Latn",
        regionCode: "US"
      })
    ).toEqual("qaa-Latn-US-x-foobar");
  });
});

describe("get shortest equivalent version of langtag", () => {
  it("should return the shortest tag if it exists", () => {
    expect(getShortestSufficientLangtag("en")).toEqual("en");
    expect(getShortestSufficientLangtag("frm")).toEqual("frm");
    expect(getShortestSufficientLangtag("frm-Latn-FR")).toEqual("frm");
    expect(getShortestSufficientLangtag("frm-FR")).toEqual("frm");
    expect(getShortestSufficientLangtag("frm-Latn")).toEqual("frm");
    // test tags with private use variants
    expect(getShortestSufficientLangtag("ta-x-foobar")).toEqual("ta-x-foobar");
    expect(getShortestSufficientLangtag("ta-Taml-x-foobar")).toEqual(
      "ta-x-foobar"
    );
    expect(getShortestSufficientLangtag("ta-IN-x-foobar")).toEqual(
      "ta-x-foobar"
    );
    expect(getShortestSufficientLangtag("ta-Taml-IN-x-foobar")).toEqual(
      "ta-x-foobar"
    );
    expect(getShortestSufficientLangtag("ta-Latn-x-foobar")).toEqual(
      "ta-Latn-x-foobar"
    );
    expect(getShortestSufficientLangtag("ta-Latn-IN-x-foobar")).toEqual(
      "ta-Latn-x-foobar"
    );
    expect(getShortestSufficientLangtag("ta-Taml-LK-x-foobar")).toEqual(
      "ta-LK-x-foobar"
    );
    expect(getShortestSufficientLangtag("ta-LK-x-foobar")).toEqual(
      "ta-LK-x-foobar"
    );
    expect(getShortestSufficientLangtag("ta-Arab-IN")).toEqual("ta-Arab");
    expect(getShortestSufficientLangtag("ta-Arab-IN-x-foobar")).toEqual(
      "ta-Arab-x-foobar"
    );
    // Note that createTag() calls getShortestSufficientLangtag() internally as its last stop.
    // If getShortestSufficientLangtag() returns undefined, createTag() will return the full tag it created.
    expect(
      createTag({
        languageCode: "ta",
        scriptCode: "Arab",
        regionCode: "PK",
        dialectCode: "foobar",
      })
    ).toEqual("ta-Arab-PK-x-foobar");
    // test default scripts and default region codes
    // Serbian is a good example as it has two scripts that are used by default in different regions.
    // (It actually has a third script, but that is not used by default in any region.)
    expect(getShortestSufficientLangtag("sr")).toEqual("sr");
    expect(getShortestSufficientLangtag("sr-Cyrl")).toEqual("sr");
    expect(getShortestSufficientLangtag("sr-RS")).toEqual("sr");
    expect(getShortestSufficientLangtag("sr-Cyrl-RS")).toEqual("sr");
    expect(getShortestSufficientLangtag("sr-BA")).toEqual("sr-BA");
    expect(getShortestSufficientLangtag("sr-Cyrl-BA")).toEqual("sr-BA");
    expect(getShortestSufficientLangtag("sr-Latn-BA")).toEqual("sr-Latn-BA");
    expect(getShortestSufficientLangtag("sr-Latn")).toEqual("sr-Latn");
    expect(getShortestSufficientLangtag("sr-Latn-RS")).toEqual("sr-Latn");
    expect(getShortestSufficientLangtag("sr-ME")).toEqual("sr-ME");
    expect(getShortestSufficientLangtag("sr-Latn-ME")).toEqual("sr-ME");
    expect(getShortestSufficientLangtag("sr-Cyrl-ME")).toEqual("sr-Cyrl-ME");
    expect(getShortestSufficientLangtag("sr-RO")).toEqual("sr-RO");
    expect(getShortestSufficientLangtag("sr-Latn-RO")).toEqual("sr-RO");
    expect(
      createTag({ languageCode: "sr", scriptCode: "Cyrl", regionCode: "RO" })
    ).toEqual("sr-Cyrl-RO");
    // torture test for multiple private use subtags
    expect(getShortestSufficientLangtag("en-x-first-x-second")).toEqual(
      "en-x-first-x-second"
    );
    expect(getShortestSufficientLangtag("en-Latn-US-x-first-x-second")).toEqual(
      "en-x-first-x-second"
    );
  });
  it("should be case insensitive on input", () => {
    expect(getShortestSufficientLangtag("fRm")).toEqual("frm");
    expect(getShortestSufficientLangtag("FRM-LaTn")).toEqual("frm");
  });
  it("should return undefined if tag is not found in the equivalence list (langtags.txt)", () => {
    expect(getShortestSufficientLangtag("zzz")).toBeUndefined();
    expect(getShortestSufficientLangtag("")).toBeUndefined();
    expect(getShortestSufficientLangtag("frm-Cyrl")).toBeUndefined();
    expect(getShortestSufficientLangtag("ta-Arab-PK")).toBeUndefined();
    expect(getShortestSufficientLangtag("sr-Cyrl-RO")).toBeUndefined();
  });
});

describe("get maximal equivalent version of langtag", () => {
  it("should return the maximal tag if it exists", () => {
    expect(getMaximalLangtag("dtp-Latn-MY")).toEqual("dtp-Latn-MY");
    expect(getMaximalLangtag("dtp")).toEqual("dtp-Latn-MY");
    expect(getMaximalLangtag("ktr")).toEqual("dtp-Latn-MY");
    expect(getMaximalLangtag("kzt-MY")).toEqual("dtp-Latn-MY");
    expect(
      getMaximalLangtag(
        createTag({
          languageCode: "dtp",
          regionCode: "MY",
          scriptCode: "Latn"
        })
      )
    ).toEqual("dtp-Latn-MY");
    expect(
      getMaximalLangtag(createTag({ languageCode: "dtp", scriptCode: "Latn" }))
    ).toEqual("dtp-Latn-MY");
    expect(
      getMaximalLangtag(createTag({ languageCode: "dtp", regionCode: "MY" }))
    ).toEqual("dtp-Latn-MY");
    expect(getMaximalLangtag(createTag({ languageCode: "dtp" }))).toEqual(
      "dtp-Latn-MY"
    );
  });
  it("should be case insensitive", () => {
    expect(getMaximalLangtag("DTP-Latn-My")).toEqual("dtp-Latn-MY");
    expect(getMaximalLangtag("DtP")).toEqual("dtp-Latn-MY");
  });
  it("should return undefined if tag is not found in the equivalence list (langtags.txt)", () => {
    expect(getMaximalLangtag("zzz")).toBeUndefined();
    expect(getMaximalLangtag("")).toBeUndefined();
    expect(getMaximalLangtag("frm-Cyrl")).toBeUndefined();
  });
});

describe("Tag parsing", () => {
  it("should find a language by 2 letter language subtag", () => {
    expect(parseLangtagFromLangChooser("ja")?.language?.exonym).toEqual(
      "Japanese"
    );
  });
  it("should return undefined if no language found", () => {
    expect(parseLangtagFromLangChooser("")).toBeUndefined();
    expect(parseLangtagFromLangChooser("thisistoolong")).toBeUndefined();
    expect(parseLangtagFromLangChooser("xxx")).toBeUndefined();
  });
  it("should find a region by its tag", () => {
    expect(
      parseLangtagFromLangChooser("sqa-Latn-NG")?.customDetails?.region?.name
    ).toEqual("Nigeria");
  });
  it("should not return a region if the tag does not contain an explicit and valid region code", () => {
    expect(parseLangtagFromLangChooser("en-Latn")).toBeTruthy();
    expect(
      parseLangtagFromLangChooser("en-Latn")?.customDetails?.region
    ).toBeUndefined();
    // ZZ should be an invalid region code:
    expect(getRegionBySubtag("ZZ")).toBeUndefined();
    expect(
      parseLangtagFromLangChooser("en-Latn-ZZ")?.customDetails?.region
    ).toBeUndefined();
    expect(
      parseLangtagFromLangChooser("ssh-Arab")?.customDetails?.region
    ).toBeUndefined();
  });
  it("should find a script by its tag", () => {
    expect(parseLangtagFromLangChooser("uz-Sogd")?.script?.name).toEqual(
      "Sogdian"
    );
  });
  it("should find valid information even if script, region or dialect is not typically associated with that language", () => {
    const result = parseLangtagFromLangChooser("ixl-Cyrl-JP-x-foobar"); // Ixil (normally latin script, guatemala region)
    expect(result?.language?.exonym).toEqual("Ixil");
    expect(result?.script?.name).toEqual("Cyrillic");
    expect(result?.customDetails?.region?.name).toEqual("Japan");
  });

  it("should find the correct implied scripts", () => {
    expect(parseLangtagFromLangChooser("clk")?.script?.name).toEqual("Latin");
    expect(parseLangtagFromLangChooser("clk-x-barfoo")?.script?.name).toEqual(
      "Latin"
    );
    expect(parseLangtagFromLangChooser("clk-CN")?.script?.name).toEqual(
      "Tibetan"
    );
    expect(
      parseLangtagFromLangChooser("clk-CN-x-foobar")?.script?.name
    ).toEqual("Tibetan");

    expect(parseLangtagFromLangChooser("ce")?.script?.name).toEqual("Cyrillic");
  });

  it("should put private use subtags into dialect field", () => {
    expect(
      parseLangtagFromLangChooser("en-Latn-x-foo")?.customDetails?.dialect
    ).toEqual("foo");
  });
  it("should be case insensitive", () => {
    const result = parseLangtagFromLangChooser("cE-CyRl-rU");
    expect(result?.language?.exonym).toEqual("Chechen");
    expect(result?.script?.name).toEqual("Cyrillic");
    expect(result?.customDetails?.region?.name).toEqual("Russian Federation");
  });
  it("should work for all combos of present and absent subtags", () => {
    // ssh, ssh-Arab, ssh-AE, ssh-x-foobar, ssh-Arab-AE, ssh-Arab-x-foobar, ssh-AE-x-foobar, ssh-Arab-AE-x-foobar
    const ssh_result = parseLangtagFromLangChooser("ssh");
    expect(ssh_result?.language?.exonym).toEqual("Shihhi Arabic");
    expect(ssh_result?.script?.name).toEqual("Arabic");
    expect(ssh_result?.customDetails?.region?.name).toBeUndefined();
    expect(ssh_result?.customDetails?.dialect).toBeUndefined();

    const ssh_Arab_result = parseLangtagFromLangChooser("ssh-Arab");
    expect(ssh_Arab_result?.language?.exonym).toEqual("Shihhi Arabic");
    expect(ssh_Arab_result?.script?.name).toEqual("Arabic");
    expect(ssh_Arab_result?.customDetails?.region?.name).toBeUndefined();
    expect(ssh_Arab_result?.customDetails?.dialect).toBeUndefined();

    const ssh_AE_result = parseLangtagFromLangChooser("ssh-AE");
    expect(ssh_AE_result?.language?.exonym).toEqual("Shihhi Arabic");
    expect(ssh_AE_result?.script?.name).toEqual("Arabic");
    expect(ssh_AE_result?.customDetails?.region?.name).toEqual(
      "United Arab Emirates"
    );
    expect(ssh_AE_result?.customDetails?.dialect).toBeUndefined();

    const ssh_x_foobar_result = parseLangtagFromLangChooser("ssh-x-foobar");
    expect(ssh_x_foobar_result?.language?.exonym).toEqual("Shihhi Arabic");
    expect(ssh_x_foobar_result?.script?.name).toEqual("Arabic");
    expect(ssh_x_foobar_result?.customDetails?.region?.name).toBeUndefined();
    expect(ssh_x_foobar_result?.customDetails?.dialect).toEqual("foobar");

    const ssh_Arab_AE_result = parseLangtagFromLangChooser("ssh-Arab-AE");
    expect(ssh_Arab_AE_result?.language?.exonym).toEqual("Shihhi Arabic");
    expect(ssh_Arab_AE_result?.script?.name).toEqual("Arabic");
    expect(ssh_Arab_AE_result?.customDetails?.region?.name).toEqual(
      "United Arab Emirates"
    );
    expect(ssh_Arab_AE_result?.customDetails?.dialect).toBeUndefined();

    const ssh_Arab_x_foobar_result =
      parseLangtagFromLangChooser("ssh-Arab-x-foobar");
    expect(ssh_Arab_x_foobar_result?.language?.exonym).toEqual("Shihhi Arabic");
    expect(ssh_Arab_x_foobar_result?.script?.name).toEqual("Arabic");
    expect(
      ssh_Arab_x_foobar_result?.customDetails?.region?.name
    ).toBeUndefined();
    expect(ssh_Arab_x_foobar_result?.customDetails?.dialect).toEqual("foobar");

    const ssh_AE_x_foobar_result =
      parseLangtagFromLangChooser("ssh-AE-x-foobar");
    expect(ssh_AE_x_foobar_result?.language?.exonym).toEqual("Shihhi Arabic");
    expect(ssh_AE_x_foobar_result?.script?.name).toEqual("Arabic");
    expect(ssh_AE_x_foobar_result?.customDetails?.region?.name).toEqual(
      "United Arab Emirates"
    );
    expect(ssh_AE_x_foobar_result?.customDetails?.dialect).toEqual("foobar");

    const ssh_Arab_AE_x_foobar_result = parseLangtagFromLangChooser(
      "ssh-Arab-AE-x-foobar"
    );
    expect(ssh_Arab_AE_x_foobar_result?.language?.exonym).toEqual(
      "Shihhi Arabic"
    );
    expect(ssh_Arab_AE_x_foobar_result?.script?.name).toEqual("Arabic");
    expect(ssh_Arab_AE_x_foobar_result?.customDetails?.region?.name).toEqual(
      "United Arab Emirates"
    );
    expect(ssh_Arab_AE_x_foobar_result?.customDetails?.dialect).toEqual(
      "foobar"
    );
  });
  it("uses searchResultModifier if provided", () => {
    const foobar = "foobar";
    const modifier = (results: ILanguage[], _searchString: string) =>
      results.map((result) => {
        return { ...result, exonym: foobar };
      });
    expect(
      parseLangtagFromLangChooser("en", modifier)?.language?.exonym
    ).toEqual(foobar);
  });
});

describe("defaultRegionForLangTag", () => {
  it("should return the region for a language tag that already has a region", () => {
    expect(defaultRegionForLangTag("en-Latn-US")?.name).toEqual(
      "United States of America"
    );
    expect(defaultRegionForLangTag("en-CN-x-foobar")?.name).toEqual("China");
    expect(defaultRegionForLangTag("en-JP")?.name).toEqual("Japan");
  });
  it("should return the region for the closest maximal equivalent of the language tag", () => {
    expect(defaultRegionForLangTag("uz")?.name).toEqual("Uzbekistan");
    expect(defaultRegionForLangTag("uz-Cyrl")?.name).toEqual("Uzbekistan");
    expect(defaultRegionForLangTag("uz-Arab")?.name).toEqual("Afghanistan");
    expect(defaultRegionForLangTag("uz-Arab-x-foobar")?.name).toEqual(
      "Afghanistan"
    );
    expect(defaultRegionForLangTag("uz-Taml-x-foobar")?.name).toEqual(
      "Uzbekistan"
    );
  });
});

describe("createTagFromOrthography", () => {
  it("should return qaa-x- if orthography object has no language", () => {
    expect(createTagFromOrthography({})).toEqual("qaa-x-");
    expect(
      createTagFromOrthography({
        customDetails: { dialect: "foobar" },
      })
    ).toEqual("qaa-x-foobar");
  });
  it("should format unlisted dialect codes when building tags", () => {
    expect(
      createTagFromOrthography({
        customDetails: {
          dialect: "foo bar",
        },
      })
    ).toEqual("qaa-x-foobar");
  });
  it("should return the manually entered tag for the language object created from a manually entered tag", () => {
    const manualTag = "zz-zzz-x-foobar";
    expect(
      createTagFromOrthography({
        language: languageForManuallyEnteredTag(manualTag),
      })
    ).toEqual(manualTag);
  });
  it("should ignore substring demarcation", () => {
    expect(
      createTagFromOrthography({
        language: {
          languageSubtag: "e[n]",
          exonym: "English",
          scripts: [],
          iso639_3_code: "e[n]g",
          regionNamesForDisplay: "",
          regionNamesForSearch: [],
          names: [],
          alternativeTags: [],
          languageType: LanguageType.Living,
          isMacrolanguage: false,
        } as ILanguage,
        script: { code: "Latn", name: "Latin" } as IScript,
        customDetails: { dialect: "[foo]bar" } as ICustomizableLanguageDetails,
      })
    ).toEqual("en-x-foobar");
  });
  it("should modify dialog name if necessary", () => {
    expect(
      createTagFromOrthography({
        language: {
          languageSubtag: "en",
          exonym: "English",
          scripts: [],
          iso639_3_code: "eng",
          regionNamesForDisplay: "",
          regionNamesForSearch: [],
          names: [],
          alternativeTags: [],
          languageType: LanguageType.Living,
          isMacrolanguage: false,
        } as ILanguage,
        script: { code: "Latn", name: "Latin" } as IScript,
        customDetails: {
          dialect: "Special English!",
        } as ICustomizableLanguageDetails,
      })
    ).toEqual("en-x-SpecialE");
    expect(
      createTagFromOrthography({
        language: {
          languageSubtag: "en",
          exonym: "English",
          scripts: [],
          iso639_3_code: "eng",
          regionNamesForDisplay: "",
          regionNamesForSearch: [],
          names: [],
          alternativeTags: [],
          languageType: LanguageType.Living,
          isMacrolanguage: false,
        } as ILanguage,
        script: { code: "Latn", name: "Latin" } as IScript,
        customDetails: {
          dialect: "ai-newFancySmartAi",
        } as ICustomizableLanguageDetails,
      })
    ).toEqual("en-x-ai-newFancy");
  });
});

describe("isValidBcp47Tag checking is sane", () => {
  it("should return true for normal valid tags", () => {
    expect(isValidBcp47Tag("en")).toBeTruthy();
    expect(isValidBcp47Tag("en-Latn")).toBeTruthy();
    expect(isValidBcp47Tag("en-Latn-US")).toBeTruthy();
    expect(isValidBcp47Tag("en-Latn-US-x-foobar")).toBeTruthy();
    expect(isValidBcp47Tag("en-x-foobar")).toBeTruthy();
    expect(isValidBcp47Tag("en-US")).toBeTruthy();
    expect(isValidBcp47Tag("en-x-ai-google")).toBeTruthy();
  });

  it("should return true for macrolang-indiv lang formatted tags, including sign language tags", () => {
    expect(isValidBcp47Tag("zh-cmn")).toBeTruthy();
    expect(isValidBcp47Tag("sgn-ads-GH")).toBeTruthy();
  });

  it("should return true for unrecognized tags in the right format", () => {
    expect(isValidBcp47Tag("zzz")).toBeTruthy();
    expect(isValidBcp47Tag("zz-zzz-Zfoo-ZZ")).toBeTruthy();
  });

  it("should return true for BCP-47 recognized irregular and regular tags", () => {
    expect(isValidBcp47Tag("en-GB-oed")).toBeTruthy();
    expect(isValidBcp47Tag("i-ami")).toBeTruthy();
    expect(isValidBcp47Tag("i-navajo")).toBeTruthy();
    expect(isValidBcp47Tag("art-lojban")).toBeTruthy();
  });
  it("should return true for singleton-format BCP-47 tags", () => {
    expect(isValidBcp47Tag("en-a-bbb-x-a-ccc")).toBeTruthy();
    expect(
      isValidBcp47Tag("en-Latn-GB-boont-r-extended-sequence-x-private")
    ).toBeTruthy();
  });
  it("should return false for various invalid formats", () => {
    expect(isValidBcp47Tag("")).toBeFalsy();
    expect(isValidBcp47Tag("en-")).toBeFalsy();
    expect(isValidBcp47Tag("en-Latn-")).toBeFalsy();
    expect(isValidBcp47Tag("e")).toBeFalsy();
    expect(
      isValidBcp47Tag("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
    ).toBeFalsy();
  });
});

describe("sanity checks for isUnlistedLanguage and isManuallyEnteredTagLanguage", () => {
  it("isUnlistedLanguage returns true for a UNLISTED_LANGUAGE", () => {
    expect(isUnlistedLanguage(UNLISTED_LANGUAGE)).toEqual(true);
  });
  it("languageForManuallyEnteredTag creates a language that isManuallyEnteredTagLanguage", () => {
    expect(
      isManuallyEnteredTagLanguage(languageForManuallyEnteredTag("foo"))
    ).toEqual(true);
  });
});

describe("formatting dialect codes", () => {
  it("should return empty string for undefined or empty input", () => {
    expect(formatDialectCode("")).toEqual("");
    expect(formatDialectCode(undefined)).toEqual("");
  });
  it("should trim whitespace", () => {
    expect(formatDialectCode(" foo  bar ")).toEqual("foobar");
  });
  it("should remove illegal characters", () => {
    expect(formatDialectCode("foo!@#$%^&*()bar")).toEqual("foobar");
  });
  it("should retain dashes", () => {
    expect(formatDialectCode("ai-google")).toEqual("ai-google");
  });
  it("should truncate sections to 8 characters", () => {
    expect(
      formatDialectCode("123456789-123456789-123456789-123456789")
    ).toEqual("12345678-12345678-12345678-12345678");
    expect(formatDialectCode("ai-newFancySmartAi")).toEqual("ai-newFancy");
  });
  it("should drop empty segments", () => {
    expect(formatDialectCode("foo--bar")).toEqual("foo-bar");
    expect(formatDialectCode("-foo-")).toEqual("foo");
    expect(formatDialectCode("---")).toEqual("");
  });
  it("various combinations", () => {
    expect(
      formatDialectCode(
        "  1234 5678 9-1234 5678 9-!@#$%^&*()1234 5678 9-foobar"
      )
    ).toEqual("12345678-12345678-12345678-foobar");
  });
  it("should match unlisted tag examples", () => {
    expect(formatDialectCode("foo bar")).toEqual("foobar");
    expect(
      formatDialectCode(" 1 23 456 7890-@({}=) é, ñ, hi123there ")
    ).toEqual("12345678-hi123the");
    expect(formatDialectCode(" hi-there-12-5 6-12345@{}(* 6789 ")).toEqual(
      "hi-there-12-56-12345678"
    );
  });
});
