import { describe, expect, it, vi } from "vitest";
import {
  LanguageChooserViewModel,
  useLanguageChooserViewModel,
} from "../src/view-models/language-chooser";
import { fakeLanguage } from "./fake-utils";
import {
  ICustomizableLanguageDetails,
  type ILanguage,
  UNLISTED_LANGUAGE,
} from "@ethnolib/find-language";
import { NorthernUzbekLanguage, WaataLanguage } from "./sample-data/languages";
import { AndorraRegion } from "./sample-data/regions";

class TestParams {
  initialLanguages?: ILanguage[];
  initialLanguageCount?: number;
}

class TestHelper {
  constructor({ initialLanguages, initialLanguageCount }: TestParams = {}) {
    const langs =
      initialLanguages ??
      (initialLanguageCount
        ? Array.from({ length: initialLanguageCount }, () => fakeLanguage())
        : undefined);

    this.viewModel = useLanguageChooserViewModel({ initialLanguages: langs });
  }

  viewModel: LanguageChooserViewModel;
}

describe("language list", () => {
  it("is empty by default", () => {
    const test = new TestHelper();
    expect(test.viewModel.listedLanguages.value.length).toBe(0);
  });

  it("can be initialized", () => {
    const test = new TestHelper({ initialLanguageCount: 3 });
    expect(test.viewModel.listedLanguages.value.length).toBe(3);
  });
});

describe("selecting a language", () => {
  it("deselects other languages", () => {
    const test = new TestHelper({ initialLanguageCount: 3 });
    const lang1 = test.viewModel.listedLanguages.value[0];
    const lang2 = test.viewModel.listedLanguages.value[1];

    lang1.isSelected.requestUpdate(true);
    lang2.isSelected.requestUpdate(true);

    expect(lang1.isSelected.value).toBe(false);
  });

  it("resets customizations", () => {
    const test = new TestHelper({ initialLanguageCount: 1 });
    test.viewModel.customizations.requestUpdate({ customDisplayName: "hi" });
    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    expect(test.viewModel.customizations.value).toBe(undefined);
  });

  it("marks language selected", async () => {
    const test = new TestHelper();
    await test.viewModel.search("arabic");

    const lang = test.viewModel.listedLanguages.value[3];
    lang.isSelected.requestUpdate(true);
    expect(lang.isSelected.value).toBe(true);
  });

  it("deselects previous script", () => {
    const test = new TestHelper({
      initialLanguages: [NorthernUzbekLanguage, WaataLanguage],
    });

    // This language has one script, which should be auto-selected
    test.viewModel.listedLanguages.value[1].isSelected.requestUpdate(true);

    // This language has multiple scripts. The auto-selected script should be cleared.
    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);

    expect(test.viewModel.selectedScript.value).toBeUndefined();
  });
});

describe("script list", () => {
  it("is initially empty", () => {
    const test = new TestHelper();
    expect(test.viewModel.listedScripts.value.length).toBe(0);
  });

  it("is populated when a language with scripts is selected", () => {
    const test = new TestHelper({
      initialLanguages: [fakeLanguage({ scriptCount: 3 })],
    });

    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);

    expect(test.viewModel.listedScripts.value.length).toBe(3);
  });

  it("allows only one selected item", () => {
    const test = new TestHelper({
      initialLanguages: [fakeLanguage({ scriptCount: 3 })],
    });

    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    test.viewModel.listedScripts.value[0].isSelected.requestUpdate(true);
    test.viewModel.listedScripts.value[1].isSelected.requestUpdate(true);

    expect(test.viewModel.listedScripts.value[0].isSelected.value).toBe(false);
  });

  it("should be empty if selected language has only one script", () => {
    const test = new TestHelper({ initialLanguages: [WaataLanguage] });

    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);

    expect(test.viewModel.listedScripts.value.length).toBe(0);
  });

  it("should be cleared if selected language has only one script", () => {
    const test = new TestHelper({
      initialLanguages: [NorthernUzbekLanguage, WaataLanguage],
    });

    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    test.viewModel.listedLanguages.value[1].isSelected.requestUpdate(true);

    expect(test.viewModel.listedScripts.value.length).toBe(0);
  });
});

