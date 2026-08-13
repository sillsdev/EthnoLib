import { describe, expect, it } from "vitest";
import {
  chooseSampleText,
  editedSampleText,
  sampleTextSourceLabel,
} from "./sampleText";

const GFLANGUAGES = {
  text: "real writing",
  source: "Google Fonts language data",
  sourceUrl: "https://github.com/googlefonts/lang",
};

describe("chooseSampleText", () => {
  it("prefers what the user typed over everything else", () => {
    expect(
      chooseSampleText({
        custom: "my own words",
        languageSample: GFLANGUAGES,
        inventedText: "nonsense",
      })
    ).toEqual({ text: "my own words", source: "custom" });
  });

  it("keeps the user's text exactly as typed", () => {
    expect(chooseSampleText({ custom: "  spaced  out  " })?.text).toBe(
      "  spaced  out  "
    );
  });

  it("treats a whitespace-only custom text as no custom text", () => {
    expect(
      chooseSampleText({ custom: "   \n  ", languageSample: GFLANGUAGES })
    ).toEqual({
      text: "real writing",
      source: "language",
      sourceName: "Google Fonts language data",
      sourceUrl: "https://github.com/googlefonts/lang",
    });
  });

  it("takes the first non-empty line of the language's writing", () => {
    expect(
      chooseSampleText({
        languageSample: {
          ...GFLANGUAGES,
          text: "\n   \n  first line  \nsecond line",
        },
      })?.text
    ).toBe("first line");
  });

  it("carries the data set's name through to the choice", () => {
    expect(chooseSampleText({ languageSample: GFLANGUAGES })?.sourceName).toBe(
      "Google Fonts language data"
    );
  });

  it("falls back to the made-up text", () => {
    expect(chooseSampleText({ inventedText: "ba da ka" })).toEqual({
      text: "ba da ka",
      source: "invented",
    });
  });

  it("has nothing to show when every source is empty", () => {
    expect(chooseSampleText({})).toBeUndefined();
    expect(
      chooseSampleText({
        custom: "",
        languageSample: { ...GFLANGUAGES, text: "\n \n" },
        inventedText: "",
      })
    ).toBeUndefined();
  });
});

describe("editedSampleText", () => {
  it("keeps what the user typed", () => {
    expect(editedSampleText("something")).toBe("something");
  });

  it("gives back nothing once the user has cleared the box", () => {
    // The point of the rule: with nothing remembered, the next sample comes from
    // the language or the alphabet again rather than staying blank.
    expect(editedSampleText("")).toBeUndefined();
    expect(editedSampleText("   \n\t ")).toBeUndefined();
  });

  it("round-trips a cleared box back to the default", () => {
    const custom = editedSampleText("");
    const chosen = chooseSampleText({ custom, languageSample: GFLANGUAGES });
    expect(chosen?.text).toBe("real writing");
    expect(chosen?.source).toBe("language");
  });
});

describe("sampleTextSourceLabel", () => {
  it("names each source", () => {
    expect(sampleTextSourceLabel({ text: "x", source: "custom" })).toBe(
      "(Custom)"
    );
    expect(sampleTextSourceLabel({ text: "x", source: "invented" })).toBe(
      "(Lorem Ipsum style)"
    );
  });

  it("names the data set real writing came from", () => {
    // The whole point of the stage: the heading tells the user where the words
    // they are looking at came from, not merely that they are "in your language".
    expect(
      sampleTextSourceLabel(chooseSampleText({ languageSample: GFLANGUAGES })!)
    ).toBe("(Google Fonts language data)");
  });
});
