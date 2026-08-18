// Which source a claim's evidence came from, as a colour key. The edge colour
// on chips and claim blocks marks provenance, not kind: the columns and group
// headings already say what kind of claim something is, but where it came from
// is invisible until you open the evidence — this makes it visible at a glance.

import type { Evidence, Source } from "../data";

export type SourceKey = "sil" | "lff" | "google" | "bloom" | "other";

export const SOURCE_LABELS: Record<SourceKey, string> = {
  sil: "SIL (SLDR)",
  lff: "Language Font Finder",
  google: "Google (gflanguages)",
  bloom: "BloomLibrary scan",
  other: "other / contributor",
};

/** Legend order; only the keys present in the data are shown. */
export const SOURCE_ORDER: SourceKey[] = [
  "sil",
  "lff",
  "google",
  "bloom",
  "other",
];

function keyOfSource(source: Source | null): SourceKey {
  // A Bloom-scanned book's source title is the book's own title, so only the
  // type and URL identify it as BloomLibrary evidence.
  if (source?.type === "book" || /bloomlibrary\.org/i.test(source?.url ?? "")) {
    return "bloom";
  }
  const title = source?.title ?? null;
  if (!title) return "other";
  if (/bloom/i.test(title)) return "bloom";
  if (/google|gflanguages/i.test(title)) return "google";
  // Before the generic SIL match: a font recommendation someone recorded for a
  // language in SLDR and the Font Finder service's answer for a tag are
  // different statements, and merging their colours would present one with the
  // other's weight.
  if (/font finder|langfontfinder/i.test(title)) return "lff";
  if (/\bSIL\b|SLDR/i.test(title)) return "sil";
  return "other";
}

/** Distinct source keys behind a claim, in evidence order. Evidence with no
 * source at all (a contributor's own knowledge) counts as "other". */
export function sourceKeysOf(evidence: Evidence[]): SourceKey[] {
  const keys: SourceKey[] = [];
  for (const row of evidence) {
    const key = keyOfSource(row.source);
    if (!keys.includes(key)) keys.push(key);
  }
  return keys.length ? keys : ["other"];
}
