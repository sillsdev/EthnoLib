import { useState } from "react";
import { Field } from "@ethnolib/state-management-core";

export function useField<T>(field: Field<T>): [T, (value: T) => void] {
  const [fieldValue, _setFieldValue] = useState(field.value);

  function setFieldValue(value: T) {
    field.requestUpdate(value);
    _setFieldValue(value);
  }

  field.updateUI = (value) => _setFieldValue(value);

  return [fieldValue, setFieldValue];
}
