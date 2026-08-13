/**
 * A small OpenType reader that pulls a font's shape features out of its GSUB
 * table, together with whatever UI strings the font supplies for them in its
 * `name` table.
 *
 * Two families of feature say "here is another way to draw this", and to a user
 * they are the same offer differently encoded, so we read both:
 *
 * - cv01..cv99, character variants, which may name the characters they affect,
 *   supply a sample, and name each alternate.
 * - ss01..ss20, stylistic sets, which carry nothing but a name for the set.
 *
 * Whichever family it is, a feature that doesn't name its characters gets them
 * worked out from the substitutions it performs; see gsubCoverage.ts.
 *
 * Spec: https://learn.microsoft.com/en-us/typography/opentype/spec/features_ae#tag-cv01---cv99
 * Format of the cvXX FeatureParams table:
 * https://learn.microsoft.com/en-us/typography/opentype/spec/chapter2#featureparams-table-for-cvxx-features
 *
 * We read the bytes ourselves rather than depending on opentype.js/fontkit because
 * all we need is one table walk, and the cvXX FeatureParams (the interesting part)
 * aren't exposed by those libraries anyway.
 *
 * Only uncompressed sfnt data is understood: .ttf, .otf, and .ttc (first font of a
 * collection). WOFF/WOFF2 would have to be decompressed first.
 */

import { Substitutions, readFeatureSubstitutions } from "./gsubCoverage";
import { buildReverseCmap } from "./reverseCmap";

/** One shape feature as the font describes it: a cvXX or a stylistic set. */
export interface CharacterVariant {
  /** e.g. "cv07" or "ss01" */
  tag: string;
  /** The number in the tag (1..99 for cvXX, 1..20 for ssXX), for sorting and display */
  number: number;
  /** The font's own name for this feature, e.g. "Alternate a" */
  label?: string;
  /** Longer explanation the font suggests showing in a tooltip */
  tooltip?: string;
  /** Text the font suggests using to show off this feature */
  sampleText?: string;
  /**
   * Labels for the individual alternates, when the font names them. A feature with
   * named parameters can be set to 1..parameterLabels.length rather than just on/off.
   */
  parameterLabels: string[];
  /**
   * The characters this feature affects, as single-character strings. Taken from
   * the font's own cvXX character list when it declares one, and otherwise worked
   * out from the substitutions the feature performs; see gsubCoverage.ts.
   */
  characters: string[];
  /** Code points of `characters` */
  codePoints: number[];
}

export interface TableEntry {
  offset: number;
  length: number;
}

const CV_TAG = /^cv([0-9]{2})$/;
// Stylistic sets run ss01..ss20 and no further.
const SS_TAG = /^ss(0[1-9]|1[0-9]|20)$/;

/** Whether a feature tag is one of the shape features we show the user. */
export function isShapeFeatureTag(tag: string): boolean {
  return CV_TAG.test(tag) || SS_TAG.test(tag);
}

/**
 * Every feature tag the font's GSUB table declares, e.g. "liga", "onum", "cv01".
 * Empty for a font with no GSUB. Each tag appears once however many script and
 * language systems list it.
 *
 * `postscriptName` says which font of a collection (.ttc) is meant; see
 * readTableDirectory.
 */
export function readGsubFeatureTags(
  fontData: ArrayBuffer,
  postscriptName?: string
): Set<string> {
  const view = new DataView(fontData);
  const gsub = readTableDirectory(view, postscriptName)["GSUB"];
  return gsub ? readFeatureTags(view, gsub.offset) : new Set<string>();
}

/**
 * Whether the font offers old style (text) figures through its "onum" feature.
 * Some fonts instead ship them as a separate face, or under "pnum"/"tnum" only,
 * so a false here means "we found no onum", not "this font has none".
 */
export function hasOldStyleNumerals(
  fontData: ArrayBuffer,
  postscriptName?: string
): boolean {
  return readGsubFeatureTags(fontData, postscriptName).has("onum");
}

/** The feature tags of one GSUB table, given the table's offset in `view`. */
function readFeatureTags(view: DataView, gsubOffset: number): Set<string> {
  const tags = new Set<string>();
  for (const { tag } of featureRecords(view, gsubOffset)) tags.add(tag);
  return tags;
}

/**
 * Walk a GSUB table's FeatureList, yielding each feature's tag and the offset of
 * its Feature table. The same feature is usually listed once per script/language
 * system, so tags repeat.
 */
