import { OptionCard, OptionCardProps } from "./OptionCard";
import { Typography } from "@mui/material";
import { IScript } from "@ethnolib/find-language";

export const ScriptCard: React.FunctionComponent<
  { scriptData: IScript } & OptionCardProps
> = ({ scriptData, ...optionCardProps }) => {
  return (
    <OptionCard {...optionCardProps}>
      <Typography variant="h5">{scriptData.name}</Typography>
      <Typography variant="body2">TODO sample text</Typography>
    </OptionCard>
  );
};
