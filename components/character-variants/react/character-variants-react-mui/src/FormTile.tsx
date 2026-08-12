/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { ButtonBase, Typography, useTheme } from "@mui/material";
import React from "react";

export interface FormTileProps {
  /** The characters to show, rendered in the font with this form applied. */
  text: string;
  fontFamily: string;
  fontSize: number;
  /** e.g. `"cv07" 2`; omit for the font's default form. */
  featureSetting?: string;
  /** The font's name for this form, or "default". */
  label: string;
  selected: boolean;
  onClick: () => void;
}

/** One selectable form of a character: the glyphs, big, with the form's name under them. */
export const FormTile: React.FunctionComponent<FormTileProps> = ({
  text,
  fontFamily,
  fontSize,
  featureSetting,
  label,
  selected,
  onClick,
}) => {
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
        min-width: ${Math.max(fontSize * 2, 96)}px;
        padding: ${theme.spacing(1)};
        border: 2px solid
          ${selected ? theme.palette.primary.main : theme.palette.divider};
        border-radius: 6px;
        background-color: ${selected
          ? theme.palette.action.selected
          : theme.palette.background.paper};

        &:hover {
          border-color: ${selected
            ? theme.palette.primary.dark
            : theme.palette.text.disabled};
        }
      `}
    >
      <span
        css={css`
          font-family: "${fontFamily}";
          font-size: ${fontSize}px;
          line-height: 1.25;
          // Only the form being shown should differ between the tiles.
          font-feature-settings: ${featureSetting ?? "normal"};
          white-space: pre-wrap;
        `}
      >
        {text}
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
