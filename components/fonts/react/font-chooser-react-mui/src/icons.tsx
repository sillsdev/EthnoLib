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

/**
 * A filled circle with an "i": something we worked out ourselves rather than
 * something anybody vouched for. Covering the alphabet is a fact about the
 * font's character set, and a tick would read as approval of a font nobody has
 * looked at.
 */
export const InfoCircleIcon: React.FunctionComponent<IconProps> = ({
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
    {/* Outlined rather than filled, so it carries less weight than the solid tick
        beside it — which is the difference the two lines are making. */}
    <path
      d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
      fill={color}
    />
  </svg>
);

/**
 * A filled circle with a tick: somebody who knows the language has said this font
 * writes it. The alphabet check next to it uses the "i" above instead, so the two
 * claims stay apart when both are on screen.
 */
export const VouchedForIcon: React.FunctionComponent<IconProps> = ({
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

/**
 * The open-source mark — the ring with the gap at the top, as on opensource.org —
 * for a font whose licence lets the user do what they like with it. A tick would
 * say only "this is fine"; this says which kind of fine it is, and readers who
 * know the mark know the rest without reading the line.
 */
export const OpenSourceIcon: React.FunctionComponent<IconProps> = ({
  size = 15,
  color = "currentColor",
  title,
  className,
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 15 15"
    fill="none"
    role={title ? "img" : "presentation"}
    aria-hidden={title ? undefined : true}
  >
    {title && <title>{title}</title>}
    <path
      d="M7.455 0.000999987C3.344 0.000999987 0 3.346 0 7.456C0 10.5875 1.94 13.2735 4.68 14.376L6.5 9.838C5.94666 9.61638 5.48776 9.20899 5.20213 8.68582C4.91649 8.16264 4.82194 7.55633 4.93471 6.97103C5.04749 6.38572 5.36055 5.85796 5.82014 5.47837C6.27972 5.09879 6.85713 4.89108 7.4532 4.89092C8.04927 4.89077 8.6268 5.09817 9.08658 5.47752C9.54636 5.85686 9.8597 6.38446 9.97278 6.96971C10.0859 7.55496 9.99163 8.16131 9.70627 8.68464C9.42091 9.20796 8.96222 9.61559 8.409 9.8375L10.229 14.375C12.969 13.272 14.909 10.586 14.909 7.455C14.91 3.345 11.5655 0 7.455 0V0.000999987Z"
      fill={color}
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
