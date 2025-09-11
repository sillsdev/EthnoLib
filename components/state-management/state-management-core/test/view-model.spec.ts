import { expect, describe, it } from "vitest";
import { getFields, ViewModel } from "../src/view-model";
import { Field } from "../src/field";

class TestViewModel extends ViewModel {
  readonly name = new Field("James");
  readonly age = new Field(21);
}

describe("get fields", () => {
  it("should include all fields", () => {
    const viewModel = new TestViewModel();
    const fields = getFields(viewModel);
    expect(fields.name.value).toBe("James");
    expect(fields.age.value).toBe(21);
  });
});
