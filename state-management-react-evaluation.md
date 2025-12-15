# Evaluation: `state-management-react` strategy for existing React components

## What’s in the branch
- New packages introduced in the `state-management-react` branch:
  - **@ethnolib/state-management-core**: exposes a `Field<T>` class that wraps a value, runs an optional `onUpdateRequested` side effect when `requestUpdate` is called, and surfaces an `updateUI` callback so adapters can push programmatic updates into the UI.
  - **@ethnolib/state-management-react**: provides a `useField` hook that binds a `Field` to React state by wiring `requestUpdate` and `updateUI`.
- The pattern assumes a “view model” written in vanilla JS/TS (fields + actions) and thin framework-specific views that bind to those fields.

## Applicability to the current React language chooser
- The existing `useLanguageChooser` hook already behaves like a view model: it owns state (`searchString`, selections, customizable details) and emits side effects (searching languages, calling `onSelectionChange`).
- Mapping that logic to the new strategy would involve:
  1) Defining a view model that exposes `Field` instances for each piece of UI state (e.g., `searchText`, `selectedLanguage`, `selectedScript`, `customDetails`) plus actions for saves/resets.
  2) Moving side effects into `onUpdateRequested` callbacks on the relevant fields (e.g., kick off `asyncSearchForLanguage` when `searchText.requestUpdate` is called; clear script/custom details when `selectedLanguage` changes).
  3) Using `useField` inside React components instead of `useState` so the UI stays in sync with `Field.updateUI` and user edits propagate through `requestUpdate`.
  4) Keeping derived values (`readyToSubmit`, tag previews) as computed helpers on the view model, since they don’t need to be fields.
- This keeps the language chooser logic framework-agnostic and reusable (React, Svelte) while preserving current behaviors like automatic script selection and `onSelectionChange` callbacks.

## Suggested migration path (minimal risk)
1. Bring the new state-management packages into the workspace (same versions as the branch) and wire them into `package.json` workspaces.
2. Extract the current `useLanguageChooser` logic into a view-model module that returns fields + actions (optionally keep the existing hook as a thin wrapper around the view model for backward compatibility).
3. Update `LanguageChooser.tsx`/`CustomizeLanguageDialog.tsx` to consume the view model via `useField`, replacing direct `useState` usage.
4. Add a small POC test that updates `searchText` via `requestUpdate` and confirms UI state follows via `useField`, to validate the adapter before a full refactor.

## Recommendation
- The Field-based approach aligns well with the language chooser’s view-model pattern and should be feasible with a contained refactor. Starting with the search text + results pipeline as a pilot would de-risk the migration before touching the rest of the selection/customization state.

## Is the vanilla (ui-controller) approach the right cross-framework strategy?
- Yes—keeping the view model in vanilla TS with `Field` objects isolates all side effects and state transitions from any specific UI framework. React and Svelte become thin bindings (`useField` or `svelteViewModel`) while the shared logic remains identical, which is exactly what the ui-controller work set out to achieve.
- Trade-offs are small: you pay a light adapter layer and must keep side effects in `onUpdateRequested`, but you gain framework portability, easier testing of pure view models, and the ability to ship one logic layer to multiple UI stacks.

## Concrete migration snippet (React)
Below is a minimal example of migrating a React `useState` + effect flow to `state-management-core` + `useField`:

```ts
// view-model.ts
import { Field } from "@ethnolib/state-management-core";
import { asyncSearchForLanguage } from "@ethnolib/find-language";

export function useLanguageSearchViewModel() {
  const searchText = new Field("", (text) => {
    asyncSearchForLanguage(text, (results) => {
      searchResults.value = results;
      return true;
    });
  });

  const searchResults = new Field([] as ILanguage[]);

  return { searchText, searchResults };
}

// React component
import { useField } from "@ethnolib/state-management-react";
import { useLanguageSearchViewModel } from "./view-model";

export function SearchBox() {
  const vm = useLanguageSearchViewModel();
  const [text, setText] = useField(vm.searchText);
  const [results] = useField(vm.searchResults);

  return (
    <>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <ul>{results.map((r) => <li key={r.iso639_3_code}>{r.exonym}</li>)}</ul>
    </>
  );
}
```

In this pattern, UI input calls `setText` which delegates to `Field.requestUpdate`; the view-model side effect runs once in `onUpdateRequested`, and `useField` keeps the React state synchronized without duplicating logic.
