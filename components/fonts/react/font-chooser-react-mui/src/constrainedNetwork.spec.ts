import { describe, expect, it } from "vitest";
import {
  downloadPolicy,
  isConnectionConstrained,
  networkAvailability,
} from "./constrainedNetwork";

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

describe("networkAvailability", () => {
  it("is open when nobody has anything to report", () => {
    expect(networkAvailability(undefined, undefined, undefined)).toBe("open");
    expect(networkAvailability(undefined, {}, true)).toBe("open");
  });

  it("believes the host over a browser that sees no trouble", () => {
    // The field app on a phone knows what the desk-bound browser API doesn't.
    expect(networkAvailability("metered", { effectiveType: "4g" }, true)).toBe(
      "metered"
    );
    expect(networkAvailability("offline", { effectiveType: "4g" }, true)).toBe(
      "offline"
    );
  });

  it("believes the browser over a host that says nothing", () => {
    expect(networkAvailability(undefined, { saveData: true }, true)).toBe(
      "metered"
    );
    expect(networkAvailability(undefined, undefined, false)).toBe("offline");
  });

  it("takes the stricter of the two, whichever said it", () => {
    // A host that thinks it is merely metered, on a machine that has since lost
    // the network, must not go on offering downloads.
    expect(networkAvailability("metered", undefined, false)).toBe("offline");
    expect(networkAvailability("open", { saveData: true }, true)).toBe(
      "metered"
    );
    // And neither can talk the other into spending more than it wants to.
    expect(networkAvailability("offline", { saveData: true }, true)).toBe(
      "offline"
    );
  });

  it("trusts onLine only when it says no", () => {
    // `onLine === true` means an interface exists, not that anything is
    // reachable, so it can't overrule a host that says otherwise.
    expect(networkAvailability("offline", undefined, true)).toBe("offline");
    expect(networkAvailability(undefined, { saveData: true }, true)).toBe(
      "metered"
    );
  });
});

describe("downloadPolicy", () => {
  const remote = { installed: false, fileUrl: "https://cdn.example/font.ttf" };

  it("fetches without asking on an open connection", () => {
    expect(downloadPolicy("open", remote)).toBe("fetch");
  });

  it("asks first when the user is paying for it", () => {
    expect(downloadPolicy("metered", remote)).toBe("offer");
  });

  it("neither fetches nor offers when there is no network", () => {
    // The point of the third state: a "Preview this font (0.4 MB)" button on a
    // plane is a promise that fails when clicked.
    expect(downloadPolicy("offline", remote)).toBe("none");
  });

  it("reopens the offer after a failure, except offline", () => {
    expect(downloadPolicy("open", remote, true)).toBe("offer");
    expect(downloadPolicy("metered", remote, true)).toBe("offer");
    // "Try again" is a button that cannot work.
    expect(downloadPolicy("offline", remote, true)).toBe("none");
  });

  it("has nothing to do for a font already on the machine", () => {
    expect(downloadPolicy("open", { installed: true })).toBe("none");
    expect(downloadPolicy("offline", { installed: true })).toBe("none");
  });

  it("has nothing to do for a font with nowhere to fetch it from", () => {
    expect(downloadPolicy("open", { installed: false })).toBe("none");
    expect(downloadPolicy("metered", { installed: false })).toBe("none");
  });
});
