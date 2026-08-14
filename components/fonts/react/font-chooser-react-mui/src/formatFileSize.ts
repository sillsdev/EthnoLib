/**
 * A download size the user can weigh, unit included.
 *
 * The number that reaches us is the wire cost — servers answer HEAD with the
 * compressed length when the browser asks for compression — and for a subsetted
 * or well-compressed font that is a few tens of kilobytes. Fixed megabytes with
 * one decimal place turned every one of those into "0.0 MB", an offer that reads
 * as free and looks broken at the same time. So below a megabyte the size is
 * said in whole kilobytes, and above it in megabytes with the one decimal the
 * decision needs. Round millions and thousands, not 1024²: the user will see
 * this same file counted that way everywhere else.
 */
export function formatDownloadSize(bytes: number): string {
  if (bytes < 1_000_000) {
    return `${Math.max(1, Math.round(bytes / 1_000))} KB`;
  }
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}
