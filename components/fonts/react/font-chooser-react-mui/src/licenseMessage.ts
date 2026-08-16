import type { FontInfo } from "./types";

/**
 * Everything the chooser says to a user about what a font lets them do.
 *
 * The rule here is that the reader is somebody making books in their own
 * language, not a lawyer and not a programmer. So no "metadata", no "embedding",
 * no "fsType", and no verdict without an answer to "then what do I do?". Each
 * message names the one thing that is still fine (printing) and the things that
 * are not (ebooks, apps, websites), because those are the words on the buttons
 * they will press later.
 *
 * The substance matches BloomDesktop's own font messages — see
 * `fontInformationPane.tsx` and `PublishTab.FontProblem*` in Bloom — so that a
 * font this chooser waves through is one Bloom will publish, and a font this
 * chooser warns about is one Bloom will refuse. Only the wording differs, and it
 * differs on purpose: Bloom's says "The metadata inside this font tells us that
 * it may not be embedded for free in ebooks and the web", which is three pieces
 * of jargon in one sentence.
 *
 * Pure, and returns sentences rather than markup, so what the pane says can be
 * checked without rendering it.
 */

/** Microsoft's own page answering "may I pass these fonts on?". */
const MICROSOFT_FONT_FAQ =
  "https://learn.microsoft.com/en-us/typography/fonts/font-faq";

/**
 * Said in place of a link. Most fonts installed on a machine carry licence
 * wording but no `name` ID 14 saying where that licence is published, and a
 * reader who has just been told "ask whoever made it" deserves to know that we
 * have no address to give them either.
 */
export const NO_LICENSE_PAGE =
  "The font doesn't say where its license is published, so there is no page to send you to.";

export interface LicenseMessage {
  /** The sentence in the coloured row at the top of the pane. */
  headline: string;
  /** What to do about it. The first thing in the panel behind the "i". */
  advice?: string;
  /** Where our answer came from. Last and quiet, for whoever wants to check. */
  provenance: string;
  /** Somewhere worth going, described by what the reader will find there. */
  link?: { url: string; label: string };
}

export function licenseMessage(font: FontInfo): LicenseMessage {
  const license = font.license ?? "unknown";
  const reason = font.licenseReason;
  const microsoft = reason === "Microsoft font";

  const provenance = provenanceSentence(reason);
  const link = licenseLink(font, microsoft);

  if (license === "open") {
    return {
      headline:
        "You may use this font for anything you make: printed books, ebooks, apps, and websites.",
      provenance,
      link,
    };
  }

  if (license === "system-restricted") {
    return {
      headline: "This font is not allowed to leave this computer.",
      advice:
        "The font itself is marked as one that must not travel inside the files you make, so an ebook or a website built with it would be broken or against the rules. Pick a different font for your book.",
      provenance,
      link,
    };
  }

  if (license === "limits-apply") {
    if (microsoft) {
      return {
        headline:
          "This font came with your computer, and Microsoft only lets you use it here.",
        advice:
          "You may print with it. You may not put it in an ebook, an app, or a website, because each of those hands Microsoft's font on to everyone who opens your book. If you want to publish, pick a different font.",
        provenance,
        link,
      };
    }
    return {
      headline: "The people who made this font limit what you may do with it.",
      advice:
        "You may print with it. An ebook, an app, or a website would pass the font on to your readers, and this font's maker has not agreed to that. Ask them for permission, or pick a different font.",
      provenance,
      link,
    };
  }

  return {
    headline: "We could not find out what this font allows.",
    advice:
      "That is not the same as a no — plenty of fonts simply never say. Printing is safe. Before you publish an ebook, an app, or a website, find out who made the font and check that they allow it.",
    provenance,
    link,
  };
}

/**
 * How we reached the verdict, said in the same plain words as the verdict.
 *
 * `licenseReason` comes from `describeLicense`, whose strings are Bloom's
 * internal note for the rule that fired. Bloom shows those raw in its Book
 * Settings font table, which is where a user meets "unsuitable / unambiguous
 * fsType value". The ones that don't read as English get a sentence here; the
 * rest are licence names, which do.
 */
function provenanceSentence(reason: string | undefined): string {
  switch (reason) {
    case undefined:
    case "no reliable information":
      return "This font carries no license information we could make sense of.";
    case "Microsoft font":
      return "We say this because the font names Microsoft as its owner.";
    case "Contact the vendor":
      return "The font's own license text tells us to contact whoever sells it.";
    case "You may not copy or distribute":
      return 'The font\'s own license text says "you may not copy or distribute" it.';
    case "Do not distribute":
      return 'The font\'s own copyright notice says "Do not distribute."';
    case "All rights reserved":
      return 'The font says "all rights reserved" and nothing else about what it permits.';
    case "unambiguous fsType value":
      return "Inside the font is a setting saying it may not be included in the files you publish.";
    default:
      return `Read from the font itself: ${reason}.`;
  }
}

/**
 * A link only where the reader would be glad they followed it.
 *
 * Fonts point at their licence with `name` ID 14, and Microsoft's fonts point at
 * the Windows font catalogue: a list of every typeface Windows ships, with not a
 * word about what you may do with them. Following it, a user who asked "what am I
 * allowed to do?" lands on a page that never mentions the question. Bloom sends
 * these to Microsoft's font FAQ instead, which answers it in the first few lines,
 * and so do we.
 */
function licenseLink(
  font: FontInfo,
  microsoft: boolean
): LicenseMessage["link"] {
  if (microsoft || isMicrosoftFontCatalogue(font.licenseUrl)) {
    return {
      url: MICROSOFT_FONT_FAQ,
      label: "Microsoft's answers about using their fonts",
    };
  }
  if (!font.licenseUrl) return undefined;
  return { url: font.licenseUrl, label: "Read this font's license" };
}

function isMicrosoftFontCatalogue(url: string | undefined): boolean {
  if (!url) return false;
  return /(^|\/\/|\.)microsoft\.com\/.*\btypography\b/i.test(url);
}
