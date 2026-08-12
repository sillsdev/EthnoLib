/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { Alert, LinearProgress, useTheme } from "@mui/material";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlphabetField } from "./AlphabetField";
import { charactersWithVariants } from "./alphabet";
import { readCharacterVariants } from "./readCharacterVariants";
import {
  CharacterVariantChoices,
  CharacterVariantList,
} from "./CharacterVariantList";
import { FontChooser } from "./FontChooser";
import { loadLocalFontDataByFamily } from "./localFonts";

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
   */
  getFontData?: (font: string) => Promise<ArrayBuffer>;
  /**
   * The form chosen for each feature, by tag. Pass this to control the choices from
   * outside; otherwise the component keeps them itself.
   */
  choices?: CharacterVariantChoices;
  onChoicesChange?: (choices: CharacterVariantChoices) => void;
  /** Font size, in px, for the glyph samples. */
  sampleSize?: number;
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
  getFontData = loadLocalFontDataByFamily,
  choices,
  onChoicesChange,
  sampleSize,
  className,
}) => {
  const theme = useTheme();
  const [fontData, setFontData] = useState<ArrayBuffer | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  // Reading a font's bytes needs a permission the page may not have yet, and the
  // browser only grants it off a click. So until the chooser has managed to list
  // the machine's fonts we neither complain about a failed load nor make the user
  // read the browser's wording for it — the chooser's own button says what to do.
  const [attempt, setAttempt] = useState(0);
  const [fontsListed, setFontsListed] = useState(false);
  const showErrors = !!availableFonts || fontsListed;

  // Held in a ref so that an app passing an inline `getFontData` arrow doesn't
  // reload the font on every render.
  const getFontDataRef = useRef(getFontData);
  getFontDataRef.current = getFontData;

  useEffect(() => {
    setFontData(undefined);
    setError(undefined);
    if (!font) return;

    let stale = false;
    setLoading(true);
    getFontDataRef
      .current(font)
      .then((data) => {
        if (!stale) setFontData(data);
      })
      .catch((e: Error) => {
        if (!stale) setError(e.message);
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });
    // Ignore a load that finished after the user moved on to another font.
    return () => {
      stale = true;
    };
  }, [font, attempt]);

  // Which alphabet characters to pick out in the field. Recomputed when the field
  // is left rather than as the user types, so the text doesn't shift under them.
  const [markedAlphabet, setMarkedAlphabet] = useState(alphabet);
  const marked = useMemo(() => {
    if (!fontData) return undefined;
    try {
      return charactersWithVariants(
        readCharacterVariants(fontData),
        markedAlphabet
      );
    } catch {
      return undefined;
    }
  }, [fontData, markedAlphabet]);

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
            if (!fontData) setAttempt((n) => n + 1);
          }}
        />
      </div>

      {loading && <LinearProgress />}
      {error && showErrors && <Alert severity="error">{error}</Alert>}

      {font && (
        <CharacterVariantList
          fontFamily={font}
          fontData={fontData}
          alphabet={alphabet}
          choices={choices}
          onChoicesChange={onChoicesChange}
          sampleSize={sampleSize}
        />
      )}
    </div>
  );
};
