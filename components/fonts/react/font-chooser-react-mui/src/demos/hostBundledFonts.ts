/**
 * Fonts the host app ships with itself, as the demo's stand-in for them.
 *
 * The case this is here for: an app installed on a machine that may never see
 * the network — Bloom on a field laptop, an Electron app on a school's
 * desktop — carries font files in its own installation and can hand them to the
 * chooser off disk. That is the difference between an offline chooser that can
 * only offer what is already installed and one that can offer, preview and hand
 * over a font the user has never had.
 *
 * What it ships is the "minimum bundle": twenty families picked by greedy
 * language coverage over the language/font data bundled into
 * @ethnolib/font-core, plus Andika for literacy, each in every style its
 * publisher puts out — 46 files, about 7 MB compressed. Deciding that list is
 * not this module's job and neither is fetching it; both live in
 * `tools/fetchMinimumFontBundle.mjs`, which writes the files and the manifest
 * this module reads. Changing the bundle is a change to that script's list and
 * a re-run, and nothing here.
 *
 * The files sit in the demo's own `public/fonts`, so they are served from its
 * own origin. That is what makes this a fair simulation: the connection
 * simulator leaves same-origin requests alone (see networkSimulation.ts), so
 * with the connection switched to Offline they stay readable exactly as a file
 * on disk would.
 *
 * This module is only the manifest. What it takes to make the chooser treat
 * these as fonts the machine has — listing them, reading them, registering them
 * with the browser — is in hostFontLibrary.ts, which does the same for the
 * fonts the app has been handed and kept.
 *
 * Nothing here is part of the published component.
 */

import {
  parseFamilyFacts,
  type DeclaredFamilyFacts,
  type SerializedFamilyFacts,
} from "@ethnolib/font-core";

/** Which of the four styles a face is, as the manifest writes it. */
export type BundledStyle = "R" | "B" | "I" | "BI";

/** One font file the pretend host app ships. */
export interface BundledFace {
  style: BundledStyle;
  /** Relative to `public/fonts`, which is where the fetch script puts it. */
  file: string;
  /** As the demo uses it: the handle `getFontData` and the shim pass around. */
  postscriptName: string;
  weight: number;
  italic: boolean;
  bytes: number;
}

/** One family the app ships, in every style the bundle carries for it. */
export interface BundledFamily {
  /** The display name, which is also what the suggestion data calls it. */
  family: string;
  /** Its id in silnrsi/fonts' families.json. */
  familyid: string;
  /** "OFL" for everything in the bundle; see public/fonts/README.md. */
  license: string;
  /**
   * What the fetch script read out of this family's regular face: its licence,
   * its coverage and its character variants, in the JSON form
   * `parseFamilyFacts` reads back. This is the whole reason the chooser can list
   * the bundle without parsing 26 font files first.
   */
  facts?: SerializedFamilyFacts;
  /** Regular first, then whichever of bold, italic and bold italic exist. */
  styles: BundledFace[];
}

interface BundleManifest {
  generatedAt: string;
  source: string;
  families: BundledFamily[];
}

/** Where the manifest is served from, relative so a built site's base works. */
const MANIFEST_PATH = "fonts/bundleManifest.json";

/**
 * The bundle, read once per page.
 *
 * Cached as the promise rather than the result so that two callers asking
 * before either has an answer share the one request. A failed read is not
 * cached — the toggle going on again should try again.
 */
let manifestRequest: Promise<BundledFamily[]> | undefined;

export function loadBundledFonts(): Promise<BundledFamily[]> {
  if (!manifestRequest) {
    manifestRequest = readManifest().catch((error) => {
      manifestRequest = undefined;
      throw error;
    });
  }
  return manifestRequest;
}

async function readManifest(): Promise<BundledFamily[]> {
  const response = await fetch(new URL(MANIFEST_PATH, document.baseURI).href);
  if (!response.ok) {
    throw new Error(
      `Could not read ${MANIFEST_PATH}: ${response.status}. ` +
        `Run \`npm run fetch-fonts\` to download the bundle.`
    );
  }
  const manifest = (await response.json()) as BundleManifest;
  return manifest.families ?? [];
}

/**
 * What this app knows about the family it ships, in the form the chooser's list
 * carries it — `LocalFontFamily.declared`. Undefined for a manifest written
 * before the facts existed, or one whose facts are the wrong shape, in which
 * case the chooser reads the files as it used to.
 */
export function declaredFactsOf(
  family: BundledFamily
): DeclaredFamilyFacts | undefined {
  return parseFamilyFacts(family.facts);
}

export function bundledFontUrl(face: BundledFace): string {
  return new URL(`fonts/${face.file}`, document.baseURI).href;
}

/**
 * The face a family is represented by where only one will do — the list entry,
 * and the bytes `getFontData` answers with. Regular, since that is the face a
 * name is drawn in and the one whose coverage a "does this font have my
 * letters" question is about.
 */
export function regularFaceOf(family: BundledFamily): BundledFace {
  return family.styles.find((face) => face.style === "R") ?? family.styles[0];
}

/**
 * How the Local Font Access API would name this face's style. The shim answers
 * with these, and font-core's own family-listing picks the face whose style is
 * "Regular" to represent a family, so the exact words matter.
 */
export function styleNameOf(face: BundledFace): string {
  switch (face.style) {
    case "B":
      return "Bold";
    case "I":
      return "Italic";
    case "BI":
      return "Bold Italic";
    default:
      return "Regular";
  }
}
