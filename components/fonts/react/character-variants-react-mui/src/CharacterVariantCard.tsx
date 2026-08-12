/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { Card, CardContent, Typography, useTheme } from "@mui/material";
import React from "react";
import { CharacterVariant } from "./readCharacterVariants";
import { FormTile } from "./FormTile";
import { usableSampleText } from "./alphabet";

/**
 * One cvXX feature: what the font calls it, and a tile per form it offers — the
 * font's default plus each alternate — of which the user picks one.
 */
export const CharacterVariantCard: React.FunctionComponent<{
  variant: CharacterVariant;
  fontFamily: string;
  sampleSize: number;
  /** 0 for the font's default form, or the 1-based alternate. */
  choice: number;
  onChoose: (choice: number) => void;
}> = ({ variant, fontFamily, sampleSize, choice, onChoose }) => {
  const theme = useTheme();

  // What to show in the tiles: the characters this feature affects, or the sample
  // text for the many fonts that don't list them.
  const sample =
    variant.characters.length > 0
      ? variant.characters.join("")
      : (usableSampleText(variant) ?? "");

  // A feature with named parameters offers several alternates; an unnamed one just
  // has the single "on" form.
  const alternates =
    variant.parameterLabels.length > 0
      ? variant.parameterLabels.map((label, i) => ({ value: i + 1, label }))
      : [{ value: 1, label: "alternate" }];

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography
          variant="subtitle2"
          css={css`
            margin-bottom: ${theme.spacing(1)};
          `}
        >
          {variant.label ?? `Character variant ${variant.number}`}
        </Typography>

        {sample && (
          <div
            css={css`
              display: flex;
              flex-wrap: wrap;
              gap: ${theme.spacing(1)};
            `}
          >
            <FormTile
              text={sample}
              fontFamily={fontFamily}
              fontSize={sampleSize}
              label="default"
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
                selected={choice === value}
                onClick={() => onChoose(value)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
