/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { Button, Divider, Link, Typography, useTheme } from "@mui/material";
import React, { useEffect, useMemo, useState } from "react";
import {
  CharacterVariantChoices,
  CharacterVariantList,
  charactersWithVariants,
  filterVariantsForAlphabet,
  hasOldStyleNumerals,
  parseAlphabet,
  readCharacterVariants,
  readCoverageRanges,
} from "@ethnolib/character-variants-react-mui";
import { Callout } from "./Callout";
import { DownloadNeededIcon } from "./icons";
import { missingFromAlphabet } from "./missingCharacters";
import { NumberShapes, OLD_STYLE_NUMERALS_TAG } from "./NumberShapes";
import type { FontInfo } from "./types";

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
}) => {
  const theme = useTheme();
  const installed = font.installed !== false;
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

  const shownVariants = useMemo(
    () => variants && filterVariantsForAlphabet(variants, alphabetSet),
    [variants, alphabetSet]
  );
  const markedCount = useMemo(
    () => (variants ? charactersWithVariants(variants, alphabet).size : 0),
    [variants, alphabet]
  );

  // Reading this means walking the font's feature list, so it happens once per
  // font rather than once per render.
  const showsNumberShapes = useMemo(
    () => !!fontData && safeHasOldStyleNumerals(fontData, postscriptName),
    [fontData, postscriptName]
  );

  return (
    <div
      css={css`
        flex: 1;
        display: flex;
        flex-direction: column;
        padding: 22px 24px;
        overflow-y: auto;
      `}
    >
      <Typography
        variant="h3"
        css={css`
          font-size: 20px;
          font-weight: 400;
          color: ${theme.palette.text.primary};
          margin-bottom: 14px;
        `}
      >
        {font.family}
      </Typography>

      <div
        css={css`
          display: flex;
          flex-direction: column;
          gap: 10px;
        `}
      >
        {alphabetSet.size > 0 && missing && (
          <Callout variant={missing.length === 0 ? "ok" : "warn"}>
            <b>
              {missing.length === 0
                ? "Supports your alphabet"
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
        )}

        <LicenseCallout font={font} />

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

      <Divider
        css={css`
          margin: 18px 0 14px;
        `}
      />

      {installed ? (
        <LetterShapes
          font={font}
          fontData={fontData}
          postscriptName={postscriptName}
          alphabet={alphabet}
          hasAlphabet={alphabetSet.size > 0}
          shownVariantCount={shownVariants?.length}
          markedCount={markedCount}
          choices={choices}
          onChoicesChange={onChoicesChange}
          sampleSize={sampleSize}
          showsNumberShapes={showsNumberShapes}
        />
      ) : (
        <GhostedLetterShapes shapeCount={shownVariants?.length} />
      )}

      <div
        css={css`
          margin-top: auto;
          padding-top: 22px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        `}
      >
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
  hasAlphabet: boolean;
  shownVariantCount?: number;
  markedCount: number;
  choices: CharacterVariantChoices;
  onChoicesChange: (choices: CharacterVariantChoices) => void;
  sampleSize?: number;
  showsNumberShapes: boolean;
}> = ({
  font,
  fontData,
  postscriptName,
  alphabet,
  hasAlphabet,
  shownVariantCount,
  markedCount,
  choices,
  onChoicesChange,
  sampleSize,
  showsNumberShapes,
}) => {
  const theme = useTheme();
  const hasShapes = !!shownVariantCount;

  return (
    <div>
      <Typography
        css={css`
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 6px;
        `}
      >
        Letter shapes
      </Typography>

      {hasShapes ? (
        <>
          <Typography
            variant="body2"
            css={css`
              font-size: 12.5px;
              color: ${theme.palette.text.secondary};
              margin-bottom: 12px;
            `}
          >
            {hasAlphabet && markedCount > 0
              ? `${markedCount} of your letters can be drawn more than one way. Pick the ones you want:`
              : "This font can draw some characters more than one way:"}
          </Typography>
          <CharacterVariantList
            fontFamily={font.family}
            fontData={fontData}
            postscriptName={postscriptName}
            alphabet={alphabet}
            choices={choices}
            onChoicesChange={onChoicesChange}
            sampleSize={sampleSize}
          />
        </>
      ) : (
        <Typography
          variant="body2"
          css={css`
            font-size: 12.5px;
            color: ${theme.palette.text.secondary};
          `}
        >
          {fontData
            ? "No letter-shape options for your alphabet in this font."
            : "Reading this font…"}
        </Typography>
      )}

      {showsNumberShapes && (
        <NumberShapes
          fontFamily={font.family}
          choice={choices[OLD_STYLE_NUMERALS_TAG] ?? 0}
          onChoose={(choice) =>
            onChoicesChange({ ...choices, [OLD_STYLE_NUMERALS_TAG]: choice })
          }
          css={css`
            margin-top: 18px;
          `}
        />
      )}
    </div>
  );
};

/**
 * The shape of the letter-shape area for a font we don't have yet: the shapes
 * can't be picked until the font is on the machine, but leaving a blank would hide
 * what the downloading is for. Where we have managed to read the font's file we
 * can at least say how many shape choices are waiting inside it.
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
      <Typography
        css={css`
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 10px;
        `}
      >
        Letter shapes
      </Typography>
      {shapeCount !== undefined && (
        <Typography
          variant="body2"
          css={css`
            font-size: 12.5px;
            color: ${theme.palette.text.secondary};
            margin-bottom: 10px;
          `}
        >
          {shapeCount > 0
            ? `${shapeCount} of your letters can be drawn more than one way in this font. Download it to pick between them.`
            : "No letter-shape options for your alphabet in this font."}
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

const LicenseCallout: React.FunctionComponent<{ font: FontInfo }> = ({
  font,
}) => {
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
      <Callout variant="ok">
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
      <Callout variant="warn">
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
      <Callout variant="error">
        This font came with your computer and may not be shared. It may work on
        this computer only.
      </Callout>
    );
  }

  return (
    <Callout variant="unknown">
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
    setRead(undefined);
    if (scanned || !fontData) return;
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

function safeHasOldStyleNumerals(
  fontData: ArrayBuffer,
  postscriptName: string | undefined
): boolean {
  try {
    return hasOldStyleNumerals(fontData, postscriptName);
  } catch {
    return false;
  }
}
