import { Typography } from "@mui/material";
import { START_OF_MATCH_MARKER, END_OF_MATCH_MARKER } from "../../common/matchingSubstringDemarcation";
import React from "react";

export const PartiallyBoldedTypography: React.FunctionComponent<{
  dangerouslySetDemarcatedText: string;
}> = ({ dangerouslySetDemarcatedText, children, ...props }) => {
  if (children) {
    // Typography cannot take both children and dangerouslySetInnerHTML
    console.error(
      "PartiallyBoldedTypography does not support children. Put text content in the dangerouslySetDemarcatedText prop instead."
    );
  }
  const htmlString = (dangerouslySetDemarcatedText ?? "")
    .replaceAll(START_OF_MATCH_MARKER, "<span style='font-weight: bold;'>") // needs ES2021
    .replaceAll(END_OF_MATCH_MARKER, "</span>");

  return (
    <Typography
      dangerouslySetInnerHTML={{ __html: htmlString }}
      {...props}
    ></Typography>
  );
};
