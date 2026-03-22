/* eslint-disable @typescript-eslint/no-explicit-any */
import { Field, isField, ReadonlyValue } from "@ethnolib/state-management-core";

/**
 * Base class for a field wrapper that exposes the underlying {@link Field}
 * value to Svelte templates.
 */
export abstract class SvelteField<T> {
  abstract get value(): ReadonlyValue<T>;
  abstract set value(v: T);
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

const hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Exposes a proxy that mirrors the provided field collection, unwrapping
 * {@link SvelteField}s back to their inner values before forwarding to Svelte.
 */
export function asUnwrapped<T extends object>(
  svelteFields: T
): SvelteViewModel<T> {
  return new Proxy({} as SvelteViewModel<T>, {
    get(_, prop: string | symbol) {
      if (typeof prop === "string" && hasOwnProperty.call(svelteFields, prop)) {
        const maybeField = (svelteFields as any)[prop];
        if (maybeField instanceof SvelteField) {
          return maybeField.value;
        }
        return maybeField;
      }
    },

    set(_, prop: string | symbol, value: unknown) {
      if (typeof prop === "string" && hasOwnProperty.call(svelteFields, prop)) {
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
      return typeof prop === "string" && hasOwnProperty.call(svelteFields, prop);
    },

    ownKeys(_) {
      return Object.keys(svelteFields);
    },

    getOwnPropertyDescriptor(_, prop: string | symbol) {
      if (typeof prop === "string" && hasOwnProperty.call(svelteFields, prop)) {
        return {
          configurable: true,
          enumerable: true,
          value: (svelteFields as any)[prop],
        };
      }
    },
  });
}

/**
 * Converts a plain view model into its Svelte-friendly counterpart by wrapping
 * {@link Field}s with {@link SvelteField} adapters.
 */
export function transformViewModel<T extends object>(
  viewModel: T,
  svelteFieldConstructor: new (field: Field<unknown>) => SvelteField<unknown>
) {
  const svelteFields: Partial<Record<keyof T, unknown>> = {};
  const keys = Object.keys(viewModel) as Array<keyof T>;

  for (const key of keys) {
    const value = viewModel[key];

    if (isField(value)) {
      const svelteField = new svelteFieldConstructor(value as Field<unknown>);
      svelteFields[key] = svelteField;
    } else {
      svelteFields[key] = value;
    }
  }

  return asUnwrapped(svelteFields as T);
}
