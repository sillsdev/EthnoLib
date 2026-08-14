import { describe, expect, it, vi } from "vitest";
import { createFontsourceSuggester } from "./fontsource";
import { suggestionCacheKey, type SuggestionCacheStorage } from "./suggestionCache";
import catalogFixture from "./fixtures/fontsourceList.json";
import andikaFixture from "./fixtures/fontsourceAndika.json";
import notoSansThaiFixture from "./fixtures/fontsourceNotoSansThai.json";

/**
 * The fixtures are real Fontsource responses (see fixtures/README.md), so the
 * subsets, weights, licences and unicode ranges these tests reason about are the
 * ones the service actually publishes.
 */
const CATALOG = catalogFixture as CatalogFixtureEntry[];

interface CatalogFixtureEntry {
  id: string;
  family: string;
  subsets: string[];
  weights: number[];
  defSubset: string;
  license: string;
}

/** Per-family metadata for every open-licensed family in the catalog fixture. */
function allFontMetadata(): Record<string, unknown> {
  const fonts: Record<string, unknown> = {
    andika: andikaFixture,
    "noto-sans-thai": notoSansThaiFixture,
  };
  for (const entry of CATALOG) {
    if (fonts[entry.id]) continue;
    // Everything else in the fixture is a Latin family, so Andika's real ranges
    // stand in for it; only the id and the weights differ.
    fonts[entry.id] = {
      ...andikaFixture,
      id: entry.id,
      weights: entry.weights,
      defSubset: entry.defSubset,
    };
  }
  return fonts;
}

/** A cache that lives as long as the test does. */
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

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
  } as Response;
}

/**
 * A stand-in for the API: the catalog at /fonts, one family at /fonts/{id}, and a
 * 404 for any family not in `fonts` — which is how the "one candidate fails"
 * cases are set up. Every call is recorded, and so is how many were in flight.
 */
function fontsourceFetch(
  catalog: unknown,
  fonts: Record<string, unknown>
): {
  impl: typeof fetch;
  urls: string[];
  signals: (AbortSignal | undefined)[];
  fontIds: () => string[];
  peakInFlight: () => number;
} {
  const urls: string[] = [];
  const signals: (AbortSignal | undefined)[] = [];
  let inFlight = 0;
  let peak = 0;

  const impl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    urls.push(url);
    signals.push(init?.signal ?? undefined);
    inFlight++;
    peak = Math.max(peak, inFlight);
    try {
      // A tick of real waiting, so that overlapping requests actually overlap.
      await new Promise((resolve) => setTimeout(resolve, 2));
      if (url.endsWith("/fonts")) return jsonResponse(catalog);
      const id = url.slice(url.lastIndexOf("/") + 1);
      if (!(id in fonts)) {
        return {
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => ({}),
        } as Response;
      }
      return jsonResponse(fonts[id]);
    } finally {
      inFlight--;
    }
  }) as unknown as typeof fetch;

  return {
    impl,
    urls,
    signals,
    fontIds: () =>
      urls
        .filter((url) => /\/fonts\/[^/]+$/.test(url))
        .map((url) => url.slice(url.lastIndexOf("/") + 1)),
    peakInFlight: () => peak,
  };
}