function* featureRecords(
  view: DataView,
  gsubOffset: number
): Generator<{ tag: string; featureOffset: number }> {
  // GSUB header: uint32 version, then Offset16 to the script, feature and lookup lists.
  const featureListOffset = gsubOffset + view.getUint16(gsubOffset + 6);
  const featureCount = view.getUint16(featureListOffset);

  for (let i = 0; i < featureCount; i++) {
    // FeatureRecord: Tag featureTag, Offset16 featureOffset (from the FeatureList).
    const record = featureListOffset + 2 + i * 6;
    yield {
      tag: readTag(view, record),
      featureOffset: featureListOffset + view.getUint16(record + 4),
    };
  }
}

/**
 * Read the cvXX features out of raw font bytes, sorted by tag.
 * Returns an empty array for a font with no character variants.
 * Throws if the bytes aren't a font we can read.
 *
 * `postscriptName` says which font of a collection (.ttc) is meant; see
 * readTableDirectory.
 */
export function readCharacterVariants(
  fontData: ArrayBuffer,
  postscriptName?: string
): CharacterVariant[] {
  const view = new DataView(fontData);
  const tables = readTableDirectory(view, postscriptName);

  const gsub = tables["GSUB"];
  if (!gsub) return [];

  const names = tables["name"]
    ? readNameTable(view, tables["name"].offset)
    : new Map<number, string>();

  const variants: CharacterVariant[] = [];
  const seen = new Set<string>();

  // Built only if some feature turns out to need it, and then shared by all of
  // them: running the cmap backwards costs a pass over every character the font
  // has, and a font's lookups are routinely shared between features.
  let reverseCmap: Map<number, number> | undefined;
  const substitutionsOfLookup = new Map<number, Substitutions>();
  const substitutionsOfTag = new Map<string, Substitutions>();
  const charactersOf = (substitutions: Substitutions) => {
    if (!tables["cmap"]) return { characters: [], codePoints: [] };
    reverseCmap ??= buildReverseCmap(view, tables["cmap"].offset);
    return derivedCharacters(substitutions, reverseCmap);
  };

  for (const { tag, featureOffset } of featureRecords(view, gsub.offset)) {
    if (!isShapeFeatureTag(tag)) continue;
    if (seen.has(tag)) continue;
    seen.add(tag);

    // FeatureTable: Offset16 featureParamsOffset, uint16 lookupIndexCount, ...
    // The spec says this offset is measured from the start of the Feature table.
    // (Some old fonts, and the 'size' feature in particular, measure it from the
    // start of the FeatureList instead; we don't try to cope with that here.)
    const paramsOffset = view.getUint16(featureOffset);
    const params = paramsOffset ? featureOffset + paramsOffset : 0;
    const cv = CV_TAG.exec(tag);
    const number = parseInt(tag.slice(2), 10);

    const described = cv
      ? params
        ? readFeatureParams(view, params, names)
        : { parameterLabels: [], characters: [], codePoints: [] }
      : readStylisticSetParams(view, params, names, number);

    const substitutions = readFeatureSubstitutions(
      view,
      gsub.offset,
      featureLookupIndices(view, featureOffset),
      substitutionsOfLookup
    );
    substitutionsOfTag.set(tag, substitutions);

    variants.push({
      tag,
      number,
      ...described,
      // The font's own character list is authoritative, and cheaper. Only when it
      // declares none — which is most fonts, and every stylistic set — do we go
      // and ask the substitutions themselves.
      ...(described.characters.length > 0 ? {} : charactersOf(substitutions)),
    });
  }

  // cvXX first, then the stylistic sets, each in numeric order. Both families
  // number from 1, so the tag has to break the tie. Callers showing these to
  // someone sort them by the characters they affect instead; see alphabet.ts.
  variants.sort(
    (a, b) =>
      a.tag.slice(0, 2).localeCompare(b.tag.slice(0, 2)) || a.number - b.number
  );
  return dropRedundantSets(variants, substitutionsOfTag);
}

/** The lookups a Feature table applies, as indices into the LookupList. */
function featureLookupIndices(view: DataView, featureOffset: number): number[] {
  // Feature table: Offset16 featureParamsOffset, uint16 lookupIndexCount, then
  // a uint16 index into the LookupList per lookup.
  const count = view.getUint16(featureOffset + 2);
  const indices: number[] = [];
  for (let i = 0; i < count; i++) {
    indices.push(view.getUint16(featureOffset + 4 + i * 2));
  }
  return indices;
}

