import { describe, expect, it } from "vitest";
import { Field } from "@ethnolib/state-management-core";
import { SvelteField, transformViewModel } from "../src/transform-view-model";

function useMyViewModel(params: { name?: string } = {}) {
  const name = params.name ?? "abc";
  const age = new Field(31);

  function haveBirthday() {
    age.value++;
  }

  return { name, age, haveBirthday };
}

class FakeSvelteField<T> extends SvelteField<T> {
  constructor(field: Field<T>) {
    super();
    this.field = field;
  }

  private field: Field<T>;

  public get value(): T {
    return this.field.value;
  }

  public set value(value: T) {
    this.field.requestUpdate(value);
  }
}

describe("use view model", () => {
  it("exposes field", () => {
    const viewModel = transformViewModel(useMyViewModel(), FakeSvelteField);
    expect(viewModel.age).toBe(31);
  });

  it("allows modifying the field", () => {
    const viewModel = transformViewModel(useMyViewModel(), FakeSvelteField);
    viewModel.age = 19;
    expect(viewModel.age).toBe(19);
  });

  it("exposes readonly property", () => {
    const viewModel = transformViewModel(
      useMyViewModel({ name: "abc" }),
      FakeSvelteField
    );
    expect(viewModel.name).toBe("abc");

    // @ts-expect-error Because `name` is not reactive, it should be readonly
    viewModel.name = "x";
  });

  it("exposes method", () => {
    const viewModel = transformViewModel(useMyViewModel(), FakeSvelteField);
    viewModel.age = 50;
    viewModel.haveBirthday();
    expect(viewModel.age).toBe(51);
  });

  it("supports `in` operator for field properties", () => {
    const viewModel = transformViewModel(useMyViewModel(), FakeSvelteField);
    expect("age" in viewModel).toBe(true);
  });

  it("supports `in` operator for non-field properties", () => {
    const viewModel = transformViewModel(useMyViewModel(), FakeSvelteField);
    expect("name" in viewModel).toBe(true);
  });

  it("supports `in` operator for non-existent properties", () => {
    const viewModel = transformViewModel(useMyViewModel(), FakeSvelteField);
    expect("nonExistent" in viewModel).toBe(false);
  });

  it("returns correct keys with Object.keys()", () => {
    const viewModel = transformViewModel(useMyViewModel(), FakeSvelteField);
    const keys = Object.keys(viewModel);
    expect(keys).toContain("age");
    expect(keys).toContain("name");
    expect(keys).toContain("haveBirthday");
  });

  it("supports spread syntax", () => {
    const viewModel = transformViewModel(useMyViewModel(), FakeSvelteField);
    const spread = { ...viewModel };
    expect(spread.age).toBe(31);
    expect(spread.name).toBe("abc");
    expect(typeof spread.haveBirthday).toBe("function");
  });

  it("supports for...in loop", () => {
    const viewModel = transformViewModel(useMyViewModel(), FakeSvelteField);
    const keys: string[] = [];
    for (const key in viewModel) {
      keys.push(key);
    }
    expect(keys).toContain("age");
    expect(keys).toContain("name");
    expect(keys).toContain("haveBirthday");
  });
});
