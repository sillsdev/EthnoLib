/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { CardContent, Card, CardActionArea } from "@mui/material";
import React from "react";
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
  { children: React.ReactNode } & OptionCardProps
> = (props) => {
  const backgroundColor = props.isSelected
    ? props.backgroundColorWhenSelected || COLORS.white
    : props.backgroundColorWhenNotSelected || COLORS.white;
  return (
    <CardActionArea onClick={props.onClick || (() => undefined)}>
      <Card
        variant="outlined"
        css={css`
          position: relative; // so children can be positioned absolutely
          box-shadow: ${COLORS.greys[2]} 0px 3px 5px;
          background-color: ${backgroundColor};
        `}
        className={props.className}
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
          {props.children}
        </CardContent>
      </Card>
    </CardActionArea>
  );
};