/**
 * Leave out the stylistic sets that offer nothing the font's finer-grained
 * features don't already offer.
 *
 * Fonts built for a particular audience ship bundles. Andika has three sets over
 * the same two letters: "Double-story a", "Double-story g", and a "Double-story a
 * and g" that is exactly the two of them together. Inter's "Open digits" is its
 * cv02, cv03, cv04 and cv09 in one switch. Offering both the bundle and its parts
 * puts the same choice in front of the user twice, and the two copies have no way
 * to agree with each other about which form is chosen.
 *
 * The test is the substitutions themselves rather than the labels or the
 * character lists, since those agree only by luck: a feature is redundant when
 * every (glyph → glyph) pair it performs is one that other features already
 * perform. Perform even one substitution nothing else offers and it stays, because
 * turning it on then does something the smaller features can't — and redrawing the
 * same character a different way counts, since that is a different pair.
 *
 * Only stylistic sets are candidates, and the comparison always favours the finer
 * offer: every cvXX counts against a set, since a cvXX is about one shape and
 * carries the font's own name for it, while another set counts only if it performs
 * fewer substitutions, so that a bundle gives way to its parts and never the parts
 * to the bundle. Two sets that perform exactly the same substitutions both stay,
 * there being no principled way to pick between them.
 *
 * A set whose substitutions we couldn't read at all — contextual lookups, say — is
 * kept. An empty set of pairs is trivially a subset of anything, and dropping a
 * feature on the strength of what we failed to read would hide a real choice.
 */
function dropRedundantSets(
  variants: CharacterVariant[],
  substitutionsOfTag: Map<string, Substitutions>
): CharacterVariant[] {
  const pairsOfTag = new Map(
    variants.map(({ tag }) => [tag, pairsOf(substitutionsOfTag.get(tag))])
  );
  const size = (tag: string) => pairsOfTag.get(tag)?.length ?? 0;

  const redundant = new Set<string>();
  // Largest first, so that a bundle is judged against its parts and never the
  // other way about. A bundle already dropped offers nothing to the next one,
  // since it is only ever compared with features smaller than itself.
  const sets = variants
    .map(({ tag }) => tag)
    .filter((tag) => !CV_TAG.test(tag))
    .sort((a, b) => size(b) - size(a));

  for (const tag of sets) {
    const pairs = pairsOfTag.get(tag) ?? [];
    if (pairs.length === 0) continue;

    const offeredElsewhere = new Set<string>();
    for (const other of variants) {
      if (other.tag === tag) continue;
      // Every cvXX counts, whatever its size, because a cvXX is the finer offer
      // by construction: it is about one shape and carries the font's name for
      // it. Another set counts only if it does less, so that a bundle gives way
      // to its parts rather than the parts to the bundle.
      const finer = CV_TAG.test(other.tag) || size(other.tag) < pairs.length;
      if (!finer) continue;
      for (const pair of pairsOfTag.get(other.tag) ?? []) {
        offeredElsewhere.add(pair);
      }
    }

    if (pairs.every((pair) => offeredElsewhere.has(pair))) redundant.add(tag);
  }

  return redundant.size === 0
    ? variants
    : variants.filter(({ tag }) => !redundant.has(tag));
}

/** One feature's substitutions as comparable "input>output" strings. */
function pairsOf(substitutions: Substitutions | undefined): string[] {
  const pairs: string[] = [];
  for (const [input, outputs] of substitutions ?? []) {
    for (const output of outputs) pairs.push(`${input}>${output}`);
  }
  return pairs;
}

/**
 * A stylistic set's FeatureParams, which say far less than a cvXX's: a version
 * and one name id for the whole set, with no character list and no sample text.
 *
 * Spec: https://learn.microsoft.com/en-us/typography/opentype/spec/chapter2#featureparams-table-for-ssxx-features
 */
function readStylisticSetParams(
  view: DataView,
  offset: number,
  names: Map<number, string>,
  number: number
): Omit<CharacterVariant, "tag" | "number"> {
  // StylisticSetParams: uint16 version, uint16 UINameID.
  const uiNameId = offset ? view.getUint16(offset + 2) : 0;
  return {
    // Fonts that name their sets say things like "Open digits" or "Single-storey
    // a". The ones that don't leave us nothing but the number.
    label: uiName(names, uiNameId) ?? `Alternate style ${number}`,
    // A set is on or off; there is no list of named alternates to choose among.
    parameterLabels: [],
    characters: [],
    codePoints: [],
  };
}

