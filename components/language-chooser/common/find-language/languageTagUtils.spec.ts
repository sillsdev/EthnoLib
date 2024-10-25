import { expect, it, describe } from "vitest";
import {
  createTag,
  getMaximalLangtag,
  getShortestSufficientLangtag,
} from "./languageTagUtils";

describe("Tag creation", () => {
  it("should create the correct language tag for a language", () => {
    expect(createTag({ languageCode: "eng" })).toEqual("eng");
    expect(
      createTag({
        regionCode: "US",
        dialectCode: "foobar",
        languageCode: "eng",
        scriptCode: "Latn",
      })
    ).toEqual("eng-Latn-US-x-foobar");
  });
  expect(createTag({ languageCode: "eng", dialectCode: "foobar" })).toEqual(
    "eng-x-foobar"
  );
  expect(createTag({ languageCode: "eng", regionCode: "IN" })).toEqual(
    "eng-IN"
  );

  it("should create qaa-x-dialect tag if no language tag is provided", () => {
    expect(createTag({ dialectCode: "foobar" })).toEqual("qaa-x-foobar");
    // we are currently not adding script to qaa tags, though I'm not sure if we will always want this behavior
    expect(
      createTag({ dialectCode: "foobar", scriptCode: "Latn", regionCode: "US" })
    ).toEqual("qaa-Latn-US-x-foobar");
  });
});

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
  it("should be case insensitive", () => {
    expect(getShortestSufficientLangtag("fRm")).toEqual("frm");
    expect(getShortestSufficientLangtag("FRM-LaTn")).toEqual("frm");
  });
});

describe("get maximal equivalent version of langtag", () => {
  it("should return the maximal tag if it exists", () => {
    expect(getMaximalLangtag("dtp-Latn-MY")).toEqual("dtp-Latn-MY");
    expect(getMaximalLangtag("dtp")).toEqual("dtp-Latn-MY");
    expect(getMaximalLangtag("ktr")).toEqual("dtp-Latn-MY");
    expect(getMaximalLangtag("kzt-MY")).toEqual("dtp-Latn-MY");
    expect(
      getMaximalLangtag(
        createTag({ languageCode: "dtp", regionCode: "MY", scriptCode: "Latn" })
      )
    ).toEqual("dtp-Latn-MY");
    expect(
      getMaximalLangtag(createTag({ languageCode: "dtp", scriptCode: "Latn" }))
    ).toEqual("dtp-Latn-MY");
    expect(
      getMaximalLangtag(createTag({ languageCode: "dtp", regionCode: "MY" }))
    ).toEqual("dtp-Latn-MY");
    expect(getMaximalLangtag(createTag({ languageCode: "dtp" }))).toEqual(
      "dtp-Latn-MY"
    );
  });
  it("should be case insensitive", () => {
    expect(getMaximalLangtag("DTP-Latn-My")).toEqual("dtp-Latn-MY");
    expect(getMaximalLangtag("DtP")).toEqual("dtp-Latn-MY");
  });
});
