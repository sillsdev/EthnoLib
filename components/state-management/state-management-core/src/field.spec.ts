import { describe, it, expect, vi } from "vitest";
import { Field } from "./field";

describe("Field", () => {
  it("initializes with the correct value", () => {
    const field = new Field<number>(42);
    expect(field.value).toBe(42);
  });

  it("updates value and calls updateUI when set", () => {
    const field = new Field<string>("hello");
    const updateUISpy = vi.fn();
    field.updateUI = updateUISpy;
    field.value = "world";
    expect(field.value).toBe("world");
    expect(updateUISpy).toHaveBeenCalledWith("world");
  });

  it("does not call onUpdateRequested when setting value directly", () => {
    const onUpdateRequested = vi.fn();
    const field = new Field<string>("x", onUpdateRequested);
    field.value = "y";
    expect(field.value).toBe("y");
    expect(onUpdateRequested).not.toHaveBeenCalled();
  });

  it("calls onUpdateRequested when requestUpdate is used", () => {
    const onUpdateRequested = vi.fn();
    const field = new Field<string>("a", onUpdateRequested);
    field.requestUpdate("b");
    expect(field.value).toBe("b");
    expect(onUpdateRequested).toHaveBeenCalledWith("b", "a");
  });

  it("calls updateUI after setting value", () => {
    const events: string[] = [];
    const field = new Field("start");
    field.updateUI = (v) => events.push(`updateUI:${v},value:${field.value}`);
    field.value = "end";
    expect(events).toEqual(["updateUI:end,value:end"]);
    expect(field.value).toBe("end");
  });
});
