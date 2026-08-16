/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { Alert, LinearProgress, useTheme } from "@mui/material";
import React, { useEffect, useMemo, useState } from "react";
import { AlphabetField } from "./AlphabetField";
import {
  CharacterVariantChoices,
  CharacterVariantList,
} from "./CharacterVariantList";
import { FontChooser } from "./FontChooser";
import type { ShapeInfo } from "./ShapeInfoLine";
import {
  charactersWithVariants,
  ensureTofuFontLoaded,
  FontDataResult,
  loadLocalFontDataByFamilyWithName,
  readCharacterVariants,
  useFontData,
} from "@ethnolib/font-core";

export interface CharacterVariantsProps {
  /**
   * The font family currently chosen, e.g. "Andika"; "" for none yet. The host app
   * owns this value, so it can persist the choice and show the same font
   * elsewhere.
   */
  font: string;
  /** Called when the user picks a different font in the chooser. */
  onFontChange?: (font: string) => void;
  /**
   * The characters the user's language uses. Only variants that affect these
   * characters are shown; "" shows everything. Owned by the host app, like `font`.
   */
  alphabet?: string;
  /** Called when the user edits the alphabet. Omit to hide the alphabet field. */
  onAlphabetChange?: (alphabet: string) => void;
  /**
   * Offer exactly these font families in the chooser. By default the chooser lists
   * the fonts installed on the machine.
   */
  availableFonts?: string[];
  /**
   * How to get the bytes of a font family, which is the only place the cvXX
   * information lives. Defaults to the Local Font Access API; an app with its own
   * font source (a font server, its own font list) supplies this instead.
   *
   * Returning the bytes on their own is still fine. An app that knows which face
   * it handed over can return `{ data, postscriptName }` instead, which is what
   * lets us read the right font out of a collection (.ttc).
   */
  getFontData?: (font: string) => Promise<FontDataResult>;
  /**
   * The form chosen for each feature, by tag. Pass this to control the choices from
   * outside; otherwise the component keeps them itself.
   */
  choices?: CharacterVariantChoices;
  onChoicesChange?: (choices: CharacterVariantChoices) => void;
  /** Font size, in px, for the glyph samples. */
  sampleSize?: number;
  /**
   * Told what the shape tile under the pointer is, and told null when the pointer
   * leaves, for a host that has somewhere settled to write it. `<ShapeInfoLine>`
   * is what the font chooser draws it with.
   */
  onHoverChange?: (info: ShapeInfo | null) => void;
  className?: string;
}

/**
 * Shows the OpenType character variants (cv01..cv99) of a font the user picks.
 *
 * The user picks one form per feature; pass `onChoicesChange` to hear about it.
 */
export const CharacterVariants: React.FunctionComponent<
  CharacterVariantsProps
> = ({
  font,
  onFontChange,
  alphabet = "",
  onAlphabetChange,
  availableFonts,
  getFontData = loadLocalFontDataByFamilyWithName,
  choices,
  onChoicesChange,
  sampleSize,
  onHoverChange,
  className,
}) => {
  const theme = useTheme();
  // Everything below draws the alphabet in the chosen font backed by tofu, so
  // the tofu has to be with the browser; see fontFamilyWithTofu.
  useEffect(() => {
    void ensureTofuFontLoaded();
  }, []);
  const { fontData, postscriptName, loading, error, retry } = useFontData(
    font,
    getFontData
  );
  // Reading a font's bytes needs a permission the page may not have yet, and the
  // browser only grants it off a click. So until the chooser has managed to list
  // the machine's fonts we neither complain about a failed load nor make the user
  // read the browser's wording for it — the chooser's own button says what to do.
  const [fontsListed, setFontsListed] = useState(false);
  const showErrors = !!availableFonts || fontsListed;

  // Which alphabet characters to pick out in the field. Recomputed when the field
  // is left rather than as the user types, so the text doesn't shift under them.
  const [markedAlphabet, setMarkedAlphabet] = useState(alphabet);
  const marked = useMemo(() => {
    if (!fontData) return undefined;
    try {
      return charactersWithVariants(
        readCharacterVariants(fontData, postscriptName),
        markedAlphabet
      );
    } catch {
      return undefined;
    }
  }, [fontData, postscriptName, markedAlphabet]);

  return (
    <div className={className}>
      <div
        css={css`
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: ${theme.spacing(2)};
          margin-bottom: ${theme.spacing(2)};
        `}
      >
        {onAlphabetChange && (
          <AlphabetField
            value={alphabet}
            onChange={onAlphabetChange}
            fontFamily={font || undefined}
            marked={marked}
            onBlur={() => setMarkedAlphabet(alphabet)}
          />
        )}
        <FontChooser
          value={font}
          onChange={(newFont) => onFontChange?.(newFont)}
          fonts={availableFonts}
          alphabet={markedAlphabet}
          onFontsListed={() => {
            setFontsListed(true);
            if (!fontData) retry();
          }}
        />
      </div>

      {loading && <LinearProgress />}
      {error && showErrors && <Alert severity="error">{error.message}</Alert>}

      {font && (
        <CharacterVariantList
          fontFamily={font}
          fontData={fontData}
          postscriptName={postscriptName}
          alphabet={alphabet}
          choices={choices}
          onChoicesChange={onChoicesChange}
          sampleSize={sampleSize}
          onHoverChange={onHoverChange}
        />
      )}
    </div>
  );
};
