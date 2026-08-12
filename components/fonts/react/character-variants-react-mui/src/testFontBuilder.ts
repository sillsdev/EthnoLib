/**
 * Builds the smallest sfnt files that our readers will accept, so the tests can
 * exercise them without carrying real font binaries around. Only the fields the
 * readers actually look at are filled in: a real font has far more, and a real
 * rasterizer would reject everything here.
 *
 * Test-only; deliberately not exported from index.ts.
 */

/** One table's tag and bytes, ready to be dropped into a table directory. */
export interface SyntheticTable {
  tag: string;
  data: Uint8Array;
}

/** A TrueType file (sfnt version 0x00010000) holding exactly these tables. */
export function buildSfnt(tables: SyntheticTable[]): ArrayBuffer {
  return buildFont(tables, 0).buffer as ArrayBuffer;
}

/**
 * A font collection (.ttc) holding these fonts, in order, each with its own table
 * directory. This is the shape that made a font report another family's coverage:
 * the platform hands back the whole file for any face inside it.
 */
export function buildTtc(fonts: SyntheticTable[][]): ArrayBuffer {
  const headerSize = 12 + fonts.length * 4;
  const blocks: { bytes: Uint8Array; base: number }[] = [];

  let base = headerSize;
  for (const tables of fonts) {
    // Two passes: the directory records hold offsets from the file's start, so a
    // font has to know where it will land before it can be written.
    const bytes = buildFont(tables, base);
    blocks.push({ bytes, base });
    base += bytes.length;
  }

  const buffer = new ArrayBuffer(base);
  const view = new DataView(buffer);
  const all = new Uint8Array(buffer);

  writeTag(view, 0, "ttcf");
  view.setUint16(4, 1); // majorVersion
  view.setUint16(6, 0); // minorVersion
  view.setUint32(8, fonts.length);
  blocks.forEach(({ bytes, base: at }, i) => {
    view.setUint32(12 + i * 4, at);
    all.set(bytes, at);
  });

  return buffer;
}

/** One font's table directory and tables, with offsets measured from `base`. */
function buildFont(tables: SyntheticTable[], base: number): Uint8Array {
  const directorySize = 12 + tables.length * 16;
  const padded = tables.map(({ tag, data }) => ({
    tag,
    data,
    paddedLength: (data.length + 3) & ~3,
  }));

  const total = padded.reduce((sum, t) => sum + t.paddedLength, directorySize);
  const bytes = new Uint8Array(total);
  const view = new DataView(bytes.buffer);

  view.setUint32(0, 0x00010000);
  view.setUint16(4, tables.length);
  // searchRange/entrySelector/rangeShift: no reader of ours consults them.

  let offset = directorySize;
  padded.forEach(({ tag, data, paddedLength }, i) => {
    const record = 12 + i * 16;
    writeTag(view, record, tag);
    view.setUint32(record + 8, base + offset);
    view.setUint32(record + 12, data.length);
    bytes.set(data, offset);
    offset += paddedLength;
  });

  return bytes;
}

/**
 * A `name` table holding these strings, all as Windows/Unicode BMP/US English
 * (platform 3, encoding 1, language 0x409), which is how fonts normally give them
 * and the variant our reader prefers.
 */
export function buildNameTable(
  records: { nameId: number; text: string }[]
): Uint8Array {
  const encoded = records.map(({ nameId, text }) => ({
    nameId,
    bytes: encodeUtf16Be(text),
  }));

  const headerSize = 6 + encoded.length * 12;
  const storageSize = encoded.reduce((sum, r) => sum + r.bytes.length, 0);
  const table = new Uint8Array(headerSize + storageSize);
  const view = new DataView(table.buffer);

  view.setUint16(0, 0); // format 0
  view.setUint16(2, encoded.length);
  view.setUint16(4, headerSize); // stringOffset, from the table's start

  let stringOffset = 0;
  encoded.forEach(({ nameId, bytes }, i) => {
    // NameRecord: platformID, encodingID, languageID, nameID, length, stringOffset
    const record = 6 + i * 12;
    view.setUint16(record, 3);
    view.setUint16(record + 2, 1);
    view.setUint16(record + 4, 0x409);
    view.setUint16(record + 6, nameId);
    view.setUint16(record + 8, bytes.length);
    view.setUint16(record + 10, stringOffset);
    table.set(bytes, headerSize + stringOffset);
    stringOffset += bytes.length;
  });

  return table;
}