describe("tag preview", () => {
  it("should initially be qaa-x-", () => {
    const test = new TestHelper();
    expect(test.viewModel.tagPreview.value).toBe("qaa-x-");
  });

  it("on search, should be based on search", () => {
    const test = new TestHelper();
    test.viewModel.searchString.requestUpdate("e");
    expect(test.viewModel.tagPreview.value).toBe("qaa-x-e");
  });

  it("should be based on selected language", () => {
    const test = new TestHelper({ initialLanguages: [NorthernUzbekLanguage] });

    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);

    expect(test.viewModel.tagPreview.value).toBe("uz");
  });

  it("should be based on selected language and script", () => {
    const test = new TestHelper({ initialLanguages: [NorthernUzbekLanguage] });

    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    test.viewModel.listedScripts.value[1].isSelected.requestUpdate(true);

    expect(test.viewModel.tagPreview.value).toBe("uz-AF");
  });

  it("after language selection cleared, should be based on search", () => {
    const test = new TestHelper({ initialLanguages: [NorthernUzbekLanguage] });

    test.viewModel.searchString.value = "en";
    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(false);

    expect(test.viewModel.tagPreview.value).toBe("qaa-x-en");
  });
});

describe("display name", () => {
  it("should be empty initially", () => {
    const test = new TestHelper();
    expect(test.viewModel.displayName.value).toBe("");
  });

  it("should hold default name on language selection", () => {
    const test = new TestHelper({ initialLanguages: [NorthernUzbekLanguage] });

    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);

    expect(test.viewModel.displayName.value).toBe("ўзбек тили");
  });

  it("should hold default name on script selection", () => {
    const test = new TestHelper({ initialLanguages: [NorthernUzbekLanguage] });

    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    test.viewModel.listedScripts.value[0].isSelected.requestUpdate(true);

    expect(test.viewModel.displayName.value).toBe("oʻzbek tili");
  });

  it("should notify customizations UI listener of change", () => {
    const test = new TestHelper({ initialLanguageCount: 1 });

    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);

    let customizations: ICustomizableLanguageDetails | undefined;

    test.viewModel.customizations.updateUI = (value) => {
      customizations = { ...value };
    };

    test.viewModel.displayName.requestUpdate("my language");
    expect(customizations?.customDisplayName).toBe("my language");
  });
});

describe("search", () => {
  it("should populate language list", async () => {
    const test = new TestHelper();
    await test.viewModel.search("en");
    expect(test.viewModel.listedLanguages.value[0].language.iso639_3_code).toBe(
      "eng"
    );
  });

  it("should replace previously listed languages", async () => {
    const test = new TestHelper({ initialLanguages: [NorthernUzbekLanguage] });
    await test.viewModel.search("en");
    expect(test.viewModel.listedLanguages.value[0].language.iso639_3_code).toBe(
      "eng"
    );
  });

  it("should not populate language list if query is one character", async () => {
    const test = new TestHelper();
    await test.viewModel.search("e");
    expect(test.viewModel.listedLanguages.value.length).toBe(0);
  });

  it("should clear results after search string is cleared", async () => {
    const test = new TestHelper();
    await test.viewModel.search("en");
    await test.viewModel.search("");
    expect(test.viewModel.listedLanguages.value.length).toBe(0);
  });

  it("should clear selected language", () => {
    const test = new TestHelper({ initialLanguages: [NorthernUzbekLanguage] });
    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    test.viewModel.searchString.requestUpdate("x");
    expect(test.viewModel.selectedLanguage.value).toBeUndefined();
  });

  it("should clear customizations", () => {
    const test = new TestHelper();
    test.viewModel.customizations.requestUpdate({ customDisplayName: "hi" });
    test.viewModel.searchString.requestUpdate("a");
    expect(test.viewModel.customizations.value).toBe(undefined);
  });

  it("should handle frequent changes in search query", async () => {
    const test = new TestHelper();
    const search1 = test.viewModel.search("s");
    const search2 = test.viewModel.search("ss");
    const search3 = test.viewModel.search("sss"); // This query should return 1 result
    await Promise.all([search1, search2, search3]);
    expect(test.viewModel.listedLanguages.value.length).toBe(1);
  });
});

