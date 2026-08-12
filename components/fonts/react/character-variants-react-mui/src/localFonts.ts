/**
 * Thin wrapper over the Local Font Access API, which is how a web page can both
 * list the fonts installed on the machine and get at their bytes.
 * https://developer.mozilla.org/en-US/docs/Web/API/Window/queryLocalFonts
 *
 * Chromium-only, secure contexts only (localhost counts), and the first call has
 * to happen during a user gesture because it may show a permission prompt.
 *
 * An app embedding the character variants component may well get its font bytes
 * some other way (a font server, a file the user picked, Bloom's own font list);
 * this module is just what the demo uses, and a reasonable default for the web.
 */

interface FontData {
  postscriptName: string;
  fullName: string;
  family: string;
  style: string;
  blob(): Promise<Blob>;
}

declare global {
  interface Window {
    queryLocalFonts?: (options?: {
      postscriptNames?: string[];
    }) => Promise<FontData[]>;
  }
}

/** One installed font family, plus the face we would inspect for it. */
export interface LocalFontFamily {
  family: string;
  /** The face we picked to represent the family, usually its regular weight. */
  postscriptName: string;
  /** How many faces (styles/weights) the family has installed. */
  faceCount: number;
}

export function isLocalFontAccessSupported(): boolean {
  return typeof window !== "undefined" && !!window.queryLocalFonts;
}

/**
 * List the installed font families. Must be called from a user gesture the first
 * time, since it can trigger a permission prompt.
 */
export async function queryLocalFontFamilies(): Promise<LocalFontFamily[]> {
  if (!window.queryLocalFonts) {
    throw new Error(
      "This browser cannot list installed fonts (the Local Font Access API is Chromium-only)."
    );
  }
  const faces = await window.queryLocalFonts();

  const families = new Map<string, LocalFontFamily & { chosenStyle: string }>();
  for (const face of faces) {
    const existing = families.get(face.family);
    if (!existing) {
      families.set(face.family, {
        family: face.family,
        postscriptName: face.postscriptName,
        chosenStyle: face.style,
        faceCount: 1,
      });
      continue;
    }
    existing.faceCount++;
    if (isRegularStyle(face.style) && !isRegularStyle(existing.chosenStyle)) {
      existing.postscriptName = face.postscriptName;
      existing.chosenStyle = face.style;
    }
  }

  return [...families.values()]
    .map(({ family, postscriptName, faceCount }) => ({
      family,
      postscriptName,
      faceCount,
    }))
    .sort((a, b) => a.family.localeCompare(b.family));
}

/**
 * The sfnt data of one face as a Blob. A Blob rather than an ArrayBuffer because a
 * caller that only wants a couple of tables can slice it instead of pulling a
 * 20 MB CJK font into memory.
 */
export async function loadLocalFontBlob(postscriptName: string): Promise<Blob> {
  if (!window.queryLocalFonts) {
    throw new Error("This browser cannot read installed fonts.");
  }
  const [face] = await window.queryLocalFonts({
    postscriptNames: [postscriptName],
  });
  if (!face) {
    throw new Error(
      `Could not find an installed font named ${postscriptName}.`
    );
  }
  return await face.blob();
}

/** Fetch the raw sfnt bytes of one face, for `readCharacterVariants`. */
export async function loadLocalFontData(
  postscriptName: string
): Promise<ArrayBuffer> {
  return await (await loadLocalFontBlob(postscriptName)).arrayBuffer();
}

/**
 * Fetch the bytes of an installed font family, picking its regular face. This is
 * the default way `<CharacterVariants>` gets at a font; an app with its own font
 * source passes a `getFontData` of its own instead.
 */
export async function loadLocalFontDataByFamily(
  family: string
): Promise<ArrayBuffer> {
  return (await loadLocalFontDataByFamilyWithName(family)).data;
}

/**
 * The same, but also saying which face the family name resolved to. Worth having
 * because the bytes of a face in a collection (.ttc) are the whole collection, so
 * whoever reads them needs the PostScript name to know which font inside is meant;
 * see sfntBlob.ts. `loadLocalFontDataByFamily` throws that name away, which is
 * fine for a caller that only wants to show the font.
 */
export async function loadLocalFontDataByFamilyWithName(
  family: string
): Promise<{ data: ArrayBuffer; postscriptName: string }> {
  const match = (await queryLocalFontFamilies()).find(
    (f) => f.family === family
  );
  if (!match) {
    throw new Error(`${family} does not seem to be installed on this machine.`);
  }
  return {
    data: await loadLocalFontData(match.postscriptName),
    postscriptName: match.postscriptName,
  };
}

function isRegularStyle(style: string | undefined): boolean {
  return /^(regular|normal|book)$/i.test(style?.trim() ?? "");
}
