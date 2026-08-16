/**
 * Looks over the installed fonts so the chooser can put the ones that will serve
 * this user first: which characters each font has, and which of them offer letter
 * shapes to choose among.
 *
 * Most of it is answered from ranged reads of a font's Blob rather than the whole
 * file. Measured per family over 342 families (694 faces) on a Windows machine with
 * 645 MB of fonts installed: 370 KB for the "any cvXX?" check, 1.7 MB of cmap
 * subtables for the coverage, and 11.3 MB to read in full the 13 families that
 * turned out to have cvXX features. 84 ms of read and parse for the lot.
 *
 * In Chrome on the same machine, the whole sweep of 331 families took 2.5–2.9 s at
 * the default concurrency, with no main-thread task over 50 ms, so the page stays
 * responsive while it runs. Nearly all of that is `FontData.blob()`, which costs a
 * few ms per face regardless of file size (and isn't cached between calls);
 * `queryLocalFonts()` itself is ~1 ms, and once the Blob exists a ranged read is
 * ~0.5 ms even on a 35 MB font, where materializing it fully costs 16–60 ms.
 */

import { LocalFontFamily, loadLocalFontBlob } from "./localFonts";
import {
  CharacterVariant,
  isShapeFeatureTag,
  readCharacterVariants,
  readNameTable,
} from "./readCharacterVariants";
import { readCoverageRanges } from "./fontCoverage";
import type { DeclaredFamilyFacts, FamilyLicense } from "./declaredFamilyFacts";
import { FontLicenseHints, describeLicense } from "./fontLicense";
import { readRange, readTableOffsets, tagAt } from "./sfntBlob";

/**
 * Whether a font declares any shape feature — a cvXX or a stylistic set. Says
 * nothing about whether those features have labels, characters, or anything else
 * worth showing.
 *
 * `postscriptName` picks the font within a collection (.ttc); see sfntBlob.ts for
 * why that matters.
 */
export async function fontBlobHasCharacterVariants(
  blob: Blob,
  postscriptName?: string
): Promise<boolean> {
  const gsub = (await readTableOffsets(blob, postscriptName))["GSUB"]?.offset;
  if (!gsub) return false; // No GSUB, so no features of any kind.

  const gsubHeader = await readRange(blob, gsub, 10);
  const featureList = gsub + gsubHeader.getUint16(6);
  const count = (await readRange(blob, featureList, 2)).getUint16(0);
  if (count === 0) return false;

  const records = await readRange(blob, featureList + 2, count * 6);
  for (let i = 0; i < count; i++) {
    if (isShapeFeatureTag(tagAt(records, i * 6))) return true;
  }
  return false;
}

/**
 * The licence hints of a font, read the same ranged way as everything else here:
 * the `name` and OS/2 tables only, a few KB rather than the whole file. Both
 * tables carry offsets relative to their own start, so a slice of one parses on
 * its own.
 *
 * Must find everything `readLicenseHints` finds in the whole file, since the two
 * are the same question asked of the same font; a test holds them to that.
 */
export async function readLicenseHintsFromBlob(
  blob: Blob,
  postscriptName?: string
): Promise<FontLicenseHints> {
  const tables = await readTableOffsets(blob, postscriptName);

  let names = new Map<number, string>();
  const name = tables["name"];
  if (name) {
    names = readNameTable(await readRange(blob, name.offset, name.length), 0);
  }

  const os2 = tables["OS/2"];
  return {
    description: names.get(13),
    url: names.get(14),
    // ID 0 as well as 13. Plenty of fonts put the only licence wording they have
    // in the copyright — it is half the rules in fontLicense.ts — and leaving it
    // out here meant the sweep and the whole-bytes reader could answer differently
    // about the same font. Alef, for one: "All rights reserved" read whole, and
    // read here a guess off the embedding bits.
    copyright: names.get(0),
    // OS/2: uint16 version, int16 xAvgCharWidth, uint16 usWeightClass,
    // uint16 usWidthClass, then uint16 fsType.
    fsType: os2
      ? (await readRange(blob, os2.offset + 8, 2)).getUint16(0)
      : undefined,
  };
}

export type { FamilyLicense } from "./declaredFamilyFacts";

/** What the sweep found out about one font family. */
export interface FamilyScan extends FamilyLicense {
  /** Its cvXX features; empty if it has none, or if we couldn't read it. */
  variants: CharacterVariant[];
  /** The code points it can render, as packed [start, end] pairs. */
  coverage: Uint32Array;
  /**
   * Whether `variants` and `coverage` were actually read. False in a result from
   * the licence-only pass, where empty means "we haven't looked" rather than "this
   * font covers nothing and offers nothing" — a distinction a UI has to keep, since
   * the second would have it tell the user the font can't write their alphabet.
   */
  detailsRead: boolean;
}

/** How the two sweeps below share the machine out. */
export interface ScanOptions {
  concurrency?: number;
  signal?: AbortSignal;
}

/**
 * Read what each family's licence looks like, and nothing else. A few KB per font:
 * the `name` and OS/2 tables off the same ranged reads as everything else here.
 *
 * This is the cheap question, and the one whose answer decides which fonts are
 * worth asking the expensive ones about, so a caller that means to defer work runs
 * this over everything first and `scanFamiliesForCharacterVariants` over the subset
 * it settles on.
 *
 * A family whose host declared a licence is reported from that and never read.
 */
