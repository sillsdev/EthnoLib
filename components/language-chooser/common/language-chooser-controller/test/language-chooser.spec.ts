import { describe, expect, it } from "vitest";
import { LanguageChooserViewModel } from "../src/view-models/language-chooser";
import { fakeLanguage } from "./fake-utils";
import { NorthernUzbekLanguage } from "./sample-data/languages";
import { ILanguage } from "@ethnolib/find-language";

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
});

describe("tag preview", () => {
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
});
