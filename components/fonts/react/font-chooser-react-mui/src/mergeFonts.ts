/**
 * Puts together the three things the chooser knows about fonts — the machine's
 * installed list, the host app's catalog, and what the background sweep read out
 * of the font files — into one list to show.
 *
 * Kept pure and free of React so the precedence rules can be tested directly:
 * the host's word beats the font's own bytes, which beat nothing at all.
 */

import { coversAlphabet } from "@ethnolib/character-variants-react-mui";
import type {
  FamilyScan,
  LocalFontFamily,
} from "@ethnolib/character-variants-react-mui";
import type { FontInfo } from "./types";

export interface MergeFontsInput {
  /** Families found on this machine, if we have been allowed to look. */
  local?: LocalFontFamily[];
  /** What the host app says about fonts, including ones not on the machine. */
  catalog?: FontInfo[];
  /** What the sweep has read so far, by family name as the machine spells it. */
  scanned?: Record<string, FamilyScan>;
  /**
   * The characters the user's language needs, as `parseAlphabet` splits them. A
   * font we know cannot write them is left out of the list altogether.
   */
  alphabet?: Set<string>;
  /**
   * What each family can write, by family name, for every font we have managed to
   * read. A family missing from here is one whose coverage we don't know, which is
   * not the same as one that covers nothing.
   */
  coverage?: Record<string, Uint32Array | undefined>;
  /**
   * One family to list whatever its coverage turns out to be: the font the user is
   * looking at. See `writesTheAlphabet` for why.
   */
  alwaysInclude?: string;
}

export interface MergedFonts {
  /** The fonts worth putting in front of the user. */
  main: FontInfo[];
  /**
   * Fonts whose licence we either can't read or that ask to stay on this machine.
   * They are real choices, just ones to reach for deliberately, so the list keeps
   * them behind a disclosure rather than dropping them.
   */
  closed: FontInfo[];
}

/**
 * Whether a font's licence puts it behind the "closed licensed fonts" disclosure.
 *
 * The main list is for fonts someone can use without stopping to think: ones we
 * know are open, and ones we haven't worked out yet. Everything else — a licence
 * with limits on it, one we can't read, one that says it stays on this machine —
 * is a font to reach for deliberately.
 */
export function isClosedLicense(license: FontInfo["license"]): boolean {
  return (
    license === "limits-apply" ||
    license === "unknown" ||
    license === "system-restricted"
  );
}

/**
 * Whether a font is worth offering for this alphabet at all.
 *
 * A font that can't write the user's letters is no use to them, so rather than
 * list it with a warning on it, we don't list it. But only where we actually know:
 * a font the sweep hasn't reached, or a downloadable one whose bytes we haven't
 * fetched, has unknown coverage and stays listed. Dropping fonts on suspicion
 * would empty the list while it was still filling.
 *
 * The one exception is the font the user is on. Coverage for a selected font often
 * arrives after the selection does, and pulling it out of the list at that moment
 * would leave the user staring at a screen where what they clicked no longer
 * exists. It stays listed, with the details pane saying which letters are missing,
 * until they choose something else — at which point it drops out like any other.
 */
export function writesTheAlphabet(
  font: FontInfo,
  { alphabet, coverage = {}, alwaysInclude }: MergeFontsInput
): boolean {
  if (!alphabet || alphabet.size === 0) return true;
  if (alwaysInclude && sameFamily(font.family, alwaysInclude)) return true;
  const known = coverage[font.family];
  if (!known) return true;
  return coversAlphabet(known, alphabet);
}

function sameFamily(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function byFamily(a: FontInfo, b: FontInfo): number {
  return a.family.localeCompare(b.family);
}

/**
 * One list of fonts, split into the ones to show and the ones to tuck away.
 *
 * Families are matched case-insensitively, since a catalog written by hand won't
 * always capitalize the way the machine does. Where they differ the machine's
 * spelling wins, because that is the one CSS has to resolve to render a sample.
 *
 * A font the sweep hasn't reached has no licence yet, and stays in the main list
 * until it does — better than having fonts drop out from under the user's cursor.
 * Fonts that turn out not to write the user's alphabet are left out of both lists;
 * see `writesTheAlphabet`.
 */
export function mergeFonts(input: MergeFontsInput): MergedFonts {
  const { local = [], catalog = [], scanned = {} } = input;
  const merged = new Map<string, FontInfo>();

  for (const { family } of local) {
    const scan = scanned[family];
    merged.set(family.toLowerCase(), {
      family,
      installed: true,
      license: scan?.license,
      licenseUrl: scan?.licenseUrl,
    });
  }

  for (const entry of catalog) {
    const key = entry.family.toLowerCase();
    const found = merged.get(key);
    merged.set(key, {
      ...found,
      ...definedOnly(entry),
      // The machine's spelling of an installed family is the one CSS resolves.
      family: found?.family ?? entry.family,
      // A catalog entry for a font that turned out to be installed is installed,
      // whatever the catalog assumed; a font only the catalog knows about takes
      // the catalog's word, and "not here yet" if it says nothing.
      installed: found?.installed ?? entry.installed ?? false,
    });
  }

  const all = [...merged.values()]
    .filter((font) => writesTheAlphabet(font, input))
    .sort(byFamily);
  return {
    main: all.filter((font) => !isClosedLicense(font.license)),
    closed: all.filter((font) => isClosedLicense(font.license)),
  };
}

/** Drops the undefined fields of a catalog entry, so they don't erase what we know. */
function definedOnly(entry: FontInfo): FontInfo {
  const kept = {} as Record<string, unknown>;
  for (const [key, value] of Object.entries(entry)) {
    if (value !== undefined) kept[key] = value;
  }
  return kept as unknown as FontInfo;
}

/** The entry for one family in a merged list, wherever it ended up. */
export function findFont(
  merged: MergedFonts,
  family: string
): FontInfo | undefined {
  const key = family.toLowerCase();
  return [...merged.main, ...merged.closed].find(
    (font) => font.family.toLowerCase() === key
  );
}
