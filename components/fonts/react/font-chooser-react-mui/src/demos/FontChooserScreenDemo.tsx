/** @jsxImportSource @emotion/react */
import { css, keyframes } from "@emotion/react";
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
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  FormControlLabel,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { SourceInfo } from "../SourceInfo";
import {
  AlphabetField,
  CharacterVariantChoices,
  type ShapeMemory,
} from "@ethnolib/character-variants-react-mui";
import {
  createGoogleFontsFullFontUrlResolver,
  normalizeFontName,
  type FontInfo,
} from "@ethnolib/font-core";
import { createBundledSampleTextProvider } from "@ethnolib/font-core/bundled";
import { FontChooserScreen } from "../FontChooserScreen";
import type { NetworkAvailability } from "../types";
import { LanguageChooserDemoDialog } from "./LanguageChooserDemoDialog";
import {
  useSuggestedFonts,
  type SuggestionTimings,
} from "./useSuggestedFonts";
import {
  installNetworkSimulation,
  onInterference,
  setSimulatedNetwork,
  METERED_DELAY_MS,
  type InterferenceEvent,
} from "./networkSimulation";
import { WifiOffIcon } from "../icons";
import {
  forgetKeptFonts,
  hostFontAccess,
  installHostFontAccess,
  keepFont,
  listKeptFonts,
  type KeptFont,
} from "./hostFontLibrary";

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

/**
 * The simulated network state, remembered. Kept as its own hook because the
 * value is a union rather than a flag, and because it has to read the boolean
 * this replaced: a developer with "metered" switched on from an earlier session
 * should find it still on, not silently back to a full connection.
 */
function useRememberedNetwork(): [
  NetworkAvailability,
  (value: NetworkAvailability) => void,
] {
  const [stored, remember] = useRememberedString(
    "fontChooserDemo.network",
    localStorage.getItem("fontChooserDemo.metered") === "1" ? "metered" : "open"
  );
  const value: NetworkAvailability =
    stored === "metered" || stored === "offline" ? stored : "open";
  return [value, remember];
}

/** What the simulation has done to the page's traffic, for the indicator. */
interface InterferenceTally {
  blocked: number;
  delayed: number;
  /** The most recent one, whose URL the indicator shows on hover. */
  last?: InterferenceEvent;
}

/**
 * Runs the simulated connection, and counts what it gets in the way of.
 *
 * The counting is the point of doing it here rather than in an effect of its
 * own: a simulation that silently eats requests turns every one of its own
 * effects into a suspected bug in the chooser, so the harness has to be able to
 * say "that failure was me". Each event also goes to the log, which has room
 * for the URL.
 *
 * The tally is per state: switching the connection starts it again, because
 * "12 blocked" left over from an earlier stretch of being offline says nothing
 * about what the page is doing now.
 */
function useNetworkSimulation(
  network: NetworkAvailability,
  logLine: (message: string, detail?: unknown) => void
): InterferenceTally {
  const [tally, setTally] = useState<InterferenceTally>({
    blocked: 0,
    delayed: 0,
  });

  useEffect(() => installNetworkSimulation(), []);

  useEffect(() => {
    setSimulatedNetwork(network);
    setTally({ blocked: 0, delayed: 0 });
  }, [network]);

  useEffect(
    () =>
      onInterference((event) => {
        setTally((previous) => ({
          blocked: previous.blocked + (event.kind === "blocked" ? 1 : 0),
          delayed: previous.delayed + (event.kind === "delayed" ? 1 : 0),
          last: event,
        }));
        logLine(
          `simulated connection ${event.kind} a request (${event.via})`,
          event.ms === undefined
            ? { url: event.url }
            : { url: event.url, heldMs: event.ms }
        );
      }),
    [logLine]
  );

  return tally;
}

/** A quick pulse, so a request caught while you are looking catches the eye. */
const interferencePulse = keyframes`
  from { background-color: rgba(237, 108, 2, 0.35); }
  to { background-color: transparent; }
`;

/**
 * What the simulated connection has done to this page's traffic — nothing until
 * it has done something, and then a count that goes up as it happens.
 */
