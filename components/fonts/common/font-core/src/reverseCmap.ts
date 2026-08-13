/**
 * Glyph ids back to code points.
 *
 * A font's GSUB table talks in glyph ids: a feature says "these glyphs get
 * redrawn", not "these letters do". To say which characters a feature is about we
 * have to run the `cmap` backwards, which is what this does — the same subtable
 * fontCoverage.ts reads, but keeping the glyph each character maps to rather than
 * only the fact that it maps somewhere.
 *
 * The mapping is many-to-one in the forward direction: several characters can
 * share one glyph (a hyphen and a minus sign, say). Going backwards we keep the
 * lowest code point, which is the plain one a user would recognize rather than
 * some compatibility character that happens to share the shape.
 *
 * This reads whole-font bytes, where fontCoverage works in ranged reads off a
 * Blob, because by the time we are reading features we have the whole font in
 * hand anyway.
 */

import { cmapEncodingScore } from "./fontCoverage";

/**
 * Glyph id to code point, for every character the font's best cmap subtable maps.
 * Empty if there is no subtable we understand.
 */
export function buildReverseCmap(
  view: DataView,
  cmapOffset: number
): Map<number, number> {
  const reverse = new Map<number, number>();
  const subtable = bestSubtable(view, cmapOffset);
  if (!subtable) return reverse;

  // Characters arrive in ascending order from all three formats, so the first
  // code point to claim a glyph is the lowest one.
  const claim = (codePoint: number, glyph: number) => {
    if (glyph && !reverse.has(glyph)) reverse.set(glyph, codePoint);
  };

  const format = view.getUint16(subtable);
  if (format === 0) {
    for (let c = 0; c < 256; c++) claim(c, view.getUint8(subtable + 6 + c));
  } else if (format === 4) {
    readFormat4(view, subtable, claim);
  } else if (format === 12) {
    readFormat12(view, subtable, claim);
  }
  return reverse;
}

/** The subtable fontCoverage would have picked: full Unicode over BMP over the rest. */
function bestSubtable(view: DataView, cmapOffset: number): number {
  const count = view.getUint16(cmapOffset + 2);
  let best = 0;
  let chosen = 0;
  for (let i = 0; i < count; i++) {
    const record = cmapOffset + 4 + i * 8;
    const score = cmapEncodingScore(
      view.getUint16(record),
      view.getUint16(record + 2)
    );
    if (score > best) {
      best = score;
      chosen = cmapOffset + view.getUint32(record + 4);
    }
  }
  return chosen;
}

function readFormat4(
  view: DataView,
  subtable: number,
  claim: (codePoint: number, glyph: number) => void
): void {
  const segmentsX2 = view.getUint16(subtable + 6);
  const endCodes = subtable + 14;
  const startCodes = endCodes + segmentsX2 + 2;
  const deltas = startCodes + segmentsX2;
  const rangeOffsets = deltas + segmentsX2;
  const end = subtable + view.getUint16(subtable + 2); // the subtable's own length

  for (let s = 0; s < segmentsX2 / 2; s++) {
    const last = view.getUint16(endCodes + s * 2);
    const first = view.getUint16(startCodes + s * 2);
    const delta = view.getInt16(deltas + s * 2);
    const rangeOffsetAt = rangeOffsets + s * 2;
    const rangeOffset = view.getUint16(rangeOffsetAt);

    for (let c = first; c <= last && c !== 0xffff; c++) {
      let glyph;
      if (rangeOffset === 0) {
        glyph = (c + delta) & 0xffff;
      } else {
        const at = rangeOffsetAt + rangeOffset + (c - first) * 2;
        if (at + 1 >= end) continue;
        glyph = view.getUint16(at);
        if (glyph) glyph = (glyph + delta) & 0xffff;
      }
      claim(c, glyph);
    }
  }
}

function readFormat12(
  view: DataView,
  subtable: number,
  claim: (codePoint: number, glyph: number) => void
): void {
  const groups = view.getUint32(subtable + 12);
  for (let g = 0; g < groups; g++) {
    const at = subtable + 16 + g * 12;
    const first = view.getUint32(at);
    const last = view.getUint32(at + 4);
    const firstGlyph = view.getUint32(at + 8);
    for (let c = first; c <= last; c++) claim(c, firstGlyph + (c - first));
  }
}
