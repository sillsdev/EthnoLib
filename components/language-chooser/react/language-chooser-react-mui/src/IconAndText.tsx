import { Stack, StackProps } from "@mui/material";
import { ReactElement } from "react";

export const IconAndText: React.FunctionComponent<
  {
    icon: ReactElement;
    text: ReactElement | string;
  } & StackProps
> = ({ icon, text, ...stackProps }) => {
  return (
    <Stack {...stackProps} alignItems="center" direction="row" gap={0.5}>
      {icon}
      {text}
    </Stack>
  );
};
