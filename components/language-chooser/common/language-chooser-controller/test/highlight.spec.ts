import { describe, expect, it } from "vitest";
import { FormattedText, highlightMatches } from "../src/highlight";

describe("highlight matches", () => {
  it("returns empty text with empty input", () => {
    const result = highlightMatches("abc", "");
    const resultingText = result.map((segment) => segment.text).join();
    expect(resultingText).toBe("");
  });

  it("returns original string if no matches are found", () => {
    const result = highlightMatches("abc", "hello world");
    const expectedSegment: FormattedText = {
      text: "hello world",
      isHighlighted: false,
    };
    expect(result).toEqual([expectedSegment]);
  });

  it("highlights matches within text", () => {
    const result = highlightMatches("is", "this is a bunch of text");
    const expected: FormattedText[] = [
      {
        text: "th",
        isHighlighted: false,
      },
      {
        text: "is",
        isHighlighted: true,
      },
      {
        text: " ",
        isHighlighted: false,
      },
      {
        text: "is",
        isHighlighted: true,
      },
      {
        text: " a bunch of text",
        isHighlighted: false,
      },
    ];
    expect(result).toEqual(expected);
  });

  it("handles regex special characters in matchWith", () => {
    const result = highlightMatches(".", "hello. world. test.");
    const expected: FormattedText[] = [
      { text: "hello", isHighlighted: false },
      { text: ".", isHighlighted: true },
      { text: " world", isHighlighted: false },
      { text: ".", isHighlighted: true },
      { text: " test", isHighlighted: false },
      { text: ".", isHighlighted: true },
    ];
    expect(result).toEqual(expected);
  });

  it("handles parentheses in matchWith", () => {
    const result = highlightMatches("(test)", "before (test) after (test)");
    const expected: FormattedText[] = [
      { text: "before ", isHighlighted: false },
      { text: "(test)", isHighlighted: true },
      { text: " after ", isHighlighted: false },
      { text: "(test)", isHighlighted: true },
    ];
    expect(result).toEqual(expected);
  });

  it("handles square brackets in matchWith", () => {
    const result = highlightMatches("[abc]", "text [abc] more [abc] end");
    const expected: FormattedText[] = [
      { text: "text ", isHighlighted: false },
      { text: "[abc]", isHighlighted: true },
      { text: " more ", isHighlighted: false },
      { text: "[abc]", isHighlighted: true },
      { text: " end", isHighlighted: false },
    ];
    expect(result).toEqual(expected);
  });

  it("handles asterisk and plus in matchWith", () => {
    const result = highlightMatches("a*b+c", "start a*b+c end a*b+c");
    const expected: FormattedText[] = [
      { text: "start ", isHighlighted: false },
      { text: "a*b+c", isHighlighted: true },
      { text: " end ", isHighlighted: false },
      { text: "a*b+c", isHighlighted: true },
    ];
    expect(result).toEqual(expected);
  });

  it("handles backslash in matchWith", () => {
    const result = highlightMatches("\\n", "line1\\nline2\\n");
    const expected: FormattedText[] = [
      { text: "line1", isHighlighted: false },
      { text: "\\n", isHighlighted: true },
      { text: "line2", isHighlighted: false },
      { text: "\\n", isHighlighted: true },
    ];
    expect(result).toEqual(expected);
  });

  it("highlights match at the beginning of text", () => {
    const result = highlightMatches("hello", "hello world");
    const expected: FormattedText[] = [
      { text: "hello", isHighlighted: true },
      { text: " world", isHighlighted: false },
    ];
    expect(result).toEqual(expected);
  });

  it("highlights match at the end of text", () => {
    const result = highlightMatches("world", "hello world");
    const expected: FormattedText[] = [
      { text: "hello ", isHighlighted: false },
      { text: "world", isHighlighted: true },
    ];
    expect(result).toEqual(expected);
  });

  it("highlights when entire text is a match", () => {
    const result = highlightMatches("hello", "hello");
    const expected: FormattedText[] = [{ text: "hello", isHighlighted: true }];
    expect(result).toEqual(expected);
  });

  it("handles consecutive matches", () => {
    const result = highlightMatches("a", "aaa");
    const expected: FormattedText[] = [
      { text: "a", isHighlighted: true },
      { text: "a", isHighlighted: true },
      { text: "a", isHighlighted: true },
    ];
    expect(result).toEqual(expected);
  });

  it("is not case-sensitive", () => {
    const result = highlightMatches("hello", "Hello hello HELLO");
    const expected: FormattedText[] = [
      { text: "Hello", isHighlighted: true },
      { text: "hello", isHighlighted: true },
      { text: "HELLO", isHighlighted: true },
    ];
    expect(result.filter((x) => x.isHighlighted)).toEqual(expected);
  });

  it("handles single character match", () => {
    const result = highlightMatches("o", "foo");
    const expected: FormattedText[] = [
      { text: "f", isHighlighted: false },
      { text: "o", isHighlighted: true },
      { text: "o", isHighlighted: true },
    ];
    expect(result).toEqual(expected);
  });

  it("handles empty matchWith string", () => {
    const result = highlightMatches("", "hello world");
    const expected: FormattedText[] = [
      { text: "hello world", isHighlighted: false },
    ];
    expect(result).toEqual(expected);
  });
});
