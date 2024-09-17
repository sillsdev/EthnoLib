import { Typography, TypographyProps } from "@mui/material";
import {
  START_OF_MATCH_MARKER,
  END_OF_MATCH_MARKER,
} from "@nabalones/find-language";
import React from "react";

function createNodeList(demarcatedText: string) {
  const startMarkerSplitSegments = demarcatedText.split(START_OF_MATCH_MARKER);
  const nodes = [];
  // demarcated text: a[b]c[d]e
  // startMarkerSplitSegments: a, b]c, d]e
  // endMarkerSplitSegments:
  //    a
  //    b, c
  //    d, e
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
    children: string;
  } & TypographyProps
> = ({ children, ...typographyProps }) => {
  const nodes = createNodeList(children || "");
  return <Typography {...typographyProps}>{...nodes}</Typography>;
};
