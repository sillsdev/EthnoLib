/**
 * What the chooser is allowed to spend on the user's connection — and whether
 * there is a connection at all.
 *
 * The chooser downloads a font the moment the user looks at it, because that is
 * the only way the pane can show them anything — the sample, the letter shapes and
 * the coverage all come out of the file. That generosity has three settings:
 *
 * - **open**: fetch freely. A font is a click and a moment.
 * - **metered**: a megabyte spent on a font somebody was only glancing at is a
 *   real cost, so the download waits for an explicit click with its size beside
 *   it. Everything is still *reachable*; the user is being asked first.
 * - **offline**: there is nothing to ask. A click cannot produce the font, so
 *   offering the download would be offering something we can't deliver — the
 *   chooser says the font isn't available and gets out of the way, leaving the
 *   user to choose among what the machine already has.
 *
 * The difference between the last two is the whole reason this is three states
 * and not a boolean: they look alike from the code's side (don't fetch) and are
 * opposites from the user's (ask me / don't bother me). A "Preview this font
 * (0.4 MB)" button on a plane is a promise that fails when clicked.
 *
 * The judgement is separated from the browser APIs so the rules themselves can be
 * tested; `useNetworkAvailability` is the part that watches the live connection.
 */

import { useEffect, useState } from "react";

/** How much of the network the chooser has. See the file's header. */
export type NetworkAvailability = "open" | "metered" | "offline";

/** What the Network Information API tells us, of the little we ask it. */
export interface ConnectionSignals {
  /** The user has asked the browser to save data. Their word, so it settles it. */
  saveData?: boolean;
  /** The connection's measured speed, bucketed: "slow-2g", "2g", "3g", "4g". */
  effectiveType?: string;
}

/**
 * The effective types slow enough that a font download is a wait rather than a
 * moment. "4g" — which is also what a fast wired connection reports — is not one
 * of them.
 */
const SLOW_TYPES = new Set(["slow-2g", "2g", "3g"]);

/**
 * Whether these connection signals say to hold off. A browser with no Network
 * Information API tells us nothing, and nothing is not a reason to degrade the
 * experience, so it reads as unconstrained.
 */
export function isConnectionConstrained(
  connection?: ConnectionSignals | null
): boolean {
  if (!connection) return false;
  if (connection.saveData === true) return true;
  return (
    connection.effectiveType !== undefined &&
    SLOW_TYPES.has(connection.effectiveType)
  );
}

/** How restrictive each state is, so that the strictest of several can win. */
const SEVERITY: Record<NetworkAvailability, number> = {
  open: 0,
  metered: 1,
  offline: 2,
};

/**
 * The state to act on, given what the host says and what the browser reports:
 * whichever of them is more restrictive.
 *
 * Both are believed, and neither can relax the other. A host that knows it is
 * running on a metered link — a field app on a phone — says so and is believed
 * though the browser reports a fine connection; and a host that says nothing
 * still stops fetching when the browser goes offline underneath it. `onLine` is
 * only ever trusted in the pessimistic direction, which is the only direction it
 * is reliable in: `navigator.onLine === true` means "there is an interface", not
 * "the internet is reachable", while `false` genuinely means nothing will get
 * out.
 */
export function networkAvailability(
  hostSays: NetworkAvailability | undefined,
  connection: ConnectionSignals | undefined | null,
  onLine: boolean | undefined
): NetworkAvailability {
  const browserSays: NetworkAvailability =
    onLine === false
      ? "offline"
      : isConnectionConstrained(connection)
        ? "metered"
        : "open";
  const host = hostSays ?? "open";
  return SEVERITY[host] >= SEVERITY[browserSays] ? host : browserSays;
}

/** The Network Information API, where the browser has one. */
function currentConnection(): ConnectionSignals | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { connection?: ConnectionSignals })
    .connection;
}

/** `navigator.onLine`, or undefined where there is no navigator to ask. */
function currentOnLine(): boolean | undefined {
  if (typeof navigator === "undefined") return undefined;
  return navigator.onLine;
}

/**
 * What the chooser may spend, from the host's own word and the browser's signals
 * together — kept current, since both can change under a running page. A user who
 * walks out of coverage should stop being offered downloads before they click
 * one, not after.
 */
export function useNetworkAvailability(
  hostSays?: NetworkAvailability
): NetworkAvailability {
  const [browser, setBrowser] = useState(() => ({
    connection: currentConnection(),
    onLine: currentOnLine(),
  }));

  useEffect(() => {
    const reread = () =>
      setBrowser({ connection: currentConnection(), onLine: currentOnLine() });
    // Re-read on subscribing as well: either may have changed between the first
    // render and this effect.
    reread();

    const connection = currentConnection() as
      | (ConnectionSignals & EventTarget)
      | undefined;
    connection?.addEventListener?.("change", reread);
    window.addEventListener?.("online", reread);
    window.addEventListener?.("offline", reread);
    return () => {
      connection?.removeEventListener?.("change", reread);
      window.removeEventListener?.("online", reread);
      window.removeEventListener?.("offline", reread);
    };
  }, []);

  return networkAvailability(hostSays, browser.connection, browser.onLine);
}

/**
 * What to do about a font the machine hasn't got — the one decision the three
 * states exist for, in one place because it is asked in two: the screen decides
 * whether to fetch, and the pane decides what to put on screen about it, and the
 * two disagreeing is how a pane comes to offer a download that never starts.
 *
 * - **fetch**: get it now; the pane will fill in by itself.
 * - **offer**: hold off and let the user decide, size in hand.
 * - **none**: don't fetch and don't offer. Either there is nowhere to fetch it
 *   from, or there is no network to fetch it over.
 *
 * A failed download reopens the offer whatever the connection was doing, since
 * the button is then the only way back to the font — except offline, where
 * "try again" is a button that cannot work.
 */
export function downloadPolicy(
  network: NetworkAvailability,
  font: { installed?: boolean; fileUrl?: string },
  failed?: boolean
): "fetch" | "offer" | "none" {
  if (font.installed !== false) return "none";
  if (!font.fileUrl) return "none";
  if (network === "offline") return "none";
  if (network === "metered" || failed) return "offer";
  return "fetch";
}
