/**
 * A guess at what a font's own bytes say about its licensing, for a UI that wants
 * to warn "this one may not be yours to ship" before a user builds a book around it.
 *
 * Three hints live in the font, and none is authoritative:
 *
 * - `name` table IDs 13 (license description), 14 (license info URL) and 0
 *   (copyright) are free text. A foundry writes whatever it likes there, including
 *   nothing, and plenty of them put the licence in the copyright string.
 * - The OS/2 `fsType` bits govern EMBEDDING — whether a document may carry the font
 *   along — and say nothing about redistributing the font file itself. A font can
 *   be freely embeddable and still be one you may not hand out.
 *
 * So these are hints for a nudge in the UI, never a licence check. Where the host
 * app knows something about a font (it shipped it, it fetched it from its own font
 * server with metadata attached), that knowledge outranks anything here; the
 * precedence is the consumer's to enforce, since only the consumer has the other side.
 *
 * WHERE THE RULES COME FROM
 *
 * `classifyLicense` mirrors BloomDesktop's `FontMetadata.DetermineSuitability()` in
 * src/BloomExe/FontProcessing/FontMetadata.cs, as of 2026-08, so that a font Bloom
 * calls usable is one this chooser puts in front of the user, and vice versa. The
 * order of the checks, the exact strings, and their case sensitivity are Bloom's;
 * where Bloom compares case-sensitively (`Contains("OFL")`) so do we, and where it
 * lowercases first (`ToLowerInvariant().Contains("open font license")`) so do we.
 *
 * Bloom answers with four values — "ok", "unsuitable", "unknown", "invalid" — which
 * map onto our four like this:
 *
 * - ok                              -> "open"
 * - unsuitable, from licence text   -> "limits-apply" (Microsoft font, contact the
 *                                      vendor, may not copy or distribute, do not
 *                                      distribute, all rights reserved)
 * - unsuitable, from `fsType`       -> "system-restricted" for the bits that refuse
 *                                      embedding outright (restricted licence,
 *                                      bitmaps only), "limits-apply" for print and
 *                                      preview, which permits something. Bloom calls
 *                                      all three unsuitable; both of ours land
 *                                      behind the chooser's closed-fonts disclosure,
 *                                      so the grouping agrees with Bloom's and only
 *                                      the wording the user sees differs.
 * - unknown                         -> "unknown"
 * - invalid                         -> no equivalent. Bloom means "a file type I
 *                                      can't open", chiefly .ttc; we read .ttc, so
 *                                      nothing here produces it.
 *
 * ONE DELIBERATE DIVERGENCE: we read the MIT licence as open and Bloom does not.
 * Bloom has no MIT rule at all, which looks like a gap in its list rather than a
 * decision — the MIT licence permits everything the OFL and Apache rules beside it
 * are there to permit, and an MIT font would otherwise be hidden behind the
 * closed-fonts disclosure for no reason. This is the only place the two lists
 * disagree; keep it that way, and if Bloom gains an MIT rule, delete this note
 * rather than the code.
 *
 * Because it is ours, the MIT rule is also the one rule that runs LAST in each
 * block, after everything that says no. A font's licence text is not always about
 * the whole font: Arial's says "Microsoft supplied font ... Any other use is
 * prohibited" and then reproduces the MIT licence covering the Biblical Hebrew
 * layout logic that Ralph Hancock and John Hudson contributed to it. Tested first,
 * the MIT rule read that component's grant as the font's own and called Arial open.
 * A font that says no anywhere in its licence has said no.
 *
 * Spec: https://learn.microsoft.com/en-us/typography/opentype/spec/os2#fstype
 */

import { readNameTable, readTableDirectory } from "./readCharacterVariants";

/**
 * Bumped whenever the rules below change, so anything caching a verdict can throw
 * away what an older set of rules decided. See fontLicenseCache.ts.
 */
export const LICENSE_CLASSIFICATION_VERSION = 4;

/** How freely a font can probably be used, as far as the font itself admits. */
export type FontLicenseCategory =
  /** A licence we recognize as letting anyone use and pass the font on: OFL and friends. */
  | "open"
  /** Something is declared, and it has limits in it. Worth a human look. */
  | "limits-apply"
  /** The font declares nothing we can make sense of. */
  | "unknown"
  /** The font asks not to be embedded at all: almost certainly one to leave on this machine. */
  | "system-restricted";

