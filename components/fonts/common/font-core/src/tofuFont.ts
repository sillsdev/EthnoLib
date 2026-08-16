/**
 * The font that draws a box for everything.
 *
 * When a font hasn't got a character, the browser quietly draws it in some other
 * font that has — and everywhere else on the web that is a kindness. Here it is
 * the one thing we must not do: the whole screen is an argument about what this
 * font can write, and a sample paragraph that renders perfectly because four of
 * its letters were borrowed from a system font is a lie the user has no way of
 * catching. Worse, they will take that font away with them and see the borrowed
 * letters break on a machine that hasn't got the same fallback.
 *
 * So the chosen font is backed by Adobe NotDef, which maps every code point in
 * Unicode to one glyph: an empty box. Named *second* in the stack — immediately
 * behind the chosen font and ahead of anything else, including the browser's own
 * last resort — it catches every character the chosen font lacks and shows it as
 * the tofu it really is.
 *
 * This says nothing about characters the font has and sets badly: a diacritic
 * that lands in the wrong place is still a font's own doing, and still the
 * user's to judge. What it removes is the case where there was nothing to judge
 * because they were not looking at the font at all.
 */

import { ADOBE_NOTDEF_BASE64 } from "./tofuFontData";

/**
 * What the tofu face is called in a font stack. Deliberately not a name anybody
 * would have installed, since a real font by this name would silently take the
 * job over.
 */
export const TOFU_FONT_FAMILY = "EthnolibNotdef";

/**
 * The `font-family` value for text meant to show what a font can do: the font
 * itself, then tofu.
 *
 * Nothing else follows, on purpose — a third family would be another face
 * lending its letters, which is the thing this exists to stop. Given no font,
 * there is no claim being made about anything, so it hands back `inherit` and
 * leaves the interface font alone.
 */
export function fontFamilyWithTofu(family: string | undefined): string {
  if (!family) return "inherit";
  return `"${family}", "${TOFU_FONT_FAMILY}"`;
}

/** Set once the face is with the browser, so a second caller does nothing. */
let registered: Promise<void> | undefined;

/**
 * Put the tofu face in the browser's hands, once per page.
 *
 * The bytes are handed over as bytes rather than as a `data:` url: a host with a
 * strict `font-src` would refuse the url, and a font that silently fails to load
 * takes the boxes away without taking away the reason they were wanted.
 *
 * Safe to call anywhere — it resolves quietly on a browser without the CSS Font
 * Loading API, and on the server, where the answer is that there is nothing to
 * register.
 */
export function ensureTofuFontLoaded(): Promise<void> {
  if (registered) return registered;
  registered = (async () => {
    if (typeof FontFace === "undefined" || typeof document === "undefined") {
      return;
    }
    if (isTofuFontLoaded()) return;
    const face = new FontFace(TOFU_FONT_FAMILY, decodeBase64(ADOBE_NOTDEF_BASE64));
    await face.load();
    document.fonts.add(face);
  })().catch(() => {
    // A face the browser wouldn't take costs us the boxes, and nothing else on
    // the screen. Left resolved rather than retried: the bytes are not going to
    // parse any better the second time.
  });
  return registered;
}

/** Whether the face is already with the browser — this page's, or a host's own. */
function isTofuFontLoaded(): boolean {
  let found = false;
  document.fonts.forEach((face) => {
    if (face.family.replace(/["']/g, "") === TOFU_FONT_FAMILY) found = true;
  });
  return found;
}

function decodeBase64(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let at = 0; at < binary.length; at++) bytes[at] = binary.charCodeAt(at);
  return bytes.buffer;
}
