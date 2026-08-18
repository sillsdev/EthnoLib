/** Compress a stored `characters_key` into something readable in a table cell.
 *
 * `characters_key` is the normalised, space-separated form of an alphabet claim:
 * one entry per element of the alphabet, which is usually a single character but
 * may be a digraph (`dž`) or a letter carrying combining marks. Printing 60 of
 * them in a grid cell is unreadable, so consecutive codepoints collapse into a
 * range and the multi-codepoint entries are listed after them, unchanged.
 *
 * Nothing here judges the claim. A range is a shorter spelling of exactly the
 * characters the source listed, and `title` always names the codepoints so the
 * shorthand can be checked.
 */

const EN_DASH = "–";

/** Fewer than this in a row stays spelled out: `a b` is no worse than `a–b`. */
const MIN_RUN = 3;

export type RangeToken = {
  /** What the cell prints. */
  label: string;
  /** Hover text naming the codepoints behind the label. */
  title: string;
};

export type Compressed = {
  /** Single-codepoint entries, sorted, consecutive ones collapsed. */
  ranges: RangeToken[];
  /** Digraphs and letters with combining marks, in the order the claim listed them. */
  clusters: RangeToken[];
};

const EMPTY: Compressed = { ranges: [], clusters: [] };

const hex = (cp: number) =>
  `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;

const char = (cp: number) => String.fromCodePoint(cp);

/** ASCII letters and digits are the only endpoints we print as glyphs. Elsewhere
 * the codepoints are easier to read than the characters, and a combining mark
 * would otherwise try to attach itself to the dash. */
const isPlainAscii = (cp: number) =>
  (cp >= 0x30 && cp <= 0x39) ||
  (cp >= 0x41 && cp <= 0x5a) ||
  (cp >= 0x61 && cp <= 0x7a);

function rangeToken(from: number, to: number, size: number): RangeToken {
  const glyphs = `${char(from)}${EN_DASH}${char(to)}`;
  const codes = `${hex(from)}${EN_DASH}${hex(to)}`;
  const plain = isPlainAscii(from) && isPlainAscii(to);
  return {
    label: plain ? glyphs : codes,
    title: `${plain ? codes : glyphs} (${size} characters)`,
  };
}

const singleToken = (cp: number): RangeToken => ({
  label: char(cp),
  title: hex(cp),
});

const clusterToken = (entry: string, cps: number[]): RangeToken => ({
  label: entry,
  title: cps.map(hex).join(" "),
});

export function compressCharacters(
  charactersKey: string | null | undefined
): Compressed {
  if (!charactersKey) return EMPTY;

  const singles: number[] = [];
  const seenSingle = new Set<number>();
  const clusters: RangeToken[] = [];
  const seenCluster = new Set<string>();

  for (const entry of charactersKey.split(/\s+/)) {
    if (!entry) continue;
    const cps = [...entry].map((c) => c.codePointAt(0) as number);
    if (cps.length === 1) {
      if (seenSingle.has(cps[0])) continue;
      seenSingle.add(cps[0]);
      singles.push(cps[0]);
    } else {
      if (seenCluster.has(entry)) continue;
      seenCluster.add(entry);
      clusters.push(clusterToken(entry, cps));
    }
  }

  singles.sort((a, b) => a - b);

  const ranges: RangeToken[] = [];
  let start = 0;
  while (start < singles.length) {
    let end = start;
    while (end + 1 < singles.length && singles[end + 1] === singles[end] + 1) end++;
    const size = end - start + 1;
    if (size >= MIN_RUN) {
      ranges.push(rangeToken(singles[start], singles[end], size));
    } else {
      for (let i = start; i <= end; i++) ranges.push(singleToken(singles[i]));
    }
    start = end + 1;
  }

  return { ranges, clusters };
}

/** Ranges first, then the multi-codepoint entries: what a cell or panel prints. */
export const allTokens = (compressed: Compressed): RangeToken[] => [
  ...compressed.ranges,
  ...compressed.clusters,
];

/** The alphabet's characters as a list, tolerating either the space-separated
 * string the export writes or an already-split array. */
export function characterList(characters: unknown): string[] {
  if (typeof characters === "string")
    return characters.split(/\s+/).filter(Boolean);
  if (Array.isArray(characters)) return characters.filter(Boolean).map(String);
  return [];
}
