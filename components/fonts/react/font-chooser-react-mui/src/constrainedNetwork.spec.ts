import { describe, expect, it } from "vitest";
import { isConnectionConstrained } from "./constrainedNetwork";

describe("isConnectionConstrained", () => {
  it("reads a browser that tells us nothing as unconstrained", () => {
    // Every non-Chromium browser lands here, and no browser at all is a reason
    // to stop fetching the file the pane is built out of.
    expect(isConnectionConstrained(undefined)).toBe(false);
    expect(isConnectionConstrained(null)).toBe(false);
    expect(isConnectionConstrained({})).toBe(false);
  });

  it("takes the user's data-saver setting as settling it", () => {
    expect(isConnectionConstrained({ saveData: true })).toBe(true);
    expect(
      isConnectionConstrained({ saveData: true, effectiveType: "4g" })
    ).toBe(true);
  });

  it("holds off on the connections a megabyte is a wait on", () => {
    expect(isConnectionConstrained({ effectiveType: "slow-2g" })).toBe(true);
    expect(isConnectionConstrained({ effectiveType: "2g" })).toBe(true);
    expect(isConnectionConstrained({ effectiveType: "3g" })).toBe(true);
  });

  it("leaves a fast connection alone", () => {
    expect(isConnectionConstrained({ effectiveType: "4g" })).toBe(false);
    expect(isConnectionConstrained({ saveData: false })).toBe(false);
    // A bucket name we have never heard of is not one we can call slow.
    expect(isConnectionConstrained({ effectiveType: "5g" })).toBe(false);
  });
});
