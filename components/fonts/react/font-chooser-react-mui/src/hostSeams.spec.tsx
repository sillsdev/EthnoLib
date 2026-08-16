// @vitest-environment jsdom
/**
 * The seams a host has to be able to reach through to run the chooser without
 * the open internet: where the sample passage comes from, and how font files are
 * fetched.
 *
 * These are tested by mounting the component rather than by calling a helper,
 * because what is being pinned down is precisely that the component asks the
 * host's thing instead of its own — and the way that regresses is a default
 * quietly staying wired up beside the injected one, which every unit-level test
 * of the default would still pass. So each test also watches the global `fetch`:
 * the point of supplying a provider is that nothing goes out to the network, and
 * an assertion that the injected function ran does not say that.
 *
 * The rest of this package's tests are pure and run in node (see
 * vitest.config.ts); the docblock above puts this file, and only this file, in a
 * DOM.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LocalFontFamily, SampleText } from "@ethnolib/font-core";
import { FontChooserScreen } from "./FontChooserScreen";
import { useFontDownloads } from "./useFontDownloads";
import type { FontInfo } from "./types";

/** A fetch that fails the test if anything reaches it. */
let globalFetch: ReturnType<typeof vi.fn>;
let container: HTMLDivElement;

beforeEach(() => {
  globalFetch = vi.fn(() => Promise.resolve(fileResponse(new ArrayBuffer(4))));
  vi.stubGlobal("fetch", globalFetch);
  // jsdom lays nothing out, so it has no `scrollIntoView`; the font list keeps
  // the selected row in view with one, and an effect that throws takes the
  // whole tree down with it.
  Element.prototype.scrollIntoView = vi.fn();
  window.localStorage.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => {
    ReactDOM.unmountComponentAtNode(container);
  });
  container.remove();
  vi.unstubAllGlobals();
});

/** Mount, and let the effects and the promises they start settle. */
async function mount(element: React.ReactElement): Promise<void> {
  await act(async () => {
    ReactDOM.render(element, container);
    // Two turns: the provider's promise resolves on the first, and what its
    // resolution sets off runs on the second.
    await Promise.resolve();
    await Promise.resolve();
  });
}

function fileResponse(bytes: ArrayBuffer): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    text: () => Promise.resolve(""),
    arrayBuffer: () => Promise.resolve(bytes),
  } as unknown as Response;
}

/** The least the screen needs to render at all, with no fonts to show. */
const bareProps = {
  onFontSelected: () => undefined,
  getLocalFonts: () => Promise.resolve([]),
};

describe("FontChooserScreen sample text", () => {
  it("asks the host's provider, and the network for nothing", async () => {
    const sample: SampleText = {
      text: "Kaari nder jaŋde.",
      source: "Bundled with this app",
    };
    const getSampleText = vi.fn((_tag: string) => Promise.resolve(sample));

    await mount(
      <FontChooserScreen
        {...bareProps}
        languageTag="fuv"
        network="offline"
        sampleTextProvider={{ getSampleText }}
      />
    );

    expect(getSampleText).toHaveBeenCalledTimes(1);
    expect(getSampleText.mock.calls[0][0]).toBe("fuv");
    // The whole point: a host that ships its own passages is not also quietly
    // reaching for Google's copy of them.
    expect(globalFetch).not.toHaveBeenCalled();
  });

  it("goes to the gflanguages data when the host supplies no provider", async () => {
    // The other half of the previous test: without the prop the default really
    // is a network call, so "no fetch happened" means the injection took.
    await mount(<FontChooserScreen {...bareProps} languageTag="hau" />);

    const asked = globalFetch.mock.calls.map((call) => String(call[0]));
    expect(asked.some((url) => url.includes("raw.githubusercontent.com"))).toBe(
      true
    );
  });

  it("does not re-ask when the host rebuilds its provider each render", async () => {
    // A host passing an object literal renders one on every pass, including the
    // renders this component's own answers cause; taking that as an effect
    // dependency would fetch the passage in a loop.
    const getSampleText = vi.fn(() => Promise.resolve(undefined));
    const props = {
      ...bareProps,
      languageTag: "hau",
      sampleTextProvider: { getSampleText },
    };

    await mount(<FontChooserScreen {...props} />);
    await mount(
      <FontChooserScreen {...props} sampleTextProvider={{ getSampleText }} />
    );

    expect(getSampleText).toHaveBeenCalledTimes(1);
  });
});

