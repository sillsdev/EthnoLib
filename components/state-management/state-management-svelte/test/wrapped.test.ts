import { expect, describe, it } from "vitest";
import { asUnwrapped } from "../src/wrapped";
import { Field } from "@ethnolib/state-management-core";

describe("asUnwrapped", () => {
  it("should unwrap field getters", () => {
    const wrappedRecord = {
      name: new Field("John"),
      age: new Field(25),
    };

    const unwrapped = asUnwrapped(wrappedRecord);

    expect(unwrapped.name).toBe("John");
    expect(unwrapped.age).toBe(25);
  });

  it("should unwrap other wrapped interfaces", () => {
    const wrappedRecord = {
      name: { value: "John" },
    };

    const unwrapped = asUnwrapped(wrappedRecord);

    expect(unwrapped.name).toEqual("John");
  });

  it("should not unwrap normal values", () => {
    const wrappedRecord = {
      name: { value: "John" },
      age: 10,
    };

    const unwrapped = asUnwrapped(wrappedRecord);

    expect(unwrapped.age).toEqual(10);
  });

  it("should set wrapped values on property set", () => {
    const wrappedRecord = {
      name: new Field("John"),
      age: new Field(25),
    };

    const unwrapped = asUnwrapped(wrappedRecord);
    unwrapped.age = 30;

    expect(wrappedRecord.age.value).toBe(30);
  });

  it("should set non-field values on property set", () => {
    const wrappedRecord = {
      age: 25,
    };

    const unwrapped = asUnwrapped(wrappedRecord);
    unwrapped.age = 30;

    expect(wrappedRecord.age).toBe(30);
  });
});