const InterferenceIndicator: React.FunctionComponent<{
  tally: InterferenceTally;
}> = ({ tally }) => {
  const total = tally.blocked + tally.delayed;
  if (total === 0) return null;
  const parts = [
    tally.blocked > 0 ? `${tally.blocked} blocked` : undefined,
    tally.delayed > 0
      ? `${tally.delayed} held ${(METERED_DELAY_MS / 1000).toFixed(1)}s`
      : undefined,
  ].filter(Boolean);
  return (
    <Typography
      variant="caption"
      // Re-mounting on every event is what re-runs the pulse.
      key={total}
      title={tally.last ? `Last: ${tally.last.url}` : undefined}
      css={css`
        padding: 1px 6px;
        border-radius: 3px;
        white-space: nowrap;
        color: ${theme.palette.warning.dark};
        animation: ${interferencePulse} 700ms ease-out;
      `}
    >
      {parts.join(" · ")}
    </Typography>
  );
};

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

/** How many past choices are worth feeding back; older ones fall off the end. */
const RECENT_FONTS_KEPT = 8;

/**
 * The fonts the user has settled on before, kept the way a host app would keep
 * them: per language (a font chosen for Thai says nothing about Fulfulde),
 * newest first, each with the catalog entry it was chosen from so a
 * not-installed one can still be offered — and fetched — next visit. This is
 * what the chooser's `recentFonts` prop wants fed back: choosing is the one
 * act that promotes a font out of the wider-search section, so only
 * `remember` (called from `onFontSelected`) ever writes here.
 */
function useRecentFonts(
  languageTag: string
): [FontInfo[], (font: FontInfo) => void] {
  const key = `fontChooserDemo.recentFonts.${languageTag}`;
  const [recent, setRecent] = useState<FontInfo[]>([]);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(key) ?? "[]");
      setRecent(Array.isArray(stored) ? stored : []);
    } catch {
      setRecent([]);
    }
  }, [key]);
  const remember = useCallback(
    (font: FontInfo) => {
      setRecent((previous) => {
        const kept = [
          // Without `installed`: it was true when the font was chosen because
          // the bytes were in hand, and saying so again next visit would claim
          // a font is ready when the app may no longer have the file. Whether
          // it is here is decided each time by what the app's font folder and
          // the machine actually hold; this entry is only the catalog facts.
          { ...font, installed: undefined, location: undefined },
          ...previous.filter(
            (entry) => entry.family.toLowerCase() !== font.family.toLowerCase()
          ),
        ].slice(0, RECENT_FONTS_KEPT);
        localStorage.setItem(key, JSON.stringify(kept));
        return kept;
      });
    },
    [key]
  );
  return [recent, remember];
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

/** The harness's own switches: present, and quieter than anything in the dialog. */
const switchLabelCss = css`
  .MuiFormControlLabel-label {
    font-size: 12px;
    color: ${theme.palette.text.secondary};
  }
`;

/**
 * The demo harness. It stands in for the host app, which owns the language, the
 * alphabet, the chosen font and the letter shapes picked for it.
 *
 * The page is laid out to show that division: the language and the alphabet sit
 * on the host's own grey chrome, and the chooser below them is drawn as the
 * dialog box a host app would pop up. The suggestions are read out of the data
 * bundled into @ethnolib/font-core, so there is nothing to set up and nothing to
 * wait for.
 */
