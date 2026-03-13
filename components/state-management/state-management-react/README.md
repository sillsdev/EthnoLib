# State Management Adapter for React

If you're writing view models with `@ethnolib/state-management-core`, this package
lets React components bind directly to `Field` instances.

Use `useField()` anywhere you would normally wire React state to a form control,
display value, or other reactive UI element.

```tsx
import { Field } from "@ethnolib/state-management-core";
import { useField } from "@ethnolib/state-management-react";

function usePersonViewModel() {
  const name = new Field("John");
  const age = new Field(5, (newAge) => {
    console.log(`I am now ${newAge}`);
  });

  function haveBirthday() {
    age.requestUpdate(age.value + 1);
  }

  return { name, age, haveBirthday };
}

export function PersonCard() {
  const person = usePersonViewModel();
  const [name, setName] = useField(person.name);
  const [age] = useField(person.age);

  return (
    <div>
      <input value={name} onChange={(event) => setName(event.target.value)} />
      <p>
        Hello, {name}. You are {age}.
      </p>
      <button onClick={person.haveBirthday}>Have a birthday!</button>
    </div>
  );
}
```

## Notes

- `useField()` returns the current field value and a setter that calls `requestUpdate()`.
- Multiple React components can subscribe to the same `Field` instance.
- When React swaps one `Field` instance for another, the hook cleans up the old subscription automatically.

## Maintenance Note

This package still supports React 17, so `useField()` uses a small manual
subscription layer instead of `useSyncExternalStore()`.

If React 17 support is dropped in the future, the hook can be simplified
substantially by rewriting it around `useSyncExternalStore()`, which would let
React own the subscription lifecycle and snapshot synchronization.

See the main [README](../../../README.md) for workspace-level development details.
