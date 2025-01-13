/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import {
  CardContent,
  Card,
  CardActionArea,
  PaletteColor,
  useTheme,
} from "@mui/material";
import React from "react";

export interface OptionCardProps {
  isSelected: boolean;
  backgroundColorWhenNotSelected?: string | PaletteColor;
  backgroundColorWhenSelected?: string;
  className?: string;
  onClick?: () => void;
}

export type OptionCardPropsWithoutColors = Omit<
  OptionCardProps,
  "backgroundColorWhenNotSelected" | "backgroundColorWhenSelected"
>;

export const OptionCard: React.FunctionComponent<
  { children: React.ReactNode } & OptionCardProps
> = ({
  children,
  isSelected,
  backgroundColorWhenNotSelected,
  backgroundColorWhenSelected,
  onClick,
  className,
}) => {
  const theme = useTheme();
  const backgroundColor = isSelected
    ? backgroundColorWhenSelected || theme.palette.grey["400"]
    : backgroundColorWhenNotSelected || theme.palette.background.paper;
  return (
    <CardActionArea
      onClick={onClick || (() => undefined)}
      className={`option-card-button ${isSelected && "selected-option-card-button"} ${className}`}
    >
      <Card
        variant="outlined"
        css={css`
          position: relative; // so children can be positioned absolutely
          box-shadow: ${theme.palette.grey[400]} 0px 3px 5px;
        `}
        sx={{
          bgcolor: `${backgroundColor}`,
        }}
      >
        <CardContent
          css={css`
            padding: 10px;
            :last-child {
              // otherwise mui puts a lot of bottom padding on the last child
              padding-bottom: 15px;
            }
          `}
        >
          {children}
        </CardContent>
      </Card>
    </CardActionArea>
  );
};
