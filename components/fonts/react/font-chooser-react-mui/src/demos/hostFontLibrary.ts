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
 *   machine has, I looked it up my own way". The prop replaces the OS list
 *   rather than adding to it, so the merging is this module's job — and it
 *   always merges: what the app carries plus what the user has installed is
 *   what a machine running that app actually has.
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
  type DeclaredFamilyFacts,
  type FontDataResult,
  type FontInfo,
  type LocalFontFamily,
} from "@ethnolib/font-core";
import type { DownloadedFontFile } from "../types";
import {
  bundledFontUrl,
  declaredFactsOf,
  regularFaceOf,
  styleNameOf,
  type BundledFamily,
} from "./hostBundledFonts";

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
 * One face the app has locally right now — a file, and enough about it to list
 * it, read it and register it at the right weight and slant.
 *
 * The weight and slant are why this is a face rather than a family: the bundle
 * ships bold and italic for most of what is in it, and a browser handed four
 * files under one family name with no descriptors draws every one of them for
 * every request, so the last one registered wins and the preview's bold is
 * whatever that happened to be.
 */
interface LibraryFace {
  family: string;
  postscriptName: string;
  /** As the Local Font Access API words it: "Regular", "Bold Italic", … */
  style: string;
  weight: number;
  italic: boolean;
  /** Set for a shipped face, whose bytes are a request away rather than in hand. */
  url?: string;
  read: () => Promise<ArrayBuffer>;
}

/** A family and its faces, regular first, as the chooser's list wants them. */
interface LibraryFamily {
  family: string;
  faces: LibraryFace[];
  /**
   * What this app knows about a family it ships, off the bundle manifest. Only
   * shipped families have any: a font the user handed us came as bytes and a
   * catalog entry, with nobody having read its tables.
   */
  declared?: DeclaredFamilyFacts;
}

/**
 * The files the app has locally right now, shipped and kept together, as the
 * chooser's props want them.
 *
 * `bundled` is the harness toggle's doing: empty is an app that ships no fonts
 * and has only what it has been given, which is the ordinary case.
 */
function familiesOf(
  bundled: BundledFamily[],
  kept: KeptFont[]
): LibraryFamily[] {
  const shipped: LibraryFamily[] = bundled.map((family) => ({
    family: family.family,
    declared: declaredFactsOf(family),
    // Regular first, which everything downstream relies on: it is the face the
    // family is listed under, inspected through and read for.
    faces: [
      regularFaceOf(family),
      ...family.styles.filter((face) => face !== regularFaceOf(family)),
    ].map((face) => ({
      family: family.family,
      postscriptName: face.postscriptName,
      style: styleNameOf(face),
      weight: face.weight,
      italic: face.italic,
      url: bundledFontUrl(face),
      read: async () => {
        const response = await fetch(bundledFontUrl(face));
        if (!response.ok) {
          throw new Error(`Could not read ${face.file}: ${response.status}`);
        }
        return await response.arrayBuffer();
      },
    })),
  }));

  const keptFamilies: LibraryFamily[] = kept
    // A font the app ships wins over a copy of the same family it was handed:
    // same family, and the shipped one is the file the app knows about — and
    // the shipped one is the whole family rather than the single face a
    // download hands over.
    .filter(
      (font) =>
        !shipped.some(
          (other) => other.family.toLowerCase() === font.family.toLowerCase()
        )
    )
    .map((font) => ({
      family: font.family,
      faces: [
        {
          family: font.family,
          postscriptName: font.postscriptName,
          style: "Regular",
          weight: 400,
          italic: false,
          read: async () => font.data,
        },
      ],
    }));

  return [...shipped, ...keptFamilies];
}

/** Every face of every family, which is what reading by name works over. */
function facesOf(families: LibraryFamily[]): LibraryFace[] {
  return families.flatMap((family) => family.faces);
}

