import { describe, expect, it, vi } from "vitest";
import {
  createGoogleFontsUrlFontResolver,
  parseGoogleFontsFamily,
} from "./googleFontsUrl";

describe("parseGoogleFontsFamily", () => {
  it("reads the family out of a specimen address", () => {
    expect(
      parseGoogleFontsFamily("https://fonts.google.com/specimen/Andika")
    ).toBe("Andika");
  });

  it("reads one filed under a collection, with + for spaces", () => {
    expect(
      parseGoogleFontsFamily(
        "https://fonts.google.com/noto/specimen/Noto+Sans+Thai"
      )
    ).toBe("Noto Sans Thai");
  });

  it("ignores a query, a fragment and a trailing slash", () => {
    expect(
      parseGoogleFontsFamily(
        "https://fonts.google.com/specimen/Roboto+Slab/?query=slab#about"
      )
    ).toBe("Roboto Slab");
  });

  it("forgives a missing scheme and a www, as an address bar copy has", () => {
    expect(parseGoogleFontsFamily("fonts.google.com/specimen/Andika")).toBe(
      "Andika"
    );
    expect(
      parseGoogleFontsFamily("https://www.fonts.google.com/specimen/Andika")
    ).toBe("Andika");
  });

  it("decodes an escaped character in the family", () => {
    expect(
      parseGoogleFontsFamily("https://fonts.google.com/specimen/Rock%203D")
    ).toBe("Rock 3D");
  });

  it("says nothing about anything that is not such an address", () => {
    for (const url of [
      "",
      "   ",
      "not a url",
      "https://fonts.google.com",
      "https://fonts.google.com/specimen",
      "https://fonts.google.com/?query=andika",
      "https://example.com/specimen/Andika",
      // A near miss on the host: a look-alike domain must not be trusted with
      // an address the chooser is about to download from.
      "https://fonts.google.com.evil.test/specimen/Andika",
      "javascript:alert(1)//fonts.google.com/specimen/Andika",
    ]) {
      expect(parseGoogleFontsFamily(url), url).toBeUndefined();
    }
  });
});

describe("createGoogleFontsUrlFontResolver", () => {
  it("returns the family's whole font file as an open-licensed entry", async () => {
    const findFontFile = vi
      .fn()
      .mockResolvedValue("https://cdn.test/ofl/andika/Andika-Regular.ttf");
    const resolve = createGoogleFontsUrlFontResolver({ findFontFile });

    const font = await resolve("https://fonts.google.com/specimen/Andika");

    expect(findFontFile).toHaveBeenCalledWith("Andika", {});
    expect(font).toEqual({
      family: "Andika",
      installed: false,
      location: "network",
      license: "open",
      licenseUrl: "https://fonts.google.com/specimen/Andika",
      fileUrl: "https://cdn.test/ofl/andika/Andika-Regular.ttf",
    });
    // Not a subset, so nothing has to be looked up again when it is chosen.
    expect(font.fileIsSubset).toBeUndefined();
  });

  it("writes the family's spaces back as + in the licence link", async () => {
    const resolve = createGoogleFontsUrlFontResolver({
      findFontFile: async () => "https://cdn.test/x.ttf",
    });
    const font = await resolve(
      "https://fonts.google.com/noto/specimen/Noto+Sans+Thai"
    );
    expect(font.licenseUrl).toBe(
      "https://fonts.google.com/specimen/Noto+Sans+Thai"
    );
  });

  it("complains about an address it cannot read, without asking anybody", async () => {
    const findFontFile = vi.fn();
    const resolve = createGoogleFontsUrlFontResolver({ findFontFile });
    await expect(resolve("https://example.com/Andika")).rejects.toThrow(
      /Google Fonts address/
    );
    expect(findFontFile).not.toHaveBeenCalled();
  });

  it("names the font that could not be found", async () => {
    const resolve = createGoogleFontsUrlFontResolver({
      findFontFile: async () => undefined,
    });
    await expect(
      resolve("https://fonts.google.com/specimen/Nosuchfont")
    ).rejects.toThrow(/Nosuchfont/);
  });

  it("passes the caller's fetch and signal through to the lookup", async () => {
    const findFontFile = vi.fn().mockResolvedValue("https://cdn.test/x.ttf");
    const resolve = createGoogleFontsUrlFontResolver({ findFontFile });
    const fetchImpl = vi.fn();
    const signal = new AbortController().signal;

    await resolve("https://fonts.google.com/specimen/Andika", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      signal,
    });

    expect(findFontFile).toHaveBeenCalledWith("Andika", { fetchImpl, signal });
  });
});
