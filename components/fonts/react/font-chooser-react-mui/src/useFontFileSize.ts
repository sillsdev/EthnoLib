import { useEffect, useRef, useState } from "react";
import { fetchFontFileSize } from "@ethnolib/font-core";

/** What measuring a font file's size has come to, so far. */
export interface MeasuredFileSize {
  /** The wire cost in bytes, once known. Stays undefined for a server that won't say. */
  bytes?: number;
  /**
   * That the question has been answered, even if the answer was "can't tell".
   * Until this is true the size isn't unknown, it is on its way — and choices
   * that hang on it (offer a button, or just download) should wait rather than
   * guess and correct themselves in front of the user.
   */
  settled: boolean;
}

/**
 * How big a font's file is, asked only when the answer is going to be shown.
 *
 * This exists for the metered-connection case, where the user is being asked
 * whether to spend a download and the size is most of what they have to go on.
 * The request itself is a HEAD, so it costs headers rather than a font — but a
 * page that fired one for every font in a list of hundreds would be doing exactly
 * the thing the constrained mode is there to avoid, hence `active`: nothing goes
 * out until the offer is actually in front of the user.
 *
 * Answers are kept for the life of the page, keyed by URL, so clicking back and
 * forth between two fonts asks each server once. An unanswerable size — no
 * `Content-Length`, a server that refuses HEAD — settles as `undefined` bytes,
 * and the caller shows the offer without a size on it.
 */
export function useFontFileSize(
  url: string | undefined,
  active: boolean
): MeasuredFileSize {
  const known = useRef(new Map<string, number | undefined>());
  const [measured, setMeasured] = useState<MeasuredFileSize>({
    settled: false,
  });

  useEffect(() => {
    if (!url || !active) {
      setMeasured({ settled: false });
      return;
    }
    if (known.current.has(url)) {
      setMeasured({ bytes: known.current.get(url), settled: true });
      return;
    }
    // A size arriving for the font the user has already clicked past would be
    // attached to whatever font is on screen now, so the request is called off
    // rather than merely ignored.
    const abort = new AbortController();
    setMeasured({ settled: false });
    void fetchFontFileSize(url, { signal: abort.signal }).then((found) => {
      if (abort.signal.aborted) return;
      known.current.set(url, found);
      setMeasured({ bytes: found, settled: true });
    });
    return () => abort.abort();
  }, [url, active]);

  return measured;
}
