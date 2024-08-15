/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { CardContent, Card, CardActionArea } from "@mui/material";
import React, { PropsWithChildren } from "react";
import { COLORS } from "./colors";

export interface OptionCardProps {
  isSelected: boolean;
  backgroundColorWhenNotSelected?: string;
  backgroundColorWhenSelected?: string;
  className?: string;
  onClick?: () => void;
}

export type OptionCardPropsWithoutColors = Omit<
  OptionCardProps,
  "backgroundColorWhenNotSelected" | "backgroundColorWhenSelected"
>;

export const OptionCard: React.FunctionComponent<
  PropsWithChildren<OptionCardProps>
> = (props) => {
  const backgroundColor = props.isSelected
    ? props.backgroundColorWhenSelected || COLORS.white
    : props.backgroundColorWhenNotSelected || COLORS.white;
  return (
    <CardActionArea onClick={props.onClick || (() => {})}>
      <Card
        variant="outlined"
        css={css`
          position: relative; // so children can be positioned absolutely
          box-shadow: ${COLORS.greys[2]} 0px 5px 5px;
          background-color: ${backgroundColor};
        `}
        className={props.className}
      >
        <CardContent>{props.children}</CardContent>
      </Card>
    </CardActionArea>
  );
};
