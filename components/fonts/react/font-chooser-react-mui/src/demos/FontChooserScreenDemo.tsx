/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import {
  createTheme,
  CssBaseline,
  ThemeProvider,
  Typography,
} from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";
import {
  AlphabetField,
  CharacterVariantChoices,
} from "@ethnolib/character-variants-react-mui";
import { FontChooserScreen } from "../FontChooserScreen";
import { fetchGoogleFontsCatalog, notoOnly } from "../googleFonts";
import type { FontInfo } from "../types";

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

// Bloom's colors, so the screen is seen in something close to where it will live.
const theme = createTheme({
  palette: {
    primary: { main: "#1d94a4", dark: "#19818f" },
    secondary: { main: "#96668f" },
    error: { main: "#d65649" },
    warning: { main: "#f3aa18" },
    background: { default: "#f1f3f4" },
  },
  typography: { fontFamily: "Roboto, sans-serif" },
  shape: { borderRadius: 4 },
});

/**
 * The families worth showing out of the whole Google Fonts catalog: the Noto
 * families, which between them cover nearly every script, and the SIL families
 * this audience already works in.
 */
const SIL_FAMILIES = [
  "Andika",
  "Charis SIL",
  "Gentium Plus",
  "Gentium Book Basic",
  "Doulos SIL",
];

function worthShowing(family: string): boolean {
  return notoOnly(family) || SIL_FAMILIES.includes(family);
}

const CACHE_KEY = "fontChooserDemo.googleFonts";
const CACHE_LIFETIME_MS = 24 * 60 * 60 * 1000;

/** The key, from the URL if it's there and from the build's env if it isn't. */
function googleFontsApiKey(): string | undefined {
  const fromUrl = new URLSearchParams(window.location.search).get(
    "googleFontsApiKey"
  );
  return fromUrl || import.meta.env.VITE_GOOGLE_FONTS_API_KEY || undefined;
}

/**
 * The Google Fonts catalog, kept in local storage for a day. The API is
 * quota-metered per key and the catalog barely moves, so a demo being reloaded
 * every few seconds has no business asking again each time.
 */
function useGoogleFonts(apiKey: string | undefined): {
  fonts?: FontInfo[];
  error?: string;
} {
  const [fonts, setFonts] = useState<FontInfo[] | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!apiKey) return;
    const cached = readCache();
    if (cached) {
      setFonts(cached);
      return;
    }
    let stale = false;
    fetchGoogleFontsCatalog({ apiKey, sort: "popularity" })
      .then((all) => {
        const kept = all.filter((font) => worthShowing(font.family));
        if (stale) return;
        setFonts(kept);
        writeCache(kept);
      })
      .catch((e: Error) => {
        if (!stale) setError(e.message);
      });
    return () => {
      stale = true;
    };
  }, [apiKey]);

  return { fonts, error };
}

function readCache(): FontInfo[] | undefined {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return undefined;
    const { at, fonts } = JSON.parse(raw) as { at: number; fonts: FontInfo[] };
    if (!at || Date.now() - at > CACHE_LIFETIME_MS) return undefined;
    return fonts;
  } catch {
    // A cache we can't read is a cache we don't have.
    return undefined;
  }
}

function writeCache(fonts: FontInfo[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), fonts }));
  } catch {
    // Storage being full or blocked costs the demo a refetch, nothing more.
  }
}

/**
 * The demo harness. It stands in for the host app, which owns the alphabet, the
 * chosen font and the letter shapes picked for it.
 */
export const FontChooserScreenDemo: React.FunctionComponent = () => {
  const [alphabet, setAlphabet] = useRememberedString(
    "fontChooserDemo.alphabet",
    "a b d e ə k l m n ŋ o ɔ p r s u v ɤ w"
  );
  const [font, setFont] = useRememberedString("fontChooserDemo.font");
  const [choicesJson, setChoicesJson] = useRememberedString(
    "fontChooserDemo.choices",
    "{}"
  );
  const [lastEvent, setLastEvent] = useState<string | undefined>();
  const [apiKey] = useState(googleFontsApiKey);
  const { fonts, error: catalogError } = useGoogleFonts(apiKey);

  let choices: CharacterVariantChoices = {};
  try {
    choices = JSON.parse(choicesJson) as CharacterVariantChoices;
  } catch {
    // A hand-edited local storage value shouldn't take the demo down with it.
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div
        css={css`
          padding: 24px;
          max-width: 1000px;
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
          Font Chooser
        </Typography>

        <AlphabetField
          value={alphabet}
          onChange={setAlphabet}
          fontFamily={font || undefined}
          css={css`
            margin-bottom: 20px;
          `}
        />

        <FontChooserScreen
          alphabet={alphabet}
          fonts={fonts}
          selectedFont={font}
          onSelectedFontChange={setFont}
          choices={choices}
          onChoicesChange={(next) => setChoicesJson(JSON.stringify(next))}
          onDownloadFont={(chosen) => {
            // No-op this round: downloading is the host app's job, and there is no
            // host app yet. The demo only shows that the button reaches it.
            console.log("download requested:", chosen.family);
            setLastEvent(`download requested: ${chosen.family}`);
          }}
          onCancel={() => setLastEvent("cancelled")}
          onFontSelected={(chosenFont, chosenShapes) =>
            setLastEvent(
              `chose ${chosenFont} with ${JSON.stringify(chosenShapes)}`
            )
          }
        />

        {(!apiKey || catalogError) && (
          <Typography
            variant="body2"
            css={css`
              margin-top: 12px;
              color: ${theme.palette.text.secondary};
            `}
          >
            {apiKey
              ? `Could not load the Google Fonts catalog: ${catalogError}`
              : "No Google Fonts key — showing installed fonts only. Add ?googleFontsApiKey=… or VITE_GOOGLE_FONTS_API_KEY in .env.local."}
          </Typography>
        )}

        <Typography
          variant="body2"
          css={css`
            margin-top: 12px;
            min-height: 1.5em;
            color: ${theme.palette.text.secondary};
          `}
        >
          {lastEvent ?? "No events yet."}
        </Typography>
      </div>
    </ThemeProvider>
  );
};
