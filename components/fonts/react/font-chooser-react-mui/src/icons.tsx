/** @jsxImportSource @emotion/react */
import React from "react";

/**
 * The handful of small icons this screen needs, drawn inline.
 *
 * @mui/icons-material isn't a dependency of this repo, and pulling in a whole icon
 * font for four glyphs would be a poor trade; each of these is a few paths.
 *
 * Every one takes its color from the caller so the theme stays in charge.
 */

interface IconProps {
  size?: number;
  color?: string;
  /** Shown on hover and read out by screen readers. */
  title?: string;
  className?: string;
}

/** The font isn't on this machine yet: an arrow coming down into a tray. */
export const DownloadNeededIcon: React.FunctionComponent<IconProps> = ({
  size = 15,
  color = "currentColor",
  title,
  className,
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    role={title ? "img" : "presentation"}
    aria-hidden={title ? undefined : true}
  >
    {title && <title>{title}</title>}
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5 5 5-5" />
    <path d="M12 15V3" />
  </svg>
);

/** A filled circle with an exclamation mark: something about this font needs reading. */
export const AlertCircleIcon: React.FunctionComponent<IconProps> = ({
  size = 16,
  color = "currentColor",
  title,
  className,
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    role={title ? "img" : "presentation"}
    aria-hidden={title ? undefined : true}
  >
    {title && <title>{title}</title>}
    <circle cx="12" cy="12" r="10" fill={color} />
    <path
      d="M12 7.5v5"
      stroke="#fff"
      strokeWidth={2.2}
      strokeLinecap="round"
      fill="none"
    />
    <circle cx="12" cy="16.3" r="1.2" fill="#fff" />
  </svg>
);

/** A grey circle with a question mark: we can't tell what this font allows. */
export const UnknownRulesIcon: React.FunctionComponent<IconProps> = ({
  size = 16,
  color = "#9e9e9e",
  title,
  className,
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    role={title ? "img" : "presentation"}
    aria-hidden={title ? undefined : true}
  >
    {title && <title>{title}</title>}
    <circle cx="12" cy="12" r="10" fill={color} />
    <path
      d="M9.7 9.4a2.4 2.4 0 1 1 2.6 3.2v1.1"
      stroke="#fff"
      strokeWidth={2.1}
      strokeLinecap="round"
      fill="none"
    />
    <circle cx="12.3" cy="16.6" r="1.2" fill="#fff" />
  </svg>
);

/** A filled circle with a tick: nothing here to worry about. */
export const CheckCircleIcon: React.FunctionComponent<IconProps> = ({
  size = 16,
  color = "currentColor",
  title,
  className,
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    role={title ? "img" : "presentation"}
    aria-hidden={title ? undefined : true}
  >
    {title && <title>{title}</title>}
    <circle cx="12" cy="12" r="10" fill={color} />
    <path
      d="m8 12 3 3 5-6"
      stroke="#fff"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

/** The disclosure chevron; it points right when closed and down when open. */
export const ChevronIcon: React.FunctionComponent<
  IconProps & { open?: boolean }
> = ({ size = 16, color = "currentColor", open, className }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    style={{
      transform: open ? "rotate(90deg)" : undefined,
      transition: "transform 150ms",
    }}
  >
    <path d="m9 6 6 6-6 6" />
  </svg>
);