export const FontChooserScreenDemo: React.FunctionComponent = () => {
  // Where the whole font lives, for a font whose preview file was a subset:
  // the google/fonts repository, keyless like everything else here.
  const resolveFullFontUrl = useMemo(
    () => createGoogleFontsFullFontUrlResolver(),
    []
  );
  // Where the sample passage comes from. Left to itself the chooser fetches
  // Google Fonts' language data, which is no answer at all to a machine that has
  // never been online — and a request whose answer changes about as often as our
  // releases do. So the host supplies the passages bundled into
  // @ethnolib/font-core instead. The script reaches the provider through a ref,
  // since it is made once and the language changes under it; that is what the
  // chooser's own default did with `languageScript`.
  const scriptRef = useRef<string>();
  const sampleTextProvider = useMemo(
    () => createBundledSampleTextProvider({ scriptFor: () => scriptRef.current }),
    []
  );
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
  scriptRef.current = languageScript || undefined;
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
  const [log, logLine] = useEventLog();
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
  // Standing in for a phone on a metered connection, or for one with no signal
  // at all — the two cases the chooser's held-back download and its offline mode
  // exist for, and the two hardest to get at from a desk. Remembered, since
  // seeing what either does takes a reload.
  //
  // The setting does more than tell the chooser what to believe: it also blocks
  // or holds the page's real requests, and shadows `navigator.onLine`, so the
  // failure paths get exercised rather than merely described. See
  // networkSimulation.ts.
  const [network, setNetwork] = useRememberedNetwork();
  // Whether the host asks Fontsource for everything that covers the alphabet,
  // or offers only the curated list plus the machine's own fonts. Remembered,
  // since comparing the two takes a reload each way.
  const [broadSearch, setBroadSearch] = useRememberedBoolean(
    "fontChooserDemo.broadSearch",
    true
  );
  // Whether the pretend host app ships font files of its own. See
  // hostBundledFonts.ts for what the toggle actually does; the short of it is
  // that the chooser is told about two families the demo serves from its own
  // origin, which the connection simulator leaves alone, so they behave like
  // fonts on a machine's disk rather than fonts on the internet. Remembered,
  // like the other harness switches.
  const [hostBundledFonts, setHostBundledFonts] = useRememberedBoolean(
    "fontChooserDemo.hostBundledFonts",
    false
  );
  // The fonts this pretend app has been handed and has written down, read once
  // at startup the way a host app reads its own font folder. A font kept here is
  // one the demo can offer with the network switched off — which is the whole
  // reason `onFontSelected` hands over the bytes.
  const [keptFonts, setKeptFonts] = useState<KeptFont[]>([]);
  const rereadKeptFonts = useCallback(
    () => listKeptFonts().then(setKeptFonts),
    []
  );
  useEffect(() => {
    void rereadKeptFonts();
  }, [rereadKeptFonts]);
  useEffect(
    () => installHostFontAccess(hostBundledFonts, keptFonts),
    [hostBundledFonts, keptFonts]
  );
  const fontAccess = useMemo(
    () => hostFontAccess(hostBundledFonts, keptFonts),
    [hostBundledFonts, keptFonts]
  );
  // The connection setting, made real: requests are blocked offline and held on
  // a metered connection, so what the page does when a fetch fails is something
  // the harness can actually show.
  const interference = useNetworkSimulation(network, logLine);
  // The durable facts the chooser reports, per language. This — not the raw
  // tag choices below — is what carries a pick from one font to another.
  const [shapeMemory, setShapeMemory] = useShapeMemory(languageTag);
  // What the user has chosen before, fed back so those fonts sit in the main
  // list rather than needing the wider search to be run again to find them.
  const [recentFonts, rememberRecentFont] = useRecentFonts(languageTag);

  const {
    fonts,
    moreFonts,
    loading,
    sldrAlphabet,
    sldrChecked,
    fontFeatureDefaults,
    warning,
    timings,
    searchBroadly,
    broadSearchState,
  } = useSuggestedFonts({
    alphabet,
    languageTag,
    // What the bundled data needs to make sense of a tag with no script in it:
    // `th` is Thai only if somebody says so.
    languageScript: languageScript || undefined,
    // Offered offline as well, so that the chooser gets the invitation and can
    // show it disabled with its reason on it. Nothing runs until the button is
    // clicked, and offline it can't be, so an offer the network couldn't
    // currently answer costs nothing.
    broadSearch,
    offline: network === "offline",
  });

  // With nothing typed, an SLDR answer may be about to fill the field; until it
  // has said its piece, neither the chooser nor the field can tell "no alphabet"
  // from "alphabet on its way".
  const alphabetPending = !!languageTag && !sldrChecked && !alphabet.trim();

  // A font the SLDR names for the language is a recommendation from somebody who
  // knows it — the same claim the Language Font Finder makes for its fonts — so
  // it gets the same `supportsLanguage` mark. A font already marked by its own
  // suggester keeps that suggester's word for where the claim came from.
  const offeredFonts = useMemo(() => {
    const sldrNames = new Set(
      (fontFeatureDefaults ?? []).map((d) => normalizeFontName(d.fontName))
    );
    return fonts?.map((font) =>
      !font.supportsLanguage && sldrNames.has(normalizeFontName(font.family))
        ? {
            ...font,
            supportsLanguage: true,
            supportsLanguageSource: {
              name: "the SIL Locale Data Repository (SLDR)",
              url: sldrPageUrl(languageTag),
            },
          }
        : font
    );
  }, [fonts, fontFeatureDefaults, languageTag]);

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

  // One object per stored value, not per render: the chooser watches `choices`
  // for changes, and a fresh parse every render says "changed" every render.
  const choices = useMemo<CharacterVariantChoices>(() => {
    try {
      return JSON.parse(choicesJson) as CharacterVariantChoices;
    } catch {
      // A hand-edited local storage value shouldn't take the demo down with it.
      return {};
    }
  }, [choicesJson]);

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
          {/* Everything the harness owns lives inside one drawn box, so that
              what is under test is unmistakable: the component is the card
              below this, and nothing in here is part of it. Before, the
              language row and the running commentary floated on the same grey
              as the dialog, and read as chrome the chooser had put there. */}
          <Paper
            variant="outlined"
            css={css`
              padding: 14px 16px 16px;
              margin-bottom: 24px;
              background-color: ${theme.palette.background.default};
            `}
          >
            <Typography
              variant="h2"
              css={css`
                font-size: 13px;
                font-weight: 600;
                letter-spacing: 0.06em;
                text-transform: uppercase;
                color: ${theme.palette.text.secondary};
              `}
            >
              Component Test Harness
            </Typography>
            <Typography
              variant="caption"
              css={css`
                display: block;
                margin-bottom: 16px;
                color: ${theme.palette.text.secondary};
              `}
            >
              Host app supplies the language and (optionally) the alphabet; the
              dialog below is the @ethnolib/font-chooser-react-mui component.
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
            </div>

            <Typography
              variant="body2"
              css={css`
                margin-bottom: 4px;
              `}
            >
              Alphabet
              {/* Where the letters were filled in for the user, the quiet "i"
                  answers, on hover or by a visit, where they came from. */}
              {sldrAlphabet && (
                <>
                  {" "}
                  <SourceInfo
                    tooltip={`This alphabet comes from the SIL Locale Data Repository (SLDR) entry for ${languageTag}. Click to see the data.`}
                    ariaLabel="Alphabet source: SIL Locale Data Repository"
                    url={sldrPageUrl(languageTag)}
                    size={13}
                  />
                </>
              )}
            </Typography>
            <AlphabetField
              value={alphabet}
              onChange={setAlphabet}
              fontFamily={font || undefined}
              label={null}
              placeholder={alphabetPending ? "Loading…" : undefined}
            />
            <Typography
              variant="caption"
              css={css`
                display: block;
                margin-bottom: 16px;
                min-height: 1.4em;
                color: ${theme.palette.text.secondary};
              `}
            >
              {!sldrAlphabet && alphabetCaption()}
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

            <div
              css={css`
                display: flex;
                align-items: center;
                gap: 16px;
              `}
            >
              {/* The connection is one setting, so it is one block: the label
                  and its three states on a line, and what the simulation has
                  done to the page's traffic on the line under them. Out beside
                  the other switches that count read as a fact about the harness
                  at large; under the control it reads as what that control is
                  doing, which is what it is. */}
              <div
                css={css`
                  display: flex;
                  flex-direction: column;
                  gap: 2px;
                `}
              >
                <div
                  css={css`
                    display: flex;
                    align-items: center;
                    gap: 6px;
                  `}
                >
                  {/* All three states side by side, "Normal" among them rather
                      than implied by everything else being off: a switch plus a
                      hidden pair made you work out which of two controls to
                      touch. */}
                  <Typography
                    variant="body2"
                    css={css`
                      color: ${theme.palette.text.secondary};
                    `}
                  >
                    Connection:
                  </Typography>
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={network}
                    onChange={(_, next: NetworkAvailability | null) =>
                      next && setNetwork(next)
                    }
                    css={css`
                      .MuiToggleButton-root {
                        padding: 1px 10px;
                        font-size: 11px;
                        text-transform: none;
                      }
                    `}
                  >
                    <ToggleButton value="offline">Offline</ToggleButton>
                    <ToggleButton value="metered">Metered/Mobile</ToggleButton>
                    <ToggleButton value="open">Normal</ToggleButton>
                  </ToggleButtonGroup>
                </div>
                {/* The line is always here, empty or not: appearing, it would
                    grow the block and shift the buttons up out from under the
                    pointer that had just clicked one. */}
                <div
                  css={css`
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    min-height: 17px;
                    line-height: 1.2;
                  `}
                >
                  {network === "offline" && (
                    <WifiOffIcon
                      size={14}
                      color={theme.palette.warning.dark}
                      title="Requests from this page are being blocked"
                    />
                  )}
                  <InterferenceIndicator tally={interference} />
                </div>
              </div>
              <FormControlLabel
                css={switchLabelCss}
                control={
                  <Switch
                    size="small"
                    checked={broadSearch}
                    onChange={(_, next) => setBroadSearch(next)}
                  />
                }
                label="Offer search beyond curated &amp; local fonts"
              />
              <FormControlLabel
                css={switchLabelCss}
                control={
                  <Switch
                    size="small"
                    checked={hostBundledFonts}
                    onChange={(_, next) => setHostBundledFonts(next)}
                  />
                }
                label="Host ships Andika &amp; Noto Sans Thai"
              />
              {/* What the app has kept from earlier visits, and the way back to
                  a host that has kept nothing. Shown only when there is
                  something to say, and worth saying: a font in the list marked
                  as being on disk is otherwise unexplained — nothing on the
                  page says the app was given it and wrote it down. */}
              {keptFonts.length > 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  title={keptFonts.map((font) => font.family).join(", ")}
                  onClick={() => {
                    void forgetKeptFonts()
                      .then(rereadKeptFonts)
                      .then(() => logLine("forgot the app's kept fonts"));
                  }}
                >
                  Forget {keptFonts.length} saved font
                  {keptFonts.length === 1 ? "" : "s"}
                </Button>
              )}
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  // Everything remembered on the component's behalf: the
                  // Fontsource broad search's cache and the licence sweep's
                  // results, filed under one prefix. The reload then drops the
                  // in-memory
                  // layer — session font downloads, measured file sizes, the
                  // providers' own state — so the next question is asked from
                  // nothing. The demo's own settings (language, alphabet, the
                  // switch above) are not caches and survive.
                  for (const key of Object.keys(localStorage)) {
                    if (key.startsWith("ethnolib.")) {
                      localStorage.removeItem(key);
                    }
                  }
                  location.reload();
                }}
              >
                Clear caches &amp; reload
              </Button>
            </div>

            <LoadTimings
              timings={timings}
              broadSearchState={broadSearchState}
              network={network}
            />

            <Accordion
              disableGutters
              elevation={0}
              css={css`
                background-color: transparent;
                &::before {
                  display: none;
                }
              `}
            >
              <AccordionSummary
                expandIcon={<span aria-hidden>▾</span>}
                css={css`
                  min-height: 0;
                  padding: 0;
                  flex-direction: row-reverse;
                  gap: 6px;
                  justify-content: flex-start;
                  & .MuiAccordionSummary-content {
                    flex-grow: 0;
                    margin: 6px 0;
                  }
                `}
              >
                <Typography
                  variant="caption"
                  css={css`
                    color: ${theme.palette.text.secondary};
                  `}
                >
                  Log
                </Typography>
              </AccordionSummary>
              <AccordionDetails
                css={css`
                  padding: 0 0 2px;
                `}
              >
                <EventLog lines={log} />
              </AccordionDetails>
            </Accordion>
          </Paper>

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
              alphabetPending={alphabetPending}
              fonts={offeredFonts}
              recentFonts={recentFonts}
              moreFonts={moreFonts}
              onSearchMoreFonts={
                broadSearchState === "available" || broadSearchState === "searching"
                  ? searchBroadly
                  : undefined
              }
              // The Fontsource catalog plus a small request per candidate;
              // the popularity ranking itself ships inside the package.
              // The catalog, then a metadata request and a font file or two for
              // each of the fifty candidates it checks.
              searchMoreFontsCost="1.5 MB"
              searchingMoreFonts={broadSearchState === "searching"}
              moreFontsExplanation="The list comes from the most popular fonts on Google Fonts, kept only where the font file itself was found to have every letter of this alphabet."
              languageTag={languageTag}
              languageName={languageName || undefined}
              languageScript={languageScript || undefined}
              sampleTextProvider={sampleTextProvider}
              // Both undefined while the app has no files of its own, which
              // leaves the component on the Local Font Access API.
              getLocalFonts={fontAccess.getLocalFonts}
              getFontData={fontAccess.getFontData}
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
              network={network}
              onDiagnostic={logLine}
              getFullFontUrl={(fontInfo, options) =>
                resolveFullFontUrl(fontInfo.family, options)
              }
              onCancel={() => logLine("cancelled")}
              onFontSelected={(chosenFont, chosenShapes, downloadedFile) => {
                // Choosing — not browsing — is what earns a fetched font a
                // place in next visit's main list. An installed font needs no
                // remembering: being installed already seats it there.
                if (downloadedFile) {
                  rememberRecentFont(downloadedFile.info);
                  // What a host app does with the bytes: writes them where it
                  // can find them again, and reads its folder afresh so the
                  // font is one of its own from this moment rather than after
                  // a reload.
                  void keepFont(downloadedFile)
                    .then(rereadKeptFonts)
                    .then(() =>
                      logLine(`kept ${chosenFont} in the app's font folder`)
                    )
                    .catch((error) =>
                      logLine(`could not keep ${chosenFont}`, String(error))
                    );
                }
                logLine(
                  `chose ${chosenFont}`,
                  {
                    choices: chosenShapes,
                    ...(downloadedFile
                      ? { receivedBytes: downloadedFile.data.byteLength }
                      : undefined),
                  }
                );
              }}
            />
            <ResizeGrip onResize={onCardResize} />
          </Paper>

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

  // The found-an-alphabet case says nothing here — the field's own label carries
  // the source behind an info icon; these are the states with nothing to
  // attribute.
  function alphabetCaption(): string {
    if (!languageTag) return "Choose a language to look up its alphabet.";
    if (!sldrChecked) return `Looking up the alphabet for ${languageTag}…`;
    return `No alphabet data for ${languageTag} — type one`;
  }
};