/**
 * Where the app's own files are read from, asked afresh every time rather than
 * handed over as a list.
 *
 * That indirection is the fix for a real bug, not tidiness. The bundle is read
 * from a manifest the page fetches, so it is not there at the moment the chooser
 * mounts; when it was passed as a value, the host's `getLocalFonts` was
 * undefined for the first render and a different function afterwards, and the
 * chooser — which re-lists whenever that prop changes — ended up with two
 * enumerations in flight and showed whichever finished last. A machine's
 * hundreds of families take seconds to enumerate and a bundle takes none, so the
 * bundle-only answer usually landed second and the user's own fonts vanished;
 * sometimes it didn't, which is what made it look intermittent.
 *
 * Asking through here instead, `getLocalFonts` is one function for the whole
 * session that waits for the manifest itself, and the chooser lists once.
 */
export interface HostFontLibrarySource {
  /** The families the app ships right now; a promise, since the manifest is fetched. */
  bundled: () => Promise<BundledFamily[]>;
  /** The files the app has been handed and kept, which are already in hand. */
  kept: () => KeptFont[];
}

export interface HostFontAccess {
  getLocalFonts: () => Promise<LocalFontFamily[]>;
  getFontData: (family: string) => Promise<FontDataResult>;
}

/**
 * What the chooser's two font props do for this pretend host: list what is on
 * this machine — the app's own files *and* the user's installed fonts, together —
 * and read the bytes of whichever family is asked for, from whichever of the two
 * it belongs to.
 *
 * Merging is the point. A real host that ships fonts (Bloom, an Electron app)
 * offers its user everything usable, not a curated twenty with the user's own
 * typefaces hidden; and the demo's toggle is on by default, so an unmerged list
 * is what the demo shows about itself almost all the time.
 *
 * Collision policy: where a family the app ships has the same name as one
 * installed on the machine, the app's own copy wins — in the list, in
 * `getFontData`, and in the shimmed Local Font Access API alike. It is the copy
 * whose file the host can point at, hand over and read with the network off,
 * whose version it knows, and the whole family rather than whichever faces the
 * machine happens to have. One entry either way; making it the shipped one keeps
 * every route to the bytes agreeing about which file they mean.
 */
