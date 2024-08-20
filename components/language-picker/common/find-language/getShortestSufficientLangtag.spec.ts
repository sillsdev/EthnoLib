import { expect, it, describe } from "vitest";
import { getShortestSufficientLangtag } from "./getShortestSufficientLangtag";
import { createTag } from "./languageTagUtils";

describe("get shortest equivalent version of langtag", () => {
  it("should return the shortest tag if it exists", () => {
    expect(getShortestSufficientLangtag("en")).toEqual("en");
    expect(
      getShortestSufficientLangtag(createTag({ languageCode: "frm" }))
    ).toEqual("frm");
    expect(
      getShortestSufficientLangtag(
        createTag({ languageCode: "frm", scriptCode: "Latn", regionCode: "FR" })
      )
    ).toEqual("frm");
    expect(
      getShortestSufficientLangtag(
        createTag({ languageCode: "frm", regionCode: "FR" })
      )
    ).toEqual("frm");
    expect(
      getShortestSufficientLangtag(
        createTag({ languageCode: "frm", scriptCode: "Latn" })
      )
    ).toEqual("frm");
  });
});
