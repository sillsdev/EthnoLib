/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import {
  Button,
  createTheme,
  CssBaseline,
  Paper,
  ThemeProvider,
  Typography,
} from "@mui/material";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FormControlLabel, Switch } from "@mui/material";
import {
  AlphabetField,
  CharacterVariantChoices,
  type ShapeMemory,
} from "@ethnolib/character-variants-react-mui";
import {
  loadLocalFontDataByFamilyWithName,
  normalizeFontName,
} from "@ethnolib/font-core";
import { FontChooserScreen } from "../FontChooserScreen";
import type { FontInfo } from "../types";
import { LanguageChooserDemoDialog } from "./LanguageChooserDemoDialog";
import { useSuggestedFonts } from "./useSuggestedFonts";

/**
 * Where the demo starts before anyone has chosen anything: a language with an
 * alphabet the SLDR knows and letters most fonts don't have, so the first thing
 * on screen is the interesting case rather than an empty field.
 */
const OPENING_LANGUAGE = {
  tag: "fuv",
  name: "Fulfulde",
  script: "Latn",
};

const ALPHABET_KEY = "fontChooserDemo.alphabet";
const LANGUAGE_TAG_KEY = "fontChooserDemo.languageTag";

/**
 * How small the pretend dialog can be dragged. Not a claim about the smallest
 * size the chooser should work at — the point of the grip is to find that out —
 * only a floor low enough to be past it and high enough that the grip itself
 * doesn't disappear under the pointer.
 */
const MIN_CARD = { width: 320, height: 240 };

/**
 * Remembers a string in local storage, so the demo opens where you left off.
 *
 * An empty remembered value counts as nothing remembered: a field the user
 * cleared is not a choice worth reopening on, and the initial value is where the
 * demo is worth starting.
 */
function useRememberedString(
  key: string,
  initial = ""
): [string, (value: string) => void] {
  const [value, setValue] = useState(
    () => localStorage.getItem(key) || initial
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

/** Remembers a switch in local storage. An absent key is the initial state. */
function useRememberedBoolean(
  key: string,
  initial = false
): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key);
    return stored === null ? initial : stored === "1";
  });
  const remember = useCallback(
    (next: boolean) => {
      setValue(next);
      localStorage.setItem(key, next ? "1" : "0");
    },
    [key]
  );
  return [value, remember];
}

/**
 * The durable shape facts for one language, kept the way a host app would keep
 * them: per language, since "Ŋ: capital form" is a fact about writing Mazatec,
 * not about whichever font it was decided on.
 */
function useShapeMemory(
  languageTag: string
): [ShapeMemory, (memory: ShapeMemory) => void] {
  const key = `fontChooserDemo.shapeMemory.${languageTag}`;
  const [memory, setMemory] = useState<ShapeMemory>(() => readShapeMemory(key));
  // A language change swaps in that language's own remembered shapes.
  useEffect(() => {
    setMemory(readShapeMemory(key));
  }, [key]);
  const remember = useCallback(
    (next: ShapeMemory) => {
      setMemory(next);
      localStorage.setItem(key, JSON.stringify(next));
    },
    [key]
  );
  return [memory, remember];
}

function readShapeMemory(key: string): ShapeMemory {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as ShapeMemory;
  } catch {
    // A hand-edited local storage value shouldn't take the demo down with it.
    return [];
  }
}

// Bloom's colors, so the screen is seen in something close to where it will live.
const theme = createTheme({
  palette: {
    primary: { main: "#1d94a4", dark: "#19818f" },
    secondary: { main: "#96668f" },
    error: { main: "#d65649" },
    warning: { main: "#f3aa18" },
    background: { default: "#ffffff" },
  },
  typography: { fontFamily: "Roboto, sans-serif" },
  shape: { borderRadius: 4 },
});

