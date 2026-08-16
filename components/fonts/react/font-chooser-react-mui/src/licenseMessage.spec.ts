import { describe, expect, it } from "vitest";
import { licenseMessage } from "./licenseMessage";

describe("licenseMessage", () => {
  it("tells an open font's user they can publish", () => {
    const { headline, advice } = licenseMessage({
      family: "TH Sarabun New",
      license: "open",
      licenseReason: "Open Font License",
    });
    expect(headline).toContain("ebooks");
    // Nothing to warn about, so nothing to advise.
    expect(advice).toBeUndefined();
  });

  it("names the reason an open verdict was reached", () => {
    const { provenance } = licenseMessage({
      family: "TH Sarabun New",
      license: "open",
      licenseReason: "Open Font License",
    });
    expect(provenance).toBe("Read from the font itself: Open Font License.");
  });

  it("says of a Microsoft font that it stays on this computer", () => {
    const { headline, advice } = licenseMessage({
      family: "Consolas",
      license: "limits-apply",
      licenseReason: "Microsoft font",
    });
    expect(headline).toContain("Microsoft");
    expect(advice).toContain("print");
    expect(advice).toContain("pick a different font");
  });

  it("sends a Microsoft font to the FAQ, not the font catalogue", () => {
    const { link } = licenseMessage({
      family: "Consolas",
      license: "limits-apply",
      licenseReason: "Microsoft font",
      licenseUrl: "http://www.microsoft.com/typography/fonts/default.aspx",
    });
    expect(link?.url).toBe(
      "https://learn.microsoft.com/en-us/typography/fonts/font-faq"
    );
    expect(link?.label).toContain("Microsoft");
  });

  it("rescues a font-catalogue link even without the Microsoft verdict", () => {
    const { link } = licenseMessage({
      family: "Some Windows Font",
      license: "limits-apply",
      licenseReason: "All rights reserved",
      licenseUrl: "https://learn.microsoft.com/en-gb/typography/font-list/",
    });
    expect(link?.url).toBe(
      "https://learn.microsoft.com/en-us/typography/fonts/font-faq"
    );
  });

  it("keeps a real license page as the link", () => {
    const { link } = licenseMessage({
      family: "DejaVu Sans",
      license: "open",
      licenseReason: "Bitstream free license",
      licenseUrl: "http://dejavu-fonts.org/wiki/License",
    });
    expect(link).toEqual({
      url: "http://dejavu-fonts.org/wiki/License",
      label: "Read this font's license",
    });
  });

  it("offers no link where the font names no license page", () => {
    expect(
      licenseMessage({ family: "Corporate Serif", license: "limits-apply" }).link
    ).toBeUndefined();
  });

  it("turns the fsType verdict into a sentence", () => {
    const { provenance } = licenseMessage({
      family: "Locked",
      license: "system-restricted",
      licenseReason: "unambiguous fsType value",
    });
    expect(provenance).not.toContain("fsType");
    expect(provenance).toContain("may not be included");
  });

  it("says plainly when the font told us nothing usable", () => {
    const { provenance } = licenseMessage({
      family: "Mystery",
      license: "unknown",
      licenseReason: "no reliable information",
    });
    expect(provenance).toContain("no license information");
  });

  it("treats a font we never read the same way", () => {
    expect(licenseMessage({ family: "Mystery" }).provenance).toContain(
      "no license information"
    );
  });

  it("does not scare a user off an unknown font", () => {
    const { headline, advice } = licenseMessage({
      family: "Mystery",
      license: "unknown",
    });
    expect(headline).toContain("could not find out");
    expect(advice).toContain("not the same as a no");
  });

  it("keeps the jargon out of every message", () => {
    const jargon = /metadata|fsType|embed|license text|OS\/2/i;
    const fonts = [
      { family: "A", license: "open" as const },
      { family: "B", license: "limits-apply" as const },
      { family: "C", license: "system-restricted" as const },
      { family: "D", license: "unknown" as const },
    ];
    for (const font of fonts) {
      const { headline, advice } = licenseMessage(font);
      expect(`${headline} ${advice ?? ""}`).not.toMatch(jargon);
    }
  });
});
