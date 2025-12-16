import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react-hooks/server";
import { Field } from "@ethnolib/state-management-core";
import { useField } from "./use-field";

describe("useField", () => {
  it("syncs field value and side effects", () => {
    const calls: Array<{ newValue: number; oldValue: number }> = [];
    const field = new Field<number>(1, (newValue, oldValue) => {
      calls.push({ newValue, oldValue });
    });

    const { result } = renderHook(() => useField(field));

    expect(typeof field.updateUI).toBe("function");
    expect(result.current[0]).toBe(1);

    act(() => {
      result.current[1](2);
    });
    expect(field.value).toBe(2);
    expect(calls).toEqual([{ newValue: 2, oldValue: 1 }]);
  });
});
