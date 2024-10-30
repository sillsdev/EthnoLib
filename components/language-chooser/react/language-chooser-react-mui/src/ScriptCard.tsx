/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import {
  OptionCard,
  OptionCardProps,
  OptionCardPropsWithoutColors,
} from "./OptionCard";
import { Typography } from "@mui/material";
import { IScript, scriptSamples } from "@ethnolib/find-language";
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
      <Typography variant="h2">{scriptData.name}</Typography>
      <Typography
        variant="subtitle1"
        css={css`
          color: ${COLORS.greys[3]};
        `}
      >
        {scriptSamples[scriptData.code.toLowerCase()] || ""}
      </Typography>
    </OptionCard>
  );
};