describe("FontChooserScreen local font listing", () => {
  const installed: LocalFontFamily = {
    family: "Calibri",
    postscriptName: "Calibri",
    faceCount: 2,
  };
  const shipped: LocalFontFamily = {
    family: "Charis",
    postscriptName: "Charis-Regular",
    faceCount: 4,
    location: "disk",
  };
  /** Enough to render the list and nothing that reaches for a passage. */
  const listProps = {
    onFontSelected: () => undefined,
    languageTag: "fuv",
    sampleTextProvider: { getSampleText: () => Promise.resolve(undefined) },
  };

  it("keeps the newest listing when an earlier one lands after it", async () => {
    // The shape of the demo's bug: the host's `getLocalFonts` changed when its
    // font bundle's manifest arrived, so a second listing started while the
    // first was still going, and a slow enumeration of the machine's fonts
    // finished after the quick one — leaving the user looking at whichever had
    // taken longer rather than at the answer to the newest question.
    let landFirst: (families: LocalFontFamily[]) => void = () => undefined;
    const first = new Promise<LocalFontFamily[]>((resolve) => {
      landFirst = resolve;
    });

    await act(async () => {
      ReactDOM.render(
        <FontChooserScreen {...listProps} getLocalFonts={() => first} />,
        container
      );
    });
    await mount(
      <FontChooserScreen
        {...listProps}
        getLocalFonts={() => Promise.resolve([installed, shipped])}
      />
    );
    await act(async () => {
      landFirst([installed]);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Charis");
    expect(container.textContent).toContain("Calibri");
  });

  it("remembers the machine's fonts and not the host app's own files", async () => {
    // The cache is read back before the host has said anything, so anything of
    // the host's put in it comes back looking installed — a bundle switched off
    // between visits reappeared as a list of fonts nobody had.
    await mount(
      <FontChooserScreen
        {...listProps}
        getLocalFonts={() => Promise.resolve([installed, shipped])}
      />
    );

    const cached = JSON.parse(
      window.localStorage.getItem("ethnolib.localFontList.s1") ?? "[]"
    ) as LocalFontFamily[];
    expect(cached.map((font) => font.family)).toEqual(["Calibri"]);
  });
});

describe("FontChooserScreen and the facts a host declares", () => {
  /**
   * A real font, because the point of the machine-font half of these tests is
   * that its bytes really are read and really do produce a licence and a
   * coverage. One of the bundle's smaller files, with no character variants, so
   * nothing here parses a megabyte.
   */
  const realFont = readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      "public",
      "fonts",
      "NotoSansMiao-Regular.ttf"
    )
  );

  /** Which PostScript names have had their bytes asked for. */
  let bytesRead: ReturnType<typeof vi.fn>;

  const declaredCharis: LocalFontFamily = {
    family: "Charis",
    postscriptName: "Charis-Regular",
    faceCount: 4,
    location: "disk",
    declared: {
      license: "open",
      licenseReason: "Open Font License",
      coverage: new Uint32Array([0x20, 0x7e]),
      variants: [],
    },
  };
  const installedMiao: LocalFontFamily = {
    family: "Noto Sans Miao",
    postscriptName: "NotoSansMiao-Regular",
    faceCount: 1,
  };

  beforeEach(() => {
    bytesRead = vi.fn();
    // The sweep reads the Local Font Access API directly rather than through a
    // prop, so this is where "did it touch the file?" can be watched.
    window.queryLocalFonts = vi.fn(
      async (options?: { postscriptNames?: string[] }) =>
        [declaredCharis, installedMiao]
          .filter(
            (font) =>
              !options?.postscriptNames ||
              options.postscriptNames.includes(font.postscriptName)
          )
          .map((font) => ({
            postscriptName: font.postscriptName,
            fullName: font.family,
            family: font.family,
            style: "Regular",
            blob: async () => {
              bytesRead(font.postscriptName);
              return blobOf(realFont);
            },
          }))
    ) as unknown as typeof window.queryLocalFonts;
  });

  afterEach(() => {
    delete window.queryLocalFonts;
  });

  /** Mount, then let the sweeps and their batched reporting finish. */
  async function settle(element: React.ReactElement): Promise<void> {
    await mount(element);
    for (let turn = 0; turn < 4; turn++) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    }
  }

  const props = {
    onFontSelected: () => undefined,
    languageTag: "fuv",
    sampleTextProvider: { getSampleText: () => Promise.resolve(undefined) },
    // The selected font's bytes are a separate path from the sweep — the pane
    // fetches them to draw with — and this test is about the sweep, so it is
    // answered without going near the API being watched.
    getFontData: () =>
      Promise.resolve({ data: new ArrayBuffer(0), postscriptName: "" }),
  };

  it("reads no bytes for a family whose facts the host declared", async () => {
    await settle(
      <FontChooserScreen
        {...props}
        getLocalFonts={() => Promise.resolve([declaredCharis, installedMiao])}
      />
    );

    expect(container.textContent).toContain("Charis");
    // The declared family is listed and settled without its file being opened;
    // the undeclared one is read exactly as it always was.
    expect(bytesRead.mock.calls.flat()).not.toContain("Charis-Regular");
    expect(bytesRead.mock.calls.flat()).toContain("NotoSansMiao-Regular");
  });

  it("caches what it read of the machine's font and nothing of the host's", async () => {
    // The caches exist to save re-reading the machine's fonts between visits.
    // The host says the same thing for free every time, and an entry for a
    // bundle switched off since would be a font nobody has, listed as covered.
    await settle(
      <FontChooserScreen
        {...props}
        getLocalFonts={() => Promise.resolve([declaredCharis, installedMiao])}
      />
    );

    const keys = Object.keys(window.localStorage).filter((key) =>
      /fontLicense|fontCoverage/.test(key)
    );
    expect(keys.some((key) => key.includes("Noto Sans Miao"))).toBe(true);
    expect(keys.some((key) => key.includes("Charis"))).toBe(false);
  });

  it("goes back to reading the file when the host declares nothing", async () => {
    // The bundle toggled off, or a host that never had facts to give: the same
    // family, listed plainly, is swept like any other.
    const { declared: _declared, ...plainCharis } = declaredCharis;
    await settle(
      <FontChooserScreen
        {...props}
        getLocalFonts={() => Promise.resolve([plainCharis])}
      />
    );

    expect(bytesRead.mock.calls.flat()).toContain("Charis-Regular");
  });
});

