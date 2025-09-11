import { describe, expect, it } from "vitest";
import { fakeLanguage } from "./fake-utils";
import { LanguageCardViewModel } from "../src/view-models/language-card";

describe("language card id", () => {
  it("different instance have different ids", () => {
    const card1 = new LanguageCardViewModel(fakeLanguage());
    const card2 = new LanguageCardViewModel(fakeLanguage());
    expect(card1.id === card2.id).toBe(false);
  });
});
