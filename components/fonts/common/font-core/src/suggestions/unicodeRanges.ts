/**
 * Reads the `unicode-range` lists that font services publish — the same syntax CSS
 * uses, and what Fontsource hands out per subset — into the packed coverage ranges
 * the rest of this package works in.
 *
 * That means a subset's declared coverage can be tested with `coversCodePoint` and
 * `coversAlphabet` (fontCoverage.ts) exactly as a font file's real cmap coverage is,
 * without downloading the font. It is a claim rather than a measurement, so it is
 * worth no more than the service that published it; for choosing which subset of a
 * family to suggest for an alphabet, it is enough.
 */

// U+XXXX, U+XXXX-YYYY, or a trailing-wildcard U+2?? — up to six hex digits, and
// `?` only where digits have run out, which is all CSS allows.
const RANGE = /^u\+([0-9a-f]{0,6})(\?{0,6})(?:-([0-9a-f]{1,6}))?$/i;

const MAX_CODE_POINT = 0x10ffff;

/**
 * The code points a `unicode-range` list names, as sorted, merged [start, end] pairs
 * — the same packed layout `readCoverageRanges` produces.
 *
 * Tokens we don't understand are dropped rather than treated as an error: these
 * lists come from other people's servers, and one malformed entry in a hundred is no
 * reason to decide a subset covers nothing.
 */
export function parseUnicodeRanges(text: string): Uint32Array {
  const pairs: [number, number][] = [];
  for (const token of text.split(",")) {
    const bounds = parseToken(token.trim());
    if (bounds) pairs.push(bounds);
  }
  if (pairs.length === 0) return new Uint32Array();

  pairs.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: number[] = [];
  for (const [start, end] of pairs) {
    const last = merged.length - 2;
    // Adjacent ranges are merged as well as overlapping ones: U+41-5A and U+5B-60
    // describe one run, and leaving them apart would only make the search longer.
    if (last >= 0 && start <= merged[last + 1] + 1) {
      merged[last + 1] = Math.max(merged[last + 1], end);
    } else {
      merged.push(start, end);
    }
  }
  return new Uint32Array(merged);
}

/** One `U+…` token's bounds, or undefined if it isn't one. */
function parseToken(token: string): [number, number] | undefined {
  const match = RANGE.exec(token);
  if (!match) return undefined;
  const [, digits, wildcards, upper] = match;
  if (!digits && !wildcards) return undefined;
  // A wildcard is a range in itself, so `U+2??-3FF` is not a thing.
  if (wildcards && upper) return undefined;
  if (digits.length + wildcards.length > 6) return undefined;

  const start = parseInt(digits + "0".repeat(wildcards.length), 16);
  const end = wildcards
    ? parseInt(digits + "f".repeat(wildcards.length), 16)
    : upper === undefined
      ? start
      : parseInt(upper, 16);
  if (start > end || start > MAX_CODE_POINT) return undefined;
  return [start, Math.min(end, MAX_CODE_POINT)];
}
