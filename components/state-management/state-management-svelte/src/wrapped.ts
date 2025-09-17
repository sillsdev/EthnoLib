import { Field } from "@ethnolib/state-management-core";

export interface Wrapped<T> {
  value: T;
}

function isWrapped(something: unknown): something is Wrapped<unknown> {
  return typeof something === "object" && "value" in (something as object);
}

type Unwrapped<T> = T extends Field<infer U> ? U : T;
type WithUnwrapped<T> = { -readonly [K in keyof T]: Unwrapped<T[K]> };

export function asUnwrapped<T extends object>(fields: T): WithUnwrapped<T> {
  return new Proxy({} as WithUnwrapped<T>, {
    get(_, prop: string | symbol) {
      if (typeof prop === "string" && prop in fields) {
        // @ts-expect-error We verified that `prop` is a valid key
        const maybeField = fields[prop];
        if (isWrapped(maybeField)) {
          return maybeField.value;
        }
        return maybeField;
      }
      return undefined;
    },

    set(_, prop: string | symbol, value: unknown) {
      if (typeof prop === "string" && prop in fields) {
        // @ts-expect-error We verified that `prop` is a valid key
        const maybeField = fields[prop];
        if (isWrapped(maybeField)) {
          maybeField.value = value;
        } else {
          // @ts-expect-error We verified that `prop` is a valid key
          fields[prop] = value;
        }
        return true;
      }
      return false;
    },
  });
}
