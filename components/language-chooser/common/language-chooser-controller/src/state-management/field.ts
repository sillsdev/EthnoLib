/**
 * Utility for binding a value to a reactive UI framework
 */
export class Field<T> {
  constructor(initialValue: T, onUpdateRequested?: (value: T) => T) {
    this._initialValue = initialValue;
    this._value = initialValue;
    this._onUpdateRequested = onUpdateRequested ?? ((value) => value);
  }

  /**
   * Callback to update the UI when the field changes
   */
  onUpdate: ((newValue: T) => void) | null = null;

  private _onUpdateRequested: (newValue: T) => T;

  /**
   * Send a request from the UI to update the value
   */
  public requestUpdate(value: T) {
    this.value = this._onUpdateRequested(value);
  }

  private _initialValue: T;
  private _value: T;

  public get value(): T {
    return this._value;
  }

  public set value(value: T) {
    try {
      if (this.onUpdate) this.onUpdate(value);
    } finally {
      this._value = value;
    }
  }

  public reset() {
    this.value = this._initialValue;
  }
}
