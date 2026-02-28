/**
 * Returns Readonly<T> for objects and arrays, but leaves primitives and
 * functions as T so that function-valued fields remain callable.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type ReadonlyValue<T> = T extends Function ? T : Readonly<T>;

/**
 * Utility for binding a value to a reactive UI framework
 */
export class Field<T> {
  constructor(
    initialValue: T,
    onUpdateRequested?: (newValue: T, oldValue: T) => void
  ) {
    this._value = initialValue;
    this._onUpdateRequested = onUpdateRequested;
  }

  public updateUI: ((newValue: ReadonlyValue<T>) => void) | null = null;

  /**
   * A side effect that should run when the user updates the value
   */
  private _onUpdateRequested: ((newValue: T, oldValue: T) => void) | undefined;

  /**
   * Update the value and run the onUpdateRequested side effect
   */
  public requestUpdate(value: T) {
    const oldValue = this._value;
    this.value = value;
    if (this._onUpdateRequested) {
      this._onUpdateRequested(value, oldValue);
    }
  }

  private _value: T;

  /**
   * Returns a readonly view of the stored value. Callers must not mutate the
   * returned object in place; always assign a new value via the setter instead.
   * This ensures reference-equality-based change detection works correctly
   * across all UI framework adapters.
   */
  public get value(): ReadonlyValue<T> {
    return this._value as ReadonlyValue<T>;
  }

  /**
   * Update the value without side effects
   */
  public set value(value: T) {
    this._value = value;
    if (this.updateUI) this.updateUI(this._value as ReadonlyValue<T>);
  }
}