export function hostFontAccess(source: HostFontLibrarySource): HostFontAccess {
  const mineNow = async () => familiesOf(await source.bundled(), source.kept());

  return {
    getLocalFonts: async () => {
      const families = await mineNow();
      const mine: LocalFontFamily[] = families.map((family) => ({
        family: family.family,
        // The face the chooser will inspect and draw the name in. A family's
        // bold is not what "does this font have my letters" is a question
        // about.
        postscriptName: family.faces[0].postscriptName,
        faceCount: family.faces.length,
        location: "disk",
        // What we know about our own file, so the chooser need not read it. Only
        // ours: a machine font below keeps no `declared`, since nobody but its
        // own tables can speak for it.
        declared: family.declared,
      }));
      const fromMachine = await osFamilies();
      const spoken = new Set(mine.map((font) => font.family.toLowerCase()));
      return [
        ...fromMachine.filter((font) => !spoken.has(font.family.toLowerCase())),
        ...mine,
      ];
    },
    getFontData: async (family: string) => {
      const mine = (await mineNow()).find(
        (candidate) => candidate.family.toLowerCase() === family.toLowerCase()
      );
      if (!mine) {
        // Not one of ours: an OS font, which the component's own default reads
        // through the Local Font Access API. Supplying `getFontData` replaces
        // that default, so this has to do the same thing.
        return await loadLocalFontDataByFamilyWithName(family);
      }
      // The regular face: the caller wants one font's bytes to read coverage
      // and character variants out of, and those are facts about the family.
      const face = mine.faces[0];
      return { data: await face.read(), postscriptName: face.postscriptName };
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
 * Draws the app's files: every face registered with the browser under its own
 * family name, weight and slant, so a preview asking for `font-family: Charis`
 * gets Charis rather than a fallback. Returns how to undo that, for when the
 * toggle goes off or the kept set changes.
 *
 * Separate from the Local Font Access shim below, which used to be installed in
 * the same breath. Registering needs the files in hand and so has to wait for
 * the manifest; the shim must not, because the component's licence and coverage
 * sweep reads that API the moment it has a list, and a shim that knew about the
 * bundle only after the manifest had made it through React state answered "no
 * such font" for whichever families the sweep got to first.
 */
export function registerHostFonts(
  bundled: BundledFamily[],
  kept: KeptFont[]
): () => void {
  const families = familiesOf(bundled, kept);
  const files = facesOf(families);
  const registered: FontFace[] = [];
  let undone = false;
  for (const file of files) {
    // Each face is registered under its family's name with the weight and
    // slant it is, which is what lets one `font-family: Charis` cover all four
    // and lets a bold preview actually come out bold. Without the descriptors
    // the browser takes every face for a 400-weight roman and draws whichever
    // was added last.
    const descriptors: FontFaceDescriptors = {
      weight: String(file.weight),
      style: file.italic ? "italic" : "normal",
    };
    // Shipped faces are registered from their url, so a family nothing is
    // drawn in costs no request; kept ones from their bytes, already in hand.
    if (file.url) {
      const face = new FontFace(file.family, `url("${file.url}")`, descriptors);
      document.fonts.add(face);
      registered.push(face);
      continue;
    }
    void file.read().then((data) => {
      // The read is a promise even for bytes already in hand, so this can land
      // after the caller has undone everything; registering then would leave a
      // face behind that nothing takes away.
      if (undone) return;
      const fromBytes = new FontFace(file.family, data, descriptors);
      document.fonts.add(fromBytes);
      registered.push(fromBytes);
    });
  }

  return () => {
    undone = true;
    for (const face of registered) document.fonts.delete(face);
  };
}

/**
 * Puts the app's own files in front of the Local Font Access API, so that code
 * reading it directly — the component's licence and coverage sweep, which goes
 * to `window.queryLocalFonts` rather than through a prop — finds them alongside
 * whatever the machine really has. An Electron host gets this for free from its
 * own font handling; a web page has to pretend.
 *
 * Installed once for the page and asked afresh on every call, so the answer is
 * always about the bundle as it stands rather than the bundle as it was when
 * some effect last ran.
 *
 * The machine's own faces come through too, minus any family the app ships a
 * copy of — the collision policy in `hostFontAccess`, applied here so the bytes
 * this hands out are the same file that function's list claimed.
 */
export function installLocalFontShim(
  source: HostFontLibrarySource
): () => void {
  const realQuery = window.queryLocalFonts;
  window.queryLocalFonts = async (options) => {
    const wanted = options?.postscriptNames;
    const families = familiesOf(await source.bundled(), source.kept());
    // One entry per face, which is the shape the real API answers in: it lists
    // faces, and font-core's own family listing is what groups them and counts
    // them. Answering with one entry per family would make every family here
    // look like a single-face one.
    const mine = facesOf(families)
      .filter((file) => !wanted || wanted.includes(file.postscriptName))
      .map((file) => ({
        postscriptName: file.postscriptName,
        fullName:
          file.style === "Regular"
            ? file.family
            : `${file.family} ${file.style}`,
        family: file.family,
        style: file.style,
        blob: async () => new Blob([await file.read()]),
      }));
    if (!realQuery) return mine;
    try {
      const spoken = new Set(
        families.map((family) => family.family.toLowerCase())
      );
      const fromMachine = (await realQuery.call(window, options)).filter(
        (face) => !spoken.has(face.family.toLowerCase())
      );
      return [...fromMachine, ...mine];
    } catch {
      // No permission yet, or a browser without the API. The app's own files
      // are still worth answering with, and are then the whole of what it can
      // offer; the chooser's own prompt is what gets the rest.
      return mine;
    }
  };

  return () => {
    window.queryLocalFonts = realQuery;
  };
}
