/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import {
  alpha,
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
  ChevronIcon,
  DownloadNeededIcon,
  InfoCircleIcon,
  UnknownRulesIcon,
} from "./icons";
import { scrollbarCss } from "./scrollbarStyle";

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
  /** Pinned above the list, for anything that has to stay in view as it scrolls. */
  header?: React.ReactNode;
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
  className?: string;
}

/**
 * What to say about the wider search when the host hasn't said anything. It
 * describes the shape every such search has — open licences, popularity, the
 * font file's own coverage — without naming a catalog the chooser can't know it
 * is using.
 */
const DEFAULT_MORE_FONTS_EXPLANATION =
  "The list comes from the most popular fonts in a public catalog, filtered down to " +
  "fonts that probably support the alphabet of this language.";

/**
 * The list of fonts down the left of the screen. Each name is drawn in its own
 * font where we have it, which is most of what someone is choosing on, with small
 * icons for the things that aren't visible in the letters: a font that has to be
 * fetched first, and one whose licence wants reading.
 */
export const FontList: React.FunctionComponent<FontListProps> = ({
  fonts,
  closedFonts = [],
  selectedFont,
  onSelect,
  languageName,
  onClosedFontsOpenChange,
  header,
  moreFonts,
  onSearchMoreFonts,
  searchMoreFontsCost,
  searchingMoreFonts,
  moreFontsExplanation,
  className,
}) => {
  const theme = useTheme();
  const [showClosed, setShowClosed] = useState(false);

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
      {header && (
        <div
          css={css`
            flex: none;
            border-bottom: 1px solid ${theme.palette.divider};
          `}
        >
          {header}
        </div>
      )}
      <div
        ref={rowsRef}
        css={[
          css`
            flex: 1;
            /* The rows are what scrolls; the prompt above and the closed-fonts
               disclosure below stay where they are. */
            min-height: 0;
            overflow-y: auto;
            padding: 6px 0;
          `,
          scrollbarCss,
        ]}
      >
        {fonts.map((font) => row(font))}
        {/* The wider search is the list's second section, reached the way a
            reader reaches the end of what is on offer: a rule, then the section's
            name, then the invitation to fill it, then whatever the search found.
            The name stays after the search has run, so the fonts that arrive have
            something above them saying where they came from. */}
        {(onSearchMoreFonts || moreFonts) && (
          <>
            <hr
              css={css`
                border: none;
                border-top: 1px solid ${theme.palette.divider};
                margin: 6px 12px;
              `}
            />
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
          </>
        )}
        {onSearchMoreFonts && (
          <ButtonBase
            onClick={onSearchMoreFonts}
            disabled={searchingMoreFonts}
            css={css`
              width: 100%;
              justify-content: flex-start;
              gap: 6px;
              padding: 8px 12px;
              font-size: 12px;
              color: ${theme.palette.primary.main};
              text-align: left;
            `}
          >
            {searchingMoreFonts ? (
              <>
                <CircularProgress size={12} />
                Loading…
              </>
            ) : (
              `Find more fonts that may work for this language${
                searchMoreFontsCost ? ` (${searchMoreFontsCost})` : ""
              }`
            )}
          </ButtonBase>
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
      </div>

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

const FontRow: React.FunctionComponent<{
  font: FontInfo;
  selected: boolean;
  onSelect: (font: string) => void;
  languageName?: string;
  /** For a section where every font needs fetching and the heading says so. */
  hideDownloadIcon?: boolean;
}> = ({ font, selected, onSelect, languageName, hideDownloadIcon }) => {
  const theme = useTheme();
  const installed = font.installed !== false;

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
            // A font that isn't here yet can't draw its own name, so it borrows the
            // interface font rather than falling back to something arbitrary.
            font-family: ${installed
              ? `"${font.family}"`
              : theme.typography.fontFamily};
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          `}
        >
          {font.family}
        </span>
      )}
      {!installed && !hideDownloadIcon && (
        <DownloadNeededIcon
          color={theme.palette.secondary.main}
          title="Needs downloading from the internet"
          css={css`
            flex: none;
          `}
        />
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
        <AlertCircleIcon
          color={theme.palette.warning.main}
          title="Limits apply — read the license"
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
