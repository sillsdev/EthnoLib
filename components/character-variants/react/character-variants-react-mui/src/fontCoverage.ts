/**
 * Which characters a font actually has, read from its `cmap` table.
 *
 * This is a different question from "which letter shapes does it offer": a font is
 * only worth showing the user if it can write their alphabet at all. Like the cvXX
 * check, it needs one small ranged read rather than the whole font — the biggest
 * cmap subtable among 694 faces on a Windows machine was 165 KB, and most are a
 * few KB.
 *
 * The answer is kept as sorted, packed [start, end] code point pairs, so a font's
 * coverage costs a few hundred bytes to hold and any alphabet can be tested against
 * it later without going back to the font.
 */

async function readRange(
  blob: Blob,
  offset: number,
  length: number
): Promise<DataView> {
  const slice = await blob.slice(offset, offset + length).arrayBuffer();
  if (slice.byteLength < length) {
    throw new Error("Font data ends sooner than its own tables claim.");
  }
  return new DataView(slice);
}

function tagAt(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3)
  );
}

/** How much we prefer a cmap subtable: full Unicode beats BMP beats anything. */
function encodingScore(platform: number, encoding: number): number {
  if (platform === 3 && encoding === 10) return 4; // Windows, full Unicode
  if (platform === 3 && encoding === 1) return 3; // Windows, BMP
  if (platform === 0) return 2; // Unicode platform
  return 1;
}

/** Collects code points into sorted [start, end] pairs, given them in order. */
class RangeBuilder {
  private readonly bounds: number[] = [];

  add(codePoint: number): void {
    const last = this.bounds.length - 1;
    if (last >= 0 && this.bounds[last] === codePoint - 1) {
      this.bounds[last] = codePoint;
    } else if (last < 0 || this.bounds[last] < codePoint) {
      this.bounds.push(codePoint, codePoint);
    }
  }

  done(): Uint32Array {
    return new Uint32Array(this.bounds);
  }
}

/**
 * The code points a font can render, as packed [start, end] pairs. Empty if the
 * font has no cmap we understand, which we treat as "covers nothing" rather than
 * pretending otherwise.
 */
export async function readCoverageRanges(blob: Blob): Promise<Uint32Array> {
  let base = 0;
  let header = await readRange(blob, 0, 12);
  if (tagAt(header, 0) === "ttcf") {
    base = (await readRange(blob, 12, 4)).getUint32(0);
    header = await readRange(blob, base, 12);
  }
  const numTables = header.getUint16(4);
  const directory = await readRange(blob, base + 12, numTables * 16);

  let cmap = 0;
  for (let i = 0; i < numTables; i++) {
    if (tagAt(directory, i * 16) === "cmap") {
      cmap = directory.getUint32(i * 16 + 8);
      break;
    }
  }
  if (!cmap) return new Uint32Array();

  const subtableCount = (await readRange(blob, cmap + 2, 2)).getUint16(0);
  const records = await readRange(blob, cmap + 4, subtableCount * 8);
  let best = 0;
  let chosen = 0;
  for (let i = 0; i < subtableCount; i++) {
    const score = encodingScore(
      records.getUint16(i * 8),
      records.getUint16(i * 8 + 2)
    );
    if (score > best) {
      best = score;
      chosen = cmap + records.getUint32(i * 8 + 4);
    }
  }
  if (!chosen) return new Uint32Array();

  const format = (await readRange(blob, chosen, 2)).getUint16(0);
  // Format 12's length is a uint32 four bytes in; the older formats keep a uint16
  // right after the format.
  const length =
    format === 12 || format === 13
      ? (await readRange(blob, chosen + 4, 4)).getUint32(0)
      : (await readRange(blob, chosen + 2, 2)).getUint16(0);
  const table = await readRange(blob, chosen, length);

  const ranges = new RangeBuilder();
  if (format === 0) {
    for (let c = 0; c < 256; c++) {
      if (table.getUint8(6 + c) !== 0) ranges.add(c);
    }
  } else if (format === 4) {
    const segmentsX2 = table.getUint16(6);
    const endCodes = 14;
    const startCodes = endCodes + segmentsX2 + 2;
    const deltas = startCodes + segmentsX2;
    const rangeOffsets = deltas + segmentsX2;
    for (let s = 0; s < segmentsX2 / 2; s++) {
      const end = table.getUint16(endCodes + s * 2);
      const start = table.getUint16(startCodes + s * 2);
      const delta = table.getInt16(deltas + s * 2);
      const rangeOffsetAt = rangeOffsets + s * 2;
      const rangeOffset = table.getUint16(rangeOffsetAt);
      for (let c = start; c <= end && c !== 0xffff; c++) {
        // A segment may well list characters the font doesn't have; they map to
        // glyph 0, and only the glyph id says which is which.
        let glyph;
        if (rangeOffset === 0) {
          glyph = (c + delta) & 0xffff;
        } else {
          const at = rangeOffsetAt + rangeOffset + (c - start) * 2;
          if (at + 1 >= table.byteLength) continue;
          glyph = table.getUint16(at);
          if (glyph) glyph = (glyph + delta) & 0xffff;
        }
        if (glyph) ranges.add(c);
      }
    }
  } else if (format === 12) {
    const groups = table.getUint32(12);
    for (let g = 0; g < groups; g++) {
      const at = 16 + g * 12;
      const start = table.getUint32(at);
      const end = table.getUint32(at + 4);
      // A group can be enormous in a broken font; the sfnt limit is one glyph per
      // code point, so this is bounded in practice.
      for (let c = start; c <= end; c++) ranges.add(c);
    }
  }
  return ranges.done();
}

/** Whether packed coverage ranges include a code point. */
export function coversCodePoint(
  ranges: Uint32Array,
  codePoint: number
): boolean {
  let low = 0;
  let high = ranges.length / 2 - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (codePoint < ranges[middle * 2]) high = middle - 1;
    else if (codePoint > ranges[middle * 2 + 1]) low = middle + 1;
    else return true;
  }
  return false;
}

/**
 * Whether a font can write every character of an alphabet. An empty alphabet is
 * covered by anything, which keeps the caller from having to special-case it.
 */
export function coversAlphabet(
  ranges: Uint32Array,
  alphabet: Set<string>
): boolean {
  for (const character of alphabet) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) continue;
    if (!coversCodePoint(ranges, codePoint)) return false;
  }
  return true;
}
