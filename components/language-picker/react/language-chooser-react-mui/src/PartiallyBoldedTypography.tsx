import { Typography, TypographyProps } from "@mui/material";
import {
  START_OF_MATCH_MARKER,
  END_OF_MATCH_MARKER,
} from "@ethnolib/find-language";
import React from "react";

function createNodesList(demarcatedText: string) {
  const startMarkerSplitSegments = demarcatedText.split(START_OF_MATCH_MARKER);

  const nodes = [];
  for (const piece of startMarkerSplitSegments) {
    const endMarkerSplitSegments = piece.split(END_OF_MATCH_MARKER);
    if (endMarkerSplitSegments.length === 1) {
      nodes.push(endMarkerSplitSegments[0]);
    } else {
      nodes.push(
        <span style={{ fontWeight: "bold" }}>{endMarkerSplitSegments[0]}</span>
      );
      nodes.push(endMarkerSplitSegments[1]);
    }
  }
  return nodes;
}

export const PartiallyBoldedTypography: React.FunctionComponent<
  {
    demarcatedText: string;
  } & TypographyProps
> = ({ demarcatedText, children, ...typographyProps }) => {
  const nodes = createNodesList(demarcatedText);

  return <Typography {...typographyProps}>{...nodes}</Typography>;
};
