/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import {
  OptionCard,
  OptionCardProps,
  OptionCardPropsWithoutColors,
} from "./OptionCard";
import { Typography, useTheme } from "@mui/material";
import { IScript, scriptSamples } from "@ethnolib/find-language";

export const ScriptCard: React.FunctionComponent<
  { scriptData: IScript } & OptionCardPropsWithoutColors
> = ({ scriptData, ...partialOptionCardProps }) => {
  const theme = useTheme();
  const optionCardProps = {
    ...partialOptionCardProps,
    backgroundColorWhenNotSelected: theme.palette.background.paper,
    backgroundColorWhenSelected: theme.palette.primary.lightest,
  } as OptionCardProps;
  return (
    <OptionCard
      {...optionCardProps}
      buttonTestId={`script-card-${scriptData.code}`}
    >
      <Typography variant="h2">{scriptData.name}</Typography>
      <Typography
        variant="subtitle1"
        css={css`
          color: ${theme.palette.grey[700]};
          min-height: 1.2em;
        `}
      >
        {scriptSamples[scriptData.code.toLowerCase()] || ""}
      </Typography>
    </OptionCard>
  );
};
