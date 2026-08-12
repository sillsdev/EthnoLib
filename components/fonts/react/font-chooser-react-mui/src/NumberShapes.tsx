/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import React from "react";
import { FormTile } from "@ethnolib/character-variants-react-mui";

/** The OpenType feature that swaps lining figures for old-style ones. */
export const OLD_STYLE_NUMERALS_TAG = "onum";

export interface NumberShapesProps {
  fontFamily: string;
  /** 0 for the font's own figures, 1 for old-style. */
  choice: number;
  onChoose: (choice: number) => void;
  sampleSize?: number;
  className?: string;
}

const SAMPLE = "0123";

/** Names this pair in the tiles' tooltips, as a font names its own features. */
const GROUP_LABEL = "Number style";

/**
 * The two ways a font can draw numbers, for the fonts that offer both. One group
 * among the digit shapes: `onum` is not a cvXX feature, so it isn't in the font's
 * character-variant list and has to be offered on its own.
 */
export const NumberShapes: React.FunctionComponent<NumberShapesProps> = ({
  fontFamily,
  choice,
  onChoose,
  sampleSize,
  className,
}) => (
  <div
    className={className}
    css={css`
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    `}
  >
    <FormTile
      text={SAMPLE}
      fontFamily={fontFamily}
      fontSize={sampleSize}
      featureSetting={`"${OLD_STYLE_NUMERALS_TAG}" 0`}
      label="Same height"
      groupLabel={GROUP_LABEL}
      selected={choice !== 1}
      onClick={() => onChoose(0)}
    />
    <FormTile
      text={SAMPLE}
      fontFamily={fontFamily}
      fontSize={sampleSize}
      featureSetting={`"${OLD_STYLE_NUMERALS_TAG}" 1`}
      label="Rising and falling"
      groupLabel={GROUP_LABEL}
      selected={choice === 1}
      onClick={() => onChoose(1)}
    />
  </div>
);