export async function scanFamiliesForLicense(
  families: LocalFontFamily[],
  onResult: (family: string, found: FamilyLicense) => void,
  options: ScanOptions = {}
): Promise<void> {
  await eachFamily(families, options, async (listed) => {
    const { family, postscriptName, declared } = listed;
    if (hasDeclaredLicense(listed)) {
      return () => onResult(family, declaredLicenseOf(declared));
    }
    let found: FamilyLicense = {};
    try {
      const blob = await loadLocalFontBlob(postscriptName);
      found = await readFamilyLicense(blob, postscriptName);
    } catch {
      // A font that won't tell us is left as it was: nothing claimed.
    }
    return () => onResult(family, found);
  });
}

/**
 * Work through the given families, reporting what each one turns out to be as the
 * answer arrives, so a list can fill in while the user reads it. A font we can't
 * make sense of is reported as covering nothing and offering nothing.
 *
 * Three reads per font off one Blob: its coverage, the cheap "any cvXX at all?"
 * question above, and then — only for the few fonts that pass that — the whole
 * font, so the caller can see which characters those features touch. Runs a few at
 * a time: the point is to stay out of the way of the UI, not to finish fast.
 *
 * Pass `readLicense: false` where the licence is already in hand (from
 * `scanFamiliesForLicense`, or from a cache): the results then leave `license` and
 * `licenseUrl` undefined rather than saying the font declares nothing.
 *
 * Whatever the host declared about a family is used as it stands, and only what
 * is left over is read. A family that declared coverage and variants both costs
 * no file access at all — the point of `declared`, since the host's own bundle is
 * every font in the list on an app's first run.
 */
export async function scanFamiliesForCharacterVariants(
  families: LocalFontFamily[],
  onResult: (family: string, found: FamilyScan) => void,
  options: ScanOptions & { readLicense?: boolean } = {}
): Promise<void> {
  const { readLicense = true } = options;

  await eachFamily(families, options, async (listed) => {
    const { family, postscriptName, declared } = listed;
    const wantLicense = readLicense && !hasDeclaredLicense(listed);
    const wantCoverage = declared?.coverage === undefined;
    // An empty declared array says the family offers no letter shapes, which is
    // an answer; only `undefined` means nobody has looked.
    const wantVariants = declared?.variants === undefined;

    let variants: CharacterVariant[] = declared?.variants ?? [];
    let coverage = declared?.coverage ?? new Uint32Array();
    let license: FamilyLicense = readLicense ? declaredLicenseOf(declared) : {};

    if (wantLicense || wantCoverage || wantVariants) {
      try {
        // The blob is the whole file, which for a collection holds other families
        // too, so every read of it has to say which face we asked for.
        const blob = await loadLocalFontBlob(postscriptName);
        if (wantCoverage)
          coverage = await readCoverageRanges(blob, postscriptName);
        if (wantLicense)
          license = await readFamilyLicense(blob, postscriptName);
        if (
          wantVariants &&
          (await fontBlobHasCharacterVariants(blob, postscriptName))
        ) {
          variants = readCharacterVariants(
            await blob.arrayBuffer(),
            postscriptName
          );
        }
      } catch {
        // A font we can't read is a font we can't recommend.
      }
    }

    return () =>
      onResult(family, { variants, coverage, detailsRead: true, ...license });
  });
}

/** Whether the host has said what this family's licence is. */
export function hasDeclaredLicense(family: LocalFontFamily): boolean {
  return family.declared?.license !== undefined;
}

/**
 * Whether the host has said everything the expensive pass would go and read, so
 * that running it over this family would touch no bytes and change nothing.
 */
export function hasDeclaredDetails(family: LocalFontFamily): boolean {
  return (
    family.declared?.coverage !== undefined &&
    family.declared?.variants !== undefined
  );
}

/**
 * What the host declared, as a scan result, for a caller that wants to show it
 * without waiting for a sweep to hand it back. Undefined where nothing at all
 * was declared.
 */
export function declaredScanOf(
  family: LocalFontFamily
): Partial<FamilyScan> | undefined {
  const declared = family.declared;
  if (!declared) return undefined;
  const found: Partial<FamilyScan> = declaredLicenseOf(declared);
  if (hasDeclaredDetails(family)) {
    found.coverage = declared.coverage;
    found.variants = declared.variants;
    found.detailsRead = true;
  }
  return Object.keys(found).length > 0 ? found : undefined;
}

/** The licence half of a declaration, with nothing invented for what it omits. */
function declaredLicenseOf(declared?: DeclaredFamilyFacts): FamilyLicense {
  if (declared?.license === undefined) return {};
  return {
    license: declared.license,
    licenseUrl: declared.licenseUrl,
    licenseReason: declared.licenseReason,
  };
}

/** The licence of one font, or nothing claimed if it won't parse. */
async function readFamilyLicense(
  blob: Blob,
  postscriptName: string
): Promise<FamilyLicense> {
  try {
    const hints = await readLicenseHintsFromBlob(blob, postscriptName);
    const verdict = describeLicense(hints);
    return {
      license: verdict.category,
      licenseUrl: hints.url,
      licenseReason: verdict.notes,
    };
  } catch {
    return {};
  }
}

/**
 * Run `work` over every family, a few at a time. The worker hands back what to
 * report rather than reporting as it goes, so that an abort arriving between the
 * last read and the callback drops the result instead of writing to a caller that
 * has already moved on.
 */
async function eachFamily(
  families: LocalFontFamily[],
  { concurrency = 4, signal }: ScanOptions,
  work: (family: LocalFontFamily) => Promise<() => void>
): Promise<void> {
  let next = 0;

  const worker = async () => {
    while (next < families.length) {
      if (signal?.aborted) return;
      const report = await work(families[next++]);
      if (signal?.aborted) return;
      report();
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, families.length) }, worker)
  );
}
