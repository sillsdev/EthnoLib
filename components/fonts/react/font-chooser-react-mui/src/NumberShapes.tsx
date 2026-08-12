/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import {
  alpha,
  ButtonBase,
  Collapse,
  Typography,
  useTheme,
} from "@mui/material";
import React, { useState } from "react";
import { ChevronIcon } from "./icons";

/** The OpenType feature that swaps lining figures for old-style ones. */
export const OLD_STYLE_NUMERALS_TAG = "onum";

export interface NumberShapesProps {
  fontFamily: string;
  /** 0 for the font's own figures, 1 for old-style. */
  choice: number;
  onChoose: (choice: number) => void;
  className?: string;
}

const SAMPLE = "0123";

/**
 * The two ways a font can draw numbers, for the fonts that offer both. Folded away
 * by default: most people never think about it, and the ones who do will recognize
 * the two rows at a glance.
 */
export const NumberShapes: React.FunctionComponent<NumberShapesProps> = ({
  fontFamily,
  choice,
  onChoose,
  className,
}) => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className={className}>
      <ButtonBase
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        css={css`
          gap: 4px;
          padding: 4px 0;
          font-size: 14px;
          font-weight: 500;
          color: ${theme.palette.text.primary};
        `}
      >
        <ChevronIcon size={16} open={open} />
        Number shapes
      </ButtonBase>

      <Collapse in={open}>
        <Typography
          variant="body2"
          css={css`
            margin: 6px 0 10px;
            font-size: 12.5px;
            color: ${theme.palette.text.secondary};
          `}
        >
          This font can draw numbers two ways:
        </Typography>
        <div
          css={css`
            display: flex;
            gap: 12px;
          `}
        >
          <NumberTile
            fontFamily={fontFamily}
            featureSetting={`"${OLD_STYLE_NUMERALS_TAG}" 0`}
            label="Same height"
            selected={choice !== 1}
            onClick={() => onChoose(0)}
          />
          <NumberTile
            fontFamily={fontFamily}
            featureSetting={`"${OLD_STYLE_NUMERALS_TAG}" 1`}
            label="Rising and falling"
            selected={choice === 1}
            onClick={() => onChoose(1)}
          />
        </div>
      </Collapse>
    </div>
  );
};

/**
 * One of the two figure styles, big enough to see. Built here rather than reusing
 * the character-variants package's FormTile, which that package keeps to itself.
 */
const NumberTile: React.FunctionComponent<{
  fontFamily: string;
  featureSetting: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}> = ({ fontFamily, featureSetting, label, selected, onClick }) => {
  const theme = useTheme();
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={selected}
      css={css`
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        gap: ${theme.spacing(0.5)};
        min-width: 104px;
        padding: ${theme.spacing(1)};
        border: 1px solid
          ${selected ? theme.palette.primary.main : theme.palette.divider};
        border-radius: 6px;
        background-color: ${selected
          ? alpha(theme.palette.primary.main, 0.1)
          : theme.palette.background.paper};
        box-shadow: ${selected
          ? `inset 0 0 0 1px ${theme.palette.primary.main}`
          : "none"};

        &:hover {
          border-color: ${theme.palette.primary.main};
        }
      `}
    >
      <span
        css={css`
          position: relative;
          display: block;
          padding: 2px 4px;
          font-family: "${fontFamily}";
          font-size: 32px;
          line-height: 1.25;
          font-feature-settings: ${featureSetting};
          // The baseline is the whole difference between the two styles, so it is
          // drawn in rather than left to the eye.
          &::after {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            bottom: 25%;
            border-bottom: 1px dashed ${theme.palette.divider};
          }
        `}
      >
        {SAMPLE}
      </span>
      <Typography
        variant="caption"
        css={css`
          font-size: 0.7rem;
          line-height: 1.2;
          color: ${selected
            ? theme.palette.primary.main
            : theme.palette.text.secondary};
          font-weight: ${selected ? 600 : 400};
        `}
      >
        {label}
      </Typography>
    </ButtonBase>
  );
};
