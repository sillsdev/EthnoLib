// What each source has actually put into the database, counted at bake time.
//
// The Sources tab describes every source in prose — what it can answer, how it
// is read, whether it is approved — and prose goes stale. These are the numbers
// under that prose, so a claim like "the Language Font Finder is the largest
// contributor here" is either true on the page or visibly not.
//
// The grouping mirrors app/src/lib/claimSources.ts, which colours a claim by
// where its evidence came from. Two spellings of one rule is a cost; the
// alternative is the page's colour key and its counts disagreeing about what
// counts as "SLDR", which is worse. Keep them in step.

/**
 * Which source a piece of evidence came from. `other` covers evidence with no
 * source row at all, which is a contributor speaking from their own knowledge.
 */
export function sourceKeyOf(source) {
  // A Bloom-scanned book is filed under the book's own title, so only the type
  // and the URL identify it.
  if (source?.type === "book" || /bloomlibrary\.org/i.test(source?.url ?? ""))
    return "bloom";
  const title = source?.title ?? "";
  if (!title) return "other";
  if (/bloom/i.test(title)) return "bloom";
  if (/google|gflanguages/i.test(title)) return "google";
  // Before the generic SIL match: a font somebody recorded in SLDR and the Font
  // Finder service's answer for a tag are different statements, and merging them
  // would present one with the other's weight.
  if (/font finder|langfontfinder/i.test(title)) return "lff";
  if (/\bSIL\b|SLDR/i.test(title)) return "sil";
  return "other";
}

const KINDS = [
  ["alphabets", "alphabet_evidence"],
  ["sampleTexts", "sample_text_evidence"],
  ["fonts", "font_support_evidence"],
];

const emptyTally = () => ({
  /** Evidence rows this source stands behind, by kind of claim. */
  evidence: { alphabets: 0, sampleTexts: 0, fonts: 0 },
  /** Claims with at least one piece of evidence from this source, by kind. */
  claims: { alphabets: 0, sampleTexts: 0, fonts: 0 },
  /** Writing systems it has said anything at all about. */
  writingSystems: 0,
  /**
   * Distinct source rows: one per SLDR page, per gflanguages file, per Font
   * Finder query, per book. What a reader would have to visit to check us.
   */
  citations: 0,
});

/**
 * Tally the claim rows export-data.mjs has already read, so this costs no extra
 * request. Each argument is that table's rows with their evidence embedded.
 */
export function tallySources(
  { alphabets, sampleTexts, fontSupport },
  /** Titles from `approved_source`: the only claims a UI is allowed to serve. */
  approvedTitles = []
) {
  const byKey = new Map();
  const systemsByKey = new Map();
  const urlsByKey = new Map();
  const tally = (key) => {
    if (!byKey.has(key)) {
      byKey.set(key, emptyTally());
      systemsByKey.set(key, new Set());
      urlsByKey.set(key, new Set());
    }
    return byKey.get(key);
  };

  const rowsByKind = { alphabets, sampleTexts, fonts: fontSupport };
  for (const [kind, embed] of KINDS) {
    for (const claim of rowsByKind[kind] ?? []) {
      const keysHere = new Set();
      for (const evidence of claim[embed] ?? []) {
        const key = sourceKeyOf(evidence.source);
        tally(key).evidence[kind]++;
        keysHere.add(key);
        // A source row with no URL is still one citation; key it by title so it
        // is not merged with every other URL-less row.
        const cite = evidence.source?.url ?? `title:${evidence.source?.title}`;
        if (evidence.source) urlsByKey.get(key).add(cite);
      }
      for (const key of keysHere) {
        tally(key).claims[kind]++;
        systemsByKey.get(key).add(claim.language_id);
      }
    }
  }

  const approved = new Set(approvedTitles.map((title) => sourceKeyOf({ title })));

  const sources = {};
  for (const [key, entry] of byKey) {
    // Approval is per source title, and every title under one key here shares
    // its answer, so the key carries it.
    entry.approved = approved.has(key);
    entry.writingSystems = systemsByKey.get(key).size;
    entry.citations = urlsByKey.get(key).size;
    sources[key] = entry;
  }
  return sources;
}
