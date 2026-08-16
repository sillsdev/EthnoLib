// @vitest-environment jsdom
/**
 * The pretend host's font library, which is the demo's answer to "what does this
 * machine have?".
 *
 * What is pinned down here is the thing that broke: an app that ships fonts of
 * its own has to offer them *and* the user's installed ones, and it has to give
 * the same answer whether it is asked before or after the bundle manifest has
 * come back. The old shape took the bundle as a value, so "before" meant "the
 * app ships nothing" and "after" meant "the app ships everything and the machine
 * nothing" — two different lists from the same page load, and which one the user
 * saw came down to a race.
 *
 * jsdom rather than node, because this stands in front of two browser APIs
 * (`window.queryLocalFonts`, `document.baseURI`) and the point of every test
 * here is what it does with them.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  hostFontAccess,
  installLocalFontShim,
  type HostFontLibrarySource,
  type KeptFont,
} from "./hostFontLibrary";
import type { BundledFamily } from "./hostBundledFonts";

/** One shipped family, in the shape the manifest writes. */
function bundledFamily(family: string): BundledFamily {
  const flat = family.replace(/\s+/g, "");
  return {
    family,
    familyid: flat.toLowerCase(),
    license: "OFL",
    styles: [
      {
        style: "R",
        file: `${flat}-Regular.ttf`,
        postscriptName: `${flat}-Regular`,
        weight: 400,
        italic: false,
        bytes: 4,
      },
      {
        style: "B",
        file: `${flat}-Bold.ttf`,
        postscriptName: `${flat}-Bold`,
        weight: 700,
        italic: false,
        bytes: 4,
      },
    ],
  };
}

/** A face as the Local Font Access API hands it over. */
function installedFace(family: string, style = "Regular") {
  return {
    postscriptName: `${family.replace(/\s+/g, "")}-${style.replace(/\s+/g, "")}`,
    fullName: style === "Regular" ? family : `${family} ${style}`,
    family,
    style,
    // jsdom's Blob has no `arrayBuffer`, and reading the bytes is exactly what
    // the code under test does with one.
    blob: () =>
      Promise.resolve({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
      } as unknown as Blob),
  };
}

/** What the machine pretends to have installed, through the real API. */
function machineHas(...faces: ReturnType<typeof installedFace>[]) {
  const query = vi.fn((options?: { postscriptNames?: string[] }) =>
    Promise.resolve(
      options?.postscriptNames
        ? faces.filter((face) =>
            options.postscriptNames?.includes(face.postscriptName)
          )
        : faces
    )
  );
  window.queryLocalFonts = query as unknown as typeof window.queryLocalFonts;
  return query;
}

/** A source whose bundle can be made to arrive whenever the test wants. */
function sourceOf(
  bundled: BundledFamily[],
  kept: KeptFont[] = []
): HostFontLibrarySource & { release: () => void } {
  let let_go: (() => void) | undefined;
  const held = new Promise<void>((resolve) => {
    let_go = resolve;
  });
  return {
    bundled: () => held.then(() => bundled),
    kept: () => kept,
    release: () => let_go?.(),
  };
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
      } as unknown as Response)
    )
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete window.queryLocalFonts;
});

describe("hostFontAccess getLocalFonts", () => {
  it("lists the app's own families alongside the machine's installed ones", async () => {
    // The bug in one line: with the bundle switched on, the machine's fonts
    // used to be dropped, and the user was left looking at a chooser that knew
    // about twenty families and none of their own.
    machineHas(installedFace("Calibri"), installedFace("Segoe UI"));
    const source = sourceOf([bundledFamily("Charis"), bundledFamily("Andika")]);
    source.release();

    const listed = await hostFontAccess(source).getLocalFonts();

    expect(listed.map((font) => font.family)).toEqual([
      "Calibri",
      "Segoe UI",
      "Charis",
      "Andika",
    ]);
  });

  it("marks the app's own files as being on disk and the machine's as installed", async () => {
    // The mark is what the chooser now counts to decide whether it still has to
    // ask for permission to read the machine's fonts, so it has to be right.
    machineHas(installedFace("Calibri"));
    const source = sourceOf([bundledFamily("Charis")]);
    source.release();

    const listed = await hostFontAccess(source).getLocalFonts();

    expect(
      listed.map((font) => [font.family, font.location ?? "installed"])
    ).toEqual([
      ["Calibri", "installed"],
      ["Charis", "disk"],
    ]);
  });

  it("waits for the bundle manifest instead of answering without it", async () => {
    // The whole race. The chooser asks as it mounts; the manifest is a fetch
    // away. Answering "nothing shipped" now and something else later is what
    // put two enumerations in flight.
    machineHas(installedFace("Calibri"));
    const source = sourceOf([bundledFamily("Charis")]);
    const asked = hostFontAccess(source).getLocalFonts();

    let answered = false;
    void asked.then(() => (answered = true));
    await Promise.resolve();
    expect(answered).toBe(false);

    source.release();
    expect((await asked).map((font) => font.family)).toEqual([
      "Calibri",
      "Charis",
    ]);
  });

  it("lists one entry, the app's own, where a shipped family is also installed", async () => {
    machineHas(installedFace("Charis"), installedFace("Charis", "Bold"));
    const source = sourceOf([bundledFamily("Charis")]);
    source.release();

    const listed = await hostFontAccess(source).getLocalFonts();

    expect(listed).toEqual([
      {
        family: "Charis",
        postscriptName: "Charis-Regular",
        faceCount: 2,
        location: "disk",
      },
    ]);
  });

  it("passes on what the manifest says about a family the app ships", async () => {
    // The chooser reads these off the list rather than out of the font files,
    // which is what keeps 26 bundled families from being parsed on first load.
    machineHas(installedFace("Calibri"));
    const source = sourceOf([
      {
        ...bundledFamily("Charis"),
        facts: {
          license: "open",
          licenseReason: "Open Font License",
          coverage: [0x41, 0x5a],
          variants: [],
        },
      },
    ]);
    source.release();

    const listed = await hostFontAccess(source).getLocalFonts();

    const charis = listed.find((font) => font.family === "Charis");
    expect(charis?.declared?.license).toBe("open");
    expect([...(charis?.declared?.coverage ?? [])]).toEqual([0x41, 0x5a]);
    expect(charis?.declared?.variants).toEqual([]);
    // Nobody has read this one's tables, and the app must not pretend otherwise.
    expect(listed.find((font) => font.family === "Calibri")?.declared).toBe(
      undefined
    );
  });

  it("declares nothing for a manifest whose facts are the wrong shape", async () => {
    // Half a coverage range would have the chooser announce that a font cannot
    // write the user's alphabet; reading the file is the safer answer.
    machineHas();
    const source = sourceOf([
      {
        ...bundledFamily("Charis"),
        facts: { coverage: [0x41] } as unknown as BundledFamily["facts"],
      },
    ]);
    source.release();

    const listed = await hostFontAccess(source).getLocalFonts();

    expect(listed[0].declared).toBe(undefined);
  });

  it("still lists the machine's fonts when the app ships none", async () => {
    machineHas(installedFace("Calibri"));
    const source = sourceOf([]);
    source.release();

    expect(
      (await hostFontAccess(source).getLocalFonts()).map((font) => font.family)
    ).toEqual(["Calibri"]);
  });
});