describe("selected language", () => {
  it("should match language selection", () => {
    const test = new TestHelper({ initialLanguages: [NorthernUzbekLanguage] });
    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    expect(test.viewModel.selectedLanguage.value).toEqual(
      NorthernUzbekLanguage
    );
  });

  it("should be undefined after language deselected", () => {
    const test = new TestHelper({ initialLanguages: [NorthernUzbekLanguage] });

    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(false);

    expect(test.viewModel.selectedLanguage.value).toBeUndefined();
  });
});

describe("selected script", () => {
  it("should match script selection", () => {
    const test = new TestHelper({ initialLanguages: [NorthernUzbekLanguage] });

    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    test.viewModel.listedScripts.value[0].isSelected.requestUpdate(true);

    expect(test.viewModel.selectedScript.value).toEqual(
      NorthernUzbekLanguage.scripts[0]
    );
  });

  it("should be undefined after script deselected", () => {
    const test = new TestHelper({ initialLanguages: [NorthernUzbekLanguage] });

    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    test.viewModel.listedScripts.value[0].isSelected.requestUpdate(true);
    test.viewModel.listedScripts.value[0].isSelected.requestUpdate(false);

    expect(test.viewModel.selectedScript.value).toBeUndefined();
  });

  it("should be undefined after language deselected", () => {
    const test = new TestHelper({ initialLanguages: [NorthernUzbekLanguage] });

    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    test.viewModel.listedScripts.value[0].isSelected.requestUpdate(true);
    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(false);

    expect(test.viewModel.selectedScript.value).toBeUndefined();
  });

  it("should automatically be set if selected language has only one script", () => {
    const test = new TestHelper({ initialLanguages: [WaataLanguage] });

    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);

    expect(test.viewModel.selectedScript.value).toEqual(
      WaataLanguage.scripts[0]
    );
  });
});

describe("creating unlisted language", () => {
  it("should set selected language to unlisted", () => {
    const test = new TestHelper();
    test.viewModel.customizations.requestUpdate({ customDisplayName: "hi" });
    expect(test.viewModel.selectedLanguage.value).toEqual(UNLISTED_LANGUAGE);
  });

  it("should update tag preview", () => {
    const test = new TestHelper();
    test.viewModel.customizations.requestUpdate({
      customDisplayName: "hi",
      region: AndorraRegion,
      dialect: "hi",
    });
    expect(test.viewModel.tagPreview.value).toBe("qaa-AD-x-hi");
  });

  it("should update display name", () => {
    const test = new TestHelper();
    test.viewModel.customizations.requestUpdate({
      customDisplayName: "hi",
      region: AndorraRegion,
      dialect: "hi",
    });
    expect(test.viewModel.displayName.value).toBe("hi");
  });
});

describe("customize selected language", () => {
  it("should not change selected language", () => {
    const test = new TestHelper({ initialLanguages: [NorthernUzbekLanguage] });
    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    test.viewModel.customizations.requestUpdate({ customDisplayName: "hi" });
    expect(test.viewModel.selectedLanguage.value).toEqual(
      NorthernUzbekLanguage
    );
  });
});

describe("custom language tag", () => {
  it("clears search string", () => {
    const test = new TestHelper();
    test.viewModel.searchString.requestUpdate("b");
    test.viewModel.customLanguageTag.requestUpdate("uz-AF");
    expect(test.viewModel.searchString.value).toBe("");
  });

  it("clears listed languages", () => {
    const test = new TestHelper({ initialLanguages: [NorthernUzbekLanguage] });
    test.viewModel.customLanguageTag.requestUpdate("uz-AF");
    expect(test.viewModel.listedLanguages.value.length).toBe(0);
  });

  it("sets tag preview", () => {
    const test = new TestHelper();
    test.viewModel.customLanguageTag.requestUpdate("abc");
    expect(test.viewModel.tagPreview.value).toBe("abc");
  });

  it("sets iso code for selected language", () => {
    const test = new TestHelper();
    test.viewModel.customLanguageTag.requestUpdate("abc");
    expect(test.viewModel.selectedLanguage.value?.iso639_3_code).toBe(
      "manuallyEnteredTag"
    );
  });

  it("clears selected script", () => {
    const test = new TestHelper({ initialLanguages: [NorthernUzbekLanguage] });

    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    test.viewModel.listedScripts.value[0].isSelected.requestUpdate(true);
    test.viewModel.customLanguageTag.requestUpdate("abc");

    expect(test.viewModel.selectedScript.value).toBeUndefined();
  });

  it("is cleared when search string changes", () => {
    const test = new TestHelper();
    test.viewModel.customLanguageTag.requestUpdate("abc");
    test.viewModel.searchString.requestUpdate("x");
    expect(test.viewModel.customLanguageTag.value).toBe("");
  });
});

