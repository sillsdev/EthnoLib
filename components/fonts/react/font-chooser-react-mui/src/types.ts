import type { ReactNode } from "react";
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
  SampleTextProvider,
} from "@ethnolib/font-core";
import type { NetworkAvailability } from "./constrainedNetwork";

export type { NetworkAvailability } from "./constrainedNetwork";

export type {
  FontCredits,
  FontDataResult,
  FontInfo,
  FontLicenseCategory,
} from "@ethnolib/font-core";

/**
 * A font file the chooser fetched so it could show the user what the font does,
 * handed on to the host when they settle on it.
 *
 * The chooser's own use for the bytes ends when the dialog closes: it registered
 * a `FontFace` with the browser, which lasts until the page is reloaded and
 * installs nothing. A host that wants the font to outlive the session — writing
 * it to disk, bundling it into a document, really installing it — needs the file
 * itself, and it is already in memory, so handing it over saves fetching the same
 * megabyte twice.
 *
 * Absent for a font that was already on the machine: there was nothing to fetch,
 * and the host can read an installed font by its family name.
 */
export interface DownloadedFontFile {
  data: ArrayBuffer;
  /** Where it was fetched from. */
  fileUrl: string;
  /** The catalog entry it was fetched for, licence and all. */
  info: FontInfo;
}

/**
 * How the chooser's own parts report a diagnostic inwards, on the way to the
 * host's `onDiagnostic`.
 *
 * The detail comes as a function rather than a value so that a host which isn't
 * listening costs nothing: assembling the effective shape set or reading the
 * SLDR entry is work worth doing only for somebody who will read it.
 */
export type ReportDiagnostic = (
  message: string,
  detail?: () => unknown
) => void;

