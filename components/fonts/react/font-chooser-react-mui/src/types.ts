import type {
  CharacterVariantChoices,
  FontDataResult,
  FontLicenseCategory,
  LocalFontFamily,
} from "@ethnolib/character-variants-react-mui";

export type { FontDataResult, FontLicenseCategory };

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
   * Where to fetch the font's own bytes from, for a font that isn't installed. The
   * chooser reads it the same way it reads an installed font — for coverage, and
   * for how many letter shapes the download would bring — but downloading the font
   * onto the machine is still the host's job.
   */
  fileUrl?: string;
  /**
   * A cut-down font holding only the characters of the family's name, as Google
   * Fonts serves for menus. Carried through for hosts that want to draw a list
   * entry in its own face without fetching the whole font.
   */
  previewFontUrl?: string;
}

export interface FontChooserScreenProps {
  /** The characters the user's language uses; drives coverage and which letter shapes are shown. */
  alphabet?: string;
  /**
   * The host's own font catalog: metadata for fonts that may also be installed,
   * plus entries (with `installed: false`) for fonts it can fetch. Merged with the
   * machine's installed fonts.
   */
  fonts?: FontInfo[];
  /**
   * How to list the machine's fonts. Defaults to the Local Font Access API; a host
   * running somewhere that API doesn't exist supplies its own.
   */
  getLocalFonts?: () => Promise<LocalFontFamily[]>;
  /**
   * How to get a font family's bytes. Defaults to the Local Font Access API.
   *
   * Return the bytes on their own, or — better, where the host knows it — the
   * bytes with the PostScript name of the face they came from. A face out of a
   * collection (.ttc) arrives as the whole collection, and only that name says
   * which font inside is the one being asked about.
   */
  getFontData?: (font: string) => Promise<FontDataResult>;
  /** The chosen font family. Pass this to control the choice from outside. */
  selectedFont?: string;
  onSelectedFontChange?: (font: string) => void;
  /** Which font to start on when the choice is left to the component. */
  defaultFont?: string;
  /**
   * The form chosen for each feature, by tag: 0 (or absent) for the font's own
   * form, or the 1-based alternate. Covers the digits as well as the letters.
   */
  choices?: CharacterVariantChoices;
  onChoicesChange?: (choices: CharacterVariantChoices) => void;
  /** Called when the user asks for a font that isn't on this machine yet. */
  onDownloadFont?: (font: FontInfo) => void;
  onCancel?: () => void;
  /** Called when the user settles on a font, with the letter shapes they picked. */
  onFontSelected: (font: string, choices: CharacterVariantChoices) => void;
  /** Font size, in px, for the letter-shape samples. */
  sampleSize?: number;
  className?: string;
}
