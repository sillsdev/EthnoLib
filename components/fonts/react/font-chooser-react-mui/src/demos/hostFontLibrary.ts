/**
 * The pretend host app's own font folder: the files it ships, plus the ones it
 * has been handed by the chooser and kept.
 *
 * Keeping them is the whole point. `onFontSelected` gives the host the bytes of
 * a font it fetched, and a real host — Bloom, an Electron app — writes those to
 * its own storage so the next run has the font whether or not there is a
 * network. Until this module existed the demo only logged the byte count, so a
 * font chosen while online came back after a reload as an entry pointing at a
 * URL: listed, apparently ready, and unusable the moment the connection went
 * away. Now it comes back as what it really is, a file this app has on hand.
 *
 * That is also what makes the list's mark honest. A kept font is `location:
 * "disk"` — here to use, not installed, so the user's other programs won't
 * offer it — which is a different thing from both an OS font and a font that
 * still has to be fetched.
 *
 * Three things have to be true for the chooser to treat any of these as fonts
 * the machine has, shipped and kept alike:
 *
 * - `getLocalFonts` lists them, which is the host prop for "here is what this
 *   machine has, I looked it up my own way". Where the OS list is also in play
 *   the two are merged here, since the prop replaces it rather than adding to it.
 * - `getFontData` reads the bytes of whichever one is selected.
 * - The families are registered with the browser and `window.queryLocalFonts`
 *   is shimmed, because none of them is really installed. Registering is what
 *   makes the previews draw in the font rather than in a fallback; the shim is
 *   what lets the component's own licence and coverage sweep — which reads the
 *   Local Font Access API directly rather than through a prop — get at the same
 *   bytes. A host on Electron gets both for free from its own font handling; the
 *   demo is a web page, so it has to pretend.
 *
 * The kept files live in IndexedDB rather than local storage: they are binary
 * and they are megabytes, which is the one thing local storage is worst at.
 *
 * Nothing here is part of the published component.
 */

import {
  loadLocalFontDataByFamilyWithName,
  queryLocalFontFamilies,
  type FontDataResult,
  type FontInfo,
  type LocalFontFamily,
} from "@ethnolib/font-core";
import type { DownloadedFontFile } from "../types";
import { HOST_BUNDLED_FONTS, bundledFontUrl } from "./hostBundledFonts";

/** One font file this app has been given and has written down. */
export interface KeptFont {
  family: string;
  /**
   * Stood in for rather than read: the face's real PostScript name is in the
   * file's `name` table, and nothing here needs it to be right — it is a handle
   * the chooser passes back to `getFontData`, and both ends are ours. A host
   * that installs fonts for real reads the table.
   */
  postscriptName: string;
  data: ArrayBuffer;
  /** The catalog entry it arrived with: licence, size, who recommended it. */
  info: FontInfo;
}

const DB_NAME = "fontChooserDemo.hostFontLibrary";
const STORE = "keptFonts";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function promised<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Writes a font the chooser handed over, replacing any earlier copy. */
export async function keepFont(file: DownloadedFontFile): Promise<void> {
  const family = file.info.family;
  const kept: KeptFont = {
    family,
    postscriptName: postscriptNameFor(family),
    data: file.data,
    // Without this the next visit would have the bytes and nothing to say about
    // them: no licence, no size, nobody's recommendation.
    info: { ...file.info, installed: true, location: "disk" },
  };
  const db = await openDb();
  const store = db.transaction(STORE, "readwrite").objectStore(STORE);
  await promised(store.put(kept, family.toLowerCase()));
  db.close();
}

export async function listKeptFonts(): Promise<KeptFont[]> {
  try {
    const db = await openDb();
    const store = db.transaction(STORE, "readonly").objectStore(STORE);
    const all = await promised(store.getAll() as IDBRequest<KeptFont[]>);
    db.close();
    return all;
  } catch {
    // A browser with IndexedDB blocked, or a store that never got made. The
    // demo is then simply a host that keeps nothing, which is where it started.
    return [];
  }
}

/** Throws the app's saved fonts away, for seeing the not-kept case again. */
export async function forgetKeptFonts(): Promise<void> {
  const db = await openDb();
  const store = db.transaction(STORE, "readwrite").objectStore(STORE);
  await promised(store.clear());
  db.close();
}

function postscriptNameFor(family: string): string {
  return family.replace(/\s+/g, "");
}

/**
 * The files the app has locally right now, shipped and kept together, as the
 * chooser's props want them.
 *
 * `shipped` is the harness toggle: with it off the app has only what it has been
 * given, which is the ordinary case for an app that doesn't bundle fonts.
 */
interface LibraryFile {
  family: string;
  postscriptName: string;
  read: () => Promise<ArrayBuffer>;
}

