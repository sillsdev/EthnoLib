import { describe, expect, it, vi } from "vitest";
import { createSldrAlphabetProvider } from "./sldrAlphabet";
import {
  suggestionCacheKey,
  type SuggestionCacheStorage,
} from "./suggestionCache";
// The repository's real LDML for `th`, cut down to the characters section (see
// fixtures/README.md). It carries the main exemplar set and the typed siblings
// beside it, which is the whole difficulty this provider deals with.
import thaiLdml from "./fixtures/sldrThai.xml?raw";

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

describe("createSldrAlphabetProvider", () => {
  it("reads the main exemplar set of a real LDML file", async () => {
    const { impl, urls } = sldrFetch(thaiLdml);
    const alphabet = await createSldrAlphabetProvider({
      storage: memoryStorage(),
    }).getAlphabet("th", { fetchImpl: impl });

    expect(urls).toEqual(["https://ldml.api.sil.org/th?inc[]=characters"]);
    expect(alphabet).toContain("ก ข ฃ ค");
    expect(alphabet?.split(" ").length).toBeGreaterThan(60);
  });

  it("takes the main set and none of its typed siblings", async () => {
    const { impl } = sldrFetch(thaiLdml);
    const alphabet = await createSldrAlphabetProvider({
      storage: memoryStorage(),
    }).getAlphabet("th", { fetchImpl: impl });
    const entries = alphabet?.split(" ") ?? [];

    // The auxiliary set is a zero-width space, and the punctuation set has ASCII
    // quotes and brackets; neither belongs in the alphabet the user is shown.
    expect(entries).not.toContain("\u200B");
    expect(entries).not.toContain("(");
    expect(entries).not.toContain("…");
    // The numbers set has the digits, and the main set does not.
    expect(entries).not.toContain("5");
  });

  it("decodes XML entities before reading the set", async () => {
    const xml = `<ldml><characters><exemplarCharacters>[a &amp; b &lt; &gt; &quot; &apos; &#x1F00; &#123;kh&#125;]</exemplarCharacters>
      <exemplarCharacters type="auxiliary">[z]</exemplarCharacters></characters></ldml>`;
    const { impl } = sldrFetch(xml);
    const alphabet = await createSldrAlphabetProvider({
      storage: memoryStorage(),
    }).getAlphabet("qqq", { fetchImpl: impl });

    // Decoding comes first, and then the set is read: &#123;kh&#125; is {kh},
    // which is one two-letter item and not three characters.
    expect(alphabet?.split(" ")).toEqual([
      "a",
      "&",
      "b",
      "<",
      ">",
      '"',
      "'",
      "ἀ",
      "kh",
    ]);
  });

  it("answers a second time from the cache", async () => {
    const { impl, urls } = sldrFetch(thaiLdml);
    const storage = memoryStorage();
    const provider = createSldrAlphabetProvider({ storage });

    const first = await provider.getAlphabet("th", { fetchImpl: impl });
    const second = await provider.getAlphabet(" TH ", { fetchImpl: impl });

    expect(urls.length).toBe(1);
    expect(second).toBe(first);
    expect(storage.getItem(suggestionCacheKey("sldr", "lang.th"))).toBeTruthy();
  });

  it("has nothing for a language the repository hasn't got, and keeps that", async () => {
    const { impl, urls } = sldrFetch("", 404);
    const storage = memoryStorage();
    const provider = createSldrAlphabetProvider({ storage });

    expect(await provider.getAlphabet("zz", { fetchImpl: impl })).toBeUndefined();
    expect(await provider.getAlphabet("zz", { fetchImpl: impl })).toBeUndefined();
    expect(urls.length).toBe(1);
    expect(storage.getItem(suggestionCacheKey("sldr", "lang.zz"))).toContain(
      "missing"
    );
  });

  it("has nothing for a file with no main exemplar set", async () => {
    const { impl } = sldrFetch(
      `<ldml><characters><exemplarCharacters type="index">[a b]</exemplarCharacters></characters></ldml>`
    );
    const alphabet = await createSldrAlphabetProvider({
      storage: memoryStorage(),
    }).getAlphabet("qqq", { fetchImpl: impl });

    expect(alphabet).toBeUndefined();
  });

  it("reads a main set that carries a draft attribute", async () => {
    // The repository's real `ffm`: the whole alphabet sits in an element marked
    // draft="unconfirmed", which is the usual state of a minority language's file.
    const { impl } = sldrFetch(
      `<ldml><characters><exemplarCharacters draft="unconfirmed">[a b ɓ ƴ]</exemplarCharacters>
        <exemplarCharacters type="auxiliary" draft="unconfirmed">[q v x z]</exemplarCharacters></characters></ldml>`
    );
    const alphabet = await createSldrAlphabetProvider({
      storage: memoryStorage(),
    }).getAlphabet("ffm", { fetchImpl: impl });

    expect(alphabet).toBe("a b ɓ ƴ");
  });

  it("asks about shorter and shorter tags until one has an alphabet", async () => {
    const urls: string[] = [];
    const impl = vi.fn(async (input: RequestInfo | URL) => {
      urls.push(String(input));
      const found = String(input).includes("/ffm?");
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () =>
          found
            ? `<ldml><characters><exemplarCharacters>[a b ɓ]</exemplarCharacters></characters></ldml>`
            : // 200 with nothing we can use, which is what a region-specific tag
              // gives back: an answer, and not an alphabet.
              `<ldml><characters><exemplarCharacters type="index">[A B]</exemplarCharacters></characters></ldml>`,
      } as Response;
    }) as unknown as typeof fetch;
    const storage = memoryStorage();

    const alphabet = await createSldrAlphabetProvider({ storage }).getAlphabet(
      "ffm-Latn-SN",
      { fetchImpl: impl }
    );

    expect(alphabet).toBe("a b ɓ");
    expect(urls).toEqual([
      "https://ldml.api.sil.org/ffm-Latn-SN?inc[]=characters",
      "https://ldml.api.sil.org/ffm-Latn?inc[]=characters",
      "https://ldml.api.sil.org/ffm?inc[]=characters",
    ]);
    // The two misses are remembered as misses, so the next visit starts at ffm.
    expect(
      storage.getItem(suggestionCacheKey("sldr", "lang.ffm-latn-sn"))
    ).toContain("missing");
    expect(storage.getItem(suggestionCacheKey("sldr", "lang.ffm"))).toContain(
      "a b ɓ"
    );
  });

  it("stops at the first tag with an alphabet", async () => {
    const { impl, urls } = sldrFetch(thaiLdml);
    await createSldrAlphabetProvider({ storage: memoryStorage() }).getAlphabet(
      "th-Thai-TH",
      { fetchImpl: impl }
    );

    expect(urls).toEqual([
      "https://ldml.api.sil.org/th-Thai-TH?inc[]=characters",
    ]);
  });

  it("asks the tags the host names instead of the shorter ones", async () => {
    const { impl, urls } = sldrFetch("", 404);
    const alphabet = await createSldrAlphabetProvider({
      storage: memoryStorage(),
      // A macrolanguage stands in for its members, which is knowledge this
      // package hasn't got and the host has.
      fallbackTagsFor: (tag) => (tag === "ffm" ? ["ff"] : []),
    }).getAlphabet("ffm", { fetchImpl: impl });

    expect(alphabet).toBeUndefined();
    expect(urls).toEqual([
      "https://ldml.api.sil.org/ffm?inc[]=characters",
      "https://ldml.api.sil.org/ff?inc[]=characters",
    ]);
  });

  it("goes through the fetch it was given and forwards the signal", async () => {
    const { impl, signals } = sldrFetch(thaiLdml);
    const controller = new AbortController();
    await createSldrAlphabetProvider({ storage: memoryStorage() }).getAlphabet(
      "th",
      { fetchImpl: impl, signal: controller.signal }
    );

    expect(signals).toEqual([controller.signal]);
  });

  it("rethrows an abort rather than answering with nothing", async () => {
    const aborted = Object.assign(new Error("aborted"), { name: "AbortError" });
    const impl = vi.fn(async () => {
      throw aborted;
    }) as unknown as typeof fetch;

    await expect(
      createSldrAlphabetProvider({ storage: memoryStorage() }).getAlphabet("th", {
        fetchImpl: impl,
      })
    ).rejects.toBe(aborted);
  });

  it("throws when the repository is broken rather than reporting no alphabet", async () => {
    const { impl } = sldrFetch("", 500);
    await expect(
      createSldrAlphabetProvider({ storage: memoryStorage() }).getAlphabet("th", {
        fetchImpl: impl,
      })
    ).rejects.toThrow(/500/);
  });
});
