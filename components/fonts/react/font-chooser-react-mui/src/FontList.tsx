/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import {
  alpha,
  Button,
  ButtonBase,
  CircularProgress,
  ClickAwayListener,
  Collapse,
  Tooltip,
  useTheme,
} from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import type { FontInfo } from "./types";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  ChevronIcon,
  DownloadNeededIcon,
  InfoCircleIcon,
  InstalledFontIcon,
  NetworkFontIcon,
  OnDiskFontIcon,
  UnknownRulesIcon,
  WifiOffIcon,
} from "./icons";
import { scrollbarCss } from "./scrollbarStyle";
import type { NetworkAvailability } from "./constrainedNetwork";
import { useNamePreviewFaces } from "./useNamePreviewFaces";
import { AddFontFromUrlDialog } from "./AddFontFromUrlDialog";

export interface FontListProps {
  /** The fonts to offer, in the order they should appear. */
  fonts: FontInfo[];
  /**
   * Fonts whose licence we can't read, or that ask to stay on this machine. They
   * sit behind a disclosure at the foot of the list.
   */
  closedFonts?: FontInfo[];
  selectedFont: string;
  onSelect: (font: string) => void;
  /** What to call the user's language in the tooltips; see FontChooserScreenProps. */
  languageName?: string;
  /**
   * Called as the closed-fonts disclosure opens and closes. The chooser puts off
   * reading those fonts until the user asks to see them, so this is the moment it
   * starts.
   */
  onClosedFontsOpenChange?: (open: boolean) => void;
  /**
   * What the list has to say about itself — that fonts are still arriving, that
   * the machine's own have not been asked for yet. It goes under the fonts, not
   * over them: the fonts are what the user came for, and a notice above them
   * pushes the first row down the moment it appears and back up when it goes.
   */
  notice?: React.ReactNode;
  /**
   * See FontChooserScreenProps: the wider search's own section, below a
   * divider at the foot of the open list, in the order given.
   */
  moreFonts?: FontInfo[];
  /** See FontChooserScreenProps; the invitation sits under that divider. */
  onSearchMoreFonts?: () => void;
  searchMoreFontsCost?: string;
  searchingMoreFonts?: boolean;
  /** See FontChooserScreenProps: what the info icon beside the section says. */
  moreFontsExplanation?: React.ReactNode;
  /**
   * How much of the network there is (see FontChooserScreenProps.network).
   * Anything but "open" and the list stops fetching font files just to draw
   * names in their own faces, and marks each not-yet-here font — a mark that
   * matters only where getting the font is something the user has to think
   * about. Offline it also takes down the invitation to search wider, which
   * cannot be answered.
   */
  network?: NetworkAvailability;
  /**
   * How to add the font a fonts.google.com address names. While this is set the
   * foot of the open list carries an "Add from URL…" button; clicking it opens a
   * small dialog, and this is what its "Add" does. Rejecting shows the reason in
   * the dialog and leaves it open, so a mistyped address can be corrected.
   */
  onAddFontFromUrl?: (url: string) => Promise<void>;
  className?: string;
}

/**
 * What to say about the wider search when the host hasn't said anything. It
 * describes the shape every such search has — open licences, popularity, the
 * font file's own coverage — without naming a catalog the chooser can't know it
 * is using.
 */
const DEFAULT_MORE_FONTS_EXPLANATION =
  "The list comes from the most popular fonts in a public catalog, kept only where " +
  "the font file itself was found to have every letter of this alphabet.";

/**
 * The list of fonts down the left of the screen. Each name is drawn in its own
 * font — which is most of what someone is choosing on — with small icons for
 * what isn't visible in the letters: a licence that wants reading, and (only
 * where the connection makes downloads worth weighing) a font that has to be
 * fetched first.
 */