/**
 * The demo harness. It stands in for the host app, which owns the language, the
 * alphabet, the chosen font and the letter shapes picked for it.
 *
 * The page is laid out to show that division: the language and the alphabet sit
 * on the host's own grey chrome, and the chooser below them is drawn as the
 * dialog box a host app would pop up. The suggestions come from services that
 * need no API key, so there is nothing to set up.
 */
export const FontChooserScreenDemo: React.FunctionComponent = () => {
  const [alphabet, setAlphabet] = useRememberedString(ALPHABET_KEY);
  const [languageTag, setLanguageTag] = useRememberedString(
    LANGUAGE_TAG_KEY,
    OPENING_LANGUAGE.tag
  );
  const [languageName, setLanguageName] = useRememberedString(
    "fontChooserDemo.languageName",
    OPENING_LANGUAGE.name
  );
  const [languageScript, setLanguageScript] = useRememberedString(
    "fontChooserDemo.languageScript",
    OPENING_LANGUAGE.script
  );
  const [choosingLanguage, setChoosingLanguage] = useState(false);
  const [font, setFont] = useRememberedString("fontChooserDemo.font");
  // The user's own version of the sample paragraph, kept the way a host app would
  // keep it: it is their text, so it outlives the font they were looking at and
  // the session they typed it in.
  const [customSample, setCustomSample] = useRememberedString(
    "fontChooserDemo.sampleText"
  );
  const [choicesJson, setChoicesJson] = useRememberedString(
    "fontChooserDemo.choices",
    "{}"
  );
  const [lastEvent, setLastEvent] = useState<string | undefined>();
  // The size of the pretend dialog, which the grip in its corner drags. Starts at
  // the chooser's own dimensions so the demo opens on what a host gets by default.
  const [cardSize, setCardSize] = useState({ width: 840, height: 540 });
  const onCardResize = useCallback(
    (width: number, height: number) =>
      setCardSize({
        width: Math.max(MIN_CARD.width, width),
        height: Math.max(MIN_CARD.height, height),
      }),
    []
  );
  // Off by default: this demo doubles as the reference host, and a real user
  // gets the plain UI. Remembered so a debugging session survives reloads.
  const [debug, setDebug] = useRememberedBoolean("fontChooserDemo.debug");
  // The durable facts the chooser reports, per language. This — not the raw
  // tag choices below — is what carries a pick from one font to another.
  const [shapeMemory, setShapeMemory] = useShapeMemory(languageTag);

  const {
    fonts,
    loading,
    sldrAlphabet,
    sldrChecked,
    fontFeatureDefaults,
    warning,
  } = useSuggestedFonts({
    alphabet,
    languageTag,
  });

  const { downloaded, downloadFont, getFontData } = useSessionFontDownloads({
    onEvent: setLastEvent,
  });

  // A font this session has fetched is, as far as anything drawing text is
  // concerned, installed: the browser has the face and will render with it. Saying
  // so is what fills the details pane in — the example, the letter shapes, and the
  // list row in its own face — without a reload.
  //
  // And a font the SLDR names for the language is a recommendation from
  // somebody who knows it — the same claim the Language Font Finder makes for
  // its fonts — so it gets the same `supportsLanguage` mark.
  const offeredFonts = useMemo(() => {
    const sldrNames = new Set(
      (fontFeatureDefaults ?? []).map((d) => normalizeFontName(d.fontName))
    );
    return fonts?.map((font) => ({
      ...font,
      ...(downloaded.has(font.family.toLowerCase())
        ? { installed: true }
        : undefined),
      ...(sldrNames.has(normalizeFontName(font.family))
        ? { supportsLanguage: true }
        : undefined),
    }));
  }, [fonts, downloaded, fontFeatureDefaults]);

  // The tag whose SLDR answer, when it arrives, is still wanted in the field.
  // Only a freshly chosen language gets to overwrite what is there, so that edits
  // the user makes afterwards survive — and a first visit, which has a language
  // and no alphabet and so should look exactly as though the language had just
  // been chosen. `null` is "not worked out yet"; `useRef` takes no initializer
  // function, and reading local storage on every render for an answer that can't
  // change is not worth it.
  const wantsPrefillFor = useRef<string | undefined | null>(null);
  if (wantsPrefillFor.current === null) {
    wantsPrefillFor.current = localStorage.getItem(ALPHABET_KEY)
      ? undefined
      : languageTag;
  }
  useEffect(() => {
    if (!sldrChecked || wantsPrefillFor.current !== languageTag) return;
    wantsPrefillFor.current = undefined;
    if (sldrAlphabet) setAlphabet(sldrAlphabet);
  }, [sldrChecked, sldrAlphabet, languageTag, setAlphabet]);

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
          min-height: 100vh;
          box-sizing: border-box;
          background-color: ${theme.palette.grey[100]};
          padding: 24px;
          font-family: ${theme.typography.fontFamily};
        `}
      >
        <div
          // Wide enough for the chooser's 840px card and little more, so the
          // host's own controls line up with the dialog rather than floating
          // off to one side of it.
          css={css`
            max-width: 880px;
            margin: 0 auto;
          `}
        >
          <Typography
            variant="caption"
            css={css`
              display: block;
              margin-bottom: 16px;
              color: ${theme.palette.text.secondary};
            `}
          >
            Host app supplies the language and alphabet; the dialog below is the
            @ethnolib/font-chooser-react-mui component.
          </Typography>

          <div
            css={css`
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 12px;
            `}
          >
            <Typography variant="body1">
              {languageName || "No language chosen"}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setChoosingLanguage(true)}
            >
              Choose…
            </Button>
            <FormControlLabel
              css={css`
                margin-left: auto;
                .MuiFormControlLabel-label {
                  font-size: 12px;
                  color: ${theme.palette.text.secondary};
                }
              `}
              control={
                <Switch
                  size="small"
                  checked={debug}
                  onChange={(_, next) => setDebug(next)}
                />
              }
              label="Debug info"
            />
          </div>

          <AlphabetField
            value={alphabet}
            onChange={setAlphabet}
            fontFamily={font || undefined}
          />
          <Typography
            variant="caption"
            css={css`
              display: block;
              margin-bottom: 24px;
              min-height: 1.4em;
              color: ${theme.palette.text.secondary};
            `}
          >
            {alphabetCaption()}
          </Typography>

          {warning && (
            <Typography
              variant="body2"
              css={css`
                margin-bottom: 16px;
                color: ${theme.palette.warning.dark};
              `}
            >
              {warning}
            </Typography>
          )}

          {/* The chooser draws its own white card; lifting it onto an elevated,
              rounded surface and dropping that inner card's edge is what makes
              one dialog box out of the two rather than a card inside a card.

              The card is a stand-in for whatever dialog a host app puts the
              chooser in, and those come in sizes we don't get to pick, so this
              one is draggable from its bottom-right corner. The chooser's own
              fixed 840×540 is overridden to fill whatever the corner is dragged
              to, which is the point: what we want to see is how the panes
              behave at other sizes, not the card sliding about inside a bigger
              box. */}
          <Paper
            elevation={8}
            css={css`
              position: relative;
              display: flex;
              flex-direction: column;
              width: ${cardSize.width}px;
              height: ${cardSize.height}px;
              max-width: 100%;
              margin: 0 auto;
              border-radius: 8px;
              overflow: hidden;
              & > .MuiPaper-root {
                flex: 1;
                min-height: 0;
                box-shadow: none;
                border-radius: 0;
                width: 100%;
                height: auto;
                max-height: none;
              }
            `}
          >
            {/* A host app's dialog says what its dialog is for, and the chooser
                deliberately doesn't repeat that inside itself, so the demo has
                to supply one or the card reads as a pane with no head on it. */}
            <div
              css={css`
                flex: none;
                padding: 10px 20px;
                background-color: ${theme.palette.primary.main};
                color: ${theme.palette.primary.contrastText};
              `}
            >
              <Typography
                variant="h2"
                css={css`
                  font-size: 16px;
                  font-weight: 500;
                  color: inherit;
                `}
              >
                {/* Named, because choosing a font is a decision about one
                    language's writing, and a host app knows which. Until a
                    language is picked there is no name to say, and the title
                    drops the tail rather than showing a gap. */}
                {languageName
                  ? `Font Chooser for ${languageName}`
                  : "Font Chooser"}
              </Typography>
            </div>

            <FontChooserScreen
              alphabet={alphabet}
              fonts={offeredFonts}
              getFontData={getFontData}
              languageTag={languageTag}
              languageName={languageName || undefined}
              languageScript={languageScript || undefined}
              customSampleText={customSample || undefined}
              onCustomSampleTextChange={(text) => setCustomSample(text ?? "")}
              loading={loading}
              selectedFont={font}
              onSelectedFontChange={setFont}
              choices={choices}
              onChoicesChange={(next) => setChoicesJson(JSON.stringify(next))}
              shapeMemory={shapeMemory}
              onShapeMemoryChange={setShapeMemory}
              fontFeatureDefaults={fontFeatureDefaults}
              debug={debug}
              onDownloadFont={(chosen) => void downloadFont(chosen)}
              onCancel={() => setLastEvent("cancelled")}
              onFontSelected={(chosenFont, chosenShapes) =>
                setLastEvent(
                  `chose ${chosenFont} with ${JSON.stringify(chosenShapes)}`
                )
              }
            />
            <ResizeGrip onResize={onCardResize} />
          </Paper>

          {/* The running commentary is for whoever is working on the component,
              not for anyone looking at it: "downloaded X (this session only)"
              under the card describes the harness, and reads as something the
              chooser is telling the user. So it goes with the rest of the debug
              output, and the page below the card stays empty. */}
          {debug && lastEvent && (
            <Typography
              variant="body2"
              css={css`
                margin-top: 12px;
                color: ${theme.palette.text.secondary};
              `}
            >
              {lastEvent}
            </Typography>
          )}

          {choosingLanguage && (
            <LanguageChooserDemoDialog
              open={choosingLanguage}
              initialLanguageTag={languageTag || undefined}
              onSelected={(tag, name, scriptCode) => {
                setLanguageTag(tag);
                setLanguageName(name);
                setLanguageScript(scriptCode ?? "");
                // Clear the field so the previous language's letters don't stay
                // and so there is somewhere for the SLDR's answer to land.
                setAlphabet("");
                wantsPrefillFor.current = tag;
                setChoosingLanguage(false);
              }}
              onCancel={() => setChoosingLanguage(false)}
            />
          )}
        </div>
      </div>
    </ThemeProvider>
  );

  function alphabetCaption(): string {
    if (!languageTag) return "Choose a language to look up its alphabet.";
    if (!sldrChecked) return `Looking up the alphabet for ${languageTag}…`;
    if (sldrAlphabet) return "Alphabet from SLDR — edit to adjust";
    return `No alphabet data for ${languageTag} — type one`;
  }
};

/**
 * A grip in the bottom-right corner of the pretend dialog, for dragging it to
 * whatever size you want to see the chooser at.
 *
 * Not the CSS `resize` property, which draws its grip under the element's own
 * children: the chooser fills the card edge to edge and opaquely, so the native
 * one would be both invisible and unclickable. This one sits above it.
 *
 * The width and height go to the caller rather than being applied here, since it
 * is the caller's card being resized; the pointer is captured so a fast drag that
 * outruns the grip keeps resizing rather than stopping wherever the pointer left.
 */
const ResizeGrip: React.FunctionComponent<{
  onResize: (width: number, height: number) => void;
}> = ({ onResize }) => {
  // The card's own corner at the moment the drag started, so every move is
  // measured against that rather than accumulating rounding as it goes.
  const from = useRef<{ x: number; y: number } | undefined>(undefined);
  return (
    <div
      role="separator"
      aria-label="Resize"
      title="Drag to resize"
      onPointerDown={(e) => {
        const card = e.currentTarget.parentElement?.getBoundingClientRect();
        if (!card) return;
        from.current = { x: card.left, y: card.top };
        e.currentTarget.setPointerCapture(e.pointerId);
        e.preventDefault();
      }}
      onPointerMove={(e) => {
        if (!from.current) return;
        onResize(e.clientX - from.current.x, e.clientY - from.current.y);
      }}
      onPointerUp={() => {
        from.current = undefined;
      }}
      css={css`
        position: absolute;
        right: 0;
        bottom: 0;
        width: 18px;
        height: 18px;
        cursor: nwse-resize;
        touch-action: none;
        /* Two short rules across the corner, the shorthand everything from a
           window corner to a text area uses for "drag me". */
        background-image: linear-gradient(
          -45deg,
          transparent 0 3px,
          ${theme.palette.text.secondary} 3px 4px,
          transparent 4px 7px,
          ${theme.palette.text.secondary} 7px 8px,
          transparent 8px
        );
        opacity: 0.5;
        &:hover {
          opacity: 1;
        }
      `}
    />
  );
};

/**
 * The demo's answer to "download this font", and what the chooser is told
 * afterwards.
 *
 * The chooser never touches storage itself — where a font goes and whether it
 * survives the session are the host app's business, and a browser page has no say
 * in what is installed on the machine anyway. What a page *can* do is fetch the
 * file and hand it to the browser as a `FontFace`, which makes the family real for
 * everything on this page until it is reloaded. Nothing is installed; the user's
 * machine is untouched.
 *
 * The bytes are kept as well as registered, because the chooser reads fonts rather
 * than only drawing with them: coverage, letter shapes and the digit forms all come
 * out of the file, and the Local Font Access API — where it answers at all — knows
 * nothing about a face that only exists in this page's memory.
 */
function useSessionFontDownloads({
  onEvent,
}: {
  onEvent: (line: string) => void;
}) {
  const [downloaded, setDownloaded] = useState<ReadonlySet<string>>(new Set());
  // Keyed by family, folded, since that is how the chooser matches families.
  const bytes = useRef(new Map<string, ArrayBuffer>());
  const started = useRef(new Set<string>());

  const downloadFont = useCallback(
    async (font: FontInfo) => {
      const key = font.family.toLowerCase();
      // Asking twice is asking once: the second click lands while the first fetch
      // is still in the air, and `started` is what remembers that.
      if (started.current.has(key)) return;
      if (!font.fileUrl) {
        onEvent(`no download url for ${font.family}`);
        return;
      }
      started.current.add(key);
      onEvent(`downloading ${font.family}…`);
      try {
        const response = await fetch(font.fileUrl);
        if (!response.ok) {
          throw new Error(`${response.status} ${response.statusText}`.trim());
        }
        const file = await response.arrayBuffer();
        const face = new FontFace(font.family, file);
        await face.load();
        document.fonts.add(face);
        bytes.current.set(key, file);
        setDownloaded((previous) => new Set(previous).add(key));
        onEvent(`downloaded ${font.family} (this session only)`);
      } catch (error) {
        started.current.delete(key);
        const said = error instanceof Error ? error.message : String(error);
        onEvent(`could not download ${font.family}: ${said}`);
      }
    },
    [onEvent]
  );

  const getFontData = useCallback(async (family: string) => {
    const file = bytes.current.get(family.toLowerCase());
    if (file) return file;
    return loadLocalFontDataByFamilyWithName(family);
  }, []);

  return { downloaded, downloadFont, getFontData };
}
