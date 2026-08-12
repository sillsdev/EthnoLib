/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import {
  Alert,
  createTheme,
  CssBaseline,
  ThemeProvider,
  Typography,
} from "@mui/material";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { CharacterVariants } from "../CharacterVariants";
import { loadLocalFontDataByFamilyWithName } from "../localFonts";

/** Remembers a string in local storage, so the demo opens where you left off. */
function useRememberedString(
  key: string,
  initial = ""
): [string, (value: string) => void] {
  const [value, setValue] = useState(
    () => localStorage.getItem(key) ?? initial
  );
  const remember = useCallback(
    (newValue: string) => {
      setValue(newValue);
      localStorage.setItem(key, newValue);
    },
    [key]
  );
  return [value, remember];
}

/**
 * The demo harness: it stands in for the host app, which will eventually put
 * <CharacterVariants> in a dialog of its own. All the app has to hold onto is the
 * chosen font and the alphabet.
 */
export const CharacterVariantsDemo: React.FunctionComponent<{
  primaryColor?: string;
  /**
   * A font to load at startup instead of picking one, so that a test (or a browser
   * without the Local Font Access API) can get straight to the variants.
   */
  fontUrl?: string;
}> = ({ primaryColor, fontUrl }) => {
  const theme = createTheme({
    palette: { primary: { main: primaryColor || "#1d94a4" } },
  });

  const [font, setFont] = useRememberedString(
    "characterVariantsDemo.font",
    "Andika"
  );
  const [alphabet, setAlphabet] = useRememberedString(
    "characterVariantsDemo.alphabet"
  );
  const [error, setError] = useState<string | undefined>();

  // A font handed to us by ?fontUrl= rather than installed on the machine. It has
  // to be registered with the browser before CSS can render anything in it.
  const ownFonts = useRef(new Map<string, ArrayBuffer>());
  const [ownFontNames, setOwnFontNames] = useState<string[]>([]);

  useEffect(() => {
    if (!fontUrl) return;
    (async () => {
      try {
        const response = await fetch(fontUrl);
        if (!response.ok) {
          throw new Error(`Could not fetch ${fontUrl}: ${response.status}`);
        }
        const data = await response.arrayBuffer();
        const family = fontUrl
          .replace(/[?#].*$/, "")
          .replace(/^.*[/\\]/, "")
          .replace(/\.[^.]+$/, "");
        const face = new FontFace(family, data);
        await face.load();
        document.fonts.add(face);
        ownFonts.current.set(family, data);
        setOwnFontNames([...ownFonts.current.keys()]);
        setFont(family);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
    // setFont is stable; re-running this on a new font choice would be wrong.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontUrl]);

  // Exercises the component's escape hatch for an app whose fonts don't come from
  // the machine's installed set.
  // A font the demo loaded itself is just bytes; an installed one comes with the
  // name of the face, which is what lets the readers pick the right font out of a
  // collection (.ttc). Both shapes are allowed, and this exercises each.
  const getFontData = useCallback(async (family: string) => {
    return (
      ownFonts.current.get(family) ??
      (await loadLocalFontDataByFamilyWithName(family))
    );
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div
        css={css`
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
          font-family: ${theme.typography.fontFamily};
        `}
      >
        <Typography
          variant="h5"
          css={css`
            margin-bottom: 16px;
          `}
        >
          Letter Shape Preferences
        </Typography>

        {error && <Alert severity="error">{error}</Alert>}

        <CharacterVariants
          // While a ?fontUrl= is still downloading, hold the component off: the
          // remembered font is not the one we are about to show.
          font={fontUrl && ownFontNames.length === 0 ? "" : font}
          onFontChange={setFont}
          alphabet={alphabet}
          onAlphabetChange={setAlphabet}
          availableFonts={ownFontNames.length ? ownFontNames : undefined}
          getFontData={getFontData}
        />
      </div>
    </ThemeProvider>
  );
};
