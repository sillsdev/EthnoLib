import React, { useEffect } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { Field } from "@ethnolib/state-management-core";
import { useField } from "./use-field";

describe("useField", () => {
  it("syncs field value and side effects", () => {
    const calls: Array<{ newValue: number; oldValue: number }> = [];
    const field = new Field<number>(1, (newValue, oldValue) => {
      calls.push({ newValue, oldValue });
    });

    const onValue = vi.fn();

    function Test() {
      const [value, setValue] = useField(field);
      useEffect(() => onValue(value), [value]);
      (field as any).__setValue = setValue;
      return null;
    }

    render(React.createElement(Test));

    expect(typeof field.updateUI).toBe("function");
    expect(onValue).toHaveBeenLastCalledWith(1);

    act(() => {
      (field as any).__setValue(2);
    });
    expect(field.value).toBe(2);
    expect(calls).toEqual([{ newValue: 2, oldValue: 1 }]);
  });
});
