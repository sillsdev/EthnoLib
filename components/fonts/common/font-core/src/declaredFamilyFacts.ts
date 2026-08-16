/**
 * What a host app already knows about a font family it lists, so the chooser
 * doesn't have to work it out from the bytes.
 *
 * The sweep in scanForCharacterVariants.ts asks three questions of every listed
 * family — what its licence looks like, which code points it covers, and which
 * letter shapes it offers — and for a font installed on the machine, reading the
 * file is the only way to answer them. A host that ships its own font files is
 * in a different position: it chose those files, it can compute the answers once
 * when it builds its bundle, and it can simply say so. Twenty-six families is
 * half a minute of parsing on first load, spent re-deriving facts somebody
 * already had.
 *
 * Declared facts outrank anything read from bytes — the same principle
 * `FamilyLicense` states below, made real here. A family declares as much or as
 * little as its host knows; the sweep reads only what is left.
 *
 * A declared `variants: []` is a fact, not a gap: it says the family offers no
 * letter shapes. `undefined` says nobody has looked.
 */

import type { FontLicenseCategory } from "./fontLicense";
import type { CharacterVariant } from "./readCharacterVariants";

/** What one font family's own tables say about using it. */
export interface FamilyLicense {
  /**
   * What the font's own tables suggest about using it. A hint only, and absent
   * when we couldn't read it; see fontLicense.ts. Anything the host app knows
   * about the font outranks this — see `DeclaredFamilyFacts`.
   */
  license?: FontLicenseCategory;
  /** Where the font says its licence lives (`name` ID 14), if it says. */
  licenseUrl?: string;
  /**
   * Which rule in `describeLicense` produced that verdict — "Open Font License",
   * "Microsoft font", "no reliable information". A short phrase, not the font's
   * licence text: it is what we can show a user who asks why we said what we
   * said, and it is small enough to cache, which the licence text is not.
   */
  licenseReason?: string;
}

/**
 * What a host says about a family's file, in place of us reading it.
 *
 * Every field is optional and each is answered for on its own: a host that knows
 * the licence but not the coverage declares the licence, and the sweep still
 * reads the cmap.
 */
export interface DeclaredFamilyFacts extends FamilyLicense {
  /**
   * The code points the family's regular face covers, as the packed [start, end]
   * pairs `readCoverageRanges` produces. Same shape, so a declared coverage and a
   * read one are interchangeable everywhere downstream.
   */
  coverage?: Uint32Array;
  /** Its cvXX and ssXX features. An empty array means "none", not "unknown". */
  variants?: CharacterVariant[];
}

/**
 * The same facts in a form JSON can carry — a manifest a host ships, a message
 * across a process boundary. Only the coverage differs: a Uint32Array serializes
 * as an object of indices, so it travels as the plain array of packed bounds,
 * which is how the coverage cache stores it too (see fontCoverageCache.ts).
 */
export interface SerializedFamilyFacts extends FamilyLicense {
  coverage?: number[];
  variants?: CharacterVariant[];
}

export function serializeFamilyFacts(
  facts: DeclaredFamilyFacts
): SerializedFamilyFacts {
  const serialized: SerializedFamilyFacts = {};
  if (facts.license !== undefined) serialized.license = facts.license;
  if (facts.licenseUrl !== undefined) serialized.licenseUrl = facts.licenseUrl;
  if (facts.licenseReason !== undefined) {
    serialized.licenseReason = facts.licenseReason;
  }
  if (facts.coverage !== undefined) serialized.coverage = [...facts.coverage];
  if (facts.variants !== undefined) serialized.variants = facts.variants;
  return serialized;
}

/**
 * Read back what `serializeFamilyFacts` wrote, from data we did not produce —
 * a manifest edited by hand, an older schema, a truncated download. Anything
 * that isn't the shape we wrote is dropped rather than trusted: a half-declared
 * coverage would have the chooser tell the user a font cannot write their
 * alphabet.
 */
export function parseFamilyFacts(
  value: unknown
): DeclaredFamilyFacts | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const raw = value as SerializedFamilyFacts;
  const facts: DeclaredFamilyFacts = {};

  if (typeof raw.license === "string") facts.license = raw.license;
  if (typeof raw.licenseUrl === "string") facts.licenseUrl = raw.licenseUrl;
  if (typeof raw.licenseReason === "string") {
    facts.licenseReason = raw.licenseReason;
  }
  // Ranges come in pairs, so an odd length is as damaged as a missing one.
  if (
    Array.isArray(raw.coverage) &&
    raw.coverage.length % 2 === 0 &&
    raw.coverage.every((point) => typeof point === "number" && point >= 0)
  ) {
    facts.coverage = new Uint32Array(raw.coverage);
  }
  if (Array.isArray(raw.variants)) facts.variants = raw.variants;

  return Object.keys(facts).length > 0 ? facts : undefined;
}
