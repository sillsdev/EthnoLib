import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SuggestionCacheStorage,
  pruneSuggestionCache,
  readCachedSuggestion,
  suggestionCacheKey,
  writeCachedSuggestion,
} from "./suggestionCache";

/** A `localStorage` that lives in a Map, and can be told to misbehave. */
class FakeStorage implements SuggestionCacheStorage {
  private items = new Map<string, string>();
  public failWrites = false;
  public failReads = false;
  public failEnumeration = false;

  get length(): number {
    return this.items.size;
  }
  key(index: number): string | null {
    if (this.failEnumeration) throw new Error("nope");
    return [...this.items.keys()][index] ?? null;
  }
  getItem(key: string): string | null {
    if (this.failReads) throw new Error("nope");
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error("quota exceeded");
    this.items.set(key, value);
  }
  removeItem(key: string): void {
    this.items.delete(key);
  }
  keys(): string[] {
    return [...this.items.keys()];
  }
}

const HOUR = 60 * 60 * 1000;

let storage: FakeStorage;
beforeEach(() => {
  storage = new FakeStorage();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
});

describe("suggestionCacheKey", () => {
  it("carries the schema version, so changing the schema loses the old answers", () => {
    expect(suggestionCacheKey("fontsource", "th")).toEqual(
      "ethnolib.fontSuggestions.s6.fontsource.th"
    );
  });

  it("keeps two sources' answers to the same question apart", () => {
    expect(suggestionCacheKey("sldr", "th")).not.toEqual(
      suggestionCacheKey("lff", "th")
    );
  });
});

describe("reading and writing", () => {
  it("gives back what was put in", () => {
    writeCachedSuggestion(
      "lff",
      "th",
      { fonts: ["Padauk", "Noto Sans Thai"] },
      storage
    );

    expect(
      readCachedSuggestion<{ fonts: string[] }>("lff", "th", HOUR, storage)
    ).toEqual({ fonts: ["Padauk", "Noto Sans Thai"] });
  });

  it("misses on a question it has not been asked", () => {
    expect(readCachedSuggestion("lff", "th", HOUR, storage)).toBeUndefined();
  });

  it("remembers a definite nothing, which is an answer like any other", () => {
    // The point of keeping this: a language no source has fonts for shouldn't cost a
    // request every time the chooser opens.
    writeCachedSuggestion("sldr", "qxx", { missing: true }, storage);

    expect(
      readCachedSuggestion<{ missing: boolean }>("sldr", "qxx", HOUR, storage)
    ).toEqual({ missing: true });
  });

  it("keeps an answer that is still inside its lifetime", () => {
    writeCachedSuggestion("lff", "th", "fresh", storage);
    vi.advanceTimersByTime(HOUR - 1);

    expect(readCachedSuggestion("lff", "th", HOUR, storage)).toEqual("fresh");
  });

  it("treats an answer past its lifetime as a miss", () => {
    writeCachedSuggestion("lff", "th", "stale", storage);
    vi.advanceTimersByTime(HOUR + 1);

    expect(readCachedSuggestion("lff", "th", HOUR, storage)).toBeUndefined();
  });

  it("lets each caller decide how old is too old", () => {
    writeCachedSuggestion("lff", "th", "a day old", storage);
    vi.advanceTimersByTime(24 * HOUR);

    expect(readCachedSuggestion("lff", "th", HOUR, storage)).toBeUndefined();
    expect(readCachedSuggestion("lff", "th", 48 * HOUR, storage)).toEqual(
      "a day old"
    );
  });

  it("writes over a stale entry rather than leaving it", () => {
    writeCachedSuggestion("lff", "th", "old", storage);
    vi.advanceTimersByTime(2 * HOUR);
    writeCachedSuggestion("lff", "th", "new", storage);

    expect(readCachedSuggestion("lff", "th", HOUR, storage)).toEqual("new");
  });

  it("treats a damaged entry as a miss", () => {
    storage.setItem(suggestionCacheKey("lff", "th"), "{not json");

    expect(readCachedSuggestion("lff", "th", HOUR, storage)).toBeUndefined();
  });

  it("treats an entry with no timestamp as a miss", () => {
    // Something else's data, or a half-written entry. It has no age we can judge.
    storage.setItem(suggestionCacheKey("lff", "th"), '{"value":"who knows"}');

    expect(readCachedSuggestion("lff", "th", HOUR, storage)).toBeUndefined();
  });

  it("carries on when storage refuses to work", () => {
    storage.failWrites = true;
    expect(() =>
      writeCachedSuggestion("lff", "th", "answer", storage)
    ).not.toThrow();

    storage.failWrites = false;
    writeCachedSuggestion("lff", "th", "answer", storage);
    storage.failReads = true;
    expect(readCachedSuggestion("lff", "th", HOUR, storage)).toBeUndefined();
  });

  it("does nothing at all without storage", () => {
    expect(() =>
      writeCachedSuggestion("lff", "th", "answer", undefined)
    ).not.toThrow();
    expect(readCachedSuggestion("lff", "th", HOUR, undefined)).toBeUndefined();
    expect(pruneSuggestionCache(undefined)).toEqual(0);
  });
});

describe("pruneSuggestionCache", () => {
  it("drops entries from an older schema and leaves the rest alone", () => {
    storage.setItem("ethnolib.fontSuggestions.s0.lff.th", "{}");
    storage.setItem("ethnolib.fontLicense.s1.r1.Andika|Andika-Regular|4", "{}");
    storage.setItem("something.else", "keep me");
    writeCachedSuggestion("lff", "th", "answer", storage);

    expect(pruneSuggestionCache(storage)).toEqual(1);
    expect(storage.keys()).toEqual([
      "ethnolib.fontLicense.s1.r1.Andika|Andika-Regular|4",
      "something.else",
      suggestionCacheKey("lff", "th"),
    ]);
  });

  it("leaves a current-schema entry alone however old it is", () => {
    // Whether an entry is too old is the reader's business; a TTL that varies by
    // caller is not something the sweep could decide.
    writeCachedSuggestion("lff", "th", "ancient", storage);
    vi.advanceTimersByTime(365 * 24 * HOUR);

    expect(pruneSuggestionCache(storage)).toEqual(0);
    expect(storage.keys()).toEqual([suggestionCacheKey("lff", "th")]);
  });

  it("carries on when storage refuses to work", () => {
    writeCachedSuggestion("lff", "th", "answer", storage);
    storage.failEnumeration = true;

    expect(pruneSuggestionCache(storage)).toEqual(0);
  });
});
