import React from "react";
import {
  CharacterVariantChoices,
  CharacterVariantList,
  DIGITS,
  ShapeInfo,
} from "@ethnolib/character-variants-react-mui";
import { SectionHeading } from "./SectionHeading";

export interface DigitShapesProps {
  fontFamily: string;
  fontData?: ArrayBuffer;
  postscriptName?: string;
  /**
   * Whether the font has any cvXX feature that redraws a digit. Nothing else
   * counts: a font that merely offers old-style figures is offering another way to
   * set its numbers, not another shape to draw them in.
   */
  hasDigitVariants: boolean;
  choices: CharacterVariantChoices;
  onChoicesChange: (choices: CharacterVariantChoices) => void;
  sampleSize?: number;
  /** Told what the tile under the pointer is, and told null when it leaves. */
  onHoverChange?: (info: ShapeInfo | null) => void;
  className?: string;
}

/**
 * The ways a font can draw the digits: the same choices as the letter shapes, for
 * 0-9. Shown outright, like the letter shapes, and only when the font has some —
 * a section that is only ever there when it has something in it has nothing to
 * gain from being foldable.
 */
export const DigitShapes: React.FunctionComponent<DigitShapesProps> = ({
  fontFamily,
  fontData,
  postscriptName,
  hasDigitVariants,
  choices,
  onChoicesChange,
  sampleSize,
  onHoverChange,
  className,
}) => {
  if (!hasDigitVariants) return null;

  return (
    <div className={className}>
      <SectionHeading>Digit Shape Choices</SectionHeading>

      <CharacterVariantList
        fontFamily={fontFamily}
        fontData={fontData}
        postscriptName={postscriptName}
        alphabet={DIGITS}
        choices={choices}
        onChoicesChange={onChoicesChange}
        sampleSize={sampleSize}
        onHoverChange={onHoverChange}
      />
    </div>
  );
};
