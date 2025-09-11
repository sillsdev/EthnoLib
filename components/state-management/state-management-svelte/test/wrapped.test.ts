import { expect, describe, it } from "vitest";
import { asUnwrapped } from "../src/wrapped";

describe("asUnwrapped", () => {
  it("should unwrap getters", () => {
    const wrappedRecord = {
      name: {
        value: "John",
      },
      age: {
        value: 25,
      },
    };

    const unwrapped = asUnwrapped(wrappedRecord);

    expect(unwrapped.name).toBe("John");
    expect(unwrapped.age).toBe(25);
  });

  it("should set wrapped values on property set", () => {
    const wrappedRecord = {
      name: {
        value: "John",
      },
      age: {
        value: 25,
      },
    };

    const unwrapped = asUnwrapped(wrappedRecord);
    unwrapped.age = 30;

    expect(wrappedRecord.age.value).toBe(30);
  });
});