/**
 * A UI string a feature points at, if it points at one.
 *
 * The spec puts every name id a feature may cite above 255, leaving 0-255 to the
 * font's own metadata, and 0 in particular means "no string here". Carlito's
 * stylistic sets carry no parameters at all, so every one of them asks for name id
 * 0 — and looking that up unguarded named all four of them after the font's
 * copyright notice.
 */
function uiName(
  names: Map<number, string>,
  nameId: number
): string | undefined {
  return nameId > 255 ? names.get(nameId) : undefined;
}

/**
 * Whether a code point is one nobody types: the Private Use Area, where fonts park
 * their own extra shapes. Inter, for one, encodes several alternates there and then
 * builds features over them, so its cv01 covers "1", "¹", "₁", "①" and four private
 * code points that would show the user tofu or a shape belonging to whichever other
 * font claimed the same slot.
 */
function isPrivateUse(codePoint: number): boolean {
  return (
    (codePoint >= 0xe000 && codePoint <= 0xf8ff) ||
    (codePoint >= 0xf0000 && codePoint <= 0x10fffd)
  );
}

/**
 * The characters a feature affects, worked out from the glyphs its lookups
 * redraw. Empty when the feature substitutes nothing we can follow, or when none
 * of its glyphs correspond to a character in the cmap.
 */
function derivedCharacters(
  substitutions: Substitutions,
  reverseCmap: Map<number, number>
): { characters: string[]; codePoints: number[] } {
  const codePoints = [
    ...new Set(
      [...substitutions.keys()]
        .map((glyph) => reverseCmap.get(glyph))
        .filter(
          (codePoint): codePoint is number =>
            codePoint !== undefined && !isPrivateUse(codePoint)
        )
    ),
  ].sort((a, b) => a - b);

  return {
    codePoints,
    characters: codePoints.map((c) => String.fromCodePoint(c)),
  };
}

function readFeatureParams(
  view: DataView,
  offset: number,
  names: Map<number, string>
): Omit<CharacterVariant, "tag" | "number"> {
  const format = view.getUint16(offset);
  if (format !== 0) {
    // An unknown format: we know the feature exists but not how to describe it.
    return { parameterLabels: [], characters: [], codePoints: [] };
  }

  const labelNameId = view.getUint16(offset + 2);
  const tooltipNameId = view.getUint16(offset + 4);
  const sampleTextNameId = view.getUint16(offset + 6);
  const numNamedParameters = view.getUint16(offset + 8);
  const firstParamNameId = view.getUint16(offset + 10);
  const charCount = view.getUint16(offset + 12);

  const parameterLabels: string[] = [];
  for (let i = 0; i < numNamedParameters; i++) {
    parameterLabels.push(uiName(names, firstParamNameId + i) ?? `${i + 1}`);
  }

  const codePoints: number[] = [];
  for (let i = 0; i < charCount; i++) {
    // uint24 each
    codePoints.push(readUint24(view, offset + 14 + i * 3));
  }

  return {
    label: uiName(names, labelNameId),
    tooltip: uiName(names, tooltipNameId),
    sampleText: uiName(names, sampleTextNameId),
    parameterLabels,
    codePoints,
    characters: codePoints.map((c) => String.fromCodePoint(c)),
  };
}

/**
 * Where each table sits in the font. For a collection (.ttc), which of its fonts
 * we read depends on `postscriptName`: pass the face you actually asked for, or
 * the first font of the collection is used, which is very likely the wrong family.
 */
export function readTableDirectory(
  view: DataView,
  postscriptName?: string
): Record<string, TableEntry> {
  let directory = 0;
  if (readTag(view, 0) === "ttcf") {
    directory = chooseSubfont(view, postscriptName);
  }
  return readTableDirectoryAt(view, directory);
}

/**
 * The offset of the font we want within a collection. A .ttc holds several
 * families in one file, and the platform hands us the whole file whichever face we
 * asked for, so taking the first font means reporting some other family's
 * characters and features as if they were this one's. We ask each font in turn
 * what it is called and take the one that answers to the name we asked for.
 *
 * ttcf header: Tag, uint16 majorVersion, uint16 minorVersion, uint32 numFonts,
 * then an Offset32 per font.
 */
