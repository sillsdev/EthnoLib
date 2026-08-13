/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { Typography, useTheme } from "@mui/material";
import React from "react";

/**
 * The name of one section of the details pane: "Example", "Letter Shape Choices".
 *
 * They were set a size and a half-step of weight above the text around them, which
 * on a pane this dense read as another line of prose rather than as the top of
 * something. So they are set the way a section label is set — small, bold, spaced
 * and in capitals — which reads as a heading at any size and cannot be mistaken
 * for the content under it.
 *
 * A real `<h3>`, too. The pane is a section of a dialog, so its parts sit a level
 * below the dialog's own name.
 */
export const SectionHeading: React.FunctionComponent<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  const theme = useTheme();
  return (
    <Typography
      variant="h3"
      component="h3"
      className={className}
      css={css`
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.09em;
        text-transform: uppercase;
        color: ${theme.palette.text.secondary};
        margin-bottom: 10px;
      `}
    >
      {children}
    </Typography>
  );
};
