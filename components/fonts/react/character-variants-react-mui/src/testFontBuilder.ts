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
 * One feature of a synthetic GSUB. A bare tag is the plainest case — no
 * FeatureParams and no lookups — which is what readCharacterVariants sees in a font
 * that declares a cvXX without describing it.
 */
export interface SyntheticFeature {
  tag: string;
  /** Indices into the table's lookup list, in the order the feature applies them. */
  lookupIndices?: number[];
  /** FeatureParams bytes; see buildStylisticSetParams and buildCharacterVariantParams. */
  params?: Uint8Array;
}

/** One lookup: its type, and its subtables as built by the helpers below. */
export interface SyntheticLookup {
  type: number;
  subtables: Uint8Array[];
}

/**
 * A GSUB table declaring these features, in the order given, over these lookups,
 * with an empty script list.
 *
 * Every block written here is self-contained — a feature's FeatureParams sit inside
 * the feature table, a subtable's Coverage inside the subtable — because the
 * offsets to them are measured from the block's own start. That is what lets the
 * pieces be built separately and concatenated.
 */
export function buildGsubTable(
  features: (string | SyntheticFeature)[],
  lookups: SyntheticLookup[] = []
): Uint8Array {
  const declared = features.map((feature) =>
    typeof feature === "string" ? { tag: feature } : feature
  );
  const featureBlocks = declared.map(buildFeatureTable);

  const scriptListOffset = 10; // straight after the GSUB header
  const featureListOffset = scriptListOffset + 2; // an empty ScriptList is a count of 0
  const featureList = concatWithOffsets(featureBlocks, 2 + declared.length * 6);
  const lookupListOffset = featureListOffset + featureList.bytes.length;
  const lookupBlocks = lookups.map(buildLookupTable);
  const lookupList = concatWithOffsets(lookupBlocks, 2 + lookups.length * 2);

  const table = new Uint8Array(lookupListOffset + lookupList.bytes.length);
  const view = new DataView(table.buffer);

  view.setUint32(0, 0x00010000);
  view.setUint16(4, scriptListOffset);
  view.setUint16(6, featureListOffset);
  view.setUint16(8, lookupListOffset);
  view.setUint16(scriptListOffset, 0); // scriptCount

  const featureView = new DataView(
    featureList.bytes.buffer,
    featureList.bytes.byteOffset
  );
  featureView.setUint16(0, declared.length);
  declared.forEach(({ tag }, i) => {
    // FeatureRecord: Tag, Offset16 to the Feature table, from the FeatureList's start.
    const record = 2 + i * 6;
    writeTag(featureView, record, tag);
    featureView.setUint16(record + 4, featureList.offsets[i]);
  });
  table.set(featureList.bytes, featureListOffset);

  const lookupView = new DataView(
    lookupList.bytes.buffer,
    lookupList.bytes.byteOffset
  );
  lookupView.setUint16(0, lookups.length);
  lookups.forEach((_, i) => {
    lookupView.setUint16(2 + i * 2, lookupList.offsets[i]);
  });
  table.set(lookupList.bytes, lookupListOffset);

  return table;
}

/** Feature table: featureParamsOffset, lookupIndexCount, the indices, the params. */
function buildFeatureTable({ lookupIndices = [], params }: SyntheticFeature) {
  const headerSize = 4 + lookupIndices.length * 2;
  const block = new Uint8Array(headerSize + (params?.length ?? 0));
  const view = new DataView(block.buffer);
  view.setUint16(0, params ? headerSize : 0);
  view.setUint16(2, lookupIndices.length);
  lookupIndices.forEach((index, i) => view.setUint16(4 + i * 2, index));
  if (params) block.set(params, headerSize);
  return block;
}

/** Lookup table: lookupType, lookupFlag, subTableCount, the subtable offsets. */
function buildLookupTable({ type, subtables }: SyntheticLookup) {
  const subtableList = concatWithOffsets(subtables, 6 + subtables.length * 2);
  const view = new DataView(
    subtableList.bytes.buffer,
    subtableList.bytes.byteOffset
  );
  view.setUint16(0, type);
  view.setUint16(2, 0); // lookupFlag
  view.setUint16(4, subtables.length);
  subtables.forEach((_, i) =>
    view.setUint16(6 + i * 2, subtableList.offsets[i])
  );
  return subtableList.bytes;
}

/**
 * `blocks` laid end to end after `headerSize` bytes of room, with where each one
 * landed. The header is left as zeroes for the caller to fill in.
 */