describe("hostFontAccess getFontData", () => {
  it("reads a shipped family out of the app's own file", async () => {
    machineHas(installedFace("Calibri"));
    const source = sourceOf([bundledFamily("Charis")]);
    source.release();

    const got = await hostFontAccess(source).getFontData("Charis");

    expect(got.postscriptName).toBe("Charis-Regular");
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain(
      "Charis-Regular.ttf"
    );
  });

  it("reads an installed family through the Local Font Access API", async () => {
    machineHas(installedFace("Calibri"));
    const source = sourceOf([bundledFamily("Charis")]);
    source.release();

    const got = await hostFontAccess(source).getFontData("Calibri");

    expect(got.postscriptName).toBe("Calibri-Regular");
    // Nothing of the app's was fetched for a font the app does not have.
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("installLocalFontShim", () => {
  it("answers with the machine's faces and the app's own together", async () => {
    // The component's licence and coverage sweep reads this API directly rather
    // than through a prop, so a shim that hid the machine's faces left every
    // installed font unreadable while the bundle was on.
    machineHas(installedFace("Calibri"), installedFace("Calibri", "Bold"));
    const source = sourceOf([bundledFamily("Charis")]);
    source.release();
    const undo = installLocalFontShim(source);

    const faces = await window.queryLocalFonts!();
    undo();

    expect(faces.map((face) => face.postscriptName)).toEqual([
      "Calibri-Regular",
      "Calibri-Bold",
      "Charis-Regular",
      "Charis-Bold",
    ]);
  });

  it("takes the app's copy of a family the machine also has", async () => {
    machineHas(installedFace("Charis"));
    const source = sourceOf([bundledFamily("Charis")]);
    source.release();
    const undo = installLocalFontShim(source);

    const faces = await window.queryLocalFonts!();
    undo();

    expect(faces.map((face) => face.postscriptName)).toEqual([
      "Charis-Regular",
      "Charis-Bold",
    ]);
  });

  it("shows a bundle that arrived after it was installed", async () => {
    // Installed once for the page and asked afresh per call, so nothing has to
    // reinstall it when the manifest lands — which is what used to let the
    // sweep run against a shim that had never heard of the bundled families.
    machineHas(installedFace("Calibri"));
    const source = sourceOf([bundledFamily("Charis")]);
    const undo = installLocalFontShim(source);
    source.release();

    const faces = await window.queryLocalFonts!();
    undo();

    expect(faces.map((face) => face.family)).toContain("Charis");
  });

  it("puts the real API back when undone", async () => {
    const real = machineHas(installedFace("Calibri"));
    const source = sourceOf([bundledFamily("Charis")]);
    source.release();

    installLocalFontShim(source)();

    expect(window.queryLocalFonts).toBe(real);
  });

  it("answers with the app's own files where the machine's cannot be read", async () => {
    // No permission granted yet: the real API throws. The app's files are still
    // its files, and the chooser's own prompt is what gets the rest.
    window.queryLocalFonts = vi.fn(() =>
      Promise.reject(new Error("not allowed"))
    ) as unknown as typeof window.queryLocalFonts;
    const source = sourceOf([bundledFamily("Charis")]);
    source.release();
    const undo = installLocalFontShim(source);

    const faces = await window.queryLocalFonts!();
    undo();

    expect(faces.map((face) => face.family)).toEqual(["Charis", "Charis"]);
  });
});
