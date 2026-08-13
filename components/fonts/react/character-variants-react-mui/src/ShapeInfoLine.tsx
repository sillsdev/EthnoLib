/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { alpha, useTheme } from "@mui/material";
import React from "react";

/** What one shape tile is: what it is called, and the CSS that produces it. */
export interface ShapeInfo {
  /** e.g. "Lowercase ram's horn: Large bowl". */
  name: string;
  /** e.g. `"cv07" 2`; absent for the font's own form, which needs no CSS. */
  featureSetting?: string;
}

export interface ShapeInfoLineProps {
  /** The shape under the pointer, or null/undefined when there isn't one. */
  info?: ShapeInfo | null;
  className?: string;
}

/**
 * What the shape under the pointer is, written in one place that doesn't move.
 * A caller puts this somewhere settled — the foot of the pane, away from the
 * tiles — and feeds it from the tiles' `onHoverChange`, so that reading about a
 * shape never involves a label appearing over the shapes themselves.
 *
 * Empty when nothing is hovered, but still occupying its space, so that whatever
 * shares the row with it stays where it is.
 */
export const ShapeInfoLine: React.FunctionComponent<ShapeInfoLineProps> = ({
  info,
  className,
}) => {
  const theme = useTheme();
  // The lightest grey that still clears WCAG AA's 4.5:1 for normal-size text on
  // white: #767676 measures 4.54:1. The theme's secondary text is darker than it
  // needs to be for something this incidental, and anything lighter than this
  // fails outright, so the value is written out rather than taken from a token.
  const grey = "#767676";

  return (
    <div
      // Hover commentary, and the tiles are already named for a screen reader; a
      // line that changed under the reader as focus moved would say it all twice.
      aria-hidden
      className={className}
      css={css`
        min-width: 0;
        font-size: 11.5px;
        line-height: 1.35;
        color: ${grey};
      `}
    >
      {info && (
        <>
          <div
            css={css`
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            `}
          >
            {info.name}
          </div>
          <div>
            {info.featureSetting ? (
              <>
                CSS:{" "}
                {/*
                  Set like inline code in rendered Markdown, so that it reads as
                  something to copy into a stylesheet rather than as prose.
                */}
                <code
                  css={css`
                    font-family:
                      ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
                    padding: 2px 5px;
                    border-radius: 3px;
                    background-color: ${alpha(
                      theme.palette.common.black,
                      0.08
                    )};
                  `}
                >
                  font-feature-settings: {info.featureSetting}
                </code>
              </>
            ) : (
              "No CSS needed"
            )}
          </div>
        </>
      )}
    </div>
  );
};
