import { describe, expect, it, vi } from "vitest";
import { createSldrFontFeaturesProvider } from "./sldrFontFeatures";
import {
  suggestionCacheKey,
  type SuggestionCacheStorage,
} from "./suggestionCache";
// The repository's real LDML for `maq`, cut to the special section (see
// fixtures/README.md): one font entry with feature settings and two without,
// which is the shape of file this provider deals with.
import maqLdml from "./fixtures/sldrFontFeatures.xml?raw";

function memoryStorage(): SuggestionCacheStorage {
  const entries = new Map<string, string>();
  return {
    get length() {
      return entries.size;
    },
    key: (index) => [...entries.keys()][index] ?? null,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value);
    },
    removeItem: (key) => {
      entries.delete(key);
    },
  };
}

/** A stand-in for the repository, recording what it was asked and with what. */
function sldrFetch(
  xml: string,
  status = 200
): {
  impl: typeof fetch;
  urls: string[];
  signals: (AbortSignal | undefined)[];
} {
  const urls: string[] = [];
  const signals: (AbortSignal | undefined)[] = [];
  const impl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    urls.push(String(input));
    signals.push(init?.signal ?? undefined);
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 404 ? "Not Found" : "OK",
      text: async () => xml,
    } as Response;
  }) as unknown as typeof fetch;
  return { impl, urls, signals };
}

