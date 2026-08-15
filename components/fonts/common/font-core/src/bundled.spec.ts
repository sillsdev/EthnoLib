import { describe, expect, it } from "vitest";
import {
  createBundledAlphabetProvider,
  createBundledFontFeaturesProvider,
  createBundledLanguageFontSuggester,
  createBundledSampleTextProvider,
} from "./bundled";

/**
 * The other bundled tests run on fixtures, so this one runs on the real
 * snapshots: what it is checking is that the JSON in src/suggestions/bundled is
 * shaped the way the providers read it, and that a few languages somebody would
 * actually choose come out with answers. Regenerating a snapshot
 * (tools/refresh*Snapshot.mjs) should leave every one of these true.
 */
describe("the bundled snapshots", () => {
  it("has the alphabet of a language, parsed out of its exemplar set", async () => {
    const provider = createBundledAlphabetProvider();
    const thai = await provider.getAlphabet("th");
    expect(thai).toContain("ก");
    // Space-separated entries, which is what the alphabet field takes.
    expect(thai?.split(" ").length).toBeGreaterThan(30);
  });

  it("reaches sr for sr-Cyrl, which is not a key of its own", async () => {
    const provider = createBundledAlphabetProvider();
    expect(await provider.getAlphabet("sr-Cyrl")).toBe(
      await provider.getAlphabet("sr")
    );
  });

  it("recommends the Noto Thai families for Thai", async () => {
    const suggester = createBundledLanguageFontSuggester();
    const families = (await suggester.suggestFontsForLanguage("th")).map(
      (font) => font.family
    );
    expect(families).toContain("Noto Sans Thai");
  });

  it("puts Charis first for Fulfulde Maasina", async () => {
    const suggester = createBundledLanguageFontSuggester();
    const fonts = await suggester.suggestFontsForLanguage("ffm");
    expect(fonts[0]).toMatchObject({
      family: "Charis",
      installed: false,
      license: "open",
      supportsLanguage: true,
    });
    expect(fonts[0].fileUrl).toMatch(/^https:\/\/.*\.ttf$/);
  });

  it("falls back to the script's fonts for a language it doesn't name", async () => {
    const suggester = createBundledLanguageFontSuggester();
    // No such language; the script is the only thing there is to go on.
    const fonts = await suggester.suggestFontsForLanguage("qaa-Thai");
    expect(fonts.map((font) => font.family)).toContain("Noto Sans Thai");
  });

  it("names the fonts a language's own data asks for", async () => {
    const provider = createBundledFontFeaturesProvider();
    const defaults = await provider.getFontFeatureDefaults("th");
    expect(defaults.map((entry) => entry.fontName)).toContain("Noto Sans Thai");
    for (const entry of defaults) {
      expect(typeof entry.fontName).toBe("string");
      expect(entry.features).toBeTypeOf("object");
    }
  });

  it("carries the feature settings a language wants, where it has them", async () => {
    const provider = createBundledFontFeaturesProvider();
    // Ankave: the SLDR asks for the alternate Eng, which is exactly the kind of
    // thing the character-variant UI exists to set.
    const defaults = await provider.getFontFeatureDefaults("aak");
    const andika = defaults.find((entry) => entry.fontName === "Andika");
    expect(andika?.features).toEqual({ cv43: 2 });
  });

  it("has a passage in the language to draw the samples with", async () => {
    const provider = createBundledSampleTextProvider({
      // `th` carries no script subtag, and Thai is not written in Latin; this is
      // the seam the host answers, exactly as for the live provider.
      scriptFor: () => "Thai",
    });
    const sample = await provider.getSampleText("th");
    expect(sample?.text).toContain("มนุษยชาติ");
    expect(sample?.source).toContain("Google Fonts language data");
    expect(sample?.sourceUrl).toBe("https://github.com/googlefonts/lang");
  });

  it("has nothing, rather than something wrong, for a made-up tag", async () => {
    expect(await createBundledAlphabetProvider().getAlphabet("qaa")).toBeUndefined();
    expect(
      await createBundledSampleTextProvider().getSampleText("qaa")
    ).toBeUndefined();
    expect(
      await createBundledFontFeaturesProvider().getFontFeatureDefaults("qaa")
    ).toEqual([]);
  });
});