/**
 * The SLDR entry as a page a person can read. The data service itself
 * (ldml.api.sil.org) answers with `content-disposition: attachment`, so a click
 * there saves a file instead of showing anything; GitHub's view of the same XML
 * is a page. SLDR filenames write the tag's hyphens as underscores and shelve it
 * under its first letter: `aa-Arab` lives at `sldr/a/aa_Arab.xml`.
 */
function sldrPageUrl(languageTag: string): string {
  const file = languageTag.replace(/-/g, "_");
  return `https://github.com/silnrsi/sldr/blob/master/sldr/${file[0].toLowerCase()}/${encodeURIComponent(file)}.xml`;
}

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
 * One glanceable line of how the current language's load went: how quickly there
 * was anything to offer, when each source answered, and when the offering was
 * final. Times run from the language being set — a page reload counts, since
 * the remembered language is set as the page opens.
 *
 * Note these are the host's suggestion stages only. The chooser's own work —
 * listing the machine's fonts, reading their coverage — goes on after "final",
 * and shows in the list rather than here.
 */
const LoadTimings: React.FunctionComponent<{
  timings: SuggestionTimings;
  broadSearchState: "off" | "available" | "searching" | "done";
  /** The simulated network state; see the note beside `network` above. */
  network: NetworkAvailability;
}> = ({ timings, broadSearchState, network }) => {
  const stage = (label: string, ms: number | undefined) =>
    `${label} ${ms === undefined ? "…" : `${(ms / 1000).toFixed(2)}s`}`;
  // The broad search waits for a click, so an unasked one isn't "…" — nothing
  // is coming until somebody asks. Its time is from the click, not the load.
  const broad =
    broadSearchState === "off"
      ? "broad search off"
      : broadSearchState === "available"
        ? "broad search not asked"
        : stage("broad search", timings.coveringMs);
  return (
    // Named and boxed, because a bare monospace strip under the controls reads
    // as something the page is telling you about itself right now; the label
    // says it is one kind of fact — how long the load took — and where it ends.
    <fieldset
      css={css`
        margin-top: 12px;
        padding: 2px 10px 8px;
        border: 1px solid ${theme.palette.divider};
        border-radius: 4px;
      `}
    >
      <legend
        css={css`
          padding: 0 4px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: ${theme.palette.text.secondary};
        `}
      >
        Timing
      </legend>
      <Typography
        variant="caption"
        css={css`
          display: block;
          font-family: Consolas, "Courier New", monospace;
          color: ${theme.palette.text.secondary};
        `}
      >
        {[
          stage("first offering", timings.firstFontsMs),
          stage("curated", timings.curatedMs),
          stage("alphabet", timings.sldrMs),
          broad,
          stage("final offering", timings.settledMs),
          // A limited connection changes what the chooser will spend without
          // being asked, and the first visible effect is an absence: the names
          // stop being drawn in their own fonts. Left to the toggle alone that
          // has read as a bug more than once, so the state it puts the page in
          // is said here among the other facts about this load.
          ...(network === "metered" ? ["metered: names stay plain"] : []),
          ...(network === "offline"
            ? ["offline: names stay plain, nothing is fetched"]
            : []),
        ].join(" · ")}
      </Typography>
    </fieldset>
  );
};

