import { describe, expect, it } from "vitest";
import {
  createBundledAlphabetProvider,
  createBundledFontFeaturesProvider,
  createBundledLanguageFontSuggester,
  createBundledSampleTextProvider,
  type BundledAlphabets,
  type BundledFontFeatureDefaults,
  type BundledLanguageFonts,
  type BundledSampleTexts,
} from "./bundledProviders";

/**
 * Tiny stand-ins for the real snapshots, shaped exactly as the generators write
 * them (bundled.spec.ts is what checks that claim against the real files). The
 * tags are the ones that make the resolution rules visible: `sr-Cyrl` is not a
 * key and has to reach `sr`, `aa-DJ` carries the SLDR's casing, and the Arabic
 * script rules are the region-override case.
 */
const ALPHABETS: BundledAlphabets = {
  generatedAt: "2026-01-01T00:00:00.000Z",
  source: "https://github.com/silnrsi/sldr",
  alphabets: {
    sr: "[а б в]",
    "aa-DJ": "[a b ɓ]",
    // An entry there is nothing to make an alphabet of, with a shorter tag that
    // does have one — the case sldrAlphabet.ts treats as "no entry".
    "xx-YY": "[]",
    xx: "[x y]",
  },
};

const LANGUAGE_FONTS: BundledLanguageFonts = {
  generatedAt: "2026-01-01T00:00:00.000Z",
  sources: ["https://github.com/silnrsi/sldr"],
  languages: {
    ffm: ["charis", "notafamily", "andika"],
    sr: ["gentium"],
  },
  scriptDefaults: {
    Arab: [
      { regions: ["CM", "SN"], roles: { default: ["harmattan"] } },
      { regions: ["PK"], roles: { default: ["awaminastaliq", "lateef"] } },
      {
        roles: {
          default: ["scheherazadenew"],
          literacy: ["scheherazadenew", "lateef"],
        },
      },
    ],
    Thai: [{ roles: { default: ["notosansthai"] } }],
  },
  families: {
    charis: {
      family: "Charis",
      ttfUrl: "https://fonts.example/Charis-Regular.ttf",
      license: "open",
      licenseUrl: "https://openfontlicense.org/",
    },
    andika: { family: "Andika", ttfUrl: "https://fonts.example/Andika.ttf" },
    gentium: { family: "Gentium", ttfUrl: "https://fonts.example/Gentium.ttf" },
    harmattan: {
      family: "Harmattan",
      ttfUrl: "https://fonts.example/Harmattan.ttf",
    },
    awaminastaliq: {
      family: "Awami Nastaliq",
      ttfUrl: "https://fonts.example/AwamiNastaliq.ttf",
    },
    lateef: { family: "Lateef", ttfUrl: "https://fonts.example/Lateef.ttf" },
    scheherazadenew: {
      family: "Scheherazade New",
      ttfUrl: "https://fonts.example/ScheherazadeNew.ttf",
    },
    notosansthai: {
      family: "Noto Sans Thai",
      ttfUrl: "https://fonts.example/NotoSansThai.ttf",
    },
  },
};

const FONT_FEATURES: BundledFontFeatureDefaults = {
  generatedAt: "2026-01-01T00:00:00.000Z",
  source: "https://github.com/silnrsi/sldr",
  defaults: {
    sr: [{ fontName: "Gentium", features: {} }],
    aak: [{ fontName: "Andika", features: { cv43: 2 } }],
  },
};

const SAMPLE_TEXTS: BundledSampleTexts = {
  generatedAt: "2026-01-01T00:00:00.000Z",
  source: "https://github.com/googlefonts/lang",
  samples: {
    th_Thai: "ปฏิญญาสากล",
    sr_Cyrl: "Општа декларација",
    ffm_Latn: "Kuulal winndannde",
  },
};

/** A signal that was cancelled before the provider was ever asked. */
function abortedSignal(): AbortSignal {
  const controller = new AbortController();
  controller.abort();
  return controller.signal;
}

