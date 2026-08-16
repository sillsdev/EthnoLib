/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import {
  Button,
  Divider,
  Link,
  Popover,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import React, { useEffect, useMemo, useState } from "react";
import {
  CharacterVariantChoices,
  CharacterVariantList,
  groupVariants,
  ShapeInfo,
  ShapeInfoLine,
  type ShapeChoice,
} from "@ethnolib/character-variants-react-mui";
import {
  DIGITS,
  filterVariantsForAlphabet,
  mergeCoverageRanges,
  parseAlphabet,
  readCharacterVariants,
  readCoverageRanges,
  readFontCredits,
  variantsBeyond,
  variantsFor,
  type SampleText,
} from "@ethnolib/font-core";
import { Callout } from "./Callout";
import type { CalloutVariant } from "./Callout";
import { DigitShapes } from "./DigitShapes";
import { SampleTextSection } from "./SampleTextSection";
import { SectionHeading } from "./SectionHeading";
import { SourceInfo, sourceIconCss } from "./SourceInfo";
import { generateExampleText } from "./exampleText";
import { formatDownloadSize } from "./formatFileSize";
import { DownloadNeededIcon, InfoCircleIcon } from "./icons";
import { NO_LICENSE_PAGE, licenseMessage } from "./licenseMessage";
import { missingFromAlphabet, saysSupportsLanguage } from "./missingCharacters";
import { scrollbarCss } from "./scrollbarStyle";
import { useFontFileSize } from "./useFontFileSize";
import {
  downloadPolicy,
  type NetworkAvailability,
} from "./constrainedNetwork";
import type { FontCredits, FontInfo, FontLicenseCategory } from "./types";

/** The digits, as a set, for telling digit shapes from letter shapes. */
const DIGIT_SET = parseAlphabet(DIGITS);

/**
 * The wire cost below which a held-back download goes ahead without asking.
 * The sizes measured are compressed transfer sizes, and most of Google's
 * subsetted fonts come in well under this; a question about 18 KB is noise.
 */
const TRIVIAL_DOWNLOAD_BYTES = 100_000;

/**
 * How long a download runs before the pane says "Downloading this font…" out
 * loud. Most fetches finish well inside this, and a callout that appears and
 * vanishes within a second reads as the screen stuttering, not as news.
 */
const DOWNLOAD_PATIENCE_MS = 1500;

/**
 * Good news about alphabet coverage may not be worth a callout at all — a font
 * that has every letter has nothing to report, and only missing letters still
 * speak up. A flag rather than a deletion, in case it comes back.
 */
const SHOW_ALPHABET_COVERED_CALLOUT: boolean = false;

export interface FontDetailsPaneProps {
  font: FontInfo;
  /** The font's bytes, once they are loaded; everything specific waits on these. */
  fontData?: ArrayBuffer;
  /**
   * The bytes of the family's further subset files, for a font whose alphabet
   * arrived as several (see `FontInfo.additionalFiles`). The coverage question —
   * which letters would go missing — is about all the files together; the shapes
   * and samples still read from `fontData`, which holds the alphabet's main run.
   */
  supplementaryFontData?: ArrayBuffer[];
  /**
   * Which face those bytes are. A face that lives in a collection (.ttc) comes
   * with the whole collection's bytes, several families' worth, and only this says
   * which font inside is the one on screen; without it the readers answer for the
   * first font in the file, which is some other family. Absent for a font fetched
   * from a URL, which is a single font and needs no picking.
   */
  postscriptName?: string;
  /** What the background sweep found this font covers, if it has got that far. */
  scannedCoverage?: Uint32Array;
  alphabet: string;
  /** What to call the user's language on screen; see FontChooserScreenProps. */
  languageName?: string;
  choices: CharacterVariantChoices;
  onChoicesChange: (choices: CharacterVariantChoices) => void;
  /**
   * How much of the network there is. Metered, the pane offers the download as a
   * button with its size on it rather than the font simply appearing; offline it
   * offers nothing and says the font isn't available. See
   * FontChooserScreenProps.network.
   */
  network?: NetworkAvailability;
  /** True while the font's file is on its way. */
  downloading?: boolean;
  /** What went wrong fetching it, if something did. */
  downloadError?: string;
  /** The user asking for a font the chooser held back, or retrying a failed fetch. */
  onRequestDownload?: () => void;
  onCancel?: () => void;
  onUse: () => void;
  /**
   * What "Use this font" will really fetch, in bytes. Set when the file the
   * pane previewed with was a subset and the whole font has been found (see
   * FontChooserScreenProps.getFullFontUrl): the click costs a download the
   * preview didn't, and the cost goes under the label the way the preview
   * offer's does.
   */
  useDownloadSizeBytes?: number;
  /** True while the full font the choice asked for is on its way. */
  choosing?: boolean;
  /** Why the last "Use this font" click didn't take, so the user can retry it. */
  chooseError?: string;
  /** True while the font's bytes are still on their way. */
  loading?: boolean;
  /**
   * How to fetch, for the one request the pane makes on its own: the HEAD that
   * asks what a held-back download would cost. See FontChooserScreenProps.fetchImpl.
   */
  fetchImpl?: typeof fetch;
  sampleSize?: number;
  /**
   * Real writing in the user's own language, with the name of the data set it
   * came from — the heading says which. Without it the sample is made up out of
   * the alphabet, and says so.
   */
  languageSample?: SampleText;
  /** What the user has typed over the sample, if they have. */
  customSampleText?: string;
  onCustomSampleTextChange?: (text: string | undefined) => void;
  /**
   * Told the font-independent fact behind every shape pick, letters and digits
   * alike, with the row it belongs to. See CharacterVariantList.
   */
  onShapeChoiceChange?: (groupKey: string, choice: ShapeChoice) => void;
}

/**
 * Everything about the one font the user is looking at: whether it can write their
 * alphabet, what its licence lets them do with it, and the letter shapes it offers.
 */
export const FontDetailsPane: React.FunctionComponent<FontDetailsPaneProps> = ({
  font,
  fontData,
  supplementaryFontData,
  postscriptName,
  scannedCoverage,
  alphabet,
  languageName,
  choices,
  onChoicesChange,
  network = "open",
  downloading,
  downloadError,
  onRequestDownload,
  onCancel,
  onUse,
  useDownloadSizeBytes,
  choosing,
  chooseError,
  loading,
  fetchImpl,
  sampleSize,
  languageSample,
  customSampleText,
  onCustomSampleTextChange,
  onShapeChoiceChange,
}) => {
  const installed = font.installed !== false;
  // What the pointer is on, wherever it is: one line at the foot of the pane
  // serves both shape sections, so that reading about a shape never puts a label
  // over the shapes themselves.
  const [hovered, setHovered] = useState<ShapeInfo | null>(null);
  const coverage = useCoverage(
    fontData,
    scannedCoverage,
    postscriptName,
    supplementaryFontData
  );
  const alphabetSet = useMemo(() => parseAlphabet(alphabet), [alphabet]);

  const missing = useMemo(() => {
    if (!coverage || alphabetSet.size === 0) return undefined;
    return missingFromAlphabet(coverage, alphabetSet);
  }, [coverage, alphabetSet]);

  const variants = useMemo(() => {
    if (!fontData) return undefined;
    try {
      return readCharacterVariants(fontData, postscriptName);
    } catch {
      // A font we can't parse simply has nothing to offer here; the letter-shape
      // list says so in its own words.
      return undefined;
    }
  }, [fontData, postscriptName]);

  // The letter shapes leave the digits to the digit section below, so that a
  // font's figures are offered in one place rather than two.
  const shownVariants = useMemo(
    () =>
      variants &&
      variantsBeyond(
        filterVariantsForAlphabet(variants, alphabetSet),
        DIGIT_SET
      ),
    [variants, alphabetSet]
  );
  const digitVariants = useMemo(
    () => variants && variantsFor(variants, DIGIT_SET),
    [variants]
  );

  // What the user picks from is rows, not features: several features can be
  // different ways of drawing one letter, and those share a row. So the count that
  // stands for "how many choices are in here" is the rows'.
  const shapeRowCount = useMemo(
    () => shownVariants && groupVariants(shownVariants).length,
    [shownVariants]
  );

  // A licence that isn't a plain yes belongs at the head of the pane, before the
  // user spends any time on a font they may not be allowed to use: limits, a
  // restriction, or nothing we could make sense of. An open one is the opposite
  // sort of news, so it waits at the very foot, where it confirms rather than
  // warns.
  //
  // No `?? "unknown"` here. An unset `license` is a font whose tables nobody has
  // read yet — the sweep runs over every installed family and takes seconds — and
  // reading that as "unknown" put "We don't know the rules for this font" at the
  // top of the pane for a font we were in the middle of finding out about. Say
  // nothing until there is something to say. `classifyLicense` returns "unknown"
  // in its own right, so the two cases stay apart.
  const licenseAtTop = font.license !== undefined && font.license !== "open";
  const licenseAtFoot = font.license === "open";

  // The letter shapes are shapes *for an alphabet*: which choices are worth
  // offering, and which letters they are drawn on, both come out of it. With no
  // alphabet the section would offer every choice the font happens to declare, on
  // letters nobody asked about, so instead it gives way to a line saying what the
  // alphabet would buy.
  const showsShapeHint = alphabetSet.size === 0;

  // The figures go on the end of the made-up text, in running text rather than
  // alone on a tile, since a digit shape picked below is a choice about the
  // numbers in the user's books. They are not part of the pseudo-text itself: an
  // alphabet is letters, and a generator that wrote digits into its nonsense words
  // would be inventing a numeral system for the language.
  const invented = useMemo(() => {
    const nonsense = generateExampleText(alphabet);
    return nonsense ? `${nonsense} ${DIGITS}` : undefined;
  }, [alphabet]);

  // The sample needs the font on the machine to draw with, and something to
  // write: the user's own words, the host's sample text, or an alphabet to make
  // one up out of.
  const showsExample =
    installed &&
    !!fontData &&
    (!!languageSample || !!customSampleText || !!invented);
  const vouchedFor = saysSupportsLanguage(font.supportsLanguage, missing);
  // A font with nothing to choose between says nothing at all: no headings, and
  // no line announcing the absence. Nor does a font we don't have yet: none of
  // this can be shown, let alone picked, until the bytes are on the machine, and
  // a greyed-out outline of what is coming is furniture the user has to read
  // past to reach the one thing they can act on, which is the download.
  const showsShapes =
    installed &&
    (showsShapeHint ||
      !!shapeRowCount ||
      !!digitVariants?.length ||
      showsExample);
  // Normally a font the user selects is simply fetched and the pane fills in, so
  // there is nothing to click. The button appears where we deliberately held the
  // download back, and after a fetch that failed — where it reads as "try again"
  // and is the only way back to the font.
  // A font with nowhere to fetch it from gets no button whatever the connection
  // is doing; the callout saying it isn't here is the whole of what we can offer.
  const offersDownload = downloadPolicy(network, font, !!downloadError) === "offer";
  // Asked for only when it is about to be shown, and never when the host has
  // already told us. See useFontFileSize.
  const measured = useFontFileSize(
    font.fileUrl,
    offersDownload && font.downloadSizeBytes === undefined,
    fetchImpl
  );
  const downloadSize = font.downloadSizeBytes ?? measured.bytes;
  const sizeSettled = font.downloadSizeBytes !== undefined || measured.settled;

  // Below this, asking costs the user more than answering yes would: on the
  // subsetted, compressed files Google serves, even a metered connection spends
  // less on the font than on the page it is shown in. So a size that comes back
  // trivial turns the offer into the download it was asking about. A failed
  // fetch is different — the button is then the way back in, whatever the size —
  // and an unknown size stays an offer, since it could be anything.
  const trivial =
    downloadSize !== undefined && downloadSize < TRIVIAL_DOWNLOAD_BYTES;
  useEffect(() => {
    if (!offersDownload || downloading || downloadError || !trivial) return;
    onRequestDownload?.();
  }, [offersDownload, downloading, downloadError, trivial, onRequestDownload]);

  // The download callout earns its place only where it has something the user
  // must act on or genuinely wait for: the held-back offer, a failure, or a
  // download still going after long enough to be a real wait. The ordinary case
  // — a selection quietly fetching for under a second — shows nothing but the
  // loading bar, so the pane goes from empty to complete in one move instead of
  // flashing an announcement that outlives its news.
  const longDownload = useHasLasted(!!downloading, DOWNLOAD_PATIENCE_MS);
  const showsDownloadCallout =
    !installed &&
    // Offline it is the only thing the pane can say. Everything a font's pane is
    // made of comes out of its file, so for a font the machine hasn't got there
    // is nothing else to draw — and an empty pane that never fills reads as the
    // chooser having hung rather than as an answer.
    (network === "offline" ||
      !!downloadError ||
      (offersDownload && !trivial) ||
      (!!downloading && longDownload));
  // Only what the user has to know before looking at the font at all.
  const showsPreamble = licenseAtTop || showsDownloadCallout;

  // The open licence sits at the foot, and the foot is only where it looks like
  // once everything above it has arrived. Shown as soon as the licence itself is
  // known, it rendered high in a half-empty pane and then rode downward as the
  // sample text and shape sections filled in above it — the one block the user
  // was reading, moving because of things they weren't. So it waits: for the
  // bytes if they are on their way, and then for the coverage read that decides
  // whether the missing-letters warning goes in front of it. What it does not
  // wait for is a sample the host may yet send — nobody can know one is coming,
  // and the section it lands in is already in place by then.
  const stillFillingIn =
    !!loading ||
    !!downloading ||
    (!!fontData && alphabetSet.size > 0 && missing === undefined);

  // That wait is for the first placement only. Once the block has been put on
  // the floor of the pane it stays there while the next font fills in, because
  // by then there is nothing left for it to ride downward past — and taking it
  // away for the few milliseconds a font switch costs made it blink on every
  // font the user clicked, which is worse than the movement it was avoiding.
  const [footPlaced, setFootPlaced] = useState(false);
  useEffect(() => {
    if (!stillFillingIn) setFootPlaced(true);
  }, [stillFillingIn]);

  return (
    <div
      css={css`
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        padding: 22px 24px;
      `}
    >
      {/*
        Everything above the buttons scrolls; the buttons themselves stay put. A
        font with many letter shapes would otherwise push "Use this font" off the
        bottom of the screen.
      */}
      <div
        css={[
          css`
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            /* Room between what is in here and the scrollbar, which is drawn
               inside this box: without it the sample text's border and the
               shape choices run right up against the bar. */
            padding-right: 12px;
            /*
              A column, so that the licence at the foot can claim the leftover
              space above it and sit on the bottom edge of the pane. Nothing in
              here may be squeezed to make that happen — the empty space is what
              gives, and once there is none, the whole lot scrolls as before.
            */
            display: flex;
            flex-direction: column;
            > * {
              flex-shrink: 0;
            }
          `,
          scrollbarCss,
        ]}
      >
        {/*
          No font name here: the sidebar row the user just clicked already says
          which font this is, and the pane is short of room.
        */}
        {showsPreamble && (
          <div
            css={css`
              display: flex;
              flex-direction: column;
              gap: 10px;
            `}
          >
            {licenseAtTop && (
              <LicenseCallout
                font={font}
                fontData={fontData}
                postscriptName={postscriptName}
              />
            )}

            {showsDownloadCallout && (
              <Callout
                variant="download"
                action={
                  // The button waits for the size to settle: shown while the
                  // HEAD was still out, a trivial answer would auto-click it in
                  // front of the user. After a failure it comes back whatever
                  // the size, as the way to try again.
                  offersDownload &&
                  (!!downloadError || (sizeSettled && !trivial)) && (
                    <PreviewFontButton
                      retrying={!!downloadError}
                      sizeBytes={downloadSize}
                      busy={!!downloading}
                      onClick={() => onRequestDownload?.()}
                    />
                  )
                }
              >
                {downloading
                  ? "Downloading this font…"
                  : network === "offline"
                    ? "This font is not on this computer, and there is no internet connection to get it."
                    : "This font is not on this computer yet."}
                {downloadError && network !== "offline" && ` ${downloadError}`}
              </Callout>
            )}
          </div>
        )}

        {/* No rule unless there is something on both sides of it. */}
        {showsPreamble && showsShapes && (
          <Divider
            css={css`
              margin: 18px 0 14px;
            `}
          />
        )}

        {installed && (
          // A section that has nothing to say renders nothing, and the gap goes
          // with it, so the spacing needs no arithmetic about what is present.
          <div
            css={css`
              display: flex;
              flex-direction: column;
              gap: 18px;
            `}
          >
            {/* First, because it is the font doing the user's own writing;
                the shape choices below it are adjustments to what it shows. */}
            {showsExample && (
              <SampleTextSection
                fontFamily={font.family}
                languageSample={languageSample}
                inventedText={invented}
                customText={customSampleText}
                onCustomTextChange={onCustomSampleTextChange}
                choices={choices}
              />
            )}
            {showsShapeHint ? (
              <AlphabetWantedHint languageName={languageName} />
            ) : (
              <LetterShapes
                font={font}
                fontData={fontData}
                postscriptName={postscriptName}
                alphabet={alphabet}
                shapeRowCount={shapeRowCount}
                choices={choices}
                onChoicesChange={onChoicesChange}
                onShapeChoiceChange={onShapeChoiceChange}
                sampleSize={sampleSize}
                onHoverChange={setHovered}
              />
            )}
            <DigitShapes
              fontFamily={font.family}
              fontData={fontData}
              postscriptName={postscriptName}
              hasDigitVariants={!!digitVariants?.length}
              choices={choices}
              onChoicesChange={onChoicesChange}
              onShapeChoiceChange={onShapeChoiceChange}
              sampleSize={sampleSize}
              onHoverChange={setHovered}
            />
          </div>
        )}

        {/*
          Whether the font can write the user's alphabet, at the foot of what it
          can do rather than at the head of it. The shapes above are the reason
          they opened this font; this is the check they make on the way out.

          Letters we couldn't find are spelled out, and the alphabet is set in the
          font underneath for the user to judge, since a font can hold every letter
          and still set the marks wrongly. A font somebody who knows the language
          has recommended says nothing here: that recommendation is the answer to
          the question, and it has its own line at the foot.
        */}
        {!vouchedFor &&
          alphabetSet.size > 0 &&
          missing &&
          (missing.length > 0 || SHOW_ALPHABET_COVERED_CALLOUT) && (
            <Callout
              variant={missing.length === 0 ? "info" : "warn"}
              css={css`
                margin-top: 18px;
              `}
            >
              <b>
                {missing.length === 0
                  ? "Includes the letters of your alphabet"
                  : "Missing some of your letters"}
              </b>
              {missing.length > 0 && `: ${missing.join(" ")}`}
              {/*
                The alphabet is shown so the user can judge the font's own
                rendering of it. Until the font is on the machine there is
                nothing to judge — the browser would set it in whatever it
                falls back to — so the letters stay out of the way.
              */}
              {installed && (
                <>
                  <br />
                  <span
                    css={css`
                      font-family: "${font.family}";
                      font-size: 20px;
                      letter-spacing: 0.8px;
                    `}
                  >
                    {alphabet}
                  </span>
                </>
              )}
            </Callout>
          )}

        {/* The two pieces of good news, kept together at the foot: who says this
            font is right for the language, and what its licence lets you do with
            it. Neither is worth interrupting for on the way in, and both are what
            the user checks on the way out, so they sit under everything the font
            can actually show.

            `margin-top: auto` puts them on the floor of the pane rather than
            trailing the sample text with a field of white below. When enough
            arrives above to fill the pane, the auto margin collapses to the 18px
            minimum and they go back to being the last thing you scroll to. The
            wait on `stillFillingIn` is why they can be placed at all: shown
            earlier, they would ride downward as the sections above them arrived.
        */}
        {(vouchedFor || licenseAtFoot) && (!stillFillingIn || footPlaced) && (
          <div
            css={css`
              margin-top: auto;
              padding-top: 18px;
              display: flex;
              flex-direction: column;
              gap: 10px;
            `}
          >
            {vouchedFor && (
              <Callout variant="vouched">
                <b>Known to support {languageName || "your language"}</b>
                {font.supportsLanguageSource && (
                  <>
                    {" "}
                    <SourceInfo
                      tooltip={`This recommendation comes from ${
                        font.supportsLanguageSource.name
                      }.${
                        font.supportsLanguageSource.url
                          ? " Click to see the source."
                          : ""
                      }`}
                      ariaLabel={`Language support source: ${font.supportsLanguageSource.name}`}
                      url={font.supportsLanguageSource.url}
                    />
                  </>
                )}
              </Callout>
            )}
            {licenseAtFoot && (
              <LicenseCallout
                font={font}
                fontData={fontData}
                postscriptName={postscriptName}
              />
            )}
          </div>
        )}
      </div>

      <div
        css={css`
          flex: none;
          padding-top: 22px;
          display: flex;
          align-items: center;
          gap: 10px;
        `}
      >
        {/*
          The hovered shape is written here and nowhere else. It takes the room
          left over beside the buttons, and takes it whether or not it has
          anything to say, so that a shape coming under the pointer never moves
          the buttons. Two short lines fit inside the buttons' own height, so the
          footer doesn't change height either.
        */}
        {/* A choice that failed takes the hover line's room to say why: the
            reason belongs beside the button it came from, and the user's eyes
            are already there. */}
        {chooseError ? (
          <Typography
            variant="caption"
            color="error"
            css={css`
              flex: 1;
              min-width: 0;
            `}
          >
            {chooseError}
          </Typography>
        ) : (
          <ShapeInfoLine
            info={hovered}
            css={css`
              flex: 1;
              min-width: 0;
            `}
          />
        )}
        <Button variant="text" onClick={() => onCancel?.()}>
          Cancel
        </Button>
        {/*
          Not disabled while the bytes are loading. A font that is on the
          machine can be chosen whether or not we have finished reading it —
          nothing here needs the file — and the read takes a few milliseconds,
          so disabling for it only greyed the button out and back on every font
          the user clicked. A font that isn't here yet is caught by `installed`.
          The exception is `choosing`: this click really does fetch something,
          and a second click mid-fetch would fetch it twice.
        */}
        <Button
          variant="contained"
          disabled={!font.family || !installed || choosing}
          onClick={onUse}
        >
          {useDownloadSizeBytes === undefined && !choosing ? (
            "Use this font"
          ) : (
            <span
              css={css`
                display: flex;
                flex-direction: column;
                align-items: center;
              `}
            >
              Use this font
              <Typography
                variant="caption"
                css={css`
                  display: flex;
                  align-items: center;
                  gap: 4px;
                  line-height: 1.2;
                  opacity: 0.85;
                  text-transform: none;
                `}
              >
                {/* The arrow makes the second line read as a cost rather than a
                    measurement — "3.4 MB" alone could be the size of the font
                    on screen. It sits out while the fetch is running, where the
                    word already says what is happening. */}
                {!choosing && <DownloadNeededIcon size={12} />}
                {choosing
                  ? "Downloading…"
                  : `${formatDownloadSize(useDownloadSizeBytes ?? 0)} Download`}
              </Typography>
            </span>
          )}
        </Button>
      </div>
    </div>
  );
};

/**
 * The offer to fetch a font, for the case where we didn't fetch it unasked.
 *
 * The size is the point of the button, not decoration: the user is on a
 * connection where a megabyte matters, and "Preview this font" alone asks them to
 * agree to something they can't see the cost of. It goes under the label rather
 * than in it so the words the user is looking for stay one short line.
 *
 * The label is set in sentence case, unlike the pane's other buttons: two lines of
 * capitals read as a warning rather than an offer.
 */
const PreviewFontButton: React.FunctionComponent<{
  /** Whether this is a second attempt, after a fetch that failed. */
  retrying: boolean;
  sizeBytes?: number;
  busy: boolean;
  onClick: () => void;
}> = ({ retrying, sizeBytes, busy, onClick }) => (
  <Button
    variant="outlined"
    color="secondary"
    size="small"
    startIcon={<DownloadNeededIcon size={14} />}
    disabled={busy}
    onClick={onClick}
    css={css`
      text-transform: none;
      line-height: 1.25;
      .MuiButton-startIcon {
        /* Beside the label as a whole, on the line the words are on. */
        align-self: flex-start;
        margin-top: 2px;
      }
    `}
  >
    <span
      css={css`
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      `}
    >
      {retrying ? "Try again" : "Preview this font"}
      {sizeBytes !== undefined && (
        <Typography
          variant="caption"
          css={css`
            line-height: 1.2;
            opacity: 0.8;
          `}
        >
          {`${formatDownloadSize(sizeBytes)} Download`}
        </Typography>
      )}
    </span>
  </Button>
);

/**
 * Whether a condition has held for this long, uninterrupted. The waiting-room
 * pattern the LoadingBar uses, for anything that shouldn't be mentioned until
 * it has gone on long enough to be worth mentioning.
 */
function useHasLasted(active: boolean, ms: number): boolean {
  const [lasted, setLasted] = useState(false);
  useEffect(() => {
    if (!active) {
      setLasted(false);
      return;
    }
    const timer = setTimeout(() => setLasted(true), ms);
    return () => clearTimeout(timer);
  }, [active, ms]);
  return lasted;
}

const LetterShapes: React.FunctionComponent<{
  font: FontInfo;
  fontData?: ArrayBuffer;
  postscriptName?: string;
  alphabet: string;
  /** How many rows of letter shapes there are to pick from. */
  shapeRowCount?: number;
  choices: CharacterVariantChoices;
  onChoicesChange: (choices: CharacterVariantChoices) => void;
  onShapeChoiceChange?: (groupKey: string, choice: ShapeChoice) => void;
  sampleSize?: number;
  onHoverChange?: (info: ShapeInfo | null) => void;
}> = ({
  font,
  fontData,
  postscriptName,
  alphabet,
  shapeRowCount,
  choices,
  onChoicesChange,
  onShapeChoiceChange,
  sampleSize,
  onHoverChange,
}) => {
  // Nothing to choose between, or nothing read yet: the section stays away
  // entirely rather than heading an empty space or announcing its own emptiness.
  if (!shapeRowCount) return null;

  return (
    <div>
      <SectionHeading>Letter Shape Choices</SectionHeading>

      <CharacterVariantList
        fontFamily={font.family}
        fontData={fontData}
        postscriptName={postscriptName}
        alphabet={alphabet}
        excludeCharacters={DIGITS}
        choices={choices}
        onChoicesChange={onChoicesChange}
        onShapeChoiceChange={onShapeChoiceChange}
        sampleSize={sampleSize}
        onHoverChange={onHoverChange}
      />
    </div>
  );
};

/**
 * Where the letter shapes would be, for a user who hasn't said what they write.
 * The section can't be built without an alphabet, and a blank space where it
 * belongs looks like a font with nothing to offer rather than a question waiting
 * to be answered.
 */
const AlphabetWantedHint: React.FunctionComponent<{
  languageName?: string;
}> = ({ languageName }) => {
  const theme = useTheme();
  return (
    <Typography
      variant="body2"
      css={css`
        font-size: 12.5px;
        color: ${theme.palette.text.secondary};
      `}
    >
      {`Enter the alphabet for ${
        languageName || "your language"
      } to see the letter-shape choices that matter for it.`}
    </Typography>
  );
};

/**
 * The quiet "i" after a licence sentence.
 *
 * It always opens a panel, never a web page. Sending the reader straight out to
 * `name` ID 14 looked helpful and mostly wasn't: Microsoft's fonts point at the
 * Windows font catalogue, a list of typefaces that never mentions permission at
 * all, so the one control offering to explain the warning led away from the
 * answer. The panel says what the user may do, then why we think so, and only
 * then offers somewhere to go — labelled with what is actually on the other end.
 *
 * Under all of that, who made the font. The two belong in one panel because they
 * are one question asked twice: a user told "ask whoever made this font" needs a
 * name to ask, and until now the only place to find one was Bloom's separate font
 * information pane — or, for the copyright line, a developer-only `alert()`.
 */
const LicenseInfo: React.FunctionComponent<{
  font: FontInfo;
  /** The font's bytes, to read the credits off when the host hasn't supplied them. */
  fontData?: ArrayBuffer;
  postscriptName?: string;
}> = ({ font, fontData, postscriptName }) => {
  const [anchor, setAnchor] = useState<HTMLElement | undefined>(undefined);
  const theme = useTheme();
  const { advice, provenance, link } = licenseMessage(font);
  const credits = useFontCredits(font, fontData, postscriptName);

  return (
    <>
      <Tooltip title="Click to learn what you can do with this font, and who made it.">
        <Link
          component="button"
          type="button"
          color="inherit"
          aria-label="About this font's license and who made it"
          onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
            setAnchor(e.currentTarget)
          }
          css={sourceIconCss}
        >
          <InfoCircleIcon size={13} />
        </Link>
      </Tooltip>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(undefined)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <div
          css={[
            css`
              max-width: 300px;
              /* A copyright notice can run to a paragraph, and a few fonts put
                 their whole licence in one. Rather than let the panel grow past
                 the window, it scrolls. */
              max-height: 60vh;
              overflow-y: auto;
              padding: 12px 14px;
              font-size: 12.5px;
              line-height: 1.45;
              display: flex;
              flex-direction: column;
              gap: 8px;
            `,
            scrollbarCss,
          ]}
        >
          {/* `licenseNotes` is the host's own sentence and is already on the
              row this panel hangs off, so it isn't repeated here. */}
          {advice && <span>{advice}</span>}
          <span
            css={css`
              color: ${theme.palette.text.secondary};
            `}
          >
            {provenance}
          </span>
          {link ? (
            <Link href={link.url} target="_blank" rel="noreferrer">
              {link.label}
            </Link>
          ) : (
            <span
              css={css`
                color: ${theme.palette.text.secondary};
              `}
            >
              {NO_LICENSE_PAGE}
            </span>
          )}
          {credits && <FontCreditsBlock credits={credits} />}
        </div>
      </Popover>
    </>
  );
};