export interface FontChooserScreenProps {
  /** The characters the user's language uses; drives coverage and which letter shapes are shown. */
  alphabet?: string;
  /**
   * That the host is still looking the alphabet up, so an empty `alphabet` means
   * "not known yet" rather than "there isn't one". While this is set the
   * machine's own fonts wait: shown now, most of them would be taken away when
   * the alphabet lands and their coverage is checked, and a list that fills and
   * then empties reads as the chooser changing its mind. Fonts from the host's
   * catalog show regardless — they were suggested for the language.
   */
  alphabetPending?: boolean;
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
  /**
   * How to fetch font files — the preview bytes, the whole font behind "Use this
   * font", and the HEAD request that asks what a download will cost. Defaults to
   * the page's own `fetch`.
   *
   * A host whose font urls need credentials, a proxy or a timeout supplies its
   * own here; so does one serving fonts off local disk through a custom protocol,
   * which is what makes the chooser work with no network at all. Suggestions come
   * in as props already (`fonts`, `moreFonts`, `fontFeatureDefaults`,
   * `sampleTextProvider`), so with this set the component fetches nothing the
   * host hasn't handed it a way to fetch.
   */
  fetchImpl?: typeof fetch;
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
   * Diagnostic commentary for a host that wants to watch the chooser think:
   * where each shape setting came from, what it is about to report, which font
   * it is fetching and how that went.
   *
   * The chooser draws none of this itself. A component that renders its own
   * debug panel decides for the host where the information goes and what it
   * looks like, and it was the wrong shape for every host but the demo; a
   * callback lets one put the same facts in its own log, its console, or
   * nowhere. The messages are short lines meant to be read in sequence, with the
   * bulky part in `detail`, and nothing expensive is assembled unless somebody
   * is listening.
   */
  onDiagnostic?: (message: string, detail?: unknown) => void;
  /**
   * How much of the network the chooser has, from the host's side.
   *
   * - **"open"** (the default): a font that isn't on the machine is fetched the
   *   moment the user selects it, since the sample, the letter shapes and the
   *   coverage all come out of the file and there is nothing to show without it.
   * - **"metered"**: the connection is metered, slow, or otherwise not one to
   *   spend a megabyte on unasked, so that fetch waits for an explicit "Preview
   *   this font" click with the download's size beside it. Names also stop being
   *   drawn in their own faces, which is a download of its own.
   * - **"offline"**: there is no connection. Nothing is fetched and nothing is
   *   offered — a download button that cannot work is worse than none — so the
   *   chooser shows what the machine has, marks the rest as unavailable, and
   *   takes down the wider search.
   *
   * Combined with the browser's own signals (the Network Information API's
   * `saveData` and a slow `effectiveType`, and `navigator.onLine`) by taking
   * whichever is more restrictive. So a host that knows nothing about the
   * connection still does the right thing for a user with data saver on or a
   * machine that has dropped off the network, and a host that knows better than
   * the browser is believed. Neither can talk the other into spending more.
   */
  network?: NetworkAvailability;
  /**
   * Fonts the user has settled on before — chosen with "Use this font", kept by
   * the host, and fed back on the next visit. They join the offering above the
   * divider, exactly as if the host's catalog had suggested them: chosen once
   * is the host's word that the font matters here.
   *
   * This is the only road from the wider search's section into the main list.
   * Merely selecting a font there to look it over moves nothing and caches
   * nothing; a browse is not an endorsement. Where an entry repeats a catalog
   * font, the catalog's fields win.
   */
  recentFonts?: FontInfo[];
  /**
   * What the wider search found (see `onSearchMoreFonts`): shown as the list's
   * own section below a divider, in the order given — the search ranked them,
   * and that ranking is worth keeping in a way the main list's
   * installed-first-then-alphabetical sort would destroy. Leave it out until
   * the search has run; pass it empty when the search found nothing, and the
   * section says so rather than vanishing. Families already offered above the
   * divider are left out here rather than said twice.
   */
  moreFonts?: FontInfo[];
  /**
   * That the host can search a wider catalog than what it has already offered —
   * ranked-by-popularity open fonts that might cover the alphabet, say. While
   * this is set the foot of the font list carries an invitation to run that
   * search; clicking it calls this. The host takes the invitation down by
   * passing `undefined` once the search's answer is folded into `fonts`.
   *
   * A prop rather than built in because the wider search belongs to whoever
   * fills the `fonts` prop: the chooser doesn't know the host's sources, and a
   * host with nothing wider to offer shouldn't show a button saying it has.
   */
  onSearchMoreFonts?: () => void;
  /**
   * What the wider search costs — "2.7 MB": the catalog it fetches, and the
   * font files it reads to be sure of what each family really has. Shown on the
   * invitation only where `constrainedNetwork` says the user is paying for it,
   * since that is the only place the number is a decision rather than trivia.
   */
  searchMoreFontsCost?: string;
  /** That the wider search is running, so the invitation shows it working. */
  searchingMoreFonts?: boolean;
  /**
   * How this host's wider search finds what it finds, shown behind an info icon
   * beside the section's heading. Worth setting: the chooser doesn't know the
   * host's sources (see `onSearchMoreFonts`), so its own wording can only
   * describe the shape such a search usually has, and can't name the catalog or
   * say what the ranking is.
   */
  moreFontsExplanation?: ReactNode;
  onCancel?: () => void;
  /**
   * Where to find the *complete* font file for a catalog entry whose `fileUrl`
   * is a subset (`FontInfo.fileIsSubset`) — `createGoogleFontsFullFontUrlResolver`
   * in `@ethnolib/font-core` is the keyless one. Subset files are the right
   * thing to preview with and the wrong thing to hand somebody as "the font",
   * so when this is supplied the chooser resolves the full file as the user
   * selects such a font, puts its true download size under "Use this font",
   * and fetches it when they choose — that download's bytes, not the preview
   * subset's, are what `onFontSelected` then delivers. Resolve to undefined
   * (or leave the prop out) and the preview file is handed over as before.
   */
  getFullFontUrl?: (
    font: FontInfo,
    options?: { signal?: AbortSignal }
  ) => Promise<string | undefined>;
  /**
   * Called when the user settles on a font, with the letter shapes they picked
   * and — for a font the chooser fetched rather than found on the machine — the
   * file it fetched. See `DownloadedFontFile`.
   */
  onFontSelected: (
    font: string,
    choices: CharacterVariantChoices,
    downloadedFile?: DownloadedFontFile
  ) => void;
  /** Font size, in px, for the letter-shape samples. */
  sampleSize?: number;
  /**
   * BCP-47 tag of the user's language; lets the chooser fetch real sample text
   * itself. It goes to Google Fonts language data for a passage in the language,
   * names that source in the sample heading, and falls back to text made up out
   * of the alphabet — labelled as made up — for a language the data set hasn't
   * got. The host supplies the tag, not the words.
   */
  languageTag?: string;
  /**
   * What to call the language in front of the user, in their own words for it —
   * "Fulfulde", not "fuv". The chooser says it where it would otherwise have to
   * write "your language", which is vaguer than the host needs to be: the host
   * knows which language the user is setting a font for, and naming it is what
   * makes "Known to support Fulfulde" a claim rather than a slogan.
   *
   * Left out, those lines fall back to "your language", so a host that has only a
   * tag is no worse off than before.
   */
  languageName?: string;
  /**
   * ISO 15924 script code (e.g. "Thai") when the tag alone doesn't say. The
   * sample passages are filed by language *and* script, and most tags carry no
   * script subtag; without this a script-less tag is read as Latin.
   */
  languageScript?: string;
  /**
   * Where the sample passage comes from. Left out, the chooser asks Google Fonts
   * language data over the network (`createGflanguagesSampleTextProvider` in
   * `@ethnolib/font-core`), which is the right default for a host with a
   * connection and useless to one without: a machine that has never been online
   * has nothing to fall back on but text invented from the alphabet.
   *
   * So a host that ships sample text with it — a bundled copy of the same data,
   * its own translations, whatever it has — supplies a provider here and the
   * chooser asks that instead, network or no network. The contract is
   * `SampleTextProvider`'s: undefined for a language it definitely has nothing
   * for, a throw for a lookup that failed, and an abort passed back untouched.
   *
   * `languageScript` reaches a provider of the host's only if the host's provider
   * reads it — the tag is all the chooser passes on.
   */
  sampleTextProvider?: SampleTextProvider;
  /**
   * The sample paragraph as the user has rewritten it, for a host that keeps their
   * version. Pass back whatever `onCustomSampleTextChange` last gave you and the
   * chooser opens on their own words; leave it out and it opens on the passage
   * fetched for `languageTag`.
   *
   * Their version belongs to the language it was typed for: change `languageTag`
   * and the chooser drops it, telling you so through
   * `onCustomSampleTextChange`, because text in the old language's letters would
   * otherwise hide every sample the new one has.
   */
  customSampleText?: string;
  /**
   * The user's rewritten sample, as they type it, and `undefined` once the sample
   * has been handed back to whoever supplied it — which happens when they empty
   * the box, and when the language changes under text they had rewritten. Neither
   * is them choosing a blank sample. Store what you are given, `undefined`
   * included, or the next sample will not go back to the default.
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
