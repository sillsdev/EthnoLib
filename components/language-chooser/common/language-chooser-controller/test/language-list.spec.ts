import { describe, expect, it } from "vitest";
import { ILanguage, LanguageType } from "@ethnolib/find-language";
import { LanguageListController } from "../src/language-list";
import {
  LanguageCardController,
  LanguageCardObserverFake,
} from "../src/language-card";

function fakeLanguage(): ILanguage {
  return {
    exonym: "",
    iso639_3_code: "",
    languageSubtag: "",
    regionNamesForDisplay: "",
    regionNamesForSearch: [],
    names: [],
    scripts: [],
    alternativeTags: [],
    isMacrolanguage: false,
    languageType: LanguageType.Ancient,
  };
}

function fakeLanguages(count: number): ILanguage[] {
  return Array.from({ length: count }, () => fakeLanguage());
}

interface TestParameters {
  languages: ILanguage[];
}

class TestObjects {
  constructor({ languages }: TestParameters) {
    this.listController = new LanguageListController(languages);
    this.languageCardObservers = this.listController.languageCards.map(
      (card) => {
        const observer = new LanguageCardObserverFake();
        card.observer = observer;
        return observer;
      }
    );
  }

  listController: LanguageListController;
  languageCardObservers: LanguageCardObserverFake[];
}

describe("selecting a language", () => {
  it("should notify selected card observer", () => {
    const test = new TestObjects({ languages: fakeLanguages(2) });
    test.listController.languageCards[0].select();
    expect(test.languageCardObservers[0].isSelected).toBe(true);
  });

  it("should deselect other language", () => {
    const test = new TestObjects({ languages: fakeLanguages(2) });
    test.listController.languageCards[0].select();
    test.listController.languageCards[1].select();
    expect(test.languageCardObservers[0].isSelected).toBe(false);
  });
});