/**
 * Who made the font, at the foot of the licence panel and behind a rule, because
 * it is a different question from the one the panel was opened to answer.
 *
 * Only what the font says. Every line is absent for a font that doesn't say it,
 * and a font that says none of it loses the block and the rule with it — which is
 * most of the fonts on a Windows machine.
 */
const FontCreditsBlock: React.FunctionComponent<{ credits: FontCredits }> = ({
  credits,
}) => {
  const theme = useTheme();
  const {
    copyright,
    version,
    designer,
    designerUrl,
    manufacturer,
    manufacturerUrl,
  } = credits;

  // Foundries routinely write the same name in both fields — SIL is its own
  // designer on half its fonts — and saying it twice reads as two organizations.
  const separateManufacturer =
    manufacturer && manufacturer !== designer ? manufacturer : undefined;

  return (
    <>
      <Divider
        css={css`
          margin: 2px 0;
        `}
      />
      <div
        css={css`
          display: flex;
          flex-direction: column;
          gap: 4px;
          /* Long URLs and unbroken copyright strings must not widen the panel. */
          overflow-wrap: anywhere;
        `}
      >
        {designer && (
          <span>
            Designed by <MaybeLink text={designer} url={designerUrl} />
          </span>
        )}
        {separateManufacturer && (
          <span>
            Published by{" "}
            <MaybeLink text={separateManufacturer} url={manufacturerUrl} />
          </span>
        )}
        {/* The designer's page, where the designer themselves went unnamed. A
            bare address is worth more than nothing: it is somewhere to ask. */}
        {!designer && designerUrl && (
          <MaybeLink text={designerUrl} url={designerUrl} />
        )}
        {!separateManufacturer && !manufacturer && manufacturerUrl && (
          <MaybeLink text={manufacturerUrl} url={manufacturerUrl} />
        )}
        {version && <span>Version {version}</span>}
        {copyright && (
          <span
            css={css`
              color: ${theme.palette.text.secondary};
            `}
          >
            {copyright}
          </span>
        )}
      </div>
    </>
  );
};

