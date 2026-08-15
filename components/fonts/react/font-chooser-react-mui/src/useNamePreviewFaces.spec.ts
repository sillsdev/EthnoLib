import { describe, expect, it } from "vitest";
import { previewFacesFor } from "./useNamePreviewFaces";
import type { FontInfo } from "./types";

/**
 * Drawing each name in its own font is most of what the list is for, and it
 * fails quietly: a name in the interface font looks the same whether the face is
 * still arriving, the connection is metered, or the urls stopped being plumbed
 * through at all. So the rule is pinned here rather than left to the eye.
 */

const suggested = (over: Partial<FontInfo> = {}): FontInfo => ({
  family: "Smooch Sans",
  installed: false,
  fileUrl: "https://cdn.example/smooch-sans/latin-400-normal.ttf",
  ...over,
});

describe("previewFacesFor", () => {
  it("registers a face per offered font, from the file it would download", () => {
    const faces = previewFacesFor([suggested()], true);

    expect(faces).toEqual([
      {
        family: "Smooch Sans",
        files: [
          {
            url: "https://cdn.example/smooch-sans/latin-400-normal.ttf",
            unicodeRange: undefined,
          },
        ],
      },
    ]);
  });

  it("registers every file the font came in, ranges and all", () => {
    const faces = previewFacesFor(
      [
        suggested({
          fileUnicodeRange: "U+0000-00FF",
          additionalFiles: [
            {
              url: "https://cdn.example/smooch-sans/latin-ext-400-normal.ttf",
              unicodeRange: "U+0100-02BA",
            },
          ],
        }),
      ],
      true
    );

    // Both files, each with its own range: the browser then fetches only the
    // one the name's own letters need.
    expect(faces[0].files).toEqual([
      {
        url: "https://cdn.example/smooch-sans/latin-400-normal.ttf",
        unicodeRange: "U+0000-00FF",
      },
      {
        url: "https://cdn.example/smooch-sans/latin-ext-400-normal.ttf",
        unicodeRange: "U+0100-02BA",
      },
    ]);
  });

  it("prefers the host's cut-down preview font to the whole file", () => {
    const faces = previewFacesFor(
      [
        suggested({
          previewFontUrl: "https://cdn.example/menu/smooch-sans.woff2",
          additionalFiles: [{ url: "https://cdn.example/ignored.ttf" }],
        }),
      ],
      true
    );

    expect(faces[0].files).toEqual([
      { url: "https://cdn.example/menu/smooch-sans.woff2" },
    ]);
  });

  it("leaves the names plain on a metered connection", () => {
    // Not a bug, and the first thing to check when the names look plain: the
    // preview is a download the user hasn't agreed to.
    expect(previewFacesFor([suggested()], false)).toEqual([]);
  });

  it("registers nothing for a font the machine already has", () => {
    expect(
      previewFacesFor([suggested({ installed: true, fileUrl: undefined })], true)
    ).toEqual([]);
  });

  it("passes over a font there is no file for", () => {
    expect(previewFacesFor([suggested({ fileUrl: undefined })], true)).toEqual(
      []
    );
  });

  it("covers the whole list it is given, wider-search fonts included", () => {
    // The wider search publishes its answer in pieces, so this runs again on a
    // longer list each time; every offered family has to come back, not just
    // the ones that were there first.
    const faces = previewFacesFor(
      [
        suggested({ family: "Inter" }),
        suggested({ family: "Montserrat" }),
        suggested({ family: "Noto Sans" }),
      ],
      true
    );

    expect(faces.map((face) => face.family)).toEqual([
      "Inter",
      "Montserrat",
      "Noto Sans",
    ]);
  });
});
