import { Stack, StackProps } from "@mui/material";
import { ReactElement } from "react";

export const IconAndText: React.FunctionComponent<
  {
    icon: ReactElement;
    textElement: ReactElement;
  } & StackProps
> = ({ icon, textElement, ...stackProps }) => {
  return (
    <Stack {...stackProps} alignItems="center" direction="row" gap={0.5}>
      {icon}
      {textElement}
    </Stack>
  );
};
