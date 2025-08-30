import { Field } from "./field";

export abstract class ViewModel {
  public reset() {
    for (const key of Object.keys(this)) {
      // @ts-expect-error We know `key` is a property of `this`
      const val = this[key];
      if (canBeReset(val)) {
        val.reset();
      } else if (val instanceof Array) {
        val.filter(canBeReset).forEach((item) => item.reset());
      }
    }
  }
}
function canBeReset(val: unknown) {
  return val instanceof Field || val instanceof ViewModel;
}
