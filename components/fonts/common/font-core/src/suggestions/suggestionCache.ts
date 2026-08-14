/**
 * Remembers what a font-suggestion source told us, so opening the chooser a second
 * time doesn't ask the network again for a catalog, a language's exemplar
 * characters, or the list of fonts somebody has recommended for it.
 *
 * Unlike the licence cache (fontLicenseCache.ts, which this is modelled on), these
 * answers come from somewhere else and do go out of date: a service adds a font, a
 * language's exemplars are corrected. So each entry carries the time it was written
 * and every read is given the age its caller is willing to accept. A stale entry
 * reads as a miss and is simply written over.
 *
 * The value is whatever the caller wants to keep — this file neither knows nor cares
 * what shape it is. That includes a definite "there is nothing for this language":
 * an answer worth remembering, and one a caller can encode as a value of its own
 * (`{ missing: true }`) rather than as an absence. A *failure* is different, and
 * callers are expected not to write one: a request that timed out has told us
 * nothing about the language.
 *
 * Storage is injectable so this can be tested without a browser, and every call is
 * wrapped: localStorage throws when it is full, and in Safari's private mode it
 * throws on write even when it exists. A cache that can't be written is not a
 * reason to fail.
 */

/** The slice of the `Storage` interface we use; `localStorage` satisfies it. */
export interface SuggestionCacheStorage {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** What goes in storage: the answer, and when we got it. */
interface CacheEntry<T> {
  at: number;
  value: T;
}

/** The schema of the stored value. Bump it and the old entries stop being read.
 * s2: LFF file URLs are rewritten to raw.githubusercontent.com; s1 entries could
 * hold CORS-blocked github.com URLs cached before that rewrite existed.
 * s3: gflanguages sample entries became {text, source, sourceUrl} objects; s2
 * entries were bare strings.
 * s4: LFF entries carry supportsLanguageSource; s3 entries lack it.
 * s5: LFF licenseUrl points at the licence's own page; s4 entries held the
 * font's release page.
 * s6: the LFF source is named "the SIL Global Language Font Finder". */
const SCHEMA_VERSION = 6;
const PREFIX = "ethnolib.fontSuggestions";
const CURRENT_PREFIX = `${PREFIX}.s${SCHEMA_VERSION}.`;

/**
 * The browser's own storage, or undefined where there isn't one — a server render,
 * a locked-down iframe, a browser with storage disabled.
 */
export function defaultSuggestionCacheStorage():
  | SuggestionCacheStorage
  | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    // Reading the property itself throws when cookies are blocked.
    return undefined;
  }
}

/**
 * The key one answer is stored under. `source` names who told us (a catalog, a
 * language service) and `key` names what we asked about, so two sources asked the
 * same question keep separate answers.
 */
export function suggestionCacheKey(source: string, key: string): string {
  return `${CURRENT_PREFIX}${source}.${key}`;
}

/**
 * What this source said last time, if it is still fresh enough. Undefined when we
 * have never asked, when the entry is older than `ttlMs`, or when what is there
 * isn't the shape we wrote.
 */
export function readCachedSuggestion<T>(
  source: string,
  key: string,
  ttlMs: number,
  storage: SuggestionCacheStorage | undefined = defaultSuggestionCacheStorage()
): T | undefined {
  if (!storage) return undefined;
  let stored: string | null;
  try {
    stored = storage.getItem(suggestionCacheKey(source, key));
  } catch {
    return undefined;
  }
  if (stored === null) return undefined;

  try {
    const parsed = JSON.parse(stored) as CacheEntry<T>;
    // Anything that isn't the shape we wrote is treated as a miss rather than
    // trusted; a hand-edited or half-written entry shouldn't reach the UI.
    if (typeof parsed !== "object" || parsed === null) return undefined;
    if (typeof parsed.at !== "number") return undefined;
    if (Date.now() - parsed.at > ttlMs) return undefined;
    return parsed.value;
  } catch {
    return undefined;
  }
}

/**
 * Remember an answer. Callers write answers only: a request that failed has told us
 * nothing, and storing that as though it had is how a single bad moment on the
 * network turns into a language with no fonts for as long as the entry lives.
 */
export function writeCachedSuggestion<T>(
  source: string,
  key: string,
  value: T,
  storage: SuggestionCacheStorage | undefined = defaultSuggestionCacheStorage()
): void {
  if (!storage) return;
  try {
    const entry: CacheEntry<T> = { at: Date.now(), value };
    storage.setItem(suggestionCacheKey(source, key), JSON.stringify(entry));
  } catch {
    // Full, or refused. Suggestions work without us.
  }
}

/**
 * Drop entries written under an older schema. Without this they would sit there
 * forever, since a changed schema means a changed key and nothing ever looks at the
 * old one again. Entries under the current schema are left alone however old they
 * are; their age is the reader's business, and a TTL that varies by caller isn't
 * something this sweep could decide.
 */
export function pruneSuggestionCache(
  storage: SuggestionCacheStorage | undefined = defaultSuggestionCacheStorage()
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
