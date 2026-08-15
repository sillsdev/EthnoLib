/**
 * Fonts the host app ships with itself, as the demo's stand-in for them.
 *
 * The case this is here for: an app installed on a machine that may never see
 * the network — Bloom on a field laptop, an Electron app on a school's
 * desktop — carries a few font files in its own installation and can hand them
 * to the chooser off disk. That is the difference between an offline chooser
 * that can only offer what is already installed and one that can offer, preview
 * and hand over a font the user has never had.
 *
 * Two files, both OFL, sitting in the demo's `public/fonts`: Andika, a literacy
 * font with the Latin letters minority orthographies need, and Noto Sans Thai,
 * so there is a non-Latin one to switch languages to. They are served from the
 * demo's own origin, which is what makes this a fair simulation: the connection
 * simulator leaves same-origin requests alone (see networkSimulation.ts), so
 * with the connection switched to Offline these two stay readable exactly as a
 * file on disk would.
 *
 * This module is only the list. What it takes to make the chooser treat these as
 * fonts the machine has — listing them, reading them, registering them with the
 * browser — is in hostFontLibrary.ts, which does the same for the fonts the app
 * has been handed and kept.
 *
 * Nothing here is part of the published component.
 */

/** One font file the pretend host app ships. */
export interface HostBundledFont {
  family: string;
  /** As the file's own `name` table gives it. */
  postscriptName: string;
  /** Relative to the page, so this works under the built site's relative base. */
  path: string;
}

export const HOST_BUNDLED_FONTS: HostBundledFont[] = [
  {
    family: "Andika",
    postscriptName: "Andika",
    path: "fonts/Andika-Regular.ttf",
  },
  {
    family: "Noto Sans Thai",
    postscriptName: "NotoSansThai-Regular",
    path: "fonts/NotoSansThai-Regular.ttf",
  },
];

export function bundledFontUrl(font: HostBundledFont): string {
  return new URL(font.path, document.baseURI).href;
}