function concatWithOffsets(blocks: Uint8Array[], headerSize: number) {
  const offsets: number[] = [];
  let at = headerSize;
  for (const block of blocks) {
    offsets.push(at);
    at += block.length;
  }
  const bytes = new Uint8Array(at);
  blocks.forEach((block, i) => bytes.set(block, offsets[i]));
  return { bytes, offsets };
}

/** A stylistic set's FeatureParams: version 0, and the name id of its UI label. */
export function buildStylisticSetParams(uiNameId: number): Uint8Array {
  const params = new Uint8Array(4);
  new DataView(params.buffer).setUint16(2, uiNameId);
  return params;
}

/** A cvXX FeatureParams block (format 0), with an optional list of code points. */
export function buildCharacterVariantParams({
  labelNameId = 0,
  tooltipNameId = 0,
  sampleTextNameId = 0,
  namedParameterCount = 0,
  firstParameterNameId = 0,
  codePoints = [] as number[],
} = {}): Uint8Array {
  const params = new Uint8Array(14 + codePoints.length * 3);
  const view = new DataView(params.buffer);
  view.setUint16(0, 0); // format
  view.setUint16(2, labelNameId);
  view.setUint16(4, tooltipNameId);
  view.setUint16(6, sampleTextNameId);
  view.setUint16(8, namedParameterCount);
  view.setUint16(10, firstParameterNameId);
  view.setUint16(12, codePoints.length);
  codePoints.forEach((codePoint, i) => {
    const at = 14 + i * 3;
    view.setUint8(at, codePoint >> 16);
    view.setUint16(at + 1, codePoint & 0xffff);
  });
  return params;
}

/** A Coverage table over these glyphs, in either format. */
export function buildCoverageTable(
  glyphs: number[],
  format: 1 | 2 = 1
): Uint8Array {
  const sorted = [...glyphs].sort((a, b) => a - b);

  if (format === 1) {
    const table = new Uint8Array(4 + sorted.length * 2);
    const view = new DataView(table.buffer);
    view.setUint16(0, 1);
    view.setUint16(2, sorted.length);
    sorted.forEach((glyph, i) => view.setUint16(4 + i * 2, glyph));
    return table;
  }

  // Format 2 lists runs, so gather the consecutive ones.
  const ranges: [number, number][] = [];
  for (const glyph of sorted) {
    const last = ranges[ranges.length - 1];
    if (last && glyph === last[1] + 1) last[1] = glyph;
    else ranges.push([glyph, glyph]);
  }

  const table = new Uint8Array(4 + ranges.length * 6);
  const view = new DataView(table.buffer);
  view.setUint16(0, 2);
  view.setUint16(2, ranges.length);
  let coverageIndex = 0;
  ranges.forEach(([start, end], i) => {
    const record = 4 + i * 6;
    view.setUint16(record, start);
    view.setUint16(record + 2, end);
    view.setUint16(record + 4, coverageIndex);
    coverageIndex += end - start + 1;
  });
  return table;
}

/** A single substitution (LookupType 1, format 1): every glyph moves by `delta`. */
export function buildSingleSubstitution(
  glyphs: number[],
  delta: number,
  coverageFormat: 1 | 2 = 1
): Uint8Array {
  const coverage = buildCoverageTable(glyphs, coverageFormat);
  const subtable = new Uint8Array(6 + coverage.length);
  const view = new DataView(subtable.buffer);
  view.setUint16(0, 1); // substFormat
  view.setUint16(2, 6); // coverageOffset, from this subtable's start
  view.setInt16(4, delta);
  subtable.set(coverage, 6);
  return subtable;
}

/**
 * A single substitution (LookupType 1, format 2): each glyph with the one glyph
 * that replaces it, so a test can say exactly what a feature draws instead.
 */
export function buildSingleSubstitutionFormat2(
  substitutions: { glyph: number; substitute: number }[],
  coverageFormat: 1 | 2 = 1
): Uint8Array {
  const sorted = [...substitutions].sort((a, b) => a.glyph - b.glyph);
  const coverage = buildCoverageTable(
    sorted.map((s) => s.glyph),
    coverageFormat
  );
  const headerSize = 6 + sorted.length * 2;
  const subtable = new Uint8Array(headerSize + coverage.length);
  const view = new DataView(subtable.buffer);
  view.setUint16(0, 2); // substFormat
  view.setUint16(2, headerSize); // coverageOffset
  view.setUint16(4, sorted.length); // glyphCount
  sorted.forEach(({ substitute }, i) => view.setUint16(6 + i * 2, substitute));
  subtable.set(coverage, headerSize);
  return subtable;
}

