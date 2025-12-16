import { describe, it, expect, vi, beforeEach } from "vitest";
import { Field } from "@ethnolib/state-management-core";

vi.mock("react", () => {
  let state: unknown;
  const useState = (initial: unknown) => {
    state = initial;
    const setState = (value: unknown) => {
      state = value;
    };
    return [state, setState] as const;
  };
  return { useState, __getState: () => state };
});

const { __getState } = vi.mocked(await import("react")) as unknown as {
  __getState: () => unknown;
};

const { useField } = await import("./use-field");

describe("useField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invokes requestUpdate and wires updateUI", () => {
    const calls: Array<{ newValue: number; oldValue: number }> = [];
    const field = new Field<number>(1, (newValue, oldValue) => {
      calls.push({ newValue, oldValue });
    });

    const [value, setValue] = useField(field);

    expect(value).toBe(1);
    expect(__getState()).toBe(1);

    setValue(2);
    expect(field.value).toBe(2);
    expect(calls).toEqual([{ newValue: 2, oldValue: 1 }]);
    expect(__getState()).toBe(2);

    field.updateUI?.(5);
    expect(__getState()).toBe(5);
  });
});
