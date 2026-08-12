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
  readCharacterVariants,
} from "./readCharacterVariants";
import { readCoverageRanges } from "./fontCoverage";

const CV_TAG = /^cv[0-9]{2}$/;

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

/**
 * Whether a font declares any cvXX feature. Says nothing about whether those
 * features have labels, characters, or anything else worth showing.
 */
export async function fontBlobHasCharacterVariants(
  blob: Blob
): Promise<boolean> {
  let base = 0;
  let header = await readRange(blob, 0, 12);
  if (tagAt(header, 0) === "ttcf") {
    // A collection: look at its first font, the same one readCharacterVariants reads.
    base = (await readRange(blob, 12, 4)).getUint32(0);
    header = await readRange(blob, base, 12);
  }
  const numTables = header.getUint16(4);
  const directory = await readRange(blob, base + 12, numTables * 16);

  let gsub = 0;
  for (let i = 0; i < numTables; i++) {
    if (tagAt(directory, i * 16) === "GSUB") {
      gsub = directory.getUint32(i * 16 + 8);
      break;
    }
  }
  if (!gsub) return false; // No GSUB, so no features of any kind.

  const gsubHeader = await readRange(blob, gsub, 10);
  const featureList = gsub + gsubHeader.getUint16(6);
  const count = (await readRange(blob, featureList, 2)).getUint16(0);
  if (count === 0) return false;

  const records = await readRange(blob, featureList + 2, count * 6);
  for (let i = 0; i < count; i++) {
    if (CV_TAG.test(tagAt(records, i * 6))) return true;
  }
  return false;
}

/** What the sweep found out about one font family. */
export interface FamilyScan {
  /** Its cvXX features; empty if it has none, or if we couldn't read it. */
  variants: CharacterVariant[];
  /** The code points it can render, as packed [start, end] pairs. */
  coverage: Uint32Array;
}

/**
 * Work through the installed families, reporting what each one turns out to be as
 * the answer arrives, so a list can fill in while the user reads it. A font we
 * can't make sense of is reported as covering nothing and offering nothing.
 *
 * Three reads per font off one Blob: its coverage, the cheap "any cvXX at all?"
 * question above, and then — only for the few fonts that pass that — the whole
 * font, so the caller can see which characters those features touch. Runs a few at
 * a time: the point is to stay out of the way of the UI, not to finish fast.
 */
export async function scanFamiliesForCharacterVariants(
  families: LocalFontFamily[],
  onResult: (family: string, found: FamilyScan) => void,
  options: { concurrency?: number; signal?: AbortSignal } = {}
): Promise<void> {
  const { concurrency = 4, signal } = options;
  let next = 0;

  const worker = async () => {
    while (next < families.length) {
      if (signal?.aborted) return;
      const { family, postscriptName } = families[next++];
      let variants: CharacterVariant[] = [];
      let coverage = new Uint32Array();
      try {
        const blob = await loadLocalFontBlob(postscriptName);
        coverage = await readCoverageRanges(blob);
        if (await fontBlobHasCharacterVariants(blob)) {
          variants = readCharacterVariants(await blob.arrayBuffer());
        }
      } catch {
        // A font we can't read is a font we can't recommend.
      }
      if (signal?.aborted) return;
      onResult(family, { variants, coverage });
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, families.length) }, worker)
  );
}
