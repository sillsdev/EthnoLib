/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import {
  OptionCard,
  OptionCardProps,
  OptionCardPropsWithoutColors,
} from "./OptionCard";
import { Typography } from "@mui/material";
import { IScript } from "@ethnolib/find-language";
import { COLORS } from "./colors";

export const ScriptCard: React.FunctionComponent<
  { scriptData: IScript } & OptionCardPropsWithoutColors
> = ({ scriptData, ...partialOptionCardProps }) => {
  const optionCardProps = {
    ...partialOptionCardProps,
    backgroundColorWhenNotSelected: COLORS.white,
    backgroundColorWhenSelected: COLORS.blues[1],
  } as OptionCardProps;
  return (
    <OptionCard {...optionCardProps}>
      <Typography
        css={css`
          font-size: 16px;
        `}
      >
        {scriptData.name}
      </Typography>
      <Typography
        css={css`
          font-size: 16px;
          color: ${COLORS.greys[3]};
        `}
      >
        TODO sample text here
      </Typography>
    </OptionCard>
  );
};
