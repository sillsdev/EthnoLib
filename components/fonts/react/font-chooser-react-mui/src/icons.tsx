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

/**
 * A filled triangle with an exclamation mark: this font's licence says no to
 * something the user is about to do.
 *
 * The triangle rather than the circle because this is the mark Bloom already
 * puts beside a problem font in its Book Settings fonts table, and a user who
 * meets the same font in both places should meet the same warning.
 */
export const AlertTriangleIcon: React.FunctionComponent<IconProps> = ({
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
    {/* Rounded corners, so the shape doesn't read as sharper than the circles
        it sits alongside at this size. */}
    <path
      d="M12 2.9c.62 0 1.2.33 1.51.87l8.2 14.2a1.75 1.75 0 0 1-1.51 2.63H3.8a1.75 1.75 0 0 1-1.51-2.63l8.2-14.2c.31-.54.89-.87 1.51-.87Z"
      fill={color}
    />
    <path
      d="M12 9v4.4"
      stroke="#fff"
      strokeWidth={2.2}
      strokeLinecap="round"
      fill="none"
    />
    <circle cx="12" cy="17.1" r="1.2" fill="#fff" />
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
 * The same tick drawn hollow — an outlined circle rather than a filled one — for
 * saying "recommended for your language" beside every such font in the list.
 * There it sits on row after row, and the filled mark at that repetition stops
 * reading as an endorsement and starts reading as decoration.
 */
export const VouchedForOutlineIcon: React.FunctionComponent<IconProps> = ({
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
    fill="none"
    role={title ? "img" : "presentation"}
    aria-hidden={title ? undefined : true}
  >
    {title && <title>{title}</title>}
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke={color}
      strokeWidth={1.8}
      fill="none"
    />
    <path
      d="m8 12 3 3 5-6"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

/**
 * The open-source mark — the keyhole ring, as on opensource.org — for a font
 * whose licence lets the user do what they like with it. A tick would say only
 * "this is fine"; this says which kind of fine it is, and readers who know the
 * mark know the rest without reading the line.
 *
 * The artwork keeps its own greens: the mark is a mark, drawn in its own colors,
 * not tinted to match a theme. So unlike the other icons here it takes no color.
 */
export const OpenSourceIcon: React.FunctionComponent<
  Omit<IconProps, "color">
> = ({ size = 16, title, className }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    role={title ? "img" : "presentation"}
    aria-hidden={title ? undefined : true}
  >
    {title && <title>{title}</title>}
    <path
      d="M8.92803 10.8374C10.0374 10.4249 10.6155 9.63115 10.6155 8.26553C10.6155 6.8999 9.4624 5.69678 8.0249 5.69365C6.50615 5.69053 5.35928 6.89365 5.38115 8.26553C5.3999 9.6374 6.05303 10.5468 7.0999 10.878L5.24365 15.4405C2.76865 14.7999 0.243652 11.8749 0.243652 8.27178C0.243652 3.9999 3.6749 0.540527 7.97178 0.540527C12.2687 0.540527 15.7562 3.9999 15.7562 8.27178C15.7562 11.9343 13.2562 14.8218 10.7218 15.4593L8.92803 10.8374Z"
      fill="#3DA638"
    />
    <path
      d="M10.7219 15.7031C10.625 15.7031 10.5312 15.6437 10.4969 15.5469L8.70312 10.925C8.67812 10.8656 8.68125 10.7969 8.70938 10.7375C8.7375 10.6781 8.78438 10.6312 8.84688 10.6094C9.90625 10.2156 10.3781 9.49062 10.3781 8.2625C10.3781 7.00312 9.30312 5.93438 8.02812 5.93125H8.02188C7.35625 5.93125 6.74062 6.18438 6.2875 6.64375C5.85312 7.08438 5.61875 7.65625 5.625 8.25625C5.64062 9.48438 6.19063 10.3313 7.17188 10.6406C7.2375 10.6625 7.29062 10.7063 7.31875 10.7688C7.34687 10.8313 7.35 10.9 7.325 10.9625L5.46875 15.5312C5.42188 15.6437 5.3 15.7063 5.18437 15.675C3.88437 15.3375 2.5875 14.4031 1.62188 13.1125C0.575 11.7094 0 9.99063 0 8.27188C0 6.1375 0.825 4.1375 2.325 2.63438C3.825 1.12813 5.83125 0.296875 7.97188 0.296875C10.1156 0.296875 12.1313 1.125 13.6469 2.63125C15.1625 4.1375 15.9969 6.14063 15.9969 8.26875C15.9969 10.0188 15.4219 11.75 14.3813 13.1406C13.4188 14.4281 12.1062 15.3563 10.7781 15.6906C10.7625 15.7 10.7406 15.7031 10.7219 15.7031ZM9.24063 10.9719L10.8687 15.1656C13.1875 14.4625 15.5156 11.7563 15.5156 8.27188C15.5156 4.14375 12.1312 0.784375 7.975 0.784375C3.84375 0.784375 0.484375 4.14375 0.484375 8.27188C0.484375 9.8875 1.025 11.5031 2.00938 12.8219C2.85625 13.9594 3.975 14.7969 5.1 15.1469L6.77812 11.0188C5.75 10.5844 5.15625 9.59688 5.1375 8.26875C5.12812 7.5375 5.4125 6.84063 5.94063 6.30625C6.4875 5.75313 7.225 5.45 8.02188 5.45H8.02812C8.78125 5.45312 9.49688 5.75313 10.0344 6.29688C10.5594 6.825 10.8594 7.54375 10.8594 8.26562C10.8625 9.59687 10.3313 10.4844 9.24063 10.9719Z"
      fill="#1C511C"
    />
  </svg>
);

/*
 * Where a font's bytes are — the three marks the list shows on the row under the
 * pointer. Drawn in one line weight and one size so that running an eye down the
 * list, they read as three answers to one question rather than three unrelated
 * symbols.
 */

/** A monitor: the operating system has this font, so every app here can use it. */
export const InstalledFontIcon: React.FunctionComponent<IconProps> = ({
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
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    role={title ? "img" : "presentation"}
    aria-hidden={title ? undefined : true}
  >
    {title && <title>{title}</title>}
    <rect x="2.5" y="4" width="19" height="12.5" rx="1.5" />
    <path d="M8.5 20.5h7" />
    <path d="M12 16.5v4" />
  </svg>
);

/** A folder: a font file that is here to read, but not installed. */
export const OnDiskFontIcon: React.FunctionComponent<IconProps> = ({
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
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    role={title ? "img" : "presentation"}
    aria-hidden={title ? undefined : true}
  >
    {title && <title>{title}</title>}
    <path d="M3 19.5V5.5a1 1 0 0 1 1-1h5l2 2.5h8a1 1 0 0 1 1 1v11.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
  </svg>
);

/** A globe: the font is out on the internet, not on this machine. */
export const NetworkFontIcon: React.FunctionComponent<IconProps> = ({
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
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    role={title ? "img" : "presentation"}
    aria-hidden={title ? undefined : true}
  >
    {title && <title>{title}</title>}
    <circle cx="12" cy="12" r="9" />
    <path d="M3.2 9.5h17.6M3.2 14.5h17.6" />
    {/* The meridians: the same ellipse mirrored, which is what makes a circle
        read as a globe rather than as a target. */}
    <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" />
  </svg>
);

/**
 * Wifi arcs with a stroke through them: there is no connection, so whatever this
 * sits on cannot run. Used beside controls that stay in place while offline, so
 * that a greyed-out button says why it is greyed out.
 */
export const WifiOffIcon: React.FunctionComponent<IconProps> = ({
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
    fill="none"
    stroke={color}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    role={title ? "img" : "presentation"}
    aria-hidden={title ? undefined : true}
  >
    {title && <title>{title}</title>}
    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
    <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
    <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
    <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <path d="M12 20h.01" />
    <path d="M1 1l22 22" />
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
