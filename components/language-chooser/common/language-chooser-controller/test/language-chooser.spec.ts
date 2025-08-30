import { describe, expect, it } from "vitest";
import { LanguageChooserViewModel } from "../src/view-models/language-chooser";
import { fakeLanguage } from "./fake-utils";
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
    expect(test.viewModel.listedLanguages.length).toBe(0);
  });

  it("can be initialized", () => {
    const test = new TestHeper({ initialLanguageCount: 3 });
    expect(test.viewModel.listedLanguages.length).toBe(3);
  });
});

describe("selecting a language", () => {
  it("deselects other languages", () => {
    const test = new TestHeper({ initialLanguageCount: 3 });
    const lang1 = test.viewModel.listedLanguages[0];
    const lang2 = test.viewModel.listedLanguages[1];

    lang1.isSelected.requestUpdate(true);
    lang2.isSelected.requestUpdate(true);

    expect(lang1.isSelected.value).toBe(false);
  });
});

describe("script list", () => {
  it("is initially empty", () => {
    const test = new TestHeper();
    expect(test.viewModel.listedScripts.length).toBe(0);
  });

  it("is populated when a language with scripts is selected", () => {
    const test = new TestHeper({
      initialLanguages: [fakeLanguage({ scriptCount: 3 })],
    });

    test.viewModel.listedLanguages[0].isSelected.requestUpdate(true);

    expect(test.viewModel.listedScripts.length).toBe(3);
  });

  it("allows only one selected item", () => {
    const test = new TestHeper({
      initialLanguages: [fakeLanguage({ scriptCount: 3 })],
    });

    test.viewModel.listedLanguages[0].isSelected.requestUpdate(true);
    test.viewModel.listedScripts[0].isSelected.requestUpdate(true);
    test.viewModel.listedScripts[1].isSelected.requestUpdate(true);

    expect(test.viewModel.listedScripts[0].isSelected.value).toBe(false);
  });
});