/** What the font's own tables say. Any field may be missing. */
export interface FontLicenseHints {
  /** `name` ID 13, the licence text the font carries. */
  description?: string;
  /** `name` ID 14, where the font says its licence lives. */
  url?: string;
  /** `name` ID 0. Fonts often put the only licence wording they have in here. */
  copyright?: string;
  /** The OS/2 embedding permission bits. Embedding only — not distribution. */
  fsType?: number;
}

/** A verdict, with the reason Bloom would have given for it. */
export interface FontLicenseVerdict {
  category: FontLicenseCategory;
  /** Bloom's `determinedSuitabilityNotes` for the rule that fired. */
  notes: string;
}

/**
 * Pull the licence-related fields out of raw font bytes. Returns empty hints for a
 * font that declares none. Throws only if the bytes aren't sfnt data we can read.
 *
 * `postscriptName` says which font of a collection (.ttc) is meant; without it the
 * first font in the collection answers, which may be a different family.
 */
export function readLicenseHints(
  fontData: ArrayBuffer,
  postscriptName?: string
): FontLicenseHints {
  const view = new DataView(fontData);
  const tables = readTableDirectory(view, postscriptName);

  const names = tables["name"]
    ? readNameTable(view, tables["name"].offset)
    : new Map<number, string>();

  return {
    description: names.get(13),
    url: names.get(14),
    copyright: names.get(0),
    // OS/2: uint16 version, int16 xAvgCharWidth, uint16 usWeightClass,
    // uint16 usWidthClass, then uint16 fsType.
    fsType: tables["OS/2"]
      ? view.getUint16(tables["OS/2"].offset + 8)
      : undefined,
  };
}

/**
 * Read the hints as one of four rough answers. Pure, so a caller can test its own
 * UI against it. Remember that a host app's own metadata beats this.
 */
export function classifyLicense(hints: FontLicenseHints): FontLicenseCategory {
  return describeLicense(hints).category;
}

/**
 * The same verdict with the reason attached, which is what makes it possible to
 * check this against Bloom rule by rule. The order of the tests below is Bloom's:
 * the licence text, then the licence URL, then the copyright, then the embedding
 * bits, then giving up.
 */
