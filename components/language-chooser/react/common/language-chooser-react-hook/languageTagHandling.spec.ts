import { expect, it, describe } from "vitest";
import { parseLangtagForLangChooser } from "./languageTagHandling";
import { getRegionBySubtag } from "@ethnolib/find-language";
describe("Tag parsing", () => {
  it("should find a language by 2 letter language subtag", () => {
    expect(parseLangtagForLangChooser("ja")?.language?.exonym).toEqual(
      "Japanese"
    );
  });
  it("should return undefined if no language found", () => {
    expect(parseLangtagForLangChooser("")).toBeUndefined();
    expect(parseLangtagForLangChooser("thisistoolong")).toBeUndefined();
    expect(parseLangtagForLangChooser("xxx")).toBeUndefined();
  });
  it("should find a region by its tag", () => {
    expect(
      parseLangtagForLangChooser("sqa-Latn-NG")?.customDetails?.region?.name
    ).toEqual("Nigeria");
  });
  it("should not return a region if the tag does not contain an explicit and valid region code", () => {
    expect(parseLangtagForLangChooser("en-Latn")).toBeTruthy();
    expect(
      parseLangtagForLangChooser("en-Latn")?.customDetails?.region
    ).toBeUndefined();
    // ZZ should be an invalid region code:
    expect(getRegionBySubtag("ZZ")).toBeUndefined();
    expect(
      parseLangtagForLangChooser("en-Latn-ZZ")?.customDetails?.region
    ).toBeUndefined();
    expect(
      parseLangtagForLangChooser("ssh-Arab")?.customDetails?.region
    ).toBeUndefined();
  });
  it("should find a script by its tag", () => {
    expect(parseLangtagForLangChooser("uz-Sogd")?.script?.name).toEqual(
      "Sogdian"
    );
  });
  it("should find valid information even if script, region or dialect is not typically associated with that language", () => {
    const result = parseLangtagForLangChooser("ixl-Cyrl-JP-x-foobar"); // Ixil (normally latin script, guatemala region)
    expect(result?.language?.exonym).toEqual("Ixil");
    expect(result?.script?.name).toEqual("Cyrillic");
    expect(result?.customDetails?.region?.name).toEqual("Japan");
  });

  it("should find the correct implied scripts", () => {
    expect(parseLangtagForLangChooser("uz")?.script?.name).toEqual("Latin");
    expect(parseLangtagForLangChooser("uz-x-barfoo")?.script?.name).toEqual(
      "Latin"
    );
    expect(parseLangtagForLangChooser("uz-AF")?.script?.name).toEqual("Arabic");
    expect(parseLangtagForLangChooser("uz-AF-x-foobar")?.script?.name).toEqual(
      "Arabic"
    );
  });

  it("should put private use subtags into dialect field", () => {
    expect(
      parseLangtagForLangChooser("en-Latn-x-foo")?.customDetails?.dialect
    ).toEqual("foo");
  });
  it("should be case insensitive", () => {
    const result = parseLangtagForLangChooser("uZb-CyRl-aF");
    expect(result?.language?.exonym).toEqual("Uzbek");
    expect(result?.script?.name).toEqual("Cyrillic");
    expect(result?.customDetails?.region?.name).toEqual("Afghanistan");
  });
  it("should work for all combos of present and absent subtags", () => {
    // ssh, ssh-Arab, ssh-AE, ssh-x-foobar, ssh-Arab-AE, ssh-Arab-x-foobar, ssh-AE-x-foobar, ssh-Arab-AE-x-foobar
    const ssh_result = parseLangtagForLangChooser("ssh");
    expect(ssh_result?.language?.exonym).toEqual("Shihhi Arabic");
    expect(ssh_result?.script?.name).toEqual("Arabic");
    expect(ssh_result?.customDetails?.region?.name).toBeUndefined();
    expect(ssh_result?.customDetails?.dialect).toBeUndefined();

    const ssh_Arab_result = parseLangtagForLangChooser("ssh-Arab");
    expect(ssh_Arab_result?.language?.exonym).toEqual("Shihhi Arabic");
    expect(ssh_Arab_result?.script?.name).toEqual("Arabic");
    expect(ssh_Arab_result?.customDetails?.region?.name).toBeUndefined();
    expect(ssh_Arab_result?.customDetails?.dialect).toBeUndefined();

    const ssh_AE_result = parseLangtagForLangChooser("ssh-AE");
    expect(ssh_AE_result?.language?.exonym).toEqual("Shihhi Arabic");
    expect(ssh_AE_result?.script?.name).toEqual("Arabic");
    expect(ssh_AE_result?.customDetails?.region?.name).toEqual(
      "United Arab Emirates"
    );
    expect(ssh_AE_result?.customDetails?.dialect).toBeUndefined();

    const ssh_x_foobar_result = parseLangtagForLangChooser("ssh-x-foobar");
    expect(ssh_x_foobar_result?.language?.exonym).toEqual("Shihhi Arabic");
    expect(ssh_x_foobar_result?.script?.name).toEqual("Arabic");
    expect(ssh_x_foobar_result?.customDetails?.region?.name).toBeUndefined();
    expect(ssh_x_foobar_result?.customDetails?.dialect).toEqual("foobar");

    const ssh_Arab_AE_result = parseLangtagForLangChooser("ssh-Arab-AE");
    expect(ssh_Arab_AE_result?.language?.exonym).toEqual("Shihhi Arabic");
    expect(ssh_Arab_AE_result?.script?.name).toEqual("Arabic");
    expect(ssh_Arab_AE_result?.customDetails?.region?.name).toEqual(
      "United Arab Emirates"
    );
    expect(ssh_Arab_AE_result?.customDetails?.dialect).toBeUndefined();

    const ssh_Arab_x_foobar_result =
      parseLangtagForLangChooser("ssh-Arab-x-foobar");
    expect(ssh_Arab_x_foobar_result?.language?.exonym).toEqual("Shihhi Arabic");
    expect(ssh_Arab_x_foobar_result?.script?.name).toEqual("Arabic");
    expect(
      ssh_Arab_x_foobar_result?.customDetails?.region?.name
    ).toBeUndefined();
    expect(ssh_Arab_x_foobar_result?.customDetails?.dialect).toEqual("foobar");
  });

  const ssh_AE_x_foobar_result = parseLangtagForLangChooser("ssh-AE-x-foobar");
  expect(ssh_AE_x_foobar_result?.language?.exonym).toEqual("Shihhi Arabic");
  expect(ssh_AE_x_foobar_result?.script?.name).toEqual("Arabic");
  expect(ssh_AE_x_foobar_result?.customDetails?.region?.name).toEqual(
    "United Arab Emirates"
  );
  expect(ssh_AE_x_foobar_result?.customDetails?.dialect).toEqual("foobar");

  const ssh_Arab_AE_x_foobar_result = parseLangtagForLangChooser(
    "ssh-Arab-AE-x-foobar"
  );
  expect(ssh_Arab_AE_x_foobar_result?.language?.exonym).toEqual(
    "Shihhi Arabic"
  );
  expect(ssh_Arab_AE_x_foobar_result?.script?.name).toEqual("Arabic");
  expect(ssh_Arab_AE_x_foobar_result?.customDetails?.region?.name).toEqual(
    "United Arab Emirates"
  );
  expect(ssh_Arab_AE_x_foobar_result?.customDetails?.dialect).toEqual("foobar");
});
