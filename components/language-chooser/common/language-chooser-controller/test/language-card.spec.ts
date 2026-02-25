import { describe, expect, it } from "vitest";
import {
  LanguageCardViewModel,
  useLanguageCardViewModel,
} from "../src/view-models/language-card";
import { NorthernUzbekLanguage } from "./sample-data/languages";
import { fakeLanguage } from "./fake-utils";
import { ILanguage } from "@ethnolib/find-language";

class TestHelper {
  constructor(language: ILanguage) {
    this.card = useLanguageCardViewModel(language);
  }
  card: LanguageCardViewModel;
}

describe("title", () => {
  it("should equal autonym if present", () => {
    const t = new TestHelper(NorthernUzbekLanguage);
    expect(t.card.title).toEqual(NorthernUzbekLanguage.autonym);
  });

  it("should equal exonym if autonym is missing", () => {
    const lang = fakeLanguage();
    lang.autonym = undefined;
    lang.exonym = "hello";
    const t = new TestHelper(lang);
    expect(t.card.title).toBe("hello");
  });
});

describe("second title", () => {
  it("should equal exonym if unique from autonym", () => {
    const t = new TestHelper(NorthernUzbekLanguage);
    expect(t.card.secondTitle).toEqual(NorthernUzbekLanguage.exonym);
  });

  it("should be undefined if autonym is missing", () => {
    const lang = fakeLanguage();
    lang.autonym = undefined;
    lang.exonym = "hello";
    const t = new TestHelper(lang);
    expect(t.card.secondTitle).toBeUndefined();
  });

  it("should be undefined if exonym equals autonym", () => {
    const lang = fakeLanguage();
    lang.autonym = "hello";
    lang.exonym = "hello";
    const t = new TestHelper(lang);
    expect(t.card.secondTitle).toBeUndefined();
  });
});

describe("description", () => {
  it("should designate a macrolanguage of a region", () => {
    const lang = fakeLanguage();
    lang.isMacrolanguage = true;
    lang.regionNamesForDisplay = "Spain";
    const t = new TestHelper(lang);
    expect(t.card.description()).toBe("A macrolanguage of Spain");
  });

  it("should designate a macrolanguage without a region", () => {
    const lang = fakeLanguage();
    lang.isMacrolanguage = true;
    lang.regionNamesForDisplay = "";
    const t = new TestHelper(lang);
    expect(t.card.description()).toBe("A macrolanguage");
  });

  it("should designate specific language with region", () => {
    const lang = fakeLanguage();
    lang.isMacrolanguage = false;
    lang.regionNamesForDisplay = "Spain";
    const t = new TestHelper(lang);
    expect(t.card.description()).toBe("A language of Spain");
  });

  it("should be undefined if specific language has no region", () => {
    const lang = fakeLanguage();
    lang.isMacrolanguage = false;
    lang.regionNamesForDisplay = "";
    const t = new TestHelper(lang);
    expect(t.card.description()).toBeUndefined();
  });
});
