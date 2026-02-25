/* eslint-disable @typescript-eslint/no-explicit-any */
import { Field } from "@ethnolib/state-management-core";

export abstract class SvelteField<T> {
  abstract value: T;
}

type UnwrappedField<T> = T extends Field<infer U> ? U : T;

export type SvelteViewModel<T> = {
  -readonly [K in keyof T as T[K] extends Field<any>
    ? K
    : never]: UnwrappedField<T[K]>;
} & {
  readonly [K in keyof T as T[K] extends Field<any>
    ? never
    : K]: UnwrappedField<T[K]>;
};

export function asUnwrapped<T extends object>(
  svelteFields: T
): SvelteViewModel<T> {
  return new Proxy({} as SvelteViewModel<T>, {
    get(_, prop: string | symbol) {
      if (typeof prop === "string" && prop in svelteFields) {
        const maybeField = (svelteFields as any)[prop];
        if (maybeField instanceof SvelteField) {
          return maybeField.value;
        }
        return maybeField;
      }
    },

    set(_, prop: string | symbol, value: unknown) {
      if (typeof prop === "string" && prop in svelteFields) {
        const maybeField = (svelteFields as any)[prop];
        if (maybeField instanceof SvelteField) {
          maybeField.value = value;
        } else {
          (svelteFields as any)[prop] = value;
        }
        return true;
      }
      return false;
    },

    has(_, prop: string | symbol) {
      return typeof prop === "string" && prop in svelteFields;
    },

    ownKeys(_) {
      return Object.keys(svelteFields);
    },

    getOwnPropertyDescriptor(_, prop: string | symbol) {
      if (typeof prop === "string" && prop in svelteFields) {
        return {
          configurable: true,
          enumerable: true,
          value: (svelteFields as any)[prop],
        };
      }
    },
  });
}

export function transformViewModel<T extends object>(
  viewModel: T,
  svelteFieldConstructor: new (field: Field<unknown>) => SvelteField<unknown>
) {
  const svelteFields = {} as any;
  for (const key in viewModel) {
    if (viewModel[key] instanceof Field) {
      const svelteField = new svelteFieldConstructor(viewModel[key]);
      svelteFields[key] = svelteField;
    } else {
      svelteFields[key] = viewModel[key];
    }
  }
  return asUnwrapped(svelteFields as T);
}
