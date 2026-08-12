import { useCallback, useEffect, useRef, useState } from "react";
import { loadLocalFontDataByFamilyWithName } from "./localFonts";

/**
 * What a font loader may hand back: the bytes on their own, as loaders always did,
 * or the bytes together with the PostScript name of the face they came from.
 *
 * The name is worth supplying when it is known. A face that lives in a collection
 * (.ttc) comes with the bytes of the whole collection, several families' worth, and
 * only the PostScript name says which font inside is the one being asked about; see
 * sfntBlob.ts. Without it the readers fall back to the first font in the file,
 * which is how a font came to report another family's characters as its own.
 */
export type FontDataResult =
  | ArrayBuffer
  | { data: ArrayBuffer; postscriptName?: string };

/** Read either shape of loader result the same way. */
export function normalizeFontDataResult(result: FontDataResult): {
  data: ArrayBuffer;
  postscriptName?: string;
} {
  // Not `instanceof ArrayBuffer`: bytes that crossed a realm (an iframe, a worker)
  // fail that test while still being what we want.
  if (result && typeof result === "object" && "data" in result) {
    return { data: result.data, postscriptName: result.postscriptName };
  }
  return { data: result as ArrayBuffer };
}

/**
 * Keep the bytes of one font family loaded, since the bytes are the only place a
 * font's OpenType features live.
 *
 * Reading them needs a permission the page may not have yet, and the browser only
 * grants it off a click, so the first attempt on a fresh page usually fails. Call
 * `retry` once whatever asked for that permission has succeeded — the chooser's
 * "list installed fonts" button, say — and the load happens again.
 *
 * `getFontData` defaults to the Local Font Access API; an app with its own font
 * source passes its own, returning either bare bytes or bytes with the face's
 * PostScript name. It is held in a ref, so an inline arrow doesn't set off a
 * reload on every render.
 */
export function useFontData(
  font: string,
  getFontData: (
    font: string
  ) => Promise<FontDataResult> = loadLocalFontDataByFamilyWithName
): {
  fontData: ArrayBuffer | undefined;
  /** The face the bytes came from, when the loader says. Pass it to the readers. */
  postscriptName: string | undefined;
  loading: boolean;
  error: Error | undefined;
  retry: () => void;
} {
  const [fontData, setFontData] = useState<ArrayBuffer | undefined>();
  const [postscriptName, setPostscriptName] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();
  const [attempt, setAttempt] = useState(0);

  const getFontDataRef = useRef(getFontData);
  getFontDataRef.current = getFontData;

  useEffect(() => {
    setFontData(undefined);
    setPostscriptName(undefined);
    setError(undefined);
    if (!font) return;

    let stale = false;
    setLoading(true);
    getFontDataRef
      .current(font)
      .then((result) => {
        if (stale) return;
        const { data, postscriptName: name } = normalizeFontDataResult(result);
        setFontData(data);
        setPostscriptName(name);
      })
      .catch((e: Error) => {
        if (!stale) setError(e);
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });
    // Ignore a load that finished after the user moved on to another font.
    return () => {
      stale = true;
    };
  }, [font, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { fontData, postscriptName, loading, error, retry };
}
