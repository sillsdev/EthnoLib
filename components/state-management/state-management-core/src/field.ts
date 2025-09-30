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

  public updateUI: ((newValue: T) => void) | null = null;

  /**
   * A side effect that should run when the user updates the value
   */
  private _onUpdateRequested: ((newValue: T, oldValue: T) => void) | undefined;

  /**
   * Update the value and run the onUpdateRequested side effect
   */
  public requestUpdate(value: T) {
    const oldValue = this.value;
    this.value = value;
    if (this._onUpdateRequested) {
      this._onUpdateRequested(value, oldValue);
    }
  }

  private _value: T;

  public get value(): T {
    return this._value;
  }

  /**
   * Update the value without side effects
   */
  public set value(value: T) {
    try {
      if (this.updateUI) this.updateUI(value);
    } finally {
      this._value = value;
    }
  }
}
