import React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isReadyToSubmit, useLanguageChooser } from "./useLanguageChooser";
import {
  languageForManuallyEnteredTag,
  UNLISTED_LANGUAGE,
  ILanguage,
  IRegion,
  IScript,
  LanguageType,
  IOrthography,
} from "@ethnolib/find-language";

function renderUseLanguageChooser(
  onSelectionChange?: (
    orthography: IOrthography | undefined,
    langtag: string | undefined
  ) => void
) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const result: {
    current: ReturnType<typeof useLanguageChooser> | null;
  } = {
    current: null,
  };

  function HookHost() {
    result.current = useLanguageChooser(onSelectionChange);
    return null;
  }

  act(() => {
    ReactDOM.render(React.createElement(HookHost), container);
  });

  return {
    result,
    unmount() {
      act(() => {
        ReactDOM.unmountComponentAtNode(container);
      });
      container.remove();
    },
  };
}

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
    regionNamesForDisplay: "Foobar, Barbaz",
    regionNamesForSearch: ["Foobar", "Barbaz"],
    names: ["foo", "bar", "baz"],
    scripts: [latinScript],
    alternativeTags: [],
    languageType: LanguageType.Living,
  } as ILanguage;

  const scriptlessLanguage = {
    autonym: "Test",
    exonym: "Test Language",
    iso639_3_code: "tst",
    languageSubtag: "tst",
    regionNamesForDisplay: "Test Region",
    regionNamesForSearch: ["Test Region"],
    names: ["Test"],
    scripts: [],
    alternativeTags: [],
    languageType: LanguageType.Living,
  } as ILanguage;

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

  describe("isReadyToSubmit: unlisted languages", () => {
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

    it.each(["!!!", "   ", "---"])(
      "returns false for unlisted language with invalid dialect: %s",
      (dialect) => {
        expect(
          isReadyToSubmit({
            language: UNLISTED_LANGUAGE,
            customDetails: {
              customDisplayName: "Test",
              region: testRegion,
              dialect,
            },
          })
        ).toBe(false);
      }
    );

    it("returns false for unlisted language with whitespace-only region name", () => {
      expect(
        isReadyToSubmit({
          language: UNLISTED_LANGUAGE,
          customDetails: {
            customDisplayName: "Test",
            region: { ...testRegion, name: "   " },
            dialect: "Test Dialect",
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

  describe("isReadyToSubmit: manually entered tag", () => {
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

describe("useLanguageChooser", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  const latinScript = { code: "Latn", name: "Latin" } as IScript;

  const singleScriptLanguage = {
    autonym: "foo",
    exonym: "bar",
    iso639_3_code: "baz",
    languageSubtag: "foo",
    regionNamesForDisplay: "Foobar",
    regionNamesForSearch: ["Foobar"],
    names: ["foo", "bar", "baz"],
    scripts: [latinScript],
    alternativeTags: [],
    languageType: LanguageType.Living,
  } as ILanguage;

  it("binds field-backed state changes and clears selection when searching", () => {
    const onSelectionChange = vi.fn();
    const rendered = renderUseLanguageChooser(onSelectionChange);

    act(() => {
      rendered.result.current?.selectLanguage(singleScriptLanguage);
    });

    expect(rendered.result.current?.selectedLanguage).toBe(
      singleScriptLanguage
    );
    expect(rendered.result.current?.selectedScript).toBe(latinScript);
    expect(rendered.result.current?.readyToSubmit).toBe(true);
    expect(onSelectionChange).toHaveBeenCalledWith(
      expect.objectContaining({
        language: singleScriptLanguage,
        script: latinScript,
      }),
      expect.any(String)
    );

    act(() => {
      rendered.result.current?.onSearchStringChange("ab");
    });

    expect(rendered.result.current?.searchString).toBe("ab");
    expect(rendered.result.current?.selectedLanguage).toBeUndefined();
    expect(rendered.result.current?.selectedScript).toBeUndefined();
    expect(rendered.result.current?.readyToSubmit).toBe(false);
    expect(onSelectionChange).toHaveBeenLastCalledWith(undefined, undefined);
    rendered.unmount();
  });

  it("keeps the implied single script when saving details without an explicit script", () => {
    const rendered = renderUseLanguageChooser();

    act(() => {
      rendered.result.current?.selectLanguage(singleScriptLanguage);
    });

    act(() => {
      rendered.result.current?.saveLanguageDetails(
        { customDisplayName: "Custom Foo" },
        undefined
      );
    });

    expect(rendered.result.current?.selectedScript).toBe(latinScript);
    expect(rendered.result.current?.customizableLanguageDetails).toEqual(
      expect.objectContaining({ customDisplayName: "Custom Foo" })
    );
    rendered.unmount();
  });

  it("restores manually entered tags through resetTo", () => {
    const rendered = renderUseLanguageChooser();

    act(() => {
      rendered.result.current?.resetTo(undefined, "zzz-Foo", "Test");
    });

    expect(rendered.result.current?.selectedLanguage).toEqual(
      expect.objectContaining({ manuallyEnteredTag: "zzz-Foo" })
    );
    expect(rendered.result.current?.customizableLanguageDetails).toEqual(
      expect.objectContaining({ customDisplayName: "Test" })
    );
    expect(rendered.result.current?.readyToSubmit).toBe(true);
    rendered.unmount();
  });
});
