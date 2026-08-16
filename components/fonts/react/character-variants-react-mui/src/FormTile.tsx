/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { alpha, ButtonBase, useTheme } from "@mui/material";
import React from "react";
import { fontFamilyWithTofu } from "@ethnolib/font-core";
import type { ShapeInfo } from "./ShapeInfoLine";

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
  /**
   * Called with what this tile is, when the pointer or the keyboard arrives on it,
   * and with null when it leaves. Whoever is listening decides where to show it;
   * the tile says nothing about itself on its own.
   */
  onHoverChange?: (info: ShapeInfo | null) => void;
  selected: boolean;
  onClick: () => void;
  className?: string;
}

/**
 * Every measurement in a tile, as a multiple of the sample's font size, so that
 * `fontSize` is the one number that sizes the control. Nothing here is in px: a
 * fixed anything — the 48px floor the box used to have, say — stops the tile
 * shrinking with its glyph and leaves a small letter adrift in a box built for a
 * bigger one.
 *
 * The numbers are what the tiles were at 32px, which is where they were drawn to
 * look right.
 */
const OF_FONT_SIZE = {
  /** Room for the tallest and deepest a font is likely to draw. */
  boxHeight: 1.6,
  /** So that a narrow glyph gets a tile of about the same width as a wide one. */
  minWidth: 1.75,
  padding: { y: 0.25, x: 0.3 },
  radius: 0.1,
};

/**
 * The size of the sample glyph when nobody has said, and with it the size of
 * everything else in the control. This is the number to change.
 */
export const DEFAULT_SAMPLE_SIZE = 24;

/** A length in px, as a multiple of the sample's font size. */
export const scaledPx = (fontSize: number, ratio: number) =>
  `${Math.round(fontSize * ratio * 100) / 100}px`;

const px = scaledPx;

/**
 * One selectable form of a character: the glyph and nothing else. What it is called
 * goes out through `onHoverChange` while the pointer is on it, for a caller with
 * somewhere settled to put it; nothing is written on the tile.
 */
export const FormTile: React.FunctionComponent<FormTileProps> = ({
  text,
  fontFamily,
  fontSize = DEFAULT_SAMPLE_SIZE,
  featureSetting,
  label,
  groupLabel,
  onHoverChange,
  selected,
  onClick,
  className,
}) => {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const name = groupLabel ? `${groupLabel}: ${label}` : label;

  // Focus as well as hover, so that someone tabbing through the tiles is told what
  // each one is on the same terms as someone pointing at it.
  const arrive = () => onHoverChange?.({ name, featureSetting });
  const leave = () => onHoverChange?.(null);

  return (
    <ButtonBase
      className={className}
      onClick={onClick}
      onMouseEnter={arrive}
      onMouseLeave={leave}
      onFocus={arrive}
      onBlur={leave}
      aria-pressed={selected}
      aria-label={name}
      css={css`
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: ${px(fontSize, OF_FONT_SIZE.minWidth)};
        padding: ${px(fontSize, OF_FONT_SIZE.padding.y)}
          ${px(fontSize, OF_FONT_SIZE.padding.x)};
        border: 1px solid
          ${selected ? primary : alpha(theme.palette.common.black, 0.2)};
        border-radius: ${px(fontSize, OF_FONT_SIZE.radius)};
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
          // What overflows is clipped rather than spilling out, so this has to be
          // the tallest and deepest a font is likely to draw at this size.
          height: ${px(fontSize, OF_FONT_SIZE.boxHeight)};
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
            text baseline takes no width of its own, so it neither shifts the glyph
            nor follows it; the rule hangs off it, which puts the line on the real
            baseline of whatever the font draws rather than at a guessed height.
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
              font-family: ${fontFamilyWithTofu(fontFamily)};
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
  );
};