export const FontList: React.FunctionComponent<FontListProps> = ({
  fonts,
  closedFonts = [],
  selectedFont,
  onSelect,
  languageName,
  onClosedFontsOpenChange,
  notice,
  moreFonts,
  onSearchMoreFonts,
  searchMoreFontsCost,
  searchingMoreFonts,
  moreFontsExplanation,
  network = "open",
  onAddFontFromUrl,
  className,
}) => {
  const theme = useTheme();
  const [showClosed, setShowClosed] = useState(false);
  const [addingFromUrl, setAddingFromUrl] = useState(false);

  // Every name the list might draw, registered for the browser's lazy loading
  // so it can appear in its own face; see the hook for why this is cheap and
  // why a metered connection turns it off.
  useNamePreviewFaces(
    [...fonts, ...closedFonts, ...(moreFonts ?? [])],
    network === "open"
  );

  const notifyOpen = useRef(onClosedFontsOpenChange);
  notifyOpen.current = onClosedFontsOpenChange;
  const setOpen = (open: boolean) => {
    setShowClosed(open);
    notifyOpen.current?.(open);
  };

  // Landing on a closed font opens the group so the user can see where their
  // choice went — once, on the way in. It stays open only until they say
  // otherwise: a selection that pinned the disclosure open would leave the header
  // looking like a control and behaving like a label.
  const selectionIsClosed = closedFonts.some(
    (font) => font.family === selectedFont
  );
  const openedFor = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!selectionIsClosed) {
      openedFor.current = undefined;
      return;
    }
    if (openedFor.current === selectedFont) return;
    openedFor.current = selectedFont;
    setOpen(true);
    // `setOpen` is stable enough: it only closes over the setter and a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFont, selectionIsClosed]);

  const row = (font: FontInfo, options?: { hideDownloadIcon?: boolean }) => (
    <FontRow
      key={font.family}
      font={font}
      selected={font.family === selectedFont}
      onSelect={onSelect}
      languageName={languageName}
      hideDownloadIcon={options?.hideDownloadIcon}
      network={network}
    />
  );

  // The list fills in from several sources over the first seconds, and each
  // arrival can carry the selected row somewhere else — including out of view,
  // which reads as the selection being taken away. So every change of the list
  // brings the selected row back into sight; "nearest" keeps this from scrolling
  // at all when the row is already visible, which is every quiet moment.
  //
  // The wider search's section is deliberately not a trigger: it fills because
  // the user clicked the invitation at the very place it fills, and pulling the
  // view back up to the selected row would carry them away from what they just
  // asked to see.
  const rowsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    rowsRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fonts, closedFonts, selectedFont]);

  return (
    <div
      className={className}
      css={css`
        width: 190px;
        flex: none;
        display: flex;
        flex-direction: column;
        border-right: 1px solid ${theme.palette.divider};
        background-color: ${theme.palette.common.white};
        overflow: hidden;
      `}
    >
      <div
        ref={rowsRef}
        css={[
          css`
            flex: 1;
            /* The rows are what scrolls; the closed-fonts disclosure below stays
               where it is. */
            min-height: 0;
            overflow-y: auto;
            padding: 6px 0;
          `,
          scrollbarCss,
        ]}
      >
        {fonts.map((font) => row(font))}
        {notice}
        {/* The wider search is the list's second section, reached the way a
            reader reaches the end of what is on offer: a rule, then the section's
            name, then the invitation to fill it, then whatever the search found.
            The name stays after the search has run, so the fonts that arrive have
            something above them saying where they came from. */}
        {(onSearchMoreFonts || moreFonts) && (
          <hr
            css={css`
              border: none;
              border-top: 1px solid ${theme.palette.divider};
              margin: 6px 12px;
            `}
          />
        )}
        {/* The section names itself once it has something in it. Before that
            there is nothing for the name to be about: a heading over an empty
            stretch of list reads as a section that came back empty, which is
            exactly what it isn't while the search is still running. */}
        {!!moreFonts?.length && (
          <div
            css={css`
              display: flex;
              align-items: center;
              gap: 4px;
              padding: 2px 12px;
              font-size: 11px;
              font-weight: 600;
              letter-spacing: 0.04em;
              text-transform: uppercase;
              color: ${theme.palette.text.secondary};
            `}
          >
            Popular fonts
            <ExplainerButton
              label="Where these fonts come from"
              explanation={moreFontsExplanation ?? DEFAULT_MORE_FONTS_EXPLANATION}
            />
          </div>
        )}
        {onSearchMoreFonts && (
          <div
            css={css`
              padding: 8px 12px;
            `}
          >
            {/* A button that looks like one: what it starts costs a wait and a
                download, so it should read as something the user does rather
                than as another line of the list. The size it costs is only
                worth the words where the user is paying for it — everywhere
                else it is a number nobody has a decision to make about.

                Offline it stays where it is, disabled, with the wifi mark and a
                tooltip saying why: taking it away would leave the user looking
                for a search they had used before and wondering where it went,
                and the greyed button says both that there is more to find and
                that it is out of reach for now. The tooltip needs the wrapping
                span — a disabled button reports no pointer events of its own. */}
            <Tooltip
              title={
                network === "offline"
                  ? "No internet connection, so there is no way to look for more fonts."
                  : ""
              }
            >
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={onSearchMoreFonts}
                  disabled={searchingMoreFonts || network === "offline"}
                  startIcon={
                    searchingMoreFonts ? (
                      <CircularProgress size={12} />
                    ) : network === "offline" ? (
                      <WifiOffIcon size={14} />
                    ) : undefined
                  }
                >
                  {searchingMoreFonts
                    ? "Loading…"
                    : `Find More${
                        network === "metered" && searchMoreFontsCost
                          ? ` (${searchMoreFontsCost})`
                          : ""
                      }`}
                </Button>
              </span>
            </Tooltip>
          </div>
        )}
        {/* Everything the wider search finds has to be fetched, so the section's
            heading already says it; a download mark on every row would only
            repeat that once per line. */}
        {moreFonts?.map((font) => row(font, { hideDownloadIcon: true }))}
        {/* An empty section still says it is one: the divider alone, after the
            invitation has gone, would read as the search having done nothing. */}
        {moreFonts && moreFonts.length === 0 && !onSearchMoreFonts && (
          <div
            css={css`
              padding: 8px 12px;
              font-size: 12px;
              color: ${theme.palette.text.secondary};
            `}
          >
            No further fonts found.
          </div>
        )}
        {/* Last of all, under everything the chooser thought of by itself: the
            font the user already has in mind. Offline it stays where it is,
            disabled and saying why, for the same reason the wider search does —
            a control that vanishes reads as one the user imagined. */}
        {onAddFontFromUrl && (
          <div
            css={css`
              padding: 8px 12px;
            `}
          >
            <Tooltip
              title={
                network === "offline"
                  ? "No internet connection, so there is no way to fetch a font from the web."
                  : ""
              }
            >
              <span>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => setAddingFromUrl(true)}
                  disabled={network === "offline"}
                  startIcon={
                    network === "offline" ? <WifiOffIcon size={14} /> : undefined
                  }
                  css={css`
                    margin-left: -5px;
                  `}
                >
                  Add from URL…
                </Button>
              </span>
            </Tooltip>
          </div>
        )}
      </div>
      {onAddFontFromUrl && addingFromUrl && (
        <AddFontFromUrlDialog
          open
          onCancel={() => setAddingFromUrl(false)}
          onAdd={async (url) => {
            await onAddFontFromUrl(url);
            setAddingFromUrl(false);
          }}
        />
      )}

      {closedFonts.length > 0 && (
        <div
          css={css`
            flex: none;
            border-top: 1px solid ${theme.palette.divider};
          `}
        >
          <ButtonBase
            onClick={() => setOpen(!showClosed)}
            aria-expanded={showClosed}
            css={css`
              width: 100%;
              justify-content: flex-start;
              gap: 4px;
              padding: 8px 10px;
              font-size: 12px;
              color: ${theme.palette.text.secondary};
              text-align: left;
            `}
          >
            <ChevronIcon
              size={14}
              open={showClosed}
              color={theme.palette.text.secondary}
            />
            Show closed licensed fonts
          </ButtonBase>
          <Collapse in={showClosed}>
            <div
              css={[
                css`
                  max-height: 180px;
                  overflow-y: auto;
                  padding-bottom: 6px;
                `,
                scrollbarCss,
              ]}
            >
              {closedFonts.map((font) => row(font))}
            </div>
          </Collapse>
        </div>
      )}
    </div>
  );
};

