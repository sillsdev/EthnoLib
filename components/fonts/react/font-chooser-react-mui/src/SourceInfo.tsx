/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { Link, Tooltip } from "@mui/material";
import React from "react";
import { InfoCircleIcon } from "./icons";

/**
 * The quiet "i" keeps to the surrounding text's own color at reduced weight, so
 * it reads as a footnote mark, not a control, until pointed at.
 */
export const sourceIconCss = css`
  display: inline-flex;
  vertical-align: text-bottom;
  opacity: 0.55;
  transition: opacity 120ms;
  &:hover {
    opacity: 1;
  }
`;

/**
 * A small unfilled "i" that names, on hover, where a claim in the UI came from,
 * and takes the reader to the source in a new tab when there is a page to go to.
 *
 * Every one of these behaves the same way: the tooltip carries the whole answer,
 * and a click opens a separate tab — never a download, never a navigation of the
 * page the chooser is sitting in. So a `url` here must be a page a person can
 * read, not an API endpoint.
 */
export const SourceInfo: React.FunctionComponent<{
  /** The whole of what hovering should say, ending with the click invitation if `url` is set. */
  tooltip: string;
  ariaLabel: string;
  /** A human-readable page. Omit it and the icon still explains, but goes nowhere. */
  url?: string;
  size?: number;
  className?: string;
}> = ({ tooltip, ariaLabel, url, size = 13, className }) => (
  <Tooltip title={tooltip}>
    {url ? (
      <Link
        href={url}
        target="_blank"
        rel="noreferrer"
        color="inherit"
        aria-label={ariaLabel}
        // The icon sometimes sits inside another clickable thing (a form label,
        // say); its click is its own and must not double as the parent's.
        onClick={(event) => event.stopPropagation()}
        css={sourceIconCss}
        className={className}
      >
        <InfoCircleIcon size={size} />
      </Link>
    ) : (
      <span aria-label={ariaLabel} css={sourceIconCss} className={className}>
        <InfoCircleIcon size={size} />
      </span>
    )}
  </Tooltip>
);
