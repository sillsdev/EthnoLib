import { useEffect, useRef } from "react";
import type { FontInfo } from "./types";

/**
 * Lets the font list draw each font's name in that font before anything is
 * downloaded, by leaning on the browser's own lazy font loading.
 *
 * A `FontFace` registered with a *url* source costs nothing until some rendered
 * text actually asks for it; then the browser fetches only the files whose
 * `unicode-range` the text touches. So registering every offered font's files
 * here, and putting `font-family: "<name>"` on the row, makes each visible name
 * fetch just what it needs to draw itself — for a per-subset source like
 * Fontsource, the one ~20 KB latin file — and names scrolled out of a closed
 * disclosure fetch nothing at all. Where the host has a `previewFontUrl` (the
 * cut-down name-only fonts Google serves for menus) that is used instead, and
 * a font with only a whole-family `fileUrl` costs that file, which is no more
 * than selecting it would have cost.
 *
 * Registration is once per family for the life of the page: `document.fonts`
 * outlives this component, and a second face for a family the session has
 * since properly downloaded would shadow nothing (the downloaded face is added
 * later, and later wins). Off means off — on a metered connection the names
 * stay in the interface font rather than spending the user's data on looks.
 */
export function useNamePreviewFaces(fonts: FontInfo[], enabled: boolean) {
  const registered = useRef(new Set<string>());

  useEffect(() => {
    // Nothing to do where the CSS Font Loading API isn't there (jsdom, old
    // browsers): the rows' font-family stack falls back to the interface font.
    if (typeof FontFace === "undefined") return;
    for (const face of previewFacesFor(fonts, enabled)) {
      const key = face.family.toLowerCase();
      // Families, not files: a family is registered whole or not at all, so a
      // second pass over a longer list (the wider search publishes its answer
      // in pieces) does the new names and leaves the rest alone.
      if (registered.current.has(key)) continue;
      registered.current.add(key);
      for (const file of face.files) {
        try {
          document.fonts.add(
            new FontFace(face.family, `url("${file.url}")`, {
              ...(file.unicodeRange ? { unicodeRange: file.unicodeRange } : {}),
              // The name shows in the interface font until its own arrives;
              // a name that waited invisibly would make the list look shorter
              // than it is.
              display: "swap",
            })
          );
        } catch {
          // A url or range the FontFace constructor refuses only costs this
          // name its preview.
        }
      }
    }
  }, [fonts, enabled]);
}

/** One family's preview registration: the files to register it from. */
export interface PreviewFace {
  family: string;
  files: { url: string; unicodeRange?: string }[];
}

/**
 * Which families should be registered for preview, and from which files —
 * separated from the browser API so the rule itself can be tested, the way
 * constrainedNetwork.ts separates its own.
 *
 * The rule is worth a test of its own because when it goes wrong the symptom is
 * silent: names simply draw in the interface font, which is also what they do
 * while a face is still arriving, and what they are *supposed* to do on a
 * metered connection. There is nothing on screen to tell those three apart, so
 * "the names aren't in their own fonts" has more than once been a toggle rather
 * than a bug.
 */
export function previewFacesFor(
  fonts: FontInfo[],
  enabled: boolean
): PreviewFace[] {
  // Off means off: on a metered connection the names stay in the interface font
  // rather than spending the user's data on looks.
  if (!enabled) return [];

  const faces: PreviewFace[] = [];
  for (const font of fonts) {
    // An installed font needs no registering; the machine already has it.
    if (font.installed !== false) continue;
    const files = font.previewFontUrl
      ? [{ url: font.previewFontUrl }]
      : [
          ...(font.fileUrl
            ? [{ url: font.fileUrl, unicodeRange: font.fileUnicodeRange }]
            : []),
          ...(font.additionalFiles ?? []),
        ];
    if (files.length === 0) continue;
    faces.push({ family: font.family, files });
  }
  return faces;
}
