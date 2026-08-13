import { describe, expect, it } from "vitest";
import { licenseExplanation } from "./licenseExplanation";

describe("licenseExplanation", () => {
  it("leads with the rule that decided the verdict", () => {
    const lines = licenseExplanation({
      family: "TH Sarabun New",
      license: "open",
      licenseReason: "Open Font License",
    });
    expect(lines[0]).toBe("Read from the font itself: Open Font License.");
  });

  it("says so plainly when the font told us nothing usable", () => {
    const lines = licenseExplanation({
      family: "Mystery",
      license: "unknown",
      licenseReason: "no reliable information",
    });
    expect(lines[0]).toContain("no license information");
  });

  it("treats a font we never read the same way", () => {
    const lines = licenseExplanation({ family: "Mystery" });
    expect(lines[0]).toContain("no license information");
  });

  it("passes the host's own note through", () => {
    const lines = licenseExplanation({
      family: "Corporate Serif",
      license: "limits-apply",
      licenseReason: "Contact the vendor",
      licenseNotes: "Shipped with the app under a site license.",
    });
    expect(lines).toContain("Shipped with the app under a site license.");
  });

  it("always ends by saying there is nowhere to go", () => {
    const lines = licenseExplanation({ family: "Mystery" });
    expect(lines[lines.length - 1]).toContain("no page to send you to");
  });
});
