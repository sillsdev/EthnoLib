/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import React from "react";
import { CharacterVariant } from "./readCharacterVariants";
import { FormTile } from "./FormTile";
import { representativeSample } from "./alphabet";

/** Fonts name their forms inconsistently; the tiles read better all in one style. */
function capitalized(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * One cvXX feature: a tile per form it offers — the font's default plus each
 * alternate — of which the user picks one. The feature's name is not written out;
 * it reaches the user through the tiles' tooltips.
 */
export const CharacterVariantCard: React.FunctionComponent<{
  variant: CharacterVariant;
  fontFamily: string;
  sampleSize: number;
  /** 0 for the font's default form, or the 1-based alternate. */
  choice: number;
  onChoose: (choice: number) => void;
}> = ({ variant, fontFamily, sampleSize, choice, onChoose }) => {
  const sample = representativeSample(variant);

  // A feature with named parameters offers several alternates; an unnamed one just
  // has the single "on" form.
  const alternates =
    variant.parameterLabels.length > 0
      ? variant.parameterLabels.map((label, i) => ({
          value: i + 1,
          label: capitalized(label),
        }))
      : [{ value: 1, label: "Alternate" }];

  if (!sample) return null;

  // Nothing here is written on screen: the font's name for the feature reaches the
  // user through each tile's tooltip instead, which costs no room in the pane.
  const groupLabel = variant.label ?? `Character variant ${variant.number}`;

  return (
    <div
      css={css`
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      `}
    >
      <FormTile
        text={sample}
        fontFamily={fontFamily}
        fontSize={sampleSize}
        label="Default"
        groupLabel={groupLabel}
        selected={choice === 0}
        onClick={() => onChoose(0)}
      />
      {alternates.map(({ value, label }) => (
        <FormTile
          key={value}
          text={sample}
          fontFamily={fontFamily}
          fontSize={sampleSize}
          featureSetting={`"${variant.tag}" ${value}`}
          label={label}
          groupLabel={groupLabel}
          selected={choice === value}
          onClick={() => onChoose(value)}
        />
      ))}
    </div>
  );
};
