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
