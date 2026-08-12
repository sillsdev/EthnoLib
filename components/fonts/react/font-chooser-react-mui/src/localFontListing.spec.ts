import { describe, expect, it } from "vitest";
import {
  LocalFontListingState,
  shouldOfferLocalFontListing,
} from "./localFontListing";

function state(
  over: Partial<LocalFontListingState> = {}
): LocalFontListingState {
  return {
    supported: true,
    hostSupplies: false,
    localCount: 0,
    listing: false,
    ...over,
  };
}

describe("shouldOfferLocalFontListing", () => {
  it("asks for the machine's fonts when we have none of them yet", () => {
    expect(shouldOfferLocalFontListing(state())).toBe(true);
  });

  it("keeps asking even though the host's catalog has filled the list", () => {
    // The bug this exists for: a catalog meant the empty state never showed, and
    // with it went the only way to ask for permission.
    expect(shouldOfferLocalFontListing(state({ localCount: 0 }))).toBe(true);
  });

  it("stops asking once the machine's fonts are listed", () => {
    expect(shouldOfferLocalFontListing(state({ localCount: 12 }))).toBe(false);
  });

  it("stops asking while a listing is in flight", () => {
    expect(shouldOfferLocalFontListing(state({ listing: true }))).toBe(false);
  });

  it("asks on behalf of a host that lists fonts its own way", () => {
    expect(
      shouldOfferLocalFontListing(
        state({ supported: false, hostSupplies: true })
      )
    ).toBe(true);
  });

  it("says nothing where there is no way to list fonts at all", () => {
    expect(shouldOfferLocalFontListing(state({ supported: false }))).toBe(
      false
    );
  });
});
