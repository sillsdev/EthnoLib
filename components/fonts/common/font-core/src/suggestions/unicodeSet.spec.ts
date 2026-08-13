import { describe, expect, it } from "vitest";
import { parseUnicodeSetToAlphabet } from "./unicodeSet";
import { parseAlphabet } from "../alphabet";

describe("parseUnicodeSetToAlphabet", () => {
  it("reads the items of a bracketed set", () => {
    expect(parseUnicodeSetToAlphabet("[a b c]")).toEqual("a b c");
  });

  it("takes a set that isn't bracketed", () => {
    expect(parseUnicodeSetToAlphabet("a b c")).toEqual("a b c");
  });

  it("splits characters that were written without a space between them", () => {
    // Adjacent characters are separate items in a UnicodeSet; only braces join them.
    expect(parseUnicodeSetToAlphabet("[ab c]")).toEqual("a b c");
  });

  it("keeps a brace group together as one entry", () => {
    expect(parseUnicodeSetToAlphabet("[k h {kh} {ng}]")).toEqual("k h kh ng");
  });

  it("decodes \\uXXXX escapes", () => {
    expect(parseUnicodeSetToAlphabet("[\\u0E01 \\u0E02]")).toEqual("ก ข");
  });

  it("decodes \\u{...} and \\UXXXXXXXX escapes, including outside the BMP", () => {
    expect(parseUnicodeSetToAlphabet("[\\u{1F600} \\U0001F601]")).toEqual(
      "\u{1F600} \u{1F601}"
    );
  });

  it("decodes escapes inside a brace group", () => {
    expect(parseUnicodeSetToAlphabet("[{\\u0E01\\u0E33}]")).toEqual("กำ");
  });

  it("gives back the character an escaped literal stands for", () => {
    expect(parseUnicodeSetToAlphabet("[\\- \\[ \\] \\{ \\: \\\\]")).toEqual(
      "- [ ] { : \\"
    );
  });

  it("does not read an escaped hyphen as a range", () => {
    expect(parseUnicodeSetToAlphabet("[a\\-z]")).toEqual("a - z");
  });

  it("writes out a small range", () => {
    expect(parseUnicodeSetToAlphabet("[a-f]")).toEqual("a b c d e f");
  });

  it("writes out a range whose ends are escapes", () => {
    expect(parseUnicodeSetToAlphabet("[\\u0E01-\\u0E05]")).toEqual("ก ข ฃ ค ฅ");
  });

  it("writes out more than one range in the same token", () => {
    expect(parseUnicodeSetToAlphabet("[a-c0-2]")).toEqual("a b c 0 1 2");
  });

  it("drops a range too big to be an alphabet, and keeps the rest of the set", () => {
    // 64 code points is the most we will write out; a set naming a whole script's
    // block is describing a script rather than an alphabet.
    expect(parseUnicodeSetToAlphabet("[\\u4E00-\\u9FFF x]")).toEqual("x");
    expect(parseUnicodeSetToAlphabet("[\\u0041-\\u00A0]")).toEqual("");
  });

  it("writes out a range of exactly the largest size it will take", () => {
    const parsed = parseUnicodeSetToAlphabet("[\\u0041-\\u0080]");

    expect(parsed.split(" ")).toHaveLength(64);
  });

  it("keeps an invisible character, which a font either has or cannot write the language", () => {
    const parsed = parseUnicodeSetToAlphabet("[\\u200B \\u200D a]");

    expect(parsed).toEqual("​ ‍ a");
    expect(parseAlphabet(parsed).has("​")).toBe(true);
  });

  it("drops the set brackets rather than reading them as characters", () => {
    expect(parseUnicodeSetToAlphabet("[[a b]]")).toEqual("a b");
  });

  it("drops duplicates", () => {
    expect(parseUnicodeSetToAlphabet("[a a b \\u0061]")).toEqual("a b");
  });

  it("gives back nothing for an empty set", () => {
    expect(parseUnicodeSetToAlphabet("[]")).toEqual("");
  });

  it("keeps the order the set was written in", () => {
    expect(parseUnicodeSetToAlphabet("[z y {aa} b]")).toEqual("z y aa b");
  });
});

describe("a real exemplar set", () => {
  // The main exemplar set for Thai, as the SLDR publishes it. Its combining marks
  // stand alone as items, which is exactly the kind of thing a tidier would eat.
  const thai =
    "[ฯๆ ๎ ์ ็ ่ ้ ๊ ๋ ก ข ฃ ค ฅ ฆ ง จ ฉ ช ซ ฌ ญ ฎ ฏ ฐ ฑ ฒ ณ ด ต ถ ท ธ น บ ป ผ ฝ พ ฟ ภ ม ย ร ฤ ล ฦ ว ศ ษ ส ห ฬ อ ฮ ํ ะ ั าๅ ำ ิ ี ึ ื ุ ู เ แ โ ใ ไ ฺ]";

  it("parses into an alphabet with no set syntax left in it", () => {
    const parsed = parseUnicodeSetToAlphabet(thai);

    expect(parsed).toContain("ก");
    expect(parsed).not.toContain("[");
    expect(parsed).not.toContain("]");
  });

  it("keeps every consonant and mark as its own entry", () => {
    const entries = parseUnicodeSetToAlphabet(thai).split(" ");

    // The set has 71 whitespace-separated tokens, two of which (ฯๆ and าๅ) were
    // written without a space between the characters, so 73 entries come out.
    expect(entries).toHaveLength(73);
    expect(entries).toContain("๎"); // ๎, a mark that stands alone in the set
  });

  it("gives something parseAlphabet is happy with", () => {
    const alphabet = parseAlphabet(parseUnicodeSetToAlphabet(thai));

    expect(alphabet.has("ก")).toBe(true);
    expect(alphabet.has(" ")).toBe(false);
  });
});
