import { Typography, TypographyProps } from "@mui/material";
import {
  START_OF_MATCH_MARKER,
  END_OF_MATCH_MARKER,
} from "@ethnolib/find-language";
import React from "react";

export const PartiallyBoldedTypography: React.FunctionComponent<
  {
    dangerouslySetDemarcatedText: string;
  } & TypographyProps
> = ({ dangerouslySetDemarcatedText, children, ...typographyProps }) => {
  if (children) {
    // Typography cannot take both children and dangerouslySetInnerHTML
    console.error(
      "PartiallyBoldedTypography does not support children. Put text content in the dangerouslySetDemarcatedText prop instead."
    );
  }
  const htmlString = (dangerouslySetDemarcatedText ?? "")
    .replaceAll(START_OF_MATCH_MARKER, "<><span style='font-weight: bold;'>") // needs ES2021
    .replaceAll(END_OF_MATCH_MARKER, "</span><>");
  const pieces = htmlString.split("<>");

  //   return (
  //     <Typography
  //       dangerouslySetInnerHTML={{ __html: htmlString }}
  //       {...typographyProps}
  //     ></Typography>
  //   );
  // };

  // e[ngl]ish
  // e<span style='font-weight: bold;'>ngl</span>ish
  //[<span>e</span>, <span style='font-weight: bold;'>ngl</span>, <span>ish</span>]
  // [e, <span style='font-weight: bold;'>ngl</span>, ish]
  // combine these all into a typography
  // const textPiecesList = htmlString.split(
  //   /<span style='font-weight: bold;'>|<\/span>/
  // );
  // const textPieces = textPiecesList.map((textPiece, index) => {
  //   if (index % 2 === 0) {
  //     return textPiece;
  //   } else {
  //     return <span style={{ fontWeight: "bold" }}>{textPiece}</span>;
  //   }
  // });
  // const combinedTypography = (
  //   <Typography {...typographyProps}>{...textPieces}</Typography>
  // );
  // TODO work on some implementation that doesn't use dangerouslySetInnerHTML
  // don't forget to rename dangerouslySetDemarcatedText to something more appropriate
  {
    /* <Typography {...typographyProps}>
    {htmlString.split(START_OF_MATCH_MARKER).map((part, index) => {
      if (index === 0) {
        return part;
      }
      const [markedPart, rest] = part.split(END_OF_MATCH_MARKER);
      return (
        <>
          <span style={{ fontWeight: "bold" }}>{markedPart}</span>
          {rest}
        </>
      );
    })}
    </Typography> */
  }
  // const pieces = htmlString.split(
  // const a = ["a", <span style={{ fontWeight: "bold" }}>b</span>, "c"];
  return <Typography>{...pieces}</Typography>;
};
