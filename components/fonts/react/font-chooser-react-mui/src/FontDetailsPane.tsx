/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { Button, Divider, Link, Typography, useTheme } from "@mui/material";
import React, { useEffect, useMemo, useState } from "react";
import {
  CharacterVariantChoices,
  CharacterVariantList,
  groupVariants,
  ShapeInfo,
  ShapeInfoLine,
  type ChoiceSource,
  type ShapeChoice,
} from "@ethnolib/character-variants-react-mui";
import {
  DIGITS,
  filterVariantsForAlphabet,
  parseAlphabet,
  readCharacterVariants,
  readCoverageRanges,
  variantsBeyond,
  variantsFor,
} from "@ethnolib/font-core";
import { Callout } from "./Callout";
import { DigitShapes } from "./DigitShapes";
import { SampleTextSection } from "./SampleTextSection";
import { SectionHeading } from "./SectionHeading";
import { generateExampleText } from "./exampleText";
import { featureSettingsFor } from "./featureSettings";
import { DownloadNeededIcon } from "./icons";
import { missingFromAlphabet, saysSupportsLanguage } from "./missingCharacters";
import { scrollbarCss } from "./scrollbarStyle";
import type { FontInfo } from "./types";

/** The digits, as a set, for telling digit shapes from letter shapes. */
const DIGIT_SET = parseAlphabet(DIGITS);

export interface FontDetailsPaneProps {
  font: FontInfo;
  /** The font's bytes, once they are loaded; everything specific waits on these. */
  fontData?: ArrayBuffer;
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
  choices: CharacterVariantChoices;
  onChoicesChange: (choices: CharacterVariantChoices) => void;
  onDownloadFont?: (font: FontInfo) => void;
  onCancel?: () => void;
  onUse: () => void;
  /** True while the font's bytes are still on their way. */
  loading?: boolean;
  sampleSize?: number;
  /**
   * Real writing in the user's own language, for the sample paragraph. Without it
   * the sample is made up out of the alphabet, and says so.
   */
  sampleText?: string;
  /** What the user has typed over the sample, if they have. */
  customSampleText?: string;
  onCustomSampleTextChange?: (text: string | undefined) => void;
  /**
   * Told the font-independent fact behind every shape pick, letters and digits
   * alike, with the row it belongs to. See CharacterVariantList.
   */
  onShapeChoiceChange?: (groupKey: string, choice: ShapeChoice) => void;
  /**
   * Why each row's current form is in force, keyed by row, for captioning the
   * shape cards. A caller showing debug information passes it; otherwise the
   * cards stay uncluttered.
   */
  debugProvenance?: Record<string, ChoiceSource>;
  /**
   * Whatever else the caller wants shown in the collapsed debug block at the
   * pane's foot — shape memory, SLDR defaults, the reported effective set —
   * rendered as JSON. The block appears only when this is given.
   */
  debugInfo?: unknown;
}

/**
 * Everything about the one font the user is looking at: whether it can write their
 * alphabet, what its licence lets them do with it, and the letter shapes it offers.
 */
