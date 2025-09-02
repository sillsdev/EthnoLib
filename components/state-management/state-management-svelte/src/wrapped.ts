export interface Wrapped<T> {
  value: T;
}

export type WithWrapped<T> = {
  [K in keyof T]: T[K] extends Wrapped<unknown> ? T[K] : never;
};

type Unwrapped<T> = T extends Wrapped<infer U> ? U : never;
type WithUnwrapped<T> = { -readonly [K in keyof T]: Unwrapped<T[K]> };

export function asUnwrapped<T extends Record<string, Wrapped<unknown>>>(
  fields: T
): WithUnwrapped<T> {
  return new Proxy({} as WithUnwrapped<T>, {
    get(_, prop: string | symbol) {
      if (typeof prop === "string" && prop in fields) {
        return fields[prop].value;
      }
      return undefined;
    },

    set(_, prop: string | symbol, value: unknown) {
      if (typeof prop === "string" && prop in fields) {
        fields[prop].value = value;
        return true;
      }
      return false;
    },
  });
}