describe("createBundledAlphabetProvider", () => {
  it("parses the raw exemplar string of an exact tag", async () => {
    const provider = createBundledAlphabetProvider({ data: ALPHABETS });
    expect(await provider.getAlphabet("sr")).toBe("а б в");
  });

  it("answers a longer tag from the shorter one it is a variety of", async () => {
    const provider = createBundledAlphabetProvider({ data: ALPHABETS });
    expect(await provider.getAlphabet("sr-Cyrl")).toBe("а б в");
  });

  it("matches a tag whose spelling differs only in case", async () => {
    const provider = createBundledAlphabetProvider({ data: ALPHABETS });
    expect(await provider.getAlphabet("aa-dj")).toBe("a b ɓ");
  });

  it("treats an entry with nothing usable in it as no entry", async () => {
    const provider = createBundledAlphabetProvider({ data: ALPHABETS });
    expect(await provider.getAlphabet("xx-YY")).toBe("x y");
  });

  it("has nothing for a language the snapshot never heard of", async () => {
    const provider = createBundledAlphabetProvider({ data: ALPHABETS });
    expect(await provider.getAlphabet("qqq")).toBeUndefined();
  });

  it("takes the host's fallback tags over shortening", async () => {
    const provider = createBundledAlphabetProvider({
      data: ALPHABETS,
      fallbackTagsFor: () => ["xx"],
    });
    // Nothing in the snapshot is called `zzz`, and shortening it would produce
    // nothing either; the host's chain is what finds an answer.
    expect(await provider.getAlphabet("zzz")).toBe("x y");
  });

  it("rethrows the caller's abort", async () => {
    const provider = createBundledAlphabetProvider({ data: ALPHABETS });
    await expect(
      provider.getAlphabet("sr", { signal: abortedSignal() })
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("createBundledLanguageFontSuggester", () => {
  it("offers the language's own fonts, in the snapshot's order", async () => {
    const suggester = createBundledLanguageFontSuggester({
      data: LANGUAGE_FONTS,
    });
    const fonts = await suggester.suggestFontsForLanguage("ffm");
    // `notafamily` is named for the language but has no family entry, so there
    // is nothing to offer and it is dropped rather than shown.
    expect(fonts.map((font) => font.family)).toEqual(["Charis", "Andika"]);
  });

  it("says a recommendation is a recommendation, and where it came from", async () => {
    const suggester = createBundledLanguageFontSuggester({
      data: LANGUAGE_FONTS,
    });
    const [charis] = await suggester.suggestFontsForLanguage("ffm");
    expect(charis).toEqual({
      family: "Charis",
      installed: false,
      fileUrl: "https://fonts.example/Charis-Regular.ttf",
      fileIsSubset: false,
      license: "open",
      licenseUrl: "https://openfontlicense.org/",
      supportsLanguage: true,
      supportsLanguageSource: {
        name: "SIL language font data bundled with this app",
      },
    });
  });

  it("answers a longer tag from the shorter one it is a variety of", async () => {
    const suggester = createBundledLanguageFontSuggester({
      data: LANGUAGE_FONTS,
    });
    const fonts = await suggester.suggestFontsForLanguage("sr-Cyrl-RS");
    expect(fonts.map((font) => font.family)).toEqual(["Gentium"]);
  });

  it("falls back to the script's fonts for a language nothing names", async () => {
    const suggester = createBundledLanguageFontSuggester({
      data: LANGUAGE_FONTS,
    });
    const fonts = await suggester.suggestFontsForLanguage("qqq-Arab");
    // The general rule: default role first, then the rest of what it names.
    expect(fonts.map((font) => font.family)).toEqual([
      "Scheherazade New",
      "Lateef",
    ]);
  });

  it("prefers the script rule written for the tag's own region", async () => {
    const suggester = createBundledLanguageFontSuggester({
      data: LANGUAGE_FONTS,
    });
    const pakistan = await suggester.suggestFontsForLanguage("qqq-Arab-PK");
    expect(pakistan.map((font) => font.family)).toEqual([
      "Awami Nastaliq",
      "Lateef",
    ]);
  });

  it("takes the script from the host for a tag that doesn't name one", async () => {
    const suggester = createBundledLanguageFontSuggester({
      data: LANGUAGE_FONTS,
      scriptFor: (tag) => (tag === "qqq" ? "Thai" : undefined),
    });
    const fonts = await suggester.suggestFontsForLanguage("qqq");
    expect(fonts.map((font) => font.family)).toEqual(["Noto Sans Thai"]);
  });

  it("has nothing for a language and a script it knows neither of", async () => {
    const suggester = createBundledLanguageFontSuggester({
      data: LANGUAGE_FONTS,
    });
    expect(await suggester.suggestFontsForLanguage("qqq-Vaii")).toEqual([]);
  });

  it("rethrows the caller's abort", async () => {
    const suggester = createBundledLanguageFontSuggester({
      data: LANGUAGE_FONTS,
    });
    await expect(
      suggester.suggestFontsForLanguage("ffm", { signal: abortedSignal() })
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("createBundledFontFeaturesProvider", () => {
  it("hands back a tag's fonts and their settings", async () => {
    const provider = createBundledFontFeaturesProvider({ data: FONT_FEATURES });
    expect(await provider.getFontFeatureDefaults("aak")).toEqual([
      { fontName: "Andika", features: { cv43: 2 } },
    ]);
  });

  it("answers a longer tag from the shorter one it is a variety of", async () => {
    const provider = createBundledFontFeaturesProvider({ data: FONT_FEATURES });
    expect(await provider.getFontFeatureDefaults("sr-Cyrl")).toEqual([
      { fontName: "Gentium", features: {} },
    ]);
  });

  it("has nothing for a language the snapshot never heard of", async () => {
    const provider = createBundledFontFeaturesProvider({ data: FONT_FEATURES });
    expect(await provider.getFontFeatureDefaults("qqq")).toEqual([]);
  });

  it("rethrows the caller's abort", async () => {
    const provider = createBundledFontFeaturesProvider({ data: FONT_FEATURES });
    await expect(
      provider.getFontFeatureDefaults("aak", { signal: abortedSignal() })
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("createBundledSampleTextProvider", () => {
  it("finds the passage under the data set's own {lang}_{Script} key", async () => {
    const provider = createBundledSampleTextProvider({ data: SAMPLE_TEXTS });
    expect(await provider.getSampleText("th-Thai-TH")).toEqual({
      text: "ปฏิญญาสากล",
      source: "Google Fonts language data bundled with this app",
      sourceUrl: "https://github.com/googlefonts/lang",
    });
  });

  it("lets the tag's own script settle which passage it is", async () => {
    const provider = createBundledSampleTextProvider({ data: SAMPLE_TEXTS });
    const sample = await provider.getSampleText("sr-Cyrl");
    expect(sample?.text).toBe("Општа декларација");
  });

  it("takes the script from the host, and Latin failing that", async () => {
    const provider = createBundledSampleTextProvider({
      data: SAMPLE_TEXTS,
      scriptFor: (tag) => (tag === "sr" ? "Cyrl" : undefined),
    });
    expect((await provider.getSampleText("sr"))?.text).toBe(
      "Општа декларација"
    );
    expect((await provider.getSampleText("ffm"))?.text).toBe(
      "Kuulal winndannde"
    );
  });

  it("has nothing for a language the snapshot never heard of", async () => {
    const provider = createBundledSampleTextProvider({ data: SAMPLE_TEXTS });
    expect(await provider.getSampleText("qqq")).toBeUndefined();
  });

  it("rethrows the caller's abort", async () => {
    const provider = createBundledSampleTextProvider({ data: SAMPLE_TEXTS });
    await expect(
      provider.getSampleText("th", { signal: abortedSignal() })
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