/**
 * A small "i" beside a heading, holding the explanation of what is under it.
 *
 * Hovering shows the tooltip, which is how a mouse user finds it; clicking pins
 * it open, which is the only way in on a touch screen and the way to keep it up
 * while reading four lines of prose. A pinned tooltip goes away on a second
 * click, on Escape, or on a click anywhere else.
 */
const ExplainerButton: React.FunctionComponent<{
  /** Read out in place of the icon, and shown as its native tooltip. */
  label: string;
  explanation: React.ReactNode;
}> = ({ label, explanation }) => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);

  const close = () => {
    setPinned(false);
    setOpen(false);
  };

  return (
    // ClickAwayListener needs a single child it can hang a ref on, and it must
    // not be the button itself: the button's own click would count as "away".
    <ClickAwayListener onClickAway={close}>
      <span
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
        }}
        css={css`
          display: inline-flex;
        `}
      >
        <Tooltip
          open={open}
          title={explanation}
          placement="right"
          slotProps={{
            tooltip: {
              sx: {
                maxWidth: 260,
                fontSize: 12,
                lineHeight: 1.45,
                // The heading above is upper-cased; the explanation is a
                // sentence and must not inherit that.
                textTransform: "none",
                letterSpacing: 0,
                fontWeight: 400,
              },
            },
          }}
        >
          <ButtonBase
            aria-label={label}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => {
              if (!pinned) setOpen(false);
            }}
            onFocus={() => setOpen(true)}
            onBlur={close}
            onClick={() => {
              if (pinned) {
                close();
                return;
              }
              setPinned(true);
              setOpen(true);
            }}
            css={css`
              flex: none;
              border-radius: 50%;
              padding: 1px;
              color: ${theme.palette.text.secondary};

              &:hover {
                color: ${theme.palette.text.primary};
              }
            `}
          >
            <InfoCircleIcon size={13} />
          </ButtonBase>
        </Tooltip>
      </span>
    </ClickAwayListener>
  );
};

