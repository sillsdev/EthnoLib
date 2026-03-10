import { beforeEach, describe, expect, it, vi } from "vitest";
import { Field } from "@ethnolib/state-management-core";
import { useField } from "./use-field";

const reactMocks = vi.hoisted(() => ({
  setState: vi.fn(),
  useState: vi.fn(),
  useEffect: vi.fn(),
  cleanup: null as null | (() => void),
}));

vi.mock("react", () => ({
  useState: reactMocks.useState,
  useEffect: reactMocks.useEffect,
}));

describe("useField", () => {
  beforeEach(() => {
    reactMocks.setState.mockReset();
    reactMocks.useState.mockReset();
    reactMocks.useEffect.mockReset();
    reactMocks.cleanup = null;
    reactMocks.useState.mockImplementation((initialValue: unknown) => [
      initialValue,
      reactMocks.setState,
    ]);
    reactMocks.useEffect.mockImplementation((effect: () => void | (() => void)) => {
      const cleanup = effect();
      reactMocks.cleanup = typeof cleanup === "function" ? cleanup : null;
    });
  });

  it("returns the current field value and wires updateUI to state updates", () => {
    const field = new Field("initial");

    const [value] = useField(field);

    expect(value).toBe("initial");
    expect(reactMocks.useState).toHaveBeenCalledWith("initial");

    field.updateUI?.("from-ui");
    expect(reactMocks.setState).toHaveBeenCalledWith("from-ui");
  });

  it("setter requests field update and relies on updateUI for state sync", () => {
    const onUpdateRequested = vi.fn();
    const field = new Field("old", onUpdateRequested);

    const [, setValue] = useField(field);
    setValue("new");

    expect(field.value).toBe("new");
    expect(onUpdateRequested).toHaveBeenCalledWith("new", "old");
    expect(reactMocks.setState).toHaveBeenCalledWith("new");
    expect(reactMocks.setState).toHaveBeenCalledTimes(1);
  });

  it("clears field.updateUI on cleanup", () => {
    const field = new Field("initial");
    useField(field);

    expect(field.updateUI).not.toBeNull();
    reactMocks.cleanup?.();
    expect(field.updateUI).toBeNull();
  });
});