describe("createFontsourceSuggester", () => {
  it("asks only the families whose subsets match the alphabet's script", async () => {
    const { impl, fontIds } = fontsourceFetch(CATALOG, allFontMetadata());
    const fonts = await createFontsourceSuggester({
      storage: memoryStorage(),
    }).suggestFontsForAlphabet("ก ข ค", { fetchImpl: impl });

    // Of the ten real families in the fixture, one claims the thai subset.
    expect(fontIds()).toEqual(["noto-sans-thai"]);
    expect(fonts.map((font) => font.family)).toEqual(["Noto Sans Thai"]);
  });

  it("goes through every request with the fetch it was given, and the caller's cancel reaches them", async () => {
    const { impl, signals, urls } = fontsourceFetch(CATALOG, allFontMetadata());
    const controller = new AbortController();
    await createFontsourceSuggester({
      storage: memoryStorage(),
      maxCandidates: 2,
    }).suggestFontsForAlphabet("a b", {
      fetchImpl: impl,
      signal: controller.signal,
    });

    expect(urls.length).toBe(3); // the catalog, then two families
    expect(signals.length).toBe(3);
    // Not the caller's signal itself — each request gets one composed with the
    // timeout — but the caller's cancellation must still flow through it.
    expect(signals.every((signal) => signal && !signal.aborted)).toBe(true);
  });

  it("cancelling mid-request aborts the fetch that is out", async () => {
    const controller = new AbortController();
    let seen: AbortSignal | undefined;
    const impl = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      seen = init?.signal ?? undefined;
      controller.abort();
      throw Object.assign(new Error("aborted"), { name: "AbortError" });
    }) as unknown as typeof fetch;

    await expect(
      createFontsourceSuggester({
        storage: memoryStorage(),
      }).suggestFontsForAlphabet("a b", {
        fetchImpl: impl,
        signal: controller.signal,
      })
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(seen?.aborted).toBe(true);
  });

  it("rethrows an abort rather than answering with nothing", async () => {
    const aborted = Object.assign(new Error("aborted"), {
      name: "AbortError",
    });
    const impl = vi.fn(async () => {
      throw aborted;
    }) as unknown as typeof fetch;

    await expect(
      createFontsourceSuggester({
        storage: memoryStorage(),
      }).suggestFontsForAlphabet("a b", { fetchImpl: impl })
    ).rejects.toBe(aborted);
  });

  it("says what went wrong when the catalog itself refuses", async () => {
    const impl = vi.fn(
      async () =>
        ({
          ok: false,
          status: 503,
          statusText: "Service Unavailable",
          json: async () => ({}),
        }) as Response
    ) as unknown as typeof fetch;

    await expect(
      createFontsourceSuggester({
        storage: memoryStorage(),
      }).suggestFontsForAlphabet("a b", { fetchImpl: impl })
    ).rejects.toThrow(/503 Service Unavailable/);
  });

  it("checks candidates on coverage even when it can't guess the script", async () => {
    const { impl, fontIds } = fontsourceFetch(CATALOG, allFontMetadata());
    const fonts = await createFontsourceSuggester({
      storage: memoryStorage(),
      maxCandidates: 3,
    }).suggestFontsForAlphabet("漢", { fetchImpl: impl });

    // Nothing in the guess table covers Han, so the subset filter is skipped and
    // the shortlist is checked the slow way — and none of it can write 漢.
    expect(fontIds().length).toBe(3);
    expect(fonts).toEqual([]);
  });

  it("stops at maxCandidates however many families the catalog offers", async () => {
    const { impl, fontIds } = fontsourceFetch(CATALOG, allFontMetadata());
    await createFontsourceSuggester({
      storage: memoryStorage(),
      maxCandidates: 2,
    }).suggestFontsForAlphabet("漢", { fetchImpl: impl });

    expect(fontIds()).toEqual(["andika", "noto-sans"]);
  });

  it("shortlists the most popular families when there are too many", async () => {
    const { impl, fontIds } = fontsourceFetch(CATALOG, allFontMetadata());
    const getPopularity = vi.fn(async () =>
      new Map([
        ["ubuntu", 1],
        ["noto sans", 2],
      ])
    );
    await createFontsourceSuggester({
      storage: memoryStorage(),
      maxCandidates: 2,
      getPopularity,
    }).suggestFontsForAlphabet("漢", { fetchImpl: impl });

    // Not Andika and Aclonica, the alphabetical first two: the ranked pair, in
    // rank order, with everything unranked behind them.
    expect(fontIds()).toEqual(["ubuntu", "noto-sans"]);
    expect(getPopularity).toHaveBeenCalledTimes(1);
  });

  it("keeps catalog order when the ranking can't be had", async () => {
    const { impl, fontIds } = fontsourceFetch(CATALOG, allFontMetadata());
    await createFontsourceSuggester({
      storage: memoryStorage(),
      maxCandidates: 2,
      getPopularity: async () => {
        throw new Error("metadata down");
      },
    }).suggestFontsForAlphabet("漢", { fetchImpl: impl });

    expect(fontIds()).toEqual(["andika", "noto-sans"]);
  });

  it("doesn't ask for the ranking when the shortlist fits everyone", async () => {
    const { impl } = fontsourceFetch(CATALOG, allFontMetadata());
    const getPopularity = vi.fn(async () => new Map<string, number>());
    await createFontsourceSuggester({
      storage: memoryStorage(),
      maxCandidates: 50,
      getPopularity,
    }).suggestFontsForAlphabet("ก ข ค", { fetchImpl: impl });

    expect(getPopularity).not.toHaveBeenCalled();
  });

  it("tries again without the subset filter when it leaves nothing", async () => {
    const { impl, fontIds } = fontsourceFetch(CATALOG, allFontMetadata());
    // No family in the fixture claims the hebrew subset, so a subset-filtered
    // shortlist is empty — but the guess is only a guess, so coverage still gets
    // its say.
    await createFontsourceSuggester({
      storage: memoryStorage(),
      maxCandidates: 1,
    }).suggestFontsForAlphabet("א ב", { fetchImpl: impl });

    expect(fontIds()).toEqual(["andika"]);
  });

  it("never runs more requests at once than it was allowed", async () => {
    const { impl, peakInFlight, fontIds } = fontsourceFetch(
      CATALOG,
      allFontMetadata()
    );
    await createFontsourceSuggester({
      storage: memoryStorage(),
      maxCandidates: 7,
      concurrency: 2,
    }).suggestFontsForAlphabet("漢", { fetchImpl: impl });

    expect(fontIds().length).toBe(7);
    expect(peakInFlight()).toBeLessThanOrEqual(2);
  });

  it("offers the subset file that holds the alphabet, not the family's default", async () => {
    const { impl } = fontsourceFetch(CATALOG, allFontMetadata());
    const fonts = await createFontsourceSuggester({
      storage: memoryStorage(),
    }).suggestFontsForAlphabet("ก ข ค", { fetchImpl: impl });

    // Noto Sans Thai's own defSubset is "latin", and its latin file cannot write
    // a word of Thai; the thai file is the one worth downloading.
    expect(fonts[0].fileUrl).toBe(
      "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-thai@latest/thai-400-normal.ttf"
    );
    expect(fonts[0].fileUrl).not.toContain("latin-");
  });

  it("keeps the default subset when nothing covers more of the alphabet", async () => {
    const tied = {
      ...CATALOG[0],
      id: "tied",
      family: "Tied",
      weights: [400],
      defSubset: "latin",
    };
    const { impl } = fontsourceFetch([tied], {
      tied: {
        id: "tied",
        weights: [400],
        defSubset: "latin",
        // Two subsets holding the alphabet equally well.
        unicodeRange: { "latin-ext": "U+0061-0062", latin: "U+0061-0062" },
      },
    });
    const fonts = await createFontsourceSuggester({
      storage: memoryStorage(),
    }).suggestFontsForAlphabet("a b", { fetchImpl: impl });

    expect(fonts[0].fileUrl).toBe(
      "https://cdn.jsdelivr.net/fontsource/fonts/tied@latest/latin-400-normal.ttf"
    );
  });

  it("builds a TTF url from the covering subset and the nearest weight", async () => {
    const heavy = {
      ...CATALOG[0],
      id: "heavy-only",
      family: "Heavy Only",
      weights: [500, 900],
      defSubset: "cyrillic",
    };
    const { impl } = fontsourceFetch([heavy], {
      "heavy-only": {
        ...andikaFixture,
        id: "heavy-only",
        weights: [500, 900],
        defSubset: "cyrillic",
      },
    });
    const fonts = await createFontsourceSuggester({
      storage: memoryStorage(),
    }).suggestFontsForAlphabet("a b", { fetchImpl: impl });

    expect(fonts).toEqual([
      {
        family: "Heavy Only",
        installed: false,
        license: "open",
        licenseUrl: "https://fontsource.org/fonts/heavy-only",
        // No 400, so the closest weight there is stands in for it — and the latin
        // file rather than the family's cyrillic default, since the alphabet is
        // Latin.
        fileUrl:
          "https://cdn.jsdelivr.net/fontsource/fonts/heavy-only@latest/latin-500-normal.ttf",
        // Andika's ranges stand in here, and they have five subsets: this one
        // file is a piece of the family, and says so.
        fileIsSubset: true,
        fileUnicodeRange: andikaFixture.unicodeRange.latin,
      },
    ]);
    expect(fonts[0].fileUrl?.endsWith(".ttf")).toBe(true);
  });

  it("offers every subset file the alphabet needs, ranges and all", async () => {
    const { impl } = fontsourceFetch(CATALOG, allFontMetadata());
    // á lives in Andika's latin subset, ā in latin-ext: writing both takes both
    // files. This is the Tongan case — offering only the bigger half had the
    // details pane warning about letters the family perfectly well covers.
    const fonts = await createFontsourceSuggester({
      storage: memoryStorage(),
      maxCandidates: 1,
    }).suggestFontsForAlphabet("a á ā", { fetchImpl: impl });

    expect(fonts[0].fileUrl).toBe(
      "https://cdn.jsdelivr.net/fontsource/fonts/andika@latest/latin-400-normal.ttf"
    );
    expect(fonts[0].fileIsSubset).toBe(true);
    expect(fonts[0].fileUnicodeRange).toBe(andikaFixture.unicodeRange.latin);
    expect(fonts[0].additionalFiles).toEqual([
      {
        url: "https://cdn.jsdelivr.net/fontsource/fonts/andika@latest/latin-ext-400-normal.ttf",
        unicodeRange: andikaFixture.unicodeRange["latin-ext"],
      },
    ]);
  });

  it("offers one file, marked as a subset, when one subset holds the alphabet", async () => {
    const { impl } = fontsourceFetch(CATALOG, allFontMetadata());
    const fonts = await createFontsourceSuggester({
      storage: memoryStorage(),
      maxCandidates: 1,
    }).suggestFontsForAlphabet("a b", { fetchImpl: impl });

    expect(fonts[0].additionalFiles).toBeUndefined();
    // Still one subset out of Andika's five: not the whole font.
    expect(fonts[0].fileIsSubset).toBe(true);
  });

  it("doesn't call a single-subset family's file a subset", async () => {
    const whole = {
      ...CATALOG[0],
      id: "whole",
      family: "Whole",
      subsets: ["latin"],
      weights: [400],
      defSubset: "latin",
    };
    const { impl } = fontsourceFetch([whole], {
      whole: {
        id: "whole",
        weights: [400],
        defSubset: "latin",
        unicodeRange: { latin: "U+0000-00FF" },
      },
    });
    const fonts = await createFontsourceSuggester({
      storage: memoryStorage(),
    }).suggestFontsForAlphabet("a b", { fetchImpl: impl });

    expect(fonts[0].fileIsSubset).toBeUndefined();
    expect(fonts[0].fileUnicodeRange).toBeUndefined();
    expect(fonts[0].additionalFiles).toBeUndefined();
  });

  it("offers the regular weight where the family has one", async () => {
    const { impl } = fontsourceFetch(CATALOG, allFontMetadata());
    const fonts = await createFontsourceSuggester({
      storage: memoryStorage(),
      maxCandidates: 1,
    }).suggestFontsForAlphabet("a b", { fetchImpl: impl });

    expect(fonts[0].fileUrl).toBe(
      "https://cdn.jsdelivr.net/fontsource/fonts/andika@latest/latin-400-normal.ttf"
    );
  });

  it("leaves out families whose licence isn't one we can hand over", async () => {
    const { impl, fontIds } = fontsourceFetch(CATALOG, allFontMetadata());
    await createFontsourceSuggester({
      storage: memoryStorage(),
      maxCandidates: 50,
    }).suggestFontsForAlphabet("漢", { fetchImpl: impl });

    // The fixture holds real CC0, MIT and Unlicense families; open means the OFL,
    // Apache 2.0 or the Ubuntu licence, and nothing else is asked about.
    expect(fontIds()).not.toContain("aileron");
    expect(fontIds()).not.toContain("comic-mono");
    expect(fontIds()).not.toContain("metropolis");
    expect(fontIds()).toContain("ubuntu");
    expect(fontIds()).toContain("aclonica");
  });

  it("keeps only the families the caller's filter accepts", async () => {
    const { impl, fontIds } = fontsourceFetch(CATALOG, allFontMetadata());
    await createFontsourceSuggester({
      storage: memoryStorage(),
      familyFilter: (family) => family.startsWith("Noto"),
    }).suggestFontsForAlphabet("a b", { fetchImpl: impl });

    expect(fontIds()).toEqual(["noto-sans", "noto-sans-thai"]);
  });

  it("asks the network once and the cache thereafter", async () => {
    const { impl, urls } = fontsourceFetch(CATALOG, allFontMetadata());
    const storage = memoryStorage();
    const suggester = createFontsourceSuggester({ storage });

    const first = await suggester.suggestFontsForAlphabet("ก ข ค", {
      fetchImpl: impl,
    });
    const asked = urls.length;
    const second = await suggester.suggestFontsForAlphabet("ก ข ค", {
      fetchImpl: impl,
    });

    expect(urls.length).toBe(asked);
    expect(second).toEqual(first);
    expect(storage.getItem(suggestionCacheKey("fontsource", "catalog"))).toBeTruthy();
    expect(
      storage.getItem(suggestionCacheKey("fontsource", "font.noto-sans-thai"))
    ).toBeTruthy();
  });

  it("drops the one family whose metadata it couldn't read, not the answer", async () => {
    const fonts = allFontMetadata();
    delete fonts["noto-sans"];
    const { impl } = fontsourceFetch(CATALOG, fonts);

    const suggested = await createFontsourceSuggester({
      storage: memoryStorage(),
      maxCandidates: 2,
    }).suggestFontsForAlphabet("a b", { fetchImpl: impl });

    expect(suggested.map((font) => font.family)).toEqual(["Andika"]);
  });

  it("asks nothing at all for an alphabet of punctuation and spaces", async () => {
    const { impl, urls } = fontsourceFetch(CATALOG, allFontMetadata());
    const fonts = await createFontsourceSuggester({
      storage: memoryStorage(),
    }).suggestFontsForAlphabet("  , . 1 2 ", { fetchImpl: impl });

    expect(fonts).toEqual([]);
    expect(urls).toEqual([]);
  });
});
