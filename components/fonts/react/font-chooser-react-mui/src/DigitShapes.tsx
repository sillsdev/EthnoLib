/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { ButtonBase, Collapse, useTheme } from "@mui/material";
import React, { useState } from "react";
import {
  CharacterVariantChoices,
  CharacterVariantList,
  DIGITS,
} from "@ethnolib/character-variants-react-mui";
import { ChevronIcon } from "./icons";
import { NumberShapes, OLD_STYLE_NUMERALS_TAG } from "./NumberShapes";

export interface DigitShapesProps {
  fontFamily: string;
  fontData?: ArrayBuffer;
  postscriptName?: string;
  /** Whether the font has any cvXX feature that redraws a digit. */
  hasDigitVariants: boolean;
  /** Whether it offers old-style figures, which is a choice of its own. */
  hasOldStyleNumerals: boolean;
  choices: CharacterVariantChoices;
  onChoicesChange: (choices: CharacterVariantChoices) => void;
  sampleSize?: number;
  className?: string;
}

/**
 * The ways a font can draw the digits, the same choices as the letter shapes but
 * for 0-9. Folded away by default: a book's numbers matter less than its letters,
 * and the section says what is inside it without being opened.
 */
export const DigitShapes: React.FunctionComponent<DigitShapesProps> = ({
  fontFamily,
  fontData,
  postscriptName,
  hasDigitVariants,
  hasOldStyleNumerals,
  choices,
  onChoicesChange,
  sampleSize,
  className,
}) => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  if (!hasDigitVariants && !hasOldStyleNumerals) return null;

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
        Digit Shape Choices
      </ButtonBase>

      <Collapse in={open}>
        <div
          css={css`
            display: flex;
            flex-direction: column;
            gap: 18px;
            padding-top: 10px;
          `}
        >
          {hasOldStyleNumerals && (
            <NumberShapes
              fontFamily={fontFamily}
              choice={choices[OLD_STYLE_NUMERALS_TAG] ?? 0}
              onChoose={(choice) =>
                onChoicesChange({
                  ...choices,
                  [OLD_STYLE_NUMERALS_TAG]: choice,
                })
              }
              sampleSize={sampleSize}
            />
          )}

          {hasDigitVariants && (
            <CharacterVariantList
              fontFamily={fontFamily}
              fontData={fontData}
              postscriptName={postscriptName}
              alphabet={DIGITS}
              choices={choices}
              onChoicesChange={onChoicesChange}
              sampleSize={sampleSize}
            />
          )}
        </div>
      </Collapse>
    </div>
  );
};
