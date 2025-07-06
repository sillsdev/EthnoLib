import { describe, expect, it } from "vitest";
import { LanguageCardController } from "../src/language-card";
import { fakeLanguage } from "./fake-utils";
import { ScriptCardObserverFake } from "../src/script-card";

interface TestParams {
  scriptCount?: number;
}

class TestObjects {
  constructor({ scriptCount }: TestParams = {}) {
    this.cardController = new LanguageCardController(
      fakeLanguage({ scriptCount })
    );
    this.scriptControllers = this.cardController.scripts.map((script) => {
      const observer = new ScriptCardObserverFake();
      script.observer = observer;
      return observer;
    });
  }

  cardController: LanguageCardController;
  scriptControllers: ScriptCardObserverFake[];
}

describe("selecting a script", () => {
  it("marks observer as selected", () => {
    const test = new TestObjects({ scriptCount: 1 });
    test.cardController.scripts[0].toggleSelect();
    expect(test.scriptControllers[0].isSelected).toBe(true);
  });

  it("deselects other scripts", () => {
    const test = new TestObjects({ scriptCount: 2 });
    test.cardController.scripts[0].toggleSelect();
    test.cardController.scripts[1].toggleSelect();
    expect(test.scriptControllers[0].isSelected).toBe(false);
  });
});

describe("deselecting a script", () => {
  it("marks observer as desected", () => {
    const test = new TestObjects({ scriptCount: 1 });
    test.cardController.scripts[0].toggleSelect();
    test.cardController.scripts[0].toggleSelect();
    expect(test.scriptControllers[0].isSelected).toBe(false);
  });
});
