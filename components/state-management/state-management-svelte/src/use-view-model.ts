import { Field } from "@ethnolib/state-management-core";
import { SvelteField } from "./field.svelte";
import { asUnwrapped } from "./wrapped";

export type SvelteViewModel<T extends object> = ReturnType<
  typeof useViewModel<T>
>;

export function useViewModel<T extends object>(viewModel: T) {
  const svelteFields = {} as T;
  for (const key in viewModel) {
    if (viewModel[key] instanceof Field) {
      // Since `asUnwrapped()` only uses the field's `value` property,
      // `svelteFields[key]` can be anything with a `value` property.
      // @ts-expect-error See above
      svelteFields[key] = new SvelteField(viewModel[key]);
    } else {
      svelteFields[key] = viewModel[key];
    }
  }
  return asUnwrapped(svelteFields);
}
