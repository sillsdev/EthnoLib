import {
  OptionCard,
  OptionCardProps,
  OptionCardPropsWithoutColors,
} from "./OptionCard";
import { Typography } from "@mui/material";
import { IScript } from "@nabalones/find-language";
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
      <Typography variant="h5">{scriptData.name}</Typography>
      <Typography variant="body2">TODO sample text here</Typography>
    </OptionCard>
  );
};
