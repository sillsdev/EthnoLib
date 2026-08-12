/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { alpha, ButtonBase, Tooltip, useTheme } from "@mui/material";
import React from "react";

export interface FormTileProps {
  /**
   * What to show, rendered in the font with this form applied. One character in
   * most tiles: the point of a row of tiles is the shape, and the same character
   * in each of them is what makes the shapes comparable.
   */
  text: string;
  fontFamily: string;
  /** Size of the sample glyph, in px. */
  fontSize?: number;
  /** e.g. `"cv07" 2`; omit for the font's default form. */
  featureSetting?: string;
  /** The font's name for this form, or "Default". */
  label: string;
  /**
   * What the whole row of forms is about, e.g. "Lowercase ram's horn". Named
   * together with the form in the tooltip, since neither is written on the tile.
   */
  groupLabel?: string;
  selected: boolean;
  onClick: () => void;
  className?: string;
}

/**
 * One selectable form of a character: the glyph and nothing else. What it is called
 * lives in a tooltip, which repeats the glyph large enough to see what the form
 * does to it — the names cost more room on screen than they are worth here.
 */
export const FormTile: React.FunctionComponent<FormTileProps> = ({
  text,
  fontFamily,
  fontSize = 32,
  featureSetting,
  label,
  groupLabel,
  selected,
  onClick,
  className,
}) => {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const name = groupLabel ? `${groupLabel}: ${label}` : label;

  return (
    <Tooltip
      title={
        <span
          css={css`
            display: flex;
            align-items: center;
            gap: 10px;
          `}
        >
          {name}
          <span
            css={css`
              font-family: "${fontFamily}";
              font-size: 26px;
              line-height: 1.1;
              font-feature-settings: ${featureSetting ?? "normal"};
            `}
          >
            {text}
          </span>
        </span>
      }
      enterDelay={400}
    >
      <ButtonBase
        className={className}
        onClick={onClick}
        aria-pressed={selected}
        aria-label={name}
        css={css`
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 56px;
          padding: 8px 10px;
          border: 1px solid
            ${selected ? primary : alpha(theme.palette.common.black, 0.2)};
          border-radius: 3px;
          background-color: ${selected
            ? alpha(primary, 0.1)
            : theme.palette.common.white};
          box-shadow: ${selected ? `inset 0 0 0 1px ${primary}` : "none"};

          &:hover {
            border-color: ${primary};
            background-color: ${selected
              ? alpha(primary, 0.1)
              : alpha(primary, 0.05)};
          }

          &.Mui-focusVisible {
            outline: 2px solid ${primary};
            outline-offset: 2px;
          }
        `}
      >
        <span
          css={css`
            display: flex;
            align-items: center;
            width: 100%;
            // Room for the tallest and deepest a font is likely to draw at this
            // size, since what overflows is clipped rather than spilling out.
            height: ${Math.max(48, Math.round(fontSize * 1.6))}px;
            // Keeps the baseline rule inside its own tile: the rule is drawn far
            // wider than the tile so that it reaches both edges whatever the
            // glyph's width.
            overflow: hidden;
          `}
        >
          <span
            css={css`
              display: block;
              width: 100%;
              white-space: nowrap;
              text-align: center;
            `}
          >
            {/*
              The dashed line the glyph sits on. An empty inline box aligned to the
              text baseline takes no width of its own, so it neither shifts the
              glyph nor follows it; the rule hangs off it, which puts the line on
              the real baseline of whatever the font draws rather than at a guessed
              height.
            */}
            <span
              aria-hidden
              css={css`
                position: relative;
                display: inline-block;
                width: 0;
                height: 0;
                vertical-align: baseline;
              `}
            >
              <span
                css={css`
                  position: absolute;
                  top: 0;
                  left: -1000px;
                  width: 2000px;
                  border-top: 1px dashed ${alpha(primary, 0.7)};
                `}
              />
            </span>
            <span
              css={css`
                font-family: "${fontFamily}";
                font-size: ${fontSize}px;
                line-height: 1.05;
                color: ${theme.palette.text.primary};
                // Only the form being shown should differ between the tiles.
                font-feature-settings: ${featureSetting ?? "normal"};
              `}
            >
              {text}
            </span>
          </span>
        </span>
      </ButtonBase>
    </Tooltip>
  );
};
