/**
 * Whether fetching a font unasked would be taking a liberty with the user's
 * connection.
 *
 * The chooser downloads a font the moment the user looks at it, because that is
 * the only way the pane can show them anything — the sample, the letter shapes and
 * the coverage all come out of the file. On a metered phone connection that same
 * helpfulness is a megabyte spent on a font they were only glancing at, so where
 * we have reason to think the connection is expensive the download waits for an
 * explicit click.
 *
 * The judgement is separated from the browser API so the rule itself can be
 * tested; `useConstrainedNetwork` is the part that watches the live connection.
 */

import { useEffect, useState } from "react";

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

/** The Network Information API, where the browser has one. */
function currentConnection(): ConnectionSignals | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { connection?: ConnectionSignals })
    .connection;
}

/**
 * Whether to hold downloads back, from the host's own word and the browser's
 * signals together.
 *
 * Either alone is enough. A host that knows it is running on a metered link — a
 * field app on a phone, say — says so and is believed whatever the browser
 * reports; and a host that says nothing still gets the right behaviour when the
 * user has data saver on. The connection can change under a running page, so we
 * listen for it.
 */
export function useConstrainedNetwork(hostSaysConstrained?: boolean): boolean {
  const [browserSays, setBrowserSays] = useState(() =>
    isConnectionConstrained(currentConnection())
  );

  useEffect(() => {
    const connection = currentConnection() as
      | (ConnectionSignals & EventTarget)
      | undefined;
    if (!connection?.addEventListener) return;
    const reread = () => setBrowserSays(isConnectionConstrained(connection));
    // Re-read on subscribing as well: the connection may have changed between
    // the first render and this effect.
    reread();
    connection.addEventListener("change", reread);
    return () => connection.removeEventListener("change", reread);
  }, []);

  return !!hostSaysConstrained || browserSays;
}
