import { Field, ReadonlyValue } from "@ethnolib/state-management-core";
import { SvelteField } from "./transform-view-model";

export class SvelteFieldImpl<T> extends SvelteField<T> {
  constructor(field: Field<T>) {
    super();
    this._innerField = field;
    this._state = $state(field.value) as ReadonlyValue<T>;
    field.updateUI = (newValue) => (this._state = newValue);
  }

  private _innerField: Field<T>;
  private _state: ReadonlyValue<T>;

  get value(): ReadonlyValue<T> {
    return this._state;
  }

  set value(value: T) {
    this._state = value as ReadonlyValue<T>;
    this._innerField.requestUpdate(value);
  }
}
