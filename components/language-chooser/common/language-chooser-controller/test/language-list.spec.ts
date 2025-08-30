import { describe, expect, it } from "vitest";
import { ILanguage } from "@ethnolib/find-language";
import { fakeLanguages } from "./fake-utils";
import { LanguageListViewModel } from "../src/view-models/language-list";

interface TestParameters {
  languages: ILanguage[];
}

class TestObjects {
  constructor({ languages }: TestParameters) {
    this.listController = new LanguageListViewModel(languages);
  }

  listController: LanguageListViewModel;
}

describe("selecting a language", () => {
  it("marks language as selected", () => {
    const test = new TestObjects({ languages: fakeLanguages(2) });
    const lang = test.listController.languageCards[0];

    lang.isSelected.requestUpdate(true);

    expect(lang.isSelected.value).toBe(true);
  });

  it("should deselect other language", () => {
    const test = new TestObjects({ languages: fakeLanguages(2) });
    const lang1 = test.listController.languageCards[0];
    const lang2 = test.listController.languageCards[1];

    lang1.isSelected.requestUpdate(true);
    lang2.isSelected.requestUpdate(true);

    expect(lang1.isSelected.value).toBe(false);
  });
});

describe("deselecting a langauge", () => {
  it("should mark language deselected", () => {
    const test = new TestObjects({ languages: fakeLanguages(2) });
    const lang = test.listController.languageCards[0];

    lang.isSelected.requestUpdate(true);
    lang.isSelected.requestUpdate(false);

    expect(lang.isSelected.value).toBe(false);
  });
});
