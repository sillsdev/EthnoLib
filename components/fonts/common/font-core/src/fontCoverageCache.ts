/**
 * Remembers which code points each installed font can render, so a second visit
 * doesn't have to read every font's cmap again before it can say which fonts
 * write the user's alphabet.
 *
 * This matters because the chooser holds a machine-only font off the list until
 * its coverage is known: without a cache, every visit re-reads hundreds of font
 * files — behind an enumeration that itself costs seconds — before a single
 * local font can appear. With it, a warm visit answers from storage at once and
 * the fresh read merely confirms.
 *
 * Keyed per font exactly like the licence cache, and with the same stability
 * bargain: the key carries the family, its representative PostScript name and
 * its face count, so a font replaced under the same name with the same faces
 * reads stale until something moves. Coverage is as stable as the licence — a
 * font file doesn't grow letters — so the bargain is the same one.
 *
 * The ranges are stored as a plain JSON array of the packed [start, end] pairs.
 * Empty coverage is not stored: the scan reports empty both for a font whose
 * cmap really is empty and for one it failed to read, and remembering the
 * failure is how one bad sweep blanks a font out for good (see the licence
 * cache's history).
 */

import {
  defaultLicenseCacheStorage,
  type LicenseCacheStorage,
} from "./fontLicenseCache";
import type { LocalFontFamily } from "./localFonts";

const SCHEMA_VERSION = 1;
const PREFIX = "ethnolib.fontCoverage";
const CURRENT_PREFIX = `${PREFIX}.s${SCHEMA_VERSION}.`;

/** The key one family's coverage is stored under. */
export function coverageCacheKey(family: LocalFontFamily): string {
  return `${CURRENT_PREFIX}${family.family}|${family.postscriptName}|${family.faceCount}`;
}

/** What we read last time, or undefined if we haven't read this font before. */
export function readCachedCoverage(
  family: LocalFontFamily,
  storage: LicenseCacheStorage | undefined = defaultLicenseCacheStorage()
): Uint32Array | undefined {
  if (!storage) return undefined;
  let stored: string | null;
  try {
    stored = storage.getItem(coverageCacheKey(family));
  } catch {
    return undefined;
  }
  if (stored === null) return undefined;

  try {
    const parsed = JSON.parse(stored) as unknown;
    // Ranges come in pairs, so an odd length is as damaged as non-JSON.
    if (!Array.isArray(parsed) || parsed.length === 0) return undefined;
    if (parsed.length % 2 !== 0) return undefined;
    if (!parsed.every((point) => typeof point === "number" && point >= 0)) {
      return undefined;
    }
    return new Uint32Array(parsed);
  } catch {
    return undefined;
  }
}

/** Remember what a font's cmap said. Empty coverage is not a fact worth keeping. */
export function writeCachedCoverage(
  family: LocalFontFamily,
  coverage: Uint32Array,
  storage: LicenseCacheStorage | undefined = defaultLicenseCacheStorage()
): void {
  if (!storage || coverage.length === 0) return;
  try {
    storage.setItem(coverageCacheKey(family), JSON.stringify([...coverage]));
  } catch {
    // Full, or refused. The sweep works without us.
  }
}

/** Everything we already know about these families, by family name. */
export function readCachedCoverages(
  families: LocalFontFamily[],
  storage: LicenseCacheStorage | undefined = defaultLicenseCacheStorage()
): Record<string, Uint32Array> {
  const found: Record<string, Uint32Array> = {};
  if (!storage) return found;
  for (const family of families) {
    const cached = readCachedCoverage(family, storage);
    if (cached) found[family.family] = cached;
  }
  return found;
}

/** Drop entries written under an older schema; see `pruneLicenseCache`. */
export function pruneCoverageCache(
  storage: LicenseCacheStorage | undefined = defaultLicenseCacheStorage()
): number {
  if (!storage) return 0;
  const stale: string[] = [];
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(PREFIX) && !key.startsWith(CURRENT_PREFIX)) {
        stale.push(key);
      }
    }
    for (const key of stale) storage.removeItem(key);
  } catch {
    // Nothing here is worth interrupting the chooser for.
  }
  return stale.length;
}
