import { useEffect, useState } from "react";
import { Field } from "@ethnolib/state-management-core";

export function useField<T>(field: Field<T>): [T, (value: T) => void] {
  const [fieldValue, _setFieldValue] = useState<T>(field.value as T);

  function setFieldValue(value: T) {
    field.requestUpdate(value);
  }

  useEffect(() => {
    field.updateUI = (value) => _setFieldValue(value as T);
    return () => {
      field.updateUI = null;
    };
  }, [field]);

  return [fieldValue, setFieldValue];
}
