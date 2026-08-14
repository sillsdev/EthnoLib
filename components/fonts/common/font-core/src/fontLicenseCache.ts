/**
 * Remembers what we decided about a font's licence, so a second visit to the font
 * chooser doesn't read every installed font's `name` and OS/2 tables again.
 *
 * Only the licence verdict is kept here. It is cheap to store, and it is stable: a
 * font file on this machine is not going to change its mind about the OFL.
 * Coverage has a cache of its own (fontCoverageCache.ts) with the same keying;
 * cvXX features are deliberately NOT cached — they are read only for the selected
 * font, whose bytes are in hand anyway.
 *
 * Each font gets its own key, so two tabs writing at once can't lose each other's
 * work the way a single shared blob would. The key carries three things that make
 * a stale entry impossible to mistake for a fresh one: the schema of the stored
 * value, the version of the classification rules (see fontLicense.ts), and a token
 * for the font itself — its PostScript name and how many faces the family has, which
 * is as much stability as the Local Font Access API gives us for free. Reinstalling
 * a font under the same name with the same faces will read from the cache; that is
 * the one case we accept getting wrong until the rules version moves.
 *
 * Only answers are kept. A font we failed to read is left out, so that a bad run
 * costs a re-read rather than a permanent blank; see `writeCachedLicense`.
 *
 * Storage is injectable so this can be tested without a browser, and every call is
 * wrapped: localStorage throws when it is full, and in Safari's private mode it
 * throws on write even when it exists. A cache that can't be written is not a
 * reason to fail.
 */

import {
  FontLicenseCategory,
  LICENSE_CLASSIFICATION_VERSION,
} from "./fontLicense";
import type { LocalFontFamily } from "./localFonts";

/** The bit of a scan worth keeping between sessions. */
export interface CachedFontLicense {
  license?: FontLicenseCategory;
  licenseUrl?: string;
  /** The rule that produced the verdict; a short phrase. See `FamilyLicense`. */
  licenseReason?: string;
}

/** The slice of the `Storage` interface we use; `localStorage` satisfies it. */
export interface LicenseCacheStorage {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * The schema of the stored value, separate from the rules that produced it.
 * 2: added `licenseReason`, so entries written before it re-read rather than
 * leaving the pane unable to say why it decided what it did.
 */
const SCHEMA_VERSION = 2;
const PREFIX = "ethnolib.fontLicense";
const CURRENT_PREFIX = `${PREFIX}.s${SCHEMA_VERSION}.r${LICENSE_CLASSIFICATION_VERSION}.`;

/**
 * The browser's own storage, or undefined where there isn't one — a server render,
 * a locked-down iframe, a browser with storage disabled.
 */
export function defaultLicenseCacheStorage(): LicenseCacheStorage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    // Reading the property itself throws when cookies are blocked.
    return undefined;
  }
}

/** The key one family's verdict is stored under. */
export function licenseCacheKey(family: LocalFontFamily): string {
  return `${CURRENT_PREFIX}${family.family}|${family.postscriptName}|${family.faceCount}`;
}

/** What we decided last time, or undefined if we haven't seen this font before. */
export function readCachedLicense(
  family: LocalFontFamily,
  storage: LicenseCacheStorage | undefined = defaultLicenseCacheStorage()
): CachedFontLicense | undefined {
  if (!storage) return undefined;
  let stored: string | null;
  try {
    stored = storage.getItem(licenseCacheKey(family));
  } catch {
    return undefined;
  }
  if (stored === null) return undefined;

  try {
    const parsed = JSON.parse(stored) as CachedFontLicense;
    // Anything that isn't the shape we wrote is treated as a miss rather than
    // trusted; a hand-edited or half-written entry shouldn't reach the UI.
    if (typeof parsed !== "object" || parsed === null) return undefined;
    // An entry with no verdict in it is a miss too, so that a cache written by an
    // older version of this file — which did store failures — heals itself on the
    // next visit instead of having to be cleared by hand.
    if (parsed.license === undefined) return undefined;
    return {
      license: parsed.license,
      licenseUrl: parsed.licenseUrl,
      licenseReason: parsed.licenseReason,
    };
  } catch {
    return undefined;
  }
}

/**
 * Remember a verdict. A failure is not a verdict and is not stored.
 *
 * This used to keep "we couldn't read this font" as well, on the grounds that it
 * saved repeating the work. It did, permanently: reading a font can fail for
 * reasons that have nothing to do with the font — the permission not granted yet,
 * a file locked, a sweep torn down mid-flight — and one such run wrote an empty
 * entry for every family on the machine. Nothing ever looked at those fonts again,
 * so every font in the chooser had no licence, the list's open and closed sections
 * both emptied out, and no amount of reloading fixed it. Re-reading a few KB is the
 * cheaper mistake.
 */
export function writeCachedLicense(
  family: LocalFontFamily,
  value: CachedFontLicense,
  storage: LicenseCacheStorage | undefined = defaultLicenseCacheStorage()
): void {
  if (!storage || value.license === undefined) return;
  try {
    storage.setItem(
      licenseCacheKey(family),
      JSON.stringify(
        definedOnly({
          license: value.license,
          licenseUrl: value.licenseUrl,
          licenseReason: value.licenseReason,
        })
      )
    );
  } catch {
    // Full, or refused. The scan works without us.
  }
}

/** Everything we already know about these families, by family name. */
export function readCachedLicenses(
  families: LocalFontFamily[],
  storage: LicenseCacheStorage | undefined = defaultLicenseCacheStorage()
): Record<string, CachedFontLicense> {
  const found: Record<string, CachedFontLicense> = {};
  if (!storage) return found;
  for (const family of families) {
    const cached = readCachedLicense(family, storage);
    if (cached) found[family.family] = cached;
  }
  return found;
}

/**
 * Drop entries written under an older schema or an older set of rules. Without this
 * they would sit there forever, since a changed version means a changed key and
 * nothing ever looks at the old one again.
 */
export function pruneLicenseCache(
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

function definedOnly<T extends object>(value: T): Partial<T> {
  const kept: Record<string, unknown> = {};
  for (const [key, held] of Object.entries(value)) {
    if (held !== undefined) kept[key] = held;
  }
  return kept as Partial<T>;
}
