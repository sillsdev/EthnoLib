import { describe, expect, it, vi } from "vitest";
import { fetchFontFileSize } from "./fontFileSize";

/** A fetch that answers with the headers it is given, and records how it was called. */
function fakeFetch(
  headers: Record<string, string>,
  init: { ok?: boolean; status?: number } = {}
): { impl: typeof fetch; calls: { url: string; method?: string }[] } {
  const calls: { url: string; method?: string }[] = [];
  const impl = vi.fn(
    async (input: RequestInfo | URL, options?: RequestInit) => {
      calls.push({ url: String(input), method: options?.method });
      return {
        ok: init.ok ?? true,
        status: init.status ?? 200,
        headers: new Headers(headers),
      } as Response;
    }
  ) as unknown as typeof fetch;
  return { impl, calls };
}

describe("fetchFontFileSize", () => {
  it("reads the size out of Content-Length, asking only for the headers", async () => {
    const { impl, calls } = fakeFetch({ "content-length": "1148372" });
    await expect(
      fetchFontFileSize("https://fonts.example/andika.ttf", { fetchImpl: impl })
    ).resolves.toBe(1148372);
    expect(calls[0]).toEqual({
      url: "https://fonts.example/andika.ttf",
      method: "HEAD",
    });
  });

  it("says nothing when the server sends no length", async () => {
    const { impl } = fakeFetch({});
    await expect(
      fetchFontFileSize("https://fonts.example/andika.ttf", { fetchImpl: impl })
    ).resolves.toBeUndefined();
  });

  it("says nothing when the server refuses the request", async () => {
    const { impl } = fakeFetch(
      { "content-length": "1148372" },
      { ok: false, status: 405 }
    );
    await expect(
      fetchFontFileSize("https://fonts.example/andika.ttf", { fetchImpl: impl })
    ).resolves.toBeUndefined();
  });

  it("says nothing when the request never lands", async () => {
    const impl = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    await expect(
      fetchFontFileSize("https://fonts.example/andika.ttf", { fetchImpl: impl })
    ).resolves.toBeUndefined();
  });

  it("treats a length that isn't a number as no answer", async () => {
    const { impl } = fakeFetch({ "content-length": "unknown" });
    await expect(
      fetchFontFileSize("https://fonts.example/andika.ttf", { fetchImpl: impl })
    ).resolves.toBeUndefined();
  });
});
