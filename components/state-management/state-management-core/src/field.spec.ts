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

  describe("Readonly getter", () => {
    it("returns the stored value", () => {
      const obj = { a: 1 };
      const field = new Field(obj);
      expect(field.value).toEqual({ a: 1 });
    });

    it("getter return type is Readonly<T> — compile-time check", () => {
      const field = new Field({ a: 1 });
      // This must produce a TS error if uncommented, proving the type contract:
      // @ts-expect-error — mutating a Readonly field value is not allowed
      field.value.a = 99;
      expect(true).toBe(true); // test is about the type annotation above compiling correctly
    });

    it("setter accepts a plain (non-readonly) T", () => {
      const field = new Field<{ a: number }>({ a: 1 });
      field.value = { a: 2 }; // must compile without error
      expect(field.value.a).toBe(2);
    });
  });
});
