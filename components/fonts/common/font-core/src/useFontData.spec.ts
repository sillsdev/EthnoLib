import { describe, expect, it } from "vitest";
import { normalizeFontDataResult } from "./useFontData";

describe("normalizeFontDataResult", () => {
  it("takes bare bytes, the shape loaders returned before", () => {
    const data = new ArrayBuffer(8);

    expect(normalizeFontDataResult(data)).toEqual({
      data,
      postscriptName: undefined,
    });
  });

  it("keeps the face name when the loader supplies one", () => {
    const data = new ArrayBuffer(8);

    expect(
      normalizeFontDataResult({ data, postscriptName: "Andika-Regular" })
    ).toEqual({ data, postscriptName: "Andika-Regular" });
  });

  it("accepts the enriched shape without a name", () => {
    const data = new ArrayBuffer(8);

    expect(normalizeFontDataResult({ data })).toEqual({
      data,
      postscriptName: undefined,
    });
  });

  it("does not mistake bytes for the enriched shape", () => {
    // An ArrayBuffer has no `data` of its own, however it was created; bytes from
    // another realm (an iframe, a worker) have to come out unchanged too.
    const data = new Uint8Array([1, 2, 3, 4]).buffer;

    expect(normalizeFontDataResult(data).data).toBe(data);
  });
});
