import { getFields, type ViewModel } from "@ethnolib/state-management-core";
import { SvelteField } from "./field.svelte";
import { asUnwrapped, type WithWrapped } from "./wrapped";

export function useViewModel<T extends ViewModel>(viewModel: T) {
  const fields = getFields(viewModel);
  const svelteFields = {} as WithWrapped<T>;
  for (const key in fields) {
    // @ts-expect-error The types work out
    svelteFields[key] = new SvelteField(fields[key]);
  }
  return asUnwrapped(svelteFields);
}
