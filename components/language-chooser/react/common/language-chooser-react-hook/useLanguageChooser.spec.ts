import { expect, it, describe } from "vitest";
import { isReadyToSubmit } from "./useLanguageChooser";
import {
  languageForManuallyEnteredTag,
  UNLISTED_LANGUAGE,
} from "./languageTagHandling";
import { IRegion, IScript, LanguageType } from "@ethnolib/find-language";

describe("isReadyToSubmit", () => {
  // Test fixture for IScript
  const latinScript = { code: "Latn", name: "Latin" } as IScript;

  // Test fixture for IRegion
  const testRegion = { name: "Test Region", code: "TST" } as IRegion;

  const regularLanguage = {
    autonym: "foo",
    exonym: "bar",
    iso639_3_code: "baz",
    languageSubtag: "foo",
    regionNames: "Foobar, Barbaz",
    names: ["foo", "bar", "baz"],
    scripts: [latinScript],
    alternativeTags: [],
    languageType: LanguageType.Living,
  };

  const scriptlessLanguage = {
    autonym: "Test",
    exonym: "Test Language",
    iso639_3_code: "tst",
    languageSubtag: "tst",
    regionNames: "Test Region",
    names: ["Test"],
    scripts: [],
    alternativeTags: [],
    languageType: LanguageType.Living,
  };

  it("returns false if no language is selected", () => {
    expect(isReadyToSubmit({})).toBe(false);
  });

  it("returns false if empty or whitespace custom display name is given", () => {
    expect(
      isReadyToSubmit({
        language: regularLanguage,
        script: regularLanguage.scripts[0],
        customDetails: {
          customDisplayName: "",
        },
      })
    ).toBe(false);
    expect(
      isReadyToSubmit({
        language: regularLanguage,
        script: regularLanguage.scripts[0],
        customDetails: {
          customDisplayName: " ",
        },
      })
    ).toBe(false);
  });

  it("returns false if script is required but not selected", () => {
    expect(
      isReadyToSubmit({
        language: regularLanguage,
        customDetails: { customDisplayName: "English" },
      })
    ).toBe(false);
  });

  it("returns true for valid regular language with script and display name", () => {
    expect(
      isReadyToSubmit({
        language: regularLanguage,
        script: regularLanguage.scripts[0],
        customDetails: { customDisplayName: "English" },
      })
    ).toBe(true);
  });

  it("returns true for language without scripts when display name is provided", () => {
    expect(
      isReadyToSubmit({
        language: scriptlessLanguage,
        customDetails: { customDisplayName: "Test Language" },
      })
    ).toBe(true);
  });

  describe("unlisted language", () => {
    it("returns false for unlisted language with region missing", () => {
      expect(
        isReadyToSubmit({
          language: UNLISTED_LANGUAGE,
          customDetails: {
            customDisplayName: "Test",
            dialect: "test",
          },
        })
      ).toBe(false);
    });

    it("returns false for unlisted language with details missing", () => {
      expect(
        isReadyToSubmit({
          language: UNLISTED_LANGUAGE,
        })
      ).toBe(false);
    });

    it("returns false for unlisted language with dialect is missing", () => {
      expect(
        isReadyToSubmit({
          language: UNLISTED_LANGUAGE,
          customDetails: {
            customDisplayName: "Test",
            region: testRegion,
          },
        })
      ).toBe(false);
    });

    it("returns false for unlisted or manually entered tag with no display name", () => {
      expect(
        isReadyToSubmit({
          language: languageForManuallyEnteredTag("zzz-Foo"),
          customDetails: {},
        })
      ).toBe(false);
      expect(
        isReadyToSubmit({
          language: UNLISTED_LANGUAGE,
          customDetails: {},
        })
      ).toBe(false);
    });

    it("returns true or unlisted language with all required fields are provided", () => {
      expect(
        isReadyToSubmit({
          language: UNLISTED_LANGUAGE,
          customDetails: {
            customDisplayName: "Test",
            region: testRegion,
            dialect: "Test Dialect",
          },
        })
      ).toBe(true);
    });
  });

  describe("manually entered tag", () => {
    const manualLanguage = languageForManuallyEnteredTag("zzz-Foo");

    it("returns false for invalid BCP 47 tag", () => {
      expect(
        isReadyToSubmit({
          language: { ...manualLanguage, manuallyEnteredTag: "invalid-tag!" },
          customDetails: { customDisplayName: "Test" },
        })
      ).toBe(false);
    });

    it("returns true for valid BCP 47 tag with display name", () => {
      expect(
        isReadyToSubmit({
          language: manualLanguage,
          customDetails: { customDisplayName: "Test" },
        })
      ).toBe(true);
    });

    it("returns false if display name is missing", () => {
      expect(
        isReadyToSubmit({
          language: manualLanguage,
          customDetails: {},
        })
      ).toBe(false);
    });
  });
});