/** How the row's hover rule finds the mark it is uncovering. */
const LOCATION_MARK_CLASS = "font-location-mark";

/**
 * What the mark says for each place a font can be, in the second person, since
 * what the user is deciding is whether they can count on this font elsewhere.
 *
 * A font fetched for this session is still "on the internet": the browser is
 * holding a copy until the page reloads, and telling somebody it is on their
 * computer would be telling them they can use it in another program.
 */
function locationMarkFor(font: FontInfo): {
  Icon: React.FunctionComponent<{
    size?: number;
    color?: string;
    title?: string;
    className?: string;
  }>;
  title: string;
} {
  const location =
    font.location ?? (font.installed === false ? "network" : "installed");
  switch (location) {
    case "disk":
      return {
        Icon: OnDiskFontIcon,
        // Deliberately silent on how the app came by the file — shipped with it,
        // or fetched once and kept. Both are the same fact to the user: it is
        // here, it works without the network, and it is not a font of theirs.
        //
        // Silent, too, on the font not being installed, which is where this used
        // to run to two sentences. That other programs on the machine won't
        // offer the font is true and is nobody's question at the moment they
        // hover an icon in a font list.
        title: "Comes with this app",
      };
    case "network":
      return {
        Icon: NetworkFontIcon,
        // One line for both halves of "network". Whether the font has already
        // been pulled down for this visit or hasn't been touched yet is a
        // distinction the chooser cares about and the reader doesn't: either
        // way the font lives on the internet and needs a connection.
        title: "Available from internet",
      };
    default:
      return {
        Icon: InstalledFontIcon,
        title: "Installed on this computer",
      };
  }
}

const LocationMark: React.FunctionComponent<{
  font: FontInfo;
  className?: string;
}> = ({ font, className }) => {
  const theme = useTheme();
  const { Icon, title } = locationMarkFor(font);
  return (
    <Tooltip title={title} placement="left">
      <span
        className={className}
        css={css`
          flex: none;
          display: inline-flex;
          color: ${theme.palette.text.secondary};
        `}
      >
        <Icon size={15} title={title} />
      </span>
    </Tooltip>
  );
};

