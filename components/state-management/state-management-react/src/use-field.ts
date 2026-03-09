import { useCallback, useEffect, useState } from "react";
import { Field } from "@ethnolib/state-management-core";

type FieldSubscriber<T> = (value: T) => void;

type FieldSubscriptionState = {
  previousUpdateUI: ((value: unknown) => void) | null;
  subscribers: Set<(value: unknown) => void>;
};

const fieldSubscriptionStates = new WeakMap<Field<unknown>, FieldSubscriptionState>();

// If React 17 support is dropped, this adapter can be simplified substantially
// by rewriting useField() around useSyncExternalStore instead of maintaining a
// manual subscriber registry.

function subscribeToField<T>(field: Field<T>, subscriber: FieldSubscriber<T>) {
  let subscriptionState = fieldSubscriptionStates.get(field as Field<unknown>);
  if (!subscriptionState) {
    const subscribers = new Set<(value: unknown) => void>();
    const previousUpdateUI =
      (field.updateUI as ((value: unknown) => void) | null) ?? null;
    const dispatchToSubscribers = (value: unknown) => {
      previousUpdateUI?.(value);
      subscribers.forEach((currentSubscriber) => currentSubscriber(value));
    };

    subscriptionState = {
      previousUpdateUI,
      subscribers,
    };
    fieldSubscriptionStates.set(field as Field<unknown>, subscriptionState);
    field.updateUI = dispatchToSubscribers as Field<T>["updateUI"];
  }

  subscriptionState.subscribers.add(subscriber as (value: unknown) => void);

  return () => {
    const currentState = fieldSubscriptionStates.get(field as Field<unknown>);
    if (!currentState) {
      return;
    }

    currentState.subscribers.delete(subscriber as (value: unknown) => void);
    if (currentState.subscribers.size === 0) {
      field.updateUI = currentState.previousUpdateUI as Field<T>["updateUI"];
      fieldSubscriptionStates.delete(field as Field<unknown>);
    }
  };
}

export function useField<T>(field: Field<T>): [T, (value: T) => void] {
  const [fieldValue, setFieldValueState] = useState<T>(field.value as T);

  const setFieldValue = useCallback((value: T) => {
    field.requestUpdate(value);
  }, [field]);

  useEffect(() => {
    const unsubscribe = subscribeToField(field, (value) => {
      setFieldValueState(value);
    });

    // Catch updates that may have happened between render and effect setup.
    setFieldValueState(field.value as T);

    return unsubscribe;
  }, [field]);

  return [fieldValue, setFieldValue];
}
