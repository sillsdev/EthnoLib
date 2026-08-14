import { describe, expect, it, vi } from "vitest";
import {
  createGoogleFontsFullFontUrlResolver,
  regularFilename,
} from "./googleFontsRepo";
import type { SuggestionCacheStorage } from "./suggestionCache";

/** A trimmed real METADATA.pb: italic first, so "first block" is a wrong answer. */
const ARIMO_METADATA = `name: "Arimo"
designer: "Steve Matteson"
license: "OFL"
category: "SANS_SERIF"
fonts {
  name: "Arimo"
  style: "italic"
  weight: 400
  filename: "Arimo-Italic[wght].ttf"
  post_script_name: "Arimo-Italic"
}
fonts {
  name: "Arimo"
  style: "normal"
  weight: 400
  filename: "Arimo[wght].ttf"
  post_script_name: "Arimo-Regular"
}
subsets: "latin"
subsets: "latin-ext"
`;

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

/** The repo mirror: METADATA.pb text per path, 404 for everything else. */
function repoFetch(files: Record<string, string>): {
  impl: typeof fetch;
  urls: string[];
} {
  const urls: string[] = [];
  const impl = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    urls.push(url);
    const path = url.replace("https://cdn.jsdelivr.net/gh/google/fonts@main/", "");
    if (path in files) {
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => files[path],
      } as Response;
    }
    return {
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: async () => "",
    } as Response;
  }) as unknown as typeof fetch;
  return { impl, urls };
}

describe("createGoogleFontsFullFontUrlResolver", () => {
  it("finds the family's upright file on its licence shelf", async () => {
    const { impl } = repoFetch({ "ofl/arimo/METADATA.pb": ARIMO_METADATA });
    const resolve = createGoogleFontsFullFontUrlResolver({
      storage: memoryStorage(),
    });

    expect(await resolve("Arimo", { fetchImpl: impl })).toBe(
      "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/arimo/Arimo%5Bwght%5D.ttf"
    );
  });

  it("probes the shelves in order until one answers", async () => {
    const { impl, urls } = repoFetch({
      "ufl/ubuntu/METADATA.pb": ARIMO_METADATA.replace(
        /Arimo(-Italic)?\[wght\]/g,
        "Ubuntu$1"
      ),
    });
    const resolve = createGoogleFontsFullFontUrlResolver({
      storage: memoryStorage(),
    });

    expect(await resolve("Ubuntu", { fetchImpl: impl })).toBe(
      "https://cdn.jsdelivr.net/gh/google/fonts@main/ufl/ubuntu/Ubuntu.ttf"
    );
    expect(urls).toEqual([
      "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/ubuntu/METADATA.pb",
      "https://cdn.jsdelivr.net/gh/google/fonts@main/apache/ubuntu/METADATA.pb",
      "https://cdn.jsdelivr.net/gh/google/fonts@main/ufl/ubuntu/METADATA.pb",
    ]);
  });

  it("shelves a spaced family name the way the repository does", async () => {
    const { impl, urls } = repoFetch({});
    const resolve = createGoogleFontsFullFontUrlResolver({
      storage: memoryStorage(),
    });

    await resolve("Noto Sans JP", { fetchImpl: impl });
    expect(urls[0]).toBe(
      "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosansjp/METADATA.pb"
    );
  });

  it("answers a family the repository hasn't got with undefined, and remembers", async () => {
    const { impl, urls } = repoFetch({});
    const storage = memoryStorage();
    const resolve = createGoogleFontsFullFontUrlResolver({ storage });

    expect(await resolve("Nowhere", { fetchImpl: impl })).toBeUndefined();
    const asked = urls.length;
    expect(await resolve("Nowhere", { fetchImpl: impl })).toBeUndefined();
    expect(urls.length).toBe(asked);
  });

  it("asks the network once and the cache thereafter", async () => {
    const { impl, urls } = repoFetch({
      "ofl/arimo/METADATA.pb": ARIMO_METADATA,
    });
    const resolve = createGoogleFontsFullFontUrlResolver({
      storage: memoryStorage(),
    });

    const first = await resolve("Arimo", { fetchImpl: impl });
    const asked = urls.length;
    expect(await resolve("Arimo", { fetchImpl: impl })).toBe(first);
    expect(urls.length).toBe(asked);
  });

  it("fails loudly, and caches nothing, when the repository answers strangely", async () => {
    const impl = vi.fn(
      async () =>
        ({
          ok: false,
          status: 503,
          statusText: "Service Unavailable",
          text: async () => "",
        }) as Response
    ) as unknown as typeof fetch;
    const storage = memoryStorage();
    const resolve = createGoogleFontsFullFontUrlResolver({ storage });

    await expect(resolve("Arimo", { fetchImpl: impl })).rejects.toThrow(
      /503 Service Unavailable/
    );
    expect(storage.length).toBe(0);
  });
});

describe("regularFilename", () => {
  it("prefers the upright 400 over the italic listed first", () => {
    expect(regularFilename(ARIMO_METADATA)).toBe("Arimo[wght].ttf");
  });

  it("takes any upright when there is no 400", () => {
    const metadata = ARIMO_METADATA.replace(
      'style: "normal"\n  weight: 400',
      'style: "normal"\n  weight: 500'
    );
    expect(regularFilename(metadata)).toBe("Arimo[wght].ttf");
  });

  it("takes the first named file when nothing is upright", () => {
    const metadata = ARIMO_METADATA.replace(/style: "normal"/g, 'style: "italic"');
    expect(regularFilename(metadata)).toBe("Arimo-Italic[wght].ttf");
  });

  it("reads nothing out of metadata with no fonts blocks", () => {
    expect(regularFilename('name: "Arimo"\n')).toBeUndefined();
  });
});
