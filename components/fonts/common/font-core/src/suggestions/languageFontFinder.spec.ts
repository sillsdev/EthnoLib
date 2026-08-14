import { describe, expect, it, vi } from "vitest";
import { createLanguageFontFinderSuggester } from "./languageFontFinder";
import {
  suggestionCacheKey,
  type SuggestionCacheStorage,
} from "./suggestionCache";
import thaiFixture from "./fixtures/lffThai.json";

/**
 * `lffThai.json` is the service's real answer for `th` (see fixtures/README.md):
 * three families, all three marked default, and — usefully — one of them (Sarabun)
 * listing no downloadable file at all.
 */
const THAI = thaiFixture as unknown as LffBody;

interface LffBody {
  roles?: { default?: string[] };
  defaultfamily?: string[];
  families: Record<
    string,
    {
      family?: string;
      license?: string;
      distributable?: boolean;
      defaults?: { ttf?: string };
      files?: Record<string, { axes?: { wght?: number; ital?: number }; url?: string }>;
      siteurl?: string;
    }
  >;
}

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

/** A stand-in for the service, recording what it was asked and with what. */
function lffFetch(
  body: unknown,
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
      json: async () => body,
    } as Response;
  }) as unknown as typeof fetch;
  return { impl, urls, signals };
}

/** The Thai fixture with one family changed, for cases the real answer lacks. */
function thaiWith(
  id: string,
  changes: Partial<LffBody["families"][string]>
): LffBody {
  return {
    ...THAI,
    families: {
      ...THAI.families,
      [id]: { ...THAI.families[id], ...changes },
    },
  };
}