describe("is ready to submit", () => {
  it("is true when language with one script is selected", () => {
    const test = new TestHelper({ initialLanguages: [WaataLanguage] });
    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    expect(test.viewModel.isReadyToSubmit.value).toBe(true);
  });

  it("is true when a language and script script are selected", () => {
    const test = new TestHelper({ initialLanguages: [NorthernUzbekLanguage] });
    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    test.viewModel.listedScripts.value[0].isSelected.requestUpdate(true);
    expect(test.viewModel.isReadyToSubmit.value).toBe(true);
  });

  it("is false when display name is whitespace", () => {
    const test = new TestHelper({ initialLanguages: [WaataLanguage] });
    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    test.viewModel.displayName.requestUpdate("   ");
    expect(test.viewModel.isReadyToSubmit.value).toBe(false);
  });

  it("is false when a language is deselected", () => {
    const test = new TestHelper({ initialLanguages: [WaataLanguage] });
    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(false);
    expect(test.viewModel.isReadyToSubmit.value).toBe(false);
  });

  it("is false when a script is deselected", () => {
    const test = new TestHelper({ initialLanguages: [NorthernUzbekLanguage] });
    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    test.viewModel.listedScripts.value[0].isSelected.requestUpdate(true);
    test.viewModel.listedScripts.value[0].isSelected.requestUpdate(false);
    expect(test.viewModel.isReadyToSubmit.value).toBe(false);
  });

  it("is true when an unlisted language has name and country", () => {
    const test = new TestHelper({ initialLanguages: [WaataLanguage] });
    test.viewModel.customizations.requestUpdate({
      customDisplayName: "hi",
      region: AndorraRegion,
      dialect: "hi",
    });
    expect(test.viewModel.isReadyToSubmit.value).toBe(true);
  });

  it("is true when custom language tag is valid", () => {
    const test = new TestHelper();
    test.viewModel.customLanguageTag.requestUpdate("abc");
    test.viewModel.displayName.requestUpdate("hello");
    expect(test.viewModel.isReadyToSubmit.value).toBe(true);
  });
});

describe("unlisted language modal", () => {
  it("opens on customize button clicked when no language is selected", () => {
    const t = new TestHelper();
    const spy = vi.fn();
    t.viewModel.showUnlistedLanguageModal.requestUpdate(spy);
    t.viewModel.onCustomizeButtonClicked();
    expect(spy).toHaveBeenCalledWith({});
  });

  it("sets language to unlisted language on submit", () => {
    const t = new TestHelper();
    t.viewModel.submitUnlistedLanguageModal({
      name: "hello",
      region: AndorraRegion,
    });
    expect(t.viewModel.selectedLanguage.value).toEqual(UNLISTED_LANGUAGE);
  });

  it("sets display name on submit", () => {
    const t = new TestHelper();
    t.viewModel.submitUnlistedLanguageModal({
      name: "hello",
      region: AndorraRegion,
    });
    expect(t.viewModel.displayName.value).toBe("hello");
  });

  it("sets dialect on submit", () => {
    const t = new TestHelper();
    t.viewModel.submitUnlistedLanguageModal({
      name: "hello",
      region: AndorraRegion,
    });
    expect(t.viewModel.customizations.value?.dialect).toBe("hello");
  });

  it("sets region on submit", () => {
    const t = new TestHelper();
    t.viewModel.submitUnlistedLanguageModal({
      name: "hello",
      region: AndorraRegion,
    });
    expect(t.viewModel.customizations.value?.region).toEqual(AndorraRegion);
  });

  it("opens on customize button clicked when unlisted language is selected", () => {
    const t = new TestHelper();
    const spy = vi.fn();
    t.viewModel.showUnlistedLanguageModal.requestUpdate(spy);
    t.viewModel.submitUnlistedLanguageModal({
      name: "hello",
      region: AndorraRegion,
    });
    t.viewModel.onCustomizeButtonClicked();
    expect(spy).toHaveBeenCalledWith({ name: "hello", region: AndorraRegion });
  });
});

