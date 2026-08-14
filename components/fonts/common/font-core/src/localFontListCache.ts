/**
 * Remembers what the machine's font list looked like, so the next visit can show
 * it at once instead of waiting for enumeration.
 *
 * The Local Font Access API's first `queryLocalFonts()` call in a page costs
 * seconds — 2.7 s for ~1000 faces on a fast machine — while reading the same
 * list back out of localStorage costs a fraction of a millisecond. The list
 * changes only when the user installs or removes a font, so last visit's answer
 * is almost always this visit's answer, and the real enumeration reconciles the
 * rare difference when it lands.
 *
 * One key for the whole list, unlike the per-font licence cache: the value is
 * written whole from one enumeration, so there is no partial state for two tabs
 * to tear. The caller decides *when* the cache may be used — this module doesn't
 * know whether the permission that produced the list still stands.
 *
 * Storage is injectable so this can be tested without a browser, and every call
 * is wrapped: localStorage throws when it is full, and in Safari's private mode
 * it throws on write even when it exists.
 */

import {
  defaultLicenseCacheStorage,
  type LicenseCacheStorage,
} from "./fontLicenseCache";
import type { LocalFontFamily } from "./localFonts";

const SCHEMA_VERSION = 1;
const PREFIX = "ethnolib.localFontList";
const KEY = `${PREFIX}.s${SCHEMA_VERSION}`;

/** The list as the last enumeration saw it, or undefined if we have none. */
export function readCachedLocalFontList(
  storage: LicenseCacheStorage | undefined = defaultLicenseCacheStorage()
): LocalFontFamily[] | undefined {
  if (!storage) return undefined;
  let stored: string | null;
  try {
    stored = storage.getItem(KEY);
  } catch {
    return undefined;
  }
  if (stored === null) return undefined;

  try {
    const parsed = JSON.parse(stored) as unknown;
    // Anything that isn't the shape we wrote is a miss rather than trusted; a
    // hand-edited or half-written entry shouldn't reach the UI.
    if (!Array.isArray(parsed) || parsed.length === 0) return undefined;
    if (!parsed.every(isLocalFontFamily)) return undefined;
    return parsed.map(({ family, postscriptName, faceCount }) => ({
      family,
      postscriptName,
      faceCount,
    }));
  } catch {
    return undefined;
  }
}

/**
 * Remember what enumeration found. An empty list is not stored: the plausible
 * ways to get one — a torn-down page, an API that answered oddly — are all
 * better re-asked than remembered, and no real machine has no fonts.
 */
export function writeCachedLocalFontList(
  families: LocalFontFamily[],
  storage: LicenseCacheStorage | undefined = defaultLicenseCacheStorage()
): void {
  if (!storage || families.length === 0) return;
  try {
    storage.setItem(KEY, JSON.stringify(families));
  } catch {
    // Full, or refused. The chooser works without us.
  }
}

/** Drop entries written under an older schema; see `pruneLicenseCache`. */
export function pruneLocalFontListCache(
  storage: LicenseCacheStorage | undefined = defaultLicenseCacheStorage()
): number {
  if (!storage) return 0;
  const stale: string[] = [];
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(PREFIX) && key !== KEY) stale.push(key);
    }
    for (const key of stale) storage.removeItem(key);
  } catch {
    // Nothing here is worth interrupting the chooser for.
  }
  return stale.length;
}

function isLocalFontFamily(value: unknown): value is LocalFontFamily {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as LocalFontFamily).family === "string" &&
    typeof (value as LocalFontFamily).postscriptName === "string" &&
    typeof (value as LocalFontFamily).faceCount === "number"
  );
}
