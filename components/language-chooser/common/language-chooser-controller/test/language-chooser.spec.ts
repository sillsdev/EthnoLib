import { describe, expect, it } from "vitest";
import { LanguageChooserViewModel } from "../src/view-models/language-chooser";
import { fakeLanguage } from "./fake-utils";
import { ILanguage, UNLISTED_LANGUAGE } from "@ethnolib/find-language";
import { NorthernUzbekLanguage, WaataLanguage } from "./sample-data/languages";
import { AndorraRegion } from "./sample-data/regions";

class TestParams {
  initialLanguages?: ILanguage[];
  initialLanguageCount?: number;
}

class TestHeper {
  constructor({ initialLanguages, initialLanguageCount }: TestParams = {}) {
    const langs =
      initialLanguages ??
      (initialLanguageCount
        ? Array.from({ length: initialLanguageCount }, () => fakeLanguage())
        : undefined);

    this.viewModel = new LanguageChooserViewModel({ initialLanguages: langs });
  }

  viewModel: LanguageChooserViewModel;
}

describe("language list", () => {
  it("is empty by defalut", () => {
    const test = new TestHeper();
    expect(test.viewModel.listedLanguages.value.length).toBe(0);
  });

  it("can be initialized", () => {
    const test = new TestHeper({ initialLanguageCount: 3 });
    expect(test.viewModel.listedLanguages.value.length).toBe(3);
  });
});

describe("selecting a language", () => {
  it("deselects other languages", () => {
    const test = new TestHeper({ initialLanguageCount: 3 });
    const lang1 = test.viewModel.listedLanguages.value[0];
    const lang2 = test.viewModel.listedLanguages.value[1];

    lang1.isSelected.requestUpdate(true);
    lang2.isSelected.requestUpdate(true);

    expect(lang1.isSelected.value).toBe(false);
  });

  it("resets customizations", () => {
    const test = new TestHeper({ initialLanguageCount: 1 });
    test.viewModel.customizations.requestUpdate({ customDisplayName: "hi" });
    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    expect(test.viewModel.customizations.value).toBe(undefined);
  });
});

describe("script list", () => {
  it("is initially empty", () => {
    const test = new TestHeper();
    expect(test.viewModel.listedScripts.value.length).toBe(0);
  });

  it("is populated when a language with scripts is selected", () => {
    const test = new TestHeper({
      initialLanguages: [fakeLanguage({ scriptCount: 3 })],
    });

    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);

    expect(test.viewModel.listedScripts.value.length).toBe(3);
  });

  it("allows only one selected item", () => {
    const test = new TestHeper({
      initialLanguages: [fakeLanguage({ scriptCount: 3 })],
    });

    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    test.viewModel.listedScripts.value[0].isSelected.requestUpdate(true);
    test.viewModel.listedScripts.value[1].isSelected.requestUpdate(true);

    expect(test.viewModel.listedScripts.value[0].isSelected.value).toBe(false);
  });

  it("should be empty if selected language has only one script", () => {
    const test = new TestHeper({ initialLanguages: [WaataLanguage] });

    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);

    expect(test.viewModel.listedScripts.value.length).toBe(0);
  });

  it("should be cleared if selected language has only one script", () => {
    const test = new TestHeper({
      initialLanguages: [NorthernUzbekLanguage, WaataLanguage],
    });

    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    test.viewModel.listedLanguages.value[1].isSelected.requestUpdate(true);

    expect(test.viewModel.listedScripts.value.length).toBe(0);
  });
});

describe("tag preview", () => {
  it("should initially be qaa-x-", () => {
    const test = new TestHeper();
    expect(test.viewModel.tagPreview.value).toBe("qaa-x-");
  });

  it("on search, should be based on search", () => {
    const test = new TestHeper();
    test.viewModel.searchString.requestUpdate("e");
    expect(test.viewModel.tagPreview.value).toBe("qaa-x-e");
  });

  it("should be based on selected language", () => {
    const test = new TestHeper({ initialLanguages: [NorthernUzbekLanguage] });

    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);

    expect(test.viewModel.tagPreview.value).toBe("uz");
  });

  it("should be based on selected language and script", () => {
    const test = new TestHeper({ initialLanguages: [NorthernUzbekLanguage] });

    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    test.viewModel.listedScripts.value[1].isSelected.requestUpdate(true);

    expect(test.viewModel.tagPreview.value).toBe("uz-AF");
  });

  it("after language selection cleared, should be based on search", () => {
    const test = new TestHeper({ initialLanguages: [NorthernUzbekLanguage] });

    test.viewModel.searchString.value = "en";
    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(false);

    expect(test.viewModel.tagPreview.value).toBe("qaa-x-en");
  });
});

describe("display name", () => {
  it("should be empty initially", () => {
    const test = new TestHeper();
    expect(test.viewModel.displayName.value).toBe("");
  });

  it("should hold default name on language selection", () => {
    const test = new TestHeper({ initialLanguages: [NorthernUzbekLanguage] });

    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);

    expect(test.viewModel.displayName.value).toBe("ўзбек тили");
  });

  it("should hold default name on script selection", () => {
    const test = new TestHeper({ initialLanguages: [NorthernUzbekLanguage] });

    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    test.viewModel.listedScripts.value[0].isSelected.requestUpdate(true);

    expect(test.viewModel.displayName.value).toBe("oʻzbek tili");
  });
});