/** An OS/2 table long enough to hold the one field we read, `fsType`. */
export function buildOs2Table(fsType: number): Uint8Array {
  const table = new Uint8Array(78); // the size of version 0
  new DataView(table.buffer).setUint16(8, fsType);
  return table;
}

/**
 * A GSUB table declaring these feature tags, in the order given, with an empty
 * script list and no lookups. Each feature carries no FeatureParams, which is what
 * readCharacterVariants sees in a font that declares a cvXX without describing it.
 */
export function buildGsubTable(featureTags: string[]): Uint8Array {
  const scriptListOffset = 10; // straight after the GSUB header
  const featureListOffset = scriptListOffset + 2; // an empty ScriptList is a count of 0
  const featureRecordsSize = 2 + featureTags.length * 6;
  const lookupListOffset =
    featureListOffset + featureRecordsSize + featureTags.length * 4;

  const table = new Uint8Array(lookupListOffset + 2);
  const view = new DataView(table.buffer);

  view.setUint32(0, 0x00010000);
  view.setUint16(4, scriptListOffset);
  view.setUint16(6, featureListOffset);
  view.setUint16(8, lookupListOffset);

  view.setUint16(scriptListOffset, 0); // scriptCount
  view.setUint16(featureListOffset, featureTags.length);

  featureTags.forEach((tag, i) => {
    // FeatureRecord: Tag, Offset16 to the Feature table, from the FeatureList's start.
    const record = featureListOffset + 2 + i * 6;
    const featureOffset = featureRecordsSize + i * 4;
    writeTag(view, record, tag);
    view.setUint16(record + 4, featureOffset);
    // Feature table: featureParamsOffset (none), lookupIndexCount (none).
    view.setUint16(featureListOffset + featureOffset, 0);
    view.setUint16(featureListOffset + featureOffset + 2, 0);
  });

  view.setUint16(lookupListOffset, 0); // lookupCount

  return table;
}

/**
 * A `cmap` covering these inclusive code point ranges, as a single format 12
 * subtable under Windows full Unicode (platform 3, encoding 10), the encoding our
 * reader prefers.
 */
export function buildCmapTable(ranges: [number, number][]): Uint8Array {
  const subtableOffset = 12; // uint16 version, uint16 numTables, one 8-byte record
  const subtableLength = 16 + ranges.length * 12;
  const table = new Uint8Array(subtableOffset + subtableLength);
  const view = new DataView(table.buffer);

  view.setUint16(0, 0); // version
  view.setUint16(2, 1); // numTables
  view.setUint16(4, 3); // platformID
  view.setUint16(6, 10); // encodingID
  view.setUint32(8, subtableOffset);

  view.setUint16(subtableOffset, 12); // format
  view.setUint32(subtableOffset + 4, subtableLength);
  view.setUint32(subtableOffset + 12, ranges.length);
  ranges.forEach(([start, end], i) => {
    const group = subtableOffset + 16 + i * 12;
    view.setUint32(group, start);
    view.setUint32(group + 4, end);
    view.setUint32(group + 8, 1 + i); // startGlyphID, any non-zero glyph will do
  });

  return table;
}

function encodeUtf16Be(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < text.length; i++) {
    view.setUint16(i * 2, text.charCodeAt(i));
  }
  return bytes;
}

function writeTag(view: DataView, offset: number, tag: string): void {
  for (let i = 0; i < 4; i++) {
    view.setUint8(offset + i, tag.charCodeAt(i));
  }
}
