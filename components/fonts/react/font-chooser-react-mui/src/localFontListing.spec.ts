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
    machineCount: 0,
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
    expect(
      shouldOfferLocalFontListing(state({ localCount: 12, machineCount: 12 }))
    ).toBe(false);
  });

  it("keeps asking while the only listed fonts are ones the host app ships", () => {
    // A host that bundles font files fills the list without ever touching the
    // machine's own, and the user's installed fonts are still unlisted and
    // still unaskable-for unless the prompt stays.
    expect(
      shouldOfferLocalFontListing(
        state({ hostSupplies: true, localCount: 21, machineCount: 0 })
      )
    ).toBe(true);
  });

  it("stops asking once a host's list carries the machine's fonts too", () => {
    expect(
      shouldOfferLocalFontListing(
        state({ hostSupplies: true, localCount: 300, machineCount: 279 })
      )
    ).toBe(false);
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

  it("stops asking a host with no API behind it once it has answered", () => {
    expect(
      shouldOfferLocalFontListing(
        state({ supported: false, hostSupplies: true, localCount: 4 })
      )
    ).toBe(false);
  });

  it("says nothing where there is no way to list fonts at all", () => {
    expect(shouldOfferLocalFontListing(state({ supported: false }))).toBe(
      false
    );
  });
});
