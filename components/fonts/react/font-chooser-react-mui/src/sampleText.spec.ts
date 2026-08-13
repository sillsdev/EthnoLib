import { describe, expect, it } from "vitest";
import {
  chooseSampleText,
  editedSampleText,
  sampleTextSourceLabel,
} from "./sampleText";

describe("chooseSampleText", () => {
  it("prefers what the user typed over everything else", () => {
    expect(
      chooseSampleText({
        custom: "my own words",
        languageText: "real writing",
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
      chooseSampleText({ custom: "   \n  ", languageText: "real writing" })
    ).toEqual({ text: "real writing", source: "language" });
  });

  it("takes the first non-empty line of the language's writing", () => {
    expect(
      chooseSampleText({ languageText: "\n   \n  first line  \nsecond line" })
    ).toEqual({ text: "first line", source: "language" });
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
      chooseSampleText({ custom: "", languageText: "\n \n", inventedText: "" })
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
    expect(
      chooseSampleText({ custom, languageText: "real writing" })
    ).toEqual({ text: "real writing", source: "language" });
  });
});

describe("sampleTextSourceLabel", () => {
  it("names each source", () => {
    expect(sampleTextSourceLabel("custom")).toBe("(Custom)");
    expect(sampleTextSourceLabel("language")).toBe("(in your language)");
    expect(sampleTextSourceLabel("invented")).toBe("(Lorem Ipsum style)");
  });
});
