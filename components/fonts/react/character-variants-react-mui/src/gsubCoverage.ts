/**
 * Which substitutions a GSUB feature performs, read from its own lookups.
 *
 * Most fonts never say which characters their shape features affect: the cvXX
 * FeatureParams character list is optional and widely skipped, and the stylistic
 * sets (ssXX) have no such field at all. But the substitutions themselves know —
 * a lookup says, glyph by glyph, what it puts in place of what. Reading that and
 * running the cmap backwards (see reverseCmap.ts) gives the characters the font
 * never bothered to name, and comparing one feature's substitutions with another's
 * says when two features are offering the same thing.
 *
 * We read the lookup types that shape alternates are actually built from:
 *
 * - Type 1, single substitution: one glyph for one glyph, which is what nearly
 *   every "draw this letter differently" feature is.
 * - Type 3, alternate substitution: one glyph, several choices.
 * - Type 7, extension: a wrapper that says "the real subtable is over there",
 *   used by large fonts to reach past the 16-bit offset limit. We unwrap it.
 *
 * Everything else is skipped without complaint. Ligature and contextual lookups
 * (types 2, 4, 5, 6, 8) substitute for runs of glyphs rather than single ones, so
 * "the characters this affects" is a fuzzier question than the UI needs; a font
 * whose set contains only those simply reports nothing, as before.
 *
 * Spec: https://learn.microsoft.com/en-us/typography/opentype/spec/gsub
 */

const SINGLE_SUBSTITUTION = 1;
const ALTERNATE_SUBSTITUTION = 3;
const EXTENSION_SUBSTITUTION = 7;

// An extension pointing at an extension is malformed; this only guards a font
// that would otherwise send us round in circles.
const MAX_EXTENSION_DEPTH = 4;

/**
 * What a feature does, as the glyphs it draws instead: each input glyph mapped to
 * every glyph the feature can put in its place. An alternate substitution offers
 * several, so the values are sets.
 */
export type Substitutions = Map<number, Set<number>>;

/**
 * The substitutions one feature's lookups perform.
 *
 * `cache` is keyed by lookup index and should be reused across the features of a
 * single font: fonts routinely point several features at the same lookup, and a
 * Coverage table can list thousands of glyphs.
 */
export function readFeatureSubstitutions(
  view: DataView,
  gsubOffset: number,
  lookupIndices: number[],
  cache: Map<number, Substitutions>
): Substitutions {
  const all: Substitutions = new Map();
  for (const index of lookupIndices) {
    for (const [input, outputs] of readLookupSubstitutions(
      view,
      gsubOffset,
      index,
      cache
    )) {
      const already = all.get(input);
      if (already) for (const output of outputs) already.add(output);
      else all.set(input, new Set(outputs));
    }
  }
  return all;
}

/** The substitutions a single lookup performs, remembered in `cache`. */
export function readLookupSubstitutions(
  view: DataView,
  gsubOffset: number,
  lookupIndex: number,
  cache: Map<number, Substitutions>
): Substitutions {
  const remembered = cache.get(lookupIndex);
  if (remembered) return remembered;

  const substitutions: Substitutions = new Map();
  try {
    // GSUB header: uint32 version, Offset16 scriptList, featureList, lookupList.
    const lookupList = gsubOffset + view.getUint16(gsubOffset + 8);
    if (lookupIndex < view.getUint16(lookupList)) {
      const lookup =
        lookupList + view.getUint16(lookupList + 2 + lookupIndex * 2);
      collectFromLookup(view, lookup, substitutions);
    }
  } catch {
    // A lookup whose offsets run off the end tells us nothing; the feature is
    // still real, it just goes back to having no characters of its own.
  }

  cache.set(lookupIndex, substitutions);
  return substitutions;
}

