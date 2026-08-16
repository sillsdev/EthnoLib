import type { FontCredits } from "./fontCredits";
import type { FontLicenseCategory } from "./fontLicense";

/**
 * Where a font's bytes are, which is a different question from whether they can
 * be had right now.
 *
 * - **"installed"**: the operating system has it, so every app on the machine
 *   can use it and the user may already know its name.
 * - **"disk"**: readable without the network but not installed — a file the host
 *   app ships with itself, or one it has put somewhere of its own. Usable here,
 *   and not usable in the user's other programs, which is worth being able to
 *   say.
 * - **"network"**: not on this machine at all. It has to be fetched, and a font
 *   fetched for this session alone is still this: the browser is holding it
 *   until the page reloads, and nothing was saved.
 *
 * Absent where nobody has said — an entry that came from a host catalog with no
 * word on the matter — in which case `installed` is all there is to go on.
 */
export type FontLocation = "installed" | "disk" | "network";

/**
 * One font the chooser can offer, as the host app knows it. Everything but the
 * family name is optional: the chooser fills in what it can work out for itself
 * from the fonts installed on the machine, and what the host says wins over that.
 */
export interface FontInfo {
  family: string;
  /**
   * Whether the font is on this machine already. Absent means "we don't know yet",
   * which the chooser treats as installed once it has seen the font in the
   * machine's own list. A font the host offers for download passes `false`.
   */
  installed?: boolean;
  /**
   * Where the font's bytes are; see `FontLocation`. `installed` says whether the
   * font can be used now, which is the question the list is sorted on; this says
   * where it came from, which is what the user needs to know before they lean on
   * it anywhere else.
   */
  location?: FontLocation;
  /** How big the download is, for a font that isn't here yet. */
  downloadSizeBytes?: number;
  /**
   * What the host knows about the licence. This outranks anything read out of the
   * font's own bytes, since only the host knows where the font came from.
   */
  license?: FontLicenseCategory;
  licenseUrl?: string;
  /** A sentence the host wants shown alongside the licence, in its own words. */
  licenseNotes?: string;
  /**
   * Why we say what we say about the licence, where the answer came from reading
   * the font: "Open Font License", "Microsoft font", "no reliable information".
   * Shown to a user who asks about a font that gives us no `licenseUrl` to send
   * them to, which is the common case for fonts installed on a machine.
   */
  licenseReason?: string;
  /**
   * Who made the font, for the panel that says where it came from. Set this where
   * the host knows better than the file does — a catalog entry naming the foundry,
   * say. Left out, the chooser reads them off the font's own `name` table once it
   * has the bytes, which is every font it can show anything else about.
   */
  credits?: FontCredits;
  /**
   * Where to fetch the font's own bytes from, for a font that isn't installed. The
   * chooser reads it the same way it reads an installed font — for coverage, and
   * for how many letter shapes the download would bring — but downloading the font
   * onto the machine is still the host's job.
   */
  fileUrl?: string;
  /**
   * That `fileUrl` holds one subset of the family rather than the whole font —
   * the way Fontsource ships families, one file per subset. The subset files
   * are the right thing to preview with, and the wrong thing to hand somebody
   * as "the font": a host that installs fonts should look for the complete
   * family first (see `createGoogleFontsFullFontUrlResolver`).
   */
  fileIsSubset?: boolean;
  /**
   * The `unicode-range` the `fileUrl` subset declares, where the source
   * publishes one. When `additionalFiles` are present, registering each face
   * with its own range is what lets the browser compose them into one family:
   * two faces both claiming everything would simply shadow one another.
   */
  fileUnicodeRange?: string;
  /**
   * Subset files beyond `fileUrl` that the alphabet needs — an alphabet
   * straddling `latin` and `latin-ext`, say, from a source that ships those as
   * separate files. The chooser fetches these alongside `fileUrl`, registers
   * each with its range, and reads coverage from all of them together.
   */
  additionalFiles?: { url: string; unicodeRange?: string }[];
  /**
   * A cut-down font holding only the characters of the family's name, as Google
   * Fonts serves for menus. Carried through for hosts that want to draw a list
   * entry in its own face without fetching the whole font.
   */
  previewFontUrl?: string;
  /**
   * That somebody who knows the language says this font is for it, rather than
   * our having worked out that its characters happen to cover the alphabet.
   *
   * The two are worth telling apart in front of the user. Covering the alphabet is
   * all a character-by-character check can establish, and it says nothing about
   * whether the marks land where they should or the letters join up; a
   * recommendation from language data is a person's answer to the question the
   * user is actually asking.
   */
  supportsLanguage?: boolean;
  /**
   * Who made that recommendation, for the user who wants to weigh it. `name` is a
   * phrase that finishes "This recommendation comes from …" — "the Language Font
   * Finder", say — and `url` is a page a person can read, where there is one, not
   * an API endpoint that would download.
   */
  supportsLanguageSource?: { name: string; url?: string };
}
