import { expect, it, describe } from "vitest";
import { doMath } from "./controller";

describe("doing math", () => {
  it("just works", () => {
    expect(doMath(3, 4)).toBe(7);
  });
});
