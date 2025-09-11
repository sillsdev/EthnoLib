import { Field } from "./field";

let nextId = 0;

export abstract class ViewModel {
  id: number = nextId++;
}

type ViewModelField<T> = T extends Field<infer U> ? Field<U> : never;
type ViewModelFieldRecord<T> = { [K in keyof T]: ViewModelField<T[K]> };

export function getFields<T extends ViewModel>(
  viewModel: T
): ViewModelFieldRecord<T> {
  const fields = {} as ViewModelFieldRecord<T>;
  for (const key in viewModel) {
    if (viewModel[key] instanceof Field) {
      // @ts-expect-error `key` should be a property of `fields`
      fields[key] = viewModel[key];
    }
  }
  return fields;
}
