import { describe, expect, it } from "vitest";
import { alphabetUnits, generateExampleText } from "./exampleText";
import { featureSettingsFor } from "./featureSettings";

/**
 * Split the text back into the letters it was supposed to be built from, longest
 * first so that a digraph is read as itself rather than as its first letter.
 * Returns undefined at the first thing that isn't in the alphabet.
 */
function tokenize(text: string, units: string[]): string[] | undefined {
  const longestFirst = [...units].sort((a, b) => b.length - a.length);
  const found: string[] = [];
  // Sentences start with a capital, which is deliberately not required to be a
  // letter of the alphabet; lowercasing puts it back to the letter it came from.
  text = text.toLowerCase();
  let at = 0;
  while (at < text.length) {
    if (text[at] === " " || text[at] === ".") {
      at += 1;
      continue;
    }
    const unit = longestFirst.find((u) => text.startsWith(u, at));
    if (!unit) return undefined;
    found.push(unit);
    at += unit.length;
  }
  return found;
}

const LATIN = "a b c d e f g h i j k l m n o p r s t u v w y z";

describe("reading the alphabet", () => {
  it("takes separated entries as whole letters, digraphs and all", () => {
    expect(alphabetUnits("a b ng o")).toEqual(["a", "b", "ng", "o"]);
  });

  it("reads an unseparated alphabet letter by letter", () => {
    expect(alphabetUnits("abŋo")).toEqual(["a", "b", "ŋ", "o"]);
  });

  it("keeps a combining mark on the letter it belongs to", () => {
    // "ɔ" + combining grave, which is one letter however it was typed.
    expect(alphabetUnits("aɔ̀u")).toEqual(["a", "ɔ̀", "u"]);
  });

  it("ignores the separators people put between letters", () => {
    expect(alphabetUnits("a, b; c")).toEqual(["a", "b", "c"]);
  });
});

describe("generating example text", () => {
  it("writes the same text every time for the same alphabet", () => {
    expect(generateExampleText(LATIN)).toBe(generateExampleText(LATIN));
  });

  it("writes different text for a different alphabet", () => {
    expect(generateExampleText(LATIN)).not.toBe(
      generateExampleText("a e i k m n s t u")
    );
  });

  it("uses nothing but the letters it was given", () => {
    const units = alphabetUnits(LATIN);
    expect(tokenize(generateExampleText(LATIN), units)).not.toBeUndefined();
  });

  it("treats a digraph as one letter, never splitting it", () => {
    const alphabet = "a e i ng t";
    const text = generateExampleText(alphabet);
    // Tokenizing fails if a bare "n" or "g" was written, neither being a letter
    // of this alphabet.
    expect(tokenize(text, alphabetUnits(alphabet))).not.toBeUndefined();
    expect(text).toContain("ng");
  });

  it("writes about the number of words asked for", () => {
    const words = generateExampleText(LATIN, { words: 12 })
      .split(/\s+/)
      .filter(Boolean);
    expect(words).toHaveLength(12);
  });

  it("ends every sentence with a full stop and nothing else", () => {
    const text = generateExampleText(LATIN);
    expect(text.endsWith(".")).toBe(true);
    expect(text).not.toMatch(/[^a-zA-Z ."]/);
  });

  it("starts every sentence with a capital", () => {
    for (const sentence of generateExampleText(LATIN).split(". ")) {
      expect(sentence[0]).toBe(sentence[0].toUpperCase());
      expect(sentence[0]).not.toBe(sentence[0].toLowerCase());
    }
  });

  it("capitalizes only the first letter of a digraph", () => {
    const text = generateExampleText("a e i ng t");
    expect(text).toMatch(/(^|\. )Ng/);
    expect(text).not.toContain("NG");
  });

  it("leaves a caseless script alone", () => {
    // Hebrew has no capitals: every letter uppercases to itself, so every
    // sentence has to start with the letter the generator chose.
    const text = generateExampleText("א ב ג ד");
    expect(text).toBe(text.toUpperCase());
    expect(tokenize(text, ["א", "ב", "ג", "ד"])).not.toBeUndefined();
  });

  it("builds words of one to four syllables", () => {
    const text = generateExampleText("a b", { words: 40 });
    for (const word of text.replace(/\./g, "").split(" ").filter(Boolean)) {
      // One letter at least (a lone V), and at most four CVC syllables.
      expect(word.length).toBeGreaterThanOrEqual(1);
      expect(word.length).toBeLessThanOrEqual(12);
    }
  });

  it("puts a vowel in nearly every syllable", () => {
    // With one vowel and one consonant, CV and CVC and V all contain the vowel,
    // so no word can be consonants alone.
    const text = generateExampleText("a b", { words: 30 });
    for (const word of text.replace(/\./g, "").split(" ").filter(Boolean)) {
      // Either case, a sentence's first word having been capitalized.
      expect(word).toMatch(/[aA]/);
    }
  });

  it("still writes something for an alphabet with no vowels", () => {
    const text = generateExampleText("b k t s");
    expect(text.length).toBeGreaterThan(0);
    expect(tokenize(text, ["b", "k", "t", "s"])).not.toBeUndefined();
  });

  it("still writes something for an alphabet of vowels only", () => {
    const text = generateExampleText("a e i");
    expect(text.length).toBeGreaterThan(0);
    expect(tokenize(text, ["a", "e", "i"])).not.toBeUndefined();
  });

  it("writes nothing at all for an empty alphabet", () => {
    expect(generateExampleText("")).toBe("");
    expect(generateExampleText("   ")).toBe("");
  });

  it("recognises IPA vowels, not just Latin ones", () => {
    // ə and ɔ are the only vowels here; every word must contain one of them.
    const text = generateExampleText("ə ɔ k n", { words: 20 });
    for (const word of text.replace(/\./g, "").split(" ").filter(Boolean)) {
      expect(word).toMatch(/[əɔƏƆ]/);
    }
  });
});

describe("choices as CSS", () => {
  it("says normal when the font is left alone", () => {
    expect(featureSettingsFor({})).toBe("normal");
    expect(featureSettingsFor({ cv07: 0 })).toBe("normal");
  });

  it("lists the features that were changed, in a settled order", () => {
    expect(featureSettingsFor({ cv12: 1, cv02: 3, cv07: 0 })).toBe(
      '"cv02" 3, "cv12" 1'
    );
  });
});
