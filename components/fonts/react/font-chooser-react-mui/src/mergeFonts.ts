/**
 * Puts together the three things the chooser knows about fonts — the machine's
 * installed list, the host app's catalog, and what the background sweep read out
 * of the font files — into one list to show.
 *
 * Kept pure and free of React so the precedence rules can be tested directly:
 * the host's word beats the font's own bytes, which beat nothing at all.
 */

import { coversAlphabet } from "@ethnolib/font-core";
import type { FamilyScan, LocalFontFamily } from "@ethnolib/font-core";
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
  /**
   * That an alphabet is being looked up and hasn't arrived. The machine's own
   * fonts wait for it — there is no alphabet to check them against yet, and a
   * font shown now and taken away when the answer lands reads as the list
   * changing its mind. Fonts from the catalog were suggested for the language,
   * so they show regardless.
   */
  alphabetPending?: boolean;
  /**
   * Families this session has fetched and registered with the browser, folded.
   *
   * They count as installed, because for everything that matters here they are:
   * the browser holds the face and will draw with it, and we hold the bytes to
   * read shapes and coverage out of. Saying so is what fills the details pane in
   * — the sample, the letter shapes, "Use this font" — without a reload. Nothing
   * is on the machine, and a reload takes it all away again.
   */
  sessionDownloaded?: ReadonlySet<string>;
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
 * list it with a warning on it, we don't list it.
 *
 * Where we don't know yet, the two kinds of font part ways. A catalog font was
 * suggested for this language or alphabet, so it stays listed on that word until
 * its bytes say otherwise. A font that is only here because it is on the machine
 * has nobody's word at all — most of a machine's fonts can't write most
 * languages' letters — and listing it while its coverage is read meant the list
 * filled with fonts and then took them away one by one as the sweep caught up.
 * It waits instead: for the alphabet, while that is still being looked up, and
 * then for its own coverage to be read, and joins the list only once it has
 * shown it belongs there. The closed group is exempt from the wait — those fonts
 * aren't read until the user opens the disclosure, so waiting on their coverage
 * would keep the group empty forever.
 *
 * The other exception is the font the user is on. Coverage for a selected font
 * often arrives after the selection does, and pulling it out of the list at that
 * moment would leave the user staring at a screen where what they clicked no
 * longer exists. It stays listed, with the details pane saying which letters are
 * missing, until they choose something else — at which point it drops out like
 * any other.
 */
export function writesTheAlphabet(
  font: FontInfo,
  input: MergeFontsInput
): boolean {
  const { alphabet, coverage = {}, alwaysInclude, alphabetPending } = input;
  if (alwaysInclude && sameFamily(font.family, alwaysInclude)) return true;

  const known = coverage[font.family];
  if (isMachineOnly(font, input) && !isClosedLicense(font.license)) {
    if (alphabetPending) return false;
    if (alphabet && alphabet.size > 0 && !known) return false;
  }

  if (!alphabet || alphabet.size === 0) return true;
  if (!known) return true;
  return coversAlphabet(known, alphabet);
}

/** A font nobody suggested: in the list only because the machine has it. */
function isMachineOnly(font: FontInfo, { catalog = [] }: MergeFontsInput) {
  return !catalog.some((entry) => sameFamily(entry.family, font.family));
}

function sameFamily(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function byFamily(a: FontInfo, b: FontInfo): number {
  return a.family.localeCompare(b.family);
}

/**
 * Fonts already on the machine first, then the ones that would have to be fetched;
 * alphabetical within each. A font the user can use right now is worth more to them
 * than one they would have to wait for, and interleaving the two by name buries the
 * usable ones among downloads.
 *
 * Within the download group, the ones somebody recommended for this language come
 * first. Deciding to wait for a font is a decision the user makes on what we can
 * tell them about it beforehand, and "recommended for your language" is the
 * strongest thing we have to say. Installed fonts are left plainly alphabetical:
 * they are all available at no cost, and the user knows their own machine's list.
 */
function byReadinessThenFamily(a: FontInfo, b: FontInfo): number {
  const aReady = a.installed !== false;
  const bReady = b.installed !== false;
  if (aReady !== bReady) return aReady ? -1 : 1;
  if (!aReady && !!a.supportsLanguage !== !!b.supportsLanguage)
    return a.supportsLanguage ? -1 : 1;
  return byFamily(a, b);
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
  const { local = [], catalog = [], scanned = {}, sessionDownloaded } = input;
  const merged = new Map<string, FontInfo>();

  for (const { family } of local) {
    const scan = scanned[family];
    merged.set(family.toLowerCase(), {
      family,
      installed: true,
      license: scan?.license,
      licenseUrl: scan?.licenseUrl,
      licenseReason: scan?.licenseReason,
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

  // Last word, over both the machine's list and the catalog's claim: a font we
  // have fetched this session is one the browser can draw with, whatever either
  // of them said a moment ago.
  if (sessionDownloaded?.size) {
    for (const [key, font] of merged) {
      if (sessionDownloaded.has(key))
        merged.set(key, { ...font, installed: true });
    }
  }

  const all = [...merged.values()].filter((font) =>
    writesTheAlphabet(font, input)
  );
  return {
    // The main list is the one the user reads down, so it leads with what they can
    // use immediately. The closed group is a place people go looking for a
    // particular font, so it stays plainly alphabetical.
    main: all
      .filter((font) => !isClosedLicense(font.license))
      .sort(byReadinessThenFamily),
    closed: all.filter((font) => isClosedLicense(font.license)).sort(byFamily),
  };
}

/**
 * The wider search's own section, shown below a divider at the foot of the
 * list: the search's finds, less every family already offered above (the
 * list would otherwise say the same name twice), kept in the order the search
 * ranked them — that ranking is the section's whole point, so it is not
 * re-sorted the way the main list is. The same rules as the main list still
 * apply where they matter: a session download counts as installed, and a font
 * whose read coverage says it can't write the alphabet drops out. An unread
 * one stays — the search vouched for it, the way a catalog does.
 */
export function sectionForMoreFonts(
  moreFonts: FontInfo[],
  input: MergeFontsInput
): FontInfo[] {
  const { local = [], catalog = [], sessionDownloaded } = input;
  const offered = new Set(
    [...local, ...catalog].map((font) => font.family.toLowerCase())
  );
  // For the coverage question these are all somebody's suggestion, never
  // machine-only fonts, so none of them wait on the alphabet or their own read.
  const asSuggestions = { ...input, catalog: moreFonts };

  const section: FontInfo[] = [];
  for (const entry of moreFonts) {
    const key = entry.family.toLowerCase();
    if (offered.has(key)) continue;
    offered.add(key);
    const font: FontInfo = {
      ...entry,
      installed: sessionDownloaded?.has(key) || (entry.installed ?? false),
    };
    if (!writesTheAlphabet(font, asSuggestions)) continue;
    section.push(font);
  }
  return section;
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
