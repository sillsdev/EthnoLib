import type {
  CharacterVariantChoices,
  EffectiveShapeChoice,
  ShapeMemory,
} from "@ethnolib/character-variants-react-mui";
import type {
  FontDataResult,
  FontFeatureDefault,
  FontInfo,
  LocalFontFamily,
} from "@ethnolib/font-core";

export type {
  FontDataResult,
  FontInfo,
  FontLicenseCategory,
} from "@ethnolib/font-core";

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
  /**
   * Durable, font-independent shape picks — "Capital Eng: capital form" — for
   * the language being worked in, kept by the host and passed back in on the
   * next visit. Opening a font that offers a remembered shape puts it in force
   * without re-asking. Pass this to control it from outside; otherwise the
   * component keeps it for the session only.
   */
  shapeMemory?: ShapeMemory;
  onShapeMemoryChange?: (memory: ShapeMemory) => void;
  /**
   * Feature settings recommended for the language, keyed by font name — the
   * SLDR's, usually (`createSldrFontFeaturesProvider` in `@ethnolib/font-core`).
   * The host fetches these; the component makes no network calls of its own.
   * They apply wherever the user hasn't decided otherwise.
   */
  fontFeatureDefaults?: FontFeatureDefault[];
  /**
   * The full set of shape settings in force for the selected font — every row
   * the font offers, each tagged with the source that put its current form
   * there (a pick, a remembered fact, an SLDR default, or the font itself).
   * Fired on every font switch once its bytes are read, and on every pick. A
   * host wanting durable facts about the language reads them here and decides
   * which sources it keeps.
   */
  onEffectiveShapesChange?: (shapes: EffectiveShapeChoice[]) => void;
  /**
   * Show where each shape setting came from — captions on the shape rows and a
   * collapsed JSON block at the pane's foot — for testing and debugging. Off by
   * default. The provenance itself is always tracked; this only shows it.
   */
  debug?: boolean;
  /** Called when the user asks for a font that isn't on this machine yet. */
  onDownloadFont?: (font: FontInfo) => void;
  onCancel?: () => void;
  /** Called when the user settles on a font, with the letter shapes they picked. */
  onFontSelected: (font: string, choices: CharacterVariantChoices) => void;
  /** Font size, in px, for the letter-shape samples. */
  sampleSize?: number;
  /**
   * Real writing in the language being worked in, for the sample paragraph. Only
   * the host knows where to get this — `createGflanguagesSampleTextProvider` in
   * `@ethnolib/font-core` is one place. Without it the sample is made up out of
   * the alphabet, and is labelled as made up.
   */
  sampleText?: string;
  /**
   * The sample paragraph as the user has rewritten it, for a host that keeps their
   * version. Pass back whatever `onCustomSampleTextChange` last gave you and the
   * chooser opens on their own words; leave it out and it opens on `sampleText`.
   */
  customSampleText?: string;
  /**
   * The user's rewritten sample, as they type it, and `undefined` once they have
   * emptied the box — which is them handing the sample back, not choosing a blank
   * one. Store what you are given, `undefined` included, or the next sample will
   * not go back to the default.
   */
  onCustomSampleTextChange?: (text: string | undefined) => void;
  /**
   * That the host is still working out which fonts to offer — after a change of
   * language, say. The chooser draws the list and the details as placeholders
   * rather than leaving the previous language's answers on screen, which read as
   * this language's.
   */
  loading?: boolean;
  className?: string;
}