describe("createLanguageFontFinderSuggester", () => {
  it("offers the language's default families first, in the service's order", async () => {
    const { impl, urls } = lffFetch(THAI);
    const fonts = await createLanguageFontFinderSuggester({
      storage: memoryStorage(),
    }).suggestFontsForLanguage("th", { fetchImpl: impl });

    expect(urls).toEqual(["https://lff.api.languagetechnology.org/lang/th"]);
    // roles.default is [notosansthai, notoserifthai, sarabun], and Sarabun has no
    // file to fetch, so it doesn't reach the user.
    expect(fonts).toEqual([
      {
        family: "Noto Sans Thai",
        installed: false,
        license: "open",
        fileUrl:
          "https://raw.githubusercontent.com/notofonts/notofonts.github.io/main/fonts/NotoSansThai/full/ttf/NotoSansThai-Regular.ttf",
        licenseUrl: "https://openfontlicense.org/",
        supportsLanguage: true,
        supportsLanguageSource: {
          name: "the SIL Global Language Font Finder",
          url: "https://lff.api.languagetechnology.org/lang/th",
        },
      },
      {
        family: "Noto Serif Thai",
        installed: false,
        license: "open",
        fileUrl:
          "https://raw.githubusercontent.com/notofonts/notofonts.github.io/main/fonts/NotoSerifThai/full/ttf/NotoSerifThai-Regular.ttf",
        licenseUrl: "https://openfontlicense.org/",
        supportsLanguage: true,
        supportsLanguageSource: {
          name: "the SIL Global Language Font Finder",
          url: "https://lff.api.languagetechnology.org/lang/th",
        },
      },
    ]);
  });

  it("puts the roles.default families ahead of families it merely knows", async () => {
    const body: LffBody = {
      roles: { default: ["notoserifthai"] },
      families: THAI.families,
    };
    const { impl } = lffFetch(body);
    const fonts = await createLanguageFontFinderSuggester({
      storage: memoryStorage(),
    }).suggestFontsForLanguage("th", { fetchImpl: impl });

    // The default first, then whatever else is left, alphabetically by id.
    expect(fonts.map((font) => font.family)).toEqual([
      "Noto Serif Thai",
      "Noto Sans Thai",
    ]);
  });

  it("offers only the defaults when asked to", async () => {
    const body: LffBody = {
      roles: { default: ["notoserifthai"] },
      families: THAI.families,
    };
    const { impl } = lffFetch(body);
    const fonts = await createLanguageFontFinderSuggester({
      storage: memoryStorage(),
      defaultsOnly: true,
    }).suggestFontsForLanguage("th", { fetchImpl: impl });

    expect(fonts.map((font) => font.family)).toEqual(["Noto Serif Thai"]);
  });

  it("leaves out a font we are told not to distribute", async () => {
    const { impl } = lffFetch(
      thaiWith("notosansthai", { distributable: false })
    );
    const fonts = await createLanguageFontFinderSuggester({
      storage: memoryStorage(),
    }).suggestFontsForLanguage("th", { fetchImpl: impl });

    expect(fonts.map((font) => font.family)).toEqual(["Noto Serif Thai"]);
  });

  it("leaves out a family with no TTF to fetch", async () => {
    const { impl } = lffFetch(THAI);
    const fonts = await createLanguageFontFinderSuggester({
      storage: memoryStorage(),
    }).suggestFontsForLanguage("th", { fetchImpl: impl });

    // Sarabun's files carry a package path and no url, which is real: the service
    // has the font but nowhere for us to download a single file from.
    expect(fonts.map((font) => font.family)).not.toContain("Sarabun");
  });

  it("moves a github.com download to the host that allows cross-origin reads", async () => {
    const { impl } = lffFetch(
      thaiWith("notoserifthai", {
        files: {
          "NotoSerifThai-Regular.ttf": {
            axes: { wght: 400, ital: 0 },
            url: "https://github.com/notofonts/notofonts.github.io/raw/refs/heads/main/fonts/NotoSerifThai/full/ttf/NotoSerifThai-Regular.ttf",
          },
        },
        defaults: { ttf: "NotoSerifThai-Regular.ttf" },
      })
    );
    const fonts = await createLanguageFontFinderSuggester({
      storage: memoryStorage(),
    }).suggestFontsForLanguage("th", { fetchImpl: impl });

    // Whatever follows /raw/ is the ref and the path, carried across untouched —
    // the refs/heads/{branch} spelling included.
    expect(fonts[1].fileUrl).toBe(
      "https://raw.githubusercontent.com/notofonts/notofonts.github.io/refs/heads/main/fonts/NotoSerifThai/full/ttf/NotoSerifThai-Regular.ttf"
    );
    // The licence link goes to the licence itself, not the font's release page.
    expect(fonts[1].licenseUrl).toBe("https://openfontlicense.org/");
  });

  it("leaves a download somewhere else exactly as it came", async () => {
    const { impl } = lffFetch({
      roles: { default: ["elsewhere"] },
      families: {
        elsewhere: {
          family: "Elsewhere",
          license: "OFL",
          files: {
            "Elsewhere-Regular.ttf": {
              axes: { wght: 400, ital: 0 },
              url: "https://software.sil.org/fonts/Elsewhere-Regular.ttf",
            },
          },
        },
      },
    });
    const fonts = await createLanguageFontFinderSuggester({
      storage: memoryStorage(),
    }).suggestFontsForLanguage("qqq", { fetchImpl: impl });

    expect(fonts[0].fileUrl).toBe(
      "https://software.sil.org/fonts/Elsewhere-Regular.ttf"
    );
  });

  it("falls back to an upright regular weight, then to any TTF at all", async () => {
    const bold = {
      family: "Bold Only",
      license: "OFL",
      files: {
        "BoldOnly-Bold.ttf": {
          axes: { wght: 700, ital: 0 },
          url: "https://example.org/BoldOnly-Bold.ttf",
        },
      },
    };
    const regular = {
      family: "Regular Somewhere",
      license: "OFL",
      files: {
        "Somewhere-Italic.ttf": {
          axes: { wght: 400, ital: 1 },
          url: "https://example.org/Somewhere-Italic.ttf",
        },
        "Somewhere-Regular.ttf": {
          axes: { wght: 400, ital: 0 },
          url: "https://example.org/Somewhere-Regular.ttf",
        },
      },
    };
    const { impl } = lffFetch({
      roles: { default: ["regular", "bold"] },
      families: { regular, bold },
    });
    const fonts = await createLanguageFontFinderSuggester({
      storage: memoryStorage(),
    }).suggestFontsForLanguage("qqq", { fetchImpl: impl });

    expect(fonts.map((font) => font.fileUrl)).toEqual([
      "https://example.org/Somewhere-Regular.ttf",
      "https://example.org/BoldOnly-Bold.ttf",
    ]);
  });

  it("reads OFL and Apache as open, and says it doesn't know about anything else", async () => {
    const body = thaiWith("notoserifthai", { license: "Bespoke-EULA" });
    const { impl } = lffFetch({
      ...body,
      families: {
        ...body.families,
        notosansthai: {
          ...body.families.notosansthai,
          license: "Apache-2.0",
        },
      },
    });
    const fonts = await createLanguageFontFinderSuggester({
      storage: memoryStorage(),
    }).suggestFontsForLanguage("th", { fetchImpl: impl });

    expect(fonts.map((font) => font.license)).toEqual(["open", "unknown"]);
  });

  it("takes a language the service has never heard of as an answer, and keeps it", async () => {
    const { impl, urls } = lffFetch({}, 404);
    const storage = memoryStorage();
    const suggester = createLanguageFontFinderSuggester({ storage });

    expect(await suggester.suggestFontsForLanguage("zz", { fetchImpl: impl })).toEqual(
      []
    );
    expect(await suggester.suggestFontsForLanguage("ZZ ", { fetchImpl: impl })).toEqual(
      []
    );
    // Asked once; the tag is folded to lower case and trimmed, so the second call
    // reads the same entry.
    expect(urls.length).toBe(1);
    expect(storage.getItem(suggestionCacheKey("lff", "lang.zz"))).toContain(
      "missing"
    );
  });

  it("answers a second time from the cache", async () => {
    const { impl, urls } = lffFetch(THAI);
    const storage = memoryStorage();
    const suggester = createLanguageFontFinderSuggester({ storage });

    const first = await suggester.suggestFontsForLanguage("th", {
      fetchImpl: impl,
    });
    const second = await suggester.suggestFontsForLanguage("th", {
      fetchImpl: impl,
    });

    expect(urls.length).toBe(1);
    expect(second).toEqual(first);
  });

  it("goes through the fetch it was given with a live signal on the request", async () => {
    const { impl, signals } = lffFetch(THAI);
    const controller = new AbortController();
    await createLanguageFontFinderSuggester({
      storage: memoryStorage(),
    }).suggestFontsForLanguage("th", {
      fetchImpl: impl,
      signal: controller.signal,
    });

    // Not the caller's signal itself — the request gets one composed with the
    // timeout — but a signal must be there and must not have fired.
    expect(signals).toHaveLength(1);
    expect(signals[0] && !signals[0].aborted).toBe(true);
  });

  it("rethrows an abort rather than answering with nothing", async () => {
    const aborted = Object.assign(new Error("aborted"), { name: "AbortError" });
    const impl = vi.fn(async () => {
      throw aborted;
    }) as unknown as typeof fetch;

    await expect(
      createLanguageFontFinderSuggester({
        storage: memoryStorage(),
      }).suggestFontsForLanguage("th", { fetchImpl: impl })
    ).rejects.toBe(aborted);
  });

  it("throws when the service is broken rather than reporting no fonts", async () => {
    const { impl } = lffFetch({}, 500);
    await expect(
      createLanguageFontFinderSuggester({
        storage: memoryStorage(),
      }).suggestFontsForLanguage("th", { fetchImpl: impl })
    ).rejects.toThrow(/500/);
  });
});
