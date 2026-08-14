import { describe, expect, it } from "vitest";
import { formatDownloadSize } from "./formatFileSize";

describe("formatDownloadSize", () => {
  it("gives megabytes one decimal place, which is as precise as the decision needs", () => {
    expect(formatDownloadSize(1_148_372)).toBe("1.1 MB");
    expect(formatDownloadSize(4_600_000)).toBe("4.6 MB");
  });

  it("keeps the decimal on a round number, so sizes line up as a column", () => {
    expect(formatDownloadSize(2_000_000)).toBe("2.0 MB");
  });

  it("says small files in kilobytes rather than rounding them away to 0.0 MB", () => {
    // Compressed font files are this size: gstatic answers HEAD for a ~110 KB
    // TTF with a Content-Length in the tens of kilobytes.
    expect(formatDownloadSize(26_273)).toBe("26 KB");
    expect(formatDownloadSize(94_000)).toBe("94 KB");
    expect(formatDownloadSize(999_499)).toBe("999 KB");
  });

  it("never claims zero: a download that costs something says at least 1 KB", () => {
    expect(formatDownloadSize(300)).toBe("1 KB");
  });
});
