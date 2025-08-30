import { describe, expect, it } from "vitest";
import { fakeLanguage } from "./fake-utils";
import { LanguageCardViewModel } from "../src/view-models/language-card";

interface TestParams {
  scriptCount?: number;
}

class TestObjects {
  constructor({ scriptCount }: TestParams = {}) {
    this.cardController = new LanguageCardViewModel(
      fakeLanguage({ scriptCount })
    );
  }

  cardController: LanguageCardViewModel;
}

describe("language card id", () => {
  it("different instance have different ids", () => {
    const card1 = new LanguageCardViewModel(fakeLanguage());
    const card2 = new LanguageCardViewModel(fakeLanguage());
    expect(card1.id === card2.id).toBe(false);
  });
});

describe("selecting a script", () => {
  it("marks script as selected", () => {
    const test = new TestObjects({ scriptCount: 1 });
    const script = test.cardController.scripts[0];

    script.isSelected.requestUpdate(true);

    expect(script.isSelected.value).toBe(true);
  });

  it("deselects other scripts", () => {
    const test = new TestObjects({ scriptCount: 2 });
    const script1 = test.cardController.scripts[0];
    const script2 = test.cardController.scripts[1];

    script1.isSelected.requestUpdate(true);
    script2.isSelected.requestUpdate(true);

    expect(script1.isSelected.value).toBe(false);
  });
});

describe("deselecting a script", () => {
  it("marks script as desected", () => {
    const test = new TestObjects({ scriptCount: 1 });
    const script = test.cardController.scripts[0];

    script.isSelected.requestUpdate(true);
    script.isSelected.requestUpdate(false);

    expect(script.isSelected.value).toBe(false);
  });
});