/** How many lines of commentary the box keeps before dropping the oldest. */
const LOG_LINES_KEPT = 50;

/**
 * One line of what the chooser has said, as the harness stores it.
 *
 * The detail arrives as whatever the component chose to pass — shape choices,
 * an SLDR entry, a byte count — so it is rendered as JSON rather than
 * interpreted. Keeping it apart from the message is what lets the message stay
 * readable at a glance with the bulk after it.
 */
interface LogLine {
  at: string;
  message: string;
  detail?: string;
}

/**
 * The harness's running commentary, and the one way anything gets into it.
 *
 * A host app would not keep this; it stands in for wherever a real one sends
 * `onDiagnostic` — a console, a log file, a support bundle. Bounded, because a
 * page left open while somebody clicks down a font list would otherwise grow
 * without end.
 */
function useEventLog(): [
  LogLine[],
  (message: string, detail?: unknown) => void,
] {
  const [lines, setLines] = useState<LogLine[]>([]);
  const add = useCallback((message: string, detail?: unknown) => {
    const line: LogLine = {
      at: new Date().toLocaleTimeString(),
      message,
      detail: detail === undefined ? undefined : safeJson(detail),
    };
    setLines((previous) => [...previous, line].slice(-LOG_LINES_KEPT));
  }, []);
  return [lines, add];
}

