import { describe, expect, it, vi } from "vitest";
import {
  fetchGoogleFontsCatalog,
  guessSubsetsForAlphabet,
  notoOnly,
} from "./googleFonts";

/** A fetch that answers every call with one canned body, and records the URLs. */
function fakeFetch(
  body: unknown,
  init: { ok?: boolean; status?: number; statusText?: string } = {}
): { impl: typeof fetch; urls: string[] } {
  const urls: string[] = [];
  const impl = vi.fn(async (input: RequestInfo | URL) => {
    urls.push(String(input));
    return {
      ok: init.ok ?? true,
      status: init.status ?? 200,
      statusText: init.statusText ?? "OK",
      json: async () => body,
    } as Response;
  }) as unknown as typeof fetch;
  return { impl, urls };
}

const TWO_FAMILIES = {
  items: [
    {
      family: "Noto Sans",
      variants: ["regular", "700"],
      subsets: ["latin", "latin-ext"],
      files: {
        "700": "https://fonts.gstatic.com/noto-sans-700.ttf",
        regular: "https://fonts.gstatic.com/noto-sans-regular.ttf",
      },
      category: "sans-serif",
      menu: "https://fonts.gstatic.com/noto-sans-menu.ttf",
    },
    {
      family: "Andika",
      variants: ["italic"],
      subsets: ["latin"],
      files: { italic: "https://fonts.gstatic.com/andika-italic.ttf" },
      category: "sans-serif",
    },
  ],
};

describe("fetchGoogleFontsCatalog", () => {
  it("maps the API's families to fonts the chooser can offer", async () => {
    const { impl } = fakeFetch(TWO_FAMILIES);
    const fonts = await fetchGoogleFontsCatalog({
      apiKey: "k",
      fetchImpl: impl,
    });

    expect(fonts).toEqual([
      {
        family: "Noto Sans",
        installed: false,
        license: "open",
        licenseUrl: "https://fonts.google.com/specimen/Noto+Sans",
        fileUrl: "https://fonts.gstatic.com/noto-sans-regular.ttf",
        previewFontUrl: "https://fonts.gstatic.com/noto-sans-menu.ttf",
      },
      {
        family: "Andika",
        installed: false,
        license: "open",
        licenseUrl: "https://fonts.google.com/specimen/Andika",
        // No regular weight, so the family's first file stands in for it.
        fileUrl: "https://fonts.gstatic.com/andika-italic.ttf",
      },
    ]);
  });

  it("asks for the key, sort and subset it was given, and nothing it wasn't", async () => {
    const { impl, urls } = fakeFetch({ items: [] });
    await fetchGoogleFontsCatalog({
      apiKey: "secret",
      sort: "popularity",
      subset: "cyrillic",
      fetchImpl: impl,
    });
    expect(urls[0]).toContain("key=secret");
    expect(urls[0]).toContain("sort=popularity");
    expect(urls[0]).toContain("subset=cyrillic");

    const bare = fakeFetch({ items: [] });
    await fetchGoogleFontsCatalog({ fetchImpl: bare.impl });
    expect(bare.urls[0]).toBe(
      "https://www.googleapis.com/webfonts/v1/webfonts"
    );
  });

  it("asks the host's own proxy when it has one, without a key", async () => {
    const { impl, urls } = fakeFetch({ items: [] });
    await fetchGoogleFontsCatalog({
      baseUrl: "https://example.org/fonts",
      sort: "alpha",
      fetchImpl: impl,
    });
    expect(urls[0]).toBe("https://example.org/fonts?sort=alpha");
  });

  it("keeps only the families the filter accepts", async () => {
    const { impl } = fakeFetch(TWO_FAMILIES);
    const fonts = await fetchGoogleFontsCatalog({
      familyFilter: notoOnly,
      fetchImpl: impl,
    });
    expect(fonts.map((font) => font.family)).toEqual(["Noto Sans"]);
  });

  it("says what went wrong when the API refuses", async () => {
    const { impl } = fakeFetch(
      {},
      { ok: false, status: 403, statusText: "Forbidden" }
    );
    await expect(
      fetchGoogleFontsCatalog({ apiKey: "bad", fetchImpl: impl })
    ).rejects.toThrow(/403 Forbidden/);
  });

  it("copes with a response carrying no families at all", async () => {
    const { impl } = fakeFetch({});
    await expect(fetchGoogleFontsCatalog({ fetchImpl: impl })).resolves.toEqual(
      []
    );
  });
});

describe("notoOnly", () => {
  it("matches the Noto families and nothing that merely starts like one", () => {
    expect(notoOnly("Noto Sans")).toBe(true);
    expect(notoOnly("Noto Serif Tamil")).toBe(true);
    expect(notoOnly("Notable")).toBe(false);
    expect(notoOnly("Andika")).toBe(false);
  });
});

describe("guessSubsetsForAlphabet", () => {
  it("reads plain Latin as latin", () => {
    expect(guessSubsetsForAlphabet("a b c")).toEqual(["latin"]);
  });

  it("adds latin-ext for letters beyond ASCII", () => {
    expect(guessSubsetsForAlphabet("a ə ŋ")).toEqual(["latin", "latin-ext"]);
  });

  it("reads Cyrillic as cyrillic", () => {
    expect(guessSubsetsForAlphabet("а б в")).toEqual(["cyrillic"]);
  });

  it("ignores digits and punctuation", () => {
    expect(guessSubsetsForAlphabet("a, b. 1 2")).toEqual(["latin"]);
  });

  it("says nothing when any letter is one it doesn't know", () => {
    expect(guessSubsetsForAlphabet("a 漢 ㄅ")).toEqual([]);
    expect(guessSubsetsForAlphabet("字")).toEqual([]);
  });
});
