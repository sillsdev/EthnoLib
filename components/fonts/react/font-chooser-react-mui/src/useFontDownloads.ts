import { useCallback, useRef, useState } from "react";
import type { FontInfo, ReportDiagnostic } from "./types";

/**
 * The fonts this session has fetched, and what fetching one means.
 *
 * A web page cannot install a font, and shouldn't want to: where a font lives on
 * the machine is the operating system's business and, if the host app really
 * installs fonts, the host's. What a page *can* do is fetch the file and hand it
 * to the browser as a `FontFace`, which makes the family real for everything on
 * this page until it is reloaded. Nothing is installed; the user's machine is
 * untouched.
 *
 * The bytes are kept as well as registered, because the chooser reads fonts as
 * well as drawing with them: coverage, letter shapes and digit forms all come out
 * of the file, and the Local Font Access API — where it answers at all — knows
 * nothing about a face that exists only in this page's memory.
 *
 * Families are keyed folded, since that is how the chooser matches them: a
 * catalog written by hand won't always capitalize the way the machine does.
 */
export interface FontDownloads {
  /** The families fetched so far, folded. Changing this re-renders the caller. */
  downloaded: ReadonlySet<string>;
  /** The bytes of a family we have, or `undefined` for one we haven't fetched. */
  bytesFor: (family: string) => ArrayBuffer | undefined;
  /**
   * The bytes of the family's further subset files, for a font that ships the
   * alphabet as several (`FontInfo.additionalFiles`). The main file's bytes —
   * `bytesFor` — hold the tables the pane reads; these hold the rest of the
   * letters, and coverage is the union of all of them.
   */
  extraBytesFor: (family: string) => ArrayBuffer[] | undefined;
  /**
   * Fetch a font, register it, and hand back its bytes. A font whose alphabet
   * spans several subset files fetches them all, as one download: every face is
   * registered or none is, since a family missing half its letters is exactly
   * the confusion this exists to prevent. Asking twice while the first fetch is
   * still in the air joins that fetch rather than starting a second. Rejects
   * when a file can't be had, and leaves nothing behind, so a font the user
   * comes back to is tried afresh.
   */
  download: (font: FontInfo) => Promise<ArrayBuffer>;
}

/**
 * @param diagnose told when a fetch actually starts and how it ends. Reported
 * from in here rather than from the caller because this is where the dedup is:
 * a second ask that joins a fetch already in the air is not a second download,
 * and saying so twice would make the log lie about what crossed the wire.
 */
export function useFontDownloads(diagnose: ReportDiagnostic): FontDownloads {
  const [downloaded, setDownloaded] = useState<ReadonlySet<string>>(new Set());
  const bytes = useRef(new Map<string, ArrayBuffer>());
  const extras = useRef(new Map<string, ArrayBuffer[]>());
  const inFlight = useRef(new Map<string, Promise<ArrayBuffer>>());

  const bytesFor = useCallback(
    (family: string) => bytes.current.get(family.toLowerCase()),
    []
  );
  const extraBytesFor = useCallback(
    (family: string) => extras.current.get(family.toLowerCase()),
    []
  );

  const download = useCallback(
    async (font: FontInfo) => {
      const key = font.family.toLowerCase();
      const have = bytes.current.get(key);
      if (have) return have;
      const already = inFlight.current.get(key);
      if (already) return already;
      if (!font.fileUrl) {
        throw new Error(`There is nowhere to fetch ${font.family} from.`);
      }

      const fileUrl = font.fileUrl;
      diagnose(`downloading ${font.family}`, () => ({
        fileUrl,
        additionalFiles: font.additionalFiles?.map((file) => file.url),
      }));
      const started = fetchAndRegister(font, fileUrl).then(
        ({ primary, additional }) => {
          bytes.current.set(key, primary);
          if (additional.length > 0) extras.current.set(key, additional);
          setDownloaded((previous) => new Set(previous).add(key));
          diagnose(`downloaded ${font.family}`, () => ({
            bytes: primary.byteLength,
            additionalBytes: additional.map((file) => file.byteLength),
          }));
          return primary;
        },
        (error: unknown) => {
          const said = error instanceof Error ? error.message : String(error);
          diagnose(`could not download ${font.family}: ${said}`);
          throw error;
        }
      );
      // Whichever way it ends, the in-flight entry has done its job; a failed
      // fetch must not stand in for the font the next time the user looks at it.
      started
        .catch(() => undefined)
        .finally(() => inFlight.current.delete(key));
      inFlight.current.set(key, started);
      return started;
    },
    [diagnose]
  );

  return { downloaded, bytesFor, extraBytesFor, download };
}

/**
 * Every file the font needs, fetched together and registered together. Nothing
 * is registered until everything has arrived: a family whose latin face made it
 * and whose latin-ext face didn't would render half the alphabet and fall back
 * on the rest, which is worse to look at than the download simply failing.
 */
async function fetchAndRegister(
  font: FontInfo,
  fileUrl: string
): Promise<{ primary: ArrayBuffer; additional: ArrayBuffer[] }> {
  const additionalFiles = font.additionalFiles ?? [];
  const [primary, ...additional] = await Promise.all([
    fetchBytes(fileUrl),
    ...additionalFiles.map((file) => fetchBytes(file.url)),
  ]);

  // Each face carries the range its file covers, where the source declared one.
  // That is what lets the browser compose several files into one family: faces
  // all claiming every character would simply shadow one another, and the
  // letters outside the winning file would come out of some fallback font.
  await register(
    font.family,
    primary,
    additionalFiles.length > 0 ? font.fileUnicodeRange : undefined
  );
  for (let i = 0; i < additional.length; i++) {
    await register(font.family, additional[i], additionalFiles[i].unicodeRange);
  }
  return { primary, additional };
}

async function fetchBytes(fileUrl: string): Promise<ArrayBuffer> {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(
      `Could not fetch the font: ${response.status} ${
        response.statusText ?? ""
      }`.trim()
    );
  }
  return response.arrayBuffer();
}

async function register(
  family: string,
  file: ArrayBuffer,
  unicodeRange: string | undefined
): Promise<void> {
  const face = new FontFace(
    family,
    file,
    unicodeRange ? { unicodeRange } : undefined
  );
  await face.load();
  document.fonts.add(face);
}
