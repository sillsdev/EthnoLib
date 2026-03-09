import { beforeEach, describe, expect, it, vi } from "vitest";
import { Field } from "@ethnolib/state-management-core";
import { useField } from "./use-field";

const reactMocks = vi.hoisted(() => ({
  setState: vi.fn(),
  useState: vi.fn(),
}));

vi.mock("react", () => ({
  useState: reactMocks.useState,
}));

describe("useField", () => {
  beforeEach(() => {
    reactMocks.setState.mockReset();
    reactMocks.useState.mockReset();
    reactMocks.useState.mockImplementation((initialValue: unknown) => [
      initialValue,
      reactMocks.setState,
    ]);
  });

  it("returns the current field value and wires updateUI to state updates", () => {
    const field = new Field("initial");

    const [value] = useField(field);

    expect(value).toBe("initial");
    expect(reactMocks.useState).toHaveBeenCalledWith("initial");

    field.updateUI?.("from-ui");
    expect(reactMocks.setState).toHaveBeenCalledWith("from-ui");
  });

  it("setter requests field update and updates local state", () => {
    const onUpdateRequested = vi.fn();
    const field = new Field("old", onUpdateRequested);

    const [, setValue] = useField(field);
    setValue("new");

    expect(field.value).toBe("new");
    expect(onUpdateRequested).toHaveBeenCalledWith("new", "old");
    expect(reactMocks.setState).toHaveBeenCalledWith("new");
  });
});