/** An alternate substitution (LookupType 3): each glyph with its list of choices. */
export function buildAlternateSubstitution(
  alternates: { glyph: number; choices: number[] }[],
  coverageFormat: 1 | 2 = 1
): Uint8Array {
  const sorted = [...alternates].sort((a, b) => a.glyph - b.glyph);
  const coverage = buildCoverageTable(
    sorted.map((a) => a.glyph),
    coverageFormat
  );
  const sets = sorted.map(({ choices }) => {
    const set = new Uint8Array(2 + choices.length * 2);
    const view = new DataView(set.buffer);
    view.setUint16(0, choices.length);
    choices.forEach((glyph, i) => view.setUint16(2 + i * 2, glyph));
    return set;
  });

  const headerSize = 6 + sorted.length * 2;
  const body = concatWithOffsets(sets, headerSize + coverage.length);
  const subtable = new Uint8Array(body.bytes.length);
  subtable.set(body.bytes);
  subtable.set(coverage, headerSize);
  const view = new DataView(subtable.buffer);
  view.setUint16(0, 1); // substFormat
  view.setUint16(2, headerSize); // coverageOffset
  view.setUint16(4, sorted.length); // alternateSetCount
  sorted.forEach((_, i) => view.setUint16(6 + i * 2, body.offsets[i]));
  return subtable;
}

/**
 * An extension subtable (LookupType 7) wrapping one of the above, which is how a
 * large font reaches a subtable past the 16-bit offset limit.
 */
export function buildExtensionSubstitution(
  innerType: number,
  inner: Uint8Array
): Uint8Array {
  const subtable = new Uint8Array(8 + inner.length);
  const view = new DataView(subtable.buffer);
  view.setUint16(0, 1); // extensionFormat
  view.setUint16(2, innerType);
  view.setUint32(4, 8); // extensionOffset, from this subtable's start
  subtable.set(inner, 8);
  return subtable;
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

/**
 * A `cmap` mapping exactly these characters to these glyphs, as a single format 4
 * subtable under Windows BMP (platform 3, encoding 1) — the older encoding, and the
 * one whose segment arithmetic is worth testing against.
 */
export function buildCmapFormat4Table(
  entries: { codePoint: number; glyph: number }[]
): Uint8Array {
  // One segment per run of consecutive characters whose glyphs run consecutively
  // too, so that a single idDelta covers the whole run.
  const sorted = [...entries].sort((a, b) => a.codePoint - b.codePoint);
  const segments: { start: number; end: number; delta: number }[] = [];
  for (const { codePoint, glyph } of sorted) {
    const delta = (glyph - codePoint) & 0xffff;
    const last = segments[segments.length - 1];
    if (last && last.delta === delta && codePoint === last.end + 1) {
      last.end = codePoint;
    } else {
      segments.push({ start: codePoint, end: codePoint, delta });
    }
  }
  segments.push({ start: 0xffff, end: 0xffff, delta: 1 }); // the required last segment

  const subtableOffset = 12; // version, numTables, one 8-byte record
  const subtableLength = 16 + segments.length * 8;
  const table = new Uint8Array(subtableOffset + subtableLength);
  const view = new DataView(table.buffer);

  view.setUint16(0, 0); // version
  view.setUint16(2, 1); // numTables
  view.setUint16(4, 3); // platformID
  view.setUint16(6, 1); // encodingID
  view.setUint32(8, subtableOffset);

  view.setUint16(subtableOffset, 4); // format
  view.setUint16(subtableOffset + 2, subtableLength);
  view.setUint16(subtableOffset + 6, segments.length * 2); // segCountX2
  // searchRange/entrySelector/rangeShift: no reader of ours consults them.

  const endCodes = subtableOffset + 14;
  const startCodes = endCodes + segments.length * 2 + 2;
  const deltas = startCodes + segments.length * 2;
  const rangeOffsets = deltas + segments.length * 2;
  segments.forEach(({ start, end, delta }, i) => {
    view.setUint16(endCodes + i * 2, end);
    view.setUint16(startCodes + i * 2, start);
    view.setUint16(deltas + i * 2, delta);
    view.setUint16(rangeOffsets + i * 2, 0); // glyph ids come from the delta alone
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