/**
 * How much of one detail object the box will show.
 *
 * The effective shape set for a font with twenty rows runs to thousands of
 * characters, and printed whole it filled the box on its own and pushed every
 * other line out of sight — the log then said less than the single line it
 * replaced. The callback still hands a host the entire object; this is only what
 * the harness draws, and the rest is a hover away.
 */
const DETAIL_SHOWN = 220;

function safeJson(detail: unknown): string {
  try {
    return JSON.stringify(detail) ?? String(detail);
  } catch {
    // Something circular, or a value JSON has no word for. The harness saying so
    // is better than the harness falling over.
    return String(detail);
  }
}

/**
 * The commentary itself: monospace, scrolled, kept behind the "Log" expander.
 *
 * It used to be one line, shown only with a switch on, which meant the
 * interesting thing was usually the thing that had just been overwritten. It
 * holds its height whether or not there is anything in it, so the card below
 * doesn't jump every time the chooser says something.
 */
const EventLog: React.FunctionComponent<{ lines: LogLine[] }> = ({ lines }) => {
  const box = useRef<HTMLDivElement>(null);
  // Newest at the bottom, in reading order, which means following it takes a
  // scroll unless we do it for them.
  useEffect(() => {
    const element = box.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [lines]);

  return (
    <div
      ref={box}
      css={css`
        /* Fixed, not a maximum: a box that grows line by line walks the rest of
           the page downward while the user is trying to read it. */
        height: 160px;
        overflow-y: auto;
        padding: 8px 10px;
        border: 1px solid ${theme.palette.divider};
        border-radius: ${theme.shape.borderRadius}px;
        background-color: ${theme.palette.grey[50]};
        font-family: Consolas, "Courier New", monospace;
        font-size: 11.5px;
        line-height: 1.5;
        color: ${theme.palette.text.secondary};
      `}
    >
      {lines.length === 0 ? (
        <span
          css={css`
            opacity: 0.7;
          `}
        >
          Diagnostics from the component appear here.
        </span>
      ) : (
        lines.map((line, index) => (
          <div
            key={`${line.at}-${index}`}
            css={css`
              white-space: pre-wrap;
              word-break: break-word;
            `}
          >
            <span
              css={css`
                opacity: 0.6;
              `}
            >
              {line.at}{" "}
            </span>
            <span
              css={css`
                color: ${theme.palette.text.primary};
              `}
            >
              {line.message}
            </span>
            {line.detail && (
              <span title={line.detail}>
                {" "}
                {line.detail.length > DETAIL_SHOWN
                  ? `${line.detail.slice(0, DETAIL_SHOWN)}… (${
                      line.detail.length
                    } chars)`
                  : line.detail}
              </span>
            )}
          </div>
        ))
      )}
    </div>
  );
};