/** A name that links to its own page where the font gave one, plain text where it didn't. */
const MaybeLink: React.FunctionComponent<{ text: string; url?: string }> = ({
  text,
  url,
}) =>
  url ? (
    <Link href={url} target="_blank" rel="noreferrer">
      {text}
    </Link>
  ) : (
    <>{text}</>
  );

/**
 * What the font says about who made it: the host's word where it has one, and
 * otherwise the font's own `name` table.
 *
 * Read here rather than in the sweep, and not cached, for the reason cvXX features
 * aren't: this is asked about one font — the one on screen, whose bytes are in
 * hand — where the sweep runs over every family the machine has.
 */
function useFontCredits(
  font: FontInfo,
  fontData: ArrayBuffer | undefined,
  postscriptName: string | undefined
): FontCredits | undefined {
  return useMemo(() => {
    if (font.credits) return font.credits;
    if (!fontData) return undefined;
    try {
      return readFontCredits(fontData, postscriptName);
    } catch {
      // A font we can't parse simply has no credits to show; everything else in
      // the panel still stands, since it was worked out from other things.
      return undefined;
    }
  }, [font.credits, fontData, postscriptName]);
}

const LicenseCallout: React.FunctionComponent<{
  font: FontInfo;
  fontData?: ArrayBuffer;
  postscriptName?: string;
  className?: string;
}> = ({ font, fontData, postscriptName, className }) => {
  const license = font.license ?? "unknown";
  const { headline } = licenseMessage(font);

  return (
    <Callout variant={calloutVariantFor(license)} className={className}>
      {headline}{" "}
      <LicenseInfo
        font={font}
        fontData={fontData}
        postscriptName={postscriptName}
      />
      {font.licenseNotes && (
        <>
          <br />
          {font.licenseNotes}
        </>
      )}
    </Callout>
  );
};

