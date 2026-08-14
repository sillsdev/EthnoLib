/**
 * Telling "the caller cancelled" apart from "this went wrong".
 *
 * The providers here swallow a good deal — one font's metadata failing to load is
 * no reason to fail a whole suggestion — and an abort must not be swallowed with
 * it. A cancelled request has to come back as a rejection, or a caller that moved
 * on to another language would see the old language's answer arrive as though it
 * were an answer about the new one.
 */

/** Whether an unknown rejection value is `fetch`'s abort, however it was thrown. */
export function isAbortError(error: unknown): boolean {
  // A DOMException from a real fetch, an Error with the name set from a test
  // double: both identify themselves the same way, and neither is instanceof
  // anything we can rely on across Node and the browser.
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

/**
 * Stop now if the caller has already cancelled, with whatever reason the signal
 * carries so the rejection is the same one `fetch` would have produced.
 */
export function throwIfAborted(signal: AbortSignal | undefined): void {
  if (!signal?.aborted) return;
  if (typeof signal.throwIfAborted === "function") signal.throwIfAborted();
  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  throw error;
}

/**
 * How long a suggestion request may hang before it fails instead.
 *
 * These providers issue single bare fetches, and a fetch has no deadline of its
 * own: a connection that stalls — a sleeping machine, a network that dropped
 * mid-request — sat unresolved for whole minutes, with the chooser's loading
 * states waiting on it the entire time. Failing is something every caller
 * already handles; hanging is not.
 */
export const SUGGESTION_REQUEST_TIMEOUT_MS = 30_000;

/**
 * A GET through the caller's fetch that gives up after `timeoutMs`.
 *
 * The timeout rejects with a `TimeoutError`, deliberately not an `AbortError`:
 * an abort means "the caller moved on" and is swallowed on every path here,
 * while a timeout is a failed request the caller must hear about. The caller's
 * own signal still cancels as before, and still reads as an abort.
 */
export async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  signal: AbortSignal | undefined,
  timeoutMs = SUGGESTION_REQUEST_TIMEOUT_MS
): Promise<Response> {
  throwIfAborted(signal);
  const controller = new AbortController();
  const timedOut = new Error(
    `The request took longer than ${Math.round(timeoutMs / 1000)}s: ${url}`
  );
  timedOut.name = "TimeoutError";
  const timer = setTimeout(() => controller.abort(timedOut), timeoutMs);
  const cancel = () => controller.abort(callerReason(signal));
  signal?.addEventListener("abort", cancel);
  try {
    return await fetchImpl(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}

/** The caller's cancellation, as the rejection `fetch` would have produced. */
function callerReason(signal: AbortSignal | undefined): unknown {
  if (signal && "reason" in signal && signal.reason !== undefined) {
    return signal.reason;
  }
  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
}
