/**
 * Who made a font and what they claim about owning it, read out of the `name`
 * table: copyright, version, the designer and the foundry, each with the web
 * address the font gives for them.
 *
 * This is the other half of what a user asks when they ask about a font. The
 * licence (fontLicense.ts) answers "what may I do with it?"; these answer "whose
 * is it?" — which is the question they have to take to somebody else when the
 * licence turns out to say nothing, and the only lead we can give them.
 *
 * BloomDesktop shows the same fields in `fontInformationPane.tsx`, some of them
 * only in a developer's `alert()`. Nothing here is developer-only: a copyright
 * line is a sentence in English written by the people who made the font, and the
 * user is better placed to act on it than we are.
 *
 * Read for the one font on screen and never cached, for the same reason cvXX
 * features aren't: the bytes are already in hand by the time anybody can ask.
 */

import { readNameTable, readTableDirectory } from "./readCharacterVariants";

/**
 * The credit fields of one font. Every one is optional and plenty of fonts carry
 * none of them, so a caller must be ready to show nothing at all.
 */
export interface FontCredits {
  /** `name` ID 0, as written. Often the only attribution a font carries. */
  copyright?: string;
  /**
   * `name` ID 5, cut back to the number — fonts append build stamps to it
   * ("Version 2.100;GOOG;noto-source:20170915:90ef993387c0"), and none of that
   * is anybody's business but the foundry's.
   */
  version?: string;
  /** `name` ID 9: the person or team who drew it. */
  designer?: string;
  /** `name` ID 12, where it is a web page. See `readableUrl`. */
  designerUrl?: string;
  /** `name` ID 8: the foundry or organization that published it. */
  manufacturer?: string;
  /** `name` ID 11, where it is a web page. */
  manufacturerUrl?: string;
}

/**
 * The credits out of an already-parsed `name` table, or undefined where the font
 * says nothing at all — which lets a caller drop the whole block rather than draw
 * an empty heading.
 */
export function creditsFromNames(
  names: Map<number, string>
): FontCredits | undefined {
  const credits: FontCredits = {
    copyright: readableText(names.get(0)),
    version: readableVersion(names.get(5)),
    designer: readableText(names.get(9)),
    designerUrl: readableUrl(names.get(12)),
    manufacturer: readableText(names.get(8)),
    manufacturerUrl: readableUrl(names.get(11)),
  };
  const said = Object.values(credits).some((value) => value !== undefined);
  return said ? credits : undefined;
}

/**
 * The credits of raw font bytes. Throws only if the bytes aren't sfnt data we can
 * read; a font with no `name` table simply has nothing to say.
 *
 * `postscriptName` says which font of a collection (.ttc) is meant, exactly as in
 * `readLicenseHints`: without it the first font in the file answers, and that may
 * be a different family with a different designer.
 */
export function readFontCredits(
  fontData: ArrayBuffer,
  postscriptName?: string
): FontCredits | undefined {
  const view = new DataView(fontData);
  const tables = readTableDirectory(view, postscriptName);
  if (!tables["name"]) return undefined;
  return creditsFromNames(readNameTable(view, tables["name"].offset));
}

/** Trimmed, and undefined rather than empty: a blank field is not a fact. */
function readableText(text: string | undefined): string | undefined {
  const trimmed = text?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * The version number on its own. Fonts write ID 5 as "Version 1.234" and then
 * hang a build stamp off it after a semicolon; the number is the part a user
 * could compare against a download page.
 */
function readableVersion(text: string | undefined): string | undefined {
  const trimmed = readableText(text);
  if (!trimmed) return undefined;
  const number = trimmed.split(";")[0].replace(/^version\s+/i, "").trim();
  return number ? number : undefined;
}

/**
 * A `name` table URL as somewhere a browser may actually be sent.
 *
 * Two things to be careful of. Foundries leave the scheme off ("www.sil.org"),
 * which without help resolves against our own page; and the field is arbitrary
 * text from a file on the user's machine, so a `javascript:` in it would become a
 * link that runs it. Anything that isn't http(s) after parsing is dropped, and the
 * name it would have linked is still shown as plain text.
 */
function readableUrl(text: string | undefined): string | undefined {
  const trimmed = readableText(text);
  if (!trimmed) return undefined;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return undefined;
    }
    return parsed.href;
  } catch {
    return undefined;
  }
}
