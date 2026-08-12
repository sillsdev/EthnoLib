/**
 * Reading a font's table directory off a Blob, a few bytes at a time.
 *
 * The point of going through a Blob rather than an ArrayBuffer is that a ranged
 * read costs about the same on a 35 MB font as on a 40 KB one, where materializing
 * the file costs tens of milliseconds; see the note at the top of
 * scanForCharacterVariants.ts.
 *
 * Font collections (.ttc) are the reason this is more than a header read. A .ttc
 * holds several families in one file — many Windows system families ship that way —
 * and the Local Font Access API hands back the whole file whichever face was asked
 * for. Reading the first font of the collection therefore reports some other
 * family's characters, features and licence as if they were this face's, which is
 * how a font came to claim it could write an alphabet that it visibly renders in a
 * fallback face. So callers pass the PostScript name they asked for, and we find
 * the font in the collection that answers to it.
 */

import {
  TableEntry,
  readNameTable,
  scoreSubfontName,
} from "./readCharacterVariants";

export async function readRange(
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

export function tagAt(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3)
  );
}

/**
 * Where each of a font's tables sits in the file, read without pulling in the file
 * itself: the header, then the table directory, and nothing else.
 *
 * For a collection, `postscriptName` picks the font within it; without one the
 * first font answers, as it always did.
 */
export async function readTableOffsets(
  blob: Blob,
  postscriptName?: string
): Promise<Record<string, TableEntry>> {
  return await readDirectoryAt(blob, await fontOffset(blob, postscriptName));
}

/** The offset of the font to read: 0, or the chosen font of a collection. */
async function fontOffset(
  blob: Blob,
  postscriptName?: string
): Promise<number> {
  const header = await readRange(blob, 0, 12);
  if (tagAt(header, 0) !== "ttcf") return 0;

  // ttcf header: Tag, uint16 majorVersion, uint16 minorVersion, uint32 numFonts,
  // then an Offset32 per font.
  const numFonts = header.getUint32(8);
  const offsets = await readRange(blob, 12, numFonts * 4);
  const firstFont = offsets.getUint32(0);
  if (!postscriptName || numFonts <= 1) return firstFont;

  let bestOffset = firstFont;
  let bestScore = 0;
  for (let i = 0; i < numFonts; i++) {
    const offset = offsets.getUint32(i * 4);
    let score = 0;
    try {
      const name = (await readDirectoryAt(blob, offset))["name"];
      if (!name) continue;
      // A name table's own offsets are relative to its start, so a slice of one
      // parses on its own.
      score = scoreSubfontName(
        readNameTable(await readRange(blob, name.offset, name.length), 0),
        postscriptName
      );
    } catch {
      continue; // A font in the collection we can't read is one we can't pick.
    }
    if (score > bestScore) {
      bestScore = score;
      bestOffset = offset;
    }
  }
  // No font in there admits to the name: the first one is as good a guess as any.
  return bestOffset;
}

async function readDirectoryAt(
  blob: Blob,
  base: number
): Promise<Record<string, TableEntry>> {
  const numTables = (await readRange(blob, base, 12)).getUint16(4);
  const directory = await readRange(blob, base + 12, numTables * 16);

  const tables: Record<string, TableEntry> = {};
  for (let i = 0; i < numTables; i++) {
    // TableRecord: Tag, uint32 checksum, Offset32 offset, uint32 length
    tables[tagAt(directory, i * 16)] = {
      offset: directory.getUint32(i * 16 + 8),
      length: directory.getUint32(i * 16 + 12),
    };
  }
  return tables;
}