describe("createSldrFontFeaturesProvider", () => {
  it("reads the font entries of a real LDML file, settings and all", async () => {
    const { impl, urls } = sldrFetch(maqLdml);
    const defaults = await createSldrFontFeaturesProvider({
      storage: memoryStorage(),
    }).getFontFeatureDefaults("maq", { fetchImpl: impl });

    expect(urls).toEqual(["https://ldml.api.sil.org/maq?inc[]=special"]);
    // The feature-less Noto entries are still fonts somebody chose for the
    // language, so they come through with nothing to set.
    expect(defaults).toEqual([
      {
        fontName: "Charis",
        features: { ss04: 1, cv43: 2, cv68: 1, cv77: 1, cv90: 1 },
      },
      { fontName: "Noto Sans", features: {} },
      { fontName: "Noto Serif", features: {} },
    ]);
  });

  it("keeps OpenType tags and drops Graphite IDs and malformed pairs", async () => {
    const xml = `<ldml><special><sil:external-resources xmlns:sil="urn://www.sil.org/ldml/0.1">
      <sil:font name="Andika" features="1041=2 cv43=2 SS04=1 cv77 cv90=x cv68=-1 cv13=0"/>
    </sil:external-resources></special></ldml>`;
    const { impl } = sldrFetch(xml);
    const defaults = await createSldrFontFeaturesProvider({
      storage: memoryStorage(),
    }).getFontFeatureDefaults("qqq", { fetchImpl: impl });

    // The bare number is a Graphite feature ID; the tags come through folded to
    // lowercase, and zero is a real value (it turns a feature off).
    expect(defaults).toEqual([
      { fontName: "Andika", features: { cv43: 2, ss04: 1, cv13: 0 } },
    ]);
  });

  it("answers a second time from the cache", async () => {
    const { impl, urls } = sldrFetch(maqLdml);
    const storage = memoryStorage();
    const provider = createSldrFontFeaturesProvider({ storage });

    const first = await provider.getFontFeatureDefaults("maq", {
      fetchImpl: impl,
    });
    const second = await provider.getFontFeatureDefaults(" MAQ ", {
      fetchImpl: impl,
    });

    expect(urls.length).toBe(1);
    expect(second).toEqual(first);
    expect(
      storage.getItem(suggestionCacheKey("sldrFontFeatures", "lang.maq"))
    ).toBeTruthy();
  });

  it("has nothing for a language the repository hasn't got, and keeps that", async () => {
    const { impl, urls } = sldrFetch("", 404);
    const storage = memoryStorage();
    const provider = createSldrFontFeaturesProvider({ storage });

    expect(
      await provider.getFontFeatureDefaults("zz", { fetchImpl: impl })
    ).toEqual([]);
    expect(
      await provider.getFontFeatureDefaults("zz", { fetchImpl: impl })
    ).toEqual([]);
    expect(urls.length).toBe(1);
    expect(
      storage.getItem(suggestionCacheKey("sldrFontFeatures", "lang.zz"))
    ).toContain("missing");
  });

  it("keeps a font named without settings, and empties one that was all Graphite", async () => {
    const xml = `<ldml><special><sil:external-resources xmlns:sil="urn://www.sil.org/ldml/0.1">
      <sil:font name="Noto Sans"/>
      <sil:font name="Graphite Only" features="1041=2"/>
    </sil:external-resources></special></ldml>`;
    const { impl } = sldrFetch(xml);
    const defaults = await createSldrFontFeaturesProvider({
      storage: memoryStorage(),
    }).getFontFeatureDefaults("qqq", { fetchImpl: impl });

    expect(defaults).toEqual([
      { fontName: "Noto Sans", features: {} },
      { fontName: "Graphite Only", features: {} },
    ]);
  });

  it("has nothing for a file that names no fonts", async () => {
    const { impl } = sldrFetch("<ldml><special/></ldml>");
    const defaults = await createSldrFontFeaturesProvider({
      storage: memoryStorage(),
    }).getFontFeatureDefaults("qqq", { fetchImpl: impl });

    expect(defaults).toEqual([]);
  });

  it("asks about shorter and shorter tags until one has settings", async () => {
    const urls: string[] = [];
    const impl = vi.fn(async (input: RequestInfo | URL) => {
      urls.push(String(input));
      const found = String(input).includes("/maq?");
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        // 200 with nothing we can use, which is what a region-specific tag
        // gives back: an answer, and not an answer to our question.
        text: async () => (found ? maqLdml : "<ldml><special/></ldml>"),
      } as Response;
    }) as unknown as typeof fetch;
    const storage = memoryStorage();

    const defaults = await createSldrFontFeaturesProvider({
      storage,
    }).getFontFeatureDefaults("maq-Latn-MX", { fetchImpl: impl });

    expect(defaults?.[0]?.fontName).toBe("Charis");
    expect(urls).toEqual([
      "https://ldml.api.sil.org/maq-Latn-MX?inc[]=special",
      "https://ldml.api.sil.org/maq-Latn?inc[]=special",
      "https://ldml.api.sil.org/maq?inc[]=special",
    ]);
    // The two misses are remembered as misses, so the next visit starts at maq.
    expect(
      storage.getItem(
        suggestionCacheKey("sldrFontFeatures", "lang.maq-latn-mx")
      )
    ).toContain("missing");
    expect(
      storage.getItem(suggestionCacheKey("sldrFontFeatures", "lang.maq"))
    ).toContain("Charis");
  });

  it("asks the tags the host names instead of the shorter ones", async () => {
    const { impl, urls } = sldrFetch("", 404);
    const defaults = await createSldrFontFeaturesProvider({
      storage: memoryStorage(),
      fallbackTagsFor: (tag) => (tag === "ffm" ? ["ff"] : []),
    }).getFontFeatureDefaults("ffm", { fetchImpl: impl });

    expect(defaults).toEqual([]);
    expect(urls).toEqual([
      "https://ldml.api.sil.org/ffm?inc[]=special",
      "https://ldml.api.sil.org/ff?inc[]=special",
    ]);
  });

  it("goes through the fetch it was given and forwards the signal", async () => {
    const { impl, signals } = sldrFetch(maqLdml);
    const controller = new AbortController();
    await createSldrFontFeaturesProvider({
      storage: memoryStorage(),
    }).getFontFeatureDefaults("maq", {
      fetchImpl: impl,
      signal: controller.signal,
    });

    expect(signals).toEqual([controller.signal]);
  });

  it("rethrows an abort rather than answering with nothing", async () => {
    const aborted = Object.assign(new Error("aborted"), { name: "AbortError" });
    const impl = vi.fn(async () => {
      throw aborted;
    }) as unknown as typeof fetch;

    await expect(
      createSldrFontFeaturesProvider({
        storage: memoryStorage(),
      }).getFontFeatureDefaults("maq", { fetchImpl: impl })
    ).rejects.toBe(aborted);
  });

  it("throws when the repository is broken rather than reporting no settings", async () => {
    const { impl } = sldrFetch("", 500);
    await expect(
      createSldrFontFeaturesProvider({
        storage: memoryStorage(),
      }).getFontFeatureDefaults("maq", { fetchImpl: impl })
    ).rejects.toThrow(/500/);
  });
});