describe("search", () => {
  it("should populate language list", async () => {
    const test = new TestHeper();
    await test.viewModel.search("en");
    expect(test.viewModel.listedLanguages.value[0].language.iso639_3_code).toBe(
      "eng"
    );
  });

  it("should replace previously listed lanaguages", async () => {
    const test = new TestHeper({ initialLanguages: [NorthernUzbekLanguage] });
    await test.viewModel.search("en");
    expect(test.viewModel.listedLanguages.value[0].language.iso639_3_code).toBe(
      "eng"
    );
  });

  it("should not populate language list if query is one character", async () => {
    const test = new TestHeper();
    await test.viewModel.search("e");
    expect(test.viewModel.listedLanguages.value.length).toBe(0);
  });

  it("should clear results after search string is cleared", async () => {
    const test = new TestHeper();
    await test.viewModel.search("en");
    await test.viewModel.search("");
    expect(test.viewModel.listedLanguages.value.length).toBe(0);
  });

  it("should clear selected language", () => {
    const test = new TestHeper({ initialLanguages: [NorthernUzbekLanguage] });
    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    test.viewModel.searchString.requestUpdate("x");
    expect(test.viewModel.selectedLanguage.value).toBeUndefined();
  });

  it("should clear customizations", () => {
    const test = new TestHeper();
    test.viewModel.customizations.requestUpdate({ customDisplayName: "hi" });
    test.viewModel.searchString.requestUpdate("a");
    expect(test.viewModel.customizations.value).toBe(undefined);
  });
});

describe("selected language", () => {
  it("should match language selection", () => {
    const test = new TestHeper({ initialLanguages: [NorthernUzbekLanguage] });
    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    expect(test.viewModel.selectedLanguage.value).toEqual(
      NorthernUzbekLanguage
    );
  });

  it("should be undefined after language deselected", () => {
    const test = new TestHeper({ initialLanguages: [NorthernUzbekLanguage] });

    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(false);

    expect(test.viewModel.selectedLanguage.value).toBeUndefined();
  });
});

describe("selected script", () => {
  it("should match scipt selection", () => {
    const test = new TestHeper({ initialLanguages: [NorthernUzbekLanguage] });

    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    test.viewModel.listedScripts.value[0].isSelected.requestUpdate(true);

    expect(test.viewModel.selectedScript.value).toEqual(
      NorthernUzbekLanguage.scripts[0]
    );
  });

  it("should be undefined after script deselected", () => {
    const test = new TestHeper({ initialLanguages: [NorthernUzbekLanguage] });

    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    test.viewModel.listedScripts.value[0].isSelected.requestUpdate(true);
    test.viewModel.listedScripts.value[0].isSelected.requestUpdate(false);

    expect(test.viewModel.selectedScript.value).toBeUndefined();
  });

  it("should be undefined after language deselected", () => {
    const test = new TestHeper({ initialLanguages: [NorthernUzbekLanguage] });

    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    test.viewModel.listedScripts.value[0].isSelected.requestUpdate(true);
    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(false);

    expect(test.viewModel.selectedScript.value).toBeUndefined();
  });

  it("should automatically be set if selected lanugage has only one script", () => {
    const test = new TestHeper({ initialLanguages: [WaataLanguage] });

    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);

    expect(test.viewModel.selectedScript.value).toEqual(
      WaataLanguage.scripts[0]
    );
  });
});

describe("creating unlisted language", () => {
  it("should set selected language to unlisted", () => {
    const test = new TestHeper();
    test.viewModel.customizations.requestUpdate({ customDisplayName: "hi" });
    expect(test.viewModel.selectedLanguage.value).toEqual(UNLISTED_LANGUAGE);
  });

  it("should update tag preview", () => {
    const test = new TestHeper();
    test.viewModel.customizations.requestUpdate({
      customDisplayName: "hi",
      region: AndorraRegion,
      dialect: "hi",
    });
    expect(test.viewModel.tagPreview.value).toBe("qaa-AD-x-hi");
  });

  it("should update display name", () => {
    const test = new TestHeper();
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
    const test = new TestHeper({ initialLanguages: [NorthernUzbekLanguage] });
    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    test.viewModel.customizations.requestUpdate({ customDisplayName: "hi" });
    expect(test.viewModel.selectedLanguage.value).toEqual(
      NorthernUzbekLanguage
    );
  });
});

describe("custom language tag", () => {
  it("clears search string", () => {
    const test = new TestHeper();
    test.viewModel.searchString.requestUpdate("b");
    test.viewModel.customLanguageTag.requestUpdate("uz-AF");
    expect(test.viewModel.searchString.value).toBe("");
  });

  it("clears listed languages", () => {
    const test = new TestHeper({ initialLanguages: [NorthernUzbekLanguage] });
    test.viewModel.customLanguageTag.requestUpdate("uz-AF");
    expect(test.viewModel.listedLanguages.value.length).toBe(0);
  });

  it("sets tag preview", () => {
    const test = new TestHeper();
    test.viewModel.customLanguageTag.requestUpdate("abc");
    expect(test.viewModel.tagPreview.value).toBe("abc");
  });

  it("sets iso code for selected language", () => {
    const test = new TestHeper();
    test.viewModel.customLanguageTag.requestUpdate("abc");
    expect(test.viewModel.selectedLanguage.value?.iso639_3_code).toBe(
      "manuallyEnteredTag"
    );
  });

  it("clears selected script", () => {
    const test = new TestHeper({ initialLanguages: [NorthernUzbekLanguage] });

    test.viewModel.listedLanguages.value[0].isSelected.requestUpdate(true);
    test.viewModel.listedScripts.value[0].isSelected.requestUpdate(true);
    test.viewModel.customLanguageTag.requestUpdate("abc");

    expect(test.viewModel.selectedScript.value).toBeUndefined();
  });
});
