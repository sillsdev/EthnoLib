/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { alpha, ButtonBase, Collapse, useTheme } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import type { FontInfo } from "./types";
import {
  AlertCircleIcon,
  ChevronIcon,
  DownloadNeededIcon,
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
  className?: string;
}

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

  const row = (font: FontInfo) => (
    <FontRow
      key={font.family}
      font={font}
      selected={font.family === selectedFont}
      onSelect={onSelect}
      languageName={languageName}
    />
  );

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
        {fonts.map(row)}
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
              {closedFonts.map(row)}
            </div>
          </Collapse>
        </div>
      )}
    </div>
  );
};

const FontRow: React.FunctionComponent<{
  font: FontInfo;
  selected: boolean;
  onSelect: (font: string) => void;
  languageName?: string;
}> = ({ font, selected, onSelect, languageName }) => {
  const theme = useTheme();
  const installed = font.installed !== false;

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
      {/* A recommended font is bold rather than ticked. The list is read by
          running an eye down the names, and weight is visible in that sweep in a
          way a small mark beside the name is not — while a tick, sitting in the
          same row as the licence warnings, read as one more piece of status
          rather than as "this is the sort of font you came here for". */}
      <span
        title={
          font.supportsLanguage
            ? `Recommended for ${languageName || "your language"}`
            : undefined
        }
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
      {/* Alone on the right, away from the marks that qualify the font itself.
          This one is about getting the font rather than about what it is, and a
          column of them down the edge reads as one answer to "which of these do
          I not have yet" instead of a detail per row. */}
      {!installed && (
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
