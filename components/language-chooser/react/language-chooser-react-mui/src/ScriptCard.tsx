/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { OptionCard, OptionCardProps } from "./OptionCard";
import { lighten, Typography, useTheme } from "@mui/material";
import { IScript, scriptSamples } from "@ethnolib/find-language";

export const ScriptCard: React.FunctionComponent<
  {
    scriptData: IScript;
  } & OptionCardProps
> = ({ scriptData, ...origOptionCardProps }) => {
  const theme = useTheme();
  const optionCardProps = {
    ...origOptionCardProps,
    backgroundColorWhenSelected:
      origOptionCardProps.backgroundColorWhenSelected ??
      lighten(theme.palette.primary.main, 0.88), // If color not provided, fall back to 88% of primary color
  } as OptionCardProps;
  return (
    <OptionCard {...optionCardProps}>
      <Typography
        variant="h2"
        data-testid={`script-card-${scriptData.scriptCode}`}
      >
        {scriptData.scriptName}
      </Typography>
      <Typography
        variant="subtitle1"
        css={css`
          color: ${theme.palette.grey[700]};
          min-height: 1.2em;
        `}
      >
        {scriptSamples[scriptData.scriptCode.toLowerCase()] || ""}
      </Typography>
    </OptionCard>
  );
};
