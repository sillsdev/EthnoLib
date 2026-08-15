// @vitest-environment jsdom
/**
 * That the demo's suggestions come out of the bundled snapshots and nowhere
 * else.
 *
 * The alphabet, the curated fonts and the letter-shape defaults used to be live
 * lookups with the bundle behind them; they are now the bundle alone, because
 * the data upstream moves by a language or two a month while the app ships three
 * times a year, and the live path cost seconds of waiting on a cold visit. So
 * the assertion that matters is not only that the answers arrive, but that
 * nothing went out to the network to get them — which is why `fetch` here fails
 * the test if anything reaches it.
 *
 * The hook is mounted rather than picked apart, since what would regress is a
 * provider quietly wired back up beside the bundled one, and that regression
 * passes every test of the bundled provider on its own. The rest of this
 * package's tests are pure and run in node (see vitest.config.ts); the docblock
 * above puts this file in a DOM.
 */
import React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSuggestedFonts, type SuggestedFonts } from "./useSuggestedFonts";

let globalFetch: ReturnType<typeof vi.fn>;
let container: HTMLDivElement;

beforeEach(() => {
  globalFetch = vi.fn(() => {
    throw new Error("the demo asked the network for a bundled answer");
  });
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

/**
 * Mounts the hook for one language and hands back what it last said. The broad
 * search is off: it is the one thing here that does reach the network, and it
 * waits to be asked anyway.
 */
async function suggestionsFor(
  languageTag: string,
  languageScript?: string
): Promise<SuggestedFonts> {
  let latest: SuggestedFonts | undefined;
  const Probe: React.FunctionComponent = () => {
    latest = useSuggestedFonts({
      alphabet: "",
      languageTag,
      languageScript,
      broadSearch: false,
    });
    return null;
  };
  await act(async () => {
    ReactDOM.render(<Probe />, container);
  });
  // The providers answer on a promise, so the render above is the question and
  // this is where the answers land.
  await act(async () => {
    await Promise.resolve();
  });
  if (!latest) throw new Error("the hook rendered nothing");
  return latest;
}

describe("useSuggestedFonts", () => {
  it("fills the alphabet from the bundle, without a request", async () => {
    const suggestions = await suggestionsFor("fuv");
    expect(suggestions.sldrChecked).toBe(true);
    // Nigerian Fulfulde, whose hooked letters are why the demo opens on it.
    expect(suggestions.sldrAlphabet).toContain("ɓ");
    expect(globalFetch).not.toHaveBeenCalled();
  });

  it("offers curated fonts from the bundle, without a request", async () => {
    const suggestions = await suggestionsFor("fuv");
    expect(suggestions.fonts?.length).toBeGreaterThan(0);
    expect(suggestions.fonts?.every((font) => font.supportsLanguage)).toBe(true);
    expect(suggestions.loading).toBe(false);
    expect(globalFetch).not.toHaveBeenCalled();
  });

  it("has letter-shape defaults for a language the SLDR gave some", async () => {
    const suggestions = await suggestionsFor("aa");
    expect(suggestions.fontFeatureDefaults).toBeDefined();
    expect(globalFetch).not.toHaveBeenCalled();
  });

  it("walks a long tag back to one the snapshot has", async () => {
    // The demo hands the providers its own fallback walk — shorter tags, then
    // the macrolanguage — because only language data knows that Maasina
    // Fulfulde is a variety of Fulah, and font-core has none.
    const suggestions = await suggestionsFor("ffm-Latn-ML");
    expect(suggestions.sldrAlphabet).toBeTruthy();
  });

  it("says nothing about where the answers came from", async () => {
    // Bundled is the only source now, so there is no provenance to announce and
    // no failure to report: the line the harness used to print is gone.
    const suggestions = await suggestionsFor("fuv");
    expect(suggestions.warning).toBeUndefined();
  });

  it("answers a bare tag from the script the host names", async () => {
    // `th` is Thai only because the host says so; the bundled font data files
    // its script-wide answers under the script.
    const suggestions = await suggestionsFor("th", "Thai");
    expect(suggestions.fonts?.length).toBeGreaterThan(0);
    expect(globalFetch).not.toHaveBeenCalled();
  });
});