function collectFromLookup(
  view: DataView,
  lookup: number,
  into: Substitutions
): void {
  // Lookup: uint16 lookupType, uint16 lookupFlag, uint16 subTableCount,
  // then an Offset16 per subtable, measured from the Lookup's own start.
  const type = view.getUint16(lookup);
  const subtableCount = view.getUint16(lookup + 4);
  for (let i = 0; i < subtableCount; i++) {
    collectFromSubtable(
      view,
      type,
      lookup + view.getUint16(lookup + 6 + i * 2),
      into,
      0
    );
  }
}

function collectFromSubtable(
  view: DataView,
  type: number,
  subtable: number,
  into: Substitutions,
  depth: number
): void {
  if (type === EXTENSION_SUBSTITUTION) {
    if (depth >= MAX_EXTENSION_DEPTH) return;
    // ExtensionSubstFormat1: uint16 format, uint16 extensionLookupType,
    // Offset32 extensionOffset, from this subtable's start.
    if (view.getUint16(subtable) !== 1) return;
    collectFromSubtable(
      view,
      view.getUint16(subtable + 2),
      subtable + view.getUint32(subtable + 4),
      into,
      depth + 1
    );
    return;
  }

  if (type !== SINGLE_SUBSTITUTION && type !== ALTERNATE_SUBSTITUTION) return;

  // Both types start the same way: uint16 substFormat, Offset16 coverageOffset.
  // The glyphs a substitution applies to are exactly its Coverage table, listed in
  // the order the subtable's own arrays are indexed by.
  const format = view.getUint16(subtable);
  const inputs = readCoverageGlyphs(
    view,
    subtable + view.getUint16(subtable + 2)
  );

  const add = (input: number, output: number) => {
    const outputs = into.get(input);
    if (outputs) outputs.add(output);
    else into.set(input, new Set([output]));
  };

  if (type === SINGLE_SUBSTITUTION && format === 1) {
    // SingleSubstFormat1: every glyph is replaced by the one deltaGlyphID along.
    const delta = view.getInt16(subtable + 4);
    for (const input of inputs) add(input, (input + delta) & 0xffff);
    return;
  }

  if (type === SINGLE_SUBSTITUTION && format === 2) {
    // SingleSubstFormat2: uint16 glyphCount, then one substitute per input.
    const count = view.getUint16(subtable + 4);
    inputs.forEach((input, i) => {
      if (i < count) add(input, view.getUint16(subtable + 6 + i * 2));
    });
    return;
  }

  if (type === ALTERNATE_SUBSTITUTION && format === 1) {
    // AlternateSubstFormat1: uint16 alternateSetCount, then an Offset16 per input
    // to an AlternateSet: uint16 glyphCount, then that many alternates.
    const count = view.getUint16(subtable + 4);
    inputs.forEach((input, i) => {
      if (i >= count) return;
      const set = subtable + view.getUint16(subtable + 6 + i * 2);
      const alternates = view.getUint16(set);
      for (let a = 0; a < alternates; a++) {
        add(input, view.getUint16(set + 2 + a * 2));
      }
    });
  }
}

/**
 * The glyphs a Coverage table lists, in coverage-index order — which is the order
 * a subtable's parallel arrays of substitutes are in.
 */
export function readCoverageGlyphs(view: DataView, offset: number): number[] {
  const glyphs: number[] = [];
  const format = view.getUint16(offset);

  if (format === 1) {
    // Format 1: uint16 coverageFormat, uint16 glyphCount, then the glyph ids.
    const count = view.getUint16(offset + 2);
    for (let i = 0; i < count; i++) {
      glyphs.push(view.getUint16(offset + 4 + i * 2));
    }
  } else if (format === 2) {
    // Format 2: uint16 coverageFormat, uint16 rangeCount, then RangeRecords of
    // uint16 startGlyphID, uint16 endGlyphID, uint16 startCoverageIndex.
    const count = view.getUint16(offset + 2);
    for (let i = 0; i < count; i++) {
      const record = offset + 4 + i * 6;
      const last = view.getUint16(record + 2);
      for (let glyph = view.getUint16(record); glyph <= last; glyph++) {
        glyphs.push(glyph);
      }
    }
  }

  return glyphs;
}