const FontRow: React.FunctionComponent<{
  font: FontInfo;
  selected: boolean;
  onSelect: (font: string) => void;
  languageName?: string;
  /** For a section where every font needs fetching and the heading says so. */
  hideDownloadIcon?: boolean;
  /** See FontListProps: what the mark beside a not-yet-here font says, if anything. */
  network?: NetworkAvailability;
}> = ({
  font,
  selected,
  onSelect,
  languageName,
  hideDownloadIcon,
  network = "open",
}) => {
  const theme = useTheme();
  const installed = font.installed !== false;
  const downloadMarkShows =
    !installed &&
    network !== "open" &&
    (!hideDownloadIcon || network === "offline");

  // Only a recommended font has anything to explain, so an ordinary name is
  // handed back untouched rather than given a tooltip repeating itself.
  const nameTooltip = (name: React.ReactElement) =>
    font.supportsLanguage ? (
      <Tooltip
        title={`According to ${
          font.supportsLanguageSource?.name ?? "our language data"
        } this font supports ${languageName || "your language"}`}
      >
        {name}
      </Tooltip>
    ) : (
      name
    );

  return (
    <div
      role="option"
      aria-selected={selected}
      tabIndex={0}
      onClick={() => onSelect(font.family)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(font.family);
        }
      }}
      css={css`
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 5px 12px;
        cursor: pointer;
        border-left: 3px solid
          ${selected ? theme.palette.primary.main : "transparent"};
        background-color: ${selected
          ? alpha(theme.palette.primary.main, 0.12)
          : "transparent"};

        &:hover {
          background-color: ${selected
            ? alpha(theme.palette.primary.main, 0.12)
            : alpha(theme.palette.primary.main, 0.06)};
        }

        /* Held in the layout at all times and only made visible under the
           pointer, so that arriving at a row doesn't shove its name sideways. */
        .${LOCATION_MARK_CLASS} {
          opacity: 0;
          transition: opacity 120ms;
        }
        &:hover .${LOCATION_MARK_CLASS},
        &:focus-visible .${LOCATION_MARK_CLASS} {
          opacity: 1;
        }
      `}
    >
      <StatusIcons font={font} />
      {/* Weight is the whole of the recommendation here: the list is read by
          running an eye down the names, and boldness is visible in that sweep in
          a way a small mark beside the name is not. Since nothing on the row
          says what the weight means, the tooltip goes on the name itself, for
          the reader who wonders why this one is bold. The pane says it in full. */}
      {nameTooltip(
        <span
          css={css`
            flex: 1;
            min-width: 0;
            font-size: 15px;
            font-weight: ${font.supportsLanguage ? 700 : 400};
            // Its own face first — installed, session-downloaded, or the lazy
            // preview faces useNamePreviewFaces registered — and the interface
            // font while none of those has it, rather than something arbitrary.
            font-family: "${font.family}", ${theme.typography.fontFamily};
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          `}
        >
          {font.family}
        </span>
      )}
      {/* The mark matters only where getting the font is something the user has
          to think about; on an ordinary connection the chooser just fetches, and
          a symbol on most of the list would be noise. Offline it is not a
          warning about a cost but about a dead end, so it says so — and it stays
          on the wider search's rows, where the heading's "these all need
          fetching" is no longer the point. */}
      {downloadMarkShows ? (
        <DownloadNeededIcon
          color={theme.palette.secondary.main}
          title={
            network === "offline"
              ? "Not on this computer, and there is no internet connection to get it"
              : "Needs downloading from the internet"
          }
          css={css`
            flex: none;
          `}
        />
      ) : (
        /* Where the font's bytes are, on the row under the pointer. Every row
           has an answer, and answered on every row at once it would be a column
           of symbols to learn before reading a single name; one at a time it is
           there for the row you are asking about. Never both marks at once —
           the download arrow is already saying where this font is. */
        <LocationMark font={font} className={LOCATION_MARK_CLASS} />
      )}
    </div>
  );
};

const StatusIcons: React.FunctionComponent<{ font: FontInfo }> = ({ font }) => {
  const theme = useTheme();
  return (
    <span
      css={css`
        display: flex;
        align-items: center;
        gap: 3px;
        flex: none;
      `}
    >
      {font.license === "limits-apply" && (
        <AlertTriangleIcon
          color={theme.palette.error.main}
          title="You may print with this font, but not publish with it"
        />
      )}
      {font.license === "unknown" && (
        <UnknownRulesIcon title="We don't know the rules for this font" />
      )}
      {font.license === "system-restricted" && (
        <AlertCircleIcon
          color={theme.palette.error.main}
          title="May not be shareable"
        />
      )}
    </span>
  );
};
