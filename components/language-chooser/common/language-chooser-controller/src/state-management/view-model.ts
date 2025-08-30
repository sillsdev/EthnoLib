import { Field } from "./field";

let nextId = 0;

export abstract class ViewModel {
  id: number = nextId++;

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
