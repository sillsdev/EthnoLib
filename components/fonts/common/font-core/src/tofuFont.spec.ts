import { describe, expect, it } from "vitest";
import {
  TOFU_FONT_FAMILY,
  ensureTofuFontLoaded,
  fontFamilyWithTofu,
} from "./tofuFont";
import { ADOBE_NOTDEF_BASE64 } from "./tofuFontData";

describe("fontFamilyWithTofu", () => {
  it("puts tofu second, right behind the font", () => {
    expect(fontFamilyWithTofu("Andika")).toBe(`"Andika", "${TOFU_FONT_FAMILY}"`);
  });

  it("adds nothing after it — a third family would lend its letters", () => {
    expect(fontFamilyWithTofu("Andika").split(",")).toHaveLength(2);
  });

  it("leaves the interface font alone when no font is being judged", () => {
    expect(fontFamilyWithTofu(undefined)).toBe("inherit");
    expect(fontFamilyWithTofu("")).toBe("inherit");
  });
});

describe("the embedded face", () => {
  it("is an OpenType font", () => {
    const header = atob(ADOBE_NOTDEF_BASE64.slice(0, 8)).slice(0, 4);
    // "OTTO": a CFF-flavoured OpenType file, which is what Adobe ships.
    expect(header).toBe("OTTO");
  });

  it("resolves rather than throwing where there is no font loading API", async () => {
    // jsdom has no FontFace, which is also an old browser's answer: the boxes
    // are lost and nothing else is.
    await expect(ensureTofuFontLoaded()).resolves.toBeUndefined();
  });
});
