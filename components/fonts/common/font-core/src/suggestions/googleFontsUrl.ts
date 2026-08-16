/**
 * A font the user named by pasting its Google Fonts address.
 *
 * The chooser's own sources answer the question "what should this language use?".
 * This answers a different one: somebody has already been to fonts.google.com,
 * found the font they want, and has its page in the clipboard. All that is left
 * is to turn that address into a font file the chooser can read.
 *
 * The address gives the family name and nothing else — the specimen page is a
 * React app, so there is no file url in it to scrape — so the file comes from the
 * same keyless place `googleFontsRepo.ts` gets a whole font from. Which means the
 * font added here is the complete family file rather than a subset, and needs no
 * second lookup when the user chooses it.
 */

import type { FontInfo } from "../fontInfo";
import {
  createGoogleFontsFullFontUrlResolver,
  type FullFontUrlResolver,
  type GoogleFontsFullFontResolverConfig,
} from "./googleFontsRepo";
import type { SuggestOptions } from "./types";

/** The host whose font pages this understands. */
const GOOGLE_FONTS_HOST = "fonts.google.com";

/**
 * The family a fonts.google.com address names, or undefined for an address that
 * doesn't name one.
 *
 * Written to be safe to call on every keystroke — it is what decides whether the
 * "Add" button is live — so it parses rather than fetches, and says nothing about
 * whether such a font exists.
 *
 * Both shapes of specimen path are understood: `/specimen/Andika` and the ones
 * filed under a collection, `/noto/specimen/Noto+Sans+Thai`. A missing scheme is
 * forgiven, since a url copied out of a browser's address bar often arrives
 * without one.
 */
export function parseGoogleFontsFamily(url: string): string | undefined {
  const text = url.trim();
  if (!text) return undefined;

  let parsed: URL;
  try {
    parsed = new URL(/^[a-z]+:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return undefined;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return undefined;
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== GOOGLE_FONTS_HOST) return undefined;

  const segments = parsed.pathname.split("/").filter((segment) => segment);
  const at = segments.indexOf("specimen");
  // The family is the segment after "specimen"; anything before it is the
  // collection the family is filed under, which we don't need.
  if (at < 0 || at === segments.length - 1) return undefined;

  // Google writes the family's spaces as "+", which is not what URL decoding
  // does with them outside a query string.
  const family = decodeURIComponent(segments[at + 1].replace(/\+/g, "%20"))
    .replace(/\s+/g, " ")
    .trim();
  return family || undefined;
}

/** The family's page, which is where its licence is stated. */
function specimenUrl(family: string): string {
  return `https://fonts.google.com/specimen/${family.replace(/ /g, "+")}`;
}

export interface GoogleFontsUrlConfig extends GoogleFontsFullFontResolverConfig {
  /**
   * How to find the family's font file. Defaults to the google/fonts repository
   * mirror; a host that has its own copy of the catalog points this at that.
   */
  findFontFile?: FullFontUrlResolver;
}

/**
 * Turns a fonts.google.com address into a chooser entry, or throws with
 * something the user can act on.
 *
 * Everything in that catalog is under the OFL, Apache 2.0 or the Ubuntu font
 * licence, so the entry says `open` without reading a byte — the same judgement
 * `fetchGoogleFontsCatalog` makes about the same fonts.
 */
export function createGoogleFontsUrlFontResolver(
  config: GoogleFontsUrlConfig = {}
): (url: string, options?: SuggestOptions) => Promise<FontInfo> {
  const { findFontFile, ...resolverConfig } = config;
  const findFile =
    findFontFile ?? createGoogleFontsFullFontUrlResolver(resolverConfig);

  return async (url, options = {}) => {
    const family = parseGoogleFontsFamily(url);
    if (!family) {
      throw new Error(
        "That is not a Google Fonts address. It should look like " +
          "https://fonts.google.com/specimen/Andika"
      );
    }
    const fileUrl = await findFile(family, options);
    if (!fileUrl) {
      // The address parsed, so the user typed something reasonable; what we
      // can't do is find a font by that name.
      throw new Error(`Google Fonts has no font called “${family}”.`);
    }
    return {
      family,
      installed: false,
      location: "network",
      license: "open",
      licenseUrl: specimenUrl(family),
      fileUrl,
    };
  };
}
