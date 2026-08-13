/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { alpha, useTheme } from "@mui/material";
import React from "react";
import { DEFAULT_SAMPLE_SIZE, FormTile, scaledPx } from "./FormTile";
import type { ShapeInfo } from "./ShapeInfoLine";
import type { VariantForm, VariantGroup } from "./variantGroups";

/** The row's spacing, as multiples of the sample glyph's size. See FormTile.tsx. */
const OF_FONT_SIZE = { gap: 0.25, padding: 0.25, radius: 0.16 };

/**
 * One row of forms of a character: a tile for the font's default and one for each
 * alternate on offer, of which the user picks one. Which features those alternates
 * come from is not on screen — often they come from several, see variantGroups.ts
 * — because the shapes are what there is to choose between. The names reach a
 * screen reader through each tile's label, and a caller listening to
 * `onHoverChange`.
 */
export const CharacterVariantCard: React.FunctionComponent<{
  group: VariantGroup;
  fontFamily: string;
  /** Passed straight to the tiles, which decide the size when nobody says. */
  sampleSize?: number;
  /** The form in force, or undefined for the font's own. */
  chosen?: VariantForm;
  /** Called with the form picked, or nothing for the font's own. */
  onChoose: (form?: VariantForm) => void;
  /** Told what the tile under the pointer is, and told null when it leaves. */
  onHoverChange?: (info: ShapeInfo | null) => void;
}> = ({
  group,
  fontFamily,
  sampleSize,
  chosen,
  onChoose,
  onHoverChange,
}) => {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  // The row's own spacing is in the same currency as the tiles': multiples of the
  // sample's size, so one number sizes the whole control.
  const size = sampleSize ?? DEFAULT_SAMPLE_SIZE;

  if (!group.sample) return null;

  return (
    <div
      css={css`
        display: flex;
        flex-wrap: wrap;
        gap: ${scaledPx(size, OF_FONT_SIZE.gap)};
        /* Just enough to hold one row's forms together once rows sit side
           by side. A hairline and a little air, nothing that competes with the
           tiles' own borders. Tinted with the theme's primary — Bloom blue in
           Bloom — so the grouping reads as part of the app rather than as a
           table rule. */
        padding: ${scaledPx(size, OF_FONT_SIZE.padding)};
        border: 1px solid ${alpha(primary, 0.4)};
        border-radius: ${scaledPx(size, OF_FONT_SIZE.radius)};
        /* A row wider than the line wraps its own tiles rather than pushing the
           pane sideways. */
        max-width: 100%;
      `}
    >
      <FormTile
        text={group.sample}
        fontFamily={fontFamily}
        fontSize={sampleSize}
        label="Default"
        groupLabel={group.label}
        onHoverChange={onHoverChange}
        selected={!chosen}
        onClick={() => onChoose(undefined)}
      />
      {group.forms.map((form) => (
        <FormTile
          key={`${form.tag} ${form.value}`}
          text={group.sample}
          fontFamily={fontFamily}
          fontSize={sampleSize}
          featureSetting={`"${form.tag}" ${form.value}`}
          label={form.label}
          groupLabel={group.label}
          onHoverChange={onHoverChange}
          selected={chosen === form}
          onClick={() => onChoose(form)}
        />
      ))}
    </div>
  );
};
