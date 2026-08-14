/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { alpha, useTheme } from "@mui/material";
import React from "react";
import {
  AlertCircleIcon,
  InfoCircleIcon,
  OpenSourceIcon,
  UnknownRulesIcon,
  VouchedForIcon,
} from "./icons";

export type CalloutVariant =
  /** Somebody who knows the language says this font writes it. */
  | "vouched"
  /** Something we worked out about the font ourselves, and nothing more. */
  | "info"
  | "open-license"
  | "warn"
  | "error"
  | "unknown"
  | "download";

export interface CalloutProps {
  variant: CalloutVariant;
  /** A button or link shown at the right-hand end of the row. */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * One tinted row saying something about the font in front of the user: what its
 * licence allows, whether it can write their alphabet, whether it is even here yet.
 *
 * They all look alike on purpose — the icon and the tint carry how much attention
 * the line wants, and the words carry the rest.
 */
export const Callout: React.FunctionComponent<CalloutProps> = ({
  variant,
  action,
  children,
  className,
}) => {
  const theme = useTheme();
  const { background, icon } = useCalloutLook(variant);

  return (
    <div
      className={className}
      css={css`
        display: flex;
        align-items: flex-start;
        gap: 9px;
        padding: 11px 12px;
        border-radius: ${theme.shape.borderRadius}px;
        background-color: ${background};
        font-size: 12.5px;
        line-height: 1.45;
        color: ${theme.palette.text.primary};
      `}
    >
      {icon && (
        <span
          css={css`
            display: flex;
            flex: none;
            // Sit the icon on the first line of text rather than above it.
            padding-top: 1px;
          `}
        >
          {icon}
        </span>
      )}
      <div
        css={css`
          flex: 1;
        `}
      >
        {children}
      </div>
      {action && (
        <span
          css={css`
            flex: none;
          `}
        >
          {action}
        </span>
      )}
    </div>
  );
};

function useCalloutLook(variant: CalloutVariant): {
  background: string;
  icon: React.ReactNode;
} {
  const theme = useTheme();
  switch (variant) {
    case "vouched":
      return {
        background: alpha(theme.palette.primary.main, 0.09),
        icon: <VouchedForIcon color={theme.palette.primary.main} />,
      };
    case "info":
      return {
        background: alpha(theme.palette.primary.main, 0.09),
        icon: <InfoCircleIcon color={theme.palette.primary.main} />,
      };
    // Said with the open-source mark in its own greens, on a pale green to
    // match, since that is what the line is actually about.
    case "open-license":
      return {
        background: "#EAF3EA",
        icon: <OpenSourceIcon />,
      };
    case "warn":
      return {
        background: alpha(theme.palette.warning.main, 0.14),
        icon: <AlertCircleIcon color={theme.palette.warning.main} />,
      };
    case "error":
      return {
        background: alpha(theme.palette.error.main, 0.12),
        icon: <AlertCircleIcon color={theme.palette.error.main} />,
      };
    case "unknown":
      return {
        background: alpha(theme.palette.warning.main, 0.14),
        icon: <UnknownRulesIcon />,
      };
    case "download":
      // No icon: the button at the other end of the row is a download button
      // with the same arrow on it, and two of them in one line is one too many.
      return {
        background: alpha(theme.palette.secondary.main, 0.1),
        icon: undefined,
      };
  }
}
