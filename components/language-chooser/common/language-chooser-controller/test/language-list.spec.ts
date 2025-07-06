import { describe, expect, it } from "vitest";
import { ILanguage } from "@ethnolib/find-language";
import { LanguageListController } from "../src/language-list";
import { LanguageCardObserverFake } from "../src/language-card";
import { fakeLanguages } from "./fake-utils";

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
    test.listController.languageCards[0].toggleSelect();
    expect(test.languageCardObservers[0].isSelected).toBe(true);
  });

  it("should deselect other language", () => {
    const test = new TestObjects({ languages: fakeLanguages(2) });
    test.listController.languageCards[0].toggleSelect();
    test.listController.languageCards[1].toggleSelect();
    expect(test.languageCardObservers[0].isSelected).toBe(false);
  });
});

describe("deselecting a langauge", () => {
  it("should notify deselected card observer", () => {
    const test = new TestObjects({ languages: fakeLanguages(2) });
    test.listController.languageCards[0].toggleSelect();
    test.listController.languageCards[0].toggleSelect();
    expect(test.languageCardObservers[0].isSelected).toBe(false);
  });
});
