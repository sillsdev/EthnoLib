import { EthnolibCard, EthnolibCardProps } from "./EthnolibCard";
import { Typography } from "@mui/material";
import { IScript } from "@ethnolib/find-language";

export const ScriptCard: React.FunctionComponent<
  { scriptData: IScript } & EthnolibCardProps
> = ({ scriptData, ...ethnolibCardProps }) => {
  return (
    <EthnolibCard {...ethnolibCardProps}>
      <Typography variant="h5">{scriptData.name}</Typography>
      <Typography variant="body2">TODO sample text</Typography>
    </EthnolibCard>
  );
};
