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
import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SampleText } from "@ethnolib/font-core";
import { FontChooserScreen } from "./FontChooserScreen";
import { useFontDownloads } from "./useFontDownloads";
import type { FontInfo } from "./types";

/** A fetch that fails the test if anything reaches it. */
let globalFetch: ReturnType<typeof vi.fn>;
let container: HTMLDivElement;

beforeEach(() => {
  globalFetch = vi.fn(() =>
    Promise.resolve(fileResponse(new ArrayBuffer(4)))
  );
  vi.stubGlobal("fetch", globalFetch);
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
    await mount(<FontChooserScreen {...props} sampleTextProvider={{ getSampleText }} />);

    expect(getSampleText).toHaveBeenCalledTimes(1);
  });
});

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
    const handle = { current: undefined as unknown as ReturnType<typeof useFontDownloads> };
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
