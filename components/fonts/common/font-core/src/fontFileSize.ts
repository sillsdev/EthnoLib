/**
 * How big a font file is, without fetching it.
 *
 * This is for the one case where the size decides something: a user on a metered
 * or slow connection is being asked whether to spend the download at all, and
 * "1.1 MB" is the whole of what they have to go on. Everywhere else the file is
 * simply fetched, and asking first would just be a second round trip.
 *
 * A size we can't get is not an error worth reporting — the server may not send
 * `Content-Length`, may refuse HEAD, or may not be reachable at all — so every
 * failure comes back as `undefined` and the caller shows the offer without a size
 * on it.
 */

export interface FontFileSizeOptions {
  /** For tests, and for hosts whose fetch needs credentials or a timeout. */
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

/** The `Content-Length` of a font file, in bytes, or `undefined` if we can't tell. */
export async function fetchFontFileSize(
  url: string,
  options: FontFileSizeOptions = {}
): Promise<number | undefined> {
  const { fetchImpl = fetch, signal } = options;
  try {
    const response = await fetchImpl(url, { method: "HEAD", signal });
    if (!response.ok) return undefined;
    const header = response.headers?.get("content-length");
    if (!header) return undefined;
    const size = Number(header);
    return Number.isFinite(size) && size > 0 ? size : undefined;
  } catch {
    return undefined;
  }
}
