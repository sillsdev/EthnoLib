import { describe, expect, it } from "vitest";
import { bundledFontPopularity } from "./popularFonts";

describe("bundledFontPopularity", () => {
  it("ranks the household names ahead of the alphabet's front page", async () => {
    const ranks = await bundledFontPopularity();
    expect(ranks.get("roboto")).toBeLessThan(ranks.get("abeezee")!);
    expect(ranks.get("open sans")).toBeLessThan(ranks.get("abril fatface")!);
  });

  it("keys by lower-cased family name", async () => {
    const ranks = await bundledFontPopularity();
    expect(ranks.has("roboto")).toBe(true);
    expect(ranks.has("Roboto")).toBe(false);
  });

  it("carries the whole catalog, not a top-ten", async () => {
    const ranks = await bundledFontPopularity();
    expect(ranks.size).toBeGreaterThan(1500);
  });
});
