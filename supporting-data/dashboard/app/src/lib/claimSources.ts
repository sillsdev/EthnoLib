// Which source a claim's evidence came from, as a colour key. The edge colour
// on chips and claim blocks marks provenance, not kind: the columns and group
// headings already say what kind of claim something is, but where it came from
// is invisible until you open the evidence — this makes it visible at a glance.

import type { Evidence } from "../data";

export type SourceKey = "sil" | "google" | "bloom" | "other";

export const SOURCE_LABELS: Record<SourceKey, string> = {
  sil: "SIL (SLDR)",
  google: "Google (gflanguages)",
  bloom: "BloomLibrary scan",
  other: "other / contributor",
};

/** Legend order; only the keys present in the data are shown. */
export const SOURCE_ORDER: SourceKey[] = ["sil", "google", "bloom", "other"];

function keyOfTitle(title: string | null): SourceKey {
  if (!title) return "other";
  if (/bloom/i.test(title)) return "bloom";
  if (/google|gflanguages/i.test(title)) return "google";
  if (/\bSIL\b|SLDR/i.test(title)) return "sil";
  return "other";
}

/** Distinct source keys behind a claim, in evidence order. Evidence with no
 * source at all (a contributor's own knowledge) counts as "other". */
export function sourceKeysOf(evidence: Evidence[]): SourceKey[] {
  const keys: SourceKey[] = [];
  for (const row of evidence) {
    const key = keyOfTitle(row.source?.title ?? null);
    if (!keys.includes(key)) keys.push(key);
  }
  return keys.length ? keys : ["other"];
}