export const FontDetailsPane: React.FunctionComponent<FontDetailsPaneProps> = ({
  font,
  fontData,
  postscriptName,
  scannedCoverage,
  alphabet,
  choices,
  onChoicesChange,
  onDownloadFont,
  onCancel,
  onUse,
  loading,
  sampleSize,
  sampleText,
  customSampleText,
  onCustomSampleTextChange,
  onShapeChoiceChange,
  debugProvenance,
  debugInfo,
}) => {
  const installed = font.installed !== false;
  // What the pointer is on, wherever it is: one line at the foot of the pane
  // serves both shape sections, so that reading about a shape never puts a label
  // over the shapes themselves.
  const [hovered, setHovered] = useState<ShapeInfo | null>(null);
  const coverage = useCoverage(fontData, scannedCoverage, postscriptName);
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
  // A font with nothing to choose between says nothing at all: no headings, and
  // no line announcing the absence. The one exception is a font we don't have
  // yet, where the ghosted section is part of explaining the download.
  const showsGhost = !installed && !showsShapeHint && shapeRowCount !== 0;

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
    (!!sampleText || !!customSampleText || !!invented);
  const vouchedFor = saysSupportsLanguage(font.supportsLanguage, missing);
  const showsShapes =
    showsShapeHint ||
    (installed
      ? !!shapeRowCount || !!digitVariants?.length || showsExample
      : showsGhost);
  // Only what the user has to know before looking at the font at all.
  const showsPreamble = licenseAtTop || !installed;

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
            {licenseAtTop && <LicenseCallout font={font} />}

            {!installed && (
              <Callout
                variant="download"
                action={
                  <Button
                    variant="outlined"
                    color="secondary"
                    size="small"
                    startIcon={<DownloadNeededIcon size={14} />}
                    onClick={() => onDownloadFont?.(font)}
                  >
                    Download this font
                  </Button>
                }
              >
                This font is not on this computer yet.
                {font.downloadSizeBytes !== undefined &&
                  ` This font is ${(font.downloadSizeBytes / 1_000_000).toFixed(
                    1
                  )} MB.`}
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

        {installed ? (
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
                languageText={sampleText}
                inventedText={invented}
                customText={customSampleText}
                onCustomTextChange={onCustomSampleTextChange}
                choices={choices}
              />
            )}
            {showsShapeHint ? (
              <AlphabetWantedHint />
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
                provenance={debugProvenance}
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
              provenance={debugProvenance}
              sampleSize={sampleSize}
              onHoverChange={setHovered}
            />
          </div>
        ) : showsShapeHint ? (
          <AlphabetWantedHint />
        ) : (
          showsGhost && <GhostedLetterShapes shapeCount={shapeRowCount} />
        )}

        {/*
          Whether the font can write the user's alphabet, at the foot of what it
          can do rather than at the head of it. The shapes above are the reason
          they opened this font; this is the check they make on the way out, and
          it reads next to the licence, which is the other one.

          Two quite different things can be said here, and the difference matters
          to the user. Where somebody who knows the language has recommended this
          font, that is the answer to their question, and the letters are not worth
          spelling out: they were never in doubt. Where all we have done is check
          the characters one by one, the claim is only that — which is why the
          alphabet itself is shown underneath, for the user to look at, since a
          font can hold every letter and still set the marks wrongly.
        */}
        {vouchedFor ? (
          <Callout
            variant="ok"
            css={css`
              margin-top: 18px;
            `}
          >
            <b>Supports your language</b>
          </Callout>
        ) : (
          alphabetSet.size > 0 &&
          missing && (
            <Callout
              variant={missing.length === 0 ? "ok" : "warn"}
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
            </Callout>
          )
        )}

        {/* The open case: a licence that says yes is worth confirming but not
            worth interrupting for, so it sits at the very end, under the alphabet
            check. Everything else has already had its say at the top. */}
        {licenseAtFoot && (
          <LicenseCallout
            font={font}
            css={css`
              margin-top: 18px;
            `}
          />
        )}

        {/* The raw facts behind the shapes above, for whoever is debugging:
            collapsed, plain JSON, at the very foot where it bothers nobody. */}
        {debugInfo !== undefined && (
          <details
            css={css`
              margin-top: 18px;
              font-size: 11px;
            `}
          >
            <summary>Shape debug info</summary>
            <pre
              css={css`
                white-space: pre-wrap;
                word-break: break-word;
              `}
            >
              {JSON.stringify(
                { fontFeatureSettings: featureSettingsFor(choices), ...(debugInfo as object) },
                null,
                2
              )}
            </pre>
          </details>
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
        <ShapeInfoLine
          info={hovered}
          css={css`
            flex: 1;
            min-width: 0;
          `}
        />
        <Button variant="text" onClick={() => onCancel?.()}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!font.family || !!loading || !installed}
          onClick={onUse}
        >
          Use this font
        </Button>
      </div>
    </div>
  );
};

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
  provenance?: Record<string, ChoiceSource>;
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
  provenance,
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
        provenance={provenance}
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
const AlphabetWantedHint: React.FunctionComponent = () => {
  const theme = useTheme();
  return (
    <Typography
      variant="body2"
      css={css`
        font-size: 12.5px;
        color: ${theme.palette.text.secondary};
      `}
    >
      Enter your language&apos;s alphabet to see the letter-shape choices that
      matter for it.
    </Typography>
  );
};

/**
 * The shape of the letter-shape area for a font we don't have yet: the shapes
 * can't be picked until the font is on the machine, but leaving a blank would hide
 * what the downloading is for. Where we have managed to read the font's file we
 * can at least say how many shape choices are waiting inside it. A font we have
 * read and found nothing in doesn't come here at all; the caller leaves it out.
 */
const GhostedLetterShapes: React.FunctionComponent<{
  shapeCount?: number;
}> = ({ shapeCount }) => {
  const theme = useTheme();
  // Without the font's bytes we don't know how many choices it holds, so we draw a
  // token two; with them, we draw what it has, up to a rowful.
  const tiles = shapeCount === undefined ? 2 : Math.min(shapeCount, 3);
  return (
    <div
      aria-hidden
      css={css`
        opacity: 0.45;
        pointer-events: none;
      `}
    >
      <SectionHeading>Letter Shape Choices</SectionHeading>
      {shapeCount !== undefined && (
        <Typography
          variant="body2"
          css={css`
            font-size: 12.5px;
            color: ${theme.palette.text.secondary};
            margin-bottom: 10px;
          `}
        >
          {`${shapeCount} of your letters can be drawn more than one way in this font. Download it to pick between them.`}
        </Typography>
      )}
      <div
        css={css`
          display: flex;
          gap: 12px;
        `}
      >
        {Array.from({ length: tiles }, (_, index) => index).map((i) => (
          <div
            key={i}
            css={css`
              width: 150px;
              height: 76px;
              display: flex;
              align-items: flex-end;
              justify-content: center;
              padding-bottom: 6px;
              border: 1px dashed ${theme.palette.divider};
              border-radius: 6px;
              font-size: 11px;
              color: ${theme.palette.text.secondary};
            `}
          >
            letter shapes
          </div>
        ))}
      </div>
    </div>
  );
};

const LicenseCallout: React.FunctionComponent<{
  font: FontInfo;
  className?: string;
}> = ({ font, className }) => {
  const license = font.license ?? "unknown";
  const link = font.licenseUrl && (
    <>
      {" "}
      <Link href={font.licenseUrl} target="_blank" rel="noreferrer">
        {license === "open" ? "license" : "Read the license"}
      </Link>
      .
    </>
  );

  if (license === "open") {
    return (
      <Callout variant="ok" className={className}>
        This font&apos;s{" "}
        {font.licenseUrl ? (
          <Link href={font.licenseUrl} target="_blank" rel="noreferrer">
            license
          </Link>
        ) : (
          "license"
        )}{" "}
        allows printing, ebooks, apps, and publishing to web.
      </Callout>
    );
  }

  if (license === "limits-apply") {
    return (
      <Callout variant="warn" className={className}>
        Limits apply to this font&apos;s license.
        {link}
        {font.licenseNotes && (
          <>
            <br />
            {font.licenseNotes}
          </>
        )}
      </Callout>
    );
  }

  if (license === "system-restricted") {
    return (
      <Callout variant="error" className={className}>
        This font came with your computer and may not be shared. It may work on
        this computer only.
      </Callout>
    );
  }

  return (
    <Callout variant="unknown" className={className}>
      We don&apos;t know the rules for this font. You can print with it, but
      check its license before publishing.
      {link}
    </Callout>
  );
};

/**
 * Which characters the font has. The sweep works this out for installed fonts as
 * it goes; for a font it hasn't reached, or one whose bytes came from the host
 * app, we read it out of the bytes ourselves.
 */
function useCoverage(
  fontData: ArrayBuffer | undefined,
  scanned: Uint32Array | undefined,
  postscriptName: string | undefined
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
    readCoverageRanges(new Blob([fontData]), postscriptName)
      .then((ranges) => {
        if (!stale) setRead(ranges);
      })
      .catch(() => {
        // A font we can't read the cmap of is left with nothing claimed either way.
      });
    return () => {
      stale = true;
    };
  }, [fontData, scanned, postscriptName]);

  return scanned ?? read;
}
