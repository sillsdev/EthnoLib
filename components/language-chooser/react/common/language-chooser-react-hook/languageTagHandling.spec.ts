import { expect, it, describe } from "vitest";
import {
  defaultRegionForLangTag,
  parseLangtagFromLangChooser,
  createTagFromOrthography,
  languageForManuallyEnteredTag,
  isValidBcp47Tag,
  isManuallyEnteredTagLanguage,
  UNLISTED_LANGUAGE,
  isUnlistedLanguage,
  ICustomizableLanguageDetails,
} from "./languageTagHandling";
import {
  getRegionBySubtag,
  ILanguage,
  IScript,
  LanguageType,
} from "@ethnolib/find-language";
import { FuseResult } from "fuse.js";
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
    expect(parseLangtagFromLangChooser("uz-Sogd")?.script?.scriptName).toEqual(
      "Sogdian"
    );
  });
  it("should find valid information even if script, region or dialect is not typically associated with that language", () => {
    const result = parseLangtagFromLangChooser("ixl-Cyrl-JP-x-foobar"); // Ixil (normally latin script, guatemala region)
    expect(result?.language?.exonym).toEqual("Ixil");
    expect(result?.script?.scriptName).toEqual("Cyrillic");
    expect(result?.customDetails?.region?.name).toEqual("Japan");
  });

  it("should find the correct implied scripts", () => {
    expect(parseLangtagFromLangChooser("uz")?.script?.scriptName).toEqual(
      "Latin"
    );
    expect(
      parseLangtagFromLangChooser("uz-x-barfoo")?.script?.scriptName
    ).toEqual("Latin");
    expect(parseLangtagFromLangChooser("uz-AF")?.script?.scriptName).toEqual(
      "Arabic"
    );
    expect(
      parseLangtagFromLangChooser("uz-AF-x-foobar")?.script?.scriptName
    ).toEqual("Arabic");
  });

  it("should put private use subtags into dialect field", () => {
    expect(
      parseLangtagFromLangChooser("en-Latn-x-foo")?.customDetails?.dialect
    ).toEqual("foo");
  });
  it("should be case insensitive", () => {
    const result = parseLangtagFromLangChooser("cE-CyRl-rU");
    expect(result?.language?.exonym).toEqual("Chechen");
    expect(result?.script?.scriptName).toEqual("Cyrillic");
    expect(result?.customDetails?.region?.name).toEqual("Russian Federation");
  });
  it("should work for all combos of present and absent subtags", () => {
    // ssh, ssh-Arab, ssh-AE, ssh-x-foobar, ssh-Arab-AE, ssh-Arab-x-foobar, ssh-AE-x-foobar, ssh-Arab-AE-x-foobar
    const ssh_result = parseLangtagFromLangChooser("ssh");
    expect(ssh_result?.language?.exonym).toEqual("Shihhi Arabic");
    expect(ssh_result?.script?.scriptName).toEqual("Arabic");
    expect(ssh_result?.customDetails?.region?.name).toBeUndefined();
    expect(ssh_result?.customDetails?.dialect).toBeUndefined();

    const ssh_Arab_result = parseLangtagFromLangChooser("ssh-Arab");
    expect(ssh_Arab_result?.language?.exonym).toEqual("Shihhi Arabic");
    expect(ssh_Arab_result?.script?.scriptName).toEqual("Arabic");
    expect(ssh_Arab_result?.customDetails?.region?.name).toBeUndefined();
    expect(ssh_Arab_result?.customDetails?.dialect).toBeUndefined();

    const ssh_AE_result = parseLangtagFromLangChooser("ssh-AE");
    expect(ssh_AE_result?.language?.exonym).toEqual("Shihhi Arabic");
    expect(ssh_AE_result?.script?.scriptName).toEqual("Arabic");
    expect(ssh_AE_result?.customDetails?.region?.name).toEqual(
      "United Arab Emirates"
    );
    expect(ssh_AE_result?.customDetails?.dialect).toBeUndefined();

    const ssh_x_foobar_result = parseLangtagFromLangChooser("ssh-x-foobar");
    expect(ssh_x_foobar_result?.language?.exonym).toEqual("Shihhi Arabic");
    expect(ssh_x_foobar_result?.script?.scriptName).toEqual("Arabic");
    expect(ssh_x_foobar_result?.customDetails?.region?.name).toBeUndefined();
    expect(ssh_x_foobar_result?.customDetails?.dialect).toEqual("foobar");

    const ssh_Arab_AE_result = parseLangtagFromLangChooser("ssh-Arab-AE");
    expect(ssh_Arab_AE_result?.language?.exonym).toEqual("Shihhi Arabic");
    expect(ssh_Arab_AE_result?.script?.scriptName).toEqual("Arabic");
    expect(ssh_Arab_AE_result?.customDetails?.region?.name).toEqual(
      "United Arab Emirates"
    );
    expect(ssh_Arab_AE_result?.customDetails?.dialect).toBeUndefined();

    const ssh_Arab_x_foobar_result =
      parseLangtagFromLangChooser("ssh-Arab-x-foobar");
    expect(ssh_Arab_x_foobar_result?.language?.exonym).toEqual("Shihhi Arabic");
    expect(ssh_Arab_x_foobar_result?.script?.scriptName).toEqual("Arabic");
    expect(
      ssh_Arab_x_foobar_result?.customDetails?.region?.name
    ).toBeUndefined();
    expect(ssh_Arab_x_foobar_result?.customDetails?.dialect).toEqual("foobar");

    const ssh_AE_x_foobar_result =
      parseLangtagFromLangChooser("ssh-AE-x-foobar");
    expect(ssh_AE_x_foobar_result?.language?.exonym).toEqual("Shihhi Arabic");
    expect(ssh_AE_x_foobar_result?.script?.scriptName).toEqual("Arabic");
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
    expect(ssh_Arab_AE_x_foobar_result?.script?.scriptName).toEqual("Arabic");
    expect(ssh_Arab_AE_x_foobar_result?.customDetails?.region?.name).toEqual(
      "United Arab Emirates"
    );
    expect(ssh_Arab_AE_x_foobar_result?.customDetails?.dialect).toEqual(
      "foobar"
    );
  });
  it("uses searchResultModifier if provided", () => {
    const foobar = "foobar";
    const modifier = (
      results: FuseResult<ILanguage>[],
      _searchString: string
    ) =>
      results.map((result) => {
        return { ...result.item, exonym: foobar };
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

  it("uses searchResultModifier if provided", () => {
    // If using a search result modifier that filters out all results, we should no longer find a region
    const searchResultModifier = (
      _results: FuseResult<ILanguage>[],
      _searchString: string
    ): ILanguage[] => {
      return [];
    };
    expect(defaultRegionForLangTag("uz")).not.toBeUndefined();
    expect(defaultRegionForLangTag("uz", searchResultModifier)).toBeUndefined();
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
  it("should return the manually entered tag for the language objected created from a manually entered tag", () => {
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
          regionNames: "",
          names: [],
          alternativeTags: [],
          languageType: LanguageType.Living,
        },
        script: { code: "Latn", scriptName: "Latin" } as IScript,
        customDetails: { dialect: "[foo]bar" } as ICustomizableLanguageDetails,
      })
    ).toEqual("en-Latn-x-foobar");
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
