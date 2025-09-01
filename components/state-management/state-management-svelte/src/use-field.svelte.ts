import type { Field } from "@ethnolib/state-management-core";

// TODO: This doesn't actually work yet
export function useField<T>(field: Field<T>) {
  const fieldState = $state(field.value);
  return fieldState;
}
