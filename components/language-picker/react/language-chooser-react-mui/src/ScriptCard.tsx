import { EthnolibCard, EthnolibCardProps } from "./EthnolibCard";
import { Typography } from "@mui/material";
import { IScript } from "@ethnolib/find-language";

interface ScriptCardProps extends EthnolibCardProps {
  scriptData: IScript;
}

export const ScriptCard: React.FunctionComponent<ScriptCardProps> = (props) => {
  return (
    <EthnolibCard {...props}>
      <Typography variant="h5">{props.scriptData.name}</Typography>
      <Typography variant="body2">TODO sample text</Typography>
    </EthnolibCard>
  );
};
