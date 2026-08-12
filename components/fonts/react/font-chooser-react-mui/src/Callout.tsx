/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { alpha, useTheme } from "@mui/material";
import React from "react";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  DownloadNeededIcon,
  UnknownRulesIcon,
} from "./icons";

export type CalloutVariant = "ok" | "warn" | "error" | "unknown" | "download";

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
    case "ok":
      return {
        background: alpha(theme.palette.primary.main, 0.09),
        icon: <CheckCircleIcon color={theme.palette.primary.main} />,
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
      return {
        background: alpha(theme.palette.secondary.main, 0.1),
        icon: (
          <DownloadNeededIcon size={16} color={theme.palette.secondary.main} />
        ),
      };
  }
}
