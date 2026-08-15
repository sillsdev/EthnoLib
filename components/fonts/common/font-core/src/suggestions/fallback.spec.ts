import { describe, expect, it, vi } from "vitest";
import {
  withAlphabetFontSuggesterFallback,
  withAlphabetProviderFallback,
  withFontFeatureDefaultsFallback,
  withLanguageFontSuggesterFallback,
  withSampleTextFallback,
} from "./fallback";
import type {
  AlphabetFontSuggester,
  AlphabetProvider,
  FontFeatureDefaultsProvider,
  LanguageFontSuggester,
  SampleTextProvider,
} from "./types";

/** An error that identifies itself the way a cancelled fetch does. */
function abortError(): Error {
  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
}

function alphabetProvider(
  answer: () => Promise<string | undefined>
): AlphabetProvider {
  return { getAlphabet: vi.fn(answer) };
}

describe("withAlphabetProviderFallback", () => {
  it("hands back what the primary said", async () => {
    const fallback = alphabetProvider(async () => "x y");
    const provider = withAlphabetProviderFallback(
      alphabetProvider(async () => "a b"),
      fallback
    );
    expect(await provider.getAlphabet("ffm")).toBe("a b");
    expect(fallback.getAlphabet).not.toHaveBeenCalled();
  });

  it("keeps a definite 'nothing for this language' rather than asking again", async () => {
    // The whole point of the empty-versus-throw distinction in types.ts: a
    // service that answered "no such language" has answered, and replacing that
    // with an older snapshot's opinion would be wrong on every such language.
    const fallback = alphabetProvider(async () => "x y");
    const provider = withAlphabetProviderFallback(
      alphabetProvider(async () => undefined),
      fallback
    );
    expect(await provider.getAlphabet("ffm")).toBeUndefined();
    expect(fallback.getAlphabet).not.toHaveBeenCalled();
  });

  it("asks the fallback when the primary fails, and says so", async () => {
    const failure = new Error("network down");
    const onFellBack = vi.fn();
    const provider = withAlphabetProviderFallback(
      alphabetProvider(async () => {
        throw failure;
      }),
      alphabetProvider(async () => "x y"),
      { onFellBack }
    );
    expect(await provider.getAlphabet("ffm")).toBe("x y");
    expect(onFellBack).toHaveBeenCalledWith(failure);
  });

  it("rethrows an abort and leaves the fallback alone", async () => {
    const fallback = alphabetProvider(async () => "x y");
    const provider = withAlphabetProviderFallback(
      alphabetProvider(async () => {
        throw abortError();
      }),
      fallback
    );
    await expect(provider.getAlphabet("ffm")).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(fallback.getAlphabet).not.toHaveBeenCalled();
  });

  it("gives a caller that cancelled its abort rather than a second answer", async () => {
    const controller = new AbortController();
    const fallback = alphabetProvider(async () => "x y");
    const provider = withAlphabetProviderFallback(
      alphabetProvider(async () => {
        // The request fails and the caller has moved on meanwhile — which is
        // most of what a cancelled request looks like from in here.
        controller.abort();
        throw new Error("network down");
      }),
      fallback
    );
    await expect(
      provider.getAlphabet("ffm", { signal: controller.signal })
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fallback.getAlphabet).not.toHaveBeenCalled();
  });

  it("lets the fallback's own failure through", async () => {
    const provider = withAlphabetProviderFallback(
      alphabetProvider(async () => {
        throw new Error("network down");
      }),
      alphabetProvider(async () => {
        throw new Error("snapshot missing");
      })
    );
    await expect(provider.getAlphabet("ffm")).rejects.toThrow(
      "snapshot missing"
    );
  });
});

describe("withLanguageFontSuggesterFallback", () => {
  it("keeps an empty answer rather than asking the fallback", async () => {
    const fallback: LanguageFontSuggester = {
      suggestFontsForLanguage: vi.fn(async () => [{ family: "Charis" }]),
    };
    const suggester = withLanguageFontSuggesterFallback(
      { suggestFontsForLanguage: async () => [] },
      fallback
    );
    expect(await suggester.suggestFontsForLanguage("ffm")).toEqual([]);
    expect(fallback.suggestFontsForLanguage).not.toHaveBeenCalled();
  });

  it("asks the fallback when the primary fails", async () => {
    const suggester = withLanguageFontSuggesterFallback(
      {
        suggestFontsForLanguage: async () => {
          throw new Error("network down");
        },
      },
      { suggestFontsForLanguage: async () => [{ family: "Charis" }] }
    );
    expect(await suggester.suggestFontsForLanguage("ffm")).toEqual([
      { family: "Charis" },
    ]);
  });
});

describe("withFontFeatureDefaultsFallback", () => {
  it("asks the fallback when the primary fails", async () => {
    const fallback: FontFeatureDefaultsProvider = {
      getFontFeatureDefaults: async () => [
        { fontName: "Andika", features: { cv43: 2 } },
      ],
    };
    const provider = withFontFeatureDefaultsFallback(
      {
        getFontFeatureDefaults: async () => {
          throw new Error("network down");
        },
      },
      fallback
    );
    expect(await provider.getFontFeatureDefaults("aak")).toEqual([
      { fontName: "Andika", features: { cv43: 2 } },
    ]);
  });
});

describe("withSampleTextFallback", () => {
  it("passes the caller's options to whichever source runs", async () => {
    const controller = new AbortController();
    const fallback: SampleTextProvider = {
      getSampleText: vi.fn(async () => ({ text: "words", source: "snapshot" })),
    };
    const provider = withSampleTextFallback(
      {
        getSampleText: async () => {
          throw new Error("network down");
        },
      },
      fallback
    );
    const sample = await provider.getSampleText("th", {
      signal: controller.signal,
    });
    expect(sample?.text).toBe("words");
    expect(fallback.getSampleText).toHaveBeenCalledWith("th", {
      signal: controller.signal,
    });
  });
});

describe("withAlphabetFontSuggesterFallback", () => {
  it("passes onProgress through to the source that runs", async () => {
    const onProgress = vi.fn();
    const fallback: AlphabetFontSuggester = {
      suggestFontsForAlphabet: async (_alphabet, options) => {
        options?.onProgress?.([{ family: "Charis" }]);
        return [{ family: "Charis" }];
      },
    };
    const suggester = withAlphabetFontSuggesterFallback(
      {
        suggestFontsForAlphabet: async () => {
          throw new Error("network down");
        },
      },
      fallback
    );
    expect(await suggester.suggestFontsForAlphabet("a b", { onProgress })).toEqual(
      [{ family: "Charis" }]
    );
    expect(onProgress).toHaveBeenCalledWith([{ family: "Charis" }]);
  });
});