/**
 * The slice of `Blob` the font readers use, over bytes in hand. jsdom's own Blob
 * has no `arrayBuffer`, and ranged reading is exactly what is under test here.
 */
function blobOf(bytes: Uint8Array): Blob {
  return {
    slice: (start = 0, end = bytes.length) =>
      blobOf(bytes.subarray(start, end)),
    arrayBuffer: async () =>
      bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength
      ) as ArrayBuffer,
  } as unknown as Blob;
}

describe("useFontDownloads", () => {
  const font: FontInfo = {
    family: "Andika",
    installed: false,
    fileUrl: "app-fonts://andika/regular.ttf",
  };

  beforeEach(() => {
    // jsdom has no CSS Font Loading API; registering the face is not what these
    // tests are about, so it is stubbed away rather than worked around.
    vi.stubGlobal(
      "FontFace",
      class {
        load() {
          return Promise.resolve(this);
        }
      }
    );
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { add: vi.fn() },
    });
  });

  it("fetches the file with the host's fetch rather than the page's", async () => {
    const bytes = new ArrayBuffer(16);
    const hostFetch = vi.fn(() => Promise.resolve(fileResponse(bytes)));
    const downloads = renderDownloads(hostFetch as unknown as typeof fetch);

    let got: ArrayBuffer | undefined;
    await act(async () => {
      got = await downloads.current.download(font);
    });

    expect(hostFetch).toHaveBeenCalledWith(font.fileUrl);
    // A url with a scheme only the host can resolve is the case this exists
    // for: the page's own fetch would simply fail on it.
    expect(globalFetch).not.toHaveBeenCalled();
    expect(got).toBe(bytes);
  });

  it("fetches every file of a multi-file family the same way", async () => {
    const hostFetch = vi.fn((_url: string) =>
      Promise.resolve(fileResponse(new ArrayBuffer(8)))
    );
    const downloads = renderDownloads(hostFetch as unknown as typeof fetch);

    await act(async () => {
      await downloads.current.download({
        ...font,
        additionalFiles: [{ url: "app-fonts://andika/latin-ext.ttf" }],
      });
    });

    expect(hostFetch.mock.calls.map((call) => call[0])).toEqual([
      "app-fonts://andika/regular.ttf",
      "app-fonts://andika/latin-ext.ttf",
    ]);
  });

  it("falls back to the page's fetch when the host supplies none", async () => {
    const downloads = renderDownloads(undefined);

    await act(async () => {
      await downloads.current.download(font);
    });

    expect(globalFetch).toHaveBeenCalledWith(font.fileUrl);
  });

  /** Mounts the hook and hands back a handle on its current value. */
  function renderDownloads(fetchImpl: typeof fetch | undefined) {
    const handle = {
      current: undefined as unknown as ReturnType<typeof useFontDownloads>,
    };
    const Harness: React.FunctionComponent = () => {
      handle.current = useFontDownloads(() => undefined, fetchImpl);
      // Something has to be rendered for the hook to live in.
      useEffect(() => undefined, []);
      return null;
    };
    act(() => {
      ReactDOM.render(<Harness />, container);
    });
    return handle;
  }
});
