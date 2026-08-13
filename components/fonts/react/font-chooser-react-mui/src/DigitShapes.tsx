import React from "react";
import {
  CharacterVariantChoices,
  CharacterVariantList,
  ShapeInfo,
  type ChoiceSource,
  type ShapeChoice,
} from "@ethnolib/character-variants-react-mui";
import { DIGITS } from "@ethnolib/font-core";
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
  /** See CharacterVariantList: the durable fact behind every pick. */
  onShapeChoiceChange?: (groupKey: string, choice: ShapeChoice) => void;
  /** See CharacterVariantList: why each row's form is in force, for captions. */
  provenance?: Record<string, ChoiceSource>;
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
  onShapeChoiceChange,
  provenance,
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
        onShapeChoiceChange={onShapeChoiceChange}
        provenance={provenance}
        sampleSize={sampleSize}
        onHoverChange={onHoverChange}
      />
    </div>
  );
};
