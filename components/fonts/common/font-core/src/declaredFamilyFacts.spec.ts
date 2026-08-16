/**
 * Declared facts on their way through JSON — a host's bundle manifest, or a
 * message from a process that has the font files and the page that doesn't.
 */

import { describe, expect, it } from "vitest";
import { parseFamilyFacts, serializeFamilyFacts } from "./declaredFamilyFacts";

describe("serializeFamilyFacts", () => {
  it("survives a round trip through JSON", () => {
    const facts = {
      license: "open" as const,
      licenseUrl: "https://openfontlicense.org",
      licenseReason: "Open Font License",
      coverage: new Uint32Array([0x20, 0x7e, 0x1e00, 0x1eff]),
      variants: [
        { tag: "cv01", number: 1, parameterLabels: [], characters: ["a"] },
      ],
    };

    const back = parseFamilyFacts(
      JSON.parse(JSON.stringify(serializeFamilyFacts(facts)))
    );

    expect(back?.license).toBe("open");
    expect(back?.licenseReason).toBe("Open Font License");
    expect([...(back?.coverage ?? [])]).toEqual([0x20, 0x7e, 0x1e00, 0x1eff]);
    expect(back?.variants).toEqual(facts.variants);
  });

  it("keeps an empty variants list, which is an answer", () => {
    const serialized = serializeFamilyFacts({ variants: [] });
    expect(serialized.variants).toEqual([]);
    expect(parseFamilyFacts(serialized)?.variants).toEqual([]);
  });

  it("writes nothing for what a host did not say", () => {
    expect(serializeFamilyFacts({ license: "open" })).toEqual({
      license: "open",
    });
  });
});

describe("parseFamilyFacts", () => {
  it("drops a coverage that isn't whole pairs", () => {
    // Half a range would have the chooser tell the user a font can't write
    // their alphabet, which is worse than not knowing.
    expect(parseFamilyFacts({ coverage: [0x41, 0x5a, 0x61] })).toBeUndefined();
  });

  it("drops values of the wrong type rather than trusting them", () => {
    expect(
      parseFamilyFacts({ license: 7, coverage: "0-255", variants: "none" })
    ).toBeUndefined();
  });

  it("answers undefined for anything that isn't an object", () => {
    expect(parseFamilyFacts(undefined)).toBeUndefined();
    expect(parseFamilyFacts(null)).toBeUndefined();
    expect(parseFamilyFacts("open")).toBeUndefined();
  });
});
