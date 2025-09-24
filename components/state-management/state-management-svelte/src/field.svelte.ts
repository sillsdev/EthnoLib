import { Field } from "@ethnolib/state-management-core";
import { SvelteField } from "./transform-view-model";

export class SvelteFieldImpl<T> implements SvelteField<T> {
  constructor(field: Field<T>) {
    this._innerField = field;
    this._state = $state(field.value);
    field.onUpdate = (newValue) => (this._state = newValue);
  }

  private _innerField: Field<T>;
  private _state: T;

  get value(): T {
    return this._state;
  }

  set value(value: T) {
    this._state = value;
    this._innerField.requestUpdate(value);
  }
}