function calloutVariantFor(license: FontLicenseCategory): CalloutVariant {
  switch (license) {
    case "open":
      return "open-license";
    case "limits-apply":
      return "warn";
    case "system-restricted":
      return "error";
    case "unknown":
      return "unknown";
  }
}

/**
 * Which characters the font has. The sweep works this out for installed fonts as
 * it goes; for a font it hasn't reached, or one whose bytes came from the host
 * app, we read it out of the bytes ourselves.
 */
function useCoverage(
  fontData: ArrayBuffer | undefined,
  scanned: Uint32Array | undefined,
  postscriptName: string | undefined,
  supplementary?: ArrayBuffer[]
): Uint32Array | undefined {
  const [read, setRead] = useState<Uint32Array | undefined>();

  useEffect(() => {
    if (scanned || !fontData) {
      // Only here, where there is nothing on the way to replace it. Clearing it
      // at the top of every run took the alphabet callout away and put it back a
      // frame later, for every font the user clicked past.
      setRead(undefined);
      return;
    }
    let stale = false;
    const files = [fontData, ...(supplementary ?? [])];
    Promise.all(
      files.map((file, index) =>
        // Only the primary bytes can be a collection; the extra subset files
        // are single fonts, and a stray name must not pick nothing out of them.
        readCoverageRanges(new Blob([file]), index === 0 ? postscriptName : undefined)
      )
    )
      .then((all) => {
        if (!stale) setRead(mergeCoverageRanges(all));
      })
      .catch(() => {
        // A font we can't read the cmap of is left with nothing claimed either way.
      });
    return () => {
      stale = true;
    };
  }, [fontData, scanned, postscriptName, supplementary]);

  return scanned ?? read;
}
