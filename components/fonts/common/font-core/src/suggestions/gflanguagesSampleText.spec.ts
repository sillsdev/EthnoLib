import { describe, expect, it, vi } from "vitest";
import { createGflanguagesSampleTextProvider } from "./gflanguagesSampleText";
import {
  suggestionCacheKey,
  type SuggestionCacheStorage,
} from "./suggestionCache";
// The data set's real file for Thai (see fixtures/README.md): an exemplar_chars
// block, then the sample_text block with all ten of its fields, escaped newlines
// and escaped quotes included.
import thaiTextproto from "./fixtures/gflanguagesThai.textproto?raw";

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

/** A stand-in for the data set, recording what it was asked and with what. */
function gflanguagesFetch(
  body: string,
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
      text: async () => body,
    } as Response;
  }) as unknown as typeof fetch;
  return { impl, urls, signals };
}

const BASE =
  "https://raw.githubusercontent.com/googlefonts/lang/main/Lib/gflanguages/data/languages";

describe("createGflanguagesSampleTextProvider", () => {
  it("reads the reading-size passage out of a real file", async () => {
    const { impl, urls } = gflanguagesFetch(thaiTextproto);
    const sample = await createGflanguagesSampleTextProvider({
      storage: memoryStorage(),
    }).getSampleText("th-Thai", { fetchImpl: impl });

    expect(urls).toEqual([`${BASE}/th_Thai.textproto`]);
    expect(sample).toContain("โดยที่การยอมรับศักดิ์ศรีแต่กำเนิด");
    // specimen_21 and not the shorter masthead or the longer specimen_16: the
    // first of the preferred fields the file has.
    expect(sample).not.toContain("โดยที่เป็นการจำเป็นที่สิทธิมนุษยชนควรได้รับความคุ้มครอง");
    // Its escaped newline is a newline, not a backslash and an n.
    expect(sample).toContain("\n");
    expect(sample).not.toContain("\\n");
  });

  it("takes the fields in order, and one field's value only", async () => {
    const { impl } = gflanguagesFetch(`id: "qq_Latn"
sample_text {
  masthead_full: "Qq"
  tester: "The tester passage."
  styles: "The styles passage."
}
`);
    const sample = await createGflanguagesSampleTextProvider({
      storage: memoryStorage(),
    }).getSampleText("qq", { fetchImpl: impl });

    expect(sample).toBe("The tester passage.");
  });

  it("unescapes quotes and backslashes as well as newlines", async () => {
    const { impl } = gflanguagesFetch(
      `sample_text {\n  specimen_21: "He said \\"stop\\",\\nthen wrote C:\\\\path"\n}\n`
    );
    const sample = await createGflanguagesSampleTextProvider({
      storage: memoryStorage(),
    }).getSampleText("qq", { fetchImpl: impl });

    expect(sample).toBe('He said "stop",\nthen wrote C:\\path');
  });

  it("stops at the end of the sample_text block", async () => {
    const { impl } = gflanguagesFetch(`sample_text {
  specimen_21: "The passage."
}
note {
  specimen_21: "Not the passage."
}
`);
    const sample = await createGflanguagesSampleTextProvider({
      storage: memoryStorage(),
    }).getSampleText("qq", { fetchImpl: impl });

    expect(sample).toBe("The passage.");
  });

  it("has nothing for a file with an empty sample_text block", async () => {
    const { impl } = gflanguagesFetch(`sample_text {\n}\n`);
    const sample = await createGflanguagesSampleTextProvider({
      storage: memoryStorage(),
    }).getSampleText("qq", { fetchImpl: impl });

    expect(sample).toBeUndefined();
  });

  it("has nothing for a file with none of the fields it draws with", async () => {
    const { impl } = gflanguagesFetch(
      `sample_text {\n  masthead_full: "Qq"\n  poster_lg: "Qq qq"\n}\n`
    );
    const sample = await createGflanguagesSampleTextProvider({
      storage: memoryStorage(),
    }).getSampleText("qq", { fetchImpl: impl });

    expect(sample).toBeUndefined();
  });

  it("takes the script from the tag, then from the host, then assumes Latin", async () => {
    const ask = async (
      tag: string,
      scriptFor?: (languageTag: string) => string | undefined
    ) => {
      const { impl, urls } = gflanguagesFetch(thaiTextproto);
      await createGflanguagesSampleTextProvider({
        storage: memoryStorage(),
        scriptFor,
      }).getSampleText(tag, { fetchImpl: impl });
      return urls[0];
    };

    // The tag's own script subtag settles it, whatever the host would have said.
    expect(await ask("sr-Cyrl-RS", () => "Latn")).toBe(
      `${BASE}/sr_Cyrl.textproto`
    );
    // Spelled the way the file names are, however the tag spelled it.
    expect(await ask("TH-thai")).toBe(`${BASE}/th_Thai.textproto`);
    // No script in the tag: the host is asked.
    expect(await ask("th-TH", () => "Thai")).toBe(`${BASE}/th_Thai.textproto`);
    // Nobody knows: Latin, which is what most script-less tags mean.
    expect(await ask("qq-XX")).toBe(`${BASE}/qq_Latn.textproto`);
    expect(await ask("qq", () => undefined)).toBe(`${BASE}/qq_Latn.textproto`);
  });

  it("has nothing for a language the data set hasn't got, and keeps that", async () => {
    const { impl, urls } = gflanguagesFetch("", 404);
    const storage = memoryStorage();
    const provider = createGflanguagesSampleTextProvider({ storage });

    expect(await provider.getSampleText("zz", { fetchImpl: impl })).toBeUndefined();
    expect(await provider.getSampleText("zz", { fetchImpl: impl })).toBeUndefined();
    expect(urls.length).toBe(1);
    expect(
      storage.getItem(suggestionCacheKey("gflanguages", "sample.zz_Latn"))
    ).toContain("missing");
  });

  it("answers a second time from the cache", async () => {
    const { impl, urls } = gflanguagesFetch(thaiTextproto);
    const storage = memoryStorage();
    const provider = createGflanguagesSampleTextProvider({ storage });

    const first = await provider.getSampleText("th-Thai", { fetchImpl: impl });
    // The same file under another spelling of the same tag, so the second call
    // reads the entry the first one wrote.
    const second = await provider.getSampleText(" TH-thai ", { fetchImpl: impl });

    expect(urls.length).toBe(1);
    expect(second).toBe(first);
    expect(
      storage.getItem(suggestionCacheKey("gflanguages", "sample.th_Thai"))
    ).toBeTruthy();
  });

  it("goes through the fetch it was given and forwards the signal", async () => {
    const { impl, signals } = gflanguagesFetch(thaiTextproto);
    const controller = new AbortController();
    await createGflanguagesSampleTextProvider({
      storage: memoryStorage(),
    }).getSampleText("th", { fetchImpl: impl, signal: controller.signal });

    expect(signals).toEqual([controller.signal]);
  });

  it("rethrows an abort rather than answering with nothing", async () => {
    const aborted = Object.assign(new Error("aborted"), { name: "AbortError" });
    const impl = vi.fn(async () => {
      throw aborted;
    }) as unknown as typeof fetch;

    await expect(
      createGflanguagesSampleTextProvider({
        storage: memoryStorage(),
      }).getSampleText("th", { fetchImpl: impl })
    ).rejects.toBe(aborted);
  });

  it("throws when the data set is unreachable rather than reporting no sample", async () => {
    const { impl } = gflanguagesFetch("", 500);
    await expect(
      createGflanguagesSampleTextProvider({
        storage: memoryStorage(),
      }).getSampleText("th", { fetchImpl: impl })
    ).rejects.toThrow(/500/);
  });
});