export function describeLicense(hints: FontLicenseHints): FontLicenseVerdict {
  const license = hints.description ?? "";
  const copyright = hints.copyright ?? "";

  if (license) {
    const lower = license.toLowerCase();
    const openFontLicense =
      lower.includes("open font license") ||
      license.includes("OFL") ||
      // Kmhmu OT has this typo.
      license.includes("SIL OpenFont License");
    const apache = license.startsWith("Licensed under the Apache License");
    const lesserGpl =
      license.includes("GNU LGPL") ||
      license.includes("GNU Lesser General Public License");
    const gpl =
      license.includes("GNU GPL") ||
      license.includes("GNU General Public License") ||
      license.includes(" GPL ") ||
      license.includes(" GNU ") ||
      (license.includes("GNU license") && license.includes("www.gnu.org"));

    if (openFontLicense) return open("Open Font License");
    if (apache) return open("Apache License");
    if (lesserGpl) return open("GNU LGPL");
    if (gpl) return open("GNU GPL");

    if (
      license.replace(/\n/g, " ").includes("free of charge") &&
      license.includes("Bitstream")
    ) {
      return open("Bitstream free license");
    }
    if (license.includes("Microsoft supplied font")) {
      return limited("Microsoft font");
    }
    if (lower.includes("contact the vendor")) {
      return limited(
        copyright.includes("Microsoft Corporation")
          ? "Microsoft font"
          : "Contact the vendor"
      );
    }
    if (lower.includes("you may not copy or distribute")) {
      return limited("You may not copy or distribute");
    }
    if (
      lower.includes(
        "allow to use without any charges and allow to reproduce, study, adapt and distribute this font"
      )
    ) {
      return open("Allow to reproduce and distribute");
    }
    // Ours, not Bloom's, and last for the reason given at the top of the file:
    // an MIT paragraph inside a licence that has already refused permission
    // belongs to some component of the font, not to the font.
    if (namesTheMitLicense(license)) return open("MIT License");
  }

  if (hints.url === "http://dejavu-fonts.org/wiki/License") {
    return open("Bitstream free license");
  }

  if (copyright) {
    if (copyright.includes("Artistic License")) return open("Artistic License");
    if (
      copyright.includes("GNU General Public License") ||
      copyright.includes(" GPL ")
    ) {
      return open("GNU GPL");
    }
    if (
      copyright.includes("GNU Lesser General Public License") ||
      copyright.includes(" LGPL ")
    ) {
      return open("GNU LGPL");
    }
    if (copyright.includes("SIL Open Font License")) {
      return open("Open Font License");
    }
    // British spelling, which is how Ubuntu writes it.
    if (copyright.includes("Ubuntu Font Licence")) {
      return open("Ubuntu Font Licence");
    }
    if (copyright === "No Rights Reserved.") return open("No rights reserved");
    if (copyright.toLowerCase().includes("freeware")) return open("Freeware");
    if (copyright.includes("Creative Commons")) return open("Creative Commons");
    if (copyright.includes("Microsoft Corporation")) {
      return limited("Microsoft font");
    }
    if (copyright.includes("Do not distribute.")) {
      return limited("Do not distribute");
    }
    // Standard boilerplate, but with nothing else to go on, let's believe them.
    if (copyright.toLowerCase().includes("all rights reserved") && !license) {
      return limited("All rights reserved");
    }
    // Ours, not Bloom's, and last for the reason given at the top of the file.
    // "All rights reserved" outranks it: the MIT licence's own notice is a
    // copyright line and a grant of rights, and never that phrase, so a copyright
    // carrying both is one where the MIT half is about something in the font
    // rather than the font — which is exactly what Arial's says.
    if (namesTheMitLicense(copyright)) return open("MIT License");
  }

  const embedding = embeddingPermission(hints.fsType);
  if (embedding === "restricted" || embedding === "bitmaps") {
    return { category: "system-restricted", notes: "unambiguous fsType value" };
  }
  if (embedding === "print") {
    return limited("unambiguous fsType value");
  }

  // Give up. More heuristics may suggest themselves.
  return { category: "unknown", notes: "no reliable information" };
}

/**
 * Whether some text names the MIT licence. Both spellings, either case, but the
 * word "licence" has to be there: a bare "MIT" is as likely to be the university
 * in a copyright line as a grant of rights.
 */
function namesTheMitLicense(text: string): boolean {
  return /\bMIT\s+licen[sc]e\b/i.test(text);
}

function open(notes: string): FontLicenseVerdict {
  return { category: "open", notes };
}

function limited(notes: string): FontLicenseVerdict {
  return { category: "limits-apply", notes };
}

/**
 * What the OS/2 embedding bits permit, read the way Bloom reads them (and, Bloom
 * notes, the way Microsoft's own GlyphTypeface does).
 *
 * Quoting the spec: valid fonts set at most one of bits 1, 2 or 3, so the valid
 * values of that sub-field are 0 (installable), 2 (restricted licence), 4 (preview
 * and print) and 8 (editable). Versions 0 to 2 of the spec did not require them to
 * be mutually exclusive, and said the least restrictive of whatever is set wins.
 * So "restricted" counts only when neither editable nor preview-and-print is set.
 * Bit 9 (0x0200) is bitmap-embedding-only, which sits alongside the others.
 */
function embeddingPermission(
  fsType: number | undefined
): "installable" | "restricted" | "print" | "editable" | "bitmaps" | undefined {
  if (fsType === undefined) return undefined;
  const RESTRICTED = 0x0002;
  const PRINT = 0x0004;
  const EDITABLE = 0x0008;
  const BITMAPS_ONLY = 0x0200;

  if ((fsType & (RESTRICTED | EDITABLE | PRINT)) === RESTRICTED) {
    return "restricted";
  }
  if ((fsType & BITMAPS_ONLY) === BITMAPS_ONLY) return "bitmaps";
  if ((fsType & EDITABLE) === EDITABLE) return "editable";
  if ((fsType & PRINT) === PRINT) return "print";
  return "installable";
}