function filesOf(shipped: boolean, kept: KeptFont[]): LibraryFile[] {
  const shippedFiles: LibraryFile[] = shipped
    ? HOST_BUNDLED_FONTS.map((font) => ({
        family: font.family,
        postscriptName: font.postscriptName,
        read: async () => {
          const response = await fetch(bundledFontUrl(font));
          if (!response.ok)
            throw new Error(`Could not read ${font.path}: ${response.status}`);
          return await response.arrayBuffer();
        },
      }))
    : [];
  const keptFiles: LibraryFile[] = kept
    // A font the app ships wins over a copy of the same family it was handed:
    // same family, and the shipped one is the file the app knows about.
    .filter(
      (font) =>
        !shippedFiles.some(
          (other) => other.family.toLowerCase() === font.family.toLowerCase()
        )
    )
    .map((font) => ({
      family: font.family,
      postscriptName: font.postscriptName,
      read: async () => font.data,
    }));
  return [...shippedFiles, ...keptFiles];
}

export interface HostFontAccess {
  /** Undefined where the app has nothing of its own, which leaves the component
   * on the Local Font Access API — the demo's behaviour before any of this. */
  getLocalFonts?: () => Promise<LocalFontFamily[]>;
  getFontData?: (family: string) => Promise<FontDataResult>;
}

export function hostFontAccess(
  shipped: boolean,
  kept: KeptFont[]
): HostFontAccess {
  const files = filesOf(shipped, kept);
  if (files.length === 0) return {};

  return {
    getLocalFonts: async () => {
      // With the shipped toggle on, the app's files are the whole list: the
      // point of that switch is to see what a host with a handful of fonts
      // looks like, and a machine's several hundred families bury them.
      // Otherwise the OS list stands and these are added to it.
      const fromMachine = shipped ? [] : await osFamilies();
      const mine: LocalFontFamily[] = files.map((file) => ({
        family: file.family,
        postscriptName: file.postscriptName,
        faceCount: 1,
        location: "disk",
      }));
      const spoken = new Set(mine.map((font) => font.family.toLowerCase()));
      return [
        ...fromMachine.filter(
          (font) => !spoken.has(font.family.toLowerCase())
        ),
        ...mine,
      ];
    },
    getFontData: async (family: string) => {
      const file = files.find(
        (candidate) => candidate.family.toLowerCase() === family.toLowerCase()
      );
      if (!file) {
        // Not one of ours: an OS font, which the component's own default reads
        // through the Local Font Access API. Supplying `getFontData` replaces
        // that default, so this has to do the same thing.
        return await loadLocalFontDataByFamilyWithName(family);
      }
      return { data: await file.read(), postscriptName: file.postscriptName };
    },
  };
}

async function osFamilies(): Promise<LocalFontFamily[]> {
  try {
    return await queryLocalFontFamilies();
  } catch {
    // No permission, or a browser without the API. The app's own files are
    // still worth listing, and are then the whole of what it can offer.
    return [];
  }
}

/**
 * Makes the app's files real for this page: registered with the browser, and
 * visible to code that reads the Local Font Access API directly. Returns how to
 * undo both, for when the toggle goes off or the kept set changes.
 */
export function installHostFontAccess(
  shipped: boolean,
  kept: KeptFont[]
): () => void {
  const files = filesOf(shipped, kept);
  const faces: FontFace[] = [];
  let undone = false;
  for (const file of files) {
    // Kept fonts are registered from their bytes, which are already in hand;
    // shipped ones from their url, so registering costs a request only once
    // something is drawn in them.
    const shippedFont = HOST_BUNDLED_FONTS.find(
      (font) => font.family === file.family
    );
    const face = shippedFont
      ? new FontFace(file.family, `url("${bundledFontUrl(shippedFont)}")`)
      : undefined;
    if (face) {
      document.fonts.add(face);
      faces.push(face);
      continue;
    }
    void file.read().then((data) => {
      // The read is a promise even for bytes already in hand, so this can land
      // after the caller has undone everything; registering then would leave a
      // face behind that nothing takes away.
      if (undone) return;
      const fromBytes = new FontFace(file.family, data);
      document.fonts.add(fromBytes);
      faces.push(fromBytes);
    });
  }

  const realQuery = window.queryLocalFonts;
  window.queryLocalFonts = async (options) => {
    const wanted = options?.postscriptNames;
    const mine = files
      .filter((file) => !wanted || wanted.includes(file.postscriptName))
      .map((file) => ({
        postscriptName: file.postscriptName,
        fullName: file.family,
        family: file.family,
        style: "Regular",
        blob: async () => new Blob([await file.read()]),
      }));
    if (shipped || !realQuery) return mine;
    // The OS list still stands where the app is only adding to it.
    try {
      return [...(await realQuery.call(window, options)), ...mine];
    } catch {
      return mine;
    }
  };

  return () => {
    undone = true;
    for (const face of faces) document.fonts.delete(face);
    window.queryLocalFonts = realQuery;
  };
}