function chooseSubfont(view: DataView, postscriptName?: string): number {
  const firstFont = view.getUint32(12);
  const numFonts = view.getUint32(8);
  if (!postscriptName || numFonts <= 1) return firstFont;

  let bestOffset = firstFont;
  let bestScore = 0;
  for (let i = 0; i < numFonts; i++) {
    const offset = view.getUint32(12 + i * 4);
    let score = 0;
    try {
      const tables = readTableDirectoryAt(view, offset);
      if (!tables["name"]) continue;
      score = scoreSubfontName(
        readNameTable(view, tables["name"].offset),
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

/**
 * How well a font's `name` table answers to the name we asked for: its PostScript
 * name (ID 6) is the one we are given and the one to trust, with the full name
 * (ID 4) and the family (ID 1) as looser fallbacks. 0 for no match at all.
 */
export function scoreSubfontName(
  names: Map<number, string>,
  postscriptName: string
): number {
  const wanted = normalizeFontName(postscriptName);
  if (!wanted) return 0;
  if (normalizeFontName(names.get(6)) === wanted) return 3;
  if (normalizeFontName(names.get(4)) === wanted) return 2;
  if (normalizeFontName(names.get(1)) === wanted) return 1;
  return 0;
}

// The same font is "NotoSerifCJKjp-Regular" in one field and "Noto Serif CJK JP
// Regular" in another, so we compare without the spaces and hyphens.
function normalizeFontName(name: string | undefined): string {
  return (name ?? "").toLowerCase().replace(/[\s-]/g, "");
}

function readTableDirectoryAt(
  view: DataView,
  directory: number
): Record<string, TableEntry> {
  const version = readTag(view, directory);
  const isSfnt =
    version === "OTTO" ||
    version === "true" ||
    version === "typ1" ||
    view.getUint32(directory) === 0x00010000;
  if (!isSfnt) {
    throw new Error(
      "This does not look like a .ttf/.otf/.ttc font (WOFF and WOFF2 are compressed and are not supported)."
    );
  }

  const numTables = view.getUint16(directory + 4);
  const tables: Record<string, TableEntry> = {};
  for (let i = 0; i < numTables; i++) {
    // TableRecord: Tag, uint32 checksum, Offset32 offset, uint32 length
    const record = directory + 12 + i * 16;
    tables[readTag(view, record)] = {
      offset: view.getUint32(record + 8),
      length: view.getUint32(record + 12),
    };
  }
  return tables;
}

/**
 * Collect the `name` table strings by name id. Where a font gives a string in
 * several platforms/languages, we keep the one an English-speaking user is most
 * likely to want. (Localizing these against the app's UI language is future work.)
 */
export function readNameTable(
  view: DataView,
  offset: number
): Map<number, string> {
  const count = view.getUint16(offset + 2);
  const storage = offset + view.getUint16(offset + 4);

  const names = new Map<number, string>();
  const scores = new Map<number, number>();

  for (let i = 0; i < count; i++) {
    // NameRecord: platformID, encodingID, languageID, nameID, length, stringOffset
    const record = offset + 6 + i * 12;
    const platformId = view.getUint16(record);
    const languageId = view.getUint16(record + 4);
    const nameId = view.getUint16(record + 6);
    const length = view.getUint16(record + 8);
    const stringOffset = storage + view.getUint16(record + 10);

    const score =
      platformId === 3 && languageId === 0x409
        ? 3 // Windows, US English
        : platformId === 3
          ? 2 // Windows, some other language
          : platformId === 0
            ? 1 // Unicode
            : 0; // Macintosh
    if ((scores.get(nameId) ?? -1) >= score) continue;

    const text =
      platformId === 1
        ? decodeMacRomanish(view, stringOffset, length)
        : decodeUtf16Be(view, stringOffset, length);
    if (!text) continue;

    names.set(nameId, text);
    scores.set(nameId, score);
  }
  return names;
}

function decodeUtf16Be(view: DataView, offset: number, length: number): string {
  let text = "";
  for (let i = 0; i + 1 < length; i += 2) {
    text += String.fromCharCode(view.getUint16(offset + i));
  }
  return text;
}

// Good enough for the ASCII range, which is all we have ever seen in practice.
function decodeMacRomanish(
  view: DataView,
  offset: number,
  length: number
): string {
  let text = "";
  for (let i = 0; i < length; i++) {
    text += String.fromCharCode(view.getUint8(offset + i));
  }
  return text;
}

function readUint24(view: DataView, offset: number): number {
  return (
    (view.getUint8(offset) << 16) |
    (view.getUint8(offset + 1) << 8) |
    view.getUint8(offset + 2)
  );
}

function readTag(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3)
  );
}
