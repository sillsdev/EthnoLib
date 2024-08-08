import { expect, it, describe } from "vitest";
import { createTag } from "./languageTagUtils";

describe("Language tag utils", () => {
  it("should create the correct language tag for a language", () => {
    expect(createTag({ languageCode: "eng" })).toEqual("eng");
    expect(
      createTag({
        regionCode: "US",
        dialectCode: "foobar",
        languageCode: "eng",
        scriptCode: "Latn",
      })
    ).toEqual("eng-Latn-US-foobar");
  });
  expect(createTag({ languageCode: "eng", dialectCode: "foobar" })).toEqual(
    "eng-foobar"
  );
  expect(createTag({ languageCode: "eng", regionCode: "IN" })).toEqual(
    "eng-IN"
  );
  it("should create qaa-x-dialect tag if no language tag is provided", () => {
    expect(createTag({ dialectCode: "foobar" })).toEqual("qaa-x-foobar");
    // we are currently not adding script or region to qaa tags, though I'm not sure if we will always want this behavior
    expect(
      createTag({ dialectCode: "foobar", scriptCode: "Latn", regionCode: "US" })
    ).toEqual("qaa-x-foobar");
  });
});
