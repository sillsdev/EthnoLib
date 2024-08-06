/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { CardContent, Card } from "@mui/material";
import React, { PropsWithChildren } from "react";
import { COLORS } from "./Colors";
import { ClickAwayListener } from "@mui/base/ClickAwayListener";

export interface EthnolibCardProps {
  isSelected: boolean;
  //   childrenWhenSelected: React.ReactNode[];
  colorWhenNotSelected: string;
  colorWhenSelected: string;
  className?: string;
  onClickAway?: () => void;
}

export const EthnolibCard: React.FunctionComponent<
  PropsWithChildren<EthnolibCardProps>
> = (props) => {
  const backgroundColor = props.isSelected
    ? props.colorWhenSelected
    : props.colorWhenNotSelected;
  return (
    <ClickAwayListener onClickAway={props.onClickAway || (() => {})}>
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
    </ClickAwayListener>
  );
};