describe("customize language modal", () => {
  it("opens customize language modal when a language is selected", () => {
    const t = new TestHelper({ initialLanguages: [NorthernUzbekLanguage] });
    const spy = vi.fn();
    t.viewModel.showCustomizeLanguageModal.requestUpdate(spy);

    t.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    t.viewModel.onCustomizeButtonClicked();

    expect(spy).toHaveBeenCalledWith({});
  });

  it("populates script when a script is selected", () => {
    const t = new TestHelper({ initialLanguages: [NorthernUzbekLanguage] });
    const spy = vi.fn();
    t.viewModel.showCustomizeLanguageModal.requestUpdate(spy);

    t.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    const scriptViewModel = t.viewModel.listedScripts.value[0];
    scriptViewModel.isSelected.requestUpdate(true);
    t.viewModel.onCustomizeButtonClicked();

    expect(spy).toHaveBeenCalledWith({ script: scriptViewModel.script });
  });

  it("populates with dialect when custom dialect was selected", () => {
    const t = new TestHelper({ initialLanguageCount: 2 });
    t.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);

    t.viewModel.submitCustomizeLanguageModal({
      dialect: "hello",
    });

    const spy = vi.fn();
    t.viewModel.showCustomizeLanguageModal.requestUpdate(spy);
    t.viewModel.onCustomizeButtonClicked();

    expect(spy).toHaveBeenCalledWith({ dialect: "hello" });
  });

  it("populates with region when custom dialect was selected", () => {
    const t = new TestHelper({ initialLanguageCount: 2 });
    t.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);

    t.viewModel.submitCustomizeLanguageModal({
      region: AndorraRegion,
    });

    const spy = vi.fn();
    t.viewModel.showCustomizeLanguageModal.requestUpdate(spy);
    t.viewModel.onCustomizeButtonClicked();

    expect(spy).toHaveBeenCalledWith({ region: AndorraRegion });
  });

  it("resets when a new language is selected", () => {
    const t = new TestHelper({ initialLanguageCount: 2 });
    t.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);

    t.viewModel.submitCustomizeLanguageModal({
      dialect: "hello",
    });
    t.viewModel.listedLanguages.value[1].isSelected.requestUpdate(true);

    const spy = vi.fn();
    t.viewModel.showCustomizeLanguageModal.requestUpdate(spy);
    t.viewModel.onCustomizeButtonClicked();

    expect(spy).toHaveBeenCalledWith({});
  });

  it("sets customizations on submit", () => {
    const t = new TestHelper({ initialLanguages: [NorthernUzbekLanguage] });
    t.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    t.viewModel.displayName.requestUpdate("mylang");

    t.viewModel.submitCustomizeLanguageModal({
      region: AndorraRegion,
      dialect: "abc",
    });

    expect(t.viewModel.customizations.value).toEqual({
      customDisplayName: "mylang",
      dialect: "abc",
      region: AndorraRegion,
    });
  });

  it("sets script on submit", () => {
    const t = new TestHelper({ initialLanguages: [NorthernUzbekLanguage] });
    t.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);

    t.viewModel.submitCustomizeLanguageModal({
      script: {
        code: "abc",
        name: "ABC Script",
      },
    });

    expect(t.viewModel.selectedScript.value).toEqual({
      code: "abc",
      name: "ABC Script",
    });
  });
});

describe("edit custom tag prompt", () => {
  it("shows when custom tag exists and customization button is clicked", () => {
    const t = new TestHelper();
    const spy = vi.fn();
    t.viewModel.customLanguageTag.requestUpdate("abc");
    t.viewModel.promptForCustomTag.requestUpdate(spy);
    t.viewModel.onCustomizeButtonClicked();
    expect(spy).toHaveBeenCalledWith("abc");
  });
});
