/**
 * Which tags to ask the SLDR about, shared by every provider that reads it.
 * The repository is keyed by language tag, and a question about `ffm-Latn-SN`
 * that finds nothing is worth re-asking as `ffm-Latn` and then `ffm`: each
 * shorter tag names something the longer one is a variety of.
 */

/**
 * The tags to ask about, in order and without repeats: the one the caller named,
 * then whatever stands in for it.
 */
export function candidateTags(
  languageTag: string,
  fallbackTagsFor: ((languageTag: string) => string[]) | undefined
): string[] {
  const tag = languageTag.trim();
  const fallbacks = fallbackTagsFor ? fallbackTagsFor(tag) : shorterTags(tag);
  const candidates: string[] = [];
  const seen = new Set<string>();
  for (const candidate of [tag, ...fallbacks]) {
    const trimmed = candidate.trim();
    // Deduplicated case-insensitively, since that is how the cache is keyed and
    // asking the same question twice under two spellings is still asking twice.
    const folded = trimmed.toLowerCase();
    if (trimmed.length === 0 || seen.has(folded)) continue;
    seen.add(folded);
    candidates.push(trimmed);
  }
  return candidates;
}

/**
 * `ffm-Latn-SN` → `ffm-Latn`, `ffm`. Dropping subtags from the end is the one
 * generalisation that needs no knowledge of any particular language.
 */
export function shorterTags(tag: string): string[] {
  const subtags = tag.split("-").filter((subtag) => subtag.length > 0);
  const shorter: string[] = [];
  for (let length = subtags.length - 1; length >= 1; length--) {
    shorter.push(subtags.slice(0, length).join("-"));
  }
  return shorter;
}
